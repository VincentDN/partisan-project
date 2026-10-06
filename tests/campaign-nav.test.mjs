// Travel on the campaign map (WP-W3): never through sea, roads faster, snow and forest slower; paths on map/island.js
// (shared/campaign/nav.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNav, findPath, groundAt, speedAt, lineTime, advance, nearestLand, GROUND, BASE_SPEED} from '../shared/campaign/nav.js';
import {SETTLEMENTS, ROADS, byId, heightAt, roadLine, PARTY_SPOTS} from '../map/island.js';

const nav = buildNav();
const at = ([x, z]) => ({x, z});

/** Every sample along a route, every half cell, is land. */
function overLand(points) {
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1],
      b = points[k],
      n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let s = 0; s <= n; s++) {
      const x = a.x + ((b.x - a.x) * s) / (n || 1),
        z = a.z + ((b.z - a.z) * s) / (n || 1);
      if (speedAt(nav, x, z) === 0) return {x, z};
    }
  }
  return null;
}

test('the grid knows the ground: settlements on land, roads where the roads are, sea off the coast', () => {
  for (const s of SETTLEMENTS) assert.ok(speedAt(nav, s.x, s.z) > 0, `${s.name} is reachable ground`);
  for (const [a, b] of ROADS) {
    const line = roadLine(a, b);
    const onRoad = line.filter(p => groundAt(nav, p.x, p.z) === 'road').length;
    assert.ok(onRoad / line.length > 0.95, `${a}-${b} is road along its length`);
  }
  assert.equal(groundAt(nav, 470, 350), 'sea', 'the far corner is open sea');
  assert.equal(groundAt(nav, 5000, 0), 'sea', 'off the map counts as sea');
  assert.ok(GROUND.road > GROUND.plain && GROUND.plain > GROUND.forest && GROUND.forest > GROUND.snow);
});

test('every settlement can reach every other, and no route ever crosses the sea', () => {
  const from = byId('oros-camp');
  for (const s of SETTLEMENTS) {
    if (s === from) continue;
    const r = findPath(nav, from, s);
    assert.ok(r, `a route to ${s.name}`);
    assert.equal(overLand(r.points), null, `${s.name}: the route stays on land`);
    const end = r.points.at(-1);
    assert.ok(Math.hypot(end.x - s.x, end.z - s.z) < nav.cell, `${s.name}: it ends there`);
  }
});

test('roads are quicker: the route between two road-linked towns uses the road and beats the straight line', () => {
  const A = byId('agia-marina'),
    B = byId('fort-orion');
  const r = findPath(nav, A, B);
  const straight = lineTime(nav, A, B);
  assert.ok(r.time < straight * 0.85, `route ${r.time.toFixed(1)} s, straight ${straight.toFixed(1)} s`);
  const samples = [];
  for (let k = 1; k < r.points.length; k++)
    for (let s = 0; s < 10; s++) {
      const a = r.points[k - 1],
        b = r.points[k];
      samples.push(groundAt(nav, a.x + ((b.x - a.x) * s) / 10, a.z + ((b.z - a.z) * s) / 10));
    }
  assert.ok(samples.filter(g => g === 'road').length / samples.length > 0.6, 'most of the way on the road');
});

test('snow and forest are slower than open country over the same distance', () => {
  // find a cell of each ground and time one cell's crossing
  const find = kind => {
    for (let j = 0; j < nav.rows; j++)
      for (let i = 0; i < nav.cols; i++) {
        const x = -480 + (i + 0.5) * nav.cell,
          z = -360 + (j + 0.5) * nav.cell;
        if (['plain', 'snow', 'forest'].includes(kind) && groundAt(nav, x, z) === kind && groundAt(nav, x + 2, z) === kind) return {x, z};
      }
    return null;
  };
  const t = kind => {
    const p = find(kind);
    assert.ok(p, `there is ${kind} on the island`);
    return lineTime(nav, {x: p.x - 1, z: p.z}, {x: p.x + 1, z: p.z});
  };
  const plain = t('plain');
  assert.ok(t('forest') > plain * 1.4, 'forest is slower');
  assert.ok(t('snow') > plain * 2, 'snow is slower still');
});

test('a click at sea goes to the nearest coast; far out at sea there is no route', () => {
  const A = at(PARTY_SPOTS.player);
  // just off a coast: walk out from Agia Marina until the sea starts
  const port = byId('agia-marina');
  let x = port.x;
  while (heightAt(x, port.z) > 0.6) x -= 2;
  const r = findPath(nav, A, {x: x - 6, z: port.z});
  assert.ok(r, 'a route to the shore');
  assert.ok(speedAt(nav, r.points.at(-1).x, r.points.at(-1).z) > 0, 'ending on land');
  assert.equal(findPath(nav, A, {x: 470, z: 350}), null);
  assert.equal(nearestLand(nav, 470, 350), null);
  assert.equal(findPath(nav, {x: 470, z: 350}, A), null, 'no route from the sea either');
});

test('a party walks its route at the ground’s speed and arrives', () => {
  const A = byId('agia-marina'),
    B = byId('pelekas');
  const r = findPath(nav, A, B);
  const party = {x: A.x, z: A.z, route: {points: r.points, leg: 1}};
  let t = 0;
  while (!advance(nav, party, 0.25)) {
    t += 0.25;
    assert.ok(t < 600, 'it gets there');
    assert.ok(speedAt(nav, party.x, party.z) > 0, 'never at sea');
  }
  assert.ok(Math.hypot(party.x - B.x, party.z - B.z) < nav.cell);
  assert.equal(party.route, null);
  assert.ok(Math.abs(t - r.time) < r.time * 0.15 + 0.5, `walked in ${t} s, planned ${r.time.toFixed(1)} s`);
  assert.ok(BASE_SPEED > 0);
});
