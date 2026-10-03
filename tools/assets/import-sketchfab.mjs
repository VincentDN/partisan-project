// Import downloaded Sketchfab sources (assets-incoming/<id>/ or inbound/sketchfab/<id>/) into assets/models/<dir>/<id>.glb:
// optimise (prune, dedupe, meshopt), register the triangle count, and print the node tree so the parts can be mapped in
// workbench/models.js. Weapons keep their source units (the Workbench scales them at runtime: paste the printed
// `scale` into the models.js entry, like the AK-74M's); props, vehicles and environment pieces get real size baked in.
//   node tools/assets/import-sketchfab.mjs              (every source present in assets-incoming/)
//   node tools/assets/import-sketchfab.mjs g3 m16       (just these)
import fs from 'node:fs';
import path from 'node:path';
import {NodeIO, PropertyType} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune, dedup, meshopt, getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';

// D_U's models share one unit: his AK-74M is 9.088 units long and 0.943 m in reality (workbench/models.js SCALE).
export const DU_SCALE = 0.943 / 9.088;

const {sources} = JSON.parse(fs.readFileSync(new URL('./sketchfab-sources.json', import.meta.url), 'utf8'));
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});

const triangles = doc =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap(m => m.listPrimitives())
    .reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);

const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Skinned downloads (FBX exports with an armature) keep their vertices in bone space, so size and position only
 * make sense after skinning. Bake the bind pose into static meshes: vertices go to scene space, the skin goes,
 * and the mesh node moves under `root` with an identity transform. Returns how many nodes were baked.
 */
export function bakeSkins(doc, root, scene) {
  let n = 0;
  for (const node of doc.getRoot().listNodes()) {
    const skin = node.getSkin(),
      mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const ibm = skin.getInverseBindMatrices()?.getArray();
    const jm = skin.listJoints().map((j, i) => mul(j.getWorldMatrix(), ibm ? Array.from(ibm.subarray(i * 16, i * 16 + 16)) : IDENTITY));
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'),
        nor = prim.getAttribute('NORMAL'),
        jn = prim.getAttribute('JOINTS_0'),
        wt = prim.getAttribute('WEIGHTS_0');
      if (!pos || !jn || !wt) continue;
      const p = [0, 0, 0],
        nv = [0, 0, 0],
        j4 = [0, 0, 0, 0],
        w4 = [0, 0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p);
        nor?.getElement(i, nv);
        jn.getElement(i, j4);
        wt.getElement(i, w4);
        const m = new Array(16).fill(0);
        for (let k = 0; k < 4; k++) if (w4[k]) for (let e = 0; e < 16; e++) m[e] += w4[k] * jm[j4[k]][e];
        pos.setElement(i, [
          m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
          m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
          m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
        ]);
        if (nor) {
          const x = m[0] * nv[0] + m[4] * nv[1] + m[8] * nv[2],
            y = m[1] * nv[0] + m[5] * nv[1] + m[9] * nv[2],
            z = m[2] * nv[0] + m[6] * nv[1] + m[10] * nv[2],
            l = Math.hypot(x, y, z) || 1;
          nor.setElement(i, [x / l, y / l, z / l]);
        }
      }
      prim.setAttribute('JOINTS_0', null);
      prim.setAttribute('WEIGHTS_0', null);
    }
    node.setSkin(null);
    node.setMatrix(IDENTITY);
    (node.getParentNode() || scene).removeChild(node);
    root.addChild(node);
    n++;
  }
  return n;
}

/** Node tree with mesh triangle counts, for mapping parts. */
function tree(node, depth = 0, out = []) {
  const mesh = node.getMesh();
  const tris = mesh ? mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0) : 0;
  out.push(`${'  '.repeat(depth)}${node.getName() || '(unnamed)'}${tris ? `  [${tris} tris]` : ''}`);
  for (const c of node.listChildren()) tree(c, depth + 1, out);
  return out;
}

// Downloads land in assets-incoming/ (sketchfab-fetch.mjs, in a session with the token) or in inbound/sketchfab/
// (sketchfab-bulk-download.py, run on the owner's computer and pushed).
const IN_DIRS = ['assets-incoming', 'inbound/sketchfab'];

