// The campaign soak (WP-QA7): 90 encounters in a row through the pure campaign modules (deploy, the mission's one
// result, settle, the map reading results, the clock and healing), with invariants after each: every result is
// reported on the map exactly once, a won fight takes its enemy off the map, the stash never goes negative, nobody
// stays wounded past the longest healing time, the log stays bounded and the save survives a round trip.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {deploy, enter, writeResult, settle, HEAL_DOWN} from '../shared/campaign/encounter.js';
import {encounterFor, fitFighters, readResults, passTime, isGone, SOURCES} from '../shared/campaign/contacts.js';

test('90 encounters in a row: every result reported once, the world follows, nothing drifts', () => {
  let c = newCampaign({id: 'soak', seed: 5});
  let r = 12345;
  const rand = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  const sources = Object.keys(SOURCES);
  let reported = 0;
  for (let n = 0; n < 90; n++) {
    while (!fitFighters(c).length) passTime(c, 6);
    const src = sources[n % sources.length];
    // each fight is with a fresh party of that kind (on the map they respawn); the result names the party met
    const enc = encounterFor(c, src);
    deploy(c, {...enc, fighters: fitFighters(c)});
    assert.equal(enter(c, enc.id), 'play');
    const won = rand() < 0.6;
    writeResult(c, enc.id, {
      outcome: won ? 'won' : 'lost',
      fighters: Object.fromEntries(
        enc.fighters.map(f => [f, {state: rand() < 0.3 ? 'wounded' : rand() < 0.1 ? 'down' : 'fit', xp: 10, kills: 1}]),
      ),
      kills: 2,
    });
    assert.ok(settle(c, enc.id), `encounter ${n} settles`);
    const lines = readResults(c);
    assert.equal(lines.length, 1, `encounter ${n}: the map reports the result once (got ${lines.length})`);
    reported++;
    if (won) assert.ok(isGone(c, src), `encounter ${n}: a won fight takes ${src} off the map`);
    c.world.parties = c.world.parties.filter(p => p.id !== src); // the party respawns for the next meeting
    assert.equal(readResults(c).length, 0, 'and never again');
    for (const [g, k] of Object.entries(c.stash)) assert.ok(k >= 1, `stash ${g} ${k}`);
    assert.ok(c.log.length <= 200, 'the log is bounded');
    assert.equal(new Set(c.settled).size, c.settled.length, 'each encounter settled once');
    passTime(c, 1 + rand() * 10);
    if (n % 10 === 9) c = normalize(JSON.parse(JSON.stringify(c))); // a reload now and then
  }
  assert.equal(reported, 90);
  passTime(c, HEAL_DOWN);
  assert.ok(
    Object.values(c.band.fighters).every(f => !f.wounded),
    'nobody stays wounded',
  );
});
