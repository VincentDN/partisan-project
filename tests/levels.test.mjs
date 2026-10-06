// Levels 2 and 3 (compound assault, cave defence): data sanity, reachability, and the new rules they rely on
// (destructible radio mast, carried loot, scheduled waves, hold-until-dawn, the fallback-chamber defence).
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim, inBox} from '../convoy/sim.js';
import {LEVELS, MISSIONS} from '../convoy/levels/index.js';

const TYPES = ['eliminate', 'reach', 'destroy', 'steal', 'hold', 'protect', 'extract', 'defend'];
const steps = (sim, seconds, input = {}) => {
  for (let i = 0; i < seconds * 60 && !sim.outcome; i++) sim.step(1 / 60, input);
};
const inside = (b, p, pad = 0) => p.x >= b.minX + pad && p.x <= b.maxX - pad && p.z >= b.minZ + pad && p.z <= b.maxZ - pad;

/** Grid flood fill over the level's cover (cell 1 m, body radius 0.6): can a soldier walk from a to b? */
function reachable(level, a, b, r = 0.6) {
  const B = level.bounds,
    W = Math.ceil(B.maxX - B.minX) + 1,
    H = Math.ceil(B.maxZ - B.minZ) + 1;
  const free = (i, j) => !level.cover.some(c => inBox(B.minX + i, B.minZ + j, c, r));
  const at = p => [Math.round(p.x - B.minX), Math.round(p.z - B.minZ)];
  const [sx, sz] = at(a),
    [tx, tz] = at(b);
  const seen = new Set([sz * W + sx]),
    q = [[sx, sz]];
  for (let h = 0; h < q.length; h++) {
    const [x, z] = q[h];
    if (x === tx && z === tz) return true;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H || seen.has(nz * W + nx) || !free(nx, nz)) continue;
      seen.add(nz * W + nx);
      q.push([nx, nz]);
    }
  }
  return false;
}

test('levels: every mission is built and listed in order', () => {
  assert.deepEqual(
    MISSIONS.map(m => m.id),
    ['convoy', 'compound', 'cave', 'forest-road', 'checkpoint', 'village', 'hilltop'],
  );
  for (const m of MISSIONS) assert.ok(LEVELS[m.id] && !m.soon, m.id);
});

for (const id of ['compound', 'cave', 'forest-road', 'checkpoint', 'village', 'hilltop']) {
  const L = LEVELS[id];
  test(`[${id}] complete data: bounds, objectives with known types, everything placed inside the map and clear of cover`, () => {
    for (const k of ['title', 'summary', 'brief', 'bounds', 'ground', 'cover', 'partisans', 'objectives']) assert.ok(L[k], k);
    const ids = new Set(L.objectives.map(o => o.id));
    assert.equal(ids.size, L.objectives.length, 'unique objective ids');
    for (const o of L.objectives) {
      assert.ok(TYPES.includes(o.type), `${o.id}: type ${o.type}`);
      for (const a of o.after || []) assert.ok(ids.has(a), `${o.id}: after ${a}`);
      if (o.zone) assert.ok(inside(L.bounds, o.zone), `${o.id}: zone`);
      if (o.type === 'steal')
        assert.ok(
          L.items.some(i => i.id === o.item),
          `${o.id}: item`,
        );
      if (o.type === 'destroy')
        assert.ok(
          [...(L.targets || []), ...(L.waves || []).map(w => w.vehicle)].some(t => t?.id === o.target),
          `${o.id}: target`,
        );
    }
    assert.ok(
      L.objectives.some(o => !o.optional),
      'something is required',
    );
    const spawns = [
      ...L.partisans,
      ...(L.units || []),
      ...(L.waves || []).flatMap(w => w.squads.flatMap(s => s.units)),
      ...(L.reinforcements?.units || []),
      ...(L.items || []),
    ];
    for (const p of spawns) {
      assert.ok(inside(L.bounds, p), `${p.name || p.id || p.label} is inside the map`);
      assert.ok(!L.cover.some(c => inBox(p.x, p.z, c, 0.45)), `${p.name || p.id || p.label} stands in cover at ${p.x}, ${p.z}`);
    }
  });
  test(`[${id}] a Sim runs for a minute with no errors and is deterministic by seed`, () => {
    const fp = seed => {
      const s = new Sim({level: id, seed});
      steps(s, 60);
      return s.units.map(u => `${u.id}:${u.x.toFixed(2)},${u.z.toFixed(2)},${u.hp}`).join('|');
    };
    assert.equal(fp(4), fp(4));
  });
}

