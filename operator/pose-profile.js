// Resolve data-authored rest-pose differences without changing the shared pose definitions.
export function posesForProfile(data, profileId, chain = []) {
  if (!profileId) return data;
  const profile = data.profiles?.[profileId];
  if (!profile) throw new Error(`Unknown pose profile: ${profileId}`);
  if (chain.includes(profileId)) throw new Error('Cyclic pose profile inheritance');
  const result = profile.extends ? posesForProfile(data, profile.extends, [...chain, profileId]) : structuredClone(data);
  if (profile.slung) result.slung = structuredClone(profile.slung);
  result.localBones = profile.localBones || result.localBones || [];
  result.handShapes = {...result.handShapes, ...structuredClone(profile.handShapes || {})};
  for (const [id, pose] of Object.entries(result.poses)) {
    for (const [bone, offset] of Object.entries(profile.offsets || {})) {
      const current = pose.bones[bone] || [0, 0, 0];
      pose.bones[bone] = current.map((v, i) => v + offset[i]);
    }
    const override = profile.poses?.[id];
    if (override) {
      Object.assign(pose.bones, override.bones || {});
      if (override.weapon) pose.weapon = {...pose.weapon, ...override.weapon};
      if (override.lower !== undefined) pose.lower = override.lower;
      if (override.hands) {
        pose.curl = {r: 0, l: 0};
        for (const [side, shape] of Object.entries(override.hands)) {
          for (const [finger, angles] of Object.entries(result.handShapes[shape]))
            angles.forEach(
              (angle, i) => (pose.bones[`${finger}_0${i + 1}_${side}`] = angle.map((v, axis) => (axis === 2 && side === 'l' ? -v : v))),
            );
        }
      }
    }
  }
  return result;
}
