// Looks from kit (WP-W17, shared/campaign/looks.js): a class's outfit, and what the kit's Head and Body slots hold on
// top; the mission sprites use them through lookFor (convoy/sprite-art.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {classLook, wornLook, wornFields} from '../shared/campaign/looks.js';
import {TROOPS} from '../band/troops.js';

test('a class has an outfit; a promotion changes it', () => {
  assert.equal(classLook('insurgent').hat, 'Hood');
  assert.deepEqual([classLook('heavy').hat, classLook('heavy').shell], ['AdvancedHelmet', 'PlateArmor']);
  assert.deepEqual(classLook('nobody'), {});
  for (const id of Object.keys(TROOPS)) assert.ok(classLook(id).shell, `${id} has an outfit`);
});

test('what is worn: helmets, vests, plates; a cap is a cap; nothing worn changes nothing', () => {
  assert.equal(wornLook({headwear: {slug: 'ssh-68-steel-helmet'}}).hat, 'SimpleHelmet');
  assert.equal(wornLook({headwear: {slug: '6b47-helmet'}}).hat, 'AdvancedHelmet');
  assert.equal(wornLook({armor: {slug: 'flak-vest'}}).shell, 'FlakVest');
  assert.equal(wornLook({armor: {slug: 'plate-carrier'}}).shell, 'PlateArmor');
  assert.equal(wornLook({headwear: {slug: 'beanie'}}).hat, 'Tuque');
  assert.deepEqual(wornLook({}), {});
  assert.deepEqual(wornLook(null), {});
  assert.deepEqual(wornFields({headwear: {slug: '6b47-helmet'}, armor: {slug: 'flak-vest'}}).sort(), ['hat', 'shell']);
});
