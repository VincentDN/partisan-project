// The sim soak (WP-QA6): long fights on every level and condition, a player who closes in and fires, and watch for
// what short tests miss: units stuck for 20 s (an order or a move they never reach), units standing inside cover,
// and missions with no outcome after ten minutes (an objective nobody can complete).
//   node tests/fuzz/soak.mjs [--minutes 10] [--seeds 3]
import {Sim, inBox} from '../../convoy/sim.js';
import {LEVELS} from '../../convoy/levels/index.js';
import {vary, randomConditions} from '../../convoy/levels/variants.js';

export function soak(id, seed, minutes = 10) {
  let r = (seed * 7907) >>> 0;
  const rand = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  const sim = new Sim({level: vary(LEVELS[id], randomConditions(rand)), seed, difficulty: ['easy', 'normal', 'hard'][seed % 3]});
  const found = [];
  const note = (kind, detail) =>
    found.length < 20 && !found.some(f => f.kind === kind && f.detail.split(' ')[0] === detail.split(' ')[0]) && found.push({kind, detail});
  const track = new Map(); // unit id -> {x, z, since}
  for (let i = 0; i < minutes * 3600 && !sim.outcome; i++) {
    const p = sim.player;
    const foe = sim.units
      .filter(u => u.side === 'army' && u.alive && !u.escaped && u.state !== 'mounted')
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    const d = foe ? Math.hypot(foe.x - p.x, foe.z - p.z) : 0;
    sim.step(
      1 / 60,
      foe
        ? {
            mx: d > 15 ? Math.sign(foe.x - p.x) : 0,
            mz: d > 15 ? Math.sign(foe.z - p.z) : 0,
            fire: d < 40 && rand() < 0.5,
            ax: foe.x,
            az: foe.z,
          }
        : {},
    );
    if (i % 30) continue;
    for (const u of sim.units) {
      if (!u.alive || u.escaped || ['mounted', 'turret'].includes(u.state)) continue;
      const inside = sim.level.cover.find(b => inBox(u.x, u.z, b, -0.1));
      if (inside) note('inside cover', `${u.id} in a ${inside.kind} at (${u.x.toFixed(1)}, ${u.z.toFixed(1)}) t=${sim.time.toFixed(0)}`);
      const t = track.get(u.id);
      // stuck: trying to move (sim.move sets `moving`) the whole time, and getting nowhere; holding still on purpose
      // (an order, a covering bound, waiting to open fire) does not count
      if (!t || !u.moving || !u.moveTo || Math.hypot(u.x - t.x, u.z - t.z) > 0.5) track.set(u.id, {x: u.x, z: u.z, since: sim.time});
      else if (u.moveTo && sim.time - t.since > 20 && u !== p)
        note(
          'stuck',
          `${u.id} (${u.side}, ${u.state}) at (${u.x.toFixed(1)}, ${u.z.toFixed(1)}) wants (${u.moveTo.x.toFixed(1)}, ${u.moveTo.z.toFixed(1)}) for ${(sim.time - t.since).toFixed(0)} s`,
        );
    }
  }
  if (!sim.outcome) {
    const left = sim.units.filter(u => u.side === 'army' && u.alive && !u.escaped);
    note(
      'no outcome',
      `after ${minutes} min: ${left.length} soldiers left (${left.map(u => `${u.id} ${u.state}`).join(', ')}); objectives ${sim.objectives.map(o => `${o.id}:${o.state}`).join(' ')}`,
    );
  }
  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n, d) => (process.argv.includes(n) ? +process.argv[process.argv.indexOf(n) + 1] : d);
  let total = 0;
  for (const id of Object.keys(LEVELS))
    for (let seed = 1; seed <= arg('--seeds', 3); seed++)
      for (const f of soak(id, seed, arg('--minutes', 10))) {
        total++;
        console.log(`${f.kind} · ${id} seed ${seed} · ${f.detail}`);
      }
  console.log(total ? `${total} finding(s)` : 'no findings');
}
