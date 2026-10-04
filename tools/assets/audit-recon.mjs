// Measure Recon source topology, preserve an inspection copy, and capture the current/upstream skeleton baselines.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {EXTMeshoptCompression, KHRMaterialsIOR, KHRMaterialsSpecular} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const hash = b => createHash('sha256').update(b).digest('hex');
const round = n => +n.toFixed(6);
const source = 'inbound/Models/PARP_Recon_hooded_model_splitparts_v01_05.glb';
const complete = 'inbound/Models/PARP_Recon_hooded_model_v01_05.glb';
const runtime = 'assets/models/operators/generated-recon.glb';
const output = 'assets/models/operators/recon-split-reference.glb';
const parts = JSON.parse(fs.readFileSync('tools/assets/recon-source-parts.json'));
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMaterialsIOR, KHRMaterialsSpecular])
  .registerDependencies({'meshopt.decoder': MeshoptDecoder});
const bytes = fs.readFileSync(source),
  src = await io.readBinary(bytes);
function world(v, m) {
  return [0, 1, 2].map(i => m[i] * v[0] + m[i + 4] * v[1] + m[i + 8] * v[2] + m[i + 12]);
}
const aligned = p => [-p[2] * 1.85, p[1] * 1.85 + 0.925, p[0] * 1.85];
const measured = [];
for (const node of src
  .getRoot()
  .listNodes()
  .filter(n => n.getMesh())) {
  const id = Number(node.getName().split('_').at(-1)),
    spec = parts.find(p => p.id === id);
  if (!spec) throw Error('Unclassified source node: ' + node.getName());
  const welded = new Map(),
    edges = new Map(),
    bounds = {min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity]};
  let triangles = 0;
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION'),
      idx = prim.getIndices().getArray(),
      mapped = new Map();
    for (const i of new Set(idx)) {
      const p = aligned(world(pos.getElement(i, []), node.getWorldMatrix()));
      p.forEach((v, j) => {
        bounds.min[j] = Math.min(bounds.min[j], v);
        bounds.max[j] = Math.max(bounds.max[j], v);
      });
      const key = p.map(round).join(',');
      if (!welded.has(key)) welded.set(key, welded.size);
      mapped.set(i, welded.get(key));
    }
    triangles += idx.length / 3;
    for (let i = 0; i < idx.length; i += 3)
      for (const [a, b] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ]) {
        const x = mapped.get(idx[i + a]),
          y = mapped.get(idx[i + b]);
        if (x === y) continue;
        const key = x < y ? `${x},${y}` : `${y},${x}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
  }
  bounds.min = bounds.min.map(round);
  bounds.max = bounds.max.map(round);
  measured.push({
    ...spec,
    sourceNode: node.getName(),
    triangles,
    weldedVertices: welded.size,
    boundaryEdges: [...edges.values()].filter(n => n === 1).length,
    nonManifoldEdges: [...edges.values()].filter(n => n > 2).length,
    bounds,
    center: bounds.min.map((v, i) => round((v + bounds.max[i]) / 2)),
  });
}
if (measured.length !== parts.length) throw Error('Source part count changed');
async function summary(buffer) {
  const doc = await io.readBinary(buffer),
    root = doc.getRoot();
  const skin = root.listSkins()[0];
  return {
    sha256: hash(buffer),
    bytes: buffer.length,
    triangles: root
      .listMeshes()
      .flatMap(m => m.listPrimitives())
      .reduce((n, p) => n + p.getIndices().getCount() / 3, 0),
    meshes: root
      .listNodes()
      .filter(n => n.getMesh())
      .map(n => ({
        name: n.getName(),
        triangles: n
          .getMesh()
          .listPrimitives()
          .reduce((s, p) => s + p.getIndices().getCount() / 3, 0),
      })),
    textures: root.listTextures().map(t => ({size: t.getSize(), mime: t.getMimeType()})),
    materials: root.listMaterials().map(m => ({name: m.getName(), textured: !!m.getBaseColorTexture()})),
    bones: (skin?.listJoints() || []).map(n => ({
      name: n.getName(),
      parent: n.getParentNode()?.getName() || null,
      localMatrix: n.getMatrix().map(round),
      worldMatrix: n.getWorldMatrix().map(round),
    })),
  };
}
const current = await summary(fs.readFileSync(runtime));
const upstreamArg = process.argv.indexOf('--upstream');
const upstreamRef = execFileSync('git', ['rev-parse', upstreamArg < 0 ? 'origin/main' : process.argv[upstreamArg + 1]], {
  encoding: 'utf8',
}).trim();
const upstreamBytes = execFileSync('git', ['show', `${upstreamRef}:${runtime}`], {maxBuffer: 32 * 1024 * 1024});
const upstream = await summary(upstreamBytes);
const differingBones = current.bones
  .filter(b => JSON.stringify(b) !== JSON.stringify(upstream.bones.find(n => n.name === b.name)))
  .map(b => b.name);
const audit = {
  version: 1,
  source: {path: source, sha256: hash(bytes), bytes: bytes.length, triangles: measured.reduce((n, p) => n + p.triangles, 0)},
  complete: await summary(fs.readFileSync(complete)),
  current,
  upstream: {ref: upstreamRef, ...upstream},
  differingBones,
  alignment: {scale: 1.85, rotationY: -Math.PI / 2, translation: [0, 0.925, 0]},
  parts: measured.sort((a, b) => a.id - b.id),
};
fs.writeFileSync(output, bytes);
fs.writeFileSync('assets/models/operators/recon-source-audit.json', JSON.stringify(audit, null, 1) + '\n');
console.log(
  JSON.stringify({
    parts: measured.length,
    triangles: audit.source.triangles,
    openParts: measured.filter(p => p.boundaryEdges).map(p => p.id),
    currentTriangles: current.triangles,
    upstreamTriangles: upstream.triangles,
    differingBones,
  }),
);
