// Golden replays (WP-QA18): every level fought by the same seeded script ends exactly as recorded. A failure means
// the fight changed: intended (re-record: node tests/replays/replay.mjs --write) or a regression to fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import {play, replayIds, golden, key} from './replays/replay.mjs';

const G = golden();
for (const [id, seed, kits] of replayIds())
  test(`replay ${key(id, seed, kits)} plays as recorded`, () => {
    const k = key(id, seed, kits),
      g = G[k];
    assert.ok(g, `no recording for ${k}: run node tests/replays/replay.mjs --write`);
    const r = play(id, seed, {kits});
    assert.equal(r.digest, g.digest, `${k} now ends: ${r.summary}; recorded: ${g.summary}`);
  });
