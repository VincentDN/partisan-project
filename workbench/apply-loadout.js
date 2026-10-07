// Apply a decoded loadout (shared/loadout.js) to a loaded rifle instance, with the same rule fix-ups as the
// Workbench's restore(): unknown options fall back to the rifle's default, blocked combinations are repaired.
// Used by the Workbench-independent consumers (the Operator Customiser's carried rifle).
import {installCamo, applyFinishState} from './rifle-finishes.js';
import {applySlotState} from './rifle-instance.js';
import {blockedBy} from './stats.js';

export const emptyLoadout = rifle => ({rifle, build: {}, offsets: {}, finish: {}, wear: 0});

export function applyLoadout(rifle, l, wearUniform = {value: 0}) {
  const defaults = rifle.config.defaults || {};
  const defaultOption = slot => {
    const id = defaults.build?.[slot.spec.id];
    return slot.options.some(o => o.id === id) ? id : slot.options[0].id;
  };
  for (const slot of Object.values(rifle.slots)) {
    const id = slot.spec.id,
      want = l.build[id];
    rifle.build[id] = slot.options.some(o => o.id === want) ? want : defaultOption(slot);
  }
  for (const slot of Object.values(rifle.slots)) {
    // repair blocked combinations (old or hand-edited codes)
    const id = slot.spec.id;
    if (blockedBy(rifle.build, id, rifle.build[id]))
      rifle.build[id] = [defaultOption(slot), ...slot.options.map(o => o.id)].find(o => !blockedBy(rifle.build, id, o));
  }
  for (const slot of Object.values(rifle.slots)) {
    const id = slot.spec.id,
      rail = slot.rail,
      mm = l.offsets[id] || 0;
    const offset = rail ? Math.min(rail.max, Math.max(rail.min, mm / 1000)) : 0;
    slot.offset = 0;
    applySlotState(rifle, id, rifle.build[id], offset);
  }
  wearUniform.value = Math.min(100, Math.max(0, l.wear || 0)) / 100;
  for (const t of rifle.finishTargets) applyFinishState(rifle, t.id, l.finish[t.id] ?? defaults.finish?.[t.id] ?? 'original');
  return rifle;
}
export {installCamo};

