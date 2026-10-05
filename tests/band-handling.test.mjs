// The Rebel Band's hands-on pawn: walking in place, facing, aiming, firing cadence, the magazine and the reload
// choreography (band/handling.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandling, profileFor, PROFILES, REST_ANGLE} from '../band/handling.js';
import {TROOPS} from '../band/troops.js';

const run = (h, seconds, dt = 1 / 60) => {
  for (let t = 0; t < seconds - 1e-9; t += dt) h.step(dt);
};
const recorder = () => {
  const events = [];
  return {events, emit: (type, data) => events.push({type, ...data}), count: type => events.filter(e => e.type === type).length};
};

test('every class gun has a handling profile, and the odd ones handle as they should', () => {
  for (const t of Object.values(TROOPS)) assert.ok(profileFor(t.gun).mag >= 1, t.gun);
  assert.equal(profileFor('set-rocket'), PROFILES.launcher);
  assert.equal(profileFor('set-lmg'), PROFILES.lmg);
  assert.equal(profileFor('ak74m'), PROFILES.rifle);
  assert.equal(profileFor(undefined), PROFILES.rifle);
});

test('the movement keys walk it in place: it bobs and steps with sound, and never turns away', () => {
  const r = recorder(),
    h = createHandling({emit: r.emit});
  assert.equal(h.pose().rest, 1, 'it starts with the weapon at rest');
  assert.equal(h.key('KeyD', true), true);
  run(h, 1);
  assert.ok(r.count('step') >= 2, 'footsteps');
  assert.equal(h.pose().rest, 1, 'walking does not swing the weapon');
  assert.equal('dir' in h.pose(), false, 'no facing: the character always faces the viewer');
  assert.equal(h.key('KeyQ', true), false, 'no turning keys');
  let peak = 0;
  for (let i = 0; i < 30; i++) {
    h.step(1 / 60);
    peak = Math.max(peak, h.pose().bob);
  }
  assert.ok(peak > 0.5, 'it bobs');
  h.key('KeyD', false);
  h.step(1 / 60);
  assert.equal(h.pose().bob, 0, 'standing still');
  assert.equal(h.key('KeyX', true), false, 'other keys are left to the page');
});

test('the mouse aims the weapon; when it leaves, the weapon eases back to rest', () => {
  const h = createHandling();
  h.aimAt(-10, 0);
  run(h, 0.5);
  assert.ok(Math.abs(Math.abs(h.pose().aim) - Math.PI) < 1e-9, 'aimed left');
  assert.equal(h.pose().rest, 0, 'fully aimed');
  h.aimAt(null);
  h.step(1 / 60);
  assert.ok(h.pose().rest > 0 && h.pose().rest < 1, 'easing back, not snapping');
  assert.equal(h.engaged, true, 'still drawn by hand while it swings back');
  run(h, 1);
  assert.equal(h.pose().rest, 1, 'back at its resting angle');
  assert.equal(h.engaged, false, 'and handed back to the idle');
  assert.ok(Math.abs(REST_ANGLE + 0.6) < 1e-9, 'the idle draws the gun at -0.6 rad (band.js paint)');
});

test('automatic weapons fire at their cadence while held; semi-automatics once per press', () => {
  const r = recorder(),
    h = createHandling({gun: 'ak74m', emit: r.emit});
  h.trigger(true);
  run(h, 0.5);
  h.trigger(false);
  const shots = r.count('shot');
  assert.ok(shots >= 4 && shots <= 6, `about 5 rounds in half a second at 600 rpm: ${shots}`);
  assert.equal(h.mag, 30 - shots);
  const s = recorder(),
    m = createHandling({gun: 'set-sniper', emit: s.emit});
  m.trigger(true);
  run(m, 2);
  assert.equal(s.count('shot'), 1, 'held down, a marksman rifle fires once');
  m.trigger(false);
  m.trigger(true);
  m.step(1 / 60);
  assert.equal(s.count('shot'), 2, 'press again for the next');
});

test('a shot kicks and flashes, then settles', () => {
  const h = createHandling({gun: 'ak74m'});
  h.trigger(true);
  h.step(1 / 60);
  h.trigger(false);
  assert.ok(h.pose().kick > 0.5);
  assert.equal(h.pose().flash, true);
  run(h, 0.5);
  assert.equal(h.pose().kick, 0);
  assert.equal(h.pose().flash, false);
});

test('R reloads with the weapon’s choreography and refills the magazine; an empty gun clicks and reloads', () => {
  const r = recorder(),
    h = createHandling({gun: 'ak74m', emit: r.emit});
  h.key('KeyR', true);
  assert.equal(h.reloading, false, 'a full magazine is not reloaded');
  h.trigger(true);
  h.step(1 / 60);
  h.trigger(false);
  h.key('KeyR', true);
  assert.equal(h.reloading, true);
  run(h, 1);
  assert.ok(h.pose().dip > 0.5, 'the gun is lowered for the reload');
  h.trigger(true);
  h.step(1 / 60);
  assert.equal(r.count('shot'), 1, 'no firing while reloading');
  h.trigger(false);
  run(h, 1.5);
  assert.equal(h.reloading, false);
  assert.equal(h.mag, 30);
  assert.equal(r.count('reload-move'), 6, 'every move of the AK reload sounds once');

  const e = recorder(),
    rpg = createHandling({gun: 'set-rocket', emit: e.emit});
  rpg.trigger(true);
  rpg.step(1 / 60);
  rpg.trigger(false);
  rpg.trigger(true);
  run(rpg, 2);
  assert.equal(e.count('shot'), 1);
  assert.equal(e.count('dry'), 1, 'the empty launcher clicks');
  assert.equal(e.count('reload'), 1, 'and reloads itself');
});

test('reduced motion keeps the pawn still while every action still happens and sounds', () => {
  const r = recorder(),
    h = createHandling({gun: 'ak74m', emit: r.emit, reduceMotion: true});
  h.key('KeyA', true);
  h.trigger(true);
  run(h, 0.5);
  const p = h.pose();
  assert.equal(p.bob, 0);
  assert.equal(p.kick, 0);
  assert.ok(r.count('step') >= 1 && r.count('shot') >= 1);
});

test('a new gun brings its own magazine; release lets go of every key', () => {
  const h = createHandling({gun: 'ak74m'});
  h.setGun('set-lmg');
  assert.equal(h.mag, 100);
  h.key('KeyW', true);
  h.trigger(true);
  h.release();
  run(h, 0.2);
  assert.equal(h.pose().bob, 0);
  assert.equal(h.mag, 100);
  run(h, 0.2);
  assert.equal(h.engaged, false, 'idle again once nothing is going on');
});
