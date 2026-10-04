// The Operator Customiser's room: a dark rebel warehouse with the operator standing in a pool of light, lit the way
// Bannerlord lights its inventory screen. Three-point lighting: a warm key spotlight from high front-left that makes the
// pool on the floor, a cool rim from behind that traces the silhouette, and a low fill so the shadow side stays
// readable. The HDR still gives the reflections, turned well down; everything else falls off into fog.
// Low-poly, flat-shaded set dressing (crates, barrels, shelving, a workbench, a banner) with canvas-made textures, so
// nothing new has to be downloaded.
import * as T from 'three';

const rnd = (() => {
  let a = 1234567;
  return () => (a = (a * 1103515245 + 12345) >>> 0) / 4294967296;
})();

/** A tileable texture painted on a canvas: fill, then n speckles/strokes per call of `paint`. */
function canvasTexture(size, paint, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const concrete = () =>
  canvasTexture(
    512,
    (g, s) => {
      g.fillStyle = '#4a463f';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) {
        const v = 50 + rnd() * 40;
        g.fillStyle = `rgba(${v},${v - 3},${v - 8},${0.25 + rnd() * 0.3})`;
        g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 3, 1 + rnd() * 3);
      }
      // slabs, stains and cracks
      g.strokeStyle = 'rgba(20,18,15,.55)';
      g.lineWidth = 2;
      for (const p of [0, s / 2]) {
        g.beginPath();
        g.moveTo(p, 0);
        g.lineTo(p, s);
        g.moveTo(0, p);
        g.lineTo(s, p);
        g.stroke();
      }
      for (let i = 0; i < 7; i++) {
        const r = 20 + rnd() * 70,
          x = rnd() * s,
          y = rnd() * s,
          st = g.createRadialGradient(x, y, 0, x, y, r);
        st.addColorStop(0, 'rgba(25,20,15,.35)');
        st.addColorStop(1, 'rgba(25,20,15,0)');
        g.fillStyle = st;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.strokeStyle = 'rgba(15,12,10,.5)';
      g.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        let x = rnd() * s,
          y = rnd() * s;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 8; k++) g.lineTo((x += (rnd() - 0.5) * 30), (y += (rnd() - 0.5) * 30));
        g.stroke();
      }
    },
    5,
  );
const brick = () =>
  canvasTexture(
    512,
    (g, s) => {
      g.fillStyle = '#2b2622';
      g.fillRect(0, 0, s, s);
      const bh = s / 16,
        bw = s / 6;
      for (let row = 0; row < 16; row++)
        for (let col = -1; col < 7; col++) {
          const x = col * bw + (row % 2 ? bw / 2 : 0),
            v = 52 + rnd() * 30;
          g.fillStyle = `rgb(${v + 10},${v - 2},${v - 10})`;
          g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
          for (let i = 0; i < 40; i++) {
            g.fillStyle = `rgba(0,0,0,${rnd() * 0.25})`;
            g.fillRect(x + 2 + rnd() * (bw - 6), row * bh + 2 + rnd() * (bh - 6), 2, 2);
          }
        }
      // soot rising from the floor
      const soot = g.createLinearGradient(0, s, 0, 0);
      soot.addColorStop(0, 'rgba(10,8,6,.55)');
      soot.addColorStop(0.5, 'rgba(10,8,6,0)');
      g.fillStyle = soot;
      g.fillRect(0, 0, s, s);
    },
    1,
  );
const planks = () =>
  canvasTexture(
    256,
    (g, s) => {
      g.fillStyle = '#5d4a32';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = `rgb(${86 + rnd() * 20},${66 + rnd() * 14},${44 + rnd() * 10})`;
        g.fillRect(0, (i * s) / 4 + 2, s, s / 4 - 4);
        g.strokeStyle = 'rgba(40,28,16,.4)';
        for (let k = 0; k < 6; k++) {
          g.beginPath();
          const y = (i * s) / 4 + 6 + rnd() * (s / 4 - 12);
          g.moveTo(0, y);
          g.bezierCurveTo(s * 0.3, y + rnd() * 6 - 3, s * 0.6, y + rnd() * 6 - 3, s, y);
          g.stroke();
        }
      }
    },
    1,
  );

/**
 * Build the warehouse into the stage. Returns {group, lights, on(bool)}: on(false) hides it and hands the lighting
 * back to the stage's HDR environments (Studio, Outdoor, Sunset).
 */
