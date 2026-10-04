// Every rifle takes every attachment. A rifle lists what its source model has (sockets, factory parts); this fills in
// the rest: each slot's library grows to the whole shared library (attachments.js), and a slot the rifle has no part
// for gets an empty part so the slot still has a mount. The mount points a source has no socket for are given per rifle
// as `mounts` (metres on the laid-out rifle, see rifle-instance.js). Magazines stay calibre-specific: an AK magazine
// does not go into an M16. Pure data: unit-tested in tests/workbench.test.mjs.

// The whole library per slot, in the order the Build panel shows it.
export const UNIVERSAL = {
  muzzle: ['ak74', 'comp', 'can', 'bare'],
  optic: ['micro', 'holo', 'scope'],
  buis: ['flip'],
  foregrip: ['vertical', 'angled', 'stop', 'bipod', 'gp25'],
  side: ['light', 'laser', 'combo'],
  trigger: ['match'],
  charging: ['ext'],
  sling: ['swivel', 'strap'],
  grip: ['classic'],
  stock: ['none'],
};

const rail = (min, max) => ({min, max, step: 0.01});
// Factory state for a slot the source has no part in.
const BLANK = {
  muzzle: {factory: [{id: 'bare', grams: 0, label: 'Bare', detail: 'Bare threaded muzzle.'}]},
  optic: {
    rail: rail(-0.05, 0.05),
    factory: [{id: 'none', sightHeight: 0.025, fp: [0, 0], label: 'Irons', detail: 'Iron sights; a clamp-on mount takes an optic.'}],
  },
  buis: {rail: rail(-0.06, 0.06), factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'No back-up sight.'}]},
  foregrip: {rail: rail(-0.04, 0.03), factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'Clean forend, no foregrip.'}]},
  side: {rail: rail(-0.04, 0.03), factory: [{id: 'none', fp: [0, 0], label: 'None', detail: 'No side accessory.'}]},
  trigger: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard trigger.'}]},
  charging: {factory: [{id: 'std', label: 'Standard', original: true, detail: 'Standard charging handle.'}]},
  sling: {factory: [{id: 'none', label: 'None', detail: 'No sling fitted.'}]},
};
const PART = {
  muzzle: ['Muzzle device', 'Threaded muzzle.'],
  optic: ['Optic', 'Clamp-on optic mount.'],
  buis: ['Back-up sight', 'Clamp-on back-up sight mount.'],
  foregrip: ['Foregrip', 'Clamp-on rail under the forend.'],
  side: ['Side rail', 'Clamp-on rail on the side of the forend.'],
  trigger: ['Trigger', 'Standard trigger and guard.'],
  charging: ['Charging handle', 'Standard charging handle.'],
  sling: ['Sling', 'Rear sling mount.'],
};

/** Fill in one rifle config (in place) so every slot takes every shared attachment. */
export function complete(config) {
  const has = id => config.sockets.some(s => s[0] === id) || (config.mounts || []).some(m => m[0] === id);
  for (const [slot, all] of Object.entries(UNIVERSAL)) {
    if (config.fixed?.includes(slot)) continue; // e.g. a stock moulded together with the handguard
    let conf = config.slots[slot];
    if (!conf) {
      // grips and stocks only where the source has its own part to swap; the rest wherever there is a mount
      if (!BLANK[slot] || !has(slot)) continue;
      conf = config.slots[slot] = structuredClone(BLANK[slot]);
      conf.library = [];
    }
    if (!config.parts.some(p => p.id === slot) && PART[slot]) {
      const [label, detail] = PART[slot];
      config.parts.push({id: slot, label, detail, nodes: []});
    }
    const ids = new Set([...conf.factory.map(o => o.id), ...conf.library.map(e => (typeof e === 'string' ? e : e.id))]);
    const extra = all.filter(id => !ids.has(id));
    // keep an "off" choice last
    const off = conf.library.filter(e => e === 'none');
    conf.library = [...conf.library.filter(e => e !== 'none'), ...extra, ...off];
  }
  return config;
}
