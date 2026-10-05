// Surfaces for rifles whose source files carry no textures (the Bren, the StG 44) and the retro bitmap variant of the
// MCX. The files have no UVs, so each triangle gets a box projection in the laid-out rifle's space (metres, +x muzzle):
// the face's dominant axis picks the plane, so grain runs along the rifle on the sides and the top alike. Textures
// are drawn on canvases at load: greyscale detail around white, so the material colour (and the Workbench's
// finishes) still decides the hue.
//
// config.surface = {
//   base:    spec for every mesh nothing else claims        spec = {name, tex, color, roughness, metalness}
//   parts:   {partId: spec}, by the rifle's part nodes
//   regions: [{min:[x,y,z], max:[x,y,z], spec}], metres on the laid-out rifle: splits meshes by triangle
//   retro:   true, keep each material's colour and give it a chunky dithered bitmap (no filtering, no mipmaps)
// }
// `name` matters: 'h-190' and 'polymer' take the Workbench finishes and wear (rifle-finishes.js).
import * as T from 'three';

const nodeId = n => T.PropertyBinding.sanitizeNodeName(n);
const RETRO_TILE = 0.32; // metres per 32-px bitmap: 1 cm texels, chunky at arm's length
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

// A small seeded value noise, so the textures come out the same on every load.
function noise2(seed) {
  const h = (x, y) => {
    let n = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  return (x, y) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      fx = x - xi,
      fy = y - yi,
      sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi),
      b = h(xi + 1, yi),
      c = h(xi, yi + 1),
      d = h(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

// Greyscale painters: (x, y) in texels -> 0..1. Tileable enough at these sizes for flat-shaded low-poly.
const PAINT = {
  steel: (n, m) => (x, y) => 0.82 + 0.1 * n(x / 9, y / 9) + 0.06 * m(x / 1.5, y / 40) - 0.05 * (m(x / 3, y / 3) > 0.86 ? 1 : 0),
  wood: (n, m) => (x, y) => {
    const ring = Math.sin((y + 9 * n(x / 60, y / 14)) * 0.55) * 0.5 + 0.5;
    return 0.6 + 0.26 * ring ** 3 + 0.12 * m(x / 3, y / 0.8) + 0.06 * n(x / 20, y / 3);
  },
  bakelite: (n, m) => (x, y) => 0.7 + 0.22 * n(x / 14, y / 14) + 0.08 * m(x / 3, y / 3),
};

const cache = new Map();
/** A canvas texture: kind (steel, wood, bakelite), retro = 32-px dithered bitmap. */
export function surfaceTexture(kind, retro = false) {
  const key = kind + (retro ? ':retro' : '');
  if (cache.has(key)) return cache.get(key);
  const size = retro ? 32 : 256,
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'),
    img = ctx.createImageData(size, size),
    paint = PAINT[kind] || PAINT.steel;
  const f = paint(noise2(kind.length * 7 + 1), noise2(kind.length * 13 + 5));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v;
      if (retro) {
        // four shades, ordered dither, a darker seam every 16 px and a lit edge above it: a 90s bitmap
        const s = f(x * 8, y * 8);
        const level = Math.min(3, Math.floor(((s - 0.55) / 0.45) * 4 + BAYER[(y % 4) * 4 + (x % 4)] - 0.5));
        v = [0.58, 0.72, 0.86, 1][Math.max(0, level)];
        if (y % 16 === 15) v *= 0.62;
        else if (y % 16 === 0) v = Math.min(1, v * 1.12);
        if (x % 16 === 7 && y % 16 === 4) v *= 0.55; // a rivet
      } else v = f(x, y);
      const c = Math.round(Math.min(1, Math.max(0, v)) * 255),
        i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.colorSpace = T.SRGBColorSpace;
  if (retro) {
    tex.magFilter = tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
  } else tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const material = (spec, retro) =>
  new T.MeshStandardMaterial({
    name: spec.name || spec.tex,
    color: spec.color || '#ffffff',
    roughness: spec.roughness ?? (retro ? 0.85 : 0.6),
    metalness: spec.metalness ?? (retro ? 0.15 : 0.5),
    map: surfaceTexture(spec.tex || 'steel', retro),
    flatShading: retro,
  });

// Box-projected UVs, one plane per triangle, in model metres; `tile` metres per texture repeat.
function boxUV(geometry, toModel, tile) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const p = g.attributes.position,
    uv = new Float32Array(p.count * 2),
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3(),
    n = new T.Vector3(),
    e = new T.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i).applyMatrix4(toModel);
    b.fromBufferAttribute(p, i + 1).applyMatrix4(toModel);
    c.fromBufferAttribute(p, i + 2).applyMatrix4(toModel);
    n.subVectors(b, a).cross(e.subVectors(c, a));
    const ax = Math.abs(n.x),
      ay = Math.abs(n.y),
      az = Math.abs(n.z);
    for (const [k, v] of [a, b, c].entries()) {
      const [u, w] = ax >= ay && ax >= az ? [v.z, v.y] : ay >= az ? [v.x, v.z] : [v.x, v.y];
      uv[(i + k) * 2] = u / tile;
      uv[(i + k) * 2 + 1] = w / tile;
    }
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return g;
}

// Split a (non-indexed) geometry by which region each triangle's centre falls in: [[geometry, spec, region|null]].
function split(geometry, toModel, regions, fallback) {
  const p = geometry.attributes.position,
    groups = new Map(),
    v = new T.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    // a triangle belongs to a region when all three corners are inside it (give or take `slack`, 3 cm by default):
    // a barrel's long triangles that only pass through a handguard's box stay with the rifle
    const corners = [0, 1, 2].map(k =>
      v
        .fromBufferAttribute(p, i + k)
        .applyMatrix4(toModel)
        .clone(),
    );
    const inside = (r, q) => {
      const e = r.slack ?? 0.03;
      return r.min.every((m, k) => q.getComponent(k) >= m - e) && r.max.every((m, k) => q.getComponent(k) <= m + e);
    };
    const r = regions.find(r => corners.every(q => inside(r, q))) || null;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  if (!groups.has(null)) groups.set(null, []); // the mesh itself keeps whatever no region takes (maybe nothing)
  return [...groups].map(([r, starts]) => {
    const g = new T.BufferGeometry();
    for (const [name, at] of Object.entries(geometry.attributes)) {
      const arr = new at.array.constructor(starts.length * 3 * at.itemSize);
      starts.forEach((s, j) => arr.set(at.array.subarray(s * at.itemSize, (s + 3) * at.itemSize), j * 3 * at.itemSize));
      g.setAttribute(name, new T.BufferAttribute(arr, at.itemSize, at.normalized));
    }
    return [g, r ? r.spec : fallback, r];
  });
}

/** Retro bitmaps over an attachment (or any object on the rifle), keeping its colours. Each mesh once. */
export function paintRetro(object, model) {
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert();
  object.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.retro) return;
    mesh.userData.retro = true;
    const old = mesh.material;
    mesh.geometry = boxUV(mesh.geometry, inverse.clone().multiply(mesh.matrixWorld), RETRO_TILE);
    mesh.material = material(
      {name: old.name, tex: 'steel', color: old.color, roughness: 0.85, metalness: Math.min(old.metalness, 0.25)},
      true,
    );
    if (old.transparent) Object.assign(mesh.material, {transparent: true, opacity: old.opacity});
    if (old.emissive) mesh.material.emissive.copy(old.emissive);
  });
}

