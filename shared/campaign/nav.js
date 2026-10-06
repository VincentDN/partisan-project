// Travel on the campaign map (WP-W3): a navigation grid baked from the island (map/island.js) and the path search
// that the band and, later, the AI parties use. Every cell has a ground and a speed: sea cannot be crossed, roads are
// fast, open country is the baseline, forest, mountain and steep ground are slow and snow slower still. A path is
// the cheapest route in travel time (A* over the grid), smoothed where a straight line is no slower. Pure, no DOM.
import {heightAt, fbm, SNOWLINE, SIZE, ROADS, roadLine} from '../../map/island.js';

/** Speed multipliers per ground (1 = open country). Sea is impassable. */
export const GROUND = {sea: 0, road: 1.6, plain: 1, forest: 0.6, mountain: 0.7, steep: 0.5, snow: 0.4};
const KINDS = Object.keys(GROUND);
/** Map units a party covers per second of map time at speed 1 over open country (a day is 40 s at speed 1). */
export const BASE_SPEED = 6;

/** The forest of map/props.js (the same clumps the trees are planted in), so slow ground is where the trees are. */
const isForest = (x, z, h) => {
  if (h < 2.2 || h > SNOWLINE - 10) return false;
  const f = fbm(x / 70, z / 70, 41);
  return h > 26 ? f > 0.52 : f > 0.55;
};

/** Bake the grid: {cell, cols, rows, kind: Uint8Array (index into GROUND), h: Float32Array}. */
export function buildNav({cell = 4} = {}) {
  const cols = Math.ceil(SIZE.w / cell),
    rows = Math.ceil(SIZE.d / cell);
  const h = new Float32Array(cols * rows),
    kind = new Uint8Array(cols * rows);
  const cx = i => -SIZE.w / 2 + (i + 0.5) * cell,
    cz = j => -SIZE.d / 2 + (j + 0.5) * cell;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) h[j * cols + i] = heightAt(cx(i), cz(j));
  const at = (i, j) => h[Math.min(rows - 1, Math.max(0, j)) * cols + Math.min(cols - 1, Math.max(0, i))];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const y = h[j * cols + i],
        x = cx(i),
        z = cz(j);
      const slope = Math.hypot(at(i + 1, j) - at(i - 1, j), at(i, j + 1) - at(i, j - 1)) / (2 * cell);
      const k =
        y < 0.6 ? 'sea' : y > SNOWLINE ? 'snow' : slope > 0.9 ? 'steep' : isForest(x, z, y) ? 'forest' : y > 32 ? 'mountain' : 'plain';
      kind[j * cols + i] = KINDS.indexOf(k);
    }
  // roads: every cell a road passes through (bridges over a stream stay passable)
  for (const [a, b] of ROADS)
    for (const p of roadLine(a, b, cell / 2)) {
      const i = Math.floor((p.x + SIZE.w / 2) / cell),
        j = Math.floor((p.z + SIZE.d / 2) / cell);
      if (i >= 0 && j >= 0 && i < cols && j < rows) kind[j * cols + i] = KINDS.indexOf('road');
    }
  return {cell, cols, rows, kind, h};
}

const cellOf = (nav, x, z) => [Math.floor((x + SIZE.w / 2) / nav.cell), Math.floor((z + SIZE.d / 2) / nav.cell)];
const inside = (nav, i, j) => i >= 0 && j >= 0 && i < nav.cols && j < nav.rows;
const centre = (nav, i, j) => ({x: -SIZE.w / 2 + (i + 0.5) * nav.cell, z: -SIZE.d / 2 + (j + 0.5) * nav.cell});

/** The ground at (x, z): a key of GROUND ('sea' off the map). */
export function groundAt(nav, x, z) {
  const [i, j] = cellOf(nav, x, z);
  return inside(nav, i, j) ? KINDS[nav.kind[j * nav.cols + i]] : 'sea';
}
/** The speed multiplier at (x, z): 0 at sea. */
export const speedAt = (nav, x, z) => GROUND[groundAt(nav, x, z)];

/** The nearest passable point to (x, z) within `radius` map units, or null (a click on open sea). */
export function nearestLand(nav, x, z, radius = 24) {
  if (speedAt(nav, x, z) > 0) return {x, z};
  const [ci, cj] = cellOf(nav, x, z),
    r = Math.ceil(radius / nav.cell);
  let best = null,
    bd = Infinity;
  for (let j = cj - r; j <= cj + r; j++)
    for (let i = ci - r; i <= ci + r; i++) {
      if (!inside(nav, i, j) || !GROUND[KINDS[nav.kind[j * nav.cols + i]]]) continue;
      const c = centre(nav, i, j),
        d = Math.hypot(c.x - x, c.z - z);
      if (d < bd && d <= radius) [best, bd] = [c, d];
    }
  return best;
}

/** Seconds (map time, speed 1) to walk a straight line from a to b, sampled every half cell; Infinity across sea. */
export function lineTime(nav, a, b, base = BASE_SPEED) {
  const len = Math.hypot(b.x - a.x, b.z - a.z),
    n = Math.max(1, Math.ceil(len / (nav.cell / 2)));
  let t = 0;
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n,
      s = speedAt(nav, a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u);
    if (!s) return Infinity;
    t += len / n / (base * s);
  }
  return t;
}
/** Total travel time of a list of points. */
export const routeTime = (nav, points, base = BASE_SPEED) => points.slice(1).reduce((t, p, i) => t + lineTime(nav, points[i], p, base), 0);

