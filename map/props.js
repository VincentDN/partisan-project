// What stands on the island and what moves over it: Mediterranean trees (cypress, umbrella pine, olive, scrub), the
// settlements (whitewashed houses under terracotta, walled towns with a blue-domed church, the Invader's base, the
// Resistance camp), dirt roads that follow the ground, waving flags, drifting clouds, gulls, chimney smoke and fishing
// boats. Everything repeated is instanced; the small animations run in update(dt, t, camera).
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SETTLEMENTS, ROADS, FACTIONS, PARTY_SPOTS, byId, sample, fbm, noise, SNOWLINE} from './island.js';

const tint = (geo, hex) => {
  const c = new T.Color(hex),
    n = geo.attributes.position.count,
    a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new T.BufferAttribute(a, 3));
  return geo;
};
const merge = list => mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g)));
const flat = new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: 0.9});
// seeded random for placement
let seed = 12345;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- trees ----------
const TREES = {
  cypress: merge([
    tint(new T.CylinderGeometry(0.12, 0.16, 0.8, 5).translate(0, 0.4, 0), '#4a3a28'),
    tint(new T.ConeGeometry(0.75, 5.6, 7).translate(0, 3.4, 0), '#25401f'),
  ]),
  pine: merge([
    tint(new T.CylinderGeometry(0.16, 0.24, 3.2, 5).translate(0, 1.6, 0), '#5a4430'),
    tint(new T.IcosahedronGeometry(1.6, 0).scale(1.6, 0.55, 1.6).translate(0, 3.5, 0), '#34502a'),
  ]),
  olive: merge([
    tint(new T.CylinderGeometry(0.14, 0.22, 1.1, 5).translate(0, 0.55, 0), '#5d5040'),
    tint(new T.IcosahedronGeometry(1.05, 0).translate(0, 1.6, 0), '#7a8a5c'),
  ]),
  scrub: tint(new T.IcosahedronGeometry(0.6, 0).scale(1, 0.6, 1).translate(0, 0.25, 0), '#56603c'),
};

