// Rebel followers reserve reachable positions, use real cover and respect explicit orders.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {followPosition} from '../convoy/ai-follow.js';
import {partisanThink, partisanAct} from '../convoy/ai-partisan.js';
import {reachable} from '../convoy/pathfind.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function setup(cover = []) {
  const sim = new Sim({
    seed: 7,
    level: {
      id: 'follow-test',
      title: 'Follow',
      brief: '',
      ground: {},
      bounds: {minX: -40, maxX: 40, minZ: -40, maxZ: 40},
      cover,
      convoy: null,
      items: [],
      objectives: [{id: 'hold', type: 'hold', seconds: 999}],
      partisans: Array.from({length: 8}, (_, i) => ({id: i ? `mate-${i}` : 'player', label: 'Rebel', x: -10 - i * 2, z: i % 2 ? 7 : -7})),
      units: [{id: 'guard', name: 'Guard', role: 'rifleman', x: 20, z: 0, facing: Math.PI}],
    },
  });
  sim.player.x = 0;
  sim.player.z = 0;
  sim.player.facing = 0;
  const mates = sim.units.filter(u => u.side === 'partisan' && u !== sim.player);
  sim.order(
    mates.map(u => u.id),
    {type: 'follow'},
  );
  return {sim, mates};
}
test('eight-person formation reserves distinct reachable slots even at a wall', () => {
  const {sim, mates} = setup([{x: -3, z: 0, w: 3, d: 7, h: 2, kind: 'wall'}]);
  const slots = mates.map(u => followPosition(sim, u));
  for (let i = 0; i < slots.length; i++) {
    assert.ok(distance(slots[i], sim.player) >= 2.4);
    assert.ok(reachable(sim, mates[i].x, mates[i].z, slots[i].x, slots[i].z));
    for (let j = 0; j < i; j++) assert.ok(distance(slots[i], slots[j]) >= 2.4);
  }
});
test('followers choose separate protected positions and leave them when the leader advances', () => {
  const {sim, mates} = setup([{x: -2, z: 0, w: 2, d: 12, h: 3, kind: 'wall'}]);
  sim.alarm = true;
  const threat = sim.units.find(u => u.side === 'army');
  const slots = mates.slice(0, 2).map(u => {
    u.visible = [threat];
    return followPosition(sim, u);
  });
  for (const at of slots) assert.ok(!sim.los(threat.x, threat.z, at.x, at.z) || sim.lowCover(threat.x, threat.z, at.x, at.z));
  assert.ok(distance(slots[0], slots[1]) >= 2.4);
  mates[0].visible = [];
  sim.time += 0.5;
  assert.deepEqual(followPosition(sim, mates[0]), slots[0], 'breaking sight does not immediately abandon cover');
  sim.time += 1;
  sim.player.x = 20;
  assert.ok(distance(followPosition(sim, mates[0]), slots[0]) > 10);
});
test('unseen enemies do not influence follow positions; hold stays authoritative under fire', () => {
  const {sim, mates} = setup();
  sim.alarm = true;
  followPosition(sim, mates[0]);
  assert.equal(mates[0].followCover, null);
  sim.order([mates[0].id], {type: 'hold'});
  mates[0].supp = 0.9;
  partisanThink(sim, mates[0]);
  assert.equal(mates[0].moveTo, null);
});
test('switching the active rebel resets the movement heading', () => {
  const {sim, mates} = setup();
  followPosition(sim, mates[0]);
  sim.swapTo(mates[1].id);
  sim.player.facing = 1;
  followPosition(sim, mates[0]);
  assert.equal(sim.followHeading.leader, mates[1].id);
  assert.equal(sim.followHeading.a, 1);
});

test('thin sandbags provide usable low cover rather than merely decorative cover', () => {
  const {sim, mates} = setup([{x: -2, z: 0, w: 0.5, d: 12, h: 0.8, kind: 'sandbag'}]);
  sim.alarm = true;
  const threat = sim.units.find(u => u.side === 'army');
  mates[0].visible = [threat];
  const at = followPosition(sim, mates[0]);
  assert.ok(mates[0].followCover);
  assert.ok(sim.lowCover(threat.x, threat.z, at.x, at.z));
});

test('followers finish their approach to cover rather than stopping short in the open', () => {
  const {sim, mates} = setup([{x: -2, z: 0, w: 0.5, d: 12, h: 0.8, kind: 'sandbag'}]);
  sim.alarm = true;
  const u = mates[0],
    threat = sim.units.find(o => o.side === 'army');
  u.visible = [threat];
  const at = followPosition(sim, u);
  u.x = at.x - 1;
  u.z = at.z;
  partisanThink(sim, u);
  assert.ok(u.moveTo, 'within normal formation tolerance still approaches cover');
  for (let i = 0; i < 120; i++) {
    sim.time += 1 / 60;
    u.visible = [threat];
    if (i % 12 === 0) partisanThink(sim, u);
    partisanAct(sim, u, 1 / 60);
  }
  assert.ok(distance(u, at) < 0.5);
  assert.ok(sim.lowCover(threat.x, threat.z, u.x, u.z));
});
