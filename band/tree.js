// Rebel Band: the class tree, full screen. Tiers run left to right (Village Infantry to the elites), each path is laid out
// as a tidy tree with its lines drawn behind, coloured by build. A node shows the class's pawn and how many the band has;
// choosing one opens its card (abilities, equipment, path), and "Open in band" jumps to it on the band screen.
import {TROOPS, CLASSES, GEAR, abilitiesOf, pathTo} from './troops.js';

const COL = 200,
  ROW = 66,
  NODE_W = 168,
  NODE_H = 54,
  PAD = 18;
const BUILD_COLOUR = {core: '#b9bab3', heavy: '#d98a5c', medium: '#8fc35a', light: '#6aa8e9'};

/** Positions for every class: x by tier, y from a tidy layout (leaves in order, parents centred on children). */
export function layout(root = 'volunteer') {
  const pos = {};
  let row = 0;
  const place = id => {
    const kids = TROOPS[id].to;
    if (!kids.length) pos[id] = {x: TROOPS[id].tier - 1, y: row++};
    else {
      kids.forEach(place);
      pos[id] = {x: TROOPS[id].tier - 1, y: kids.reduce((s, k) => s + pos[k].y, 0) / kids.length};
    }
  };
  place(root);
  return {pos, rows: row};
}

export function createTreeView(container, {state, drawPawn, onPick}) {
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs))
      if (v === null || v === undefined) continue;
      else if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e[k] = v;
      else e.setAttribute(k, v);
    e.append(...kids.filter(k => k !== null && k !== undefined && k !== false));
    return e;
  };
  const {pos, rows} = layout();
  const W = 7 * COL + PAD * 2,
    H = rows * ROW + PAD * 2 + 26;
  const xy = id => [PAD + pos[id].x * COL, PAD + 26 + pos[id].y * ROW];
  let picked = null;

  function card(id) {
    const t = TROOPS[id],
      S = state(),
      b = S.band[id];
    const own = abilitiesOf(id).filter(a => a.own),
      kept = abilitiesOf(id).filter(a => !a.own);
    const needs = Object.entries(t.needs).map(([g, n]) =>
      el('li', {class: (S.stash[g] || 0) >= n ? 'ok' : 'no'}, `${n} × ${GEAR[g].label} (${S.stash[g] || 0})`),
    );
    return el(
      'div',
      {class: 'tree-card'},
      el('h3', {}, t.label),
      el('p', {class: 'who-sub'}, `Tier ${t.tier} · ${CLASSES.find(c => c.id === t.build).label}${b ? ` · ${b.count} in the band` : ''}`),
      el(
        'p',
        {class: 'path'},
        pathTo(id)
          .map(c => TROOPS[c].label)
          .join(' → '),
      ),
      el('h4', {}, 'Abilities'),
      el(
        'ul',
        {class: 'abilities'},
        ...own.map(a =>
          el(
            'li',
            {class: 'own'},
            el('span', {class: 'ab-kind ' + a.kind}, a.kind === 'active' ? 'ACT' : 'PAS'),
            el('span', {}, el('strong', {}, a.name), el('br'), a.text),
          ),
        ),
      ),
      kept.length ? el('h4', {}, `Kept from earlier (${kept.length})`) : null,
      kept.length ? el('p', {class: 'kept-list'}, kept.map(a => a.name).join(' · ')) : null,
      el('h4', {}, 'Equipment to become it, per soldier'),
      needs.length ? el('ul', {class: 'needs'}, ...needs) : el('p', {class: 'note', style: 'text-align:left'}, 'None.'),
      t.to.length ? el('h4', {}, 'Leads to') : null,
      t.to.length
        ? el('p', {}, t.to.map(c => TROOPS[c].label).join(' · '))
        : el('p', {class: 'note', style: 'text-align:left'}, 'The top of its path.'),
      el('button', {type: 'button', class: 'go', onclick: () => onPick(id)}, b ? 'Open in band' : 'Show in band'),
    );
  }
  function pick(id) {
    picked = id;
    for (const n of container.querySelectorAll('.node')) n.setAttribute('aria-pressed', String(n.dataset.id === id));
    container.querySelector('.tree-side').replaceChildren(card(id));
  }

  function render(focus = null) {
    const S = state();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('aria-hidden', 'true');
    for (const [id, t] of Object.entries(TROOPS)) {
      if (!t.from) continue;
      const [x0, y0] = xy(t.from),
        [x1, y1] = xy(id);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const ax = x0 + NODE_W,
        ay = y0 + NODE_H / 2,
        bx = x1,
        by = y1 + NODE_H / 2;
      path.setAttribute('d', `M${ax},${ay} C${ax + 18},${ay} ${bx - 18},${by} ${bx},${by}`);
      path.setAttribute('stroke', BUILD_COLOUR[t.build]);
      path.setAttribute('stroke-width', S.band[id] ? 3 : 1.5);
      path.setAttribute('stroke-opacity', S.band[id] ? 0.9 : 0.45);
      path.setAttribute('fill', 'none');
      svg.append(path);
    }
    const heads = Array.from({length: 7}, (_, i) => el('span', {class: 'tier-head', style: `left:${PAD + i * COL}px`}, `Tier ${i + 1}`));
    const nodes = Object.entries(TROOPS).map(([id, t]) => {
      const [x, y] = xy(id),
        b = S.band[id];
      const c = el('canvas', {width: 88, height: 88, 'aria-hidden': 'true'});
      drawPawn(c, id, {size: 104, cy: 50});
      return el(
        'button',
        {
          type: 'button',
          class: 'node' + (b ? ' have' : ''),
          'data-id': id,
          'aria-pressed': 'false',
          'aria-label': `${t.label}, tier ${t.tier}${b ? `, ${b.count} in the band` : ''}`,
          style: `left:${x}px;top:${y}px;width:${NODE_W}px;height:${NODE_H}px;--build:${BUILD_COLOUR[t.build]}`,
          onclick: () => pick(id),
          ondblclick: () => onPick(id),
        },
        c,
        el('span', {class: 'nm'}, t.label, el('small', {}, `T${t.tier}${b ? ` · ${b.count}` : ''}`)),
      );
    });
    const legend = el(
      'p',
      {class: 'legend'},
      ...CLASSES.map(c => el('span', {style: `--build:${BUILD_COLOUR[c.id]}`}, c.label)),
      el('span', {class: 'hint'}, 'Thick lines: classes in your band. Double-click a class to open it in the band. Esc closes.'),
    );
    container.replaceChildren(
      el(
        'div',
        {class: 'tree-main', tabindex: '0'},
        legend,
        el('div', {class: 'tree-canvas', style: `width:${W}px;height:${H}px`}, svg, ...heads, ...nodes),
      ),
      el('aside', {class: 'tree-side panel', 'aria-live': 'polite'}),
    );
    pick(focus && TROOPS[focus] ? focus : picked || 'volunteer');
    container.querySelector(`.node[data-id="${picked}"]`)?.scrollIntoView({block: 'center', inline: 'center'});
  }
  return {render};
}
