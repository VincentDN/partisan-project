// Rebel Band: the troop tree, the equipment it needs and the starting band. Pure data, read by band/band.js and tests.
//
// A troop type upgrades along set paths (`to`). Each step costs the troop experience (`xp` per soldier, the cost of the
// step out of this tier) and the equipment the new type carries (`needs`, per soldier, taken from the stash). The stash
// starts generous: the band has just raided an army depot.

/** Equipment in the stash. icon: a gun sprite id (assets/sprites/weapons or the set) or a set image path. */
export const GEAR = {
  ak74: {label: 'AK-74', kind: 'weapon', gun: 'set-assault'},
  ak74m: {label: 'AK-74M', kind: 'weapon', gun: 'ak74m'},
  ak15k: {label: 'AK-15K', kind: 'weapon', gun: 'ak15k'},
  rpk: {label: 'RPK', kind: 'weapon', gun: 'rpk'},
  pkm: {label: 'PKM', kind: 'weapon', gun: 'set-lmg'},
  hunting: {label: 'Hunting rifle', kind: 'weapon', gun: 'set-bolt'},
  svd: {label: 'SVD', kind: 'weapon', gun: 'set-sniper'},
  mk14: {label: 'Mk 14 EBR', kind: 'weapon', gun: 'mk14'},
  rpg: {label: 'RPG-7', kind: 'weapon', gun: 'set-rocket'},
  gp25: {label: 'GP-25 launcher', kind: 'attachment', icon: 'Things/Item/Equipment/WeaponRanged/Grenades.png'},
  scope: {label: 'PSO scope', kind: 'attachment', icon: 'Things/Item/Resource/ComponentIndustrial/ComponentIndustrial.png'},
  rockets: {label: 'PG-7 rockets (x3)', kind: 'ammo', icon: 'Things/Projectile/Rocket_Big.png'},
  grenades: {label: 'Grenades (x4)', kind: 'ammo', icon: 'Things/Item/Equipment/WeaponRanged/Grenades.png'},
  rig: {label: 'Chest rig', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/Jacket/Jacket.png'},
  vest: {label: 'Flak vest', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/FlakVest/FlakVest.png'},
  plates: {label: 'Plate carrier', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/PlateArmor/PlateArmor.png'},
  helmet: {label: 'Helmet', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/SimpleHelmet/SimpleHelmet.png'},
  ghillie: {label: 'Hooded cloak', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/Hood/Hood.png'},
  medkit: {label: 'Medical kit', kind: 'gear', icon: 'Things/Item/Health/HealthItem.png'},
  radio: {label: 'Field radio', kind: 'gear', icon: 'Things/Item/Resource/ComponentIndustrial/ComponentIndustrial.png'},
  explosives: {label: 'Demolition charge', kind: 'gear', icon: 'Things/Item/Resource/Chemfuel.png'},
};

// Looks are paper dolls from the placeholder set (convoy/sprite-art.js). gun: the sprite the troop carries.
const civ = {shirt: 'ShirtBasic', shirtColor: '#8a7a5a', shell: 'Jacket', shellColor: '#6b5a38'};

/** Classes, shown as the band's groups (Bannerlord's Infantry / Ranged / Cavalry). */
export const CLASSES = [
  {id: 'line', label: 'Riflemen', roman: 'I'},
  {id: 'heavy', label: 'Heavy weapons', roman: 'II'},
  {id: 'marksman', label: 'Marksmen', roman: 'III'},
  {id: 'support', label: 'Support', roman: 'IV'},
];

/**
 * Troop types. tier 1..4; xp: experience a soldier needs to take any of its upgrades; to: the types it can become;
 * needs: equipment per soldier for becoming this type. look: paper doll; gun: sprite carried.
 */
export const TROOPS = {
  volunteer: {
    label: 'Village Volunteer',
    tier: 1,
    cls: 'line',
    xp: 40,
    to: ['partisan', 'hunter', 'runner'],
    needs: {},
    look: {...civ, hat: 'Tuque', hatColor: '#5a4a3a'},
    gun: 'set-bolt',
    note: 'Farmers and shepherds with whatever they brought. Everyone starts here.',
  },
  partisan: {
    label: 'Partisan',
    tier: 2,
    cls: 'line',
    xp: 80,
    to: ['rifleman', 'grenadier', 'gunner'],
    needs: {ak74: 1, rig: 1},
    look: {...civ, shell: 'Jacket', shellColor: '#5f6e45', hat: 'Hood', hatColor: '#4a5236'},
    gun: 'set-assault',
    note: 'A stolen AK and a chest rig: the backbone of the band.',
  },
  rifleman: {
    label: 'Rifleman',
    tier: 3,
    cls: 'line',
    xp: 150,
    to: ['shock'],
    needs: {ak74m: 1, vest: 1, helmet: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#6c7354', shell: 'FlakVest', shellColor: '#5f6a4a', hat: 'SimpleHelmet', hatColor: '#4f553e'},
    gun: 'ak74m',
    note: 'Trained, armoured, steady under fire.',
  },
  shock: {
    label: 'Shock Trooper',
    tier: 4,
    cls: 'line',
    xp: 0,
    to: [],
    needs: {ak15k: 1, plates: 1},
    look: {
      shirt: 'ShirtBasic',
      shirtColor: '#3d4230',
      shell: 'PlateArmor',
      shellColor: '#3f4535',
      hat: 'AdvancedHelmet',
      hatColor: '#3a3f30',
    },
    gun: 'ak15k',
    note: 'Leads the assault through the gate. Plate carrier, the newest rifle the army lost.',
  },
  grenadier: {
    label: 'Grenadier',
    tier: 3,
    cls: 'heavy',
    xp: 150,
    to: ['breacher'],
    needs: {gp25: 1, grenades: 2, vest: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#6b6a4c', shell: 'FlakVest', shellColor: '#6a6448', hat: 'SimpleHelmet', hatColor: '#555a40'},
    gun: 'ak74m',
    note: 'An under-barrel launcher to flush soldiers out of cover.',
  },
  breacher: {
    label: 'Breacher',
    tier: 4,
    cls: 'heavy',
    xp: 0,
    to: [],
    needs: {rpg: 1, rockets: 2, plates: 1},
    look: {
      shirt: 'ShirtBasic',
      shirtColor: '#4b4a3a',
      shell: 'PlateArmor',
      shellColor: '#4a4838',
      hat: 'AdvancedHelmet',
      hatColor: '#45473a',
    },
    gun: 'set-rocket',
    note: 'An RPG for the MRAP, the gate and the bunker.',
  },
  gunner: {
    label: 'Machine Gunner',
    tier: 3,
    cls: 'heavy',
    xp: 150,
    to: ['heavygunner'],
    needs: {rpk: 1, rig: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#7a6a52', shell: 'Duster', shellColor: '#4d4a3a', hat: 'Tuque', hatColor: '#3d4230'},
    gun: 'rpk',
    note: 'Pins the column down while the riflemen move.',
  },
  heavygunner: {
    label: 'Heavy Gunner',
    tier: 4,
    cls: 'heavy',
    xp: 0,
    to: [],
    needs: {pkm: 1, vest: 1, helmet: 1},
    look: {
      shirt: 'ShirtBasic',
      shirtColor: '#5a5440',
      shell: 'FlakJacket',
      shellColor: '#4c4a3a',
      hat: 'SimpleHelmet',
      hatColor: '#4a4d3a',
    },
    gun: 'set-lmg',
    note: 'A belt-fed PKM and the armour to stay behind it.',
  },
  hunter: {
    label: 'Hunter',
    tier: 2,
    cls: 'marksman',
    xp: 80,
    to: ['sharpshooter'],
    needs: {hunting: 1},
    look: {...civ, shell: 'Parka', shellColor: '#6a5a40', hat: 'CowboyHat', hatColor: '#5a4630'},
    gun: 'set-bolt',
    note: 'Knows the hills and the long shot.',
  },
  sharpshooter: {
    label: 'Sharpshooter',
    tier: 3,
    cls: 'marksman',
    xp: 150,
    to: ['sniper'],
    needs: {svd: 1, scope: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#6e7660', shell: 'Parka', shellColor: '#5d644b', hat: 'Hood', hatColor: '#5d644b'},
    gun: 'set-sniper',
    note: 'An SVD with its scope: picks off officers and radio men.',
  },
  sniper: {
    label: 'Ghost Sniper',
    tier: 4,
    cls: 'marksman',
    xp: 0,
    to: [],
    needs: {mk14: 1, ghillie: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#4f5a3c', shell: 'Cape', shellColor: '#55613f', hat: 'Hood', hatColor: '#4c5737'},
    gun: 'mk14',
    note: 'Unseen until it is too late.',
  },
  runner: {
    label: 'Runner',
    tier: 2,
    cls: 'support',
    xp: 80,
    to: ['medic', 'signaller', 'sapper'],
    needs: {ak74: 1},
    look: {...civ, shell: 'Jacket', shellColor: '#7a6a4a', hat: 'BowlerHat', hatColor: '#3a3428'},
    gun: 'set-smg',
    note: 'Carries word, ammunition and the wounded.',
  },
  medic: {
    label: 'Field Medic',
    tier: 3,
    cls: 'support',
    xp: 0,
    to: [],
    needs: {medkit: 2},
    look: {shirt: 'ShirtBasic', shirtColor: '#c9c4b0', shell: 'Jacket', shellColor: '#6a6a5a', hat: 'Tuque', hatColor: '#8e2b25'},
    gun: 'set-smg',
    note: 'More of the band comes home.',
  },
  signaller: {
    label: 'Signaller',
    tier: 3,
    cls: 'support',
    xp: 0,
    to: [],
    needs: {radio: 1, ak74m: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#6c7354', shell: 'FlakVest', shellColor: '#5f6a4a', hat: 'ReconHelmet', hatColor: '#4f553e'},
    gun: 'ak74m',
    note: 'Listens to the army net. Calls the squads together.',
  },
  sapper: {
    label: 'Sapper',
    tier: 3,
    cls: 'support',
    xp: 0,
    to: [],
    needs: {explosives: 2, vest: 1},
    look: {shirt: 'ShirtBasic', shirtColor: '#5a5440', shell: 'FlakVest', shellColor: '#6a6448', hat: 'SimpleHelmet', hatColor: '#555a40'},
    gun: 'set-assault',
    note: 'Bridges, masts and roads go up when the sapper says.',
  },
};

/** The leader, at the heart of the screen. */
export const LEADER = {
  name: 'Mira "Kestrel" Vlahos',
  level: 7,
  xp: 340,
  next: 500,
  skills: {Leadership: 62, Tactics: 48, Scavenging: 71, Marksmanship: 55},
  look: {
    body: 'Female',
    head: 'Female_Average_Normal',
    hair: 'Ponytails',
    hairColor: '#2b2118',
    skin: '#d9a77e',
    shirt: 'ShirtBasic',
    shirtColor: '#4a4f3a',
    shell: 'Duster',
    shellColor: '#3f3a2c',
    hat: 'none',
  },
  gun: 'ak74m',
};

/** Band size limit from the leader's Leadership. */
export const bandLimit = leader => 40 + Math.floor(leader.skills.Leadership / 2);

/** The band just after the depot raid: {troop id: {count, xp}} where xp is the pool shared by the type's soldiers. */
export const START_BAND = {
  volunteer: {count: 22, xp: 22 * 40 * 0.7},
  partisan: {count: 9, xp: 9 * 80 * 0.6},
  rifleman: {count: 3, xp: 3 * 150 * 0.4},
  gunner: {count: 2, xp: 120},
  hunter: {count: 4, xp: 4 * 80 * 0.8},
  sharpshooter: {count: 1, xp: 60},
  runner: {count: 3, xp: 3 * 80 * 0.7},
  medic: {count: 1, xp: 0},
};

/** The stolen depot stock: generous, so every path can be tried. */
export const START_STASH = {
  ak74: 26,
  ak74m: 14,
  ak15k: 6,
  rpk: 6,
  pkm: 3,
  hunting: 6,
  svd: 5,
  mk14: 2,
  rpg: 4,
  gp25: 8,
  scope: 6,
  rockets: 10,
  grenades: 14,
  rig: 18,
  vest: 12,
  plates: 6,
  helmet: 14,
  ghillie: 3,
  medkit: 10,
  radio: 3,
  explosives: 8,
};

// ---------- rules (pure, tested) ----------
/** Soldiers of `from` ready to take an upgrade: whole multiples of the type's xp cost in its pool, at most its count. */
export function ready(band, from) {
  const t = TROOPS[from],
    b = band[from];
  if (!b || !t.xp || !t.to.length) return 0;
  return Math.min(b.count, Math.floor(b.xp / t.xp));
}
/** How many soldiers can go from `from` to `to` now: ready soldiers, limited by the stash. */
export function canUpgrade(band, stash, from, to) {
  if (!TROOPS[from].to.includes(to)) return 0;
  let n = ready(band, from);
  for (const [item, per] of Object.entries(TROOPS[to].needs)) n = Math.min(n, Math.floor((stash[item] || 0) / per));
  return Math.max(0, n);
}
/** Upgrade n soldiers: moves them, spends their xp and the equipment, returns the new band and stash (inputs untouched). */
export function upgrade(band, stash, from, to, n = 1) {
  n = Math.min(n, canUpgrade(band, stash, from, to));
  if (n <= 0) return {band, stash, n: 0};
  const b = structuredClone(band),
    s = {...stash};
  b[from].count -= n;
  b[from].xp -= n * TROOPS[from].xp;
  if (b[from].count === 0) delete b[from];
  b[to] ??= {count: 0, xp: 0};
  b[to].count += n;
  for (const [item, per] of Object.entries(TROOPS[to].needs)) s[item] -= per * n;
  return {band: b, stash: s, n};
}
/** Soldiers in the band. */
export const bandSize = band => Object.values(band).reduce((s, b) => s + b.count, 0);
