// Import the two Magnific surface meshes into the game frame, keeping the painted exterior and distinct furniture.
import {NodeIO} from '@gltf-transform/core';
import {prune, weld} from '@gltf-transform/functions';
import sharp from 'sharp';

const [input, output, variant] = process.argv.slice(2);
if (!input || !output || !['a', 'b'].includes(variant)) throw Error('Expected input.glb output.glb a|b');
const io = new NodeIO();
const doc = await io.read(input);
const root = doc.getRoot(),
  scene = root.listScenes()[0],
  source = root.listMeshes()[0].listPrimitives()[0];
const buffer = root.listBuffers()[0],
  positions = source.getAttribute('POSITION'),
  normals = source.getAttribute('NORMAL');
const sign = variant === 'a' ? -1 : 1;
const height = variant === 'a' ? 0 : 0.085;
const depth = variant === 'a' ? -0.014 : -0.051;
const texture = source.getMaterial().getBaseColorTexture();
// Lift the dark painted reference enough to carry the green finish under the workbench lighting.
texture.setImage(await sharp(texture.getImage()).resize(1024, 1024, {fit: 'inside'}).linear(0.72, 93).jpeg({quality: 87}).toBuffer());
const colours = {body: [0.36, 0.39, 0.23], steel: [0.19, 0.195, 0.19], black: [0.12, 0.12, 0.12], red: [0.72, 0.037, 0.025]};
const materials = Object.fromEntries(
  Object.entries(colours).map(([name, rgb]) => [
    name,
    doc
      .createMaterial(name)
      .setBaseColorTexture(texture)
      .setBaseColorFactor([...rgb, 1])
      .setMetallicFactor(0.18)
      .setRoughnessFactor(0.61),
  ]),
);
const coords = i => {
  const [z, y, x] = positions.getElement(i, []);
  return [sign * x + 0.065, y + height, -sign * (z - depth)];
};
const groups = new Map();
const indices = source.getIndices();
for (let i = 0; i < indices.getCount(); i += 3) {
  const tri = [0, 1, 2].map(k => indices.getScalar(i + k));
  const [x, y, z] = tri.map(coords).reduce((acc, pos) => acc.map((v, k) => v + pos[k] / 3), [0, 0, 0]);
  if (variant === 'b' && (y > 0.19 || Math.abs(z) > 0.075)) continue;
  const mag = x > -0.015 && x < 0.118 && y < 0.003;
  const stock = x < -0.21;
  const nose = x > (variant === 'a' ? 0.53 : 0.505);
  const section = stock ? 'stock_fixed' : mag ? 'mag_25' : nose ? 'muzzle_tip' : 'receiver';
  const paint = mag
    ? y < -0.074 && y > -0.089
      ? 'red'
      : 'black'
    : nose
      ? 'steel'
      : stock
        ? 'body'
        : y > 0.092 || y < 0.014
          ? 'steel'
          : 'body';
  const key = section + '_' + paint;
  if (!groups.has(key)) groups.set(key, {ids: [], paint});
  groups.get(key).ids.push(...tri);
}
for (const n of [...scene.listChildren()]) scene.removeChild(n);
const uv = source.getAttribute('TEXCOORD_0');
for (const [key, {ids, paint}] of groups) {
  const attr = (name, type, values) => doc.createAccessor(name, buffer).setType(type).setArray(Float32Array.from(values));
  const p = doc
    .createPrimitive()
    .setMaterial(materials[paint])
    .setAttribute('POSITION', attr('position', 'VEC3', ids.flatMap(coords)))
    .setAttribute(
      'NORMAL',
      attr(
        'normal',
        'VEC3',
        ids.flatMap(i => {
          const [z, y, x] = normals.getElement(i, []);
          return [sign * x, y, -sign * z];
        }),
      ),
    )
    .setAttribute(
      'TEXCOORD_0',
      attr(
        'uv',
        'VEC2',
        ids.flatMap(i => uv.getElement(i, [])),
      ),
    );
  scene.addChild(doc.createNode(key).setMesh(doc.createMesh(key).addPrimitive(p)));
}
await doc.transform(weld(), prune());
await io.write(output, doc);
console.log(
  variant,
  [...groups.values()].reduce((n, g) => n + g.ids.length / 3, 0),
  'triangles',
);
