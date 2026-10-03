// Resolve data-authored rest-pose differences without changing the shared pose definitions.
export function posesForProfile(data, profileId) {
  if (!profileId) return data;
  const profile = data.profiles?.[profileId];
  if (!profile) throw new Error(`Unknown pose profile: ${profileId}`);
  const result = structuredClone(data);
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
    }
  }
  return result;
}
