// The workbench room: a table under a work lamp, a pegboard wall, props, the old radio and the FIA flag draped over
// the near edge. Original low-poly geometry, restored from the earlier workbench (vincentdenil-site,
// ak15-workbench-intro/workbench.js). Scene space: metres, table top at y = TABLE.top, near edge at z = TABLE.z[0].
// The flag texture assets/img/fia-flag.png was supplied by the site owner.
import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

export const TABLE = {top: 0.86, x: [-0.95, 0.95], z: [0.24, 1.04]};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const std = (color, roughness = 0.85, extra = {}) => new T.MeshStandardMaterial({color, roughness, ...extra});

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // repeatable grain
  g.fillStyle = '#6b5238';
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 150; i++) {
    const y = rnd() * 256;
    g.strokeStyle = `rgba(${rnd() < 0.5 ? '40,26,14' : '150,118,82'},${0.08 + rnd() * 0.18})`;
    g.lineWidth = 0.5 + rnd() * 2;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 3);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(20,14,8,${rnd() * 0.25})`; // stains
    g.beginPath();
    g.ellipse(rnd() * 512, rnd() * 256, 4 + rnd() * 30, 2 + rnd() * 10, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

/**
 * Fill `scene` with the room. Returns handles the page animates: the radio, the lamp and the flag drape function.
 * @param {T.Scene} scene
 * @param {{small?: boolean, flagUrl?: string, lighting?: string}} opts
 */
export function buildBenchScene(scene, {small = false, flagUrl = new URL('../assets/img/fia-flag.png', import.meta.url).href} = {}) {
  scene.background = new T.Color(0x07090a);
  scene.fog = new T.Fog(0x07090a, 2.2, 5);
  // One warm work lamp, a cold fill, a dim HDR for the metal.
  scene.add(new T.HemisphereLight(0x4a5a66, 0x120d08, 0.35));
  const lamp = new T.SpotLight(0xffc98a, 26, 4, 0.62, 0.55, 2);
  lamp.position.set(0.42, 1.62, 0.78);
  lamp.target.position.set(0.02, TABLE.top, 0.6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.01;
  scene.add(lamp, lamp.target);
  const fill = new T.DirectionalLight(0x6f8fb0, 0.35);
  fill.position.set(-1.5, 2, -1);
  scene.add(fill);
  new RGBELoader().load(new URL(`../assets/lighting/${small ? 'studio_512' : 'studio'}.hdr`, import.meta.url).href, hdr => {
    hdr.mapping = T.EquirectangularReflectionMapping;
    scene.environment = hdr;
    scene.environmentIntensity = 0.28;
  });

  const mesh = (geo, material, [x, y, z], shadow = true) => {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  const W = TABLE.x[1] - TABLE.x[0],
    D = TABLE.z[1] - TABLE.z[0],
    CX = (TABLE.x[0] + TABLE.x[1]) / 2,
    CZ = (TABLE.z[0] + TABLE.z[1]) / 2;
  mesh(new T.BoxGeometry(W, 0.05, D), std(0xffffff, 0.78, {map: woodTexture()}), [CX, TABLE.top - 0.025, CZ]);
  for (const x of [TABLE.x[0] + 0.06, TABLE.x[1] - 0.06])
    for (const z of [TABLE.z[0] + 0.06, TABLE.z[1] - 0.06])
      mesh(new T.BoxGeometry(0.07, TABLE.top - 0.05, 0.07), std(0x3b2c1f), [x, (TABLE.top - 0.05) / 2, z]);
  mesh(new T.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), std(0x1b1d1e, 0.95), [0, 0, 0], false);
  mesh(new T.PlaneGeometry(6, 3), std(0x2b2f2c, 0.95), [0, 1.5, TABLE.z[1] + 0.05], false); // back wall
  mesh(new T.BoxGeometry(1.4, 0.8, 0.015), std(0x4a3f30, 0.9), [0.1, 1.42, TABLE.z[1] + 0.035], false); // pegboard

  // Props: screwdriver, file, rag, ammo tin, power strip with a lit switch.
  const tools = std(0x3a3f44, 0.45, {metalness: 0.7});
  const driver = new T.Group();
  driver.add(
    new T.Mesh(new T.CylinderGeometry(0.014, 0.016, 0.11, 8).rotateZ(Math.PI / 2), std(0x3f4b3a, 0.6)),
    new T.Mesh(new T.CylinderGeometry(0.004, 0.004, 0.12, 6).rotateZ(Math.PI / 2).translate(0.115, 0, 0), tools),
  );
  driver.position.set(0.18, TABLE.top + 0.016, 0.96);
  driver.rotation.y = 0.25;
  driver.traverse(m => {
    if (m.isMesh) m.castShadow = true;
  });
  scene.add(driver);
  mesh(new T.BoxGeometry(0.2, 0.008, 0.025), tools, [0.32, TABLE.top + 0.004, 0.72]).rotation.y = -0.4;
  const rag = mesh(new T.IcosahedronGeometry(0.1, 1).scale(1.3, 0.28, 1), std(0x6d6a60, 0.98, {flatShading: true}), [
    0.6,
    TABLE.top + 0.012,
    0.95,
  ]);
  rag.rotation.y = 0.6;
  mesh(new T.BoxGeometry(0.18, 0.1, 0.1), std(0x3e4a32, 0.7), [-0.68, TABLE.top + 0.05, 0.62]).rotation.y = 0.3;
  const strip = mesh(new T.BoxGeometry(0.06, 0.035, 0.3), std(0x8e9092, 0.6), [0.8, TABLE.top + 0.018, 0.5]);
  strip.rotation.y = -0.15;
  mesh(
    new T.BoxGeometry(0.03, 0.012, 0.03),
    std(0xff2a1a, 0.4, {emissive: 0xff2a1a, emissiveIntensity: 2.5}),
    [0.8, TABLE.top + 0.04, 0.4],
    false,
  );
  // The lamp itself: a shade and a glowing bulb above the bench.
  mesh(
    new T.ConeGeometry(0.12, 0.14, 10, 1, true),
    std(0x3c4a3f, 0.6, {side: T.DoubleSide}),
    [lamp.position.x, lamp.position.y + 0.05, lamp.position.z],
    false,
  );
  mesh(
    new T.SphereGeometry(0.03, 8, 6),
    new T.MeshBasicMaterial({color: 0xfff0d0}),
    [lamp.position.x, lamp.position.y, lamp.position.z],
    false,
  );

  // The old radio at the back of the bench: wooden case, cloth grille, lit tuning dial, two knobs and a carry handle.
  const radio = new T.Group();
  radio.position.set(-0.26, TABLE.top, 0.92);
  radio.rotation.y = 0.25;
  scene.add(radio);
  {
    const part = (geo, material, [x, y, z]) => {
      const m = new T.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      radio.add(m);
      return m;
    };
    const w = 0.34,
      h = 0.21,
      d = 0.13,
      wood = std(0x4a2e1a, 0.6, {flatShading: true});
    part(new T.BoxGeometry(w, h, d), wood, [0, h / 2, 0]);
    part(new T.BoxGeometry(w + 0.012, 0.014, d + 0.012), std(0x2e1c10, 0.6), [0, h - 0.004, 0]); // lid lip
    part(new T.BoxGeometry(w * 0.52, h * 0.72, 0.004), std(0x8a7a5c, 0.95), [-w * 0.2, h * 0.47, -d / 2 - 0.001]); // grille cloth
    for (let i = 0; i < 5; i++) part(new T.BoxGeometry(w * 0.52, 0.008, 0.006), wood, [-w * 0.2, h * 0.18 + i * h * 0.14, -d / 2 - 0.004]); // slats
    part(new T.BoxGeometry(w * 0.3, h * 0.26, 0.006), std(0x1a1410, 0.5), [w * 0.29, h * 0.68, -d / 2 - 0.002]); // dial bezel
    radio.userData.dial = part(
      new T.PlaneGeometry(w * 0.26, h * 0.2).rotateY(Math.PI),
      std(0xffd9a0, 0.5, {emissive: 0xffa447, emissiveIntensity: 1.4}),
      [w * 0.29, h * 0.68, -d / 2 - 0.0055],
    );
    part(new T.BoxGeometry(0.003, h * 0.18, 0.002), std(0x9a2a1a, 0.5), [w * 0.25, h * 0.68, -d / 2 - 0.007]); // needle
    for (const x of [0.2, 0.38])
      part(new T.CylinderGeometry(0.017, 0.019, 0.018, 10).rotateX(Math.PI / 2), std(0x201a15, 0.4), [
        w * x + w * 0.03,
        h * 0.26,
        -d / 2 - 0.009,
      ]);
    part(new T.TorusGeometry(0.07, 0.008, 5, 10, Math.PI), std(0x2a2522, 0.5, {metalness: 0.4}), [0, h + 0.002, 0]); // handle
  }

  // FIA flag draped over the near edge: most of it lies flat on the table, the rest hangs down, swaying a little.
  // The cloth is a grid bent over the edge on the CPU each frame.
  const FLAG = {x: [-0.95, -0.25], flat: 0.3, height: 0.4, bend: 0.012, cols: 36, rows: 26};
  const flagGeo = new T.PlaneGeometry(1, 1, FLAG.cols, FLAG.rows);
  const flagTexture = new T.TextureLoader().load(flagUrl);
  flagTexture.flipY = false;
  flagTexture.colorSpace = T.SRGBColorSpace;
  flagTexture.anisotropy = 8;
  const flag = new T.Mesh(flagGeo, new T.MeshStandardMaterial({map: flagTexture, roughness: 0.95, side: T.DoubleSide}));
  flag.castShadow = flag.receiveShadow = true;
  flag.frustumCulled = false;
  scene.add(flag);
  function drapeFlag(time) {
    const p = flagGeo.attributes.position,
      uv = flagGeo.attributes.uv,
      width = FLAG.x[1] - FLAG.x[0],
      edge = TABLE.z[0],
      arc = (FLAG.bend * Math.PI) / 2;
    for (let i = 0; i < p.count; i++) {
      const u = uv.getX(i),
        v = uv.getY(i),
        s = (1 - v) * FLAG.height; // distance down the cloth from the top edge
      let x = FLAG.x[0] + u * width,
        y,
        z;
      if (s < FLAG.flat) {
        y = TABLE.top + 0.002;
        z = edge + FLAG.flat - s;
      } else if (s < FLAG.flat + arc) {
        const a = (s - FLAG.flat) / FLAG.bend;
        y = TABLE.top + 0.002 - FLAG.bend * (1 - Math.cos(a));
        z = edge - FLAG.bend * Math.sin(a);
      } else {
        const hang = s - FLAG.flat - arc,
          k = hang / (FLAG.height - FLAG.flat);
        y = TABLE.top + 0.002 - FLAG.bend - hang;
        const sway = reduceMotion ? 0 : Math.sin(time * 1.1 + u * 5) * 0.008 * k + Math.sin(time * 0.7 + u * 11) * 0.003 * k;
        z = edge - FLAG.bend - Math.sin(u * Math.PI * 5) * 0.012 * k - 0.01 * k * k - sway;
        x += reduceMotion ? 0 : Math.sin(time * 0.9 + v * 4) * 0.004 * k;
      }
      p.setXYZ(i, x, y, z);
    }
    p.needsUpdate = true;
    flagGeo.computeVertexNormals();
  }
  drapeFlag(0);

  return {lamp, radio, drapeFlag, mesh};
}
