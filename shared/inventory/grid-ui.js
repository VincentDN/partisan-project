// The grid inventory screen (WP-S10, TAC-C-11), Tarkov-style: a fighter's kit beside what is searched (a body, a cache,
// the armoury). Drag to move, R turns, rounds dropped on a magazine load it, a magazine dropped on the weapon goes in,
// Shift-drop splits, U unloads, E ejects, H uses medicine; a second long gun goes on the sling. A drop that misses lands
// in the nearest free place; Ctrl-click (or T) moves an item straight to the other side: loot into the kit, kit out.
// Keyboard: Enter picks up, arrows and [ ] move, Enter drops.
import {inventoryFoley} from './foley.js';
import {footprint, fits, remove, placeAt, add} from './grid.js';
import {placeNear, quickPlace, kitBoxes} from './grid-moves.js';
import {itemKeys} from './grid-keys.js';
import {loadMag, roundsIn, loadedRounds, chamber} from './ammo.js';

const CELL = 46;
/** The kit's slots: what each takes, and how the screen says it (a helmet or a vest is worn: it shows, WP-W17). */
const SLOTS = {
  primary: {label: 'Primary', kind: 'weapon', where: 'hands', put: 'in your hands'},
  secondary: {label: 'Sling', kind: 'weapon', where: 'the sling', put: 'on the sling'},
  headwear: {label: 'Head', kind: 'headwear', where: 'on the head', put: 'worn'},
  armor: {label: 'Body', kind: 'armor', where: 'worn', put: 'worn'},
};
const el = (tag, cls = '', text = '') => Object.assign(document.createElement(tag), {className: cls, textContent: text});

