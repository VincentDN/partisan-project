// Shared rebel roster, durability and deterministic clear spawn positions for every authored mission.
export const REBEL_HEALTH = 180;
export const SQUAD_MIN = 6;
export const SQUAD_MAX = 9;
export const NAMES = {
  player: 'Lead rebel',
  mila: 'Mila',
  dragan: 'Dragan',
  ivana: 'Ivana',
  petar: 'Petar',
  lena: 'Lena',
  niko: 'Niko',
  sara: 'Sara',
};
export const DEFAULT_SQUAD = {
  player: 'insurgent',
  mila: 'marksman',
  dragan: 'machinegunner',
  ivana: 'insurgent',
  petar: 'insurgent',
  lena: 'insurgent',
  niko: 'insurgent',
  sara: 'insurgent',
};

/** Preserve authored positions; find clear, spaced positions near the insertion for additional fighters. */
export function squadSpawns(level, ids = Object.keys(DEFAULT_SQUAD)) {
  const placed = [];
  const anchor = level.partisans[0];
  const bounds = level.bounds;
  const clear = (x, z) =>
    x > bounds.minX + 1 &&
    x < bounds.maxX - 1 &&
    z > bounds.minZ + 1 &&
    z < bounds.maxZ - 1 &&
    ![...(level.cover || []), ...(level.targets || [])].some(b => Math.abs(x - b.x) < b.w / 2 + 0.8 && Math.abs(z - b.z) < b.d / 2 + 0.8) &&
    !placed.some(p => Math.hypot(p.x - x, p.z - z) < 1.8);
  for (const id of ids) {
    const authored = level.partisans.find(p => p.id === id);
    if (authored && clear(authored.x, authored.z)) {
      placed.push({...authored});
      continue;
    }
    let found = null;
    for (let ring = 1; ring <= 30 && !found; ring++) {
      for (let step = 0; step < ring * 8; step++) {
        const away = Math.atan2(anchor.z - (bounds.minZ + bounds.maxZ) / 2, anchor.x - (bounds.minX + bounds.maxX) / 2);
        const a = away + ((step % 2 ? 1 : -1) * Math.ceil(step / 2) * Math.PI) / (ring * 8);
        const x = anchor.x + Math.cos(a) * ring * 2.2,
          z = anchor.z + Math.sin(a) * ring * 2.2;
        if (clear(x, z)) {
          found = {id, label: NAMES[id] || id, x, z, facing: anchor.facing || 0};
          break;
        }
      }
    }
    if (!found) throw new Error(`No clear insertion for ${id} in ${level.id}`);
    placed.push(found);
  }
  return placed;
}
