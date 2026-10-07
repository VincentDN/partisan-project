// Golden replays (WP-QA18): a scripted fight per level, its inputs drawn from a seeded stream, so the same build plays
// it the same way every time. The end state is reduced to a digest; tests/replays.test.mjs compares it with
// golden.json. An intended change to the fight (AI, weapons, a level) changes digests: re-record with
//   node tests/replays/replay.mjs --write
// and say in the commit why the fights changed. An optimisation must leave every digest as it is.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Sim} from '../../convoy/sim.js';
import {LEVELS} from '../../convoy/levels/index.js';
import {attachAmmo} from '../../convoy/kit-ammo.js';
import {createCatalogue} from '../../shared/inventory/catalogue.js';

const GOLDEN = new URL('./golden.json', import.meta.url);
export const SECONDS = 90;

/** A seeded input script: walk, aim, fire in bursts, a grenade, a reload, a weapon switch, squad orders. */
function script(sim, seed) {
  let r = (seed * 2654435761) >>> 0 || 1;
  const rand = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  let mx = 0,
    mz = 0;
  return () => {
    const p = sim.player,
      t = sim.time;
    if (rand() < 0.02) [mx, mz] = [Math.round(rand() * 2 - 1), Math.round(rand() * 2 - 1)];
    const foe = sim.units.find(u => u.side === 'army' && u.alive && !u.escaped && u.state !== 'mounted');
    const aim = foe || {x: p.x + 20, z: p.z};
    if (rand() < 0.002)
      sim.order(
        sim.units.filter(u => u.side === 'partisan' && u !== p).map(u => u.id),
        {type: rand() < 0.5 ? 'follow' : 'hold'},
      );
    return {
      mx,
      mz,
      sprint: rand() < 0.1,
      fire: t > 8 && rand() < 0.4,
      grenade: t > 8 && rand() < 0.003,
      reload: rand() < 0.004,
      weapon: rand() < 0.002 ? p.weapons[Math.floor(rand() * p.weapons.length)] : undefined,
      ax: aim.x,
      az: aim.z,
    };
  };
}

let cat = null;
const catalogue = () =>
  (cat ||= createCatalogue(JSON.parse(fs.readFileSync(new URL('../../wiki/data/items.json', import.meta.url), 'utf8'))));

/** Play level `id` for SECONDS (or to its end) and reduce the end state to {digest, summary}. kits: real ammunition. */
export function play(id, seed = 1, {kits = false} = {}) {
  const sim = new Sim({level: id, seed, difficulty: 'normal'});
  const A = kits ? attachAmmo(sim, catalogue(), {seed, army: true}) : null;
  const next = script(sim, seed);
  for (let i = 0; i < SECONDS * 60 && !sim.outcome; i++) {
    sim.step(1 / 60, next());
    A?.scavenge(1 / 60);
  }
  const d = sim.debrief();
  const r3 = v => Math.round(v * 1000) / 1000;
  const state = {
    time: r3(sim.time),
    outcome: d.outcome,
    stats: sim.stats(),
    kills: d.kills,
    objectives: d.objectives.map(o => o.state),
    units: sim.units.map(u => [u.id, r3(u.x), r3(u.z), r3(u.hp), u.alive, u.state]),
    vehicles: sim.vehicles.map(v => [v.id, r3(v.x), r3(v.hp), v.destroyed]),
    said: sim.callouts.map(c => c.text),
  };
  return {
    digest: crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex').slice(0, 16),
    summary: `${d.outcome || 'running'} at ${state.time}s, ${d.kills} down, ${state.stats.partisansAlive} rebels standing`,
  };
}

/** [level, seed, kits] for every recording: each level twice, and two with real ammunition on both sides. */
export const replayIds = () => [
  ...Object.keys(LEVELS).flatMap(id => [1, 2].map(seed => [id, seed, false])),
  ['convoy', 1, true],
  ['compound', 1, true],
];
const key = (id, seed, kits) => `${id}#${seed}${kits ? '+kits' : ''}`;
export {key};
export const golden = () => JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));

if (process.argv.includes('--write')) {
  const out = {};
  for (const [id, seed, kits] of replayIds()) out[key(id, seed, kits)] = play(id, seed, {kits});
  fs.writeFileSync(GOLDEN, JSON.stringify(out, null, 2) + '\n');
  console.log(out);
}