function slopeAt(field, x, z) {
  const e = 2;
  const dx = sample(field, x + e, z) - sample(field, x - e, z),
    dz = sample(field, x, z + e) - sample(field, x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}
const nearSettlement = (x, z, pad) =>
  SETTLEMENTS.some(s => Math.hypot(x - s.x, z - s.z) < (s.kind === 'town' || s.kind === 'base' ? 26 : 16) + pad);

function plantTrees(field, roads) {
  const spots = {cypress: [], pine: [], olive: [], scrub: []};
  const nearRoad = (x, z) => roads.some(r => r.points.some((p, i) => i % 4 === 0 && Math.abs(p.x - x) < 3 && Math.abs(p.z - z) < 3));
  for (let z = -field.d / 2; z < field.d / 2; z += 3.2)
    for (let x = -field.w / 2; x < field.w / 2; x += 3.2) {
      const px = x + (rnd() - 0.5) * 3,
        pz = z + (rnd() - 0.5) * 3;
      const h = sample(field, px, pz);
      if (h < 2.2 || h > SNOWLINE - 10) continue;
      const s = slopeAt(field, px, pz);
      if (s > 0.9) continue;
      const forest = fbm(px / 70, pz / 70, 41); // clumps of trees with open country between
      const r = rnd();
      let kind = null;
      if (h > 26 && forest > 0.52 && r < 0.5) kind = 'pine';
      else if (h <= 26 && forest > 0.55 && r < 0.45) kind = r < 0.14 ? 'cypress' : 'pine';
      else if (h < 18 && noise(px / 25, pz / 25, 9) > 0.62 && r < 0.3)
        kind = 'olive'; // olive groves
      else if (r < 0.035) kind = r < 0.012 ? 'cypress' : 'scrub';
      if (
        !kind ||
        nearSettlement(px, pz, 0) ||
        nearRoad(px, pz) ||
        Object.values(PARTY_SPOTS).some(([x, z]) => Math.hypot(px - x, pz - z) < 12)
      )
        continue;
      spots[kind].push([px, h, pz, 0.6 + rnd() * 0.45, rnd() * Math.PI * 2]);
    }
  const group = new T.Group();
  group.name = 'trees';
  const m = new T.Matrix4(),
    q = new T.Quaternion(),
    up = new T.Vector3(0, 1, 0),
    c = new T.Color();
  for (const [kind, list] of Object.entries(spots)) {
    const inst = new T.InstancedMesh(TREES[kind], flat, list.length);
    list.forEach(([x, y, z, sc, rot], i) => {
      m.compose(new T.Vector3(x, y - 0.15, z), q.setFromAxisAngle(up, rot), new T.Vector3(sc, sc * (0.85 + rnd() * 0.3), sc));
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, c.setHSL(0, 0, 0.8 + rnd() * 0.35));
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    group.add(inst);
  }
  return {group, count: Object.values(spots).reduce((a, l) => a + l.length, 0)};
}

// ---------- settlements ----------
const HOUSE = merge([
  tint(new T.BoxGeometry(2, 1.5, 1.8).translate(0, 0.75, 0), '#efe9dc'),
  tint(
    new T.ConeGeometry(1.55, 0.9, 4)
      .rotateY(Math.PI / 4)
      .scale(1, 1, 0.9)
      .translate(0, 1.95, 0),
    '#b8553a',
  ),
]);
const HOUSE_BLUE = merge([
  tint(new T.BoxGeometry(1.8, 1.3, 1.8).translate(0, 0.65, 0), '#f3efe6'),
  tint(new T.BoxGeometry(1.9, 0.18, 1.9).translate(0, 1.38, 0), '#e8e2d4'),
]); // flat roof
const CHURCH = merge([
  tint(new T.BoxGeometry(3, 2.6, 3).translate(0, 1.3, 0), '#f5f2ea'),
  tint(new T.SphereGeometry(1.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.6, 0), '#2f6fb3'),
  tint(new T.BoxGeometry(0.15, 0.8, 0.15).translate(0, 4.2, 0), '#f5f2ea'),
]);
const TOWER = merge([
  tint(new T.CylinderGeometry(1.2, 1.35, 5, 8).translate(0, 2.5, 0), '#cfc3a6'),
  tint(new T.CylinderGeometry(1.45, 1.45, 0.6, 8).translate(0, 5.2, 0), '#bfb293'),
]);
const WALL = tint(new T.BoxGeometry(1, 2.6, 0.7).translate(0, 1.3, 0), '#d6cbb0');
const CONCRETE = tint(new T.BoxGeometry(1, 2.2, 0.6).translate(0, 1.1, 0), '#8d8f88');
const HANGAR = tint(
  new T.CylinderGeometry(3, 3, 9, 10, 1, false, 0, Math.PI)
    .rotateZ(Math.PI / 2)
    .rotateY(Math.PI / 2)
    .translate(0, 0, 0),
  '#6f7568',
);
const WATCH = merge([
  tint(new T.BoxGeometry(0.2, 4, 0.2).translate(0.6, 2, 0.6), '#4d4a42'),
  tint(new T.BoxGeometry(0.2, 4, 0.2).translate(-0.6, 2, -0.6), '#4d4a42'),
  tint(new T.BoxGeometry(0.2, 4, 0.2).translate(0.6, 2, -0.6), '#4d4a42'),
  tint(new T.BoxGeometry(0.2, 4, 0.2).translate(-0.6, 2, 0.6), '#4d4a42'),
  tint(new T.BoxGeometry(1.8, 1, 1.8).translate(0, 4.5, 0), '#5e5a50'),
  tint(new T.ConeGeometry(1.5, 0.8, 4).rotateY(Math.PI / 4).translate(0, 5.4, 0), '#3d3b35'),
]);
const TENT = tint(
  new T.ConeGeometry(1.4, 1.6, 4)
    .rotateY(Math.PI / 4)
    .scale(1.2, 1, 0.8)
    .translate(0, 0.8, 0),
  '#58603e',
);

function flag(color) {
  const g = new T.Group();
  const pole = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 6, 5).translate(0, 3, 0), new T.MeshStandardMaterial({color: '#3a3a36'}));
  const cloth = new T.Mesh(
    new T.PlaneGeometry(2.6, 1.6, 10, 4).translate(1.3, 5, 0),
    new T.MeshStandardMaterial({color, side: T.DoubleSide, roughness: 0.8}),
  );
  cloth.userData.base = cloth.geometry.attributes.position.array.slice();
  g.add(pole, cloth);
  g.userData.cloth = cloth;
  pole.castShadow = cloth.castShadow = true;
  return g;
}

