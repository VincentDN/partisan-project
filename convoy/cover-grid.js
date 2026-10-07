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
   * Indices of the cover that may touch the rectangle x0..x1, z0..z1 (grown by up to PAD). `out` is filled and
   * returned (pass a reused array on hot paths); `ordered` sorts it into level order (for "the first box hit").
   */
  function near(x0, z0, x1, z1, out = [], ordered = false) {
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
  return {near};
}
