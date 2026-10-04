// The Nokia index explainers: every demo in the menu has its own preview scene and sound loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS} from '../assets/js/items.js';
import {sceneFor} from '../assets/js/previews.js';

test('every on-site demo maps to its own preview scene', () => {
  const scenes = ITEMS.filter(it => it.href && !/^https?:/.test(it.href)).map(sceneFor);
  assert.ok(!scenes.includes('call'), `no fallback scene for a demo: ${scenes}`);
  assert.equal(sceneFor({href: '../convoy/'}), 'tactical');
  assert.equal(sceneFor({href: '../intro/advanced.html'}), 'advanced');
  assert.equal(sceneFor({href: '../operator/?lab#weapon=ak74m'}), 'lab');
});
