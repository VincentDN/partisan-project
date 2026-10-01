// Ordered dithering: deterministic, honours extremes, mid-grey is ~half ink.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ditherToMask, BAYER4} from '../assets/js/dither.js';

const flat = (v, w = 16, h = 16) => {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < a.length; i += 4) a.set([v, v, v, 255], i);
  return a;
};
const ink = m => m.reduce((n, v) => n + v, 0);

test('bayer matrix is a permutation of 0..15', () =>
  assert.deepEqual(
    [...BAYER4].sort((a, b) => a - b),
    [...Array(16).keys()],
  ));
test('black is all ink, white is none', () => {
  assert.equal(ink(ditherToMask(flat(0), 16, 16, {contrast: 1})), 256);
  assert.equal(ink(ditherToMask(flat(255), 16, 16, {contrast: 1})), 0);
});
test('mid grey is about half ink', () => {
  const n = ink(ditherToMask(flat(128), 16, 16, {contrast: 1}));
  assert.ok(n >= 112 && n <= 144, String(n));
});
test('deterministic', () => assert.deepEqual(ditherToMask(flat(90)), ditherToMask(flat(90))));
