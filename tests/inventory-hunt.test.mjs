// The inventory hunt (WP-QA5): thousands of random operations on a rebel's kit, a body and a cache (move, place,
// turn, load, unload, reload, fire, eject, merge, use), with the invariants checked after each: every round is
// either still carried somewhere or was fired; every item is in one place; nothing overlaps or hangs off a grid;
// the whole state survives a JSON round trip.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {footprint, placeAt, add, remove, move, contents} from '../shared/inventory/grid.js';
import {loadMag, fire, reload, roundsIn, unloadInto, ejectMag} from '../shared/inventory/ammo.js';
import {createKit, everything} from '../shared/inventory/kit.js';
import {useMed} from '../shared/inventory/meds.js';

const cat = createCatalogue(JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8')));

/** Every 5.45 round anywhere: in magazines, in chambers, loose. */
function rounds(places, weapons) {
  let n = 0;
  const count = it => {
    const d = cat.def(it.slug);
    if (d.kind === 'magazine') n += roundsIn(it);
    if (d.kind === 'ammo') n += it.count;
    if (d.kind === 'weapon' && it.chamber) n += 1;
  };
  for (const w of weapons) {
    count(w);
    if (w.mag) count(w.mag);
  }
  for (const c of places) for (const it of everything(c)) if (!weapons.includes(it)) count(it);
  return n;
}

function invariants(places, weapons, msg) {
  const seen = new Set();
  for (const it of [...weapons, ...weapons.map(w => w.mag), ...places.flatMap(everything)].filter(Boolean)) {
    assert.ok(!seen.has(it.uid), `${msg}: ${it.uid} in two places`);
    seen.add(it.uid);
  }
  for (const c of places)
    for (const g of c.grids) {
      for (const e of g.items) {
        const [w, h] = footprint(cat, e.item);
        assert.ok(e.x >= 0 && e.y >= 0 && e.x + w <= g.w && e.y + h <= g.h, `${msg}: ${e.item.uid} hangs off the grid`);
      }
      for (let i = 0; i < g.items.length; i++)
        for (let j = i + 1; j < g.items.length; j++) {
          const a = g.items[i],
            b = g.items[j],
            [aw, ah] = footprint(cat, a.item),
            [bw, bh] = footprint(cat, b.item);
          assert.ok(
            !(a.x < b.x + bw && b.x < a.x + aw && a.y < b.y + bh && b.y < a.y + ah),
            `${msg}: ${a.item.uid} overlaps ${b.item.uid}`,
          );
        }
    }
  for (const it of places.flatMap(everything)) {
    const d = cat.def(it.slug);
    if (d.kind === 'magazine') assert.ok(roundsIn(it) <= d.capacity, `${msg}: ${it.uid} over capacity`);
    if (d.kind === 'ammo') assert.ok(it.count >= 1 && it.count <= d.stack, `${msg}: ${it.uid} stack of ${it.count}`);
  }
}

for (const seed of [1, 2, 3, 4, 5, 6]) {
  test(`random inventory operations keep every round and every item accounted for (seed ${seed})`, () => {
    let r = seed * 7919;
    const rand = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
    const pick = a => a[Math.floor(rand() * a.length)];
    const kit = createKit(cat, {prefix: `h${seed}-`});
    const me = kit.issue('ak74m');
    me.backpack = kit.make('scav-backpack');
    const body = kit.body('rifleman', seed),
      cache = kit.cache(seed, {calibres: ['ak']});
    const places = [me.rig, me.pockets, me.backpack, body, cache];
    const weapons = [me.primary];
    let fired = 0;
    const did = {};
    const snap = () => JSON.stringify(places) + JSON.stringify(weapons);
    const start = rounds(places, weapons);
    for (let step = 0; step < 1500; step++) {
      const from = pick(places),
        items = contents(from);
      const it = items.length ? pick(items) : null;
      const op = pick(['move', 'place', 'load', 'unload', 'reload', 'fire', 'eject', 'merge', 'use']);
      const before = snap();
      const mags = places.flatMap(everything).filter(x => cat.def(x.slug).kind === 'magazine');
      const stacks = places.flatMap(contents).filter(x => cat.def(x.slug).kind === 'ammo');
      if (op === 'move' && it) move(cat, from, it.uid, pick(places));
      if (op === 'place' && it) {
        const to = pick(places),
          was = remove(from, it.uid);
        const g = Math.floor(rand() * to.grids.length);
        if (!placeAt(cat, to, g, it, Math.floor(rand() * 9), Math.floor(rand() * 7), rand() < 0.5 ? 0 : 1))
          assert.ok(
            placeAt(cat, from, was.g, it, was.x, was.y, it.rot) || placeAt(cat, from, was.g, it, was.x, was.y, it.rot ? 0 : 1),
            'put back',
          );
      }
      if (op === 'load' && mags.length && stacks.length) {
        const s = pick(stacks),
          holder = places.find(c => contents(c).includes(s));
        loadMag(cat, pick(mags), s, 1 + Math.floor(rand() * 40));
        if (s.count <= 0) remove(holder, s.uid);
      }
      if (op === 'unload' && mags.length) unloadInto(cat, pick(mags), places, (slug, n) => kit.make(slug, n));
      if (op === 'reload') {
        const res = reload(cat, me, me.primary);
        if (res.dropped) add(cat, cache, res.dropped) || assert.fail('a dropped magazine found no place');
      }
      if (op === 'fire' && fire(cat, me.primary)) fired++;
      if (op === 'eject') ejectMag(cat, me.primary, [me.rig, me.pockets, me.backpack]);
      if (op === 'merge' && stacks.length > 1) {
        const [a, b] = [pick(stacks), pick(stacks)];
        const d = cat.def(a.slug);
        if (a !== b && a.slug === b.slug && a.count + b.count <= d.stack) {
          a.count += b.count;
          remove(
            places.find(c => contents(c).includes(b)),
            b.uid,
          );
        }
      }
      if (op === 'use' && it && cat.def(it.slug).kind === 'meds' && useMed(cat, it, 30).gone) remove(from, it.uid);
      if (snap() !== before) did[op] = (did[op] || 0) + 1;
      invariants(places, weapons, `seed ${seed} step ${step} (${op})`);
      assert.equal(rounds(places, weapons) + fired, start, `seed ${seed} step ${step} (${op}): rounds created or lost`);
    }
    const copy = JSON.parse(JSON.stringify({places, weapons}));
    assert.deepEqual(copy, JSON.parse(JSON.stringify({places, weapons})), 'serialisable');
    for (const op of ['move', 'place', 'load', 'unload', 'reload', 'fire', 'eject'])
      assert.ok(did[op] > 5, `${op} happened only ${did[op] || 0} times`);
  });
}
