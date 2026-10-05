// The warehouse ambience behind the Operator and Weapon Modders: real recordings for every bed and event, all present.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('assets/audio/warehouse/manifest.json', 'utf8'));
const src = fs.readFileSync('shared/warehouse-ambience.js', 'utf8');

test('warehouse ambience: every category the player uses has recordings, each file on disk with its Freesound source', () => {
  const used = [...src.matchAll(/(?:cats: \[|cat: )'([a-z-]+)'/g)].map(m => m[1]).concat('radio-squelch');
  for (const cat of new Set(used)) {
    const files = manifest.categories[cat]?.files || [];
    assert.ok(files.length > 0, `${cat}: no recordings`);
    for (const f of files) {
      assert.ok(fs.existsSync(`assets/audio/warehouse/${f.file}`), f.file);
      assert.match(f.source, /^https:\/\/freesound\.org\/s\/\d+\/$/);
    }
  }
  for (const cat of ['amb-room', 'amb-rain', 'voices', 'hum']) assert.equal(manifest.categories[cat].loop, true, `${cat} loops`);
});
