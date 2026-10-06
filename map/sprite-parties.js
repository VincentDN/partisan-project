// The 2.5-D overworld's people and vehicles (map25/, HD-2D style): the RimWorld paper-doll sprites of Partisan
// Tactical (convoy/sprite-art.js) and its vehicle sprites, stood upright on the 3-D island. Each is a pixel-crisp
// card that always turns to face the camera, chooses its front, side or back drawing from where it heads relative to
// the camera, casts a real (pixel) shadow and bobs as it walks. These are the "makers" map/parties.js builds
// parties with, in place of its 3-D figures and vehicle models.
import * as T from 'three';
import {buildPawn, loadGuns, lookFor, loadSet, FILES} from '../convoy/sprite-art.js';

const PERSON = 9; // map units: a person card's height (token scale, like the 3-D figures)
const FEET = 0.2; // the doll's feet sit this far up its card
const VEHICLE_LENGTH = {matv: 9.5, truck: 11, humvee: 7.5};
const VEHICLE_ART = {matv: 'truck', truck: 'truck', humvee: 'jeep'};
const RIFLES = ['ak74m', 'ak15k', 'rpk', 'set-assault', 'set-lmg'];
const SPRITE_LIGHT = 0xf4e6cf; // the sun's warmth on the sprites

/** A canvas texture kept crisp: nearest filtering, no mipmaps, sRGB. */
function crisp(canvas) {
  const t = new T.CanvasTexture(canvas);
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

/** The doll with its rifle, for each facing: {south, east, north} canvases (west is east mirrored). */
function armed(pawn, gun) {
  const out = {};
  for (const dir of ['south', 'east', 'north']) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const drawGun = () => {
      if (!gun) return;
      const len = 80 * Math.min(1.2, gun.length),
        h = (len * gun.img.height) / gun.img.width;
      g.save();
      if (dir === 'east')
        g.translate(70, 80); // at the hip, muzzle forward
      else g.translate(dir === 'south' ? 66 : 60, 76);
      g.rotate(dir === 'east' ? 0.12 : dir === 'south' ? -0.6 : 0.6);
      g.drawImage(gun.img, -len / 2, -h / 2, len, h);
      g.restore();
    };
    if (dir === 'north') drawGun(); // carried in front: behind the body seen from the back
    g.drawImage(pawn[dir], 0, 0, 128, 128);
    if (dir !== 'north') drawGun();
    out[dir] = c;
  }
  return out;
}

