// The design-decision log (docs/design-decisions/) stays complete: unique ids, full entries, indexed documents, live links.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'docs/design-decisions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md');
const text = f => fs.readFileSync(path.join(dir, f), 'utf8');
const entries = files.flatMap(f =>
  text(f)
    .split(/^### (?=TAC-)/m)
    .slice(1)
    .map(body => ({file: f, id: body.match(/^(TAC-[A-Z]+-\d+)/)[1], body})),
);

test('decisions: ids are unique and match their document section', () => {
  const ids = entries.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate decision id');
  assert.ok(entries.length >= 100, `expected at least 100 decisions, found ${entries.length}`);
  const prefix = {'00-principles.md': 'X', '01-convoy-prototype.md': 'P'};
  for (const e of entries) {
    const want = prefix[e.file] || e.file[0];
    assert.equal(e.id.split('-')[1], want, `${e.id} belongs in ${e.file}`);
  }
});

test('decisions: every entry has status, decision, why, alternatives, cost and an owner-feedback line', () => {
  for (const e of entries)
    for (const field of [
      'Status:',
      'Decision:',
      'Why:',
      'Alternatives rejected:',
      'Cost / risk:',
      'Cost to change:',
      'Revisit if:',
      'Owner feedback:',
    ])
      assert.ok(
        e.body.includes(`- ${field}`) || e.body.includes(`  ·  ${field}`) || e.body.includes(`\n- ${field}`),
        `${e.id} is missing "${field}"`,
      );
  for (const e of entries) assert.match(e.body, /Status: (built|planned|superseded)/, `${e.id} status`);
});

test('decisions: every document is indexed, and every relative link in them resolves', () => {
  const index = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
  for (const f of files) assert.ok(index.includes(`(${f})`), `${f} is not in the README index`);
  for (const f of [...files, 'README.md']) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const [, link] of src.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g))
      assert.ok(fs.existsSync(path.join(dir, link)), `${f}: broken link ${link}`);
  }
});

test('decisions: packets that point at the log point at documents that exist', () => {
  const {packets} = JSON.parse(fs.readFileSync('docs/agent-ops/packets.json', 'utf8'));
  for (const p of packets.filter(x => x.id.startsWith('WP-S')))
    for (const input of p.inputs.filter(i => i.startsWith('docs/design-decisions')))
      assert.ok(fs.existsSync(input), `${p.id}: ${input} missing`);
  assert.ok(packets.filter(x => x.id.startsWith('WP-S')).length >= 26, 'WP-S1..S26 exist');
});

test('decisions: every planned packet range is covered by a decision (S5-S26 appear in a document)', () => {
  const all = files.map(text).join('\n');
  for (let n = 1; n <= 26; n++) assert.ok(new RegExp(`WP-S${n}\\b`).test(all), `WP-S${n} has no decision referencing it`);
});
