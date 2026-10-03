// Partisan Tactical, 2.5-D sprite view: the art. Everything comes from the owner's RimWorld-style placeholder set
// (inbound/Placeholder Assets, PSDs flattened to PNG by outbound/flatten-psd.py). This module loads the images, tints the
// grey layers, and assembles paper-doll pawns (body, clothes, head, hair, headgear) for the three drawn directions.

const BASE = new URL('../inbound/Placeholder%20Assets/', import.meta.url).href;
const H = 'Things/Pawn/Humanlike/';

// Every file the view uses, by short name.
export const FILES = {
  // terrain
  soil: 'Terrain/Surfaces/Soil.png',
  soilRich: 'Terrain/Surfaces/SoilRich.png',
  mossy: 'Terrain/Surfaces/Mossy.png',
  dirt: 'Terrain/Surfaces/PackedDirt.png',
  gravel: 'Terrain/Surfaces/Gravel.png',
  asphalt: 'Terrain/Surfaces/BrokenAsphalt.png',
  rockFloor: 'Terrain/Surfaces/RoughHewnRock.png',
  woodFloor: 'Terrain/Surfaces/WoodFloor.png',
  smearA: 'Terrain/Scatter/DirtSmearA.png',
  smearB: 'Terrain/Scatter/DirtSmearB.png',
  debrisA: 'Terrain/Scatter/DebrisStoneA.png',
  // plants and stones
  grassA: 'Things/Plant/Grass/GrassA.png',
  grassB: 'Things/Plant/Grass/GrassB.png',
  bushA: 'Things/Plant/Bush/BushA.png',
  bushB: 'Things/Plant/Bush/BushB.png',
  treeOakA: 'Things/Plant/TreeOak/TreeOakA.png',
  treeOakB: 'Things/Plant/TreeOak/TreeOakB.png',
  treePine: 'Things/Plant/TreePine/TreePineA.png',
  rockA: 'Things/Item/Chunk/ChunkStone/RockLowA.png',
  rockB: 'Things/Item/Chunk/ChunkStone/RockLowB.png',
  rockC: 'Things/Item/Chunk/ChunkStone/RockLowC.png',
  log: 'Things/Item/Resource/WoodLog/WoodLog_a.png',
  // structures (4 x 4 link atlases) and props
  sandbags: 'Things/Building/Linked/Sandbags_Atlas.png',
  bricks: 'Things/Building/Linked/Wall/Wall_Atlas_Bricks.png',
  planks: 'Things/Building/Linked/Wall/Wall_Atlas_Planks.png',
  smooth: 'Things/Building/Linked/Wall/Wall_Atlas_Smooth.png',
  crate: 'Things/Building/Ruins/AncientCrate/CrateA.png',
  carWreck: 'Things/Building/Ruins/RustedCars/RustedCarA_east.png',
  // vehicles
  jeep: 'Things/Building/Ruins/RustedMilitaryJeep_east.png',
  truck: 'Things/Building/Ruins/RustedTruck_east.png',
  apc: 'Things/Building/Ruins/RuinedAPC.png',
  turret: 'Things/Building/Security/TurretMini_Top.png',
  // weapons (side view, muzzle to the right)
  ak: 'Things/Item/Equipment/WeaponRanged/AssaultRifle.png',
  svd: 'Things/Item/Equipment/WeaponRanged/SniperRifle.png',
  pkm: 'Things/Item/Equipment/WeaponRanged/LMG.png',
  rpg: 'Things/Item/Equipment/WeaponRanged/RocketLauncher.png',
  cache: 'Things/Item/Resource/ComponentIndustrial/ComponentIndustrial.png',
  // effects
  shotFlash: 'Things/Mote/ShotFlash.png',
  explosion: 'Things/Mote/ExplosionFlash.png',
  smoke: 'Things/Mote/Smoke.png',
  dustPuff: 'Things/Mote/DustPuff.png',
  hitDirt: 'Things/Mote/ShotHit_Dirt.png',
};
// Paper-doll layers, loaded on demand per direction.
const DIRS = ['south', 'east', 'north'];
const doll = {
  body: (type, d) => `${H}Bodies/Naked_${type}_${d}.png`,
  head: (head, d) => `${H}Heads/${head.startsWith('Female') ? 'Female' : 'Male'}/${head}_${d}.png`,
  hair: (hair, d) => `${H}Hairs/${hair}_${d}.png`,
  shell: (name, type, d) => `${H}Apparel/${name}/${name}_${type}_${d}.png`,
  hat: (dir, name, d) => `${H}Apparel/${dir}/${name}_${d}.png`,
};
const HATS = {
  SimpleHelmet: ['SimpleHelmet', 'SimpleHelmet'],
  AdvancedHelmet: ['AdvancedHelmet', 'AdvancedHelmet'],
  Tuque: ['Tuque', 'Tuque'],
  Hood: ['Hood', 'Hood'],
  ReconHelmet: ['ReconArmorHelmet', 'ReconHelmet'],
};

const images = new Map();
function load(path) {
  if (!images.has(path))
    images.set(
      path,
      new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null); // a missing layer is skipped, never fatal
        img.src = BASE + path.split('/').map(encodeURIComponent).join('/');
      }),
    );
  return images.get(path);
}

