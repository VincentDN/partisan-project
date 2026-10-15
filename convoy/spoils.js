// The spoils of a won mission: a screen that deals the rewards out one by one, each with its picture (the rifle's own
// sprite, the item's icon) and a bright "blip", then offers the way on: back to the world map, or to the Rebel Band to
// spend it on the troops. It shows what the result already holds (shared/campaign/loot-report.js counts it); nothing
// is awarded here. Reduced motion: no fly-in, the cards simply appear. Keyboard: Enter or Space deals the rest at once;
// the buttons take focus at the end.
import {GEAR} from '../band/troops.js';
import {ARMS} from '../shared/inventory/arms.js';

/** A catalogue weapon (kit slug) as the gun sprite it is drawn with (by the gear id it shares with ARMS). */
const GUN_OF_SLUG = Object.fromEntries(
  Object.entries(ARMS)
    .map(([id, a]) => [a.weapon, GEAR[id]?.gun || {ak: 'ak74m', pkm: 'set-lmg', svd: 'set-sniper', rpg: 'set-rocket'}[id]])
    .filter(([, gun]) => gun),
);
const WEAR_ICON = {headwear: 'helmet', armor: 'vest'};

/**
 * The rewards to show, weapons first: [{name, count, gun?, icon?, from}]. Stash loot and convoy cargo (gear ids),
 * then what came home in the kits (catalogue slugs): weapons, attachments and wearables as cards; rounds, magazines and
 * the rest summed up as one line. Valuables are listed by name.
 */
export function spoilsOf(result, {catalogue = null} = {}) {
  const cards = [],
    rest = {};
  const gear = (id, n, from) => {
    const g = GEAR[id];
    if (g) cards.push({name: g.label, count: n, gun: g.gun || null, icon: g.icon || null, kind: g.kind, from});
  };
  for (const [id, n] of Object.entries(result?.loot || {})) gear(id, n, 'stash');
  for (const [id, n] of Object.entries(result?.cargo || {})) gear(id, n, 'cargo');
  for (const [slug, n] of Object.entries(result?.kitGains || {})) {
    const d = catalogue?.has?.(slug) ? catalogue.def(slug) : null;
    if (!d) continue;
    if (d.kind === 'weapon' || d.kind === 'headwear' || d.kind === 'armor')
      cards.push({
        name: d.name,
        count: n,
        gun: GUN_OF_SLUG[slug] || null,
        icon: d.kind === 'weapon' ? null : GEAR[WEAR_ICON[d.kind]]?.icon,
        kind: d.kind,
        from: 'kit',
      });
    else rest[d.kind] = (rest[d.kind] || 0) + n;
  }
  // the same thing from two places (a rifle in the loot and in the cargo) is one card
  const merged = [];
  for (const c of cards) {
    const same = merged.find(m => m.name === c.name);
    if (same) same.count += c.count;
    else merged.push({...c});
  }
  const rank = c => (c.kind === 'weapon' ? 0 : c.kind === 'attachment' ? 1 : 2);
  merged.sort((a, b) => rank(a) - rank(b));
  const goods = (result?.goods || []).map(g => g.name);
  return {cards: merged, rest, goods};
}

/** A short rising "blip" (higher for each card dealt; a chord for a weapon). */
function blip(ctx, i, weapon, volume) {
  const t = ctx.currentTime,
    base = 660 * Math.pow(2, Math.min(i, 12) / 12);
  for (const [k, f] of (weapon ? [0, 4, 7] : [0, 7]).entries()) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = k ? 'triangle' : 'square';
    o.frequency.setValueAtTime(base * Math.pow(2, f / 12), t + k * 0.04);
    g.gain.setValueAtTime(0, t + k * 0.04);
    g.gain.linearRampToValueAtTime(0.12 * volume, t + k * 0.04 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.04 + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(t + k * 0.04);
    o.stop(t + k * 0.04 + 0.25);
  }
}

/**
 * Show the spoils over the page. opts: {result, catalogue, guns: {id: {img}}, icons: (path) => Promise<img>, sound:
 * {on, volume}, reduceMotion, onMap, onBand}. Returns the overlay element.
 */
