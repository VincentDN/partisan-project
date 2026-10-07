// Fuzzing the fights (WP-QA1): random fights over every level, random conditions and difficulty, random movement,
// fire, grenades, weapon switches, squad orders, abilities and loot orders, with real ammunition on both sides; the
// invariants below are checked after every step. Returns the problems found (first of each kind).
//   node tests/fuzz/fuzz.mjs [--seeds 12] [--seconds 150] [--level convoy]
// A short run is part of npm test (tests/fuzz.test.mjs); a long one belongs in a nightly job.
import fs from 'node:fs';
import {Sim} from '../../convoy/sim.js';
import {LEVELS} from '../../convoy/levels/index.js';
import {vary, randomConditions} from '../../convoy/levels/variants.js';
import {attachAmmo} from '../../convoy/kit-ammo.js';
import {createBanter} from '../../convoy/banter.js';
import {useAbility, activesFor} from '../../convoy/abilities.js';
import {createCatalogue} from '../../shared/inventory/catalogue.js';
import {roundsCarried} from '../../shared/inventory/ammo.js';
import {everything} from '../../shared/inventory/kit.js';

let cat = null;
const catalogue = () =>
  (cat ||= createCatalogue(JSON.parse(fs.readFileSync(new URL('../../wiki/data/items.json', import.meta.url), 'utf8'))));

/** The invariants after a step; `note(kind, detail)` records a breach. */
function check(sim, A, note) {
  const B = sim.level.bounds;
  for (const u of sim.units) {
    const at = `${u.id} (${u.side}, ${u.state}) t=${sim.time.toFixed(1)}`;
    if (!Number.isFinite(u.x) || !Number.isFinite(u.z)) note('position not finite', at);
    if (!Number.isFinite(u.hp)) note('health not finite', at);
    if (u.alive && u.hp <= 0) note('alive with no health', at);
    if (u.hp > (u.maxHp ?? 100) + 1e-6) note('healed past full', `${at} ${u.hp}/${u.maxHp ?? 100}`);
    const offMap = u.x < B.minX - 5 || u.x > B.maxX + 5 || u.z < B.minZ - 5 || u.z > B.maxZ + 5;
    if (u.alive && !u.escaped && !['mounted', 'turret'].includes(u.state) && offMap) note('off the map', at);
    for (const w of u.weapons) if (u.mags[w] < 0 || u.reserve[w] < 0) note('negative ammunition', `${at} ${w}`);
    const k = A.kitOf(u);
    if (k && u.alive) {
      const real = roundsCarried(catalogue(), k, catalogue().def(k.primary.slug).calibre);
      if (real !== u.mags[k.armsId] + u.reserve[k.armsId]) note('ammunition counters drift from the kit', `${at} kit ${real}`);
    }
  }
  // every item in exactly one place: bodies, crates, wrecks, piles on the ground, and the kits being carried
  const all = [...A.searched.values(), ...A.drops].flatMap(s => everything(s.container));
  for (const k of Object.values(A.kits))
    if (k) all.push(k.primary, k.primary?.mag, ...[k.rig, k.pockets, k.backpack].filter(Boolean).flatMap(everything));
  const seen = new Set();
  for (const it of all.filter(Boolean)) {
    if (seen.has(it.uid)) note('an item in two places', it.uid);
    seen.add(it.uid);
  }
}

/** One fight: level `id`, seed, seconds; problems go to `note`. hook(sim, A, step) runs after each step (for tests). */
export function fight(id, seed, seconds, note, hook = null) {
  let r = (seed * 9973) >>> 0;
  const rand = () => (r = (Math.imul(r, 1103515245) + 12345) >>> 0) / 4294967296;
  const sim = new Sim({level: vary(LEVELS[id], randomConditions(rand)), seed, difficulty: ['easy', 'normal', 'hard'][seed % 3]});
  const A = attachAmmo(sim, catalogue(), {seed, army: true}),
    talk = createBanter(sim, seed);
  const mates = () => sim.units.filter(u => u.side === 'partisan' && u !== sim.player).map(u => u.id);
  try {
    for (let i = 0; i < seconds * 60 && !sim.outcome; i++) {
      const p = sim.player,
        ax = p.x + (rand() - 0.5) * 80,
        az = p.z + (rand() - 0.5) * 80;
      if (rand() < 0.002) sim.order(mates(), {type: ['follow', 'hold', 'move', 'cover'][Math.floor(rand() * 4)], x: ax, z: az, angle: 1});
      if (rand() < 0.002) {
        const a = activesFor(p.cls)[Math.floor(rand() * 3)];
        if (a?.run) useAbility(sim, p, a.name, {x: ax, z: az});
      }
      if (rand() < 0.001) A.orderLoot(mates(), ax, az);
      sim.step(1 / 60, {
        mx: Math.round(rand() * 2 - 1),
        mz: Math.round(rand() * 2 - 1),
        sprint: rand() < 0.2,
        sneak: rand() < 0.1,
        fire: rand() < 0.3,
        grenade: rand() < 0.002,
        reload: rand() < 0.01,
        interact: rand() < 0.05,
        weapon: rand() < 0.003 ? p.weapons[Math.floor(rand() * p.weapons.length)] : undefined,
        ax,
        az,
      });
      A.scavenge(1 / 60);
      talk.update();
      hook?.(sim, A, i);
      if (i % 6 === 0) check(sim, A, note); // ten times a simulated second
    }
  } catch (e) {
    note('threw', `${e.message} @ ${e.stack.split('\n')[1]?.trim()}`);
  }
}

/** Fuzz {levels, seeds, seconds}: returns [{kind, level, seed, detail}], the first of each kind per level. */
export function fuzz({levels = Object.keys(LEVELS), seeds = 12, seconds = 150} = {}) {
  const found = new Map();
  for (const id of levels)
    for (let seed = 1; seed <= seeds; seed++)
      fight(id, seed, seconds, (kind, detail) => found.has(`${kind}@${id}`) || found.set(`${kind}@${id}`, {kind, level: id, seed, detail}));
  return [...found.values()];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, d) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : d);
  const levels = arg('--level') ? [arg('--level')] : undefined;
  const problems = fuzz({levels, seeds: +arg('--seeds', 12), seconds: +arg('--seconds', 150)});
  for (const p of problems) console.log(`${p.kind} · ${p.level} seed ${p.seed} · ${p.detail}`);
  console.log(problems.length ? `${problems.length} problem(s)` : 'no problems');
  process.exit(problems.length ? 1 : 0);
}
