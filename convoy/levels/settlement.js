// Campaign settlements field their saved garrison and militia, with bounded active reserves and explicit raid/capture objectives.
export const ACTIVE_DEFENDERS = 24;
const count = n => Math.max(0, Math.min(1000, Math.floor(Number(n) || 0)));
export function settlementAssault(L, {garrison, militia, name, kind, intent = 'capture'}) {
  const regular = count(garrison),
    local = count(militia),
    total = regular + local;
  L.settlement = {garrison: regular, militia: local, intent};
  const blocks = [...(L.cover || []), ...(L.targets || [])];
  const clear = (x, z) => !blocks.some(b => Math.abs(x - b.x) < b.w / 2 + 0.8 && Math.abs(z - b.z) < b.d / 2 + 0.8);
  const seats = [];
  for (let z = -22; z <= 24; z += 3) for (let x = -28; x <= 28; x += 3) if (clear(x, z)) seats.push({x, z});
  if (!seats.length) throw new Error('Settlement has no clear defender positions');
  const make = i => {
    const isMilitia = i >= regular,
      n = isMilitia ? i - regular : i;
    return {
      ...seats[(i * 17) % seats.length],
      name: `${isMilitia ? 'Militia' : 'Garrison'} ${n + 1}`,
      role: isMilitia ? 'rifleman' : n % 12 === 0 ? 'leader' : n % 12 === 1 ? 'rto' : n % 6 === 0 ? 'mg' : 'rifleman',
      group: isMilitia ? 'settlement-militia' : 'settlement-garrison',
      facing: Math.PI / 2,
    };
  };
  const all = Array.from({length: total}, (_, i) => make(i));
  L.units = all.slice(0, ACTIVE_DEFENDERS);
  L.reinforcements = null;
  L.waves = [];
  for (let i = ACTIVE_DEFENDERS; i < total; i += 12) {
    const batch = all.slice(i, i + 12);
    L.waves.push({
      at: 0,
      reserve: true,
      activeLimit: ACTIVE_DEFENDERS,
      text: 'Settlement reserves are joining the defence!',
      squads: ['settlement-garrison', 'settlement-militia']
        .map(group => ({group: `${group}-${i}`, goal: {x: 0, z: 0}, units: batch.filter(u => u.group === group)}))
        .filter(s => s.units.length),
    });
  }
  L.objectives = L.objectives.filter(o => o.type !== 'eliminate');
  for (const o of L.objectives) if (o.target === 'mast') o.label = 'Disable the radio mast';
  if (intent === 'capture') {
    L.objectives.unshift({
      id: 'garrison',
      type: 'eliminate',
      routs: true,
      reserves: true,
      label: 'Break the garrison and militia, including reserves',
    });
    for (const o of L.objectives) if (o.type === 'extract') o.after = [...(o.after || []), 'garrison'];
  }
  L.title = `${name}: ${intent === 'capture' ? 'liberation assault' : 'supply raid'}`;
  L.brief =
    `${name} (${kind}): ${regular} garrison and ${local} militia. Up to ${ACTIVE_DEFENDERS} defenders fight at once; reserves respond to the alarm or replace defeated guards. ` +
    (intent === 'capture'
      ? 'Break the entire defence and complete the mission objectives to liberate the settlement. '
      : 'Take supplies and extract; ownership will not change. ') +
    L.brief;
  return L;
}
