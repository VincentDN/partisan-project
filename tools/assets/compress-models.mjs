// Meshopt-compresses a stripped rifle GLB (step 2 after strip-loose-parts.mjs). Node names are
// checked unchanged because models.js addresses parts by name. Positions become quantized
// integers (KHR_mesh_quantization), so the viewer loads with MeshoptDecoder.
// Usage: npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer@0.21
//        node compress-models.mjs ../model/ak-15k.glb ../model/ak-15k.glb
import {NodeIO} from '@gltf-transform/core';
import {EXTMeshoptCompression,KHRMeshQuantization} from '@gltf-transform/extensions';
import {dedup,quantize,meshopt,prune} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions([EXTMeshoptCompression,KHRMeshQuantization]).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const [input,output]=process.argv.slice(2);
const doc=await io.read(input);
const before=doc.getRoot().listNodes().map(n=>n.getName()).join('|');
await doc.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
if(doc.getRoot().listNodes().map(n=>n.getName()).join('|')!==before)throw new Error('node names changed');
await io.write(output,doc);
