// Convoys on the map (WP-W6, shared/campaign/convoys.js): they drive roads between Invader settlements; arriving,
// one resupplies the garrison there (up to half again its size); a destroyed convoy is gone two days, then a new one
// sets out from its seat; a raid meets the garrison as resupplied.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {CONVOYS, CONVOY_ROADS, arrive, garrisonOf, RESPAWN_HOURS, convoyRoad, GARRISON_CAP} from '../shared/campaign/convoys.js';
import {createWorld, STEP} from '../shared/campaign/world.js';
import {isGone, settlementSource} from '../shared/campaign/contacts.js';
import {ROADS, byId} from '../map/island.js';

test('every convoy drives a real road between two Invader settlements', () => {
  for (const [id, [a, b]] of Object.entries(CONVOY_ROADS)) {
    assert.ok(
      ROADS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
      `${id}: ${a}-${b} is a road`,
    );
    for (const s of [a, b]) assert.equal(byId(s).faction, 'invader', `${id}: ${s} is the Invader's`);
    assert.ok(convoyRoad(id).total > 50);
  }
});

test('an arrival resupplies the garrison, up to half again its size', () => {
  const c = newCampaign({id: 'w6a'});
  const s = byId('agia-marina'),
    cap = Math.round(s.garrison * GARRISON_CAP);
  const r = arrive(c, 'supply-convoy', 'to');
  assert.deepEqual(r, {settlement: 'agia-marina', added: CONVOYS['supply-convoy'].brings, garrison: s.garrison + 8});
  assert.equal(garrisonOf(c, s), s.garrison + 8);
  assert.equal(c.log.at(-1).kind, 'resupply');
  for (let i = 0; i < 40; i++) arrive(c, 'supply-convoy', 'to');
  assert.equal(garrisonOf(c, s), cap, 'never above the cap');
  assert.equal(arrive(c, 'supply-convoy', 'to'), null, 'full: nothing to add');
  assert.equal(settlementSource(s, c).strength, cap + s.militia, 'a raid meets the resupplied garrison');
  assert.equal(normalize(JSON.parse(JSON.stringify(c))).world.settlements['agia-marina'].garrison, cap, 'saved');
});

test('a settlement taken by the Resistance is not resupplied', () => {
  const c = newCampaign({id: 'w6b'});
  c.world.settlements.myrtia = {owner: 'resistance'};
  assert.equal(arrive(c, 'fuel-convoy', 'to'), null);
});

test('in the world: the supply convoy reaches Agia Marina and the garrison grows', () => {
  const c = newCampaign({id: 'w6c'});
  const w = createWorld(c);
  const g0 = garrisonOf(c, byId('agia-marina'));
  let r = null;
  for (let i = 0; i < 5000 && !r; i++) r = w.step(STEP).resupplied.find(x => x.id === 'supply-convoy') || null;
  assert.ok(r, 'it arrived');
  assert.equal(r.settlement, 'agia-marina');
  assert.equal(garrisonOf(c, byId('agia-marina')), g0 + 8);
});

test('a destroyed convoy is gone two days, then sets out again from its seat', () => {
  const c = newCampaign({id: 'w6d'});
  const w = createWorld(c);
  c.world.parties.push({id: 'fuel-convoy', state: 'destroyed', day: c.world.clock.day, hour: c.world.clock.hour});
  const before = {...w.motion('fuel-convoy')};
  w.skip(RESPAWN_HOURS - 2);
  assert.ok(isGone(c, 'fuel-convoy'), 'still gone after 46 hours');
  assert.deepEqual(w.motion('fuel-convoy'), before, 'and not moving');
  const out = w.skip(3);
  assert.deepEqual(out.respawned, ['fuel-convoy']);
  assert.equal(isGone(c, 'fuel-convoy'), false);
  const m = w.motion('fuel-convoy');
  assert.equal(m.dir, 1, 'outbound');
  assert.ok(m.s < 60, `near the start of its road, at its seat (${m.s.toFixed(0)} of ${convoyRoad('fuel-convoy').total.toFixed(0)})`);
  assert.ok(
    c.log.some(e => e.kind === 'convoy-out' && e.source === 'fuel-convoy'),
    'logged',
  );
});
