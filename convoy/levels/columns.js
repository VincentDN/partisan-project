// A convoy from the campaign map, as the column a convoy level fields (WP-W9): the map's vehicles in their order
// (Humvee -> jeep, MATV -> MRAP with its turret, truck -> truck) and its escort, the soldiers spread over the vehicles
// so the column fields exactly as many as the map shows. The first vehicle carries the leader; there is always a
// radio operator. The ambush start: at the roadblock (the default), or with a charge buried under the stop that
// blows the lead vehicle as it arrives. Pure, deterministic from the seed.
import {lcg} from './util.js';

/** The map's vehicle models as the level's vehicle kinds. */
export const KIND_OF = {humvee: 'jeep', matv: 'mrap', truck: 'truck'};

/** Each kind's body and its crew before the escort is filled in (dimensions match convoy/levels/convoy.js). */
const KINDS = {
  jeep: {w: 4.2, d: 2.2, h: 1.6, hp: 220, gap: 13, seats: 4, crew: ['rifleman', 'rifleman']},
  mrap: {w: 6, d: 2.7, h: 2.8, hp: 520, armoured: true, gap: 12, seats: 5, crew: ['turret', 'marksman', 'rto']},
  truck: {w: 7, d: 2.6, h: 2.8, hp: 300, gap: 14, seats: 10, crew: ['rifleman', 'mg', 'rifleman', 'grenadier']},
};
const RANKS = ['Pvt.', 'Pvt.', 'Pvt.', 'Cpl.'];
const NAMES = [
  'Horvat',
  'Kos',
  'Vidic',
  'Sabo',
  'Radic',
  'Babic',
  'Lenz',
  'Maric',
  'Ulbrich',
  'Juric',
  'Novak',
  'Zupan',
  'Oblak',
  'Mlakar',
  'Turk',
  'Bizjak',
  'Rozman',
  'Leban',
  'Furlan',
  'Kralj',
  'Medved',
  'Kovac',
  'Petek',
  'Vrhovec',
  'Zorman',
  'Bregar',
  'Dolinar',
  'Hribar',
  'Jamnik',
  'Kastelic',
  'Logar',
  'Mavric',
];
/** Extra soldiers, in the order they fill seats: riflemen mostly, a machine gun and a grenadier now and then. */
const EXTRA = ['rifleman', 'rifleman', 'grenadier', 'rifleman', 'mg', 'rifleman', 'marksman'];

/**
 * The column for map vehicles `vehicles` (map model ids) carrying `escort` soldiers. Returns the level's
 * convoy.vehicles list. Ids: the first MRAP is 'mrap' (the level's optional objective), the others by kind and place.
 */
export function buildColumn({vehicles, escort, seed = 1}) {
  const kinds = vehicles.map(v => KIND_OF[v] || 'truck');
  const rnd = lcg(seed * 2654435761 + 7);
  const names = [...NAMES].sort(() => rnd() - 0.5);
  let n = 0;
  const soldier = role => ({
    name: `${role === 'leader' ? 'Sgt.' : RANKS[Math.floor(rnd() * RANKS.length)]} ${names[n++ % names.length]}`,
    role,
  });
  const used = {};
  const out = kinds.map((kind, i) => {
    const K = KINDS[kind];
    const id = kind === 'mrap' && !used.mrap ? 'mrap' : `${kind}-${i + 1}`;
    used[kind] = true;
    const {seats, crew, ...body} = K;
    return {id, kind, ...structuredClone(body), gap: i ? K.gap : 0, crew: crew.map(soldier), seats};
  });
  // the leader rides up front, in a seat that is not the turret's or the radio's
  const seat = out[0].crew.findIndex(c => c.role !== 'turret' && c.role !== 'rto');
  if (seat >= 0) out[0].crew[seat] = soldier('leader');
  else out[0].crew.push(soldier('leader'));
  if (!out.some(v => v.crew.some(c => c.role === 'rto'))) (out.find(v => v.kind === 'truck') || out[0]).crew.push(soldier('rto'));
  // the escort: fill seats round the column (trucks first, they carry the infantry) until the count is met
  const total = () => out.reduce((a, v) => a + v.crew.length, 0);
  const order = [...out].sort((a, b) => b.seats - a.seats);
  for (let i = 0, k = 0; total() < escort && i < 400; i++) {
    const v = order[i % order.length];
    if (v.crew.length < v.seats) v.crew.push(soldier(EXTRA[k++ % EXTRA.length]));
  }
  // too many for the escort: the extra riflemen stay behind (never the leader, the radio or a turret gunner)
  for (let i = out.length - 1; total() > escort && i >= 0; i--)
    while (total() > escort && out[i].crew.length > 1 && out[i].crew.some(c => !['leader', 'rto', 'turret'].includes(c.role)))
      out[i].crew.splice(
        out[i].crew.findLastIndex(c => !['leader', 'rto', 'turret'].includes(c.role)),
        1,
      );
  return out.map(({seats, ...v}) => v);
}

/** A column in words, for the brief: "an MRAP and two trucks". */
export function describeColumn(column) {
  const words = {jeep: ['a jeep', 'jeeps'], mrap: ['an MRAP', 'MRAPs'], truck: ['a truck', 'trucks']};
  const counts = {};
  for (const v of column) counts[v.kind] = (counts[v.kind] || 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) =>
    n === 1 ? words[k][0] : `${['', '', 'two', 'three', 'four'][n] || n} ${words[k][1]}`,
  );
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
}

/** The ambush starts the player can choose on the encounter panel. A charge needs a demolition charge from the stash. */
export const AMBUSHES = {
  roadblock: {label: 'Roadblock', text: 'The column stops at the roadblock under your guns. You open fire when you choose.'},
  charge: {
    label: 'Road charge',
    text: 'A demolition charge buried where the column stops: the lead vehicle goes up as it arrives, and the escort is awake at once.',
    spend: {explosives: 1},
  },
};
