// Fixed, non-overlapping CM6 mounting positions; the full assembly editor follows in CM8.
export const POUCH_POSITIONS = ['front', 'rear'].flatMap(surface =>
  [0, 2, 4].map((column, i) => ({
    id: `${surface}${i + 1}`,
    surface,
    column,
    label: `${surface === 'front' ? 'Front' : 'Rear'} pouch ${i + 1}`,
  })),
);
export const pouchSlots = () =>
  POUCH_POSITIONS.map(p => ({
    id: p.id,
    label: p.label,
    camera: 'torso',
    default: 'none',
    requiresCarrier: p.surface === 'front' ? 'placard' : 'any',
    options: [
      {id: 'none', label: 'Empty', show: []},
      {id: 'magazine', label: 'Magazine pouch', show: []},
      {id: 'utility', label: 'Utility pouch', show: []},
      {id: 'radio', label: 'Radio + cable', show: []},
    ],
  }));
export function pouchOutfit(state, outfits) {
  const outfit = structuredClone(outfits[state.carrier === 'placard' ? 'placard' : state.carrier === 'light' ? 'light' : 'bare']);
  if (state.carrier === 'none') return outfit;
  for (const p of POUCH_POSITIONS) {
    if (!state[p.id] || state[p.id] === 'none' || (p.surface === 'front' && state.carrier !== 'placard')) continue;
    outfit.instances.push({
      id: p.id,
      itemId: `pouch.${state[p.id]}`,
      parentId: p.surface === 'front' ? 'placard' : 'carrier',
      mount: p.surface,
      cell: [p.column, 0],
    });
  }
  return outfit;
}