test('[compound] reachable: the cache from the forest (through the gate, the breach and the drain), and back to the exit', () => {
  const L = LEVELS.compound,
    start = L.partisans[0],
    cache = L.items[0];
  const front = {x: cache.x, z: cache.z + 1.2};
  assert.ok(reachable(L, start, front), 'cache');
  assert.ok(reachable(L, front, {x: L.objectives.find(o => o.id === 'exit').zone.x, z: start.z}), 'exit');
  assert.ok(reachable(L, {x: 0, z: 30}, {x: 0, z: 20}), 'through the gate');
  assert.ok(reachable(L, {x: 40, z: 9}, {x: 20, z: 9}), 'through the breach');
  assert.ok(reachable(L, {x: 20, z: -30}, {x: 20, z: -23}), 'through the drain behind the armoury');
});

test('[compound] starts quiet: nobody notices the rebels in the first twenty seconds, and the mast stands', () => {
  const s = new Sim({level: 'compound', seed: 3});
  steps(s, 20);
  assert.equal(s.alarm, false);
  assert.equal(s.targets[0].destroyed, false);
  assert.equal(s.units.filter(u => u.side === 'army' && u.alive).length, 11);
});

test('[compound] the radio mast gates the reinforcements: with the mast down the call never goes out', () => {
  const calls = destroyMast => {
    const s = new Sim({level: 'compound', seed: 3});
    const rto = s.units.find(u => u.role === 'rto');
    s.alert(rto);
    if (destroyMast) s.damageTarget(s.targets[0], 999, s.player);
    steps(s, 12);
    return s;
  };
  assert.ok(['calling', 'inbound'].includes(calls(false).reinforcements.state));
  const down = calls(true);
  assert.equal(down.reinforcements.state, 'lost');
  assert.equal(down.radioDown, true);
  assert.ok(down.objectives.find(o => o.id === 'mast').state === 'done');
  assert.ok(!down.boxes().some(b => b.target), 'a destroyed mast no longer blocks');
});

test('[compound] rifle fire wears the mast down; enemy fire does not', () => {
  const s = new Sim({level: 'compound', seed: 3});
  const mast = s.targets[0];
  const hits = mast.hp / (34 * 0.5);
  const army = s.units.find(u => u.side === 'army');
  s.damageTarget(mast, 100, army);
  assert.equal(mast.destroyed, false);
  const p = s.player;
  Object.assign(p, {x: mast.x - 10, z: mast.z, facing: 0});
  for (let i = 0; i < hits * 3 && !mast.destroyed; i++) {
    p.cd = 0;
    p.mags.ak = 30;
    s.shoot(p, mast.x, mast.z);
    s.resolveProjectiles(Infinity); // the round lands
  }
  assert.ok(mast.destroyed, 'about ten rifle hits');
});

test('[compound] the cache must be carried out: a dead carrier drops it, and extraction waits for someone to bring it', () => {
  const s = new Sim({level: 'compound', seed: 3});
  const cache = s.items[0],
    exit = LEVELS.compound.objectives.find(o => o.id === 'exit').zone;
  Object.assign(s.player, {x: cache.x, z: cache.z + 1});
  steps(s, 5, {interact: true});
  assert.ok(s.taken.has('cache'));
  assert.equal(cache.takenBy, 'player');
  for (const u of s.units.filter(u => u.side === 'partisan' && u.id !== 'player')) Object.assign(u, {x: exit.x, z: exit.z});
  s.order(['mila', 'dragan'], {type: 'hold'}); // they wait at the exit (the squad follows by default)
  s.step(1 / 60, {});
  assert.equal(s.objectives.find(o => o.id === 'exit').state, 'active', 'the carrier is not at the exit yet');
  s.damage(
    s.player,
    s.units.find(u => u.side === 'army'),
    999,
  );
  assert.equal(cache.taken, false, 'dropped where he fell');
  s.active = s.units.find(u => u.id === 'mila');
  Object.assign(s.active, {x: cache.x, z: cache.z + 1});
  steps(s, 5, {interact: true});
  assert.equal(cache.takenBy, 'mila');
  Object.assign(s.active, {x: exit.x, z: exit.z});
  s.step(1 / 60, {});
  assert.equal(s.objectives.find(o => o.id === 'exit').state, 'done');
});

