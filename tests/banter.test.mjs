// Talk in a mission (convoy/banter.js, convoy/banter-lines.js): while it is quiet the militia (and soldiers the rebels
// can overhear) hold whole conversations in long bubbles, in order, two speakers taking turns; a shot cuts it short;
// barks vary but stay seeded; without the banter the sim says nothing new.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Sim} from '../convoy/sim.js';
import {createBanter, readTime} from '../convoy/banter.js';
import {MILITIA, SOLDIERS, BARKS} from '../convoy/banter-lines.js';

const run = (sim, b, seconds, input = () => ({})) => {
  for (let i = 0; i < seconds * 60 && !sim.outcome; i++) {
    sim.step(1 / 60, input(sim));
    b.update();
  }
};

test('a good set of conversations: two speakers, a few lines each, readable', () => {
  assert.ok(MILITIA.length >= 15 && SOLDIERS.length >= 15);
  for (const c of [...MILITIA, ...SOLDIERS]) {
    assert.ok(c.length >= 3, c[0][1]);
    assert.deepEqual([...new Set(c.map(([w]) => w))].sort(), [0, 1], 'two voices');
    for (const [, t] of c) assert.ok(t.length < 160 && readTime(t) <= 9, t);
  }
  for (const side of Object.values(BARKS)) for (const list of Object.values(side)) assert.ok(list.length >= 2);
});

test('while it is quiet the militia talk: a whole conversation, in order, in long bubbles', () => {
  const sim = new Sim({seed: 3});
  const b = createBanter(sim, 3);
  run(sim, b, 40);
  const chat = sim.callouts.filter(c => c.dur);
  assert.ok(chat.length >= 2, `lines spoken: ${chat.length}`);
  const convo = [...MILITIA, ...SOLDIERS].find(c => c[0][1] === chat[0].text);
  assert.ok(convo, 'the first line opens a conversation');
  for (let i = 1; i < Math.min(chat.length, convo.length); i++) {
    assert.equal(chat[i].text, convo[i][1], 'in order');
    assert.equal(chat[i].id === chat[i - 1].id, convo[i][0] === convo[i - 1][0], 'turns between two speakers');
  }
  assert.ok(
    chat.every(c => c.dur >= 3),
    'long enough to read',
  );
});

test('a shot cuts the talk short; the same seed, the same words', () => {
  const sim = new Sim({seed: 3});
  const b = createBanter(sim, 3);
  for (let i = 0; i < 60 * 40 && !b.talking; i++) {
    sim.step(1 / 60, {});
    b.update();
  }
  assert.ok(b.talking, 'a conversation started');
  const v = sim.vehicles[1];
  for (let i = 0; i < 30; i++) {
    sim.step(1 / 60, {ax: v.x, az: v.z, fire: true});
    b.update();
  }
  assert.equal(b.talking, null, 'the shot ended it');
  const words = seed => {
    const s = new Sim({seed}),
      bb = createBanter(s, seed);
    run(s, bb, 30);
    return s.callouts.map(c => c.text).join('|');
  };
  assert.equal(words(5), words(5));
});

test('barks vary by side and fill in the name', () => {
  const sim = new Sim({seed: 1});
  const army = sim.units.find(u => u.side === 'army'),
    seen = new Set();
  for (let i = 0; i < 40; i++) seen.add(sim.bark(army, 'mateDown', 'Man down!', 'Pvt. Kos'));
  assert.ok(seen.size >= 3, [...seen].join(', '));
  assert.ok([...seen].every(t => !t.includes('{name}')));
  assert.ok([...seen].some(t => t.includes('Pvt. Kos')));
  assert.equal(sim.bark(army, 'nothing', 'Fallback'), 'Fallback');
});
