// Sim methods (convoy/sim.js): orders, interaction, outcome and debrief: what the player and the squad are told, and
// how the mission ends. Split out of sim.js (WP-QA17); installed on Sim.prototype there, so `this` is the sim.
import {evaluate} from './objectives.js';
import {ensureControl} from './squad-control.js';

export const orderMethods = {
  /**
   * Give teammates an order (see partisanThink in convoy/ai.js): {type: 'hold'|'follow'|'move'|'attack'|'cover', x?, z?, target?, angle?}.
   * @param {string[]} ids partisan ids (the player is ignored)
   */
  /** Is this point on the player's screen (always true with no screen, as in tests)? 1 m inside the edge. */
  onScreen(u) {
    const v = this.view;
    return !v || (u.x > v.x0 + 1 && u.x < v.x1 - 1 && u.z > v.z0 + 1 && u.z < v.z1 - 1);
  },

  order(ids, order) {
    const ACK = {hold: 'Holding.', follow: 'On you.', move: 'Moving.', attack: 'Engaging.', cover: 'Watching that sector.'};
    for (const u of this.units) {
      if (u.side !== 'partisan' || u === this.player || !u.alive || !ids.includes(u.id)) continue;
      u.order = {...order};
      if (order.type === 'hold' && order.x === undefined) Object.assign(u.order, {x: u.x, z: u.z});
      u.moveTo = null;
      u.thinkAt = this.time; // react on this step
      this.say(u, ACK[order.type] || 'Copy.', 'ack', 0);
    }
  },

  /** Hold E next to an item to take it: progress fills over item.search seconds, and resets if you let go or move off. */
  interact(u, holding, dt) {
    const item = this.items
      .filter(i => !i.taken && Math.hypot(i.x - u.x, i.z - u.z) < 1.8)
      .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
    for (const i of this.items) if (i !== item || !holding) i.progress = 0;
    u.searching = holding && item ? item : null;
    if (!u.searching) return;
    item.progress += dt * (u.mods?.interact ?? 1);
    if (item.progress >= (item.search ?? 3)) {
      item.taken = true;
      item.takenBy = u.id;
      this.taken.add(item.id);
      this.say(u, `Got the ${item.label.toLowerCase()}!`, 'taken-' + item.id, 99);
    }
  },

  checkOutcome() {
    this.outcome = evaluate(this);
    ensureControl(this);
  },

  /** What the debrief shows. */
  debrief() {
    const s = this.stats();
    const squad = this.units.filter(u => u.side === 'partisan');
    return {
      outcome: this.outcome,
      time: this.time,
      objectives: this.objectives.map(o => ({id: o.id, label: o.label, state: o.state, optional: !!o.optional})),
      enemyLosses: Object.fromEntries(
        ['garrison', 'militia'].map(kind => [
          kind,
          this.units.filter(u => u.side === 'army' && u.group?.startsWith(`settlement-${kind}`) && (!u.alive || u.escaped)).length,
        ]),
      ),
      kills: Object.values(this.kills).reduce((a, b) => a + b, 0),
      byPartisan: squad.map(u => ({
        id: u.id,
        name: u.name,
        kills: this.kills[u.id] || 0,
        state: !u.alive ? 'down' : u.hp < (u.maxHp ?? 100) ? 'wounded' : 'fit',
      })),
      taken: this.items.filter(i => i.taken).map(i => i.label),
      ...s,
    };
  },

  stats() {
    const army = this.units.filter(u => u.side === 'army');
    return {
      armyAlive: army.filter(u => u.alive && !u.escaped).length,
      armyDown: army.filter(u => !u.alive).length,
      escaped: army.filter(u => u.escaped).length,
      partisansAlive: this.units.filter(u => u.side === 'partisan' && u.alive).length,
      vehiclesDestroyed: this.vehicles.filter(v => v.destroyed).length,
    };
  },
};