test('[cave] reachable: the chamber through the west tunnel, the mouth, and the flanking tunnel from the hillside', () => {
  const L = LEVELS.cave,
    me = L.partisans[0];
  assert.ok(reachable(L, me, {x: -39, z: 0}), 'chamber');
  assert.ok(reachable(L, {x: 74, z: 0}, {x: 34, z: 0}), 'mouth');
  assert.ok(reachable(L, {x: 66, z: -32}, {x: 30, z: -8}), 'east tunnel into the cavern');
  assert.ok(!reachable(L, {x: 74, z: 20}, {x: 0, z: 0}) === false, 'the cavern is open to the hillside');
});

test('[cave] three waves arrive on schedule, the last with an MRAP; the army is quiet before the first', () => {
  const L = LEVELS.cave,
    s = new Sim({level: 'cave', seed: 3});
  assert.deepEqual(
    L.waves.map(w => w.at),
    [40, 105, 175],
  );
  steps(s, 39);
  assert.equal(s.units.filter(u => u.side === 'army').length, 0);
  steps(s, 2);
  assert.equal(s.units.filter(u => u.group === 'w1').length, 6);
  assert.equal(s.waves.filter(w => w.spawned).length, 1);
  s.time = 104.9;
  steps(s, 1);
  assert.equal(s.units.filter(u => u.group === 'w2flank').length, 4);
  assert.equal(s.units.filter(u => u.group === 'w2mg').length, 3);
  assert.ok(s.units.find(u => u.group === 'w2flank').path.length >= 3, 'the flankers walk the tunnel');
  assert.equal(s.vehicles.length, 0);
  s.time = 174.9;
  steps(s, 1);
  assert.equal(s.vehicles.length, 1);
  assert.equal(s.vehicles[0].searchlight, true);
  assert.equal(s.wavesDone, true);
});

test('[cave] the flanking party really comes through the east tunnel', () => {
  const s = new Sim({level: 'cave', seed: 3});
  s.time = 104.9;
  for (const u of s.units.filter(u => u.side === 'partisan')) u.hp = 1e6; // the point is the route, not the fight
  steps(s, 30);
  const flank = s.units.filter(u => u.group === 'w2flank' && u.alive);
  assert.ok(flank.length >= 3);
  assert.ok(
    flank.every(u => u.x < 34 && u.z > -30),
    `up the tunnel and round the corner: ${flank.map(u => `${u.x.toFixed(0)},${u.z.toFixed(0)}`)}`,
  );
});

test('[cave] dawn: holding for the time wins; breaking the attack wins early; letting them into the chamber loses', () => {
  // just the clock: no attack, and no "break the attack" shortcut
  const quiet = {...LEVELS.cave, waves: [], objectives: LEVELS.cave.objectives.map(o => ({...o, orClear: false}))};
  const dawn = new Sim({level: quiet, seed: 3});
  steps(dawn, 239);
  assert.equal(dawn.outcome, null);
  steps(dawn, 2);
  assert.equal(dawn.outcome, 'won');

  const broken = new Sim({level: 'cave', seed: 3});
  steps(broken, 41);
  for (const w of broken.waves) w.spawned = true;
  for (const u of broken.units.filter(u => u.side === 'army')) u.alive = false;
  steps(broken, 1);
  assert.equal(broken.outcome, 'won', 'all three waves came and are down');

  const early = new Sim({level: 'cave', seed: 3});
  for (const u of early.units.filter(u => u.side === 'army')) u.alive = false;
  steps(early, 1);
  assert.equal(early.outcome, null, 'before the last wave a clear field is not enough');

  const overrun = new Sim({level: 'cave', seed: 3});
  steps(overrun, 41);
  const intruder = overrun.units.find(u => u.group === 'w1');
  const hold = seconds => {
    for (let i = 0; i < seconds * 60 && !overrun.outcome; i++) {
      Object.assign(intruder, {x: -39, z: 0, moveTo: null, hp: 1e6}); // planted in the chamber
      overrun.step(1 / 60, {});
    }
  };
  hold(5);
  assert.equal(overrun.outcome, null, 'a few seconds are survivable');
  hold(3);
  assert.equal(overrun.outcome, 'lost');
});