/**
 * The quickest route from `from` to `to` ({x, z}): {points, length, time} or null when there is none (the target is
 * at sea or cut off). The target is moved to the nearest land when it is just off the coast.
 */
export function findPath(nav, from, to, base = BASE_SPEED) {
  const goal = nearestLand(nav, to.x, to.z);
  if (!goal || !speedAt(nav, from.x, from.z)) return null;
  const [si, sj] = cellOf(nav, from.x, from.z),
    [gi, gj] = cellOf(nav, goal.x, goal.z);
  const N = nav.cols * nav.rows,
    start = sj * nav.cols + si,
    target = gj * nav.cols + gi;
  const cost = new Float64Array(N).fill(Infinity),
    came = new Int32Array(N).fill(-1),
    closed = new Uint8Array(N);
  const step = k => nav.cell / (base * GROUND[KINDS[nav.kind[k]]]); // seconds to cross a cell
  const fastest = nav.cell / (base * GROUND.road);
  const hOf = k => {
    const dx = Math.abs((k % nav.cols) - gi),
      dz = Math.abs(Math.floor(k / nav.cols) - gj);
    return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * fastest; // octile, at road speed: admissible
  };
  const heap = new Heap();
  cost[start] = 0;
  heap.push(start, hOf(start));
  while (heap.size) {
    const k = heap.pop();
    if (k === target) break;
    if (closed[k]) continue;
    closed[k] = 1;
    const i = k % nav.cols,
      j = (k - i) / nav.cols;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di,
          nj = j + dj;
        if (!inside(nav, ni, nj)) continue;
        const n = nj * nav.cols + ni;
        if (closed[n] || !GROUND[KINDS[nav.kind[n]]]) continue;
        // no cutting a corner across sea
        if (di && dj && (!GROUND[KINDS[nav.kind[j * nav.cols + ni]]] || !GROUND[KINDS[nav.kind[nj * nav.cols + i]]])) continue;
        const c = cost[k] + ((step(k) + step(n)) / 2) * (di && dj ? Math.SQRT2 : 1);
        if (c < cost[n]) {
          cost[n] = c;
          came[n] = k;
          heap.push(n, c + hOf(n));
        }
      }
  }
  if (target !== start && came[target] < 0) return null;
  const cells = [];
  for (let k = target; k !== -1; k = came[k]) cells.push(k);
  cells.reverse();
  const raw = [{x: from.x, z: from.z}, ...cells.slice(1, -1).map(k => centre(nav, k % nav.cols, Math.floor(k / nav.cols))), goal];
  const points = smooth(nav, raw, base);
  let length = 0;
  for (let k = 1; k < points.length; k++) length += Math.hypot(points[k].x - points[k - 1].x, points[k].z - points[k - 1].z);
  return {points, length, time: routeTime(nav, points, base)};
}

/** Drop waypoints where a straight line is passable and no slower than the route it replaces. */
function smooth(nav, pts, base) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let best = i + 1;
    for (let j = Math.min(pts.length - 1, i + 40); j > i + 1; j--) {
      const along = routeTime(nav, pts.slice(i, j + 1), base);
      if (lineTime(nav, pts[i], pts[j], base) <= along * 1.001) {
        best = j;
        break;
      }
    }
    out.push(pts[best]);
    i = best;
  }
  return out;
}

/**
 * Move a party along its route for `dt` seconds of map time: party {x, z, route: {points, leg}}; the speed follows the
 * ground under it. Returns true when it has arrived (the route is then cleared).
 */
export function advance(nav, party, dt, base = BASE_SPEED) {
  const r = party.route;
  if (!r) return true;
  let left = dt;
  while (left > 0 && r.leg < r.points.length) {
    const p = r.points[r.leg],
      dx = p.x - party.x,
      dz = p.z - party.z,
      d = Math.hypot(dx, dz);
    const v = base * Math.max(0.05, speedAt(nav, party.x, party.z));
    if (d <= v * left) {
      party.x = p.x;
      party.z = p.z;
      left -= d / v;
      r.leg++;
    } else {
      party.x += (dx / d) * v * left;
      party.z += (dz / d) * v * left;
      party.heading = Math.atan2(dx, dz);
      left = 0;
    }
  }
  if (r.leg >= r.points.length) {
    party.route = null;
    return true;
  }
  return false;
}

/** A small binary min-heap of (key, priority). */
class Heap {
  constructor() {
    this.k = [];
    this.p = [];
  }
  get size() {
    return this.k.length;
  }
  push(k, p) {
    const {k: K, p: P} = this;
    K.push(k);
    P.push(p);
    for (let i = K.length - 1; i > 0;) {
      const up = (i - 1) >> 1;
      if (P[up] <= P[i]) break;
      [K[up], K[i]] = [K[i], K[up]];
      [P[up], P[i]] = [P[i], P[up]];
      i = up;
    }
  }
  pop() {
    const {k: K, p: P} = this;
    const top = K[0],
      lk = K.pop(),
      lp = P.pop();
    if (K.length) {
      K[0] = lk;
      P[0] = lp;
      for (let i = 0; ;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < K.length && P[l] < P[m]) m = l;
        if (r < K.length && P[r] < P[m]) m = r;
        if (m === i) break;
        [K[m], K[i]] = [K[i], K[m]];
        [P[m], P[i]] = [P[i], P[m]];
        i = m;
      }
    }
    return top;
  }
}
