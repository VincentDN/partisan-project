// Set a packet's status and regenerate the generated docs.
//   node tools/agent/set-status.mjs WP-C1 done [WP-C4 done …]
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {load, FILE, STATUSES} from './packets-lib.mjs';
const data = load(),
  args = process.argv.slice(2);
if (!args.length || args.length % 2) {
  console.error('usage: set-status.mjs <WP-ID> <done|ready|planned|blocked> …');
  process.exit(1);
}
for (let i = 0; i < args.length; i += 2) {
  const p = data.packets.find(p => p.id === args[i]);
  if (!p) {
    console.error(`unknown packet ${args[i]}`);
    process.exit(1);
  }
  if (!STATUSES.includes(args[i + 1])) {
    console.error(`bad status ${args[i + 1]}`);
    process.exit(1);
  }
  p.status = args[i + 1];
}
fs.writeFileSync(FILE, JSON.stringify(data, null, 1) + '\n');
execFileSync('node', ['tools/agent/roadmap-table.mjs'], {stdio: 'inherit'});
execFileSync('node', ['tools/agent/codemap.mjs'], {stdio: 'inherit'});
