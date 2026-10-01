// Calibration log for the budget system.
//   node tools/agent/usage.mjs log --agent claude --plan claude-pro --packet WP-A2 --pct 9 [--note "…"]
//     --pct = how many percentage points of the 5-hour usage meter the packet consumed (read the meter before and after)
//   node tools/agent/usage.mjs report     average measured % per packet size, and the BU map it implies
import fs from 'node:fs';
import {load} from './packets-lib.mjs';
const FILE = 'docs/agent-ops/usage-log.csv';
const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
if (cmd === 'log') {
  for (const k of ['agent', 'plan', 'packet', 'pct']) if (!args[k]) { console.error(`missing --${k}`); process.exit(1); }
  const p = load().packets.find(p => p.id === args.packet);
  if (!p) { console.error(`unknown packet ${args.packet}`); process.exit(1); }
  fs.appendFileSync(FILE, [new Date().toISOString().slice(0, 10), args.agent, args.plan, p.id, p.size, args.pct, JSON.stringify(args.note || '')].join(',') + '\n');
  console.log('logged');
} else if (cmd === 'report') {
  const rows = fs.readFileSync(FILE, 'utf8').trim().split('\n').slice(1).filter(Boolean).map(l => l.split(','));
  const bySize = {};
  for (const r of rows) (bySize[r[4]] ??= []).push(+r[5]);
  if (!rows.length) { console.log('No measurements yet. Log at least 3 packets per size before changing the BU map.'); process.exit(0); }
  for (const [size, v] of Object.entries(bySize)) console.log(`${size}: n=${v.length}, mean ${(v.reduce((a, b) => a + b) / v.length).toFixed(1)}% of a window, max ${Math.max(...v)}%`);
  console.log('\nIf a mean is 1.5x the nominal BU for its size (XS 3, S 8, M 20), raise the nominal and re-split the packets of that size.');
} else { console.error('usage: usage.mjs log … | report'); process.exit(1); }
