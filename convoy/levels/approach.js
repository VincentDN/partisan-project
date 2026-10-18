// Campaign raids gain a covered staging approach; objective geometry and timed defence missions stay intact.
const OFFSETS = {
  roadblock: [-40, 0],
  convoy: [0, -44],
  'forest-road': [0, -40],
  compound: [0, -32],
  checkpoint: [-32, -20],
  village: [-32, 20],
};
export function campaignApproach(level) {
  const offset = OFFSETS[level.id];
  if (!offset || level.approach) return level;
  const [dx, dz] = offset,
    length = Math.hypot(dx, dz),
    start = level.partisans[0];
  const p = level.partisans.map(u => ({...u, x: u.x + dx, z: u.z + dz}));
  const bounds = {...level.bounds};
  for (const u of p) {
    bounds.minX = Math.min(bounds.minX, u.x - 16);
    bounds.maxX = Math.max(bounds.maxX, u.x + 16);
    bounds.minZ = Math.min(bounds.minZ, u.z - 16);
    bounds.maxZ = Math.max(bounds.maxZ, u.z + 16);
  }
  // Keep the middle clear for a full squad. Flanking rocks provide stops along the new approach.
  const cover = [...level.cover];
  for (const progress of [0.35, 0.7]) {
    for (const side of [-1, 1]) {
      const rock = {
        x: start.x + dx * progress - (dz / length) * side * 7,
        z: start.z + dz * progress + (dx / length) * side * 7,
        w: 3,
        d: 2.5,
        h: 1.8,
        kind: 'rock',
      };
      // Never place a new obstacle over authored cover, starting positions or objective interactions.
      const overlaps = b => Math.abs(b.x - rock.x) < (b.w + rock.w) / 2 + 2 && Math.abs(b.z - rock.z) < (b.d + rock.d) / 2 + 2;
      const protectedAreas = [...cover, ...(level.targets || []), ...(level.objectives || []).map(o => o.zone).filter(Boolean)];
      if (protectedAreas.some(overlaps) || [...p, ...(level.items || [])].some(u => Math.hypot(u.x - rock.x, u.z - rock.z) < 4)) continue;
      cover.push(rock);
    }
  }
  return {
    ...level,
    bounds,
    cover,
    partisans: p,
    approach: {distance: length, rally: {x: start.x, z: start.z}},
    brief: `Approach on foot from the staging area, roughly ${Math.round(length)} metres behind the usual attack line. Use the rocks on either side to advance and regroup. ${level.brief}`,
  };
}
