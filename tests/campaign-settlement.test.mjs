// Strategic garrisons reach the tactical roster exactly; reserves are bounded and raids never capture territory.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {encounterFor, settlementSource, readResults} from '../shared/campaign/contacts.js';
import {SETTLEMENTS} from '../map/island.js';
import {LEVELS} from '../convoy/levels/index.js';
import {vary, enemyCount} from '../convoy/levels/variants.js';
import {Sim} from '../convoy/sim.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {CHECKS} from '../convoy/objectives.js';

test('all occupied settlements field exact saved garrison/militia with bounded reserves, including at night', () => {
  for (const s of SETTLEMENTS.filter(s => s.faction === 'invader')) {
    const c = newCampaign();
    c.world.clock.hour = 23;
    c.world.settlements[s.id] = {garrison: s.garrison + 8, militia: s.militia};
    const e = encounterFor(c, s.id, settlementSource(s, c));
    const level = vary(LEVELS[e.level], e.variant);
    assert.equal(enemyCount(level), s.garrison + s.militia + 8);
    assert.equal(level.night, true);
    assert.ok(level.units.length <= 24);
    assert.ok(level.objectives.some(o => o.id === 'garrison' && o.reserves));
    assert.deepEqual(vary(LEVELS[e.level], e.variant), level);
    for (const u of level.units)
      assert.ok(!level.cover.some(b => Math.abs(u.x - b.x) < b.w / 2 + 0.6 && Math.abs(u.z - b.z) < b.d / 2 + 0.6));
    const sim = new Sim({level, seed: 1, difficulty: 'easy'});
    sim.alarm = true;
    sim.time = 1000;
    sim.runWaves();
    assert.ok(sim.units.filter(u => u.side === 'army' && u.alive).length <= 24);
    assert.equal(CHECKS.eliminate(sim, {reserves: true}), 'active');
    for (let n = 0; n < 100 && !sim.wavesDone; n++) {
      for (const u of sim.units.filter(u => u.side === 'army')) u.alive = false;
      sim.runWaves();
      assert.ok(sim.units.filter(u => u.side === 'army' && u.alive).length <= 24);
    }
    assert.equal(sim.wavesDone, true);
    assert.equal(sim.units.filter(u => u.side === 'army').length, enemyCount(level));
  }
});

test('raids and defeats reduce actual defenders once; only a won capture changes owner', () => {
  const s = SETTLEMENTS.find(s => s.id === 'myrtia');
  for (const intent of ['raid', 'capture'])
    for (const outcome of ['won', 'lost']) {
      let c = newCampaign();
      const e = encounterFor(c, s.id, settlementSource(s, c));
      e.variant.settlement.intent = intent;
      deploy(c, e);
      writeResult(c, e.id, {outcome, enemyLosses: {garrison: 3, militia: 2}});
      settle(c);
      c = normalize(c);
      readResults(c);
      assert.equal(c.world.settlements[s.id].owner === 'resistance', intent === 'capture' && outcome === 'won');
      if (intent === 'raid' || outcome === 'lost') assert.equal(c.world.settlements[s.id].garrison, s.garrison - 3);
      const before = structuredClone(c);
      readResults(c);
      assert.deepEqual(c, before);
    }
});
