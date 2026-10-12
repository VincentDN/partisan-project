// Build mount-local pouch templates and measured CM4 definitions, preserving the carrier and body.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const sources = ['recon-modular', 'recon-carrier'].map(n => `assets/models/operators/${n}.glb`);
const before = sources.map(hash),
  output = 'assets/models/operators/recon-pouches.glb';
execFileSync(
  process.env.BLENDER || 'blender',
  ['--background', '--python-exit-code', '1', '--python', 'tools/assets/build-recon-pouches.py'],
  {stdio: 'inherit'},
);
execFileSync(process.execPath, ['tools/assets/optimize-pack.mjs', 'build/recon-pouches.raw.glb', output], {stdio: 'inherit'});
const manifest = JSON.parse(fs.readFileSync(output.replace('.glb', '.manifest.json')));
const report = JSON.parse(fs.readFileSync('build/recon-pouches-report.json'));
if (report.some(m => m.boundaryEdges || m.degenerateTriangles) || manifest.triangles > 1400) throw Error('Pouch topology/budget failed');
if (sources.some((p, i) => hash(p) !== before[i])) throw Error('Changed source geometry');
const catalogue = manifest.meshes.map(m => ({
  id: m.node.replace('Pouch_', 'pouch.'),
  family: 'pouch',
  owner: ['carrier', 'placard'],
  mountType: 'webbing',
  skeletonId: 'recon-v1',
  fitProfile: 'recon-standard',
  footprint: [2, 3],
  depth: 0,
  excludes: [],
  coverage: [],
  materialRegions: ['fabric', 'trim', 'hardware'],
  mounts: [],
  triangleCount: m.triangles,
  geometry: {model: 'recon-pouches.glb', node: m.node, space: 'mount-local'},
}));
fs.writeFileSync('operator/recon-pouches.json', JSON.stringify({version: 1, catalogue}, null, 1) + '\n');
fs.writeFileSync(
  output.replace('.glb', '.fit.json'),
  JSON.stringify({version: 1, sourceSha256: before, modelSha256: hash(output), meshes: report}, null, 1) + '\n',
);
console.log(`Pouch templates: ${manifest.triangles} triangles.`);
