// Bake the generated Recon's original colours onto the runtime model.
//
// The textured source (inbound/Models/PARP_Recon_hooded_model_v01_05.glb: one mesh, one baked JPEG) and the split source the
// runtime model is built from (…_splitparts_v01_05.glb) are the same generation, but the split parts carry their own
// 0–1 UVs and no material, so the runtime model came out in flat colours. This bakes the texture across: every part
// gets a tile in one atlas (sized by its surface area), each texel is placed on the runtime surface, and takes the
// colour of the nearest point of the textured source. Every M_GR_* material gets the atlas and a white base colour, so
// the Operator Modder's "Original" zone colour shows the source's look and any other colour still repaints flat.
//
//   node tools/assets/bake-generated-recon.mjs [runtime.glb] [textured-source.glb]
//
// Run after tools/assets/import-generated-recon.py and optimize-pack.mjs (it rewrites the runtime GLB in place).
// The importer maps a source point (x, y, z) (one unit high, centred) to runtime (-1.85 z, 1.85 y + 0.925, 1.85 x);
// the textured source is already 1.85 times the split source, so runtime = (-z, y + 0.925, x) of its world points.
import {NodeIO} from '@gltf-transform/core';
import {EXTMeshoptCompression} from '@gltf-transform/extensions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const [runtimePath = 'assets/models/operators/generated-recon.glb', sourcePath = 'inbound/Models/PARP_Recon_hooded_model_v01_05.glb'] =
  process.argv.slice(2);
const SIZE = 2048,
  PAD = 4;
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression])
  .registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});

// ---------- the textured source: points in runtime space, their UVs, the texture ----------
const src = await io.read(sourcePath);
const srcPrim = src.getRoot().listMeshes()[0].listPrimitives()[0];
const srcNode = src
  .getRoot()
  .listNodes()
  .find(n => n.getMesh());
const M = srcNode.getWorldMatrix();
const srcPos = srcPrim.getAttribute('POSITION'),
  srcUV = srcPrim.getAttribute('TEXCOORD_0'),
  N = srcPos.getCount();
const P = new Float32Array(N * 3),
  UV = new Float32Array(N * 2);
const v = [0, 0, 0],
  t = [0, 0];
for (let i = 0; i < N; i++) {
  srcPos.getElement(i, v);
  const x = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12],
    y = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13],
    z = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14];
  P[i * 3] = -z;
  P[i * 3 + 1] = y + 0.925;
  P[i * 3 + 2] = x;
  srcUV.getElement(i, t);
  UV[i * 2] = t[0];
  UV[i * 2 + 1] = t[1];
}
const tex = srcPrim.getMaterial()?.getBaseColorTexture() || src.getRoot().listTextures()[0];
const {data: img, info} = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({resolveWithObject: true});
function sample(u, w) {
  // bilinear, wrapping like the source
  const x = (((u % 1) + 1) % 1) * info.width - 0.5,
    y = (((w % 1) + 1) % 1) * info.height - 0.5;
  const x0 = Math.floor(x),
    y0 = Math.floor(y),
    fx = x - x0,
    fy = y - y0;
  const px = (xx, yy) =>
    ((((yy % info.height) + info.height) % info.height) * info.width + (((xx % info.width) + info.width) % info.width)) * 3;
  const out = [0, 0, 0];
  for (const [dx, dy, k] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [1, 0, fx * (1 - fy)],
    [0, 1, (1 - fx) * fy],
    [1, 1, fx * fy],
  ]) {
    const o = px(x0 + dx, y0 + dy);
    for (let c = 0; c < 3; c++) out[c] += img[o + c] * k;
  }
  return out;
}