/** Load every named file; returns {name: HTMLImageElement | null}. */
export async function loadArt() {
  const entries = await Promise.all(Object.entries(FILES).map(async ([k, p]) => [k, await load(p)]));
  return Object.fromEntries(entries);
}

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** The image multiplied by a colour, keeping its alpha (the set's grey layers are meant to be tinted). Cached. */
const tints = new WeakMap();
export function tinted(img, color) {
  if (!img || !color) return img;
  let byColor = tints.get(img);
  if (!byColor) tints.set(img, (byColor = new Map()));
  if (byColor.has(color)) return byColor.get(color);
  const c = canvas(img.width, img.height),
    g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  byColor.set(color, c);
  return c;
}

/**
 * A look: {body: 'Male'|'Female'|'Thin'|'Hulk'|'Fat', skin, head, hair, hairColor, shirt?, shirtColor?, shell?, shellColor?,
 * hat?, hatColor?}. Returns {south, east, north} canvases (west = east mirrored), 128 x 128, with the head lifted onto
 * the shoulders the way the set expects.
 */
export async function buildPawn(look) {
  const out = {};
  for (const d of DIRS) {
    const layers = await Promise.all([
      load(doll.body(look.body, d)),
      look.shirt ? load(doll.shell(look.shirt, look.body, d)) : null,
      look.shell ? load(doll.shell(look.shell, look.body, d)) : null,
      load(doll.head(look.head, d)),
      look.hair ? load(doll.hair(look.hair, d)) : null,
      look.hat ? load(doll.hat(HATS[look.hat][0], HATS[look.hat][1], d)) : null,
    ]);
    const [body, shirt, shell, head, hair, hat] = layers;
    const c = canvas(128, 128),
      g = c.getContext('2d');
    const draw = (img, color, dx = 0, dy = 0) => img && g.drawImage(tinted(img, color), dx, dy);
    // Head offset (south and north straight up; east a little forward), in pixels of the 128 px canvas.
    const hx = d === 'east' ? 6 : 0,
      hy = -26;
    draw(body, look.skin);
    draw(shirt, look.shirtColor);
    draw(shell, look.shellColor);
    if (d === 'north') {
      draw(head, look.skin, hx, hy);
      if (!look.hat) draw(hair, look.hairColor, hx, hy);
      draw(hat, look.hatColor, hx, hy);
    } else {
      draw(head, look.skin, hx, hy);
      if (!look.hat || look.hat === 'Tuque') draw(hair, look.hairColor, hx, hy);
      draw(hat, look.hatColor, hx, hy);
    }
    out[d] = c;
  }
  return out;
}

// Looks per side and role. Army: olive shirts, grey-green flak vests and helmets; the leader a red beret (tuque),
// the radio operator a recon helmet. Partisans: civilian coats and hoods.
const SKINS = ['#e8c4a0', '#d9a77e', '#c48e66', '#a8754f', '#f0d0b0'];
const HAIRS = ['Bowlcut', 'Mess', 'Recruit', 'Rookie', 'Shaved', 'Tuft', 'Decent', 'Scrapper'];
const HAIR_COLORS = ['#2b2118', '#4a3220', '#6b4a2a', '#1d1a17', '#8a6a42'];
const pick = (list, key) => list[[...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length];
export function lookFor(u) {
  const base = {
    body: 'Male',
    skin: pick(SKINS, u.id + 's'),
    head: pick(['Male_Average_Normal', 'Male_Average_Wide', 'Male_Narrow_Normal', 'Male_HeavyJaw_Normal'], u.id),
    hair: pick(HAIRS, u.id + 'h'),
    hairColor: pick(HAIR_COLORS, u.id + 'c'),
  };
  if (u.side === 'partisan') {
    if (u.id === 'mila')
      return {
        ...base,
        body: 'Female',
        head: 'Female_Average_Normal',
        hair: 'Ponytails',
        shell: 'Parka',
        shellColor: '#5f6e45',
        hat: 'Tuque',
        hatColor: '#3d4230',
      };
    if (u.id === 'dragan')
      return {...base, shirt: 'ShirtBasic', shirtColor: '#7a6a52', shell: 'Duster', shellColor: '#4d4a3a', hair: 'Mess'};
    return {...base, shirt: 'ShirtBasic', shirtColor: '#8a7a5a', shell: 'Jacket', shellColor: '#6b5a38', hat: 'Hood', hatColor: '#4a5236'};
  }
  const army = {
    ...base,
    shirt: 'ShirtBasic',
    shirtColor: '#6c7354',
    shell: 'FlakVest',
    shellColor: '#77806a',
    hat: 'SimpleHelmet',
    hatColor: '#646b4c',
  };
  if (u.role === 'leader') return {...army, hat: 'Tuque', hatColor: '#8e2b25'};
  if (u.role === 'rto') return {...army, hat: 'ReconHelmet', hatColor: '#646b4c'};
  if (u.role === 'marksman') return {...army, shellColor: '#6e7660', hat: 'Hood', hatColor: '#5d644b'};
  if (u.role === 'turret') return {...army, hat: 'AdvancedHelmet', hatColor: '#5a6048'};
  return army;
}

/** The atlas cell for a link mask (up 1, right 2, down 4, left 8): column = mask % 4, row counted from the bottom. */
export function atlasCell(img, mask) {
  const s = img.width / 4;
  return {sx: (mask % 4) * s, sy: (3 - Math.floor(mask / 4)) * s, s};
}
