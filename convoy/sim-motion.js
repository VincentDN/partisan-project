// Sim methods (convoy/sim.js): moving: paths round cover (convoy/pathfind.js), sliding along it, pace, mines, the
// convoy on its road. Split out of sim.js (WP-QA17); installed on Sim.prototype there, so `this` is the sim.
import {PAD} from './cover-grid.js';
import {findPath, openNear, walkable} from './pathfind.js';
import {inBox} from './sim-base.js';
import {munition} from './weapons.js';

export const motionMethods = {
  /** Move u toward u.moveTo with sliding collision; returns true on arrival. */
  move(u, dt) {
    u.moving = false;
    if (!u.moveTo) return true;
    const goal = u.moveTo;
    if (Math.hypot(goal.x - u.x, goal.z - u.z) < 0.35) {
      u.moveTo = u.way = null;
      return true;
    }
    // the way there: straight when nothing stands in it, else a path round (convoy/pathfind.js); looked at twice a
    // second, and again when the destination moves on (followers, the AI re-thinking)
    if (u.way && Math.hypot(u.way.gx - goal.x, u.way.gz - goal.z) > 2) u.way = null;
    if ((!u.way || u.way.i >= u.way.pts.length - 1) && this.time >= (u.wayAt ?? 0)) {
      u.wayAt = this.time + 0.5;
      // a destination in a wall's margin or a rock (a slot, a post, a spot by a house) ends at the nearest open ground
      let end = openNear(this, goal.x, goal.z);
      if (end && end.x === goal.x && end.z === goal.z) end = goal;
      if (end && Math.hypot(end.x - u.x, end.z - u.z) < 0.35) {
        u.moveTo = null;
        return true;
      }
      if (!end || !walkable(this, u.x, u.z, end.x, end.z)) {
        const pts = end ? findPath(this, u, end) : [];
        if (pts.length) u.way = {gx: goal.x, gz: goal.z, pts, i: 0, end};
        else {
          // the destination cannot be reached (inside cover, off the map) and this is as near as it gets: stop here
          u.moveTo = null;
          return true;
        }
      } else u.way = end === goal ? null : {gx: goal.x, gz: goal.z, pts: [end], i: 0, end};
    }
    let to = goal;
    if (u.way) {
      const R = u.way;
      while (R.i < R.pts.length - 1 && Math.hypot(R.pts[R.i].x - u.x, R.pts[R.i].z - u.z) < 0.5) R.i++;
      to = R.i < R.pts.length - 1 ? R.pts[R.i] : R.end;
      if (Math.hypot(R.end.x - u.x, R.end.z - u.z) < 0.35) {
        u.moveTo = u.way = null;
        return true;
      }
    }
    const dx = to.x - u.x,
      dz = to.z - u.z,
      d = Math.hypot(dx, dz);
    const step = Math.min(d, u.speed * this.pace(u) * (1 - u.supp * 0.4) * dt);
    this.slide(u, (dx / d) * step, (dz / d) * step);
    u.facing = Math.atan2(dz, dx);
    u.moving = true;
    return false;
  },

  /** Speed multiplier from the class and a dash ability. */
  pace(u) {
    return (u.mods?.speed ?? 1) * (this.time < (u.dashUntil ?? -1) ? (u.dashMult ?? 1.6) : 1);
  },

  slide(u, sx, sz) {
    const B = this.level.bounds;
    const hits = b => inBox(x0, z0, b, u.r);
    let x0, z0;
    const blocked = (x, z) => {
      if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ) return true;
      [x0, z0] = [x, z];
      if (u.r > PAD) return this.boxes().some(hits); // larger than the grid files cover for: test everything
      return this.someCoverNear(x, z, x, z, hits) || this.dynamicBoxes().some(hits);
    };
    const ox = u.x,
      oz = u.z;
    if (!blocked(u.x + sx, u.z)) u.x += sx;
    if (!blocked(u.x, u.z + sz)) u.z += sz;
    if (u.x === ox && u.z === oz && (sx || sz)) {
      // stuck on a corner: step sideways along the obstacle
      const px = -sz,
        pz = sx;
      if (!blocked(u.x + px, u.z + pz)) {
        u.x += px;
        u.z += pz;
      } else if (!blocked(u.x - px, u.z - pz)) {
        u.x -= px;
        u.z -= pz;
      }
    }
  },

  /** A mine bursts under a soldier on foot or a vehicle that drives over it. */
  tripMines() {
    for (const m of [...this.mines]) {
      const on =
        this.units.some(
          o => o.side === 'army' && o.alive && o.state !== 'mounted' && o.state !== 'turret' && Math.hypot(o.x - m.x, o.z - m.z) < 1.3,
        ) || this.vehicles.find(v => !v.destroyed && inBox(m.x, m.z, v, 0.4));
      if (!on) continue;
      this.mines.splice(this.mines.indexOf(m), 1);
      this.explode(m.x, m.z, munition('mine'), m.by, on.w ? {vehicle: on} : null);
    }
  },

  driveConvoy(dt) {
    this.vehicles.forEach((v, i) => {
      if (v.stopped) return;
      const C = this.level.convoy;
      const front = i === 0 ? C.stopX : this.vehicles[i - 1].x - this.vehicles[i - 1].w / 2 - 4;
      const nx = Math.min(v.x + C.speed * dt, front - v.w / 2);
      if (nx <= v.x + 1e-6 && i === 0 && !v.stopped) {
        v.stopped = true;
        v.stopAt = this.time;
        this.say(v.crew[0], 'Road blocked! Everyone out!', 'blocked', 99);
      }
      v.x = Math.max(v.x, nx);
      if (i > 0 && this.vehicles[0].stopped && v.x >= front - v.w / 2 - 0.01 && !v.stopped) {
        v.stopped = true;
        v.stopAt = this.time;
      }
      for (const u of v.crew) if (u.state === 'mounted' || u.state === 'turret') u.x = v.x;
    });
  },
};
