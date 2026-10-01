// Pick what to work on now.
//   node tools/agent/next-packet.mjs --budget 12 [--agent claude|codex] [--can browser,bpy,net] [--json]
// --budget is the BU you have left in the current 5-hour window (1 BU = 1% of the weaker plan's window).
import {load, validate, next} from './packets-lib.mjs';
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (a, v, i, all) =>
        v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : a,
      [],
    ),
);
const data = load();
const problems = validate(data);
if (problems.length) {
  console.error('packets.json is invalid:\n' + problems.join('\n'));
  process.exit(1);
}
const budget = +args.budget || 20;
const list = next(data, {budget, agent: args.agent || 'any', can: args.can ? String(args.can).split(',') : ['browser', 'bpy', 'net']});
if (args.json) {
  console.log(JSON.stringify(list.slice(0, 5), null, 1));
  process.exit(0);
}
if (!list.length) {
  console.log(`No packet fits ${budget} BU with those capabilities. Open human packets:`);
  data.packets.filter(p => p.agent === 'human' && p.status !== 'done').forEach(p => console.log(` - ${p.id} ${p.title}`));
  process.exit(0);
}
console.log(`Budget ${budget} BU. Best fit first:\n`);
for (const p of list.slice(0, 5)) {
  console.log(`${p.id}  [${p.size}, ${p.bu} BU, ${p.status}]  ${p.title}`);
  if (p.inputs?.length) console.log(`   read:   ${p.inputs.join(', ')}`);
  console.log(`   done =  ${p.acceptance}\n`);
}
