// Rail footprints against the real rifle data: no overlap by construction, and "blocked" only when truly impossible.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MODELS, RAIL_OF} from '../workbench/models.js';
import {SLOTS} from '../workbench/attachments.js';
import {clash, resolve, fits, candidates, span} from '../workbench/rails.js';

const SCALE = 0.943 / 9.088; // models.js: source units -> metres
// Mounts are in metres already; sockets are in source units.
const baseX = (config, slot) => config.mounts?.find(m => m[0] === slot)?.[2][0] ?? config.sockets.find(s => s[0] === slot)[2][0] * SCALE;
function itemsFor(config, build, offsets = {}) {
  return Object.entries(RAIL_OF)
    .filter(([slot]) => config.slots[slot]?.rail)
    .map(([slot, rail]) => {
      const conf = config.slots[slot],
        lib = SLOTS.find(s => s.id === slot).library;
      const options = [
        ...conf.factory,
        ...conf.library.map(e => {
          const o = typeof e === 'string' ? {id: e} : e;
          return {...lib.find(l => l.id === o.id), ...o};
        }),
      ];
      const option = options.find(o => o.id === build[slot]);
      return {
        slot,
        rail,
        baseX: baseX(config, slot),
        offset: offsets[slot] || 0,
        fp: option.fp || [0, 0],
        travel: conf.rail,
        options,
      };
    });
}
const optionsOf = (config, slot) =>
  itemsFor(config, Object.fromEntries(Object.keys(RAIL_OF).map(s => [s, config.slots[s]?.factory[0].id])))
    .find(i => i.slot === slot)
    .options.map(o => o.id);

for (const [rifleId, config] of Object.entries(MODELS)) {
  const slots = Object.keys(RAIL_OF).filter(s => config.slots[s]?.rail);
  const rails = [...new Set(slots.map(s => RAIL_OF[s]))];

  test(`[${rifleId}] every railed slot has a socket, a footprint on every option, and sane travel`, () => {
    for (const slot of slots) {
      assert.ok(config.sockets.some(s => s[0] === slot) || config.mounts?.some(m => m[0] === slot), `${slot}: socket`);
      const t = config.slots[slot].rail;
      assert.ok(t.min <= 0 && t.max >= 0 && t.step > 0 && t.max - t.min <= 0.4, `${slot}: travel`);
      for (const id of optionsOf(config, slot)) {
        const it = itemsFor(config, {...Object.fromEntries(slots.map(s => [s, config.slots[s].factory[0].id])), [slot]: id}).find(
          i => i.slot === slot,
        );
        assert.ok(Array.isArray(it.fp) && it.fp[1] >= it.fp[0], `${slot}/${id}: fp`);
        assert.ok(it.fp[1] - it.fp[0] <= 0.35, `${slot}/${id}: footprint ${it.fp} is longer than any rail`);
      }
    }
  });

  for (const rail of rails) {
    const onRail = slots.filter(s => RAIL_OF[s] === rail);
    if (onRail.length < 2) continue;
    test(`[${rifleId}] ${rail} rail: every option combination resolves without overlap, or is provably impossible`, () => {
      let combos = [{}];
      for (const slot of onRail) combos = combos.flatMap(c => optionsOf(config, slot).map(o => ({...c, [slot]: o})));
      const base = Object.fromEntries(slots.map(s => [s, config.slots[s].factory[0].id]));
      let resolved = 0,
        impossible = 0;
      for (const combo of combos) {
        // place the options one after another, each time asking resolve() to find room
        let offsets = {};
        let ok = true;
        for (const slot of onRail) {
          const build = {...base, ...Object.fromEntries(onRail.slice(0, onRail.indexOf(slot) + 1).map(s => [s, combo[s]]))};
          const items = itemsFor(config, build, offsets);
          const r = resolve(items, slot, items.find(i => i.slot === slot).fp, offsets[slot] || 0);
          if (!r.ok) {
            ok = false;
            break;
          }
          offsets = {...offsets, ...r.offsets};
        }
        const full = itemsFor(config, {...base, ...combo}, offsets);
        if (ok) {
          resolved++;
          for (const a of full)
            for (const b of full)
              assert.ok(!clash(a, b), `${JSON.stringify(combo)}: ${a.slot} ${span(a)} clashes with ${b.slot} ${span(b)}`);
          for (const it of full)
            assert.ok(
              it.offset >= it.travel.min - 1e-9 && it.offset <= it.travel.max + 1e-9,
              `${it.slot} offset ${it.offset} outside travel`,
            );
        } else {
          impossible++; // brute force: no pair of offsets on the step grids avoids a clash
          const grids = full.map(i => candidates(i.travel, 0));
          const anyFree = grids[0].some(o0 =>
            (grids[1] || [0]).some(o1 => {
              const t = full.map((i, k) => ({...i, offset: [o0, o1][k]}));
              return t.every(a => t.every(b => !clash(a, b)));
            }),
          );
          assert.ok(!anyFree, `${JSON.stringify(combo)} was reported impossible but a free placement exists`);
        }
      }
      assert.ok(resolved > 0 && resolved + impossible === combos.length);
    });
  }
}

test('AK-74M: a 4x scope pushes the back-up sight forward instead of overlapping it', () => {
  const config = MODELS.ak74m,
    base = {optic: 'reddot', buis: 'flip', foregrip: 'rk1', side: 'none'};
  const items = itemsFor(config, base);
  const r = resolve(itemsFor(config, {...base, optic: 'scope'}), 'optic', [-0.155, 0.151], 0);
  assert.ok(r.ok && r.moved.includes('buis'), JSON.stringify(r));
  assert.ok(r.offsets.buis > 0.04, `back-up sight slid to ${r.offsets.buis}`);
  assert.equal(items.length >= 3, true);
});

test('stepper: a part cannot be slid into its neighbour', () => {
  const config = MODELS.ak74m,
    items = itemsFor(config, {optic: 'scope', buis: 'flip', foregrip: 'rk1', side: 'none'}, {buis: 0.1});
  assert.equal(fits(items, 'buis', 0.1), true);
  assert.equal(fits(items, 'buis', 0.0), false, 'too close to the scope');
  assert.equal(fits(items, 'buis', 0.5), false, 'outside travel');
});

test('parts on different rails never conflict, empty slots never conflict', () => {
  const a = {slot: 'optic', rail: 'top', baseX: 0, offset: 0, fp: [-0.1, 0.1]},
    b = {slot: 'foregrip', rail: 'bottom', baseX: 0, offset: 0, fp: [-0.1, 0.1]},
    c = {slot: 'buis', rail: 'top', baseX: 0, offset: 0, fp: [0, 0]};
  assert.equal(clash(a, b), false);
  assert.equal(clash(a, c), false);
});
