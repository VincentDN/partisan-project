// Campaign reports survive saves, trim with the shared history, and do not repeat daily rumours.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize, logEvent} from '../shared/campaign/state.js';
import {rumour, journalEntry} from '../shared/campaign/journal.js';
import {passTime} from '../shared/campaign/contacts.js';
test('daily rumours are deterministic and remain deduplicated after reload', () => {
  const a = newCampaign({seed: 5}),
    b = newCampaign({seed: 5});
  assert.ok(rumour(a));
  rumour(b);
  assert.deepEqual(a.log, b.log);
  const saved = normalize(JSON.stringify(a));
  assert.equal(rumour(saved), false);
  saved.world.clock.day++;
  assert.ok(rumour(saved));
  assert.equal(saved.log.length, 2);
  assert.match(journalEntry(saved.log[0]).source, /unconfirmed/);
});
test('recovery reports name fighters once and intercepted orders omit enemy coordinates', () => {
  const c = newCampaign();
  Object.assign(c.band.fighters.player, {wounded: true, healIn: 1});
  passTime(c, 2);
  passTime(c, 2);
  assert.equal(c.log.filter(e => e.kind === 'healed').length, 1);
  assert.match(journalEntry(c.log[0], {player: 'Alex'}).text, /Alex recovered/);
  const intercept = journalEntry({kind: 'counterattack-out', target: 'town', x: 12, z: 99}, {town: 'Oros'});
  assert.equal(intercept.source, 'Intercepted orders');
  assert.match(intercept.text, /Oros/);
  assert.doesNotMatch(intercept.text, /12|99/);
  for (let i = 0; i < 220; i++) logEvent(c, {kind: 'rumour', text: 'Report'});
  assert.equal(c.log.length, 200);
});
