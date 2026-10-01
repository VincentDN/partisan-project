// Weapon loadout codec: legacy hash <-> versioned code, backward compatibility and forward safety.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLegacy, toLegacy, encode, decode, CODE_VERSION} from '../shared/loadout.js';

const HASH = 'rifle=ak15k&muzzle=brake&optic=scope@-20&foregrip=angled@30&stock-finish=fde&handguard-finish=od&wear=35';

test('legacy hash parses to a structured loadout and serialises back identically (stable order)', () => {
  const l = parseLegacy(HASH);
  assert.deepEqual(l, {rifle: 'ak15k', build: {muzzle: 'brake', optic: 'scope', foregrip: 'angled'}, offsets: {optic: -20, foregrip: 30}, finish: {stock: 'fde', handguard: 'od'}, wear: 35});
  assert.deepEqual(parseLegacy(toLegacy(l)), l);
});
test('the default rifle and zero wear are omitted from the legacy form', () => assert.equal(toLegacy({rifle: 'ak74m', build: {muzzle: 'can'}, offsets: {}, finish: {}, wear: 0}), 'muzzle=can'));
test('P1 code round-trips and is URL-safe', () => {
  const l = parseLegacy(HASH), code = encode(l);
  assert.match(code, /^P1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decode(code), l);
  assert.equal(CODE_VERSION, 'P1');
});
test('decode accepts a legacy hash, a hash with #, and a full URL', () => {
  const l = parseLegacy(HASH);
  for (const s of [HASH, '#' + HASH, 'https://vincentdn.github.io/partisan-project/workbench/#' + HASH]) assert.deepEqual(decode(s), l);
});
test('old links from the retired Field/Operator screens still load: the retired keys are dropped', () => {
  const l = decode('#mode=field&pose=aim&rifle=ak15k&muzzle=can&o.headgear=beanie&o.top=jacket');
  assert.deepEqual(l, {rifle: 'ak15k', build: {muzzle: 'can'}, offsets: {}, finish: {}, wear: 0});
});
test('unknown versions, garbage and tampered codes return null instead of throwing', () => {
  for (const bad of ['P9.eyJyIjoiYSJ9', 'P1.%%%', 'P1.', 'nonsense', '', null, undefined, 'P1.' + Buffer.from('{"r":5}').toString('base64url'), 'P1.' + Buffer.from('not json').toString('base64url')]) assert.equal(decode(bad), null, String(bad));
});
test('wear is clamped and offsets rounded', () => {
  assert.equal(parseLegacy('wear=250').wear, 100);
  assert.equal(parseLegacy('wear=-5').wear, 0);
  assert.deepEqual(parseLegacy('optic=scope@12.6').offsets, {optic: 13});
});
test('non-ASCII ids survive the code', () => assert.deepEqual(decode(encode({rifle: 'ak', build: {muzzle: 'brême'}, offsets: {}, finish: {}, wear: 0})).build, {muzzle: 'brême'}));
