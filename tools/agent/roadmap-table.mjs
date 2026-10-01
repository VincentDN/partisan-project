// Keeps the packet table in docs/master-roadmap.md generated from packets.json.
//   node tools/agent/roadmap-table.mjs          rewrite the table between the markers
//   node tools/agent/roadmap-table.mjs --check  exit 1 if the roadmap is out of sync
import fs from 'node:fs';
import {load, toMarkdown} from './packets-lib.mjs';
const FILE = 'docs/master-roadmap.md', START = '<!-- packets:start -->', END = '<!-- packets:end -->';
const md = fs.readFileSync(FILE, 'utf8');
const a = md.indexOf(START), b = md.indexOf(END);
if (a < 0 || b < 0) { console.error(`markers ${START} / ${END} missing in ${FILE}`); process.exit(1); }
const next = md.slice(0, a + START.length) + '\n\n' + toMarkdown(load()) + '\n\n' + md.slice(b);
if (process.argv.includes('--check')) { if (next !== md) { console.error('master-roadmap.md packet table is stale: run node tools/agent/roadmap-table.mjs'); process.exit(1); } console.log('roadmap table in sync'); }
else { fs.writeFileSync(FILE, next); console.log('roadmap table updated'); }
