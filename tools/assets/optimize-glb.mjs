// Generic GLB optimiser for imported assets: prune, dedupe, matte materials, meshopt-compress.
// Usage: node tools/assets/optimize-glb.mjs in.glb out.glb
import {NodeIO, PropertyType} from '@gltf-transform/core';
import {EXTMeshoptCompression, KHRMaterialsSpecular, KHRMaterialsIOR} from '@gltf-transform/extensions';
import {prune, dedup, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs';
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node tools/assets/optimize-glb.mjs in.glb out.glb');
  process.exit(1);
}
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMaterialsSpecular, KHRMaterialsIOR])
  .registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
const doc = await io.read(input);
for (const m of doc.getRoot().listMaterials()) {
  for (const ext of [KHRMaterialsSpecular, KHRMaterialsIOR]) m.setExtension(ext.EXTENSION_NAME, null);
  m.setRoughnessFactor(Math.max(m.getRoughnessFactor(), 0.6));
}
await doc.transform(
  prune(),
  dedup({propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE]}),
  meshopt({encoder: MeshoptEncoder, level: 'medium'}),
);
for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName !== 'EXT_meshopt_compression') ext.dispose();
fs.mkdirSync(output.replace(/[^/]+$/, '') || '.', {recursive: true});
await io.write(output, doc);
const tris = doc
  .getRoot()
  .listMeshes()
  .flatMap(m => m.listPrimitives())
  .reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
console.log(`${output}: ${(fs.statSync(output).size / 1024).toFixed(0)} KB, ${tris} triangles`);
