// Rebel Band: the class tree, the abilities each class brings, the equipment it needs and the starting band. Pure data
// and rules, read by band/band.js, band/tree.js and the tests.
//
// Every fighter starts as Village Infantry, becomes a Fighter, then an Insurgent, then takes one of three builds:
// Heavy (firepower and armour), Medium (the line and its specialists) or Light (eyes, range and stealth). From there
// the paths go deep: machine gunners, grenadiers, anti-armour, riflemen, engineers, medics, drone operators, signallers,
// scouts, marksmen and saboteurs, each to a veteran and an elite tier. A step costs the soldier's experience (`xp` of
// the class it leaves) and the equipment the new class carries (`needs`, per soldier, from the stash). Every class has
// its own abilities; a soldier also keeps the abilities of the classes it came through.

/** Equipment in the stash. gun: a gun sprite id; icon: an image path in the placeholder set. */
export const GEAR = {
  ak74: {label: 'AK-74', kind: 'weapon', gun: 'set-assault'},
  ak74m: {label: 'AK-74M', kind: 'weapon', gun: 'ak74m'},
  ak15k: {label: 'AK-15K', kind: 'weapon', gun: 'ak15k'},
  rpk: {label: 'RPK', kind: 'weapon', gun: 'rpk'},
  pkm: {label: 'PKM', kind: 'weapon', gun: 'set-lmg'},
  hunting: {label: 'Hunting rifle', kind: 'weapon', gun: 'set-bolt'},
  svd: {label: 'SVD', kind: 'weapon', gun: 'set-sniper'},
  mk14: {label: 'Mk 14 EBR', kind: 'weapon', gun: 'mk14'},
  smg: {label: 'Submachine gun', kind: 'weapon', gun: 'set-smg'},
  shotgun: {label: 'Shotgun', kind: 'weapon', gun: 'set-shotgun'},
  rpg: {label: 'RPG-7', kind: 'weapon', gun: 'set-rocket'},
  atgm: {label: 'ATGM launcher', kind: 'weapon', icon: 'Things/Item/Equipment/WeaponRanged/DoomsdayLauncher.png'},
  gp25: {label: 'GP-25 launcher', kind: 'attachment', icon: 'Things/Item/Equipment/WeaponRanged/Grenades.png'},
  scope: {label: 'PSO scope', kind: 'attachment', icon: 'Things/Item/Resource/ComponentIndustrial/ComponentIndustrial.png'},
  suppressor: {label: 'Suppressor', kind: 'attachment', icon: 'Things/Item/Resource/Steel/Steel_a.png'},
  bipod: {label: 'Bipod', kind: 'attachment', icon: 'Things/Item/Resource/Steel/Steel_b.png'},
  rockets: {label: 'PG-7 rockets (x3)', kind: 'ammo', icon: 'Things/Projectile/Rocket_Big.png'},
  grenades: {label: 'Grenades (x4)', kind: 'ammo', icon: 'Things/Item/Equipment/WeaponRanged/Grenades.png'},
  smoke: {label: 'Smoke grenades (x4)', kind: 'ammo', icon: 'Things/Item/Equipment/WeaponRanged/SmokeLauncher.png'},
  mines: {label: 'Mines (x3)', kind: 'ammo', icon: 'Things/Item/Resource/Shell/Shell_HighExplosive/Shell_HighExplosive_a.png'},
  explosives: {label: 'Demolition charge', kind: 'ammo', icon: 'Things/Item/Resource/Chemfuel.png'},
  rig: {label: 'Chest rig', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/Jacket/Jacket.png'},
  vest: {label: 'Flak vest', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/FlakVest/FlakVest.png'},
  plates: {label: 'Plate carrier', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/PlateArmor/PlateArmor.png'},
  helmet: {label: 'Helmet', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/SimpleHelmet/SimpleHelmet.png'},
  ghillie: {label: 'Hooded cloak', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/Hood/Hood.png'},
  nvg: {label: 'Night vision', kind: 'gear', icon: 'Things/Pawn/Humanlike/Apparel/AdvancedHelmet/AdvancedHelmet.png'},
  medkit: {label: 'Medical kit', kind: 'gear', icon: 'Things/Item/Health/HealthItem.png'},
  surgical: {label: 'Surgical kit', kind: 'gear', icon: 'Things/Item/Resource/Medicine/MedicineUltratech/MedicineUltratech_a.png'},
  radio: {label: 'Field radio', kind: 'gear', icon: 'Things/Item/Resource/ComponentIndustrial/ComponentIndustrial.png'},
  jammer: {label: 'EW jammer', kind: 'gear', icon: 'Things/Item/Resource/ComponentSpacer/ComponentSpacer.png'},
  tools: {label: 'Engineer tools', kind: 'gear', icon: 'Things/Item/Resource/Steel/Steel_c.png'},
  quad: {label: 'Recon quadcopter', kind: 'drone', icon: 'Things/Item/Resource/ComponentSpacer/ComponentSpacer.png'},
  fpv: {label: 'FPV strike drone', kind: 'drone', icon: 'Things/Item/Resource/ComponentSpacer/ComponentSpacer.png'},
  binoculars: {label: 'Binoculars', kind: 'gear', icon: 'Things/Item/Resource/ComponentIndustrial/ComponentIndustrial.png'},
  designator: {label: 'Laser rangefinder', kind: 'gear', icon: 'Things/Item/Resource/ComponentSpacer/ComponentSpacer.png'},
};

/** The band's groups, Bannerlord's Infantry / Ranged / Cavalry: the common path and the three builds. */
export const CLASSES = [
  {id: 'core', label: 'Common path', roman: 'I', note: 'Every fighter starts here.'},
  {id: 'heavy', label: 'Heavy', roman: 'II', note: 'Firepower and armour: machine guns, grenades, anti-armour.'},
  {id: 'medium', label: 'Medium', roman: 'III', note: 'The line and its specialists: riflemen, engineers, medics, drones, signals.'},
  {id: 'light', label: 'Light', roman: 'IV', note: 'Eyes, range and stealth: scouts, marksmen, saboteurs.'},
];

// Experience to leave a class, by its tier.
const XP = {1: 40, 2: 80, 3: 120, 4: 180, 5: 260, 6: 360, 7: 0};
// Looks (paper dolls from the placeholder set) by build; each class can override.
const LOOK = {
  core: {shirt: 'ShirtBasic', shirtColor: '#8a7a5a', shell: 'Jacket', shellColor: '#6b5a38'},
  heavy: {
    shirt: 'ShirtBasic',
    shirtColor: '#4b4a3a',
    shell: 'PlateArmor',
    shellColor: '#45473a',
    hat: 'AdvancedHelmet',
    hatColor: '#3f4334',
  },
  medium: {shirt: 'ShirtBasic', shirtColor: '#6c7354', shell: 'FlakVest', shellColor: '#5f6a4a', hat: 'SimpleHelmet', hatColor: '#4f553e'},
  light: {shirt: 'ShirtBasic', shirtColor: '#6e7660', shell: 'Parka', shellColor: '#6a5a40', hat: 'Hood', hatColor: '#5d644b'},
};
const P = (name, text) => ({name, kind: 'passive', text});
const A = (name, text) => ({name, kind: 'active', text});

/**
 * The classes. from: the class it comes from; build: core | heavy | medium | light; needs: equipment per soldier to
 * become it; gun: the sprite it carries; look: paper-doll overrides; abilities: what it brings.
 */
const DEFS = {
  // ---------- the common path ----------
  volunteer: {
    label: 'Village Infantry',
    tier: 1,
    build: 'core',
    from: null,
    needs: {},
    gun: 'set-bolt',
    look: {hat: 'Tuque', hatColor: '#5a4a3a'},
    note: 'Farmers and shepherds with whatever they brought. Everyone starts here.',
    abilities: [P('Local knowledge', 'Knows the paths: +10% move speed off-road on home ground.'), P('Hardy', '+10 health.')],
  },
  fighter: {
    label: 'Fighter',
    tier: 2,
    build: 'core',
    from: 'volunteer',
    needs: {ak74: 1},
    gun: 'set-assault',
    look: {shell: 'Jacket', shellColor: '#5f6e45', hat: 'Tuque', hatColor: '#4a5236'},
    note: 'A stolen rifle and the will to use it.',
    abilities: [
      P('Rifle drill', 'Reloads 15% faster.'),
      A('Take cover', 'Drops into the nearest cover in reach; suppression builds 20% slower while in it.'),
    ],
  },
  insurgent: {
    label: 'Insurgent',
    tier: 3,
    build: 'core',
    from: 'fighter',
    needs: {rig: 1},
    gun: 'set-assault',
    look: {shell: 'Jacket', shellColor: '#4f5a3c', hat: 'Hood', hatColor: '#4a5236'},
    note: 'Blooded in ambushes. Ready to specialise.',
    abilities: [
      P('Ambusher', '+20% damage in the first 5 s after the ambush is sprung.'),
      P('Scavenger', 'Loots bodies and crates 30% faster.'),
    ],
  },
  // ---------- builds (tier 4) ----------
  heavy: {
    label: 'Heavy Fighter',
    tier: 4,
    build: 'heavy',
    from: 'insurgent',
    needs: {vest: 1, helmet: 1},
    gun: 'rpk',
    note: 'Carries more, takes more, hits harder.',
    abilities: [P('Pack mule', 'Carries 30% more ammunition and loot.'), P('Armoured', 'Takes 15% less damage; moves 10% slower.')],
  },
  guerrilla: {
    label: 'Guerrilla',
    tier: 4,
    build: 'medium',
    from: 'insurgent',
    needs: {ak74m: 1, vest: 1},
    gun: 'ak74m',
    note: 'The backbone of the band: steady, trained, adaptable.',
    abilities: [
      P('Fire and move', 'No accuracy penalty for the first 2 m of movement.'),
      A('Covering fire', 'Fires a suppressing burst at a point; enemies there are pinned 2 s longer.'),
    ],
  },
  skirmisher: {
    label: 'Skirmisher',
    tier: 4,
    build: 'light',
    from: 'insurgent',
    needs: {smg: 1, binoculars: 1},
    gun: 'set-smg',
    note: 'Fast, quiet and far ahead of the column.',
    abilities: [P('Light foot', '+15% move speed; footsteps 40% quieter.'), P('Keen eyes', 'Sees 20% further.')],
  },
  // ---------- heavy ----------
  machinegunner: {
    label: 'Machine Gunner',
    tier: 5,
    build: 'heavy',
    from: 'heavy',
    needs: {rpk: 1, bipod: 1},
    gun: 'rpk',
    abilities: [
      A('Deploy bipod', 'Set up on cover or prone: recoil -50%, turn speed -60%.'),
      P('Beaten zone', 'Every burst suppresses 30% wider.'),
    ],
  },
  heavygunner: {
    label: 'Heavy Gunner',
    tier: 6,
    build: 'heavy',
    from: 'machinegunner',
    needs: {pkm: 1, plates: 1},
    gun: 'set-lmg',
    look: {hat: 'SimpleHelmet'},
    abilities: [
      P('Belt-fed', '100-round belts; no reload while a loader is within 3 m.'),
      A('Hose down', 'Ten seconds of sustained fire; every enemy in the arc is pinned.'),
    ],
  },
  gunteamleader: {
    label: 'Gun Team Leader',
    tier: 7,
    build: 'heavy',
    from: 'heavygunner',
    needs: {designator: 1, radio: 1},
    gun: 'set-lmg',
    look: {hat: 'ReconHelmet', hatColor: '#3f4334'},
    abilities: [
      A('Fire mission', 'Every machine gun within 30 m fires on the marked point for 6 s.'),
      P('Interlocking fire', 'Machine guns near the leader overlap arcs: +20% suppression for each.'),
    ],
  },
  grenadier: {
    label: 'Grenadier',
    tier: 5,
    build: 'heavy',
    from: 'heavy',
    needs: {gp25: 1, grenades: 2},
    gun: 'ak74m',
    abilities: [
      A('Lob', 'An under-barrel grenade over cover to a point it can see or has been told about.'),
      P('Flush out', 'Enemies within 4 m of a blast leave cover.'),
    ],
  },
  breacher: {
    label: 'Breacher',
    tier: 6,
    build: 'heavy',
    from: 'grenadier',
    needs: {shotgun: 1, explosives: 2},
    gun: 'set-shotgun',
    abilities: [
      A('Breach', 'Blows a door or wall section in 3 s; enemies behind it are stunned for 2 s.'),
      P('Close quarters', '+30% damage within 8 m.'),
    ],
  },
  demolitionist: {
    label: 'Demolitionist',
    tier: 7,
    build: 'heavy',
    from: 'breacher',
    needs: {explosives: 3, mines: 1},
    gun: 'set-shotgun',
    look: {hat: 'WarMask', hatColor: '#3a3a30'},
    abilities: [
      A('Shaped charge', 'Destroys a vehicle, mast or bunker it reaches.'),
      P('Chain reaction', 'Its explosions set off other charges and fuel within 6 m.'),
    ],
  },
  antiarmour: {
    label: 'Anti-Armour Gunner',
    tier: 5,
    build: 'heavy',
    from: 'heavy',
    needs: {rpg: 1, rockets: 2},
    gun: 'set-rocket',
    abilities: [
      A('Rocket', 'An RPG round: heavy damage to vehicles, a blast to infantry.'),
      P('Steady launch', 'No backblast penalty to the next shot when reloaded by an ally.'),
    ],
  },
  tankhunter: {
    label: 'Tank Hunter',
    tier: 6,
    build: 'heavy',
    from: 'antiarmour',
    needs: {rockets: 3, plates: 1},
    gun: 'set-rocket',
    abilities: [
      P('Weak spots', '+50% damage to vehicles from the side or rear.'),
      A('Tandem round', 'A round that ignores a vehicle’s first armour layer.'),
    ],
  },
  atgmteam: {
    label: 'ATGM Team Leader',
    tier: 7,
    build: 'heavy',
    from: 'tankhunter',
    needs: {atgm: 1, designator: 1},
    gun: 'set-rocket',
    look: {hat: 'ReconHelmet', hatColor: '#3f4334'},
    abilities: [
      A('Guided missile', 'A wire-guided missile up to 400 m; follows the target.'),
      P('Ambush position', 'Unseen by vehicles until it fires.'),
    ],
  },
  // ---------- medium ----------
  rifleman: {
    label: 'Rifleman',
    tier: 5,
    build: 'medium',
    from: 'guerrilla',
    needs: {ak74m: 1, helmet: 1},
    gun: 'ak74m',
    abilities: [P('Marksmanship', 'Spread -15% on single shots.'), A('Bound', 'Sprints to the next cover while the squad covers it.')],
  },
  veteran: {
    label: 'Veteran Rifleman',
    tier: 6,
    build: 'medium',
    from: 'rifleman',
    needs: {ak15k: 1, plates: 1},
    gun: 'ak15k',
    abilities: [
      P('Unshakable', 'Suppression wears off twice as fast.'),
      P('Double tap', 'A second shot within 0.3 s of a hit deals +25% damage.'),
    ],
  },
  squadleader: {
    label: 'Squad Leader',
    tier: 7,
    build: 'medium',
    from: 'veteran',
    needs: {radio: 1, designator: 1},
    gun: 'ak15k',
    look: {hat: 'ReconHelmet', hatColor: '#4f553e'},
    abilities: [A('Rally', 'Pinned allies within 20 m recover at once.'), P('Leadership', 'Allies within 20 m reload and aim 10% faster.')],
  },
  shocktrooper: {
    label: 'Shock Trooper',
    tier: 7,
    build: 'medium',
    from: 'veteran',
    needs: {ak15k: 1, grenades: 2, nvg: 1},
    gun: 'ak15k',
    look: {shell: 'PlateArmor', hat: 'AdvancedHelmet', hatColor: '#3a3f30'},
    abilities: [A('Assault', 'Charges a position: suppression ignored for 5 s.'), P('Night fighter', 'Full sight at night.')],
  },
  engineer: {
    label: 'Combat Engineer',
    tier: 5,
    build: 'medium',
    from: 'guerrilla',
    needs: {tools: 1},
    gun: 'set-assault',
    abilities: [A('Dig in', 'Builds a sandbag wall in 6 s.'), A('Clear mines', 'Finds and lifts mines within 6 m.')],
  },
  sapper: {
    label: 'Sapper',
    tier: 6,
    build: 'medium',
    from: 'engineer',
    needs: {mines: 2, explosives: 1},
    gun: 'set-assault',
    abilities: [
      A('Lay mines', 'Plants three mines along a road or path.'),
      A('Improvised charge', 'Wires a charge to a road: it fires under the first vehicle.'),
    ],
  },
  mastersapper: {
    label: 'Master Sapper',
    tier: 7,
    build: 'medium',
    from: 'sapper',
    needs: {mines: 3, explosives: 2, radio: 1},
    gun: 'set-assault',
    look: {hat: 'WarMask', hatColor: '#4f553e'},
    abilities: [
      A('Kill zone', 'Prepares a road over 30 s: mines, charges and a blocking wreck.'),
      P('Remote detonation', 'Fires its charges by radio from any distance.'),
    ],
  },
  fortifier: {
    label: 'Fortifier',
    tier: 6,
    build: 'medium',
    from: 'engineer',
    needs: {tools: 1, vest: 1},
    gun: 'set-assault',
    abilities: [
      A('Bunker', 'Builds a covered firing position in 15 s; holds 3.'),
      P('Repair', 'Repairs vehicles and fieldworks twice as fast.'),
    ],
  },
  medic: {
    label: 'Medic',
    tier: 5,
    build: 'medium',
    from: 'guerrilla',
    needs: {medkit: 2},
    gun: 'set-smg',
    look: {hat: 'Tuque', hatColor: '#8e2b25'},
    abilities: [A('Patch up', 'Stops bleeding and restores 30 health in 4 s.'), A('Drag', 'Pulls a downed ally 10 m into cover.')],
  },
  surgeon: {
    label: 'Field Surgeon',
    tier: 6,
    build: 'medium',
    from: 'medic',
    needs: {surgical: 1, medkit: 2},
    gun: 'set-smg',
    look: {hat: 'Tuque', hatColor: '#8e2b25'},
    abilities: [
      A('Revive', 'Brings a downed ally back to the fight in 8 s.'),
      P('Triage', 'Wounded allies within 15 m lose health 50% slower.'),
    ],
  },
  combatdoctor: {
    label: 'Combat Doctor',
    tier: 7,
    build: 'medium',
    from: 'surgeon',
    needs: {surgical: 2, plates: 1},
    gun: 'ak74m',
    look: {shell: 'PlateArmor', hat: 'Tuque', hatColor: '#8e2b25'},
    abilities: [
      P('Nobody left behind', 'Allies who go down near the doctor survive the mission.'),
      A('Adrenaline', 'An ally fights at full strength for 15 s, then collapses.'),
    ],
  },
  droneop: {
    label: 'Drone Operator',
    tier: 5,
    build: 'medium',
    from: 'guerrilla',
    needs: {quad: 1},
    gun: 'set-smg',
    abilities: [
      A('Recon drone', 'A quadcopter shows every enemy within 40 m of a point for 20 s.'),
      P('Spotter', 'Enemies it has seen are marked for the band for 30 s.'),
    ],
  },
  fpvpilot: {
    label: 'FPV Pilot',
    tier: 6,
    build: 'medium',
    from: 'droneop',
    needs: {fpv: 2},
    gun: 'set-smg',
    abilities: [A('FPV strike', 'Flies a strike drone into a target up to 600 m away.'), P('Fast hands', 'Launches drones 40% faster.')],
  },
  swarmcommander: {
    label: 'Swarm Commander',
    tier: 7,
    build: 'medium',
    from: 'fpvpilot',
    needs: {fpv: 3, jammer: 1},
    gun: 'set-smg',
    look: {hat: 'ReconHelmet', hatColor: '#4f553e'},
    abilities: [A('Swarm', 'Three strike drones at once on up to three targets.'), P('Hardened link', 'Its drones ignore enemy jamming.')],
  },
  overwatchop: {
    label: 'Overwatch Operator',
    tier: 6,
    build: 'medium',
    from: 'droneop',
    needs: {quad: 1, designator: 1},
    gun: 'set-smg',
    abilities: [
      A('Overwatch', 'Keeps a drone over the band for 60 s: no ambush can surprise it.'),
      A('Laser mark', 'Marks a target: allied fire on it +20% accurate.'),
    ],
  },
  signaller: {
    label: 'Signaller',
    tier: 5,
    build: 'medium',
    from: 'guerrilla',
    needs: {radio: 1},
    gun: 'ak74m',
    look: {hat: 'ReconHelmet', hatColor: '#4f553e'},
    abilities: [
      P('Radio net', 'Callouts reach the whole band at once.'),
      A('Listen in', 'Hears army radio within 60 m: their next moves show on the map.'),
    ],
  },
  radioman: {
    label: 'Radio Operator',
    tier: 6,
    build: 'medium',
    from: 'signaller',
    needs: {radio: 1, vest: 1},
    gun: 'ak74m',
    look: {hat: 'ReconHelmet', hatColor: '#4f553e'},
    abilities: [A('Call for help', 'Brings a reserve squad of the band in 60 s.'), P('Relay', 'Doubles the range of every ally’s radio.')],
  },
  ewspecialist: {
    label: 'EW Specialist',
    tier: 7,
    build: 'medium',
    from: 'radioman',
    needs: {jammer: 2},
    gun: 'ak74m',
    look: {hat: 'ReconHelmet', hatColor: '#3a3f30'},
    abilities: [
      A('Jam', 'Army radios and drones within 80 m go dead for 30 s.'),
      A('Spoof', 'Sends a false callout: an enemy squad moves where you want.'),
    ],
  },
  // ---------- light ----------
  scout: {
    label: 'Scout',
    tier: 5,
    build: 'light',
    from: 'skirmisher',
    needs: {binoculars: 1, suppressor: 1},
    gun: 'set-smg',
    abilities: [A('Scout ahead', 'Moves out to a point; everything it sees is reported.'), P('Unseen', 'Enemies notice it 30% later.')],
  },
  recon: {
    label: 'Recon',
    tier: 6,
    build: 'light',
    from: 'scout',
    needs: {nvg: 1, ghillie: 1},
    gun: 'ak74m',
    look: {shell: 'ReconArmor', hat: 'ReconHelmet', hatColor: '#4c5737'},
    abilities: [P('Night eyes', 'Full sight at night.'), A('Mark route', 'Finds the hidden way round a position for the band.')],
  },
  pathfinder: {
    label: 'Pathfinder',
    tier: 7,
    build: 'light',
    from: 'recon',
    needs: {radio: 1, designator: 1},
    gun: 'ak74m',
    look: {shell: 'ReconArmor', hat: 'ReconHelmet', hatColor: '#3f4a32'},
    abilities: [
      A('Lead in', 'The band follows its route unseen until the first shot.'),
      P('Forward observer', 'Its marks reach every ally and every drone.'),
    ],
  },
  ghost: {
    label: 'Ghost',
    tier: 7,
    build: 'light',
    from: 'recon',
    needs: {suppressor: 1, ghillie: 1, nvg: 1},
    gun: 'ak74m',
    look: {shell: 'Cape', shellColor: '#4c5737', hat: 'Hood', hatColor: '#3f4a32'},
    abilities: [
      P('Vanish', 'Breaking line of sight makes the army lose it entirely.'),
      A('Silent kill', 'Takes down an unaware soldier without a sound.'),
    ],
  },
  marksman: {
    label: 'Marksman',
    tier: 5,
    build: 'light',
    from: 'skirmisher',
    needs: {hunting: 1, scope: 1},
    gun: 'set-bolt',
    abilities: [P('Long shot', 'Effective range +30%.'), A('Hold breath', 'The next shot has no spread.')],
  },
  sharpshooter: {
    label: 'Sharpshooter',
    tier: 6,
    build: 'light',
    from: 'marksman',
    needs: {svd: 1, scope: 1},
    gun: 'set-sniper',
    abilities: [
      P('Priority targets', 'Picks officers, radio operators and gunners first: +25% damage to them.'),
      A('Suppressing marksman', 'Each shot pins its target for 3 s.'),
    ],
  },
  sniper: {
    label: 'Ghost Sniper',
    tier: 7,
    build: 'light',
    from: 'sharpshooter',
    needs: {mk14: 1, ghillie: 1, suppressor: 1},
    gun: 'mk14',
    look: {shell: 'Cape', shellColor: '#55613f', hat: 'Hood', hatColor: '#4c5737'},
    abilities: [P('One shot', 'An unaware target dies to one hit.'), P('Hidden shooter', 'Its shots do not give away its position.')],
  },
  countersniper: {
    label: 'Counter-Sniper',
    tier: 7,
    build: 'light',
    from: 'sharpshooter',
    needs: {svd: 1, binoculars: 1, designator: 1},
    gun: 'set-sniper',
    look: {shell: 'Parka', shellColor: '#55613f', hat: 'Hood', hatColor: '#4c5737'},
    abilities: [
      P('Glint', 'Sees enemy scopes and marksmen at any range.'),
      A('Return fire', 'Fires back at an enemy marksman the moment it shoots.'),
    ],
  },
  saboteur: {
    label: 'Saboteur',
    tier: 5,
    build: 'light',
    from: 'skirmisher',
    needs: {explosives: 1, suppressor: 1},
    gun: 'set-smg',
    look: {hat: 'ClothMask', hatColor: '#3a3a30'},
    abilities: [
      A('Sabotage', 'Disables a vehicle, generator or radio mast in 6 s, unheard.'),
      P('Light touch', 'Steals from crates 50% faster and silently.'),
    ],
  },
  infiltrator: {
    label: 'Infiltrator',
    tier: 6,
    build: 'light',
    from: 'saboteur',
    needs: {smoke: 1, nvg: 1},
    gun: 'set-smg',
    look: {hat: 'ClothMask', hatColor: '#2f2f28'},
    abilities: [
      A('Disguise', 'Passes as a soldier until it acts or comes within 5 m.'),
      A('Smoke out', 'Smoke screen across 15 m for 20 s.'),
    ],
  },
  shadow: {
    label: 'Shadow',
    tier: 7,
    build: 'light',
    from: 'infiltrator',
    needs: {explosives: 2, jammer: 1},
    gun: 'set-smg',
    look: {shell: 'Cape', shellColor: '#2f2f28', hat: 'ClothMask', hatColor: '#2a2a24'},
    abilities: [
      A('Behind the lines', 'Starts a mission inside the enemy position, unseen.'),
      A('Cut the wires', 'The army loses its radio net until the alarm is raised.'),
    ],
  },
};

/** The classes, with `to` (the classes each one can become), xp, cls (its group) and a full look. */
export const TROOPS = Object.fromEntries(
  Object.entries(DEFS).map(([id, d]) => [
    id,
    {
      ...d,
      cls: d.build,
      xp: XP[d.tier],
      to: Object.keys(DEFS).filter(k => DEFS[k].from === id),
      look: {...LOOK[d.build], ...d.look},
      note: d.note || d.abilities.map(a => a.name).join(' · '),
    },
  ]),
);
for (const t of Object.values(TROOPS)) if (!t.to.length) t.xp = 0; // the top of a path

/** The classes a soldier came through to reach `id`, from Village Infantry, `id` last. */
export function pathTo(id) {
  const path = [];
  for (let c = id; c; c = TROOPS[c].from) path.unshift(c);
  return path;
}
/** Every ability a soldier of class `id` has: its own and those of the classes it came through (with where from). */
export function abilitiesOf(id) {
  return pathTo(id).flatMap(c => TROOPS[c].abilities.map(a => ({...a, from: c, own: c === id})));
}

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

/** The band just after the depot raid: {class id: {count, xp}}, xp being the pool shared by the class's soldiers. */
export const START_BAND = {
  volunteer: {count: 20, xp: 20 * 40 * 0.7},
  fighter: {count: 10, xp: 10 * 80 * 0.6},
  insurgent: {count: 8, xp: 8 * 120 * 0.6},
  heavy: {count: 2, xp: 2 * 180 * 0.7},
  guerrilla: {count: 4, xp: 4 * 180 * 0.8},
  skirmisher: {count: 2, xp: 2 * 180 * 0.7},
  rifleman: {count: 2, xp: 260},
  machinegunner: {count: 1, xp: 140},
  medic: {count: 1, xp: 100},
  droneop: {count: 1, xp: 200},
  marksman: {count: 1, xp: 120},
};

/** The stolen depot stock: generous, so every path can be tried. */
export const START_STASH = {
  ak74: 26,
  ak74m: 16,
  ak15k: 8,
  rpk: 6,
  pkm: 4,
  hunting: 6,
  svd: 5,
  mk14: 3,
  smg: 10,
  shotgun: 5,
  rpg: 5,
  atgm: 2,
  gp25: 8,
  scope: 8,
  suppressor: 10,
  bipod: 6,
  rockets: 14,
  grenades: 16,
  smoke: 8,
  mines: 12,
  explosives: 14,
  rig: 20,
  vest: 16,
  plates: 10,
  helmet: 16,
  ghillie: 6,
  nvg: 6,
  medkit: 12,
  surgical: 4,
  radio: 6,
  jammer: 4,
  tools: 6,
  quad: 4,
  fpv: 10,
  binoculars: 8,
  designator: 6,
};

// ---------- rules (pure, tested) ----------
/** Soldiers of `from` ready to take a step: whole multiples of the class's xp cost in its pool, at most its count. */
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