function buildSettlements(field) {
  const group = new T.Group();
  group.name = 'settlements';
  const pieces = {house: [], flatroof: [], church: [], tower: [], wall: [], concrete: [], hangar: [], watch: [], tent: []};
  const flags = [],
    chimneys = [];
  const put = (kind, x, z, rot = 0, sc = 1) => pieces[kind].push([x, sample(field, x, z), z, rot, sc]);
  for (const s of SETTLEMENTS) {
    if (s.kind === 'town' || s.kind === 'village') {
      const R = s.kind === 'town' ? 24 : 12,
        n = s.kind === 'town' ? 46 : 11;
      put('church', s.x, s.z, rnd() * Math.PI, 1.7);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2,
          r = 6 + Math.sqrt(rnd()) * (R - 6);
        const x = s.x + Math.cos(a) * r,
          z = s.z + Math.sin(a) * r;
        put(
          rnd() < 0.3 ? 'flatroof' : 'house',
          x,
          z,
          Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (rnd() - 0.5) * 0.3,
          0.8 + rnd() * 0.5,
        );
        if (rnd() < 0.15) chimneys.push(new T.Vector3(x, sample(field, x, z) + 2.4, z));
      }
      if (s.kind === 'town') {
        // the wall: segments round the town, a tower every eighth of the way
        for (let i = 0; i < 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          put('wall', s.x + Math.cos(a) * (R + 3), s.z + Math.sin(a) * (R + 3), -a + Math.PI / 2, 2.6);
          if (i % 8 === 0) put('tower', s.x + Math.cos(a) * (R + 3), s.z + Math.sin(a) * (R + 3), 0, 1.5);
        }
      }
    } else if (s.kind === 'base') {
      // the Invader's base: a square of concrete wall, hangars, watchtowers
      const R = 22;
      for (let i = -R; i <= R; i += 1.6) {
        put('concrete', s.x + i, s.z - R, 0, 1.6);
        put('concrete', s.x + i, s.z + R, 0, 1.6);
        put('concrete', s.x - R, s.z + i, Math.PI / 2, 1.6);
        put('concrete', s.x + R, s.z + i, Math.PI / 2, 1.6);
      }
      for (const [dx, dz] of [
        [-R, -R],
        [R, -R],
        [-R, R],
        [R, R],
      ])
        put('watch', s.x + dx, s.z + dz);
      put('hangar', s.x - 8, s.z - 6, 0, 1.4);
      put('hangar', s.x + 8, s.z - 6, 0, 1.4);
      for (let i = 0; i < 6; i++) put('flatroof', s.x - 9 + (i % 3) * 7, s.z + 8 + Math.floor(i / 3) * 6, 0, 2);
    } else if (s.kind === 'camp') {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + rnd() * 0.3;
        put('tent', s.x + Math.cos(a) * 9, s.z + Math.sin(a) * 9, -a, 1.6);
      }
      chimneys.push(new T.Vector3(s.x, sample(field, s.x, s.z) + 0.4, s.z)); // the campfire
    }
    const f = flag(FACTIONS[s.faction].banner);
    const onChurch = s.kind === 'town' || s.kind === 'village';
    f.position.set(s.x + (onChurch ? 0 : 4), sample(field, s.x, s.z) + (onChurch ? 4.6 : 0), s.z + (onChurch ? 0 : 4));
    f.scale.setScalar(1.8);
    group.add(f);
    flags.push(f);
  }
  const GEOS = {
    house: HOUSE,
    flatroof: HOUSE_BLUE,
    church: CHURCH,
    tower: TOWER,
    wall: WALL,
    concrete: CONCRETE,
    hangar: HANGAR,
    watch: WATCH,
    tent: TENT,
  };
  const m = new T.Matrix4(),
    q = new T.Quaternion(),
    up = new T.Vector3(0, 1, 0);
  for (const [kind, list] of Object.entries(pieces)) {
    if (!list.length) continue;
    const inst = new T.InstancedMesh(GEOS[kind], flat, list.length);
    list.forEach(([x, y, z, rot, sc], i) => {
      const s = kind === 'wall' || kind === 'concrete' ? new T.Vector3(sc, 1, 1) : new T.Vector3(sc, sc, sc);
      inst.setMatrixAt(i, m.compose(new T.Vector3(x, y - 0.2, z), q.setFromAxisAngle(up, rot), s));
    });
    inst.castShadow = inst.receiveShadow = true;
    group.add(inst);
  }
  return {group, flags, chimneys};
}

