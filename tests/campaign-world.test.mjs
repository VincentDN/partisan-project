// The campaign world simulation (WP-W5, shared/campaign/world.js): it steps without a renderer; the same save and the
// same orders give the same world at any frame rate; a save taken mid-route (convoys, band, hunters) carries on as if
// it had never stopped; convoys drive their roads out and back; hunters close on the band once the heat is high.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign, normalize} from '../shared/campaign/state.js';
import {buildNav, findPath} from '../shared/campaign/nav.js';
import {createWorld, convoyRoad, CONVOY_ROADS, STEP, HOURS_PER_SECOND} from '../shared/campaign/world.js';
import {PARTY_SPOTS} from '../map/island.js';

const nav = buildNav();
const HUNTERS = {raiders: PARTY_SPOTS.raiders};
/** A campaign with the band ordered across the island and the hunters out. */
function setup() {
  const c = newCampaign({id: 'w5', seed: 3});
  const [x, z] = PARTY_SPOTS.player;
  c.world.party = {x, z, route: null};
  const r = findPath(nav, c.world.party, {x: 60, z: 120});
  c.world.party.route = {points: r.points, leg: 1};
  c.world.heat = 30;
  return c;
}
const run = (c, seconds, frame) => {
  const w = createWorld(c, {nav, hunters: HUNTERS});
  for (let t = 0; t < seconds - 1e-9; t += frame) w.step(Math.min(frame, seconds - t));
  return c;
};
const snapshot = c => JSON.stringify({world: c.world, band: c.band.fighters});

test('the same orders give the same world at any frame rate', () => {
  const a = run(setup(), 40, 1 / 60),
    b = run(setup(), 40, 1 / 23),
    d = run(setup(), 40, 0.5);
  assert.equal(snapshot(a), snapshot(b));
  assert.equal(snapshot(a), snapshot(d));
  const hours = (a.world.clock.day - 1) * 24 + a.world.clock.hour - 8;
  assert.ok(Math.abs(hours - 40 * HOURS_PER_SECOND) < 0.01, `40 s is ${40 * HOURS_PER_SECOND} campaign hours (${hours})`);
});

test('it moves: convoys on their roads, the band along its route, the hunters after it', () => {
  const c = setup(),
    start = structuredClone(c.world);
  const w = createWorld(c, {nav, hunters: HUNTERS});
  const v0 = w.convoy('supply-convoy')[0];
  w.step(10);
  const v1 = w.convoy('supply-convoy')[0];
  assert.ok(Math.hypot(v1.x - v0.x, v1.z - v0.z) > 50, 'the convoy drove on');
  assert.ok(Math.hypot(c.world.party.x - start.party.x, c.world.party.z - start.party.z) > 30, 'the band marched');
  const h = c.world.hunters.raiders;
  assert.ok(h.hunting, 'the hunters are out');
  const d0 = Math.hypot(HUNTERS.raiders[0] - start.party.x, HUNTERS.raiders[1] - start.party.z);
  assert.ok(Math.hypot(h.x - c.world.party.x, h.z - c.world.party.z) < d0, 'and closer than their post was');
});

test('a convoy drives to the end of its road, waits, and comes back', () => {
  const c = newCampaign({id: 'w5c'});
  const w = createWorld(c);
  const m = w.motion('fuel-convoy'),
    road = convoyRoad('fuel-convoy');
  let turned = false;
  for (let i = 0; i < 4000 && !turned; i++) {
    w.step(STEP);
    turned = m.dir < 0;
  }
  assert.ok(turned, 'it turned round');
  assert.ok(m.s > road.total * 0.8, 'at the far end');
  for (let i = 0; i < 4000 && m.dir < 0; i++) w.step(STEP);
  assert.equal(m.dir, 1, 'and back again');
  assert.equal(Object.keys(CONVOY_ROADS).length, c.world.parties.filter(p => p.motion).length, 'every convoy has a motion in the save');
});

test('a save mid-route carries on as if it had never stopped', () => {
  const whole = run(setup(), 30, 1 / 30);
  const half = run(setup(), 15, 1 / 30);
  const reloaded = normalize(JSON.parse(JSON.stringify(half)));
  run(reloaded, 15, 1 / 30);
  assert.ok(reloaded.world.party.route, 'the route was saved');
  assert.equal(snapshot(reloaded), snapshot(whole));
});

test('a rest lets the world run: the hunters keep coming', () => {
  const c = setup();
  c.world.party.route = null;
  const w = createWorld(c, {nav, hunters: HUNTERS});
  const d = () => Math.hypot(c.world.hunters.raiders?.x - c.world.party.x, c.world.hunters.raiders?.z - c.world.party.z);
  w.step(STEP);
  const d0 = d(),
    day0 = c.world.clock.day;
  w.skip(12);
  assert.ok(d() < d0 - 20, `they closed in while the band rested (${d0.toFixed(0)} -> ${d().toFixed(0)})`);
  assert.ok(c.world.clock.day > day0 || c.world.clock.hour >= 20, 'twelve hours went by');
});

test('a damaged route in the save is dropped, not followed', () => {
  const c = setup();
  c.world.party.route = {points: [{x: 'a'}], leg: 1};
  createWorld(c, {nav}).step(1);
  assert.equal(c.world.party.route, null);
});