export async function createSpriteLayer() {
  const guns = await loadGuns();
  const cards = []; // {card, root, frames, mats, kind, bob}
  const look = new T.Vector3();
  let n = 0;

  /** A billboard card on the ground: height h, aspect w/h, anchored `foot` up its height. */
  function card(texture, w, h, foot) {
    const geo = new T.PlaneGeometry(w, h);
    geo.translate(0, h / 2 - foot * h, 0);
    // unlit, as HD-2D draws its sprites: a flat card lit by the scene would go dark whenever the sun is behind it;
    // a warm tint ties it to the island's late-afternoon light instead
    const mat = new T.MeshBasicMaterial({map: texture, alphaTest: 0.5, side: T.DoubleSide, color: SPRITE_LIGHT});
    const mesh = new T.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  /** People: a soldier or a rebel (with `crowd`, a small band of them side by side). Same contract as the 3-D figure. */
  async function figure({paint = null, side = paint ? 'army' : 'partisan', crowd = 1} = {}) {
    const root = new T.Group();
    const members = [];
    for (let i = 0; i < crowd; i++) {
      const id = side === 'partisan' ? ['player', 'mila', 'dragan'][i] || `rebel${i}` : `soldier${n++}`;
      const pawn = await buildPawn(lookFor({id, side}));
      const gun = guns[side === 'partisan' ? ['ak74m', 'set-sniper', 'set-lmg'][i] || 'ak74m' : RIFLES[n % RIFLES.length]] || null;
      const frames = Object.fromEntries(Object.entries(armed(pawn, gun)).map(([d, c]) => [d, crisp(c)]));
      const mesh = card(frames.south, PERSON, PERSON, FEET);
      // a band stands in a loose wedge behind its leader
      const holder = new T.Group();
      holder.position.set(i ? -3.2 * Math.ceil(i / 2) : 0, 0, i ? (i % 2 ? 4.2 : -4.2) : 0);
      holder.add(mesh);
      root.add(holder);
      members.push({mesh, frames, phase: i * 0.37 + n * 0.11});
    }
    cards.push({root, members, kind: 'person', last: new T.Vector3(), moving: 0});
    return {root, update() {}};
  }

  /** A vehicle: its side-view sprite (the set's are drawn facing east), length along the road. */
  async function vehicle(id) {
    const img = await loadSet(FILES[VEHICLE_ART[id] || 'truck']);
    const root = new T.Group();
    if (!img) return root;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    // the set only has rusted ruins: drain the rust to grey, then paint them Invader drab
    g.filter = 'grayscale(1) contrast(1.15) brightness(1.15)';
    g.drawImage(img, 0, 0);
    g.filter = 'none';
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = '#8e9a7a';
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; // keep the sprite's own outline
    g.drawImage(img, 0, 0);
    const len = VEHICLE_LENGTH[id] || 9,
      h = (len * img.height) / img.width;
    const mesh = card(crisp(c), len, h, 0.08);
    const holder = new T.Group();
    holder.add(mesh);
    root.add(holder);
    cards.push({root, members: [{mesh, phase: 0}], kind: 'vehicle', last: new T.Vector3(), moving: 0});
    return root;
  }

  const fwd = new T.Vector3(),
    right = new T.Vector3(),
    toCam = new T.Vector3(),
    heading = new T.Vector3();
  /** Every frame: turn the cards to the camera, pick each one's facing, flip to west, bob the walkers. */
  function update(camera, t) {
    camera.getWorldDirection(look);
    const yaw = Math.atan2(-look.x, -look.z); // the cards' rotation so they face back up the view
    right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    for (const c of cards) {
      if (!c.root.visible) continue;
      c.root.updateMatrixWorld();
      const pos = c.root.getWorldPosition(fwd);
      const speed = c.last.distanceTo(pos);
      c.moving += ((speed > 0.01 ? 1 : 0) - c.moving) * 0.2;
      c.last.copy(pos);
      // the party's heading: its root's rotation (vehicles: local +x is the front; figures: +z)
      const ry = c.root.rotation.y;
      if (c.kind === 'vehicle') heading.set(Math.cos(ry), 0, -Math.sin(ry));
      else heading.set(Math.sin(ry), 0, Math.cos(ry));
      toCam.copy(camera.position).sub(pos).setY(0).normalize();
      const along = heading.dot(toCam),
        across = heading.dot(right);
      const dir = c.kind === 'vehicle' ? 'east' : Math.abs(along) > Math.abs(across) ? (along > 0 ? 'south' : 'north') : 'east';
      const flip = across < 0 ? -1 : 1;
      for (const m of c.members) {
        m.mesh.rotation.y = yaw - ry; // undo the root's turn: the card faces the camera
        m.mesh.scale.x = (dir === 'east' || c.kind === 'vehicle' ? flip : 1) * Math.abs(m.mesh.scale.x || 1);
        if (m.frames && m.mesh.material.map !== m.frames[dir]) {
          m.mesh.material.map = m.frames[dir];
          m.mesh.material.needsUpdate = true;
        }
        // walkers bob a step; idlers breathe
        const k = c.moving;
        m.mesh.position.y =
          c.kind === 'person' ? k * Math.abs(Math.sin(t * 9 + m.phase * 6)) * 0.45 + (1 - k) * Math.sin(t * 2 + m.phase * 5) * 0.06 : 0;
      }
    }
  }
  return {makers: {figure, vehicle}, update, cards};
}
