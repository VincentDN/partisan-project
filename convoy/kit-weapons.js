// Equipped weapon identities and real rounds: both inventory slots, including two rifles of the same type.
import {ARMS} from '../shared/inventory/arms.js';
import {WEAPONS} from './weapons.js';
import {buildMods} from '../shared/campaign/builds.js';
import {loadedRounds, roundsCarried, reachable} from '../shared/inventory/ammo.js';
import {contents} from '../shared/inventory/grid.js';
export const weaponId = item => Object.keys(ARMS).find(id => WEAPONS[id] && ARMS[id].weapon === item?.slug);
export function weaponItem(kit, unit, wid = unit.weapon) {
  const selected = kit?.[unit.weaponSlot || 'primary'];
  return weaponId(selected) === wid ? selected : [kit?.primary, kit?.secondary].find(w => weaponId(w) === wid);
}
export function syncWeapons(cat, kit, unit, campaign) {
  const primary = weaponId(kit.primary),
    secondary = weaponId(kit.secondary);
  const changed = unit.primaryUid !== kit.primary?.uid;
  if (changed && unit.primaryUid !== undefined) {
    if (unit.build)
      for (const [key, factor] of Object.entries(buildMods(unit.build)))
        if (factor && unit.mods?.[key] !== undefined) unit.mods[key] /= factor;
    unit.build = null;
    unit.gun = undefined;
  }
  unit.primaryUid = kit.primary?.uid;
  const previousArm = kit.armsId;
  kit.armsId = primary || 'hunting';
  const equipped = [primary, secondary].filter(Boolean);
  unit.weapons = [
    ...new Set([
      ...equipped,
      ...(campaign ? [] : unit.weapons.filter(w => w !== previousArm && !(unit.kitWeaponIds || []).includes(w) && !equipped.includes(w))),
    ]),
  ];
  unit.kitWeaponIds = equipped;
  if (!unit.weapons.length) unit.weapons = ['hunting'];
  if (!unit.weapons.includes(unit.weapon) || (changed && unit.weaponSlot !== 'secondary')) unit.weapon = primary || secondary || 'hunting';
  const active = weaponItem(kit, unit);
  if (unit.equippedUid !== active?.uid) {
    unit.reload = 0;
    unit.reloading = null;
    unit.equippedUid = active?.uid;
  }
  if (campaign) {
    unit.mags = {};
    unit.reserve = {};
  }
  for (const w of [kit.primary, kit.secondary, active].filter(Boolean)) {
    const wid = weaponId(w);
    if (!wid) continue;
    unit.mags[wid] = loadedRounds(w);
    unit.reserve[wid] = Math.max(
      0,
      roundsCarried(cat, kit, cat.def(w.slug).calibre) -
        [kit.primary, kit.secondary]
          .filter(x => x && cat.def(x.slug).calibre === cat.def(w.slug).calibre)
          .reduce((n, x) => n + loadedRounds(x), 0),
    );
  }
  if (!equipped.length) unit.mags.hunting = unit.reserve.hunting = 0;
  if (campaign)
    unit.grenades = reachable(kit)
      .flatMap(contents)
      .filter(it => cat.def(it.slug).kind === 'grenade')
      .reduce((n, it) => n + (it.count || 1), 0);
  return unit.mags[unit.weapon] || 0;
}
