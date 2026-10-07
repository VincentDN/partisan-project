// The performance budget check itself (WP-QA2, tools/perf/bench.mjs): what counts as a regression.
import test from 'node:test';
import assert from 'node:assert/strict';
import {regressions} from '../tools/perf/bench.mjs';

test('a mean, p99, CPU time or size over 20 % of its baseline is a regression; noise and new rows are not', () => {
  const base = {sim: {convoy: {meanMs: 0.1, p99Ms: 1, worstMs: 5, cpuMs: 1000}}, pages: {'map/': {kb: 1000, requests: 50}}};
  assert.deepEqual(regressions(base, base), []);
  const now = {
    sim: {convoy: {meanMs: 0.13, p99Ms: 1.1, worstMs: 50, cpuMs: 1300}, cave: {meanMs: 9}},
    pages: {'map/': {kb: 1300, requests: 50}},
  };
  assert.deepEqual(regressions(base, now), ['sim convoy cpuMs: 1000 -> 1300', 'pages map/ kb: 1000 -> 1300']);
});
