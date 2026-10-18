// The balance harness is reproducible, reports censored outcomes honestly and resumes without duplicate seeds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {carried} from '../tools/campaign/inventory.mjs';
import {simulate} from '../tools/campaign/simulate.mjs';
import {promoteAtHaven, contacts} from '../tools/campaign/policy.mjs';
import {newCampaign} from '../shared/campaign/state.js';
import {SETTLEMENTS} from '../map/island.js';
import {TROOPS} from '../band/troops.js';
import {aggregate} from '../tools/campaign/report.mjs';

test('same seed and policy reproduce; daily save reload preserves the trajectory', () => {
  const opts = {seed: 4, days: 5};
  const first = simulate(opts),
    again = simulate(opts),
    unbroken = simulate({...opts, reloadEveryHours: 0});
  assert.deepEqual(again, first);
  assert.deepEqual(unbroken, first);
  assert.equal(first.state.settled.length, first.autoFights);
  assert.equal(first.state.log.filter(e => e.kind === 'result').length, first.autoFights);
  assert.equal(first.state.deployment, null);
  assert.ok(first.state.log.filter(e => e.kind === 'result').every(e => !['compound', 'village', 'cave', 'hilltop'].includes(e.level)));
  assert.equal(first.elapsedHours, 120);
});
test('non-reached milestones are censored and count against coverage; hunt accounting survives log truncation', () => {
  const metrics = aggregate([
    {firstEncounterHours: 2, firstPromotionHours: null, huntsPerDay: 0.2, stashGrowth: 3},
    {firstEncounterHours: null, firstPromotionHours: null, huntsPerDay: 0.4, stashGrowth: 5},
  ]).metrics;
  assert.equal(metrics.firstEncounterHours.mean, 2);
  assert.equal(metrics.firstEncounterHours.censored, 1);
  assert.equal(metrics.firstEncounterHours.pass, false);
  assert.equal(metrics.firstPromotionHours.mean, null);
  assert.equal(metrics.firstPromotionHours.pass, false);
  assert.throws(() => aggregate([]));
  const result = simulate({seed: 3, days: 30});
  assert.ok(result.hunts >= result.state.log.filter(e => e.kind === 'hunt').length);
});
test('chunks resume once per seed and reject mismatched or damaged checkpoints', async () => {
  const out = await mkdtemp(join(tmpdir(), 'partisan-balance-'));
  const run = (...args) =>
    spawnSync(
      process.execPath,
      ['tools/campaign/bench.mjs', '--out', out, '--campaigns', '3', '--days', '1', '--chunk-size', '2', ...args],
      {encoding: 'utf8'},
    );
  try {
    const first = run('--max-chunks', '1');
    assert.equal(first.status, 0, first.stderr);
    let report = JSON.parse(await readFile(join(out, 'checkpoint.json'), 'utf8'));
    assert.equal(report.complete, false);
    assert.deepEqual(
      report.rows.map(r => r.seed),
      [1, 2],
    );
    const resume = run('--resume');
    assert.equal(resume.status, 0, resume.stderr);
    report = JSON.parse(await readFile(join(out, 'checkpoint.json'), 'utf8'));
    assert.equal(report.complete, true);
    assert.deepEqual(
      report.rows.map(r => r.seed),
      [1, 2, 3],
    );
    assert.equal(run('--resume').status, 0);
    assert.equal(run('--resume', '--policy', 'early-rest').status, 1);
    report.fingerprint = 'changed';
    await writeFile(join(out, 'checkpoint.json'), JSON.stringify(report));
    assert.equal(run('--resume').status, 1);
  } finally {
    await rm(out, {recursive: true, force: true});
  }
});

test('the policy pays real promotion requirements only at a haven and keeps wounded fighters out', () => {
  const c = newCampaign(),
    haven = SETTLEMENTS.find(s => s.faction === 'resistance');
  const fighter = c.band.fighters.player,
    required = TROOPS[fighter.class].xp;
  fighter.xp = required + 7;
  c.stash = {vest: 1, helmet: 1};
  c.world.party = {x: 9999, z: 9999};
  assert.equal(promoteAtHaven(c), 0);
  c.world.party = {x: haven.x, z: haven.z};
  fighter.wounded = true;
  assert.equal(promoteAtHaven(c), 0);
  fighter.wounded = false;
  assert.equal(promoteAtHaven(c), 1);
  assert.equal(fighter.class, 'heavy');
  assert.equal(fighter.xp, 7);
  assert.deepEqual(c.stash, {});
});

test('scarce-opening audit counts real carried rounds and refuses unsupported auto-only progression', () => {
  const c = newCampaign();
  assert.deepEqual(carried(c), {rounds: 80, weapons: 8});
  const k = c.band.fighters.player.kit;
  k.primary.chamber = null;
  k.primary.mag.rounds = [];
  k.pockets.grids[0].items = [];
  assert.deepEqual(carried(c), {rounds: 70, weapons: 8});
  c.stash.ak74 = 100;
  assert.deepEqual(carried(c), {rounds: 70, weapons: 8}, 'reserve rewards are not carried ammunition');
  const r = simulate({seed: 4, days: 14});
  assert.equal(r.autoFights, 0, 'this fresh-band policy must play tactical fights before it can auto-resolve');
  assert.deepEqual(r.carriedStart, {rounds: 80, weapons: 8});
  assert.deepEqual(r.carriedEnd, r.carriedStart);
  assert.equal(r.autoAmmoSpent, 0);
  assert.deepEqual(aggregate([r]).ammunitionAudit, {campaigns: 1, roundsSpent: 0, campaignsWithCombatAndNoSpend: 0});
});

test('headless roadblock contact shares the real opening map position', () => {
  const roadblock = contacts(newCampaign(), {convoy: () => null}).find(p => p.id === 'oros-roadblock');
  assert.deepEqual(roadblock.at, {x: -138, z: 60});
  assert.equal(roadblock.source.strength, 4);
});
