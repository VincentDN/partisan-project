// Step 2 of the Base Operator pipeline: raw GLB (from export-operator.py) -> shipped GLB.
//   - names the 21 modular meshes after their SK_* nodes (Blender keeps those on the node, not the mesh)
//   - makes materials matte (flat-shaded look), removes the unused default material
//   - meshopt-compresses geometry (materials are NEVER merged: they are the identity of the colour zones;
//     dedup() would silently fuse M_Mask_Strap into M_Glove_Strap and the two camo fabrics into one)
//   - writes a manifest of nodes, materials, bones and triangle counts for tests and docs
// Usage: node tools/assets/optimize-operator.mjs [in.glb] [out.glb]
import {NodeIO, PropertyType} from '@gltf-transform/core';
import {EXTMeshoptCompression, KHRMaterialsSpecular, KHRMaterialsIOR} from '@gltf-transform/extensions';
import {prune, dedup, meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder, MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs';

const input = process.argv[2] || 'build/base-operator.raw.glb';
const output = process.argv[3] || 'assets/models/operators/base-operator.glb';

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMaterialsSpecular, KHRMaterialsIOR])
  .registerDependencies({'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder});
const doc = await io.read(input);
const root = doc.getRoot();

for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (mesh) mesh.setName(node.getName());
}
// Colour correction. The Blender file stores base colours at 1/0.8 of the values the pack's FBX
// carries (its importer divides by the FBX diffuse factor), and the FBX values are authored as
// sRGB. Shipping the Blender values as linear would make everything ~2x too light (pale pouches,
// grey gloves), so convert: linear = srgbToLinear(0.8 * blenderValue). Verified against the FBX
// hex colours (e.g. M_Pouch 0.54 -> #6e6f43, M_Head 0.694 -> #8e6f61). Textured materials
// (camo top and trousers) keep their texture untouched.
const srgbToLinear = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
for (const m of root.listMaterials()) {
  if (!m.getBaseColorTexture()) {
    const [r, g, b, a] = m.getBaseColorFactor();
    m.setBaseColorFactor([srgbToLinear(r * 0.8), srgbToLinear(g * 0.8), srgbToLinear(b * 0.8), a]);
  }
  m.setRoughnessFactor(0.92).setMetallicFactor(/Metal/.test(m.getName()) ? 0.45 : 0);
  // The pack ships Blender's specular/IOR extras; flat-shaded low poly does not need them.
  for (const ext of [KHRMaterialsSpecular, KHRMaterialsIOR]) m.setExtension(ext.EXTENSION_NAME, null);
}
await doc.transform(prune(), dedup({propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE]}), meshopt({encoder: MeshoptEncoder, level: 'medium'}));
for (const ext of root.listExtensionsUsed()) if (ext.extensionName !== 'EXT_meshopt_compression') ext.dispose();

fs.mkdirSync(output.replace(/[^/]+$/, ''), {recursive: true});
await io.write(output, doc);

const meshes = root.listNodes().filter(n => n.getMesh()).map(n => {
  const prims = n.getMesh().listPrimitives();
  const tris = prims.reduce((s, p) => s + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
  return {node: n.getName(), triangles: tris, materials: [...new Set(prims.map(p => p.getMaterial()?.getName()))]};
});
const manifest = {
  source: 'Low_Poly_US_Soldier (purchased asset; see assets/REGISTER.md)',
  generated: new Date().toISOString().slice(0, 10),
  units: 'node scale 0.01 on Armature (cm source); height ~1.85 m after scale',
  triangles: meshes.reduce((s, m) => s + m.triangles, 0),
  bones: root.listSkins()[0].listJoints().map(j => j.getName()),
  meshes,
  materials: root.listMaterials().map(m => ({name: m.getName(), baseColor: m.getBaseColorFactor().slice(0, 3).map(v => +v.toFixed(3)), textured: !!m.getBaseColorTexture()})),
};
fs.writeFileSync(output.replace(/\.glb$/, '.manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`${output}: ${(fs.statSync(output).size / 1024).toFixed(0)} KB, ${manifest.triangles} triangles, ${manifest.bones.length} bones, ${meshes.length} meshes`);
