// The bench: original low-poly geometry. Table top is the y = 0 plane; the parts tray sits on the near side.
import * as T from 'three';

/** Seeded plank texture drawn on a canvas, so nothing is downloaded and the result is repeatable. */
export function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const planks = 5,
    h = c.height / planks;
  for (let i = 0; i < planks; i++) {
    const base = 96 + Math.floor(rnd() * 30);
    g.fillStyle = `rgb(${base + 30},${base - 4},${base - 40})`;
    g.fillRect(0, i * h, c.width, h);
    for (let k = 0; k < 40; k++) {
      g.strokeStyle = `rgba(40,24,10,${0.06 + rnd() * 0.12})`;
      g.lineWidth = 1 + rnd() * 1.5;
      g.beginPath();
      const y = i * h + rnd() * h;
      g.moveTo(0, y);
      g.bezierCurveTo(c.width * 0.3, y + rnd() * 4 - 2, c.width * 0.6, y + rnd() * 4 - 2, c.width, y + rnd() * 3 - 1.5);
      g.stroke();
    }
    g.fillStyle = 'rgba(20,12,4,.55)';
    g.fillRect(0, i * h, c.width, 2);
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.repeat.set(2, 1);
  return t;
}

const mat = (color, rough = 0.85) => new T.MeshStandardMaterial({color, roughness: rough, flatShading: true});
function block(w, h, d, x, y, z, material, parent) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** @returns {{group: T.Group, trayA: T.Vector3, trayB: T.Vector3, lamp: T.PointLight}} tray slots are world positions (A: outgoing, B: incoming). */
export function buildBench() {
  const group = new T.Group();
  group.name = 'bench';
  const wood = new T.MeshStandardMaterial({map: woodTexture(), roughness: 0.9}),
    dark = mat(0x2b2f2a),
    metal = mat(0x6d7478, 0.5);
  block(2.6, 0.08, 1.3, 0, -0.04, 0, wood, group); // top
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(0.1, 0.9, 0.1, sx * 1.15, -0.53, sz * 0.55, dark, group);
  block(2.4, 0.06, 0.06, 0, -0.5, -0.55, dark, group); // back rail
  // Parts tray: a shallow tin tray near the camera side.
  const tray = new T.Group();
  tray.position.set(0.1, 0, 0.42);
  group.add(tray);
  block(0.62, 0.012, 0.26, 0, 0.006, 0, metal, tray);
  for (const [w, d, x, z] of [
    [0.62, 0.012, 0, 0.13],
    [0.62, 0.012, 0, -0.13],
    [0.012, 0.26, 0.31, 0],
    [0.012, 0.26, -0.31, 0],
  ])
    block(w, 0.03, d, x, 0.015, z, metal, tray);
  // Props: ammo tin, cleaning rag, screwdriver, radio. Original, deliberately plain.
  block(0.2, 0.1, 0.12, -0.78, 0.05, 0.28, mat(0x4d5636), group);
  const rag = block(0.28, 0.012, 0.2, -0.62, 0.006, -0.26, mat(0xa59a82), group);
  rag.rotation.y = 0.4;
  block(0.17, 0.016, 0.016, 0.82, 0.008, 0.12, mat(0xb4562a), group).rotation.y = -0.3;
  block(0.3, 0.17, 0.12, 0.9, 0.085, -0.4, mat(0x39402f), group);
  block(0.09, 0.07, 0.01, 0.9, 0.1, -0.338, mat(0xd9a45b, 0.4), group); // dial
  // Lamp: a warm point light over the work area (no shadow map: the stage's key light casts the shadows).
  const lamp = new T.PointLight(0xffc27a, 1.1, 3.5, 2);
  lamp.position.set(-0.45, 0.75, 0.15);
  group.add(lamp);
  block(0.04, 0.04, 0.04, -0.45, 0.78, 0.15, mat(0xffe2b0, 0.3), group);
  const trayA = new T.Vector3(-0.08, 0.04, 0.42),
    trayB = new T.Vector3(0.28, 0.04, 0.42);
  return {group, trayA, trayB, lamp};
}
