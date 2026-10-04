// Rebel Band: a levelling and equipment demo. Bannerlord's party screen (stash left, the selected soldier in the middle,
// the band by class on the right) in the RimWorld + Nokia style, drawn with the placeholder set's paper-doll pawns and
// the gun sprites. Troops gain experience on raids and upgrade along set paths; every step needs the equipment the new
// troop carries, taken from the stash of stolen weapons. The state lives in this browser only (localStorage).
import '../shared/frame.js';
import {mountTopBar} from '../shared/topbar.js';
import {buildPawn, loadGuns, loadSet, lookFor} from '../convoy/sprite-art.js';
import {GEAR, CLASSES, TROOPS, LEADER, START_BAND, START_STASH, bandLimit, bandSize, ready, canUpgrade, upgrade} from './troops.js';
import * as mech from '../workbench/mech.js';

mountTopBar({title: 'Rebel Band', scene: 'viewer'});
const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs))
    if (v === null || v === undefined) continue;
    else if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v);
  e.append(...kids.filter(k => k !== null && k !== undefined));
  return e;
};

// ---------- state ----------
const KEY = 'parp-band';
const fresh = () => ({band: structuredClone(START_BAND), stash: {...START_STASH}, leader: structuredClone(LEADER), raids: 0});
let S = fresh();
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved?.band && saved?.stash) S = {...fresh(), ...saved};
} catch {}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch {}
};
let selected = 'leader'; // 'leader' or a troop id

// ---------- art ----------
const guns = await loadGuns();
const icons = Object.fromEntries(
  await Promise.all(Object.entries(GEAR).map(async ([id, g]) => [id, g.icon ? await loadSet(g.icon) : null])),
);
const pawns = new Map();
const lookOf = id =>
  id === 'leader'
    ? {...lookFor({id: 'leader', side: 'partisan'}), ...S.leader.look}
    : {...lookFor({id, side: 'partisan'}), ...TROOPS[id].look};
