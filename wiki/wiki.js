// Equipment Wiki: every piece of lootable equipment the game will need, browsable by category, searchable and sortable.
// The data is a placeholder copy of tarkov.dev's catalogue (tools/wiki/import-tarkov.mjs writes wiki/data/items.json);
// the icons are placeholders from the project's own RimWorld-style art set, chosen by what the item is.
import '../shared/frame.js';
import {mountTopBar} from '../shared/topbar.js';
import {loadGuns, loadSet} from '../convoy/sprite-art.js';
import {iconFor, filterItems, LABELS} from './catalogue.js';

mountTopBar({title: 'Equipment Wiki', scene: 'viewer'});
const $ = s => document.querySelector(s);
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
const fmt = n => (typeof n === 'number' ? n.toLocaleString('en-GB') : n);

const data = await (await fetch(new URL('./data/items.json', import.meta.url))).json();
const guns = await loadGuns();
const cats = Object.fromEntries(data.categories.map(c => [c.id, c]));
const byId = Object.fromEntries(data.items.map(i => [i.id, i]));
const bySlug = Object.fromEntries(data.items.map(i => [i.slug, i]));
const iconCache = new Map();
async function icon(item) {
  const key = iconFor(item, cats);
  if (!iconCache.has(key)) iconCache.set(key, key.gun ? Promise.resolve(guns[key.gun]?.img || null) : loadSet(key.path));
  return iconCache.get(key);
}
// iconFor returns the same object for the same choice, so the cache key above is stable
async function drawIcon(canvas, item) {
  const img = await icon(item),
    g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (!img) return;
  // gun sprites are long and thin with clear space round them: fill the width; items fit the box
  const k = iconFor(item, cats).gun
    ? (canvas.width / img.width) * 1.2
    : Math.min(canvas.width / img.width, canvas.height / img.height) * 0.85;
  g.drawImage(img, (canvas.width - img.width * k) / 2, (canvas.height - img.height * k) / 2, img.width * k, img.height * k);
}

// ---------- state, kept in the address ----------
const S = {cat: null, q: '', rarity: '', sort: 'name', item: null, shown: 120};
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  S.cat = cats[p.get('cat')] ? p.get('cat') : null;
  S.q = p.get('q') || '';
  S.rarity = p.get('rarity') || '';
  S.sort = p.get('sort') || 'name';
  S.item = bySlug[p.get('item')] ? p.get('item') : null;
}
function writeHash() {
  const p = new URLSearchParams();
  if (S.cat) p.set('cat', S.cat);
  if (S.q) p.set('q', S.q);
  if (S.rarity) p.set('rarity', S.rarity);
  if (S.sort !== 'name') p.set('sort', S.sort);
  if (S.item) p.set('item', S.item);
  history.replaceState(null, '', p.toString() ? '#' + p : location.pathname);
}

// ---------- the category tree ----------
const childrenOf = id => data.categories.filter(c => c.parent === id);
const countUnder = id => (cats[id]?.count || 0) + childrenOf(id).reduce((s, c) => s + countUnder(c.id), 0);
function renderTree() {
  const roots = childrenOf(null).sort((a, b) => a.name.localeCompare(b.name));
  const leaf = c =>
    el(
      'button',
      {type: 'button', 'aria-pressed': String(S.cat === c.id), onclick: () => pick(c.id)},
      el('span', {}, c.name),
      el('span', {class: 'n'}, String(countUnder(c.id))),
    );
  $('#tree').replaceChildren(
    el(
      'button',
      {type: 'button', 'aria-pressed': String(!S.cat), onclick: () => pick(null), style: 'padding-left:8px'},
      el('span', {}, 'All equipment'),
      el('span', {class: 'n'}, String(data.items.length)),
    ),
    ...roots.map(r => {
      const open = S.cat && (S.cat === r.id || childrenOf(r.id).some(c => c.id === S.cat || childrenOf(c.id).some(g => g.id === S.cat)));
      const d = el(
        'details',
        {open: open ? '' : null},
        el('summary', {}, el('span', {}, r.name), el('span', {class: 'n'}, String(countUnder(r.id)))),
        leaf({...r, name: 'All ' + r.name.toLowerCase()}),
        ...childrenOf(r.id)
          .sort((a, b) => a.name.localeCompare(b.name))
          .flatMap(c => [leaf(c), ...childrenOf(c.id).map(g => leaf({...g, name: '· ' + g.name}))]),
      );
      return d;
    }),
  );
}
function pick(cat) {
  S.cat = cat;
  S.shown = 120;
  writeHash();
  renderTree();
  renderList();
}

