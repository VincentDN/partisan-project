// Import downloaded Sketchfab sources (assets-incoming/<id>/, see sketchfab-fetch.mjs) into assets/models/<dir>/<id>.glb:
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

/** Node tree with mesh triangle counts, for mapping parts. */
function tree(node, depth = 0, out = []) {
  const mesh = node.getMesh();
  const tris = mesh ? mesh.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0) : 0;
  out.push(`${'  '.repeat(depth)}${node.getName() || '(unnamed)'}${tris ? `  [${tris} tris]` : ''}`);
  for (const c of node.listChildren()) tree(c, depth + 1, out);
  return out;
}

export async function importSource(s, {inDir = 'assets-incoming', outRoot = 'assets/models', register = 'assets/register.json'} = {}) {
  const dir = path.join(inDir, s.id);
  const file = ['scene.glb', 'scene.gltf'].map(f => path.join(dir, f)).find(f => fs.existsSync(f));
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
  const b = getBounds(scene);
  const extent = Math.max(...b.max.map((v, i) => v - b.min[i]));
  const scale = s.unit === 'du' ? DU_SCALE : s.length ? s.length / extent : 1;
  const bake = s.dir !== 'weapons';
  if (bake) root.setScale([scale, scale, scale]);
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
    const entry = {id: s.id, label: s.name, path: out.split(path.sep).join('/'), triangles: Math.round(tris)};
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
