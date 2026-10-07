// Walking round things (WP-QA21): a unit whose straight line to its destination is blocked by cover follows a path
// planned over a 1 m grid of the level instead of sliding into the obstacle. The grid marks the cells a body cannot
// stand in (static cover grown by a body's radius), built once per level; vehicles and fieldworks, which move or
// appear, are marked into it for each search. A* with eight neighbours and no corner cutting, capped in size, then
// string-pulled to the farthest point walkable in a straight line. Only geometry: fights stay seeded.
import {inBox, segmentBox} from './sim.js';

const CELL = 1,
  BODY = 0.45 + 0.15, // a unit's radius and a little air
  MAX_EXPAND = 4000, // cells a search may open: a path round a building, not a tour of the map
  PULL = 30; // cells ahead the string-pull looks for a straight stretch

/** The level's walk grid, with working arrays reused from search to search (cached on the sim). */
function grid(sim) {
  if (sim._walk) return sim._walk;
  const B = sim.level.bounds;
  const w = Math.ceil((B.maxX - B.minX) / CELL),
    h = Math.ceil((B.maxZ - B.minZ) / CELL);
  const solid = new Uint8Array(w * h);
  for (const b of sim.level.cover) {
    const i0 = Math.max(0, Math.floor((b.x - b.w / 2 - BODY - B.minX) / CELL)),
      i1 = Math.min(w - 1, Math.floor((b.x + b.w / 2 + BODY - B.minX) / CELL)),
      j0 = Math.max(0, Math.floor((b.z - b.d / 2 - BODY - B.minZ) / CELL)),
      j1 = Math.min(h - 1, Math.floor((b.z + b.d / 2 + BODY - B.minZ) / CELL));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = B.minX + (i + 0.5) * CELL,
          z = B.minZ + (j + 0.5) * CELL;
        if (inBox(x, z, b, BODY)) solid[j * w + i] = 1;
      }
  }
  const n = w * h;
  // g, from, seen, shut and dyn are marked with the search number instead of being cleared for every search
  return (sim._walk = {
    w,
    h,
    solid,
    x0: B.minX,
    z0: B.minZ,
    g: new Float32Array(n),
    from: new Int32Array(n),
    seen: new Uint32Array(n),
    shut: new Uint32Array(n),
    dyn: new Uint32Array(n),
    tick: 0,
  });
}

/** Can a body walk the straight segment a->b without touching cover, a fieldwork or a vehicle? */
export function walkable(sim, ax, az, bx, bz, r = BODY - 0.1) {
  const hits = b => !inBox(ax, az, b) && segmentBox(ax, az, bx, bz, b, r) <= 1; // touching a box is no excuse to walk through it
  return !sim.someCoverAlong(ax, az, bx, bz, hits) && !sim.dynamicBoxes().some(hits);
}

/** A path of points from u to goal round what is in the way ([] when there is none), string-pulled. */
export function findPath(sim, u, goal) {
  const G = grid(sim),
    {w, h, solid, x0, z0, g, from, seen, shut, dyn} = G;
  const tick = ++G.tick;
  // what moves or appears (vehicles, fieldworks) is marked into the grid for this search only
  for (const b of sim.dynamicBoxes()) {
    const i0 = Math.max(0, Math.floor((b.x - b.w / 2 - BODY - x0) / CELL)),
      i1 = Math.min(w - 1, Math.floor((b.x + b.w / 2 + BODY - x0) / CELL)),
      j0 = Math.max(0, Math.floor((b.z - b.d / 2 - BODY - z0) / CELL)),
      j1 = Math.min(h - 1, Math.floor((b.z + b.d / 2 + BODY - z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) dyn[j * w + i] = tick;
  }
  const blocked = n => solid[n] === 1 || dyn[n] === tick;
  const cellOf = (x, z) => [
    Math.min(w - 1, Math.max(0, Math.floor((x - x0) / CELL))),
    Math.min(h - 1, Math.max(0, Math.floor((z - z0) / CELL))),
  ];
  const centre = n => ({x: x0 + ((n % w) + 0.5) * CELL, z: z0 + (Math.floor(n / w) + 0.5) * CELL});
  /** The nearest open cell to (i, j) within three cells, or null. */
  const open = (i, j) => {
    if (!blocked(j * w + i)) return [i, j];
    for (let rr = 1; rr <= 3; rr++)
      for (let dj = -rr; dj <= rr; dj++)
        for (let di = -rr; di <= rr; di++) {
          const ni = i + di,
            nj = j + dj;
          if (ni >= 0 && nj >= 0 && ni < w && nj < h && !blocked(nj * w + ni)) return [ni, nj];
        }
    return null;
  };
  // Pressed against cover, the unit stands in the margin kept round it; a destination may lie inside cover. Both
  // move to the nearest open cell; a destination with none near is out of reach.
  const s0 = open(...cellOf(u.x, u.z)),
    g0 = open(...cellOf(goal.x, goal.z));
  if (!s0 || !g0) return [];
  const [gi, gj] = g0;
  const start = s0[1] * w + s0[0],
    end = gj * w + gi;
  const heap = [],
    f = n => g[n] + Math.hypot((n % w) - gi, Math.floor(n / w) - gj);
  const push = n => {
    heap.push(n);
    for (let k = heap.length - 1; k > 0;) {
      const p = (k - 1) >> 1;
      if (f(heap[p]) <= f(heap[k])) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ;) {
        const a = 2 * k + 1,
          b = a + 1;
        let m = k;
        if (a < heap.length && f(heap[a]) < f(heap[m])) m = a;
        if (b < heap.length && f(heap[b]) < f(heap[m])) m = b;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  g[start] = 0;
  from[start] = -1;
  seen[start] = tick;
  push(start);
  let best = start,
    bestH = Infinity,
    expanded = 0;
  while (heap.length && expanded++ < MAX_EXPAND) {
    const n = pop();
    if (shut[n] === tick) continue;
    shut[n] = tick;
    const hn = Math.hypot((n % w) - gi, Math.floor(n / w) - gj);
    if (hn < bestH) [best, bestH] = [n, hn];
    if (n === end) break;
    const i = n % w,
      j = Math.floor(n / w);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di,
          nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const m = nj * w + ni;
        if (shut[m] === tick || blocked(m)) continue;
        if (di && dj && (blocked(j * w + ni) || blocked(nj * w + i))) continue; // no cutting corners
        const cost = g[n] + (di && dj ? Math.SQRT2 : 1);
        if (seen[m] !== tick || cost < g[m]) {
          seen[m] = tick;
          g[m] = cost;
          from[m] = n;
          push(m);
        }
      }
  }
  const cells = [];
  for (let n = best; n !== -1 && n !== start; n = from[n]) cells.push(centre(n));
  if (Math.hypot(centre(start).x - u.x, centre(start).z - u.z) > 0.75) cells.push(centre(start)); // step out first
  cells.reverse();
  if (!cells.length) return [];
  const last = cells.at(-1);
  if (best === end && walkable(sim, last.x, last.z, goal.x, goal.z)) cells[cells.length - 1] = {x: goal.x, z: goal.z};
  // string-pull: from where we are, jump to the farthest point (not too far ahead) we can walk to straight
  const out = [];
  let at = {x: u.x, z: u.z};
  for (let k = 0; k < cells.length;) {
    let far = k;
    for (let m = Math.min(cells.length - 1, k + PULL); m > k; m--)
      if (walkable(sim, at.x, at.z, cells[m].x, cells[m].z)) {
        far = m;
        break;
      }
    out.push(cells[far]);
    at = cells[far];
    k = far + 1;
  }
  return out;
}
