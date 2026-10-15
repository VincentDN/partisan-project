// The guns the band assigned in the Weapon Modder, in a mission (WP-W16): each fighter with a build carries it: their
// rifle is drawn as the build's model, and its parts change how they fight (shared/campaign/builds.js PART_EFFECTS:
// a scope or a red dot steadies the aim, a suppressor is heard nearer, a bipod steadies and suppresses).
import {buildMods} from '../shared/campaign/builds.js';

/** Arm the sim's rebels with `builds` ({unit id: build}). */
export function arm(sim, builds = {}) {
  for (const u of sim.units) {
    const b = builds[u.id];
    if (u.side !== 'partisan' || !b) continue;
    u.build = b;
    u.gun = b.rifle; // the Workbench model ids are the sprite guns' ids (assets/sprites/weapons/manifest.json)
    const m = (u.mods = {...(u.mods || {})});
    for (const [k, v] of Object.entries(buildMods(b))) m[k] = (m[k] ?? 1) * v;
  }
}
