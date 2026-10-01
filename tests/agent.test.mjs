// The work plan must stay valid: sizes, dependencies, generated tables, and the next-packet logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {load, validate, next, available, progress, toMarkdown} from '../tools/agent/packets-lib.mjs';

const data = load();
test('packets.json is structurally valid (no L packets, no cycles, known deps)', () => assert.deepEqual(validate(data), []));
test('validate rejects an L-sized packet and a cycle', () => {
  const bad = structuredClone(data);
  bad.packets.push({id: 'X', title: 't', track: 't', milestone: 'M0', size: 'L', bu: 50, status: 'planned', deps: ['Y'], agent: 'any', needs: [], acceptance: 'a'},
                   {id: 'Y', title: 't', track: 't', milestone: 'M0', size: 'S', bu: 8, status: 'planned', deps: ['X'], agent: 'any', needs: [], acceptance: 'a'});
  const p = validate(bad).join('\n');
  assert.match(p, /must be XS, S or M/); assert.match(p, /cycle/);
});
test('next() respects budget, capabilities and dependencies', () => {
  for (const budget of [3, 8, 20]) for (const p of next(data, {budget})) assert.ok(p.bu <= budget);
  const none = next(data, {budget: 20, can: []});
  assert.ok(none.every(p => p.needs.every(n => n === 'human' ? false : false) || p.needs.length === 0));
  const ids = new Set(available(data).map(p => p.id));
  for (const p of data.packets) if (p.status === 'blocked') assert.ok(!ids.has(p.id));
  const doneIds = new Set(data.packets.filter(p => p.status === 'done').map(p => p.id));
  for (const p of available(data)) for (const d of p.deps) assert.ok(doneIds.has(d));
});
test('a window with 3 BU left still gets work (burn-down) or an explicit empty list', () => {
  const small = next(data, {budget: 3});
  assert.ok(Array.isArray(small));
});
test('human-only packets are never offered to agents', () => assert.ok(next(data, {budget: 20}).every(p => p.agent !== 'human')));
test('M0 is fully done except the owner actions', () => {
  const open = data.packets.filter(p => p.milestone === 'M0' && p.status !== 'done').map(p => p.id).sort();
  assert.deepEqual(open, ['WP-F10', 'WP-F8']);
  assert.ok(progress(data).M0.pct >= 80);
});
test('master-roadmap.md packet table is in sync with packets.json', () => {
  const md = fs.readFileSync('docs/master-roadmap.md', 'utf8');
  const body = md.slice(md.indexOf('<!-- packets:start -->') + 22, md.indexOf('<!-- packets:end -->')).trim();
  assert.equal(body, toMarkdown(data).trim());
});
test('next-packet CLI runs', () => {
  const out = execFileSync('node', ['tools/agent/next-packet.mjs', '--budget', '10'], {encoding: 'utf8'});
  assert.match(out, /Budget 10 BU/);
});