function pawnOf(id) {
  if (!pawns.has(id)) pawns.set(id, buildPawn(lookOf(id)));
  return pawns.get(id);
}
const gunOf = id => guns[id === 'leader' ? S.leader.gun : TROOPS[id].gun] || Object.values(guns)[0];
/** A pawn from the front, the gun held across it, drawn into a canvas: RimWorld's look. size: the pawn in pixels. */
async function drawPawn(canvas, id, {size = canvas.width, cy = canvas.height / 2, ground = false} = {}) {
  const p = await pawnOf(id),
    g = canvas.getContext('2d'),
    gun = gunOf(id);
  g.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  if (ground) {
    // a patch of RimWorld ground under the pawn, with its soft shadow
    const r = g.createRadialGradient(cx, cy + size * 0.3, 0, cx, cy + size * 0.3, size * 0.55);
    r.addColorStop(0, '#4a4234');
    r.addColorStop(1, 'rgba(40,36,30,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, canvas.width, canvas.height);
  }
  g.fillStyle = 'rgba(0,0,0,.32)';
  g.beginPath();
  g.ellipse(cx, cy + size * 0.27, size * 0.2, size * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  g.imageSmoothingEnabled = true;
  g.drawImage(p.south, cx - size / 2, cy - size / 2, size, size);
  if (gun) {
    // held across the body, muzzle up to the left, as RimWorld draws a pawn facing south with its weapon
    const len = size * 0.62 * Math.min(1.2, gun.length),
      h = (len * gun.img.height) / gun.img.width;
    g.save();
    g.translate(cx + size * 0.02, cy + size * 0.1);
    g.rotate(-0.6);
    g.drawImage(gun.img, -len / 2, -h / 2, len, h);
    g.restore();
  }
}
function drawIcon(canvas, id) {
  const g = canvas.getContext('2d'),
    gear = GEAR[id];
  g.clearRect(0, 0, canvas.width, canvas.height);
  const img = gear.gun ? guns[gear.gun]?.img : icons[id];
  if (!img) return;
  // guns fill the width (their sprites are long and thin, with clear space round them); items fit the box
  const k = gear.gun ? (canvas.width / img.width) * 1.25 : Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
  g.drawImage(img, (canvas.width - img.width * k) / 2, (canvas.height - img.height * k) / 2, img.width * k, img.height * k);
}

// ---------- rendering ----------
const neededNow = () => {
  if (selected === 'leader') return {};
  const need = {};
  for (const to of TROOPS[selected].to)
    for (const [item, per] of Object.entries(TROOPS[to].needs)) need[item] = Math.max(need[item] || 0, per);
  return need;
};
function renderStash() {
  const need = neededNow();
  const kinds = [
    ['weapon', 'Weapons'],
    ['attachment', 'Attachments'],
    ['ammo', 'Ammunition'],
    ['gear', 'Gear'],
  ];
  $('#stash').replaceChildren(
    ...kinds.flatMap(([kind, label]) => [
      el('h3', {}, label),
      ...Object.entries(GEAR)
        .filter(([, g]) => g.kind === kind)
        .map(([id, g]) => {
          const n = S.stash[id] || 0,
            c = el('canvas', {width: 128, height: 56, 'aria-hidden': 'true'});
          drawIcon(c, id);
          const cls = ['item', need[id] ? 'needed' : '', need[id] && n < need[id] ? 'short' : '', n ? '' : 'empty'].join(' ');
          return el('div', {class: cls, title: g.label}, c, el('span', {}, g.label), el('span', {class: 'n'}, String(n)));
        }),
    ]),
  );
}
function seg(k, fill) {
  return el('div', {
    class: 'seg',
    style: `--k:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%${fill ? `;--fill:${fill}` : ''}`,
    'aria-hidden': 'true',
  });
}
function renderBand() {
  const size = bandSize(S.band),
    limit = bandLimit(S.leader);
  $('#band-title').textContent = `Kestrel's Band`;
  $('#size').textContent = `Troops ${size} / ${limit}`;
  const lc = el('canvas', {width: 96, height: 96, 'aria-hidden': 'true'});
  drawPawn(lc, 'leader', {size: 120, cy: 60});
  $('#leader-card').replaceChildren(lc, el('span', {}, el('strong', {}, S.leader.name), el('br'), `Leader · level ${S.leader.level}`));
  $('#leader-card').setAttribute('aria-pressed', String(selected === 'leader'));
  $('#leader-card').onclick = () => choose('leader');
  $('#groups').replaceChildren(
    ...CLASSES.map(c => {
      const ids = Object.keys(TROOPS).filter(id => TROOPS[id].cls === c.id && S.band[id]?.count);
      const total = ids.reduce((s, id) => s + S.band[id].count, 0);
      return el(
        'section',
        {class: 'group', 'aria-label': c.label},
        el('h3', {}, c.label),
        el('div', {class: 'roman', 'aria-hidden': 'true'}, c.roman, el('small', {}, String(total))),
        el(
          'div',
          {class: 'cards'},
          ...ids.map(id => {
            const t = TROOPS[id],
              b = S.band[id],
              r = ready(S.band, id),
              can = t.to.some(to => canUpgrade(S.band, S.stash, id, to) > 0);
            const cv = el('canvas', {width: 236, height: 112, 'aria-hidden': 'true'});
            drawPawn(cv, id, {size: 150, cy: 70});
            const card = el(
              'button',
              {
                class: 'card',
                type: 'button',
                'aria-pressed': String(selected === id),
                'aria-label': `${t.label}, ${b.count} soldiers, tier ${t.tier}${r ? `, ${r} ready to upgrade` : ''}`,
                onclick: () => choose(id),
              },
              cv,
              el('span', {class: 'name'}, t.label),
              el('span', {class: 'count'}, String(b.count)),
              t.xp && t.to.length ? seg(b.count ? (b.xp % t.xp) / t.xp : 0) : null,
              el('span', {class: 'tier'}, 'T' + t.tier),
              r
                ? el(
                    'span',
                    {class: 'ready', title: can ? 'Ready to upgrade' : 'Ready, but the stash lacks the equipment'},
                    (can ? '▲ ' : '△ ') + r,
                  )
                : null,
            );
            return card;
          }),
        ),
      );
    }),
  );
}
async function renderCentre() {
  const detail = $('#detail');
  if (selected === 'leader') {
    const L = S.leader;
    $('#who').textContent = L.name;
    $('#who-sub').textContent = `Leader · level ${L.level} · band limit ${bandLimit(L)}`;
    detail.replaceChildren(
      el(
        'div',
        {class: 'skills'},
        el('span', {}, 'Experience'),
        seg(L.xp / L.next, '#e9c46a'),
        el('span', {}, `${L.xp} / ${L.next}`),
        ...Object.entries(L.skills).flatMap(([k, v]) => [el('span', {}, k), seg(v / 100), el('span', {}, String(v))]),
      ),
      el(
        'p',
        {class: 'note'},
        'Choose a troop on the right to see its upgrade paths. Raids give the band experience and loot; Leadership raises the band limit.',
      ),
    );
  } else {
    const t = TROOPS[selected],
      b = S.band[selected] || {count: 0, xp: 0},
      r = ready(S.band, selected);
    $('#who').textContent = t.label;
    $('#who-sub').textContent = `Tier ${t.tier} · ${b.count} in the band${t.xp && t.to.length ? ` · ${r} ready` : ''}`;
    const ups = t.to.map(to => {
      const T = TROOPS[to],
        n = canUpgrade(S.band, S.stash, selected, to);
      const cv = el('canvas', {width: 128, height: 128, 'aria-hidden': 'true'});
      drawPawn(cv, to, {size: 150, cy: 70});
      const needs = Object.entries(T.needs).map(([item, per]) => {
        const have = S.stash[item] || 0;
        return el('li', {class: have >= per ? 'ok' : 'no'}, `${per} × ${GEAR[item].label} (${have})`);
      });
      return el(
        'div',
        {class: 'up'},
        cv,
        el(
          'div',
          {},
          el('h3', {}, `→ ${T.label}`, el('small', {}, `  tier ${T.tier}`)),
          el(
            'ul',
            {class: 'needs', 'aria-label': 'Needs, per soldier'},
            ...(needs.length ? needs : [el('li', {class: 'ok'}, 'No equipment needed')]),
          ),
          el(
            'div',
            {class: 'row'},
            el(
              'button',
              {type: 'button', class: 'go', disabled: n < 1 ? '' : null, onclick: () => doUpgrade(selected, to, 1)},
              'Upgrade 1',
            ),
            el('button', {type: 'button', disabled: n < 2 ? '' : null, onclick: () => doUpgrade(selected, to, n)}, `Upgrade all (${n})`),
          ),
          el('p', {class: 'note', style: 'text-align:left'}, T.note),
        ),
      );
    });
    detail.replaceChildren(
      el(
        'div',
        {class: 'skills'},
        el('span', {}, 'Experience'),
        t.xp && t.to.length ? seg(b.count ? (b.xp - r * t.xp) / t.xp : 0, '#e9c46a') : el('span', {}, '—'),
        el('span', {}, t.xp && t.to.length ? `${Math.floor(b.xp)} xp · ${t.xp} a step` : 'Top of its path'),
      ),
      el('p', {class: 'note'}, t.note),
      ups.length ? el('div', {class: 'upgrades'}, ...ups) : el('p', {class: 'note'}, 'The last step on this path.'),
    );
  }
  await drawPawn($('#pawn'), selected, {size: 300, cy: 190, ground: true});
}
function render() {
  renderStash();
  renderBand();
  renderCentre();
  $('#status').textContent = `Raids ${S.raids} · ${Object.values(S.stash).reduce((a, b) => a + b, 0)} items in the stash`;
}
function choose(id) {
  selected = id;
  mech.handle(0.4);
  render();
}

// ---------- actions ----------
function doUpgrade(from, to, n) {
  const r = upgrade(S.band, S.stash, from, to, n);
  if (!r.n) return;
  S.band = r.band;
  S.stash = r.stash;
  mech.clunk(0.5);
  setTimeout(() => mech.charge(), 180);
  if (!S.band[from]) selected = to;
  save();
  render();
  $('#status').textContent = `${r.n} × ${TROOPS[from].label} → ${TROOPS[to].label}`;
}
// A raid on an army patrol: everyone gains experience, the leader too, and the band carries off what the patrol had.
$('#skirmish').onclick = () => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  for (const [id, b] of Object.entries(S.band)) if (TROOPS[id].xp) b.xp += b.count * rnd(18, 40);
  const L = S.leader;
  L.xp += rnd(60, 120);
  while (L.xp >= L.next) {
    L.xp -= L.next;
    L.level++;
    L.next = Math.round(L.next * 1.2);
    L.skills.Leadership = Math.min(100, L.skills.Leadership + 3);
    L.skills.Tactics = Math.min(100, L.skills.Tactics + 2);
  }
  const loot = {};
  const pool = Object.keys(GEAR);
  for (let i = 0; i < rnd(3, 6); i++) {
    const id = pool[rnd(0, pool.length - 1)];
    loot[id] = (loot[id] || 0) + rnd(1, 3);
  }
  for (const [id, n] of Object.entries(loot)) S.stash[id] = (S.stash[id] || 0) + n;
  // a few volunteers join from the villages
  const join = Math.min(rnd(2, 5), Math.max(0, bandLimit(L) - bandSize(S.band)));
  if (join) {
    S.band.volunteer ??= {count: 0, xp: 0};
    S.band.volunteer.count += join;
  }
  S.raids++;
  mech.setDown();
  setTimeout(() => mech.charge(), 220);
  save();
  render();
  $('#status').textContent = `Raid ${S.raids}: +XP for everyone, ${join} volunteers joined, loot: ${Object.entries(loot)
    .map(([id, n]) => `${n} ${GEAR[id].label}`)
    .join(', ')}`;
};
$('#reset').onclick = () => {
  S = fresh();
  selected = 'leader';
  save();
  mech.clunk(0.4);
  render();
};

render();
$('#loading').hidden = true;
// Test hook.
window.PARP_BAND = {
  get state() {
    return S;
  },
  choose,
  upgrade: doUpgrade,
  ready: true,
};
