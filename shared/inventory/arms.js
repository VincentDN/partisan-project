// What the game's weapons are in the catalogue (WP-S43): every tactical weapon (convoy/weapons.js) and every weapon in
// the band's stash (band/troops.js GEAR) as a real firearm with its calibre, the magazine it is issued with, the
// round it is issued with, and how much ammunition a fighter deploys with (TAC-C-11: 60 rounds for rifles, machine
// guns and marksman rifles, less for shotguns and launchers; nothing loose).

/** id -> {weapon, mag (null: loaded by hand, one at a time), round, start (rounds at deployment)} */
export const ARMS = {
  // convoy/weapons.js
  ak: {weapon: 'kalashnikov-ak-74m-545x39-assault-rifle', mag: 'ak-74-545x39-6l23-30-round-magazine', round: '545x39mm-ps-gs', start: 60},
  pkm: {weapon: 'kalashnikov-pkm-762x54r-machine-gun', mag: 'pk-762x54r-100-round-box', round: '762x54mm-r-lps-gzh', start: 60},
  svd: {weapon: 'svds-762x54r-sniper-rifle', mag: 'svd-762x54r-10-round-magazine', round: '762x54mm-r-lps-gzh', start: 60},
  rpg: {weapon: 'rpg-7-launcher', mag: null, round: 'pg-7v-rocket', start: 3},
  gp: {weapon: 'gp-25-grenade-launcher', mag: null, round: '40mm-vog-25-grenade', start: 4},
  hmg: {weapon: 'dshk-127x108-machine-gun', mag: 'dshk-127x108-50-round-belt-box', round: '127x108mm-b-32', start: 100},
  // band/troops.js GEAR
  ak74: {weapon: 'kalashnikov-ak-74-545x39-assault-rifle', mag: 'ak-74-545x39-6l20-30-round-magazine', round: '545x39mm-ps-gs', start: 60},
  ak74m: {
    weapon: 'kalashnikov-ak-74m-545x39-assault-rifle',
    mag: 'ak-74-545x39-6l23-30-round-magazine',
    round: '545x39mm-ps-gs',
    start: 60,
  },
  ak15k: {weapon: 'kalashnikov-ak-12-545x39-assault-rifle', mag: 'ak-12-545x39-30-round-magazine', round: '545x39mm-ps-gs', start: 60},
  rpk: {weapon: 'rpk-16-545x39-light-machine-gun', mag: 'ak-74-545x39-6l18-45-round-magazine', round: '545x39mm-ps-gs', start: 60},
  hunting: {
    weapon: 'mosin-762x54r-bolt-action-rifle-infantry',
    mag: 'mosin-rifle-762x54r-5-round-magazine',
    round: '762x54mm-r-lps-gzh',
    start: 30,
  },
  mk14: {weapon: 'springfield-armory-m1a-762x51-rifle', mag: 'm1a-762x51-20-round-magazine', round: '762x51mm-m80', start: 60},
  smg: {weapon: 'pp-19-01-vityaz-9x19-submachine-gun', mag: 'pp-19-01-vityaz-9x19-30-round-magazine', round: '9x19mm-pst-gzh', start: 60},
  shotgun: {weapon: 'mp-133-12ga-pump-action-shotgun', mag: 'mp-133-12ga-6-shell-magazine', round: '1270-7mm-buckshot', start: 20},
  atgm: {weapon: 'rpg-7-launcher', mag: null, round: 'pg-7v-rocket', start: 2}, // a stand-in until an ATGM is in the catalogue
};

/** The rig, pockets' kit and grenades a fighter deploys with. */
export const ISSUE = {
  rig: 'csa-chest-rig-black',
  meds: ['army-bandage', 'ai-2-medkit'],
  grenade: 'rgd-5-hand-grenade',
};

/** The arms for a tactical weapon or band gear id (ak for anything unknown). */
export const armsFor = id => ARMS[id] || ARMS.ak;
