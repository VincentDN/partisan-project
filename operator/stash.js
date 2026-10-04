// The Operator Customiser's left panel: the rebels' stash, Bannerlord's inventory column. A placeholder for now: a
// random handful of items from the mission loot pool (convoy/data/loot-pool.json, the Tarkov-style catalogue mapped to
// the band's equipment), sortable by type, name, count and value. Nothing here changes the operator yet.
import {GEAR} from '../band/troops.js';

const KIND = {weapon: 'Weapon', attachment: 'Attachment', ammo: 'Ammo', gear: 'Gear', drone: 'Drone', goods: 'Goods'};
// 5x5 one-bit glyphs, Nokia style, per kind of thing
const GLYPH = {
  weapon: '0000011110111111111100100',
  attachment: '0010001110111110111000100',
  ammo: '0101001010010100101001010',
  gear: '0111011111111110111001110',
  drone: '1000101110011100111010001',
  goods: '1111110001101011000111111',
};
const glyph = bits =>
  `<svg viewBox="0 0 5 5" width="15" height="15" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${[...bits]
    .map((c, i) => (c === '1' ? `<rect x="${i % 5}" y="${Math.floor(i / 5)}" width="1" height="1"/>` : ''))
    .join('')}</svg>`;

export async function mountStash(root) {
  let pool = [];
  try {
    pool = (await (await fetch(new URL('../convoy/data/loot-pool.json', import.meta.url))).json()).items;
  } catch {
    root.querySelector('tbody').innerHTML = '<tr><td colspan="4">The stash is empty.</td></tr>';
    return;
  }
  // a seeded handful, so the panel does not reshuffle on every visit
  let a = 20261004;
  const rand = () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296;
  const items = [];
  for (let i = 0; i < 22; i++) {
    const it = pool[Math.floor(rand() * pool.length)];
    if (items.some(x => x.id === it.id)) continue;
    const kind = it.gear ? GEAR[it.gear].kind : 'goods';
    items.push({
      ...it,
      kind,
      n: kind === 'ammo' || kind === 'goods' ? 1 + Math.floor(rand() * 4) : 1,
      value: Math.max(1, Math.round(it.price / 1000)),
    });
  }
  let sort = {key: 'kind', dir: 1};
  const body = root.querySelector('tbody');
  function render() {
    const rows = [...items].sort((x, y) => {
      const k = sort.key;
      return (typeof x[k] === 'number' ? x[k] - y[k] : String(x[k]).localeCompare(String(y[k]))) * sort.dir;
    });
    body.innerHTML = rows
      .map(
        it =>
          `<tr class="r-${it.rarity.replace(' ', '-')}"><td class="ty" title="${KIND[it.kind]}">${glyph(GLYPH[it.kind])}</td><td class="nm">${it.name}${
            it.gear ? `<small>${GEAR[it.gear].label}</small>` : ''
          }</td><td class="n">${it.n}</td><td class="v">${it.value}</td></tr>`,
      )
      .join('');
    for (const th of root.querySelectorAll('th[data-sort]'))
      th.setAttribute('aria-sort', th.dataset.sort === sort.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none');
    root.querySelector('.stash-total').textContent =
      `${items.reduce((s, it) => s + it.n, 0)} items · ${items.reduce((s, it) => s + it.n * it.value, 0)} ₽k`;
  }
  for (const th of root.querySelectorAll('th[data-sort]'))
    th.querySelector('button').onclick = () => {
      sort = {key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1};
      render();
    };
  render();
}