test('[cave] night: the army sees less in the dark', () => {
  assert.equal(LEVELS.cave.night, true);
  assert.ok(LEVELS.cave.sight < 1);
  assert.equal(LEVELS.compound.sight, undefined);
});

test('[new maps] reachable: every objective can be walked to from the spawn, and back out', () => {
  const near = (p, dz = 1.4) => ({x: p.x, z: p.z + dz});
  const V = LEVELS.village;
  assert.ok(reachable(V, V.partisans[0], near(V.items[0])), 'village: the supplies in the school');
  const exit = V.objectives.find(o => o.id === 'exit').zone;
  assert.ok(reachable(V, near(V.items[0]), {x: exit.x, z: exit.z}), 'village: back to the vineyards');
  const C = LEVELS.checkpoint;
  assert.ok(reachable(C, C.partisans[0], {x: -4, z: 4}), 'checkpoint: the barrier');
  assert.ok(reachable(C, C.partisans[0], {x: 22, z: -2}), 'checkpoint: the mast');
  const F = LEVELS['forest-road'];
  assert.ok(reachable(F, F.partisans[0], {x: 10, z: -4}), 'forest road: down to the road');
  const H = LEVELS.hilltop;
  assert.ok(reachable(H, {x: -70, z: 0}, H.partisans[0]), 'hilltop: the first wave can climb to you');
  assert.ok(reachable(H, {x: 0, z: 55}, {x: 0, z: 22}), 'hilltop: the south gun can come up');
});

test('[new maps] each plays to an outcome: killing every soldier wins it', () => {
  for (const id of ['forest-road', 'checkpoint', 'hilltop']) {
    const s = new Sim({level: id, seed: 5});
    steps(s, 1);
    for (let t = 0; t < 400 && !s.outcome; t++) {
      for (const u of s.units) if (u.side === 'army' && u.alive) s.damage(u, s.player, 999);
      s.step(1 / 2, {});
    }
    assert.equal(s.outcome, 'won', id);
  }
});

test('variations: night, fog and ground change the fight, the original level is untouched', async () => {
  const {vary} = await import('../convoy/levels/variants.js');
  const before = JSON.stringify(LEVELS.compound);
  const night = vary(LEVELS.compound, {time: 'night', weather: 'fog', ground: 'snow', seed: 2});
  assert.equal(JSON.stringify(LEVELS.compound), before, 'the level itself is not changed');
  assert.equal(night.night, true);
  assert.ok(night.sight < 0.5, `sight ${night.sight}`);
  assert.notEqual(night.ground.color, LEVELS.compound.ground.color, 'snow recolours the ground');
  assert.match(night.title, /night, fog/);
  assert.deepEqual(vary(LEVELS.compound, {time: 'night', weather: 'fog', ground: 'snow', seed: 2}), night, 'deterministic');
  const day = vary(LEVELS.cave, {time: 'day'});
  assert.equal(day.night, false, 'even the cave can be fought by day');
});

test('variations: the enemy scales with the party met', async () => {
  const {vary, enemyCount} = await import('../convoy/levels/variants.js');
  for (const id of Object.keys(LEVELS)) {
    const base = enemyCount(LEVELS[id]);
    assert.ok(base > 0, `${id} has an enemy`);
    assert.ok(enemyCount(vary(LEVELS[id], {strength: 1.5})) > base, `${id}: stronger`);
    assert.ok(enemyCount(vary(LEVELS[id], {strength: 0.6})) < base, `${id}: weaker`);
  }
  const strong = vary(LEVELS.compound, {strength: 1.5, seed: 4});
  assert.ok(strong.units.every(u => strong.bounds.minX <= u.x && u.x <= strong.bounds.maxX), 'added soldiers stand on the map');
});

test('variations: every level runs for twenty seconds at night in the rain, stronger, without errors', () => {
  return import('../convoy/levels/variants.js').then(({vary}) => {
    for (const id of Object.keys(LEVELS)) {
      const s = new Sim({level: vary(LEVELS[id], {time: 'night', weather: 'rain', strength: 1.4, seed: 3}), seed: 3});
      steps(s, 20);
      assert.ok(s.units.length > 0, id);
    }
  });
});
