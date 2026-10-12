// What fights leave on the campaign map (WP-W13): where a convoy was ambushed, its burnt-out vehicles on a scorched
// patch with a column of smoke; where a post or the hunters were beaten, scorch and smoke; over a settlement taken for
// the Resistance, smoke. The marks are in the campaign save (world.aftermath, shared/campaign/contacts.js): the smoke
// thins over two campaign days, the wrecks and scorch over two weeks. Both map styles share this three.js layer.
import * as T from 'three';
import {sample} from './island.js';
import {vehicle3d} from './vehicles.js';
import {aftermathLook, pruneAftermath} from '../shared/campaign/contacts.js';

const PUFFS = 9; // smoke sprites in a column
const RISE = 46; // map units the smoke climbs before it is gone
const CHAR = new T.MeshStandardMaterial({color: 0x1e1c19, roughness: 1, metalness: 0.1}); // burnt paint and metal

/** A soft round puff, drawn once and shared. */
function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

/** The burnt ground: black, soft at the edge, blotched, so it never reads as a drawn circle. */
function scorchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 64 + Math.cos(i * 2.4) * (i ? 22 : 0),
      y = 64 + Math.sin(i * 2.4) * (i ? 22 : 0),
      r = i ? 30 : 52;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(18,15,12,0.8)');
    grad.addColorStop(1, 'rgba(18,15,12,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

/** A small, steady number from a mark's id: where its wrecks lie and how they are turned. */
const hash = s => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function createAftermath({scene, field, reduceMotion = false}) {
  const group = new T.Group();
  group.name = 'aftermath';
  scene.add(group);
  const puff = puffTexture(),
    burnt = scorchTexture();
  const SOOT = new T.Color(0x34312d),
    PALE = new T.Color(0xa7a39b);
  const marks = new Map(); // key -> {root, scorch, smoke: [sprites], look}
  const keyOf = a => `${a.id}@${a.day}:${a.hour}`;

  function build(a) {
    const root = new T.Group();
    const y = sample(field, a.x, a.z);
    root.position.set(a.x, y, a.z);
    const h = hash(keyOf(a));
    // the scorched ground: a soft patch laid over the terrain's own heights, drawn over the ground it lies on
    const size = a.kind === 'raid' ? 22 : 28,
      geo = new T.PlaneGeometry(size, size, 10, 10);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, sample(field, a.x + pos.getX(i), a.z + pos.getZ(i)) - y + 0.3);
    const scorch = new T.Mesh(
      geo,
      new T.MeshBasicMaterial({map: burnt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}),
    );
    scorch.renderOrder = 1;
    if (a.kind !== 'raid') root.add(scorch);
    // the wrecks: the convoy's own models, burnt, slewed across the road
    if (a.kind === 'wreck')
      for (const [i, id] of ['truck', 'matv'].entries())
        vehicle3d(id)
          .then(v => {
            v.traverse(o => o.isMesh && (o.material = CHAR));
            const side = i ? -1 : 1;
            v.position.set(side * (3 + (h % 4)), 0, side * (2 + ((h >> 3) % 3)));
            v.rotation.y = ((h >> (i * 5)) % 628) / 100;
            v.rotation.z = side * 0.12; // one wheel in the ditch
            v.name = 'wreck';
            root.add(v);
          })
          .catch(() => {}); // no model: the scorch and smoke still mark the place
    const smoke = [];
    for (let i = 0; i < PUFFS; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({map: puff, color: 0xa7a39b, transparent: true, depthWrite: false, opacity: 0}));
      s.userData.phase = i / PUFFS + ((h >> i) % 10) / 100;
      smoke.push(s);
      root.add(s);
    }
    group.add(root);
    return {root, scorch, smoke, look: null};
  }

  function dispose(m) {
    group.remove(m.root);
    m.scorch.geometry.dispose();
    m.scorch.material.dispose();
    for (const s of m.smoke) s.material.dispose();
  }

  /** Match the marks to the campaign: new ones built, old ones removed, each faded to its age. */
  function sync(c) {
    const live = c ? pruneAftermath(c) : [];
    const keys = new Set(live.map(keyOf));
    for (const [k, m] of marks)
      if (!keys.has(k)) {
        dispose(m);
        marks.delete(k);
      }
    for (const a of live) {
      const k = keyOf(a);
      if (!marks.has(k)) marks.set(k, build(a));
      const m = marks.get(k);
      m.look = aftermathLook(c, a);
      m.scorch.material.opacity = m.look.remains;
      m.root.traverse(o => o.name === 'wreck' && (o.visible = m.look.remains > 0.05));
    }
  }

  /** Each frame: the smoke rises, swells and thins (held still for reduced motion). */
  function update(t) {
    for (const m of marks.values()) {
      const level = m.look?.smoke ?? 0;
      for (const s of m.smoke) {
        const p = reduceMotion ? s.userData.phase : (t * 0.05 + s.userData.phase) % 1;
        s.visible = level > 0.02;
        if (!s.visible) continue;
        s.position.set(Math.sin(p * 5 + s.userData.phase * 9) * 2 + p * 6, 3 + p * RISE, Math.cos(p * 4) * 1.5);
        s.scale.setScalar(9 + p * 28);
        s.material.opacity = Math.max(0, level * 0.7 * Math.sin(Math.PI * Math.min(1, p * 1.25)));
        s.material.color.copy(SOOT).lerp(PALE, Math.min(1, p * 1.6)); // black over the fire, grey as it rises
      }
    }
  }

  return {
    sync,
    update,
    get count() {
      return marks.size;
    },
    group,
  };
}
