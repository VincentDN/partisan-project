// The grid inventory screen (WP-S10, TAC-C-11), Tarkov-style: your fighter's kit (the weapon with its magazine, the
// rig's pouches, pockets, backpack) beside whatever is being searched (a body, a cache, the stash). Drag an item to
// move it; R turns it while it is carried; drop rounds on a magazine to load it; drop a magazine on the weapon to
// insert it (the old one comes out to where the new one was); Shift-drop splits a stack; U unloads a magazine, E
// ejects the weapon's magazine. Everything also works from the keyboard: Tab to an item, Enter to pick it up, arrows
// to choose the cell, [ and ] to change grid, R to turn, Enter to drop, Escape to put it back.
import {footprint, fits, remove, placeAt, add, findSpot, contents} from './grid.js';
import {loadMag, unloadMag, roundsIn, loadedRounds, chamber} from './ammo.js';

const CELL = 46;
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** panels: [{title, kit}] or [{title, container}]; make(slug, count) builds items (for splits and unloads). */
export function mountInventory(root, {cat, panels, make, onChange = () => {}, icon = () => null}) {
  let carry = null; // {item, from, was: {g, x, y, rot}, rot, target: {container, g, x, y} | {weapon}, ghost}
  const grids = []; // {container, g, el} in screen order, for the keyboard's [ and ]

  // ---------- what an item says ----------
  function label(item) {
    const d = cat.def(item.slug);
    if (d.kind === 'magazine') {
      const top = item.rounds?.at(-1)?.[0];
      return [d.short, `${roundsIn(item)}/${d.capacity}${top ? ' ' + cat.def(top).short : ''}`];
    }
    if (d.kind === 'weapon') {
      const top = item.chamber || item.mag?.rounds?.at(-1)?.[0];
      return [d.short, item.mag || item.chamber ? `${loadedRounds(item)}${top ? ' ' + cat.def(top).short : ''}` : 'empty'];
    }
    return [d.short, item.count > 1 ? String(item.count) : ''];
  }
  const describe = (item, where) => {
    const d = cat.def(item.slug),
      [, sub] = label(item);
    return `${d.name}${sub ? ', ' + sub : ''}, ${d.w} by ${d.h}${where ? ', in ' + where : ''}`;
  };

  // ---------- drawing ----------
  function tile(item, container, where) {
    const d = cat.def(item.slug),
      [w, h] = footprint(cat, item),
      [name, sub] = label(item);
    const t = el('button', `inv-item k-${d.kind}`);
    t.type = 'button';
    t.dataset.uid = item.uid;
    t.style.width = `${w * CELL - 4}px`;
    t.style.height = `${h * CELL - 4}px`;
    const img = icon(item.slug);
    if (img) {
      const i = el('img');
      i.src = img;
      i.alt = '';
      if (item.rot) i.className = 'turned';
      t.append(i);
    }
    t.append(el('span', 'nm', name), el('span', 'sub', sub));
    t.setAttribute('aria-label', describe(item, where));
    t.title = d.name;
    t.onpointerdown = e => startDrag(e, item, container);
    t.onkeydown = e => keyOnItem(e, item, container);
    return t;
  }
  function drawGrid(container, g, where) {
    const grid = container.grids[g];
    const box = el('div', 'inv-grid');
    box.style.width = `${grid.w * CELL}px`;
    box.style.height = `${grid.h * CELL}px`;
    box.dataset.grid = String(grids.length);
    grids.push({container, g, el: box});
    for (const e of grid.items) {
      const t = tile(e.item, container, where);
      t.style.left = `${e.x * CELL + 2}px`;
      t.style.top = `${e.y * CELL + 2}px`;
      box.append(t);
    }
    return box;
  }
  function drawContainer(container, title, where = title) {
    const sec = el('section', 'inv-box');
    if (title) sec.append(el('h3', '', title));
    const row = el('div', 'inv-grids');
    container.grids.forEach((_, g) => row.append(drawGrid(container, g, where)));
    sec.append(row);
    return sec;
  }
  function drawWeapon(kit) {
    const slot = el('div', 'inv-slot');
    slot.dataset.weapon = '1';
    slot.append(el('span', 'slot-name', 'Primary'));
    if (kit.primary) {
      const t = tile(kit.primary, null, 'hands');
      t.onpointerdown = null; // the weapon stays in the hands in this screen
      slot.append(t);
    }
    return slot;
  }
  function render() {
    grids.length = 0;
    root.replaceChildren(
      ...panels.map(p => {
        const col = el('div', 'inv-panel');
        col.append(el('h2', 'inv-title', p.title));
        if (p.kit) {
          const k = p.kit;
          col.append(drawWeapon(k));
          if (k.rig) col.append(drawContainer(k.rig, cat.def(k.rig.slug).short));
          col.append(drawContainer(k.pockets, 'Pockets'));
          if (k.backpack) col.append(drawContainer(k.backpack, cat.def(k.backpack.slug).short));
        } else col.append(drawContainer(p.container, '', p.title));
        return col;
      }),
    );
  }

  // ---------- moving things ----------
  const kitOf = () => panels.find(p => p.kit)?.kit;
  /** Drop the carried item: on a magazine (load), on the weapon (insert), on a stack of the same (merge) or a cell. */
  function drop(shift = false) {
    const c = carry;
    carry = null;
    c.ghost?.remove();
    const d = cat.def(c.item.slug),
      t = c.target,
      kit = kitOf();
    const putBack = () => placeAt(cat, c.from, c.was.g, c.item, c.was.x, c.was.y, c.was.rot);
    let done = false,
      why = '';
    if (t?.weapon && kit?.primary && d.kind === 'magazine') {
      const w = kit.primary;
      if (cat.def(w.slug).calibre !== d.calibre) why = 'That magazine does not fit this weapon.';
      else {
        const old = w.mag;
        w.mag = c.item;
        chamber(w);
        if (old && !placeAt(cat, c.from, c.was.g, old, c.was.x, c.was.y, 0) && !placeAt(cat, c.from, c.was.g, old, c.was.x, c.was.y, 1))
          add(cat, c.from, old);
        done = true;
      }
    } else if (t?.container) {
      const under = t.container.grids[t.g].items.find(e => {
        const [w, h] = footprint(cat, e.item);
        return t.x >= e.x && t.x < e.x + w && t.y >= e.y && t.y < e.y + h;
      })?.item;
      const ud = under && cat.def(under.slug);
      if (under && d.kind === 'ammo' && ud.kind === 'magazine') {
        const r = loadMag(cat, under, c.item);
        why = r.reason || `${r.loaded} loaded.`;
        if (c.item.count > 0) putBack();
        done = true;
      } else if (under && under.slug === c.item.slug && c.item.count && under.count < (d.stack || 99)) {
        const k = Math.min(c.item.count, (d.stack || 99) - under.count);
        under.count += k;
        c.item.count -= k;
        if (c.item.count > 0) putBack();
        done = true;
      } else if (shift && c.item.count > 1) {
        const half = make(c.item.slug, Math.floor(c.item.count / 2));
        putBack();
        if (placeAt(cat, t.container, t.g, half, t.x, t.y, c.rot)) {
          c.item.count -= half.count;
          done = true;
        }
      } else done = placeAt(cat, t.container, t.g, c.item, t.x, t.y, c.rot);
    }
    if (!done) {
      putBack();
      if (!why) why = 'No room there.';
    }
    render();
    onChange(why);
  }
  function pickUp(item, from) {
    const was = remove(from, item.uid);
    carry = {item, from, was: {g: was.g, x: was.x, y: was.y, rot: item.rot || 0}, rot: item.rot || 0, target: null};
    return carry;
  }
  function updateTarget(gi, x, y) {
    const G = grids[gi];
    if (!G || !carry) return;
    carry.target = {container: G.container, g: G.g, x, y};
    const [w, h] = carry.rot
      ? [cat.def(carry.item.slug).h, cat.def(carry.item.slug).w]
      : [cat.def(carry.item.slug).w, cat.def(carry.item.slug).h];
    for (const o of root.querySelectorAll('.inv-hint')) o.remove();
    const hint = el('div', 'inv-hint' + (fits(cat, G.container.grids[G.g], w, h, x, y) ? '' : ' bad'));
    Object.assign(hint.style, {left: `${x * CELL}px`, top: `${y * CELL}px`, width: `${w * CELL}px`, height: `${h * CELL}px`});
    G.el.append(hint);
  }

  // pointer
  function startDrag(e, item, from) {
    if (e.button !== 0 || carry) return;
    e.preventDefault();
    const c = pickUp(item, from);
    const ghost = e.currentTarget.cloneNode(true);
    ghost.classList.add('inv-ghost');
    document.body.append(ghost);
    c.ghost = ghost;
    e.currentTarget.style.opacity = '0.25';
    const moveTo = ev => {
      ghost.style.left = `${ev.clientX - CELL / 2}px`;
      ghost.style.top = `${ev.clientY - CELL / 2}px`;
      const under = document.elementsFromPoint(ev.clientX, ev.clientY);
      const g = under.find(n => n.dataset?.grid !== undefined),
        w = under.find(n => n.dataset?.weapon);
      if (w) carry.target = {weapon: true};
      else if (g) {
        const r = g.getBoundingClientRect();
        updateTarget(+g.dataset.grid, Math.floor((ev.clientX - r.left) / CELL), Math.floor((ev.clientY - r.top) / CELL));
      } else carry.target = null;
    };
    const key = ev => {
      if (ev.key.toLowerCase() === 'r' && carry) {
        carry.rot = carry.rot ? 0 : 1;
        ghost.classList.toggle('turned-ghost', !!carry.rot);
      }
    };
    const up = ev => {
      removeEventListener('pointermove', moveTo);
      removeEventListener('pointerup', up);
      removeEventListener('keydown', key);
      drop(ev.shiftKey);
    };
    moveTo(e);
    addEventListener('pointermove', moveTo);
    addEventListener('pointerup', up);
    addEventListener('keydown', key);
  }

  // keyboard
  function keyOnItem(e, item, from) {
    const d = cat.def(item.slug),
      k = e.key.toLowerCase();
    if (k === 'u' && d.kind === 'magazine') {
      const kit = kitOf(),
        places = [from, kit?.pockets, kit?.rig, kit?.backpack].filter(Boolean);
      let kept = 0;
      for (const s of unloadMag(cat, item, make)) if (!places.some(c => add(cat, c, s))) kept += loadMag(cat, item, s).loaded; // no room: they stay in
      render();
      return onChange(kept ? `No room for ${kept} rounds; they stay in the magazine.` : 'Unloaded.');
    }
    if (k === 'e' && d.kind === 'weapon' && item.mag) {
      const kit = kitOf(),
        m = item.mag;
      item.mag = null;
      if (![kit.rig, kit.pockets, kit.backpack].filter(Boolean).some(c => add(cat, c, m))) item.mag = m;
      render();
      return onChange(item.mag ? 'No room to put the magazine.' : 'Magazine out.');
    }
    if ((k === 'enter' || k === ' ') && from && !carry) {
      e.preventDefault();
      const c = pickUp(item, from);
      const gi = grids.findIndex(G => G.container === from && G.g === c.was.g);
      keyCarry(gi, c.was.x, c.was.y);
    }
  }
  function keyCarry(gi, x, y) {
    updateTarget(gi, x, y);
    const onKey = ev => {
      const t = carry?.target;
      if (!t) return;
      let gi2 = grids.findIndex(G => G.container === t.container && G.g === t.g),
        nx = t.x,
        ny = t.y;
      const k = ev.key;
      if (k === 'ArrowLeft') nx--;
      else if (k === 'ArrowRight') nx++;
      else if (k === 'ArrowUp') ny--;
      else if (k === 'ArrowDown') ny++;
      else if (k === ']' || k === '[') {
        gi2 = (gi2 + (k === ']' ? 1 : grids.length - 1)) % grids.length;
        nx = ny = 0;
      } else if (k.toLowerCase() === 'r') carry.rot = carry.rot ? 0 : 1;
      else if (k === 'Enter' || k === ' ' || k === 'Escape') {
        ev.preventDefault();
        ev.stopImmediatePropagation(); // Escape puts the item back; it does not also close the screen
        removeEventListener('keydown', onKey, true);
        if (k === 'Escape') carry.target = null;
        return drop(ev.shiftKey);
      } else return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const G = grids[gi2].container.grids[grids[gi2].g];
      updateTarget(gi2, Math.max(0, Math.min(G.w - 1, nx)), Math.max(0, Math.min(G.h - 1, ny)));
    };
    addEventListener('keydown', onKey, true);
  }

  render();
  return {render, findSpot: (container, item) => findSpot(cat, container, item), contents};
}