export async function importSource(s, {inDir = null, outRoot = 'assets/models', register = 'assets/register.json'} = {}) {
  const file = (inDir ? [inDir] : IN_DIRS)
    .flatMap(d => ['scene.glb', 'scene.gltf'].map(f => path.join(d, s.id, f)))
    .find(f => fs.existsSync(f));
  if (!file) return {id: s.id, skipped: 'not downloaded'};
  const doc = await io.read(file);
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  // Wrap the scene in one root so the scale applies once and every source node keeps its own name and transform.
  const root = doc.createNode(`${s.id} root`);
  for (const n of scene.listChildren()) {
    scene.removeChild(n);
    root.addChild(n);
  }
  scene.addChild(root);
  bakeSkins(doc, root, scene);
  // Loose spare magazines and rounds lying beside the rifle: drop them so they neither show nor skew the size.
  for (const n of doc.getRoot().listNodes()) if ((s.strip || []).includes(n.getName())) n.dispose();
  const b = getBounds(scene);
  const extent = Math.max(...b.max.map((v, i) => v - b.min[i]));
  const scale = s.unit === 'du' ? DU_SCALE : s.length ? s.length / extent : 1;
  const bake = s.dir !== 'weapons';
  if (bake) root.setScale([scale, scale, scale]);
  // Untextured white materials (some downloads ship unpainted) take the source's `tint` so they do not render as chalk.
  if (s.tint) {
    const c = [1, 2, 3].map(i => parseInt(s.tint.slice(i * 2 - 1, i * 2 + 1), 16) / 255);
    for (const m of doc.getRoot().listMaterials())
      if (
        !m.getBaseColorTexture() &&
        m
          .getBaseColorFactor()
          .slice(0, 3)
          .every(v => v > 0.9)
      )
        m.setBaseColorFactor([...c.map(v => v ** 2.2), 1]);
  }
  for (const m of doc.getRoot().listMaterials()) m.setRoughnessFactor(Math.max(m.getRoughnessFactor(), 0.6)); // matte, like the rest
  await doc.transform(
    prune(),
    dedup({propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE]}),
    meshopt({encoder: MeshoptEncoder, level: 'medium'}),
  );
  const out = path.join(outRoot, s.dir || 'weapons', `${s.id}.glb`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  await io.write(out, doc);
  const tris = triangles(doc);
  const size = +(extent * scale).toFixed(3);
  if (register && fs.existsSync(register)) {
    const reg = JSON.parse(fs.readFileSync(register, 'utf8'));
    const list = Array.isArray(reg) ? reg : reg.assets || reg.models || Object.values(reg).find(Array.isArray);
    const kind = {weapons: 'weapon', props: 'prop', vehicles: 'vehicle', environment: 'environment'}[s.dir || 'weapons'];
    const entry = {
      id: s.id,
      label: s.name,
      path: out.split(path.sep).join('/'),
      kind,
      status: 'real',
      author: s.author,
      source: `https://sketchfab.com/3d-models/${s.uid}`,
      budget: {triangles: Math.ceil((tris * 1.25) / 1000) * 1000},
    };
    const i = list.findIndex(e => e.id === s.id);
    if (i >= 0) Object.assign(list[i], entry);
    else list.push(entry);
    fs.writeFileSync(register, JSON.stringify(reg, null, 1) + '\n');
  }
  return {id: s.id, out, tris: Math.round(tris), size, scale: bake ? 1 : +scale.toPrecision(6), tree: tree(root)};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const wanted = process.argv.slice(2);
  for (const s of wanted.length ? sources.filter(x => wanted.includes(x.id)) : sources) {
    const r = await importSource(s);
    if (r.skipped) {
      if (wanted.length) console.log(`skip  ${s.id}: ${r.skipped}`);
      continue;
    }
    console.log(
      `ok    ${r.id} -> ${r.out}  ${r.tris} tris, ${r.size} m longest side${r.scale !== 1 ? `, models.js scale: ${r.scale}` : ''}`,
    );
    console.log(r.tree.map(l => '      ' + l).join('\n'));
  }
}
