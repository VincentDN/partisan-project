// Apply a snapshotted campaign response: exact hunter rosters and stronger specialist equipment, without extra garrison troops.
import {responseTier} from '../../shared/campaign/response.js';
export function applyResponse(L, {tier = 0, hunters = null} = {}) {
  const r = responseTier(tier);
  L.response = {...r};
  // Reuse authored waves/approaches, including cave vehicles, while matching the strategic column exactly.
  if (Number.isInteger(hunters) && hunters > 0) {
    const squads = (L.waves || []).flatMap(w => w.squads);
    const fixed =
      (L.units?.length || 0) +
      (L.reinforcements?.units.length || 0) +
      (L.waves || []).reduce((n, w) => n + (w.vehicle?.crew.length || 0), 0);
    const original = squads.reduce((n, s) => n + s.units.length, 0),
      want = Math.max(0, Math.min(64, hunters) - fixed);
    let used = 0;
    squads.forEach((s, i) => {
      const defs = s.units,
        n = i === squads.length - 1 ? want - used : Math.floor((want * defs.length) / original);
      used += n;
      s.units = Array.from({length: n}, (_, j) => {
        const u = structuredClone(defs[j % defs.length]);
        if (j >= defs.length) {
          u.name = `Reinforcement ${i + 1}-${j + 1}`;
          u.z += Math.floor(j / defs.length) * 1.2;
        }
        return u;
      });
    });
    L.hunters = hunters;
  }
  if (!r.tier) return;
  const units = [
    ...(L.units || []),
    ...(L.reinforcements?.units || []),
    ...(L.convoy?.vehicles || []).flatMap(v => v.crew),
    ...(L.waves || []).flatMap(w => [...w.squads.flatMap(s => s.units), ...(w.vehicle?.crew || [])]),
  ];
  let i = 0;
  for (const u of units) {
    if (u.role !== 'rifleman' || u.group?.startsWith('settlement-militia')) continue;
    const slot = i++ % 8;
    if (slot === 0) u.role = r.tier >= 2 ? 'mg' : 'grenadier';
    if (slot === 4) u.role = r.tier >= 3 ? 'marksman' : 'grenadier';
  }
  L.brief += ` Occupation response: ${r.label}. Enemy reactions and specialist equipment reflect tier ${r.tier}.`;
}