/** panels: [{title, kit}] or [{title, container}]; make(slug, count) builds items (for splits and unloads). */
export function mountInventory(root, {cat, panels, make, onChange = () => {}, onUse = null, icon = () => null}) {
  let carry = null; // {item, from, was: {g, x, y, rot}, rot, target: {container, g, x, y} | {weapon}, ghost}
  const grids = []; // {container, g, el} in screen order, for the keyboard's [ and ]

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
    if (d.kind === 'meds' && d.charges) return [d.short, `${item.left ?? d.charges}/${d.charges}`];
    return [d.short, item.count > 1 ? String(item.count) : ''];
  }
  /** H or a double click: medicine is used on the kit's owner (onUse(item) -> a note, or undefined: not usable). */
  function use(item, from) {
    const why = onUse?.(item);
    if (why === undefined) return;
    if (item.left <= 0 && from) remove(from, item.uid);
    inventoryFoley('use', cat.def(item.slug).kind);
    render();
    onChange(why);
  }
  const describe = (item, where) => {
    const d = cat.def(item.slug),
      [, sub] = label(item);
    return `${d.name}${sub ? ', ' + sub : ''}, ${d.w} by ${d.h}${where ? ', in ' + where : ''}`;
  };

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
    t.ondblclick = () => use(item, container);
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
    const sec = el('section', 'inv-box'),
      row = el('div', 'inv-grids');
    container.grids.forEach((_, g) => row.append(drawGrid(container, g, where)));
    sec.append(...(title ? [el('h3', '', title)] : []), row);
    return sec;
  }
  /** A kit slot (SLOTS): the primary stays in the hands in this screen; the sling, head and body take and give. */
  function drawWeapon(kit, which) {
    const slot = el('div', 'inv-slot');
    slot.dataset.weapon = which;
    slot.append(el('span', 'slot-name', SLOTS[which].label));
    const w = kit[which];
    if (w) {
      const t = tile(w, which === 'primary' ? null : {slot: which, kit}, SLOTS[which].where);
      if (which === 'primary') t.onpointerdown = null;
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
        const k = p.kit;
        if (k) {
          col.append(...Object.keys(SLOTS).map(s => drawWeapon(k, s)));
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
    const putBack = () => restore(c.item, c.from, c.was);
    let done = false,
      why = '',
      loaded = true;
    const w = t?.weapon && kit?.[t.weapon];
    if (w && d.kind === 'magazine') {
      if (cat.def(w.slug).calibre !== d.calibre) why = 'That magazine does not fit this weapon.';
      else {
        const old = w.mag;
        w.mag = c.item;
        chamber(w);
        if (old && !placeNear(cat, c.from, c.was.g, old, c.was.x, c.was.y, 0)) add(cat, c.from, old);
        done = true;
      }
    } else if (t?.weapon && kit && !w && d.kind === SLOTS[t.weapon].kind) {
      c.item.rot = 0;
      kit[t.weapon] = c.item;
      why = `${d.name} ${SLOTS[t.weapon].put}.`;
      done = true;
    } else if (t?.container) {
      const under = t.container.grids[t.g].items.find(e => {
        const [w, h] = footprint(cat, e.item);
        return t.x >= e.x && t.x < e.x + w && t.y >= e.y && t.y < e.y + h;
      })?.item;
      const ud = under && cat.def(under.slug);
      if (under && d.kind === 'ammo' && ud.kind === 'magazine') {
        const r = loadMag(cat, under, c.item);
        why = r.reason || `${r.loaded} loaded.`;
        loaded = r.loaded > 0;
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
      } else done = placeNear(cat, t.container, t.g, c.item, t.x, t.y, c.rot);
    }
    if (!done) {
      putBack();
      if (!why) why = 'No room there.';
    }
    inventoryFoley(done && loaded ? 'drop' : 'reject', d.kind);
    render();
    onChange(why);
  }
  /** Take `item` out of `from` (a box, or {slot, kit} for the sling); returns where it was, for restore. */
  function take(item, from) {
    if (from.slot) {
      from.kit[from.slot] = null;
      return {slot: from.slot, g: 0, x: 0, y: 0, rot: 0};
    }
    const was = remove(from, item.uid);
    return {g: was.g, x: was.x, y: was.y, rot: item.rot || 0};
  }
  function restore(item, from, was) {
    if (was.slot) from.kit[was.slot] = item;
    else placeAt(cat, from, was.g, item, was.x, was.y, was.rot);
  }
  function pickUp(item, from) {
    inventoryFoley('pickup', cat.def(item.slug).kind);
    carry = {item, from, was: take(item, from), rot: item.rot || 0, target: null};
    return carry;
  }
  /** Ctrl-click or T: straight to the other side, loot into the kit, kit into what is searched. */
  function quick(item, from) {
    const kit = kitOf(),
      container = panels.find(p => !p.kit)?.container;
    if (!kit || !container) return;
    const toKit = !(from.slot || kitBoxes(kit).includes(from)),
      d = cat.def(item.slug),
      was = take(item, from);
    const where = quickPlace(cat, item, {kit, container, toKit});
    if (!where) restore(item, from, was);
    inventoryFoley(where ? 'drop' : 'reject', d.kind);
    render();
    root.querySelector(`[data-uid="${item.uid}"]`)?.focus();
    onChange(
      where
        ? toKit
          ? `Took the ${d.name}${where === 'there' ? '' : ` (${where})`}.`
          : `Left the ${d.name}.`
        : `No room for the ${d.name}.`,
    );
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
    if (e.ctrlKey || e.metaKey) return quick(item, from);
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
      if (w) carry.target = {weapon: w.dataset.weapon};
      else if (g) {
        const r = g.getBoundingClientRect();
        updateTarget(+g.dataset.grid, Math.floor((ev.clientX - r.left) / CELL), Math.floor((ev.clientY - r.top) / CELL));
      } else carry.target = null;
    };
    const key = ev => {
      if (ev.key.toLowerCase() === 'r' && carry) {
        carry.rot = carry.rot ? 0 : 1;
        inventoryFoley('rotate', cat.def(carry.item.slug).kind);
        ghost.classList.toggle('turned-ghost', !!carry.rot);
      }
    };
    const up = ev => {
      for (const [t, f] of on) removeEventListener(t, f);
      if (ev.type === 'pointercancel') carry.target = null; // a cancelled drag puts the item back
      drop(ev.shiftKey);
    };
    const on = [
      ['pointermove', moveTo],
      ['pointerup', up],
      ['pointercancel', up],
      ['keydown', key],
    ];
    moveTo(e);
    for (const [t, f] of on) addEventListener(t, f);
  }

  // keyboard (grid-keys.js)
  const keyOnItem = itemKeys({cat, make, grids, carry: () => carry, pickUp, updateTarget, drop, use, quick, render, onChange, kitOf});
  render();
  inventoryFoley('open');
  return {render};
}