/** Paint a laid-out rifle model (rifle-instance.js) by its config.surface. */
export function paintSurface(model, config) {
  const s = config.surface,
    retro = !!s.retro,
    tile = retro ? RETRO_TILE : 0.25;
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert(),
    owner = new Map(); // mesh -> spec, from the parts
  for (const [partId, spec] of Object.entries(s.parts || {})) {
    const part = config.parts.find(p => p.id === partId);
    for (const n of part?.nodes || []) model.getObjectByName(nodeId(n))?.traverse(o => o.isMesh && owner.set(o, spec));
  }
  if (retro && !s.base) return paintRetro(model, model); // keep the model's own colours: a bitmap over each material
  const meshes = [];
  model.traverse(o => o.isMesh && meshes.push(o));
  const made = new Map();
  const mat = spec => made.get(spec) || made.set(spec, material(spec, retro)).get(spec);
  for (const mesh of meshes) {
    const toModel = inverse.clone().multiply(mesh.matrixWorld);
    const geometry = boxUV(mesh.geometry, toModel, tile);
    const fallback = owner.get(mesh) || s.base;
    const pieces = !owner.has(mesh) && s.regions?.length ? split(geometry, toModel, s.regions, fallback) : [[geometry, fallback, null]];
    const [[first, firstSpec], ...rest] = pieces.sort((a, b) => (a[2] ? 1 : 0) - (b[2] ? 1 : 0)); // unclaimed first
    mesh.geometry = first;
    mesh.material = mat(firstSpec);
    for (const [g, spec, region] of rest) {
      const piece = new T.Mesh(g, mat(spec));
      piece.name = mesh.name + ':' + (spec.name || spec.tex);
      piece.castShadow = piece.receiveShadow = true;
      mesh.add(piece);
      if (region?.node) {
        // a region that is a part of its own (the StG's butt, grip, handguard): gather its pieces in one named node
        let node = model.getObjectByName(region.node);
        if (!node) {
          node = new T.Group();
          node.name = region.node;
          model.add(node);
        }
        node.attach(piece);
      }
    }
  }
}