export function showSpoils({
  result,
  catalogue,
  guns = {},
  icons = async () => null,
  sound = {on: true, volume: 0.5},
  reduceMotion = false,
  onMap,
  onBand,
}) {
  const {cards, rest, goods} = spoilsOf(result, {catalogue});
  const el = (tag, cls, text) =>
    Object.assign(document.createElement(tag), {className: cls || '', ...(text != null ? {textContent: text} : {})});
  const box = el('div', 'spoils');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'spoils-title');
  const title = el('h2', 'spoils-title', 'Spoils of war');
  title.id = 'spoils-title';
  const grid = el('ul', 'spoils-grid');
  grid.setAttribute('aria-live', 'polite');
  const footer = el('div', 'spoils-foot');
  const more = [
    ...Object.entries(rest).map(([k, n]) => `${n} ${k === 'ammo' ? 'rounds' : k === 'magazine' ? 'magazines' : k}`),
    ...(goods.length ? [`valuables: ${goods.join(', ')}`] : []),
  ];
  const extra = el('p', 'spoils-more', more.length ? `Also brought home: ${more.join(' · ')}.` : '');
  const toMap = el('button', 'primary', 'Back to the world map'),
    toBand = el('button', '', 'Rebel Band: upgrade troops');
  toMap.type = toBand.type = 'button';
  toMap.onclick = () => onMap?.();
  toBand.onclick = () => onBand?.();
  footer.append(extra, el('div', 'spoils-actions'));
  footer.lastChild.append(toBand, toMap);
  footer.hidden = true;
  box.append(title, cards.length ? grid : el('p', 'spoils-none', 'Nothing new to show this time.'), footer);
  document.body.append(box);

  let ctx = null;
  try {
    if (sound.on) ctx = new AudioContext();
  } catch {}
  /** The card for one reward: its picture drawn into a canvas, the name and count under it. */
  async function card(c) {
    const li = el('li', `spoils-card spoils-${c.kind || 'item'}`);
    const cv = el('canvas');
    cv.width = 220;
    cv.height = 110;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const img = (c.gun && guns[c.gun]?.img) || (c.icon && (await icons(c.icon).catch(() => null)));
    if (img) {
      const s = Math.min(200 / img.width, 96 / img.height);
      const [x, y, w, h] = [(220 - img.width * s) / 2, (110 - img.height * s) / 2, img.width * s, img.height * s];
      g.drawImage(img, x, y, w, h);
      // clothing art is white, to be dyed: give it a field-green, keeping its shading
      if (/Apparel/.test(c.icon || '')) {
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = '#6f7a52';
        g.fillRect(x, y, w, h);
        g.globalCompositeOperation = 'destination-in';
        g.drawImage(img, x, y, w, h);
        g.globalCompositeOperation = 'source-over';
      }
    }
    cv.setAttribute('aria-hidden', 'true');
    li.append(cv, el('b', '', c.name), el('span', 'spoils-count', `× ${c.count}`));
    li.setAttribute('aria-label', `${c.name}, ${c.count}`);
    return li;
  }
  let pace = 420; // ms between cards; a key or a click deals the rest at once
  const hurry = e => {
    if (footer.hidden && (e.type === 'pointerdown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault?.();
      pace = 0;
    }
  };
  box.addEventListener('pointerdown', hurry);
  addEventListener('keydown', hurry, true);
  const done = (async () => {
    for (const [i, c] of cards.entries()) {
      const li = await card(c);
      if (!reduceMotion) li.classList.add('dealt'); // reduced motion: each card simply appears, still one by one
      grid.append(li);
      if (ctx) blip(ctx, i, c.kind === 'weapon', sound.volume ?? 0.5);
      await new Promise(r => setTimeout(r, pace));
    }
    footer.hidden = false;
    removeEventListener('keydown', hurry, true);
    toMap.focus();
  })();
  box.done = done;
  box.close = () => {
    box.remove();
    ctx?.close?.();
  };
  return box;
}
