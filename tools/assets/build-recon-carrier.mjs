// Build the fitted lightweight carrier pack and asset-backed CM4 definitions without changing the Recon body.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {resolveAssembly} from '../../operator/assembly.js';
const output = 'assets/models/operators/recon-carrier.glb',
  bodyPath = 'assets/models/operators/recon-modular.glb';
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bodyHash = hash(bodyPath);
fs.mkdirSync('build', {recursive: true});
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder': MeshoptDecoder});
const body = await io.read(bodyPath);
const decoded = body;
for (const extension of decoded.getRoot().listExtensionsUsed())
  if (extension.extensionName === 'EXT_meshopt_compression') extension.dispose();
await io.write('build/recon-carrier-body.glb', decoded);
execFileSync(
  process.env.BLENDER || 'blender',
  ['--background', '--python-exit-code', '1', '--python', 'tools/assets/build-recon-carrier.py'],
  {stdio: 'inherit'},
);
execFileSync(process.execPath, ['tools/assets/optimize-pack.mjs', 'build/recon-carrier.raw.glb', output], {stdio: 'inherit'});
const pack = await io.read(output);
const bones = body.getRoot().listSkins()[0].listJoints();
for (const joint of pack.getRoot().listSkins()[0].listJoints()) {
  const baseline = bones.find(b => b.getName() === joint.getName());
  if (
    !baseline ||
    baseline.getParentNode()?.getName() !== joint.getParentNode()?.getName() ||
    baseline.getMatrix().some((v, i) => Math.abs(v - joint.getMatrix()[i]) > 1e-5)
  )
    throw Error('Carrier changed rest frame ' + joint.getName());
}
const manifest = JSON.parse(fs.readFileSync(output.replace('.glb', '.manifest.json')));
const foundation = JSON.parse(fs.readFileSync(bodyPath.replace('.glb', '.manifest.json')));
const report = JSON.parse(fs.readFileSync('build/recon-carrier-report.json'));
if (manifest.triangles > 1700 || report.meshes.some(m => m.boundaryEdges)) throw Error('Carrier exceeds allocation or has open surfaces');
if (hash(bodyPath) !== bodyHash) throw Error('Body changed');
const common = {
  skeletonId: 'recon-v1',
  fitProfile: 'recon-standard',
  footprint: [1, 1],
  excludes: [],
  coverage: [],
  materialRegions: ['fabric', 'webbing', 'hardware'],
  mounts: [],
  depth: 0,
};
const socket = (id, type) => ({id, type, kind: 'socket', position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: 1, depthRange: [0, 0]});
const grid = (id, z, y) => ({
  ...socket(id, 'webbing'),
  kind: 'grid',
  position: [z < 0 ? 0.0975 : -0.0975, y, z],
  columns: 6,
  rows: 3,
  spacing: [0.039, 0.039],
  depthRange: [0, 0.01],
  quaternion: z < 0 ? [0, 1, 0, 0] : [0, 0, 0, 1],
});
const catalogue = [
  {
    ...common,
    id: 'body.recon',
    family: 'body',
    owner: [],
    mountType: null,
    skeletonId: 'recon-v2',
    complete: true,
    compatibleSkeletons: ['recon-v1'],
    coverageRegions: [],
    triangleCount: foundation.triangles,
    mounts: [socket('chest', 'carrier')],
    geometry: {model: 'recon-modular.glb'},
  },
  {
    ...common,
    id: 'carrier.light',
    family: 'carrier',
    owner: ['body'],
    mountType: 'carrier',
    triangleCount: manifest.triangles,
    mounts: [socket('placard', 'light-placard'), grid('rear', -0.214, 1.206)],
    geometry: {
      model: 'recon-carrier.glb',
      nodes: manifest.meshes.map(m => m.node).filter(n => n !== 'SK_LC_Placard'),
      loadedTriangles: manifest.triangles,
    },
  },
  {
    ...common,
    id: 'carrier.light.placard',
    family: 'placard',
    owner: ['carrier'],
    mountType: 'light-placard',
    triangleCount: 0,
    mounts: [grid('front', 0.235, 1.182)],
    geometry: {model: 'recon-carrier.glb', nodes: ['SK_LC_Placard'], sharedOwnerAsset: true},
  },
];
const item = (id, itemId, parentId, mount) => ({id, itemId, parentId, mount, cell: [0, 0]});
const outfits = {bare: {version: 1, rootId: 'body', instances: [item('body', 'body.recon', null, null)]}};
outfits.light = {...outfits.bare, instances: [...outfits.bare.instances, item('carrier', 'carrier.light', 'body', 'chest')]};
outfits.placard = {
  ...outfits.light,
  instances: [...outfits.light.instances, item('placard', 'carrier.light.placard', 'carrier', 'placard')],
};
for (const outfit of Object.values(outfits)) {
  const r = resolveAssembly(catalogue, outfit);
  if (!r.ok) throw Error(JSON.stringify(r.errors));
}
fs.writeFileSync('operator/recon-carrier.json', JSON.stringify({version: 1, catalogue, outfits}, null, 1) + '\n');
fs.writeFileSync(
  output.replace('.glb', '.fit.json'),
  JSON.stringify(
    {
      ...report,
      bodySha256: bodyHash,
      modelSha256: hash(output),
      triangles: manifest.triangles,
      mountSpace: 'parent asset rest coordinates; pouch skin binding follows in CM6',
      budget:
        'Carrier cost includes every loaded mesh, including hidden placard. The placard is a shared owner-asset selection with zero additional geometry cost.',
    },
    null,
    1,
  ) + '\n',
);
console.log(`Carrier: ${manifest.triangles} triangles; body + loaded pack: ${manifest.triangles + foundation.triangles}.`);