// ---------- roads ----------
function buildRoads(field) {
  const roads = [];
  const mat = new T.MeshStandardMaterial({
    color: '#b39a72',
    roughness: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const group = new T.Group();
  group.name = 'roads';
  for (const [a, b] of ROADS) {
    const A = byId(a),
      B = byId(b);
    // a wandering line: midpoints pushed sideways by noise, then smoothed
    const ctrl = [];
    const len = Math.hypot(B.x - A.x, B.z - A.z),
      nx = -(B.z - A.z) / len,
      nz = (B.x - A.x) / len;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6,
        off = i === 0 || i === 6 ? 0 : (noise(t * 3 + A.x * 0.01, A.z * 0.01, 5) - 0.5) * len * 0.25;
      ctrl.push(new T.Vector3(A.x + (B.x - A.x) * t + nx * off, 0, A.z + (B.z - A.z) * t + nz * off));
    }
    const curve = new T.CatmullRomCurve3(ctrl);
    const n = Math.ceil(len / 2.5);
    const points = curve.getSpacedPoints(n).map(p => new T.Vector3(p.x, Math.max(0.3, sample(field, p.x, p.z)) + 0.12, p.z));
    // a ribbon laid on the ground
    const pos = [],
      idx = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        q = points[Math.min(points.length - 1, i + 1)],
        o = points[Math.max(0, i - 1)];
      const d = new T.Vector3().subVectors(q, o).setY(0).normalize();
      const side = new T.Vector3(-d.z, 0, d.x).multiplyScalar(0.9);
      for (const sgn of [-1, 1]) {
        const x = p.x + side.x * sgn,
          z = p.z + side.z * sgn;
        pos.push(x, Math.max(0.3, sample(field, x, z)) + 0.12, z);
      }
      if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new T.Mesh(geo, mat);
    mesh.receiveShadow = true;
    group.add(mesh);
    roads.push({from: a, to: b, points, length: len});
  }
  return {group, roads};
}

// ---------- sky and sea life ----------
function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 30 + rnd() * 68,
      y = 40 + rnd() * 48,
      r = 18 + rnd() * 26;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
function buildClouds() {
  const tex = cloudTexture();
  const group = new T.Group();
  group.name = 'clouds';
  for (let i = 0; i < 16; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({map: tex, transparent: true, depthWrite: false, opacity: 0.8, fog: false}));
    s.scale.set(120 + rnd() * 120, 60 + rnd() * 50, 1);
    s.position.set((rnd() - 0.5) * 1400, 120 + rnd() * 40, (rnd() - 0.5) * 1000);
    group.add(s);
  }
  return group;
}
function buildGulls() {
  const wing = new T.BufferGeometry();
  wing.setAttribute(
    'position',
    new T.Float32BufferAttribute([0, 0, 0, -0.9, 0.25, -0.35, 0, 0, -0.25, 0, 0, 0, 0.9, 0.25, -0.35, 0, 0, -0.25], 3),
  );
  wing.computeVertexNormals();
  const mat = new T.MeshBasicMaterial({color: '#f4f4f0', side: T.DoubleSide});
  const flocks = [];
  for (let f = 0; f < 4; f++) {
    const g = new T.Group();
    const birds = [];
    for (let i = 0; i < 6; i++) {
      const b = new T.Mesh(wing, mat);
      b.position.set((rnd() - 0.5) * 8, rnd() * 2, (rnd() - 0.5) * 8);
      b.userData.phase = rnd() * 6;
      g.add(b);
      birds.push(b);
    }
    const a = (f / 4) * Math.PI * 2;
    g.userData = {cx: Math.cos(a) * 380, cz: Math.sin(a) * 280, r: 40 + rnd() * 40, speed: 0.15 + rnd() * 0.1, birds, h: 22 + rnd() * 10};
    flocks.push(g);
  }
  return flocks;
}
function buildBoats() {
  const boats = [];
  const hull = merge([
    tint(new T.BoxGeometry(3, 0.7, 1.1).translate(0, 0.35, 0), '#f0ece2'),
    tint(new T.BoxGeometry(3.05, 0.2, 1.15).translate(0, 0.05, 0), '#2f6fb3'),
    tint(new T.BoxGeometry(0.9, 0.7, 0.8).translate(-0.3, 1, 0), '#e4ddd0'),
  ]);
  for (let i = 0; i < 5; i++) {
    const b = new T.Mesh(hull, flat);
    const a = rnd() * Math.PI * 2;
    b.userData = {a, r: 450 + rnd() * 120, speed: (0.004 + rnd() * 0.004) * (rnd() < 0.5 ? 1 : -1)};
    b.castShadow = true;
    boats.push(b);
  }
  return boats;
}

