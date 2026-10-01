import test from 'node:test';
import assert from 'node:assert/strict';
import {BenchActions, FAMILIES, FAMILY_OF, phase} from '../bench/actions.js';
import {motionAt, partPaths, MOTION} from '../bench/motion.js';
import {SLOTS} from '../workbench/attachments.js';

const clock = () => {
  const c = {t: 0, now: () => c.t};
  return c;
};
const spec = (log, over = {}) => ({
  duration: 4,
  commitAt: 2,
  commit: () => log.push('commit'),
  cleanup: (reason, committed) => log.push(`cleanup:${reason}:${committed}`),
  ...over,
});

test('an action commits exactly once and then completes', () => {
  const c = clock(),
    log = [],
    a = new BenchActions({now: c.now});
  a.start(spec(log));
  for (let t = 0; t <= 5; t += 0.5) {
    c.t = t;
    a.tick();
  }
  assert.deepEqual(log, ['commit', 'cleanup:complete:true']);
  assert.equal(a.busy, false);
});

test('cancel before the commit leaves nothing committed; cancel after keeps the commit', () => {
  const c = clock(),
    log = [],
    a = new BenchActions({now: c.now});
  a.start(spec(log));
  c.t = 1;
  a.tick();
  a.cancel();
  assert.deepEqual(log, ['cleanup:cancel:false']);
  const log2 = [];
  a.start(spec(log2));
  c.t += 3;
  a.tick();
  a.cancel();
  assert.deepEqual(log2, ['commit', 'cleanup:cancel:true']);
});

test('skip commits first, then finishes', () => {
  const log = [],
    a = new BenchActions({now: () => 0});
  a.start(spec(log));
  a.skip();
  assert.deepEqual(log, ['commit', 'cleanup:skip:true']);
});

test('a second start is refused while busy; a zero duration is rejected', () => {
  const a = new BenchActions({now: () => 0});
  assert.equal(a.start(spec([])), true);
  assert.equal(a.start(spec([])), false);
  assert.throws(() => new BenchActions().start({duration: 0, commitAt: 0}));
});

test('transient cues from a stalled frame are dropped; durable ones still run', () => {
  const c = clock(),
    ran = [],
    a = new BenchActions({now: c.now});
  a.start(
    spec([], {
      events: [
        {at: 0.5, run: () => ran.push('click'), transient: true},
        {at: 0.6, run: () => ran.push('state')},
      ],
    }),
  );
  c.t = 3;
  a.tick();
  assert.deepEqual(ran, ['state']);
});

test('pauseAt holds the action until resumed, without counting paused time', () => {
  const c = clock(),
    log = [],
    a = new BenchActions({now: c.now});
  a.start(spec(log, {pauseAt: 1}));
  c.t = 3;
  a.tick();
  assert.equal(a.current.elapsed, 1);
  assert.equal(a.current.paused, true);
  c.t = 10;
  a.tick();
  assert.equal(a.current.elapsed, 1);
  a.resume();
  c.t = 11;
  a.tick();
  assert.equal(a.current.elapsed, 2);
});

test('motion segments are ordered and the mounted part is hidden only while it travels', () => {
  assert.equal(motionAt(0).mountedVisible, true);
  assert.equal(motionAt(0.45).mountedVisible, false);
  assert.equal(motionAt(0.45).oldVisible, true);
  assert.equal(motionAt(0.6).nextVisible, true);
  assert.equal(motionAt(0.9).mountedVisible, true);
  assert.equal(motionAt(0.45, {inPlace: true}).oldVisible, false);
  assert.ok(phase(0.5, 0.4, 0.6) > 0.4 && phase(0.5, 0.4, 0.6) < 0.6);
});

test('part paths are continuous and end where they should', () => {
  const p = {mount: [0.2, 0.05, 0], clear: MOTION.optic.clear, tray: [0.6, 0, 0.3], arc: MOTION.optic.arc};
  assert.deepEqual(partPaths(0, p).old, p.mount);
  assert.deepEqual(
    partPaths(0.5, p).old.map(v => +v.toFixed(6)),
    p.tray,
  );
  assert.deepEqual(
    partPaths(0.74, p).next.map(v => +v.toFixed(6)),
    p.mount,
  );
  let prev = partPaths(0, p).old;
  for (let u = 0.01; u <= 0.5; u += 0.01) {
    const q = partPaths(u, p).old;
    assert.ok(Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]) < 0.12, `old part jumps at u=${u.toFixed(2)}`);
    prev = q;
  }
});

test('every bench family has motion data and a Workbench slot', () => {
  const ids = new Set(SLOTS.map(s => s.id));
  for (const [slot, family] of Object.entries(FAMILY_OF)) {
    assert.ok(ids.has(slot), `slot ${slot} exists`);
    assert.ok(FAMILIES[family] && MOTION[family], `family ${family} complete`);
  }
});

import * as T from 'three';
import {solveTwoBone} from '../bench/ik.js';
test('two-bone IK keeps bone lengths, reaches reachable targets and clamps unreachable ones', () => {
  const v = (x, y, z) => new T.Vector3(x, y, z),
    s = v(0, 0.4, -0.6);
  for (const target of [v(0.1, 0.1, 0), v(-0.2, 0.05, 0), v(0.3, 0.2, -0.2)]) {
    const r = solveTwoBone(s, target, 0.4, 0.38, v(0.5, -1, 0));
    assert.ok(Math.abs(r.elbow.distanceTo(s) - 0.4) < 1e-6, 'upper length');
    assert.ok(Math.abs(r.wrist.distanceTo(r.elbow) - 0.38) < 1e-6, 'forearm length');
    assert.ok(r.wrist.distanceTo(target) < 1e-6 && !r.clamped);
    assert.ok(r.elbow.y < (s.y + target.y) / 2 + 1e-6, 'elbow bends downward');
  }
  const far = solveTwoBone(s, v(3, 0, 3), 0.4, 0.38, v(0, -1, 0));
  assert.ok(far.clamped && far.reach <= 0.78);
});

import {homography, apply, toMatrix3d, quadTransform} from '../shared/homography.js';
test('homography maps the rectangle onto the quad and keeps straight lines straight', () => {
  const src = [
      [0, 0],
      [360, 0],
      [360, 300],
      [0, 300],
    ],
    dst = [
      [120, 80],
      [510, 60],
      [560, 400],
      [90, 380],
    ];
  const H = homography(src, dst);
  src.forEach((p, i) => {
    const q = apply(H, p);
    assert.ok(Math.hypot(q[0] - dst[i][0], q[1] - dst[i][1]) < 1e-6, `corner ${i}`);
  });
  // The centre of the rectangle lands inside the quad, and the midpoint of an edge stays on that edge's image line.
  const c = apply(H, [180, 150]);
  assert.ok(c[0] > 90 && c[0] < 560 && c[1] > 60 && c[1] < 400);
  const m = apply(H, [180, 0]),
    a = dst[0],
    b = dst[1];
  const cross = (m[0] - a[0]) * (b[1] - a[1]) - (m[1] - a[1]) * (b[0] - a[0]);
  assert.ok(Math.abs(cross) < 1e-4);
  assert.match(quadTransform(360, 300, dst), /^matrix3d\((-?[\d.e+-]+,){15}-?[\d.e+-]+\)$/);
  assert.equal(toMatrix3d([1, 0, 0, 0, 1, 0, 0, 0, 1]), 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
  assert.throws(() =>
    homography(src, [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]),
  );
});
