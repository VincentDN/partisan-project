// Rebuild the independent CM2 clothing asset from the pinned Recon baseline, preserving all existing source assets.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const source = 'assets/models/operators/generated-recon.glb';
const output = 'assets/models/operators/recon-modular.glb';
const digest = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const contract = JSON.parse(fs.readFileSync('tools/assets/recon-modular-contract.json'));
const sourceHash = digest(source);
if (sourceHash !== contract.skeleton.baselineSha256) throw Error('Canonical Recon baseline changed; reconcile its contract first.');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const baseline = await io.read(source);
for (const extension of baseline.getRoot().listExtensionsUsed())
  if (extension.extensionName === 'EXT_meshopt_compression') extension.dispose();
fs.mkdirSync('build', {recursive: true});
await io.write('build/recon-baseline.glb', baseline);
execFileSync(
  process.env.BLENDER || 'blender',
  ['--background', '--python-exit-code', '1', '--python', 'tools/assets/build-recon-foundation.py'],
  {stdio: 'inherit'},
);
execFileSync(process.execPath, ['tools/assets/optimize-pack.mjs', 'build/recon-foundation.raw.glb', output], {stdio: 'inherit'});
const result = await io.read(output);
const oldBones = baseline.getRoot().listSkins()[0].listJoints();
const joints = result.getRoot().listSkins()[0].listJoints();
if (joints.length !== oldBones.length) throw Error('Skeleton joint count changed');
for (const joint of joints) {
  const old = oldBones.find(n => n.getName() === joint.getName());
  if (
    !old ||
    old.getParentNode()?.getName() !== joint.getParentNode()?.getName() ||
    joint.getMatrix().some((v, i) => Math.abs(v - old.getMatrix()[i]) > 1e-5)
  )
    throw Error('Skeleton contract changed: ' + joint.getName());
}
if (digest(source) !== sourceHash) throw Error('Existing Recon was modified');
const report = JSON.parse(fs.readFileSync('build/recon-foundation-report.json'));
const manifest = JSON.parse(fs.readFileSync(output.replace('.glb', '.manifest.json')));
if (manifest.triangles > contract.budget.allocation.bodyClothing) throw Error('Foundation exceeds the body allocation');
if (report.triangles !== manifest.triangles) throw Error('Exporter changed topology; inspect Blender validation warnings');
fs.writeFileSync(
  output.replace('.glb', '.foundation.json'),
  JSON.stringify(
    {
      ...report,
      coordinates: 'Blender authoring: +Z up, -Y forward; metres',
      source,
      sourceSha256: sourceHash,
      modelSha256: digest(output),
      runtimeTriangles: manifest.triangles,
    },
    null,
    1,
  ) + '\n',
);
console.log(`Clean foundation: ${manifest.triangles} triangles; all 26 baseline joints preserved.`);