// ---------- the list ----------
function currentList() {
  return filterItems(data.items, cats, S);
}
function renderList() {
  const list = currentList();
  $('#list-title').textContent = S.cat ? cats[S.cat].name : 'All equipment';
  $('#count').textContent = `${fmt(list.length)} items`;
  const rows = list.slice(0, S.shown).map(it => {
    const c = el('canvas', {width: 104, height: 60, 'aria-hidden': 'true'});
    drawIcon(c, it);
    return el(
      'li',
      {},
      el(
        'button',
        {type: 'button', 'aria-current': String(S.item === it.slug), onclick: () => show(it.slug)},
        c,
        el(
          'span',
          {class: 'nm'},
          it.name,
          el('span', {class: 'sub'}, `${cats[it.cat].name} · `, el('span', {class: 'rar ' + it.rarity.replace(' ', '-')}, it.rarity)),
        ),
        el('span', {class: 'val'}, `${fmt(it.price)}`, el('br'), `${it.kg} kg`),
      ),
    );
  });
  $('#items').replaceChildren(...rows);
  $('#more').hidden = list.length <= S.shown;
  $('#more').textContent = `Show more (${fmt(list.length - S.shown)} left)`;
  $('#status').textContent = `${fmt(data.items.length)} items · placeholder data from tarkov.dev, fetched ${data.meta.fetched}`;
}
$('#more').onclick = () => {
  S.shown += 240;
  renderList();
};
$('#q').oninput = e => {
  S.q = e.target.value;
  S.shown = 120;
  writeHash();
  renderList();
};
$('#rarity').onchange = e => {
  S.rarity = e.target.value;
  writeHash();
  renderList();
};
$('#sort').onchange = e => {
  S.sort = e.target.value;
  writeHash();
  renderList();
};

// ---------- the item card ----------
function crumb(cat) {
  const path = [];
  for (let c = cat; c && cats[c]; c = cats[c].parent) path.unshift(cats[c].name);
  return path.join(' › ');
}
function show(slug) {
  S.item = slug;
  writeHash();
  for (const b of document.querySelectorAll('#items button')) b.setAttribute('aria-current', 'false');
  renderDetail();
  renderList();
}
function renderDetail() {
  const it = bySlug[S.item];
  const d = $('#detail');
  if (!it) {
    d.replaceChildren(el('p', {class: 'empty'}, 'Choose an item to see its card.'));
    return;
  }
  const c = el('canvas', {width: 300, height: 150, 'aria-hidden': 'true'});
  drawIcon(c, it);
  const grid = el('div', {
    class: 'grid',
    style: `grid-template-columns:repeat(${it.w},16px)`,
    title: `${it.w} x ${it.h} grid cells`,
    'aria-label': `${it.w} by ${it.h} cells`,
  });
  for (let i = 0; i < it.w * it.h; i++) grid.append(el('i'));
  const s = it.stats || {};
  const statRows = Object.entries(s)
    .filter(([k, v]) => k !== 'kind' && v !== null && !(Array.isArray(v) && !v.length))
    .flatMap(([k, v]) => [
      el('dt', {}, LABELS[k] || k),
      el('dd', {}, Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'yes' : 'no') : fmt(v)),
    ]);
  const ammo = (it.ammo || []).map(id => byId[id]).filter(Boolean);
  d.replaceChildren(
    el('h1', {}, it.name),
    el('p', {class: 'crumb'}, crumb(it.cat)),
    el('div', {class: 'hero'}, c, grid),
    el(
      'dl',
      {class: 'facts'},
      el('dt', {}, 'Short name'),
      el('dd', {}, it.short),
      el('dt', {}, 'Loot rarity'),
      el('dd', {}, el('span', {class: 'rar ' + it.rarity.replace(' ', '-')}, it.rarity)),
      el('dt', {}, 'Size'),
      el('dd', {}, `${it.w} × ${it.h} cells`),
      el('dt', {}, 'Weight'),
      el('dd', {}, `${it.kg} kg`),
      el('dt', {}, 'Base value'),
      el('dd', {}, fmt(it.price)),
      s.kind ? el('dt', {}, 'Kind') : null,
      s.kind ? el('dd', {}, s.kind) : null,
    ),
    statRows.length ? el('h3', {}, 'Stats') : null,
    statRows.length ? el('dl', {class: 'stats'}, ...statRows) : null,
    ammo.length ? el('h3', {}, `Ammunition (${ammo.length})`) : null,
    ammo.length
      ? el('div', {class: 'chips'}, ...ammo.map(a => el('button', {type: 'button', onclick: () => show(a.slug)}, a.short || a.name)))
      : null,
    it.slots?.length ? el('h3', {}, 'Mounts') : null,
    it.slots?.length
      ? el('div', {class: 'chips'}, ...it.slots.map(sl => el('span', {title: `${sl.n} compatible parts`}, `${sl.name} (${sl.n})`)))
      : null,
    it.desc ? el('h3', {}, 'Description') : null,
    it.desc ? el('p', {class: 'desc'}, it.desc) : null,
    el(
      'p',
      {class: 'src'},
      'Placeholder data from ',
      el('a', {href: `https://tarkov.dev/item/${it.slug}`, rel: 'noopener', target: '_blank'}, 'tarkov.dev'),
      '. Icon: placeholder art.',
    ),
  );
}

readHash();
$('#q').value = S.q;
$('#rarity').value = S.rarity;
$('#sort').value = S.sort;
renderTree();
renderList();
renderDetail();
$('#loading').hidden = true;
window.PARP_WIKI = {ready: true, data, show, pick};
