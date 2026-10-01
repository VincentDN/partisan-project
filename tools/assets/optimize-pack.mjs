// Optimise an extension pack (GLB with the shared armature + new SK_* meshes): matte materials,
// meshopt, names meshes after nodes, writes <out>.manifest.json. UVs are kept even when the pack's own material
// has no texture, because colour zones apply generated textures at runtime. Materials are authored in linear
// already, so unlike optimize-operator.mjs there is no colour correction. Materials are never merged.
//   node tools/assets/optimize-pack.mjs in.glb out.glb
import {NodeIO, PropertyType} from '@gltf-transform/core';
import {EXTMeshoptCompression, KHRMaterialsSpecular, KHRMaterialsIOR} from '@gltf-transform/extensions';
import {prune, dedup, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs';
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: optimize-pack.mjs in.glb out.glb');
  process.exit(1);
}
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMaterialsSpecular, KHRMaterialsIOR])
  .registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
const doc = await io.read(input),
  root = doc.getRoot();
for (const n of root.listNodes()) if (n.getMesh()) n.getMesh().setName(n.getName());
for (const m of root.listMaterials()) {
  m.setRoughnessFactor(0.92).setMetallicFactor(0);
  for (const e of [KHRMaterialsSpecular, KHRMaterialsIOR]) m.setExtension(e.EXTENSION_NAME, null);
}
await doc.transform(
  prune({keepAttributes: true}),
  dedup({propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH]}),
  meshopt({encoder: MeshoptEncoder, level: 'medium'}),
);
for (const ext of root.listExtensionsUsed()) if (ext.extensionName !== 'EXT_meshopt_compression') ext.dispose();
fs.mkdirSync(output.replace(/[^/]+$/, '') || '.', {recursive: true});
await io.write(output, doc);
const meshes = root
  .listNodes()
  .filter(n => n.getMesh())
  .map(n => {
    const prims = n.getMesh().listPrimitives();
    return {
      node: n.getName(),
      triangles: prims.reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0),
      materials: [...new Set(prims.map(p => p.getMaterial()?.getName()))],
    };
  });
const manifest = {
  generated: new Date().toISOString().slice(0, 10),
  triangles: meshes.reduce((s, m) => s + m.triangles, 0),
  bones:
    root
      .listSkins()[0]
      ?.listJoints()
      .map(j => j.getName()) ?? [],
  meshes,
  materials: root.listMaterials().map(m => ({
    name: m.getName(),
    baseColor: m
      .getBaseColorFactor()
      .slice(0, 3)
      .map(v => +v.toFixed(3)),
    textured: !!m.getBaseColorTexture(),
  })),
};
fs.writeFileSync(output.replace(/\.glb$/, '.manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`${output}: ${(fs.statSync(output).size / 1024).toFixed(0)} KB, ${manifest.triangles} triangles, ${meshes.length} meshes`);
