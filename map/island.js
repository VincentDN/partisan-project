// The island of the overworld test: its shape (a seeded heightfield), provinces, settlements, roads and factions.
// Pure data and maths (no three.js): the terrain, props and parties are built from it. Units are map units (about
// 10 m each); +x east, +z south, y up; sea level is 0.

export const SIZE = {w: 960, d: 720}; // the land fits in x -480..480, z -360..360
export const SNOWLINE = 56;

// ---------- seeded value noise ----------
function hash(x, z, seed) {
  let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function noise(x, z, seed = 1) {
  const xi = Math.floor(x),
    zi = Math.floor(z),
    fx = x - xi,
    fz = z - zi,
    u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi, seed),
    b = hash(xi + 1, zi, seed),
    c = hash(xi, zi + 1, seed),
    d = hash(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, z, seed = 1, octaves = 5) => {
  let s = 0,
    amp = 0.5,
    f = 1;
  for (let i = 0; i < octaves; i++) {
    s += noise(x * f, z * f, seed + i * 17) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return s; // about 0..1
};
const ridge = (x, z, seed) => {
  let s = 0,
    amp = 0.5,
    f = 1;
  for (let i = 0; i < 5; i++) {
    s += (1 - Math.abs(noise(x * f, z * f, seed + i * 31) * 2 - 1)) ** 2 * amp;
    f *= 2.1;
    amp *= 0.5;
  }
  return s;
};
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The massif: a snowy spine running north-west to south-east, a second peak in the north, rolling hills elsewhere.
const PEAKS = [
  {x: -120, z: -90, r: 170, h: 62},
  {x: 60, z: -170, r: 130, h: 54},
  {x: 210, z: 40, r: 120, h: 34},
  {x: -300, z: 120, r: 110, h: 24},
];
/** Height at (x, z): negative is sea. */
export function heightAt(x, z) {
  // an irregular coastline: an ellipse whose radius wanders with the angle and with noise
  const nx = x / (SIZE.w / 2),
    nz = z / (SIZE.d / 2);
  const ang = Math.atan2(nz, nx);
  const r = Math.hypot(nx, nz);
  const coast = 0.86 + 0.09 * Math.sin(ang * 3 + 1.2) + 0.06 * Math.sin(ang * 7 - 0.4) + (fbm(nx * 2.2 + 5, nz * 2.2, 3) - 0.5) * 0.32;
  const land = smooth(coast + 0.05, coast - 0.18, r); // 1 inland, 0 at sea
  let h = -14 + land * 18; // shelf to plain
  // hills everywhere, rougher inland
  h += (fbm(x / 90, z / 90, 7) - 0.45) * 22 * land;
  // the mountains
  for (const p of PEAKS) {
    const d = Math.hypot(x - p.x, z - p.z) / p.r;
    if (d < 1.4) h += p.h * smooth(1.25, 0.05, d) * (0.55 + 0.75 * ridge(x / 70, z / 70, 11)) * land;
  }
  // coves and headlands: small bays bitten into the coast
  h -= smooth(0.5, 0.95, fbm(x / 60 + 40, z / 60, 21)) * 10 * smooth(0.72, 1, r);
  // no inland pools: well inside the coast the ground stays above the sea
  if (land > 0.7) h = Math.max(h, 0.8 + (land - 0.7) * 8);
  return h;
}

/** Bake the heightfield on a grid: {w, d, cols, rows, step, h: Float32Array}, row-major from the north-west. */
export function bakeHeights(cols = 241, rows = 181) {
  const step = SIZE.w / (cols - 1);
  const h = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) h[j * cols + i] = heightAt(-SIZE.w / 2 + i * step, -SIZE.d / 2 + j * step);
  return {w: SIZE.w, d: SIZE.d, cols, rows, step, h};
}
/** Bilinear height from a baked field. */
export function sample(field, x, z) {
  const fx = (x + field.w / 2) / field.step,
    fz = (z + field.d / 2) / field.step;
  const i = Math.max(0, Math.min(field.cols - 2, Math.floor(fx))),
    j = Math.max(0, Math.min(field.rows - 2, Math.floor(fz)));
  const u = Math.min(1, Math.max(0, fx - i)),
    v = Math.min(1, Math.max(0, fz - j));
  const k = j * field.cols + i;
  const a = field.h[k],
    b = field.h[k + 1],
    c = field.h[k + field.cols],
    d = field.h[k + field.cols + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ---------- the political map (placeholder: the canon factions come with WP-D3) ----------
export const FACTIONS = {
  resistance: {name: 'The Resistance', short: 'Free State', color: '#4f9a4a', banner: '#2f6b33', emblem: 'λ'},
  invader: {name: 'The Invader', short: 'Occupation', color: '#c2402f', banner: '#7a1f17', emblem: '✦'},
  neutral: {name: 'Independent', short: 'Neutral', color: '#c9a64a', banner: '#7a6326', emblem: '◆'},
};

// Settlements: towns (walled), villages, an army base, a rebel camp. Each is the seat of a province.
export const SETTLEMENTS = [
  {id: 'kastro', name: 'Kastro', kind: 'town', faction: 'invader', x: 220, z: 160, prosperity: 'Thriving', garrison: 220, militia: 40},
  {
    id: 'agia-marina',
    name: 'Agia Marina',
    kind: 'town',
    faction: 'invader',
    x: -290,
    z: 0,
    prosperity: 'Average',
    garrison: 160,
    militia: 30,
  },
  {
    id: 'fort-orion',
    name: 'Fort Orion',
    kind: 'base',
    faction: 'invader',
    x: 120,
    z: 40,
    prosperity: 'Garrison',
    garrison: 340,
    militia: 0,
  },
  {id: 'myrtia', name: 'Myrtia', kind: 'village', faction: 'invader', x: 320, z: -30, prosperity: 'Poor', garrison: 25, militia: 18},
  {id: 'pelekas', name: 'Pelekas', kind: 'village', faction: 'neutral', x: -150, z: 200, prosperity: 'Average', garrison: 0, militia: 35},
  {id: 'korfos', name: 'Korfos', kind: 'village', faction: 'neutral', x: -60, z: 110, prosperity: 'Thriving', garrison: 0, militia: 42},
  {id: 'lithia', name: 'Lithia', kind: 'village', faction: 'resistance', x: -240, z: -190, prosperity: 'Poor', garrison: 0, militia: 26},
  {
    id: 'oros-camp',
    name: 'Oros Camp',
    kind: 'camp',
    faction: 'resistance',
    x: -180,
    z: -30,
    prosperity: 'Hidden',
    garrison: 45,
    militia: 0,
  },
  {id: 'vrisi', name: 'Vrisi', kind: 'village', faction: 'resistance', x: 160, z: -200, prosperity: 'Average', garrison: 0, militia: 22},
];
export const ROADS = [
  ['agia-marina', 'pelekas'],
  ['pelekas', 'korfos'],
  ['korfos', 'kastro'],
  ['kastro', 'fort-orion'],
  ['fort-orion', 'myrtia'],
  ['fort-orion', 'agia-marina'],
  ['agia-marina', 'lithia'],
  ['myrtia', 'vrisi'],
  ['oros-camp', 'lithia'],
  ['korfos', 'fort-orion'],
];
/**
 * A road's line over the ground: a wandering curve between two settlements (midpoints pushed sideways by noise, then a
 * centripetal Catmull-Rom spline through them, as three.js draws one), as points about `spacing` map units apart.
 * Pure, so the road ribbon (map/props.js) and travel (shared/campaign/nav.js) follow exactly the same line.
 */
export function roadLine(a, b, spacing = 2.5) {
  const A = byId(a),
    B = byId(b);
  const len = Math.hypot(B.x - A.x, B.z - A.z),
    nx = -(B.z - A.z) / len,
    nz = (B.x - A.x) / len;
  const ctrl = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6,
      off = i === 0 || i === 6 ? 0 : (noise(t * 3 + A.x * 0.01, A.z * 0.01, 5) - 0.5) * len * 0.25;
    ctrl.push({x: A.x + (B.x - A.x) * t + nx * off, z: A.z + (B.z - A.z) * t + nz * off});
  }
  // dense samples of the spline, then resampled evenly by arc length
  const dense = [];
  for (let k = 0; k < ctrl.length - 1; k++) {
    const p0 = ctrl[k - 1] || {x: 2 * ctrl[0].x - ctrl[1].x, z: 2 * ctrl[0].z - ctrl[1].z},
      p3 = ctrl[k + 2] || {x: 2 * ctrl.at(-1).x - ctrl.at(-2).x, z: 2 * ctrl.at(-1).z - ctrl.at(-2).z};
    const seg = centripetal(p0, ctrl[k], ctrl[k + 1], p3);
    for (let i = 0; i < 40; i++) dense.push(seg(i / 40));
  }
  dense.push(ctrl.at(-1));
  const acc = [0];
  for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z));
  const n = Math.ceil(len / spacing),
    total = acc.at(-1),
    out = [];
  for (let i = 0, j = 1; i <= n; i++) {
    const want = (total * i) / n;
    while (j < acc.length - 1 && acc[j] < want) j++;
    const u = (want - acc[j - 1]) / (acc[j] - acc[j - 1] || 1);
    out.push({x: dense[j - 1].x + (dense[j].x - dense[j - 1].x) * u, z: dense[j - 1].z + (dense[j].z - dense[j - 1].z) * u});
  }
  return out;
}
/** One centripetal Catmull-Rom segment from p1 to p2: t in 0..1 -> {x, z}. */
function centripetal(p0, p1, p2, p3) {
  let d01 = Math.sqrt(Math.hypot(p1.x - p0.x, p1.z - p0.z)),
    d12 = Math.sqrt(Math.hypot(p2.x - p1.x, p2.z - p1.z)),
    d23 = Math.sqrt(Math.hypot(p3.x - p2.x, p3.z - p2.z));
  if (d12 < 1e-4) d12 = 1;
  if (d01 < 1e-4) d01 = d12;
  if (d23 < 1e-4) d23 = d12;
  const axis = k => {
    const [x0, x1, x2, x3] = [p0[k], p1[k], p2[k], p3[k]];
    const t1 = ((x1 - x0) / d01 - (x2 - x0) / (d01 + d12) + (x2 - x1) / d12) * d12,
      t2 = ((x2 - x1) / d12 - (x3 - x1) / (d12 + d23) + (x3 - x2) / d23) * d12;
    return t => {
      const t2_ = t * t,
        t3 = t2_ * t;
      return x1 + t1 * t + (-3 * x1 + 3 * x2 - 2 * t1 - t2) * t2_ + (2 * x1 - 2 * x2 + t1 + t2) * t3;
    };
  };
  const fx = axis('x'),
    fz = axis('z');
  return t => ({x: fx(t), z: fz(t)});
}
/** Where the parties stand (map/parties.js): kept clear of trees. The player first. */
export const PARTY_SPOTS = {
  player: [-160, 40],
  orion: [78, 52],
  korfos: [-30, 92],
  raiders: [-80, 24], // on the ridge east of the player: the enemy in the distance
};
/** Which settlement's province a point belongs to (nearest seat, over land). */
export function provinceAt(x, z) {
  let best = null,
    bd = Infinity;
  for (const s of SETTLEMENTS) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < bd) [best, bd] = [s, d];
  }
  return best;
}
export const byId = id => SETTLEMENTS.find(s => s.id === id);
