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
if (joints.length !== oldBones.length + 30) throw Error('Recon v2 must add exactly thirty finger joints');
for (const old of oldBones) {
  const joint = joints.find(n => n.getName() === old.getName());
  if (
    !joint ||
    old.getParentNode()?.getName() !== joint.getParentNode()?.getName() ||
    joint.getMatrix().some((v, i) => Math.abs(v - old.getMatrix()[i]) > 1e-5)
  )
    throw Error('Skeleton contract changed: ' + old.getName());
}
const additions = joints.filter(joint => !oldBones.some(old => old.getName() === joint.getName()));
for (const joint of additions) {
  const match = /^(thumb|index|middle|ring|pinky)_0([123])_([lr])$/.exec(joint.getName());
  if (!match) throw Error('Unexpected skeleton addition ' + joint.getName());
  const parent = match[2] === '1' ? `hand_${match[3]}` : `${match[1]}_0${Number(match[2]) - 1}_${match[3]}`;
  if (joint.getParentNode()?.getName() !== parent) throw Error('Incorrect finger parent ' + joint.getName());
}
fs.writeFileSync(
  output.replace('.glb', '.rig.json'),
  JSON.stringify(
    {
      version: 2,
      id: 'recon-v2',
      extends: 'recon-v1',
      baselineSha256: sourceHash,
      palmOffsets: {r: [0, 0.078, 0.024], l: [0, 0.078, 0.024]},
      addedBones: additions.map(j => ({name: j.getName(), parent: j.getParentNode().getName(), localMatrix: j.getMatrix()})),
    },
    null,
    1,
  ) + '\n',
);
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
console.log(`Clean foundation: ${manifest.triangles} triangles; 26 baseline joints preserved, 30 finger joints added.`);