// smoke from chimneys and the camp fire: soft puffs that rise, drift and fade
function smokeSystem(sources) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'),
    grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(235,235,230,0.8)');
  grad.addColorStop(1, 'rgba(235,235,230,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(c);
  const group = new T.Group();
  const puffs = [];
  for (const src of sources)
    for (let i = 0; i < 6; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({map: tex, transparent: true, depthWrite: false}));
      s.userData = {src, life: i / 6};
      group.add(s);
      puffs.push(s);
    }
  return {
    group,
    update(dt) {
      for (const s of puffs) {
        const u = s.userData;
        u.life = (u.life + dt * 0.18) % 1;
        s.position.set(u.src.x + u.life * 3, u.src.y + u.life * 7, u.src.z - u.life * 1.5);
        const k = 0.6 + u.life * 2.4;
        s.scale.set(k, k, 1);
        s.material.opacity = Math.sin(u.life * Math.PI) * 0.55;
      }
    },
  };
}

export function buildProps(field) {
  const group = new T.Group();
  const {group: roadGroup, roads} = buildRoads(field);
  const trees = plantTrees(field, roads);
  const towns = buildSettlements(field);
  const clouds = buildClouds();
  const gulls = buildGulls();
  const boats = buildBoats();
  const smoke = smokeSystem(towns.chimneys);
  group.add(roadGroup, trees.group, towns.group, clouds, smoke.group, ...gulls, ...boats);
  const v = new T.Vector3();
  function update(dt, t, camera) {
    // clouds drift east and wrap; they thin out as the camera comes down below them
    const show = T.MathUtils.smoothstep(camera.position.y, 70, 160);
    for (const c of clouds.children) {
      c.position.x += dt * 4;
      if (c.position.x > 720) c.position.x -= 1440;
      c.material.opacity = 0.5 * show;
      c.visible = show > 0.02;
    }
    // flags ripple in the wind
    for (const f of towns.flags) {
      const cloth = f.userData.cloth,
        pos = cloth.geometry.attributes.position,
        base = cloth.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        pos.setZ(i, Math.sin(x * 2.2 - t * 5 + f.position.x) * 0.18 * x);
      }
      pos.needsUpdate = true;
    }
    // gulls wheel over the coast, wings beating
    for (const g of gulls) {
      const u = g.userData,
        a = t * u.speed + u.cx;
      g.position.set(u.cx + Math.cos(a) * u.r, u.h, u.cz + Math.sin(a) * u.r);
      g.rotation.y = -a;
      for (const b of u.birds) b.scale.y = 0.4 + Math.abs(Math.sin(t * 6 + b.userData.phase));
    }
    // fishing boats on slow circuits round the island, bobbing
    for (const b of boats) {
      const u = b.userData;
      u.a += u.speed * dt * 4;
      b.position.set(Math.cos(u.a) * u.r, Math.sin(t * 1.4 + u.r) * 0.12, Math.sin(u.a) * u.r * 0.75);
      v.set(-Math.sin(u.a) * u.r, 0, Math.cos(u.a) * u.r * 0.75).multiplyScalar(Math.sign(u.speed));
      b.rotation.y = Math.atan2(-v.z, v.x);
      b.rotation.z = Math.sin(t * 1.1 + u.r) * 0.05;
    }
    smoke.update(dt);
  }
  return {group, roads, update, treeCount: trees.count};
}
