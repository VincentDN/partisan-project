// Convoy Ambush weapons and enemy roles: pure data, read by the simulation, the AI and the renderer.
//
// cd: seconds between rounds · spread: radians (1 sigma, before suppression and movement) · supp: suppression a near
// miss adds · burst/pause: how the AI fires it · splash: explosive {r, damage} · vehicle: damage to vehicles
// lob: indirect fire that arcs over cover and lands near the aim point · reserve: spare rounds beyond the loaded one
// speed: the projectile's flight speed in m/s (RimWorld-style: rounds are seen in flight, damage lands on arrival)
export const WEAPONS = {
  ak: {
    label: 'AK-74',
    mag: 30,
    reload: 2.2,
    cd: 0.1,
    speed: 45,

    damage: 34,
    spread: 0.02,
    range: 70,
    supp: 0.22,
    burst: [3, 4],
    pause: [0.45, 1.2],
  },
  pkm: {
    label: 'PKM',
    mag: 100,
    reload: 5,
    cd: 0.075,
    speed: 48,

    damage: 34,
    spread: 0.045,
    range: 80,
    supp: 0.34,
    burst: [6, 10],
    pause: [0.5, 1.1],
  },
  svd: {
    label: 'SVD',
    mag: 10,
    reload: 3,
    cd: 0.7,
    speed: 62,

    damage: 80,
    spread: 0.006,
    range: 95,
    supp: 0.3,
    burst: [1, 1],
    pause: [0.9, 1.8],
  },
  rpg: {
    label: 'RPG-7',
    speed: 28,

    mag: 1,
    reserve: 2,
    reload: 3.4,
    cd: 0.6,
    damage: 0,
    splash: {r: 3.6, damage: 120},
    vehicle: 230,
    spread: 0.018,
    range: 80,
    supp: 0.9,
    burst: [1, 1],
    pause: [2, 3],
  },
  gp: {
    label: 'GP-25',
    speed: 16,

    mag: 1,
    reserve: 3,
    reload: 2.4,
    cd: 0.6,
    damage: 0,
    splash: {r: 3, damage: 90},
    vehicle: 30,
    lob: true,
    spread: 0.06,
    range: 55,
    supp: 0.9,
    burst: [1, 1],
    pause: [2, 3],
  },
  hmg: {
    label: 'DShK',
    mag: 150,
    reload: 6,
    cd: 0.1,
    speed: 50,

    damage: 40,
    spread: 0.05,
    range: 100,
    supp: 0.5,
    burst: [5, 8],
    pause: [0.5, 1],
  },
};

// What each army role carries and how it fights. sight: metres; suppressAt: belief confidence needed to fire blind
// (Infinity: never suppresses); share: multiplier on squad callout delay while this soldier is alive.
export const ROLES = {
  leader: {label: 'Squad leader', short: 'SL', weapon: 'ak', sight: 42, suppressAt: 0.3},
  rifleman: {label: 'Rifleman', short: 'RF', weapon: 'ak', sight: 42, suppressAt: 0.3},
  mg: {label: 'Machine gunner', short: 'MG', weapon: 'pkm', sight: 45, suppressAt: 0.2},
  marksman: {label: 'Marksman', short: 'DM', weapon: 'svd', sight: 65, suppressAt: Infinity},
  rto: {label: 'Radio operator', short: 'RTO', weapon: 'ak', sight: 42, suppressAt: 0.35, share: 0.5},
  grenadier: {label: 'Grenadier', short: 'GR', weapon: 'ak', launcher: 'gp', sight: 42, suppressAt: 0.3},
  turret: {label: 'MRAP gunner', short: 'HMG', weapon: 'hmg', sight: 58, suppressAt: 0.25},
};

// Partisans: you switch weapons with 1/2/3; Mila is the marksman, Dragan carries the machine gun.
export const PARTISAN_LOADOUTS = {player: ['ak', 'svd', 'rpg'], mila: ['svd'], dragan: ['pkm']};

// What abilities launch (convoy/abilities.js): never carried, so they have no magazine, sound or sprite of their own
// (the renderer and soundscape fall back to the RPG's for rounds in flight). Same fields as WEAPONS.
export const ORDNANCE = {
  tandem: {label: 'Tandem round', speed: 30, damage: 0, splash: {r: 3.6, damage: 130}, vehicle: 380, spread: 0, range: 80, supp: 0.9},
  atgm: {label: 'Guided missile', speed: 34, damage: 0, splash: {r: 4, damage: 150}, vehicle: 600, spread: 0, range: 130, supp: 1},
  fpv: {label: 'FPV drone', speed: 18, damage: 0, splash: {r: 3.2, damage: 110}, vehicle: 260, spread: 0, range: 150, supp: 1},
  mine: {label: 'Mine', speed: 0, damage: 0, splash: {r: 3.5, damage: 140}, vehicle: 320, spread: 0, range: 0, supp: 1},
};
/** A weapon or a piece of ordnance by id. */
export const munition = id => WEAPONS[id] || ORDNANCE[id];