// ---------- nearest source point: a uniform grid ----------
const CELL = 0.012;
const grid = new Map();
const key = (i, j, k) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512); // exact: the model spans a few hundred cells
for (let i = 0; i < N; i++) {
  const k = key(Math.floor(P[i * 3] / CELL), Math.floor(P[i * 3 + 1] / CELL), Math.floor(P[i * 3 + 2] / CELL));
  let list = grid.get(k);
  if (!list) grid.set(k, (list = []));
  list.push(i);
}
function nearest(x, y, z) {
  const ci = Math.floor(x / CELL),
    cj = Math.floor(y / CELL),
    ck = Math.floor(z / CELL);
  let best = -1,
    bd = Infinity;
  for (let r = 1; r <= 6 && best < 0; r++)
    for (let i = ci - r; i <= ci + r; i++)
      for (let j = cj - r; j <= cj + r; j++)
        for (let k = ck - r; k <= ck + r; k++)
          for (const n of grid.get(key(i, j, k)) || []) {
            const d = (P[n * 3] - x) ** 2 + (P[n * 3 + 1] - y) ** 2 + (P[n * 3 + 2] - z) ** 2;
            if (d < bd) {
              bd = d;
              best = n;
            }
          }
  return best;
}

// ---------- the runtime model: one atlas tile per primitive, sized by surface area ----------
/** Column-major 4 x 4 product a x b. */
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const doc = await io.read(runtimePath),
  root = doc.getRoot();
const prims = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  // A skinned mesh ignores its node transform: in the bind pose a vertex sits at jointWorld x inverseBind x position, and
  // the quantized positions (-1..1) are scaled back to metres inside those inverse bind matrices.
  let W = node.getWorldMatrix();
  const skin = node.getSkin();
  if (skin) {
    const ibm = skin.getInverseBindMatrices(),
      m = new Array(16);
    ibm.getElement(0, m);
    W = mul(skin.listJoints()[0].getWorldMatrix(), m);
  }
  for (const prim of mesh.listPrimitives()) {
    const uv = prim.getAttribute('TEXCOORD_0');
    if (!uv) continue;
    const pos = prim.getAttribute('POSITION'),
      idx = prim.getIndices();
    const n = pos.getCount();
    const p = new Float32Array(n * 3),
      u = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      pos.getElement(i, v);
      p[i * 3] = W[0] * v[0] + W[4] * v[1] + W[8] * v[2] + W[12];
      p[i * 3 + 1] = W[1] * v[0] + W[5] * v[1] + W[9] * v[2] + W[13];
      p[i * 3 + 2] = W[2] * v[0] + W[6] * v[1] + W[10] * v[2] + W[14];
      uv.getElement(i, t);
      u[i * 2] = t[0];
      u[i * 2 + 1] = t[1];
    }
    const tris = idx ? Array.from(idx.getArray()) : [...Array(n).keys()];
    let area = 0;
    for (let f = 0; f < tris.length; f += 3) {
      const [a, b, c] = [tris[f], tris[f + 1], tris[f + 2]].map(i => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]);
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      area += 0.5 * Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]);
    }
    prims.push({prim, name: node.getName(), p, u, tris, area});
  }
}
// shelf packing, shrinking until everything fits
const total = prims.reduce((s, q) => s + q.area, 0);
let scale = 1;
for (;;) {
  for (const q of prims) q.size = Math.max(48, Math.min(1024, Math.round(Math.sqrt(q.area / total) * SIZE * 0.95 * scale)));
  const order = [...prims].sort((a, b) => b.size - a.size);
  let x = 0,
    y = 0,
    shelf = 0,
    ok = true;
  for (const q of order) {
    if (x + q.size > SIZE) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    if (y + q.size > SIZE) {
      ok = false;
      break;
    }
    Object.assign(q, {x, y});
    x += q.size;
    shelf = Math.max(shelf, q.size);
  }
  if (ok) break;
  scale *= 0.95;
}

// ---------- bake ----------
const atlas = new Uint8ClampedArray(SIZE * SIZE * 3),
  filled = new Uint8Array(SIZE * SIZE);
