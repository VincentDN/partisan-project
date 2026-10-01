// Removes the loose cartridges, cases and spare magazines lying beside the rifles in the Sketchfab downloads.
// Usage: npm i @gltf-transform/core@4 @gltf-transform/functions@4
//        node strip-loose-parts.mjs low-poly_ak-74m_zenitco.glb ../model/ak-74m-zenitco.glb
//        node strip-loose-parts.mjs low-poly_ak-15_k.glb ../model/ak-15k.glb
import {NodeIO} from '@gltf-transform/core';
import {prune} from '@gltf-transform/functions';
const [input,output]=process.argv.slice(2);
const io=new NodeIO(),doc=await io.read(input);
const loose=[
 '54539_4','54539 case_5','ak74 30rnd empty mag (polymer)_7',// AK-74M Zenitco
 '76239_11','76239 case_12','akm 30rnd epmty mag (polymer)_13'// AK-15K (source spelling)
];
for(const node of doc.getRoot().listNodes())if(loose.includes(node.getName()))node.dispose();
await doc.transform(prune());
await io.write(output,doc);
