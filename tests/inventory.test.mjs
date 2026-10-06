// The grid inventory (TAC-C-11, WP-S8 and S43): items on grids with rotation and no overlap, single ownership,
// magazines holding real rounds of their calibre, loose stacks, firing from the chamber, reloads that swap real
// magazines, the 60-round starting kit, and what the dead and the caches hold (shared/inventory/*).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalogue, calibreKey} from '../shared/inventory/catalogue.js';
import {fits, placeAt, add, remove, move, contents, footprint} from '../shared/inventory/grid.js';
import {loadMag, unloadMag, popRound, fire, reload, roundsIn, roundsCarried, loadedRounds} from '../shared/inventory/ammo.js';
import {ARMS, ISSUE} from '../shared/inventory/arms.js';
import {createKit, everything} from '../shared/inventory/kit.js';
import {useMed} from '../shared/inventory/meds.js';
import {WEAPONS} from '../convoy/weapons.js';
import {GEAR} from '../band/troops.js';

const cat = createCatalogue(JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8')));
const AK = 'kalashnikov-ak-74m-545x39-assault-rifle',
  MAG = 'ak-74-545x39-6l23-30-round-magazine',
  PS = '545x39mm-ps-gs',
  BP = '545x39mm-bp-gs';

test('calibres read the same from weapons, magazines and rounds', () => {
  assert.equal(calibreKey('9x19PARA'), '9x19');
  assert.equal(calibreKey('12ga'), calibreKey('12g'));
  assert.equal(cat.def(AK).calibre, '545x39');
  assert.equal(cat.def(MAG).calibre, '545x39');
  assert.equal(cat.def(PS).calibre, '545x39');
  assert.ok(cat.roundsFor('545x39').length >= 10, 'real 5.45 round types');
  assert.ok(cat.def(BP).pen > cat.def(PS).pen, 'BP pierces better than PS');
});

test('every weapon in the game is a real firearm with magazines and rounds of its calibre (S43)', () => {
  const ids = [
    ...Object.keys(WEAPONS),
    ...Object.entries(GEAR)
      .filter(([, g]) => g.kind === 'weapon')
      .map(([id]) => id),
  ];
  for (const id of ids) {
    const a = ARMS[id];
    assert.ok(a, `${id} is mapped`);
    const w = cat.def(a.weapon),
      r = cat.def(a.round);
    assert.equal(w.kind, 'weapon', id);
    assert.equal(r.calibre, w.calibre, `${id}: its round fits`);
    if (a.mag) assert.equal(cat.def(a.mag).calibre, w.calibre, `${id}: its magazine fits`);
    assert.ok(cat.roundsFor(w.calibre).length >= 1, `${id}: rounds exist`);
  }
  for (const s of [ISSUE.rig, ...ISSUE.meds, ISSUE.grenade]) assert.ok(cat.has(s), s);
});

test('grids: items cover their footprint, turn on their side, never overlap, and move with single ownership', () => {
  const kit = createKit(cat),
    box = kit.place('cache');
  const rifle = kit.make(AK);
  assert.deepEqual(footprint(cat, rifle), [4, 1]);
  assert.equal(placeAt(cat, box, 0, rifle, 0, 0), true);
  assert.equal(fits(cat, box.grids[0], 1, 1, 3, 0), false, 'the rifle covers four cells');
  assert.equal(placeAt(cat, box, 0, kit.make(MAG), 2, 0), false, 'no overlap');
  const turned = kit.make(AK);
  assert.equal(placeAt(cat, box, 0, turned, 7, 0, 1), true, 'stood on its end');
  assert.deepEqual(footprint(cat, turned), [1, 4]);
  const pockets = kit.place('pockets');
  assert.equal(add(cat, pockets, kit.make(AK)), null, 'a rifle does not go in a pocket');
  const mag = kit.make(MAG);
  assert.ok(add(cat, box, mag));
  const rig = kit.make(ISSUE.rig);
  assert.equal(move(cat, box, mag.uid, rig), true);
  assert.equal(contents(box).includes(mag), false, 'gone from where it was');
  assert.equal(contents(rig).filter(i => i === mag).length, 1, 'in exactly one place');
  assert.equal(move(cat, rig, mag.uid, pockets), false, 'a 1x2 magazine does not fit a 1x1 pocket');
  assert.equal(contents(rig).includes(mag), true, 'a failed move leaves it where it was');
  assert.equal(remove(box, 'nope'), null);
});

test('magazines hold real rounds of their calibre, in order, up to capacity; loose rounds stack', () => {
  const kit = createKit(cat),
    mag = kit.make(MAG);
  const ps = kit.make(PS, 20),
    bp = kit.make(BP, 20);
  assert.equal(loadMag(cat, mag, ps, 20).loaded, 20);
  assert.equal(loadMag(cat, mag, bp).loaded, 10, 'only ten more fit');
  assert.equal(roundsIn(mag), 30);
  assert.equal(bp.count, 10, 'the rest stays in the stack');
  assert.match(loadMag(cat, kit.make('svd-762x54r-10-round-magazine'), kit.make(PS, 5)).reason, /not 762x54r/);
  assert.equal(popRound(mag), BP, 'the last loaded fires first');
  const stacks = unloadMag(cat, mag, (s, n) => kit.make(s, n));
  assert.deepEqual(Object.fromEntries(stacks.map(s => [s.slug, s.count])), {[PS]: 20, [BP]: 9});
  assert.equal(roundsIn(mag), 0);
  assert.equal(kit.make(PS, 500).count, cat.def(PS).stack, 'a stack never passes the stack size');
});

test('the starting kit: 60 rounds and nothing loose; the chambered round fires first', () => {
  const kit = createKit(cat),
    k = kit.issue('ak74m');
  assert.equal(roundsCarried(cat, k, '545x39'), 60, 'sixty rounds');
  assert.equal(loadedRounds(k.primary), 30, 'a full magazine in the rifle (one chambered)');
  assert.equal(k.primary.chamber, PS);
  const loose = [k.rig, k.pockets].flatMap(contents).filter(i => cat.def(i.slug).kind === 'ammo');
  assert.equal(loose.length, 0, 'no loose rounds');
  assert.equal(fire(cat, k.primary).short, 'PS', 'damage and penetration from the round fired');
  for (const id of ['svd', 'pkm', 'rpg', 'shotgun', 'hunting'])
    assert.equal(roundsCarried(cat, kit.issue(id), cat.def(ARMS[id].weapon).calibre), ARMS[id].start, id);
  const grenades = contents(k.pockets).filter(i => cat.def(i.slug).kind === 'grenade' || i.slug === ISSUE.grenade);
  assert.equal(grenades.length, 1);
});

test('firing empties the rifle; a reload swaps real magazines and the old one keeps its rounds', () => {
  const kit = createKit(cat),
    k = kit.issue('ak74m');
  for (let i = 0; i < 25; i++) fire(cat, k.primary);
  const old = k.primary.mag;
  assert.equal(loadedRounds(k.primary), 5);
  assert.equal(reload(cat, k, k.primary).ok, true);
  assert.equal(roundsIn(k.primary.mag) + (k.primary.chamber ? 1 : 0), 31, 'a fresh magazine, and the round still chambered');
  assert.ok(contents(k.rig).includes(old), 'the old magazine went back into the rig');
  assert.equal(roundsIn(old), 4, 'with its four rounds');
  assert.equal(roundsCarried(cat, k, '545x39'), 35, 'nothing created or lost');
  while (fire(cat, k.primary));
  reload(cat, k, k.primary);
  while (fire(cat, k.primary));
  assert.equal(reload(cat, k, k.primary).reason, 'no ammunition for it', 'sixty rounds, then you loot');
  const rpg = kit.issue('rpg');
  assert.ok(fire(cat, rpg.primary));
  assert.equal(fire(cat, rpg.primary), null, 'one rocket at a time');
  assert.equal(reload(cat, rpg, rpg.primary).ok, true, 'the next rocket from the backpack');
});

test('the dead and the caches: rolled once from a seed, scarce, everything in its own place', () => {
  const kit = createKit(cat);
  const a = JSON.stringify(createKit(cat).body('rifleman', 7)),
    b = JSON.stringify(createKit(cat).body('rifleman', 7));
  assert.equal(a, b, 'the same seed, the same body');
  let rounds = 0;
  for (let s = 1; s <= 40; s++) {
    const body = kit.body(['rifleman', 'mg', 'marksman'][s % 3], s);
    const items = everything(body);
    assert.ok(
      items.some(i => cat.def(i.slug).kind === 'weapon'),
      'his weapon',
    );
    rounds += items.reduce((n, i) => n + (i.rounds ? roundsIn(i) : i.count && cat.def(i.slug).kind === 'ammo' ? i.count : 0), 0);
    assert.equal(new Set(items.map(i => i.uid)).size, items.length, 'unique items');
  }
  assert.ok(rounds / 40 < 90, `about ${Math.round(rounds / 40)} rounds a body: scarce`);
  const c = kit.cache(3, {label: 'Armoury'});
  assert.ok(
    everything(c).some(i => cat.def(i.slug).kind === 'ammo'),
    'ammunition in a cache',
  );
  const round = JSON.parse(JSON.stringify(c));
  assert.deepEqual(round, c, 'containers serialise as they are');
});

test('medicine heals from a pool of points and is used up', () => {
  const kit = createKit(cat),
    medkit = kit.make('ai-2-medkit'),
    bandage = kit.make('army-bandage');
  assert.equal(cat.def('ai-2-medkit').kind, 'meds');
  assert.deepEqual(useMed(cat, medkit, 80), {healed: 50, gone: false, why: 'AI-2: 50 healed.'}, 'at most 50 a use');
  assert.equal(useMed(cat, medkit, 80).healed, 50);
  assert.equal(medkit.left, 0);
  assert.equal(useMed(cat, bandage, 0).healed, 0, 'not hurt: nothing used');
  assert.equal(useMed(cat, bandage, 40).healed, 15);
  assert.equal(useMed(cat, bandage, 40).gone, true, 'two uses');
  assert.equal(useMed(cat, kit.make(PS, 3), 10).healed, 0, 'rounds are not medicine');
});