let done = 0;
for (const q of prims) {
  if (process.stdout.isTTY || process.env.BAKE_LOG) console.log(`  ${++done}/${prims.length} ${q.name} ${q.size}px`);
  const inner = q.size - PAD * 2;
  const tx = i => q.x + PAD + q.u[i * 2] * inner,
    ty = i => q.y + PAD + q.u[i * 2 + 1] * inner;
  for (let f = 0; f < q.tris.length; f += 3) {
    const [a, b, c] = [q.tris[f], q.tris[f + 1], q.tris[f + 2]];
    const ax = tx(a),
      ay = ty(a),
      bx = tx(b),
      by = ty(b),
      cx = tx(c),
      cy = ty(c);
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-9) continue;
    for (let py = Math.floor(Math.min(ay, by, cy)); py <= Math.ceil(Math.max(ay, by, cy)); py++)
      for (let px = Math.floor(Math.min(ax, bx, cx)); px <= Math.ceil(Math.max(ax, bx, cx)); px++) {
        const sx = px + 0.5,
          sy = py + 0.5;
        const w1 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) / den,
          w2 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) / den,
          w3 = 1 - w1 - w2;
        if (w1 < -0.02 || w2 < -0.02 || w3 < -0.02) continue;
        const x = w1 * q.p[a * 3] + w2 * q.p[b * 3] + w3 * q.p[c * 3],
          y = w1 * q.p[a * 3 + 1] + w2 * q.p[b * 3 + 1] + w3 * q.p[c * 3 + 1],
          z = w1 * q.p[a * 3 + 2] + w2 * q.p[b * 3 + 2] + w3 * q.p[c * 3 + 2];
        const n = nearest(x, y, z);
        if (n < 0 || px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
        const col = sample(UV[n * 2], UV[n * 2 + 1]);
        const o = py * SIZE + px;
        atlas[o * 3] = col[0];
        atlas[o * 3 + 1] = col[1];
        atlas[o * 3 + 2] = col[2];
        filled[o] = 1;
      }
  }
  // the new UVs: the tile, inside its padding
  const out = new Float32Array(q.u.length);
  for (let i = 0; i < q.u.length / 2; i++) {
    out[i * 2] = (q.x + PAD + q.u[i * 2] * inner) / SIZE;
    out[i * 2 + 1] = (q.y + PAD + q.u[i * 2 + 1] * inner) / SIZE;
  }
  q.prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(out).setBuffer(root.listBuffers()[0]));
}
// grow the islands a few texels so mip-mapping never pulls in the empty background
for (let pass = 0; pass < PAD + 2; pass++) {
  const grow = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const o = y * SIZE + x;
      if (filled[o]) continue;
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx,
          yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;
        const k = yy * SIZE + xx;
        if (!filled[k]) continue;
        r += atlas[k * 3];
        g += atlas[k * 3 + 1];
        b += atlas[k * 3 + 2];
        n++;
      }
      if (n) grow.push([o, r / n, g / n, b / n]);
    }
  for (const [o, r, g, b] of grow) {
    atlas[o * 3] = r;
    atlas[o * 3 + 1] = g;
    atlas[o * 3 + 2] = b;
    filled[o] = 1;
  }
}
const jpeg = await sharp(Buffer.from(atlas.buffer), {raw: {width: SIZE, height: SIZE, channels: 3}})
  .jpeg({quality: 82, mozjpeg: true})
  .toBuffer();
const texture = doc.createTexture('GR_albedo').setImage(new Uint8Array(jpeg)).setMimeType('image/jpeg');
for (const m of root.listMaterials()) if (m.getName().startsWith('M_GR_')) m.setBaseColorTexture(texture).setBaseColorFactor([1, 1, 1, 1]);
for (const a of root.listAccessors()) if (!a.listParents().some(p => p !== root)) a.dispose(); // the old UVs
await io.write(runtimePath, doc);
console.log(
  `baked ${prims.length} parts into a ${SIZE}px atlas (${Math.round(jpeg.length / 1024)} KB); ${runtimePath} is now ${Math.round(fs.statSync(runtimePath).size / 1024)} KB`,
);
