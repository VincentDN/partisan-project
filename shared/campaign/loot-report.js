// Read-only combat recovery accounting: stash rewards, convoy cargo, valuables and net additions to carried kits.
import {scripFor} from '../../convoy/loot.js';
import {GEAR} from '../../band/troops.js';
import {NAMES} from '../../convoy/roster.js';

/** Count equipment and rounds, including nested containers and loaded magazines, once across the whole squad. */
export function kitCounts(kits = {}) {
  const counts = {},
    seen = new Set();
  const add = (slug, n = 1) => {
    if (slug && n > 0) counts[slug] = (counts[slug] || 0) + n;
  };
  function visit(item) {
    if (!item || (item.uid && seen.has(item.uid))) return;
    if (item.uid) seen.add(item.uid);
    if (item.slug !== 'pockets') add(item.slug, item.count || 1);
    for (const [slug, n] of item.rounds || []) add(slug, n);
    if (item.chamber) add(item.chamber);
    visit(item.mag);
    for (const grid of item.grids || []) for (const entry of grid.items || []) visit(entry.item);
  }
  for (const kit of Object.values(kits))
    for (const key of ['primary', 'secondary', 'armor', 'headwear', 'rig', 'pockets', 'backpack']) visit(kit?.[key]);
  return counts;
}

/** Additions are net quantities brought home, so rounds fired or supplies used are not counted as recovered. */
export function kitGains(before, after) {
  const a = kitCounts(before),
    b = kitCounts(after);
  return Object.fromEntries(
    Object.entries(b)
      .map(([slug, n]) => [slug, n - (a[slug] || 0)])
      .filter(([, n]) => n > 0),
  );
}

/** DOM is built with textContent: item names from a save never become HTML. No awards happen here. */
export function lootReport(result, {catalogue = null, title = 'Combat recovery report'} = {}) {
  const el = (tag, text) => {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    return n;
  };
  const root = el('section');
  root.className = 'loot-report';
  root.setAttribute('aria-label', title);
  root.append(el('h2', title));
  if (!result) {
    root.append(el('p', 'No recovery report is available.'));
    return root;
  }
  const gearName = id => GEAR[id]?.label || id;
  const itemName = slug => catalogue?.def(slug)?.name || catalogue?.def(slug)?.short || slug;
  const group = (heading, rows, empty) => {
    root.append(el('h3', heading));
    if (!rows.length) {
      root.append(el('p', empty));
      return;
    }
    const list = el('ul');
    for (const [name, count] of rows) list.append(el('li', `${name} × ${count}`));
    root.append(list);
  };
  root.append(
    el(
      'p',
      result.outcome === 'withdrawn'
        ? 'Withdrawn: no new loot recovered.'
        : `${result.outcome === 'won' ? 'Victory' : 'Defeat'} — recovered supplies are listed below.`,
    ),
  );
  group(
    'Mission loot → stash',
    Object.entries(result.loot || {}).map(([id, n]) => [gearName(id), n]),
    'No mission loot recovered.',
  );
  group(
    'Convoy cargo → stash',
    Object.entries(result.cargo || {}).map(([id, n]) => [gearName(id), n]),
    'No convoy cargo recovered.',
  );
  group(
    'Valuables → trade goods',
    (result.goods || []).map(g => [`${g.name} (${scripFor(g)} barter value)`, 1]),
    'No valuables recovered.',
  );
  group(
    'Net new equipment and ammunition → carried kit',
    Object.entries(result.kitGains || {}).map(([slug, n]) => [itemName(slug), n]),
    result.kitGains == null ? 'No carried-kit comparison is available for this result.' : 'No net additions to carried kit.',
  );
  root.append(
    el(
      'p',
      'Carried-kit additions compare the whole squad at insertion and return. Transfers between fighters are not new loot; ammunition spent is deducted.',
    ),
  );
  for (const [id, kit] of Object.entries(result.kits || {})) {
    const detail = el('details'),
      summary = el('summary', `${NAMES[id] || id}: returned equipment`);
    detail.append(summary);
    const list = el('ul');
    for (const [slug, n] of Object.entries(kitCounts({[id]: kit}))) list.append(el('li', `${itemName(slug)} × ${n}`));
    detail.append(list);
    root.append(detail);
  }
  return root;
}
