// Getting there (WP-QA21, QA22): paths round cover, and destinations a body can actually reach.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim, inBox} from '../convoy/sim.js';
import {findPath, openNear, reachable} from '../convoy/pathfind.js';
import {findCover} from '../convoy/ai.js';

// a walled yard with no gate (four walls round 0,0), a rock to hide behind outside it, a soldier by the rock
const level = (extra = {}) => ({
  id: 'walk',
  title: 'Walk',
  brief: '',
  bounds: {minX: -40, maxX: 40, minZ: -40, maxZ: 40},
  ground: {color: 0x445533},
  cover: [
    {x: 0, z: -6, w: 12, d: 1, h: 3, kind: 'wall'},
    {x: 0, z: 6, w: 12, d: 1, h: 3, kind: 'wall'},
    {x: -6, z: 0, w: 1, d: 12, h: 3, kind: 'wall'},
    {x: 6, z: 0, w: 1, d: 12, h: 3, kind: 'wall'},
    {x: 20, z: 0, w: 3, d: 3, h: 1.5, kind: 'rock'},
  ],
  partisans: [{id: 'player', label: 'You', x: -30, z: 0}],
  convoy: null,
  units: [{name: 'Guard', role: 'rifleman', x: 14, z: 0, facing: 0, group: 'gate'}],
  objectives: [{id: 'h', type: 'hold', seconds: 999, label: 'wait'}],
  ...extra,
});

test('walk: inside a closed yard is out of reach, outside it is not', () => {
  const sim = new Sim({level: level(), seed: 1});
  assert.equal(reachable(sim, 14, 0, 0, 0), false, 'the yard has no way in');
  assert.equal(reachable(sim, 14, 0, 30, 10), true, 'open ground is');
  assert.equal(reachable(sim, 14, 0, 50, 0), false, 'off the map is not');
  assert.ok(findPath(sim, {x: 14, z: 0}, {x: 0, z: 0}).length > 0, 'a path still gets as near as it can');
});

test('walk: openNear leaves open ground alone and moves a point out of a wall', () => {
  const sim = new Sim({level: level(), seed: 1});
  assert.deepEqual(openNear(sim, 30, 10), {x: 30, z: 10});
  const p = openNear(sim, 6.2, 0); // in the east wall
  assert.ok(p && !sim.level.cover.some(b => inBox(p.x, p.z, b, 0.45)), 'clear of every wall by a body');
});

test('walk: cover from a threat in the north is never inside the yard', () => {
  // just north of the yard, the nearest spot hidden from the north is inside its north wall: out of reach
  const sim = new Sim({level: level(), seed: 1});
  const u = sim.units.find(x => x.side === 'army');
  for (const [x, z] of [
    [0, -9],
    [4, -8],
    [-4, -8],
  ]) {
    Object.assign(u, {x, z});
    const c = findCover(sim, u, {x: 0, z: -34});
    assert.ok(c, `cover found from (${x}, ${z})`);
    assert.ok(reachable(sim, x, z, c.x, c.z), `(${c.x.toFixed(1)}, ${c.z.toFixed(1)}) can be walked to`);
  }
});

test('walk: a move whose goal is in a wall ends next to it instead of pushing on', () => {
  const sim = new Sim({level: level(), seed: 1});
  const u = sim.units.find(x => x.side === 'army');
  Object.assign(u, {x: 10, z: 0, speed: 4});
  u.moveTo = {x: 6.4, z: 0}; // inside the east wall's margin
  let arrived = false;
  for (let i = 0; i < 300 && !arrived; i++) {
    arrived = sim.move(u, 1 / 60);
  }
  assert.ok(arrived, 'it arrives');
  assert.ok(u.x > 6.5 + 0.4, 'and stands outside the wall');
});
