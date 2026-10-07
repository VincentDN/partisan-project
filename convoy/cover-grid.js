// A coarse grid over a level's static cover (WP-QA11): rays and movement test only the cover near them instead of
// every box on the map. Queries return cover indices in the level's own order, so whoever takes "the first box hit"
// gets the same box as a scan of the whole list would.
const CELL = 8; // metres
export const PAD = 1; // cover is filed this much larger, so a query may grow a box by up to PAD (a unit's radius)

export function coverGrid(cover) {
  const cells = new Map(),
    stamp = new Uint32Array(cover.length);
  let tick = 0;
  const cell = v => Math.floor(v / CELL);
  const key = (i, j) => i * 65536 + j;
  cover.forEach((b, n) => {
    for (let i = cell(b.x - b.w / 2 - PAD); i <= cell(b.x + b.w / 2 + PAD); i++)
      for (let j = cell(b.z - b.d / 2 - PAD); j <= cell(b.z + b.d / 2 + PAD); j++) {
        const k = key(i, j);
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(n);
      }
  });
  /**
   * Indices of the cover that may touch the rectangle x0..x1, z0..z1 (grown by up to PAD), read-only. `out` is filled
   * and returned (pass a reused array on hot paths); `ordered` sorts it into level order (for "the first box hit").
   */
  const NONE = [];
  function near(x0, z0, x1, z1, out = [], ordered = false) {
    // one cell (a point, a short ray): its list is already in level order and holds each box once; read it as it is
    if (cell(x0) === cell(x1) && cell(z0) === cell(z1)) return cells.get(key(cell(x0), cell(z0))) || NONE;
    tick++;
    out.length = 0;
    for (let i = cell(x0); i <= cell(x1); i++)
      for (let j = cell(z0); j <= cell(z1); j++)
        for (const n of cells.get(key(i, j)) || [])
          if (stamp[n] !== tick) {
            stamp[n] = tick;
            out.push(n);
          }
    return ordered ? out.sort((a, b) => a - b) : out;
  }
  /**
   * Indices of the cover that may touch the segment a->b: only the cells the segment passes through (a grid walk),
   * not the whole rectangle around it. Read-only; `ordered` sorts into level order.
   */
  function along(ax, az, bx, bz, out = [], ordered = false) {
    let i = cell(ax),
      j = cell(az);
    const ei = cell(bx),
      ej = cell(bz);
    if (i === ei && j === ej) return cells.get(key(i, j)) || NONE;
    tick++;
    out.length = 0;
    const dx = bx - ax,
      dz = bz - az,
      si = Math.sign(dx),
      sj = Math.sign(dz);
    // distance along the segment (0..1) to the next vertical and horizontal cell line, and between them
    let tx = si ? ((si > 0 ? (i + 1) * CELL : i * CELL) - ax) / dx : Infinity,
      tz = sj ? ((sj > 0 ? (j + 1) * CELL : j * CELL) - az) / dz : Infinity;
    const stepX = si ? (CELL / dx) * si : Infinity,
      stepZ = sj ? (CELL / dz) * sj : Infinity;
    for (let guard = 0; guard < 4096; guard++) {
      for (const n of cells.get(key(i, j)) || NONE)
        if (stamp[n] !== tick) {
          stamp[n] = tick;
          out.push(n);
        }
      if (i === ei && j === ej) break;
      if (tx < tz) {
        i += si;
        tx += stepX;
      } else {
        j += sj;
        tz += stepZ;
      }
    }
    return ordered ? out.sort((a, b) => a - b) : out;
  }
  return {near, along};
}
