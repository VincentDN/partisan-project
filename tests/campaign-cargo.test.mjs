// Convoy cargo and where loot came from (WP-W14): a convoy's manifest rides with the deployment; a won ambush takes
// it home, less half the share of each burnt vehicle; a lost one takes nothing; every addition to the stash is
// labelled with its source and day, and the stash shows where what it holds came from.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {deploy, writeResult, settle} from '../shared/campaign/encounter.js';
import {encounterFor, SOURCES} from '../shared/campaign/contacts.js';
import {MANIFESTS, cargoTaken, provenance, describeProvenance, describeManifest, FIRST_CACHE} from '../shared/campaign/cargo.js';

function fight(c, sourceId, result) {
  const e = encounterFor(c, sourceId, SOURCES[sourceId]);
  deploy(c, e);
  writeResult(c, e.id, result);
  return settle(c, e.id);
}

test('cargo: every convoy has a manifest of known kit, shown in words', () => {
  for (const [id, s] of Object.entries(SOURCES)) if (s.kind === 'convoy') assert.ok(MANIFESTS[id], `${id} carries cargo`);
  assert.match(describeManifest(MANIFESTS['supply-convoy']), /^4 AK-74, 2 AK-74M, /);
  assert.equal(encounterFor(newCampaign(), 'orion-patrol', SOURCES['orion-patrol']).cargo, null, 'a post carries none');
});

test('cargo: a won ambush takes the manifest; burnt vehicles lose half their share; a loss takes nothing', () => {
  const m = {ak74: 4, rockets: 2};
  assert.deepEqual(cargoTaken(m, {outcome: 'won', vehicles: 4, destroyed: 0}), {ak74: 4, rockets: 2});
  assert.deepEqual(cargoTaken(m, {outcome: 'won', vehicles: 4, destroyed: 2}), {ak74: 3, rockets: 1}, 'half burnt: a quarter lost');
  assert.deepEqual(cargoTaken(m, {outcome: 'won', vehicles: 4, destroyed: 4}), {ak74: 2, rockets: 1}, 'all burnt: half salvaged');
  assert.deepEqual(cargoTaken(m, {outcome: 'lost', vehicles: 4, destroyed: 0}), {});
  assert.deepEqual(cargoTaken(null, {outcome: 'won'}), {});
});

test('cargo: the settled convoy fight puts its cargo in the stash, labelled', () => {
  const c = newCampaign();
  const before = {...c.stash};
  const r = fight(c, 'armoured-column', {outcome: 'won', loot: {ak74m: 1}, vehicles: 5, destroyed: 0});
  for (const [g, n] of Object.entries(MANIFESTS['armoured-column'])) {
    const extra = g === 'ak74m' ? 1 : 0;
    assert.equal(c.stash[g], (before[g] || 0) + n + extra, `${g} from the cargo`);
  }
  assert.deepEqual(r.cargo, MANIFESTS['armoured-column']);
  const pkm = provenance(c, 'pkm');
  assert.deepEqual(pkm[0], {from: 'Armoured column’s cargo', day: c.world.clock.day, n: 2});
  if (before.pkm) assert.deepEqual(pkm.at(-1), {from: FIRST_CACHE, day: null, n: before.pkm});
  assert.equal(provenance(c, 'ak74m')[0].from, 'Armoured column', 'what was picked up in the fight');
  assert.match(describeProvenance(pkm), /^2 from Armoured column’s cargo \(day 1\)/);
});

test('cargo: a lost ambush brings no cargo and records nothing', () => {
  const c = newCampaign();
  const r = fight(c, 'supply-convoy', {outcome: 'lost', vehicles: 4});
  assert.deepEqual(r.cargo, {});
  assert.deepEqual(c.ledger, []);
});

test('cargo: what is spent comes off the oldest first, so the labels follow what is left', () => {
  const c = newCampaign();
  const start = c.stash.ak74 || 0;
  fight(c, 'supply-convoy', {outcome: 'won', vehicles: 4, destroyed: 0}); // +4 AK-74
  c.stash.ak74 = 3; // spent all but three
  assert.deepEqual(provenance(c, 'ak74'), [{from: 'Supply convoy’s cargo', day: 1, n: 3}]);
  c.stash.ak74 = start + 4;
  assert.equal(
    provenance(c, 'ak74').reduce((n, p) => n + p.n, 0),
    start + 4,
    'adds up to what is held',
  );
});

test('cargo: the ledger survives a save and a reload, cleaned', () => {
  const c = newCampaign();
  fight(c, 'fuel-convoy', {outcome: 'won', vehicles: 3, destroyed: 3});
  const raw = JSON.parse(JSON.stringify(c));
  raw.ledger.push({gear: 'nonsense', n: 2, from: 'x', day: 1}, {gear: 'ak74', n: -1, from: 'x', day: 1});
  const back = normalize(raw);
  assert.deepEqual(back.ledger, c.ledger);
  assert.ok(back.ledger.length > 0);
});
