// Equipment Wiki rules: filtering and sorting the catalogue, stat labels, and which placeholder icon an item gets.
// Pure (no DOM), so it is unit-tested.

/** Readable names for the stat keys the importer keeps. */
export const LABELS = {
  caliber: 'Calibre',
  fireRate: 'Rate of fire (rpm)',
  ergonomics: 'Ergonomics',
  recoilVertical: 'Vertical recoil',
  recoilHorizontal: 'Horizontal recoil',
  effectiveDistance: 'Effective range (m)',
  sightingRange: 'Sighting range (m)',
  fireModes: 'Fire modes',
  damage: 'Damage',
  penetrationPower: 'Penetration',
  armorDamage: 'Armour damage (%)',
  fragmentationChance: 'Fragmentation chance',
  initialSpeed: 'Muzzle velocity (m/s)',
  projectileCount: 'Projectiles',
  tracer: 'Tracer',
  stackMaxSize: 'Stack size',
  recoilModifier: 'Recoil modifier',
  accuracyModifier: 'Accuracy modifier',
  capacity: 'Capacity',
  loadModifier: 'Load speed modifier',
  ammoCheckModifier: 'Check speed modifier',
  malfunctionChance: 'Malfunction chance',
  zoom: 'Magnification',
  class: 'Armour class',
  durability: 'Durability',
  ergoPenalty: 'Ergonomics penalty',
  speedPenalty: 'Speed penalty',
  turnPenalty: 'Turn penalty',
  bluntThroughput: 'Blunt throughput',
  material: 'Material',
  zones: 'Protects',
  deafening: 'Deafening',
  blindnessProtection: 'Flash protection',
  distanceModifier: 'Hearing distance',
  ambientVolume: 'Ambient volume',
  distortion: 'Distortion',
  intensity: 'Intensity',
  noiseIntensity: 'Noise',
  hitpoints: 'Hit points',
  maxHealPerUse: 'Max heal per use',
  useTime: 'Use time (s)',
  uses: 'Uses',
  painkillerDuration: 'Painkiller duration (s)',
  cures: 'Treats',
  energy: 'Energy',
  hydration: 'Hydration',
  units: 'Units',
  type: 'Type',
  fuse: 'Fuse (s)',
  minExplosionDistance: 'Min. blast radius (m)',
  maxExplosionDistance: 'Max. blast radius (m)',
  fragments: 'Fragments',
  contusionRadius: 'Contusion radius (m)',
  slashDamage: 'Slash damage',
  stabDamage: 'Stab damage',
  hitRadius: 'Reach',
};

const RARITY_ORDER = {common: 0, uncommon: 1, rare: 2, 'very rare': 3};
/** Is item `it` in category `cat` or anywhere under it? */
export function inCategory(it, cat, cats) {
  if (!cat) return true;
  for (let c = it.cat; c && cats[c]; c = cats[c].parent) if (c === cat) return true;
  return false;
}
/** The list the wiki shows for a state {cat, q, rarity, sort}. */
export function filterItems(items, cats, {cat = null, q = '', rarity = '', sort = 'name'} = {}) {
  const needle = q.trim().toLowerCase();
  const list = items.filter(
    it =>
      inCategory(it, cat, cats) &&
      (!rarity || it.rarity === rarity) &&
      (!needle || it.name.toLowerCase().includes(needle) || it.short.toLowerCase().includes(needle)),
  );
  const by =
    {
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => b.price - a.price || a.name.localeCompare(b.name),
      kg: (a, b) => b.kg - a.kg || a.name.localeCompare(b.name),
      size: (a, b) => b.w * b.h - a.w * a.h || a.name.localeCompare(b.name),
      rarity: (a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name),
    }[sort] || ((a, b) => a.name.localeCompare(b.name));
  return list.sort(by);
}

// ---------- placeholder icons ----------
const H = 'Things/Pawn/Humanlike/Apparel/';
const I = 'Things/Item/';
const ICONS = {
  // guns by their weapon category name (the set's gun sprites)
  'Assault rifles': {gun: 'set-assault'},
  'Assault carbines': {gun: 'set-assault'},
  'Marksman rifles': {gun: 'set-sniper'},
  'Bolt-action rifles': {gun: 'set-bolt'},
  'Machine guns': {gun: 'set-lmg'},
  'Submachine guns': {gun: 'set-smg'},
  Pistols: {gun: 'set-mp'},
  Shotguns: {gun: 'set-shotgun'},
  'Grenade launchers': {gun: 'set-rocket'},
  'Special weapons': {gun: 'set-rocket'},
  // everything else by what it is
  weapon: {gun: 'set-assault'},
  melee: {path: I + 'Equipment/WeaponMelee/Knife.png'},
  grenade: {path: I + 'Equipment/WeaponRanged/Grenades.png'},
  ammo: {path: 'Things/Projectile/Bullet_Big.png'},
  magazine: {path: I + 'Resource/Steel/Steel_a.png'},
  sight: {path: I + 'Resource/ComponentIndustrial/ComponentIndustrial.png'},
  part: {path: I + 'Resource/ComponentIndustrial/ComponentIndustrial.png'},
  armour: {path: H + 'FlakVest/FlakVest.png'},
  helmet: {path: H + 'SimpleHelmet/SimpleHelmet.png'},
  rig: {path: H + 'ReconArmor/ReconArmor.png'},
  backpack: {path: H + 'SmokepopPack/SmokepopPack.png'},
  eyewear: {path: H + 'AdvancedHelmet/AdvancedHelmet.png'},
  headset: {path: H + 'AdvancedHelmet/AdvancedHelmet.png'},
  nightvision: {path: H + 'AdvancedHelmet/AdvancedHelmet.png'},
  container: {path: I + 'Resource/Cloth/Cloth_a.png'},
  medkit: {path: I + 'Health/HealthItem.png'},
  medical: {path: I + 'Resource/Medicine/MedicineIndustrial/MedicineIndustrial_a.png'},
  stimulant: {path: I + 'Resource/Medicine/MedicineIndustrial/MedicineIndustrial_b.png'},
  food: {path: I + 'Meal/SurvivalPack/SurvivalPack_a.png'},
  money: {path: I + 'Resource/Silver/Silver_a.png'},
  info: {path: I + 'Book/Schematic/Schematic.png'},
  barter: {path: I + 'Resource/Steel/Steel_b.png'},
  default: {path: I + 'Resource/ComponentIndustrial/ComponentIndustrial.png'},
};
/** The placeholder icon an item gets: {gun: sprite id} or {path: set image}. Same object for the same choice. */
export function iconFor(it, cats) {
  const cat = cats[it.cat],
    root = cat?.root;
  if (root === 'weapons') return ICONS[cat.name] || ICONS[it.stats?.kind] || ICONS.weapon;
  if (it.stats?.kind && ICONS[it.stats.kind]) return ICONS[it.stats.kind];
  if (root === 'money') return ICONS.money;
  if (root === 'info-items') return ICONS.info;
  if (root === 'barter-items') return ICONS.barter;
  if (root === 'ammo') return ICONS.ammo;
  if (root === 'provisions') return ICONS.food;
  if (root === 'medication') return ICONS.medical;
  return ICONS.default;
}
