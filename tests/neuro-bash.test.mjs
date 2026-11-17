// Neuro-Bash proportions and variant selection regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {correctNeuroMagazines} from '../workbench/neuro-magazines.js';
import {MODELS} from '../workbench/models.js';

test('Neuro-Bash keeps magazine seats and width while restoring profile height', () => {
  const root = new T.Group();
  for (const [name, height] of [
    ['mag_25', 0.205],
    ['mag_40', 0.26],
  ]) {
    const geometry = new T.BoxGeometry(0.098, 0.164, 0.027).translate(0.1, -0.032, 0);
    geometry.userData.shared = true;
    const mesh = new T.Mesh(geometry);
    mesh.name = name;
    root.add(mesh);
    geometry.computeBoundingBox();
    const before = geometry.boundingBox.clone();
    correctNeuroMagazines(root);
    const after = mesh.geometry.boundingBox;
    assert.ok(Math.abs(after.max.y - before.max.y) < 1e-7);
    assert.ok(Math.abs(after.max.y - after.min.y - height) < 1e-7);
    assert.equal(after.min.z, before.min.z);
    assert.equal(after.max.z, before.max.z);
    assert.equal(geometry.userData.shared, true);
    assert.equal(mesh.geometry.userData.shared, false);
    root.remove(mesh);
  }
});

test('Neuro-Bash uses real rebuild and mutually exclusive factory magazines/stocks', () => {
  const config = MODELS['stg44-neuro-bash'];
  assert.ok(config.url.endsWith('stg44-2044-b.glb'));
  assert.deepEqual(
    config.slots.magazine.factory.map(o => o.showNodes),
    [['mag_25'], ['mag_40']],
  );
  assert.deepEqual(
    config.slots.stock.factory.map(o => o.showNodes),
    [['stock_fixed'], ['stock_adj_body', 'stock_adj_tube']],
  );
  assert.ok(MODELS['stg44-astra-a']);
  assert.ok(MODELS.stg44);
});

// The same rifle is issuable and assignable in the normal campaign.
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {ARMS} from '../shared/inventory/arms.js';
import {RIFLE_GEAR, rifleLock} from '../shared/campaign/builds.js';
import {START_STASH} from '../band/troops.js';
import {WEAPONS} from '../convoy/weapons.js';
import {AMMO_INDEX} from '../shared/campaign/ammo-index.js';
test('Neuro-Bash campaign inventory and ammunition agree', () => {
  const id = 'stg44-neuro-bash',
    cat = createCatalogue({items: []});
  const arms = ARMS[id],
    weapon = cat.def(arms.weapon),
    mag = cat.def(arms.mag),
    round = cat.def(arms.round);
  assert.equal(weapon.calibre, '792x33');
  assert.equal(mag.calibre, weapon.calibre);
  assert.equal(round.calibre, weapon.calibre);
  assert.equal(mag.capacity, 25);
  assert.equal(WEAPONS[id].mag, 25);
  assert.equal(RIFLE_GEAR[id], id);
  assert.equal(rifleLock({stash: START_STASH}, 'test', id).ok, true);
  assert.deepEqual(AMMO_INDEX[arms.round], ['ammo', '792x33']);
});
