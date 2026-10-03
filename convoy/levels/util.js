// Helpers for writing levels as data: walls from end points and a seeded scatter of trees.

/** A wall (or any thin box) between two points, axis-aligned: thickness t, height h. */
export function wall(x1, z1, x2, z2, h = 2.4, kind = 'wall', t = 1) {
  const horizontal = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
  return horizontal
    ? {x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: Math.abs(x2 - x1), d: t, h, kind}
    : {x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: t, d: Math.abs(z2 - z1), h, kind};
}

/** Small deterministic generator (levels must not use Math.random: the simulation replays by seed). */
export function lcg(seed) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

/**
 * Trees on a jittered grid inside `area` {minX, maxX, minZ, maxZ}, skipping anywhere `keepClear(x, z)` says so.
 * Each tree is a small cover box, so a forest hides the approach.
 */
export function trees(area, step, seed, keepClear) {
  const r = lcg(seed);
  const out = [];
  for (let x = area.minX; x <= area.maxX; x += step)
    for (let z = area.minZ; z <= area.maxZ; z += step) {
      const tx = x + (r() - 0.5) * step * 0.8,
        tz = z + (r() - 0.5) * step * 0.8;
      const keep = r() < 0.8;
      if (keep && !keepClear(tx, tz)) out.push({x: +tx.toFixed(1), z: +tz.toFixed(1), w: 1.3, d: 1.3, h: 6, kind: 'tree'});
    }
  return out;
}
