// Where a unit goes to be safe (convoy/ai.js): the best covered spot it can reach, and the next bound of an assault.
// Split out of ai.js (WP-QA17).
import {PAD} from './cover-grid.js';
import {reachable} from './pathfind.js';
import {inBox} from './sim.js';

/** Best spot near u that hides it from `threat`: behind boxes, away from the threat, not crowded. */
export function findCover(sim, u, threat) {
  let best = null,
    bestScore = -Infinity;
  // the cover near u (in level order, as a scan of every box would meet it) and what moves; only these can matter
  const dyn = sim.dynamicBoxes(),
    R = 28;
  const boxes = [...sim.coverNear(u.x - R, u.z - R, u.x + R, u.z + R), ...dyn];
  const hits = (x, z) => b => Math.abs(x - b.x) < b.w / 2 + u.r && Math.abs(z - b.z) < b.d / 2 + u.r;
  const blocked = (x, z) => (u.r > PAD ? sim.boxes().some(hits(x, z)) : sim.someCoverNear(x, z, x, z, hits(x, z)) || dyn.some(hits(x, z)));
  for (const b of boxes) {
    if (Math.hypot(b.x - u.x, b.z - u.z) > R) continue;
    let ax = b.x - threat.x,
      az = b.z - threat.z;
    const al = Math.hypot(ax, az) || 1;
    ax /= al;
    az /= al;
    // reach: half the box's extent along the away direction, plus a body and a little air
    const reach = Math.abs(ax) * (b.w / 2) + Math.abs(az) * (b.d / 2) + u.r + 0.5;
    for (const lateral of [0, -0.6, 0.6]) {
      const px = b.x + ax * reach - az * lateral * (b.w / 2),
        pz = b.z + az * reach + ax * lateral * (b.d / 2);
      if (blocked(px, pz)) continue;
      const far = Math.hypot(px - u.x, pz - u.z) * 1.2;
      if (40 - far <= bestScore) continue; // even covered and alone it cannot beat the best: skip the sight check
      if (!reachable(sim, u.x, u.z, px, pz)) continue; // off the map, or shut in a house or a walled yard
      const covered = !sim.los(threat.x, threat.z, px, pz);
      const crowd = sim.units.filter(
        o => o !== u && o.alive && o.side === u.side && Math.hypot((o.moveTo || o).x - px, (o.moveTo || o).z - pz) < 1.6,
      ).length;
      const score =
        (covered ? 40 : 0) -
        far -
        (Math.hypot(px - threat.x, pz - threat.z) < 10 ? 25 : 0) -
        crowd * 14 -
        ((sim.level.avoid || []).some(a => inBox(px, pz, a)) ? 4 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = {x: px, z: pz};
      }
    }
  }
  return best;
}

/** Next spot for a bounding soldier: 5 to 15 m on, nearer the goal, preferably hidden from it. */
export function nextBound(sim, u, goal) {
  const d0 = Math.hypot(goal.x - u.x, goal.z - u.z);
  const c = findCover(sim, u, goal);
  if (c) {
    const d1 = Math.hypot(goal.x - c.x, goal.z - c.z),
      hop = Math.hypot(c.x - u.x, c.z - u.z);
    if (d1 < d0 - 3 && hop > 3 && hop < 16) return c;
  }
  const step = Math.min(10, d0 - 4);
  return {x: u.x + ((goal.x - u.x) / d0) * step, z: u.z + ((goal.z - u.z) / d0) * step};
}
