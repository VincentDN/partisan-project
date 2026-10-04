// Publish the complete inbound Recon byte-for-byte for source comparison, without optimisation or material edits.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const source = 'inbound/Models/PARP_Recon_hooded_model_v01_05.glb';
const output = 'assets/models/operators/recon-original.glb';
const bytes = fs.readFileSync(source);
if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Expected a GLB source');
const data = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const triangles = data.meshes
  .flatMap(m => m.primitives)
  .reduce((n, p) => {
    if ((p.mode ?? 4) !== 4) throw new Error('Expected triangle primitives');
    return n + data.accessors[p.indices ?? p.attributes.POSITION].count / 3;
  }, 0);
fs.mkdirSync('assets/models/operators', {recursive: true});
fs.writeFileSync(output, bytes);
fs.writeFileSync(
  output.replace('.glb', '.manifest.json'),
  JSON.stringify(
    {
      source,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      triangles,
      meshes: data.meshes.length,
      images: data.images?.length ?? 0,
      unchanged: true,
    },
    null,
    1,
  ) + '\n',
);
console.log(`Original Recon: ${triangles} triangles, ${bytes.length} bytes, unchanged source`);
