// Low cover (sandbags, logs): seen and shot over, but a body just behind it is harder to hit, and the rounds it
// stops (or that miss near it) strike it (convoy/sim.js lowCover, sim-combat.js shoot).
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim, isLow} from '../convoy/sim.js';

/** An empty field: one rebel and one soldier 20 m apart, nothing else; `bags` puts sandbags just in front of him. */
function range({bags = false, seed = 3} = {}) {
  const sim = new Sim({level: 'checkpoint', seed});
  Object.assign(sim.level, {cover: [], targets: []});
  sim._grid = null;
  sim.vehicles = [];
  sim.targets = [];
  const b = sim.level.bounds,
    cx = (b.minX + b.maxX) / 2,
    cz = (b.minZ + b.maxZ) / 2;
  const shooter = sim.units.find(u => u.side === 'partisan'),
    target = sim.units.find(u => u.side === 'army');
  for (const u of sim.units) if (u !== shooter && u !== target) u.alive = false;
  Object.assign(shooter, {x: cx - 10, z: cz, moving: false, supp: 0});
  Object.assign(target, {x: cx + 10, z: cz, state: 'idle', hp: 1e9, maxHp: 1e9});
  sim.fieldworks = bags ? [{x: cx + 9, z: cz, w: 1, d: 2.2, h: 1, kind: 'sandbag'}] : [];
  return {sim, shooter, target};
}
/** Fire `n` rounds at the target; returns {hits, sandbag} counts of where they landed. */
function volley({sim, shooter, target}, n = 300) {
  const out = {hits: 0, sandbag: 0};
  for (let i = 0; i < n; i++) {
    Object.assign(shooter, {cd: 0, reload: 0});
    shooter.mags[shooter.weapon] = 30;
    sim.shoot(shooter, target.x, target.z);
    sim.resolveProjectiles(Infinity);
    const im = sim.impacts.at(-1);
    if (im?.surface === 'flesh') out.hits++;
    if (im?.surface === 'sandbag') out.sandbag++;
  }
  return out;
}

test('sandbags and logs are low cover; walls and rocks are not', () => {
  assert.ok(isLow({kind: 'sandbag'}) && isLow({kind: 'log'}));
  assert.ok(!isLow({kind: 'wall'}) && !isLow({kind: 'rock'}) && !isLow({kind: 'building'}));
});

test('both sides see over sandbags; the soldier behind them is in low cover', () => {
  const {sim, shooter, target} = range({bags: true});
  assert.equal(sim.los(shooter.x, shooter.z, target.x, target.z), true, 'seen over');
  assert.equal(sim.lowCover(shooter.x, shooter.z, target.x, target.z)?.kind, 'sandbag', 'but shielded');
  assert.equal(sim.lowCover(target.x, target.z, shooter.x, shooter.z), null, 'his own bags do not shield the rebel');
});

test('a body behind sandbags is hit less often, and the bags take rounds (puffs where they strike)', () => {
  const open = volley(range()),
    bagged = volley(range({bags: true}));
  assert.equal(open.sandbag, 0);
  assert.ok(bagged.hits < open.hits * 0.65, `fewer hits behind cover (${bagged.hits} vs ${open.hits} in the open)`);
  assert.ok(bagged.hits > open.hits * 0.2, `but not none (${bagged.hits})`);
  assert.ok(bagged.sandbag > 50, `the bags take rounds (${bagged.sandbag})`);
});
