// Sim methods (convoy/sim.js): making the units and vehicles a level asks for: foot soldiers, riders, rebels with their
// class kit. Split out of sim.js (WP-QA17); installed on Sim.prototype there, so `this` is the sim.
import {SPEED} from './sim-base.js';
import {ROLES, WEAPONS} from './weapons.js';

export const unitMethods = {
  /** A vehicle with its crew at (x, z); the convoy builds one per entry, a wave can park one. */
  addVehicle(v, x, z) {
    const veh = {...v, x, z, maxHp: v.hp, destroyed: false, stopped: false, stopAt: Infinity, crew: []};
    this.vehicles.push(veh);
    v.crew.forEach((c, i) => {
      const role = ROLES[c.role];
      const u = this.unit({
        id: `${v.id}-${i}`,
        name: c.name,
        role: c.role,
        side: 'army',
        x,
        z,
        weapons: [role.weapon, ...(role.launcher ? [role.launcher] : [])],
      });
      u.state = c.role === 'turret' ? 'turret' : 'mounted';
      u.vehicle = veh;
      u.leader = c.role === 'leader';
      if (c.role === 'turret') {
        u.r = 0.32; // only head and shoulders show above the hatch
        u.armour = 0.5; // the gun shield halves suppression
      }
      veh.crew.push(u);
    });
    return veh;
  },

  /** An army soldier on foot from level data: {name, role, x, z, facing, state?, ...}. */
  footSoldier(f, i) {
    const role = ROLES[f.role];
    const u = this.unit({
      id: f.id || `foot-${i}`,
      name: f.name,
      role: f.role,
      side: 'army',
      x: f.x,
      z: f.z,
      facing: f.facing || 0,
      weapons: [role.weapon, ...(role.launcher ? [role.launcher] : [])],
    });
    u.state = f.state || (f.patrol ? 'patrol' : 'guard');
    u.leader = f.role === 'leader';
    u.group = f.group || null;
    u.post = {x: f.x, z: f.z, facing: f.facing || 0};
    if (f.patrol) Object.assign(u, {route: f.patrol, routeI: 0});
    if (f.path) u.path = f.path.map(p => ({...p})); // waypoints to walk first (a tunnel); see the 'flank' state
    return u;
  },

  unit(o) {
    const u = {
      r: 0.45,
      hp: 100,
      alive: true,
      escaped: false,
      facing: 0,
      weapons: ['ak'],
      reload: 0,
      reloading: null,
      cd: 0,
      burst: 0,
      pause: 0,
      supp: 0,
      moving: false,
      moveTo: null,
      speed: SPEED.run,
      state: 'idle',
      stateAt: 0,
      beliefs: [],
      visible: [],
      suspicion: 0,
      said: {},
      thinkAt: 0,
      ...o,
    };
    u.weapon = u.weapons[0];
    u.mags = Object.fromEntries(u.weapons.map(w => [w, WEAPONS[w].mag]));
    u.reserve = Object.fromEntries(u.weapons.map(w => [w, WEAPONS[w].reserve ?? Infinity]));
    this.units.push(u);
    return u;
  },
};
