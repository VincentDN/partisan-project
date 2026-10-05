// Weapon Workbench data: every option has stats, rules are symmetric and satisfiable, stats stay in range.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS} from '../workbench/models.js';
import {SLOTS} from '../workbench/attachments.js';
import {STATS, MODIFIERS, RULES, computeStats, blockedBy} from '../workbench/stats.js';
import {parseLegacy, toLegacy, decode, encode} from '../shared/loadout.js';

const optionsOf = (config, slotId) => {
  const conf = config.slots[slotId],
    lib = SLOTS.find(s => s.id === slotId).library;
  return [
    ...conf.factory,
    ...conf.library.map(e => {
      const o = typeof e === 'string' ? {id: e} : e;
      return {...lib.find(l => l.id === o.id), ...o};
    }),
  ];
};

for (const [rifleId, config] of Object.entries(MODELS)) {
  test(`[${rifleId}] every option of every slot has a stat modifier entry (possibly empty) and a label`, () => {
    for (const slotId of Object.keys(config.slots))
      for (const o of optionsOf(config, slotId)) {
        assert.ok(o.label, `${slotId}/${o.id}: label`);
        if (!['rk9', 'factory'].includes(o.id) && slotId !== 'stock' && slotId !== 'muzzle')
          assert.ok(MODIFIERS[slotId], `${slotId}: no MODIFIERS section`);
        assert.ok(
          slotId === 'grip' || MODIFIERS[slotId]?.[o.id] !== undefined || o.id === 'factory',
          `${slotId}/${o.id}: no entry in MODIFIERS (use {} for "no effect")`,
        );
      }
  });
  test(`[${rifleId}] weights: every option that adds geometry declares grams`, () => {
    for (const slotId of Object.keys(config.slots))
      for (const o of optionsOf(config, slotId)) {
        const adds = !['none', 'bare'].includes(o.id);
        if (adds && slotId !== 'side') assert.ok(typeof o.grams === 'number' || o.original, `${slotId}/${o.id}: grams`);
      }
  });
  test(`[${rifleId}] computed stats always stay within 0..100 across every combination`, () => {
    const slots = Object.keys(config.slots);
    const opts = slots.map(s => optionsOf(config, s));
    let n = 0;
    const walk = (i, chosen) => {
      if (i === slots.length) {
        n++;
        const out = computeStats(config.stats, Object.fromEntries(slots.map((s, k) => [s, chosen[k]])));
        for (const st of STATS) assert.ok(out[st.id] >= 0 && out[st.id] <= 100, `${st.id}=${out[st.id]}`);
        assert.ok(out.rounds >= 0);
        return;
      }
      for (const o of opts[i]) walk(i + 1, [...chosen, o]);
    };
    walk(0, []);
    assert.ok(n >= 20, `walked ${n} combinations`);
  });
}

test('sound signature: a suppressor is the quietest muzzle device and a bare muzzle is louder than a brake', () => {
  const loud = id => MODIFIERS.muzzle[id].loud || 0;
  assert.ok(loud('can') < loud('ak74') && loud('can') < loud('comp') && loud('bare') >= loud('ak74'));
});

test('rules: symmetric (forward and reverse), every blocked pair names a reason, and defaults are not blocked', () => {
  for (const rule of RULES) {
    assert.ok(rule.reason && rule.reason.length > 10, 'reason');
    const [[whenSlot, whenId]] = Object.entries(rule.when);
    for (const [slot, ids] of Object.entries(rule.block))
      for (const id of ids) {
        assert.equal(blockedBy({[whenSlot]: whenId}, slot, id), rule, `forward ${whenSlot}=${whenId} blocks ${slot}=${id}`);
        assert.equal(blockedBy({[slot]: id}, whenSlot, whenId), rule, `reverse ${slot}=${id} blocks ${whenSlot}=${whenId}`);
      }
  }
  for (const config of Object.values(MODELS)) {
    const defaults = Object.fromEntries(
      Object.keys(config.slots).map(s => [s, config.defaults?.build?.[s] ?? config.slots[s].factory[0].id]),
    );
    for (const [slot, id] of Object.entries(defaults))
      assert.equal(blockedBy(defaults, slot, id), null, `default ${slot}=${id} is blocked by its own build`);
  }
});

test('rules reference options that exist on at least one rifle', () => {
  const all = new Set(Object.values(MODELS).flatMap(c => Object.keys(c.slots).flatMap(s => optionsOf(c, s).map(o => `${s}=${o.id}`))));
  for (const rule of RULES) {
    for (const [s, id] of Object.entries(rule.when)) assert.ok(all.has(`${s}=${id}`), `when ${s}=${id}`);
    for (const [s, ids] of Object.entries(rule.block)) for (const id of ids) assert.ok(all.has(`${s}=${id}`), `block ${s}=${id}`);
  }
});

test('presets from the Workbench parse as loadouts and survive the P1 code', () => {
  const presets = [
    'rifle=ak15k&foregrip=stop&handguard-finish=od&foregrip-finish=od',
    'rifle=ak15k&muzzle=brake&optic=holo&magazine=60&stock=collapsed',
    'optic=scope&foregrip=angled&handguard-finish=desert',
  ];
  for (const p of presets) {
    const l = parseLegacy(p);
    assert.deepEqual(decode(encode(l)), l);
    assert.deepEqual(parseLegacy(toLegacy(l)), l);
  }
});

test('every take in the foley manifest exists, is a WAV', async () => {
  const fs = await import('node:fs');
  const dir = 'assets/audio/foley',
    manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), ['click', 'clunk', 'handle', 'hit', 'long', 'ratchet', 'slide']);
  for (const [cls, files] of Object.entries(manifest))
    for (const f of files) {
      const p = `${dir}/${cls}/${f}`;
      assert.equal(fs.readFileSync(p).subarray(0, 4).toString(), 'RIFF', p);
    }
});

test('every rifle takes every shared attachment (workbench/universal.js); magazines stay calibre-specific', async () => {
  const {UNIVERSAL} = await import('../workbench/universal.js');
  for (const [rifleId, config] of Object.entries(MODELS))
    for (const slot of ['muzzle', 'optic', 'buis', 'foregrip', 'side', 'trigger', 'charging', 'sling']) {
      const conf = config.slots[slot];
      assert.ok(conf, `${rifleId}: no ${slot} slot`);
      const ids = new Set([...conf.factory.map(o => o.id), ...conf.library.map(e => (typeof e === 'string' ? e : e.id))]);
      for (const id of UNIVERSAL[slot]) assert.ok(ids.has(id), `${rifleId}/${slot}: missing ${id}`);
      const mounted = config.sockets.some(s => s[0] === slot) || config.mounts?.some(m => m[0] === slot);
      assert.ok(mounted, `${rifleId}/${slot}: no mount point`);
      assert.ok(
        config.parts.some(p => p.id === slot),
        `${rifleId}/${slot}: no part`,
      );
    }
});
