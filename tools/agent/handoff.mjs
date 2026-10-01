// Write the "Latest handoff" block of docs/agent-ops/STATE.md from git facts + your summary.
//   node tools/agent/handoff.mjs --agent claude --packet WP-A2 --status partial --note "Imported 2 of 3 parts; third fails UV check" [--next "Fix UVs in …"]
// Run it as the LAST action before a window ends (after committing and pushing).
import fs from 'node:fs';
import {execSync} from 'node:child_process';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
const sh = c => { try { return execSync(c, {encoding: 'utf8'}).trim(); } catch { return ''; } };
const FILE = 'docs/agent-ops/STATE.md', START = '<!-- handoff:start -->', END = '<!-- handoff:end -->';
const dirty = sh('git status --porcelain').split('\n').filter(Boolean);
const block = `${START}
**${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${args.agent || 'agent'} · ${args.packet || '(no packet)'} · ${args.status || 'partial'}**

- Branch \`${sh('git branch --show-current')}\` at \`${sh('git rev-parse --short HEAD')}\`; ${dirty.length ? `**${dirty.length} uncommitted file(s)** (commit before stopping): ${dirty.slice(0, 6).join(', ')}` : 'working tree clean'}.
- Last commits: ${sh('git log -3 --pretty=format:"%h %s" ').split('\n').join(' · ')}
- What happened: ${args.note || '(write one or two sentences)'}
- Next step: ${args.next || '(name the exact next action, file and command)'}
${END}`;
const md = fs.readFileSync(FILE, 'utf8');
const a = md.indexOf(START), b = md.indexOf(END);
fs.writeFileSync(FILE, md.slice(0, a) + block + md.slice(b + END.length));
console.log(block);
if (dirty.length) console.error('\nWARNING: uncommitted changes will be invisible to the next agent.');