export function buildWarehouse(stage) {
  const {scene, renderer, key, floor} = stage;
  const group = new T.Group();
  group.name = 'warehouse';
  const flat = (color, map = null, extra = {}) =>
    new T.MeshStandardMaterial({color, map, roughness: 0.92, metalness: 0, flatShading: true, ...extra});
  const box = (w, h, d, mat, x, y, z, ry = 0) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // floor and walls
  const floorMesh = new T.Mesh(new T.PlaneGeometry(26, 26), flat(0xffffff, concrete(), {roughness: 0.85}));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);
  const wallMat = flat(0xffffff, brick());
  wallMat.map.repeat.set(4, 1.4);
  const back = new T.Mesh(new T.PlaneGeometry(26, 7), wallMat);
  back.position.set(0, 3.5, -5.5);
  back.receiveShadow = true;
  group.add(back);
  for (const side of [-1, 1]) {
    const m = new T.Mesh(new T.PlaneGeometry(14, 7), wallMat);
    m.position.set(side * 7.5, 3.5, 1);
    m.rotation.y = (-side * Math.PI) / 2;
    m.receiveShadow = true;
    group.add(m);
  }
  // roof beams fading into the dark
  const beam = flat(0x2a2016);
  for (let i = -2; i <= 2; i++) box(0.25, 0.35, 12, beam, i * 3, 5.6, 0);

  // set dressing: crates, barrels, shelving with ammo cans, a workbench, a hanging banner
  const crate = flat(0xffffff, planks()),
    crateDark = flat(0x8a7a62, planks()),
    metal = flat(0x3d4236, null, {metalness: 0.3, roughness: 0.6}),
    olive = flat(0x4a5233),
    rust = flat(0x6b3a22);
  box(1, 1, 1, crate, -2.6, 0, -2.9, 0.2);
  box(1, 1, 1, crateDark, -3.5, 0, -3.3, -0.1);
  box(0.9, 0.9, 0.9, crate, -3.0, 1, -3.1, 0.5);
  box(0.8, 0.6, 1.2, crateDark, 2.4, 0, -3.4, 0.35);
  box(0.8, 0.6, 1.2, crate, 2.5, 0.6, -3.35, 0.3);
  for (const [x, z, m] of [
    [3.4, -1.6, olive],
    [3.9, -2.2, rust],
    [3.2, -2.6, olive],
    [-4.2, -1.2, rust],
  ]) {
    const b = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.9, 10), m);
    b.position.set(x, 0.45, z);
    b.castShadow = b.receiveShadow = true;
    group.add(b);
  }
  // shelving along the back wall, loaded with ammo cans
  for (const x of [-5, 5]) {
    for (const y of [0.05, 0.95, 1.85]) box(2.4, 0.06, 0.6, metal, x, y, -4.9);
    for (const dx of [-1.15, 1.15]) box(0.06, 2.4, 0.6, metal, x + dx, 0, -4.9);
    for (let i = 0; i < 6; i++)
      box(0.32, 0.22, 0.2, i % 2 ? olive : metal, x - 0.9 + (i % 3) * 0.7 + rnd() * 0.1, 0.1 + Math.floor(i / 3) * 0.9, -4.85, rnd() * 0.3);
  }
  // a workbench at the side with a lamp
  box(2, 0.08, 0.8, crateDark, -4.6, 0.86, 0.6, Math.PI / 2);
  for (const [dx, dz] of [
    [-0.32, -0.9],
    [0.32, -0.9],
    [-0.32, 0.9],
    [0.32, 0.9],
  ])
    box(0.08, 0.86, 0.08, crateDark, -4.6 + dx, 0, 0.6 + dz);
  // a rebel banner on the back wall
  const banner = new T.Mesh(new T.PlaneGeometry(1.6, 2.2), flat(0x5a1d16, null, {side: T.DoubleSide}));
  banner.position.set(0.4, 3.1, -5.45);
  group.add(banner);
  const star = new T.Mesh(new T.CircleGeometry(0.32, 5), flat(0xb8902e));
  star.position.set(0.4, 3.3, -5.43);
  star.rotation.z = Math.PI / 2;
  group.add(star);

  // practical lights: two bulbs at the back, glowing, giving the room depth
  const lights = new T.Group();
  const bulbMat = new T.MeshBasicMaterial({color: 0xffc27a});
  for (const [x, z] of [
    [-3.4, -3.6],
    [4.2, -3.2],
  ]) {
    const bulb = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), bulbMat);
    bulb.position.set(x, 3.2, z);
    const wire = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 2.4), metal);
    wire.position.set(x, 4.45, z);
    const p = new T.PointLight(0xff9a4a, 4, 7, 2);
    p.position.set(x, 3.05, z);
    lights.add(bulb, wire, p);
  }

  // three-point lighting on the operator
  const keyLight = new T.SpotLight(0xffd6a6, 95, 14, 0.36, 0.55, 2); // warm key: high front-left, the pool on the floor
  keyLight.position.set(1.9, 4.6, 2.6);
  keyLight.target.position.set(0, 0.6, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.setScalar(2048);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 5;
  const pool = new T.SpotLight(0xffe2b8, 45, 9, 0.3, 0.8, 2); // straight down: the lit spot on the ground
  pool.position.set(0, 5.5, 0.3);
  pool.target.position.set(0, 0, 0.1);
  const rim = new T.SpotLight(0xc4d8ff, 300, 12, 0.5, 0.4, 2); // cool rim from behind, tracing the silhouette
  rim.position.set(-1.6, 3.1, -2.8);
  rim.target.position.set(0, 1.2, 0);
  const fill = new T.HemisphereLight(0x5a6a80, 0x1a130c, 0.35); // low fill, cool above, warm floor bounce
  lights.add(keyLight, keyLight.target, pool, pool.target, rim, rim.target, fill);
  group.add(lights);

  const fog = new T.FogExp2(0x07080a, 0.085);
  const dark = new T.Color(0x07080a);
  const saved = {};
  function on(enabled) {
    group.visible = enabled;
    if (enabled) {
      Object.assign(saved, {
        background: scene.background,
        fog: scene.fog,
        envIntensity: scene.environmentIntensity,
        key: key.intensity,
        keyShadow: key.castShadow,
        floor: floor.visible,
        exposure: renderer.toneMappingExposure,
      });
      scene.background = dark;
      scene.fog = fog;
      scene.environmentIntensity = 0.16; // reflections only; the room's own lights do the lighting
      key.intensity = 0;
      key.castShadow = false;
      floor.visible = false;
      renderer.toneMappingExposure = 1.05;
    } else if ('background' in saved) {
      scene.background = saved.background;
      scene.fog = saved.fog;
      scene.environmentIntensity = saved.envIntensity ?? 1;
      key.intensity = saved.key;
      key.castShadow = saved.keyShadow;
      floor.visible = saved.floor;
      renderer.toneMappingExposure = saved.exposure;
    }
    stage.wake();
  }
  scene.add(group);
  return {
    group,
    lights: {key: keyLight, pool, rim, fill},
    on,
    get enabled() {
      return group.visible;
    },
  };
}
