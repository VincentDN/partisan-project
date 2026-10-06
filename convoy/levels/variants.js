// Map variations: the same level fought in different conditions, set by the campaign encounter (shared/campaign/
// contacts.js) or picked in practice. `vary(level, options)` returns a new level (the original is untouched):
//   time     'day' | 'dusk' | 'night'           night darkens the map and shortens everyone's sight
//   weather  'clear' | 'fog' | 'rain'           fog and rain shorten sight further
//   ground   'plain' | 'forest' | 'mountain' | 'snow' | 'coast'   the ground's colours (from where the fight is on the map)
//   strength enemy strength relative to the level's own (0.6 to 1.6): soldiers are added or stood down
// Deterministic (a seeded generator), so the same encounter always sets up the same fight.
import {lcg} from './util.js';

export const TIMES = ['day', 'dusk', 'night'];
export const WEATHERS = ['clear', 'fog', 'rain'];
/** Ground colours: [base, darker patch tone, road] as hex numbers for the renderer. */
export const GROUNDS = {
  plain: null, // the level's own colours
  forest: [0x3f5230, 0x34452a, 0x4e4a3e],
  mountain: [0x6a6656, 0x5a5648, 0x6e6a5c],
  snow: [0xc9cdd0, 0xb3b8bb, 0x8c8a84],
  coast: [0x9a8f68, 0x857b58, 0x8a8170],
};
const SIGHT = {day: 1, dusk: 0.8, night: 0.6};
const WEATHER_SIGHT = {clear: 1, fog: 0.6, rain: 0.8};

/** Mix a colour toward a target by k (0..1). */
function mix(a, b, k) {
  const ch = (c, s) => (c >> s) & 255;
  const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/** How many soldiers the level puts in the field (on foot, in vehicles and in its waves). */
export function enemyCount(level) {
  const crew = (level.convoy?.vehicles || []).reduce((a, v) => a + v.crew.length, 0);
  const waves = (level.waves || []).reduce(
    (a, w) => a + w.squads.reduce((b, s) => b + s.units.length, 0) + (w.vehicle?.crew.length || 0),
    0,
  );
  return crew + (level.units?.length || 0) + waves + (level.reinforcements?.units.length || 0);
}

/** Scale a list of soldiers to `k` of its size: drop from the end, or add copies a little to the side of the originals. */
function scaleUnits(units, k, rnd, tag) {
  const want = Math.max(1, Math.round(units.length * k));
  if (want <= units.length) return units.slice(0, want);
  const out = [...units];
  for (let i = 0; out.length < want; i++) {
    const u = units[i % units.length];
    const dx = (rnd() - 0.5) * 3,
      dz = (rnd() - 0.5) * 3;
    out.push({
      ...u,
      name: `Pvt. ${['Bakic', 'Cvetko', 'Dolenc', 'Erjavec', 'Fister', 'Golob', 'Hrovat', 'Jerman', 'Kranjc', 'Lesjak'][(i + tag) % 10]}`,
      role: u.role === 'leader' || u.role === 'rto' ? 'rifleman' : u.role,
      x: u.x + dx,
      z: u.z + dz,
      patrol: u.patrol?.map(p => ({x: p.x + dx, z: p.z + dz})),
      path: u.path?.map(p => ({x: p.x + dx, z: p.z + dz})),
    });
  }
  return out;
}

/** The level under these conditions. */
export function vary(level, {time = null, weather = 'clear', ground = 'plain', strength = 1, seed = 1} = {}) {
  const rnd = lcg(seed * 2654435761 + 17);
  const L = structuredClone(level);
  const t = time || (level.night ? 'night' : 'day');
  L.variant = {time: t, weather, ground, strength};
  // light and sight
  L.night = t === 'night';
  L.sight = (level.sight ?? 1) * (level.night ? 1 : SIGHT[t]) * WEATHER_SIGHT[weather];
  L.weather = weather;
  if (t === 'dusk') L.dusk = true;
  // the ground's colours
  const g = GROUNDS[ground];
  if (g) {
    L.ground = {
      ...L.ground,
      color: mix(L.ground.color, g[0], 0.75),
      patches: (L.ground.patches || []).map(p => ({...p, color: mix(p.color ?? L.ground.color, g[1], 0.6)})),
      roads: (L.ground.roads || []).map(r => ({...r, color: mix(r.color ?? 0x6b6150, g[2], 0.5)})),
    };
  }
  // the enemy's strength
  const k = Math.min(1.6, Math.max(0.6, strength));
  if (Math.abs(k - 1) > 0.05) {
    if (L.units?.length) L.units = scaleUnits(L.units, k, rnd, 0);
    if (L.reinforcements) L.reinforcements.units = scaleUnits(L.reinforcements.units, k, rnd, 3);
    for (const [i, w] of (L.waves || []).entries()) for (const s of w.squads) s.units = scaleUnits(s.units, k, rnd, i + 5);
    if (L.convoy) {
      const v = L.convoy.vehicles;
      if (k < 0.85 && v.length > 2) v.pop(); // a weak column: the rear vehicle stays home
      if (k > 1.25) {
        // a strong column: another truck of riflemen at the back
        const truck = v.find(x => x.kind === 'truck') || v[v.length - 1];
        v.push({...structuredClone(truck), id: 'truck2', gap: truck.gap || 13});
      }
    }
  }
  const tag = [t !== 'day' ? t : '', weather !== 'clear' ? weather : ''].filter(Boolean).join(', ');
  if (tag) L.title = `${level.title} (${tag})`;
  return L;
}

/** Conditions for a practice fight from a seed: mostly day and clear, sometimes not. */
export function randomConditions(seed) {
  const r = lcg(seed + 99);
  return {time: r() < 0.6 ? 'day' : r() < 0.5 ? 'dusk' : 'night', weather: r() < 0.65 ? 'clear' : r() < 0.5 ? 'fog' : 'rain'};
}
