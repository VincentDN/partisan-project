// The grid inventory's forgiving moves (shared/inventory/grid-moves.js): a drop that misses lands in the nearest free
// place, and a quick move loots a body into the kit (a second rifle onto the sling) or puts kit back on the body.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {contents, remove} from '../shared/inventory/grid.js';
import {createKit} from '../shared/inventory/kit.js';
import {placeNear, quickPlace} from '../shared/inventory/grid-moves.js';

const cat = createCatalogue(JSON.parse(fs.readFileSync('wiki/data/items.json', 'utf8')));
const AK = 'kalashnikov-ak-74m-545x39-assault-rifle';

test('a drop on a taken cell lands in the nearest free one', () => {
  const kit = createKit(cat),
    box = kit.place('body', 'Test');
  const a = kit.make('ak-74-545x39-6l23-30-round-magazine'),
    b = kit.make('ak-74-545x39-6l23-30-round-magazine');
  assert.ok(placeNear(cat, box, 0, a, 0, 0));
  assert.ok(placeNear(cat, box, 0, b, 0, 0), 'not refused for a cell already taken');
  const at = box.grids[0].items.find(e => e.item === b);
  assert.ok(at.x + at.y > 0 && at.x + at.y <= 2, `next to it (${at.x}, ${at.y})`);
});

test('a drop into a full pocket goes to a free pocket', () => {
  const r = createKit(cat).issue('ak74m'),
    free = r.pockets.grids.findIndex(g => !g.items.length);
  assert.ok(free >= 0, 'the issue kit leaves a pocket free');
  const full = r.pockets.grids.findIndex(g => g.items.length);
  const item = createKit(cat).make('army-bandage');
  assert.ok(placeNear(cat, r.pockets, full, item, 0, 0));
  assert.ok(contents(r.pockets).includes(item));
});

test('quick moves: a body looted into the kit and back', () => {
  const kit = createKit(cat),
    r = kit.issue('ak74m'),
    body = kit.body('rifleman', 7);
  const rifle = contents(body).find(i => i.slug === AK);
  remove(body, rifle.uid);
  assert.equal(quickPlace(cat, rifle, {kit: r, container: body, toKit: true}), 'the sling');
  assert.equal(r.secondary, rifle);
  for (const it of contents(body).filter(i => cat.def(i.slug).w * cat.def(i.slug).h <= 2)) {
    remove(body, it.uid);
    if (!quickPlace(cat, it, {kit: r, container: body, toKit: true})) assert.fail(`no room for ${it.slug}`);
  }
  const second = kit.make(AK);
  assert.equal(quickPlace(cat, second, {kit: r, container: body, toKit: true}), null, 'no third long gun');
  r.secondary = null;
  assert.equal(quickPlace(cat, rifle, {kit: r, container: body, toKit: false}), 'there');
  assert.ok(contents(body).includes(rifle));
});
