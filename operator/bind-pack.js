// Rebind an authored extension pack to the operator skeleton, sharing materials and preserving rest transforms.
import * as T from 'three';
// An extension pack ships the shared armature plus new skinned meshes. Re-bind each mesh to the base's own
// bones by name (same rest pose, so the pack's inverse bind matrices stay valid) and parent it to the base's
// Armature node, so posing, idle and visibility treat pack meshes exactly like the original ones.
export function bindPack(packScene, scene, baseRig) {
  const armature = scene.getObjectByName('Armature') || scene;
  const baseMaterials = new Map();
  scene.traverse(o => {
    if (o.isMesh && !baseMaterials.has(o.material.name)) baseMaterials.set(o.material.name, o.material);
  });
  const skinned = [];
  packScene.traverse(o => {
    if (o.isSkinnedMesh) skinned.push(o);
  });
  for (const mesh of skinned) {
    // Preserve the selectable multi-material node before moving its primitives out of the source group.
    let part = mesh;
    for (let parent = mesh.parent; parent; parent = parent.parent) if (parent.name?.startsWith('SK_')) part = parent;
    mesh.userData.packPart = part.name;
    const bones = mesh.skeleton.bones.map(b => baseRig.bones.get(b.name));
    if (bones.some(b => !b)) throw new Error(`pack mesh ${mesh.name} uses bones the base does not have`);
    // A pack material named like one of the base's shares the base instance, so colour zones paint both.
    const shared = baseMaterials.get(mesh.material.name);
    if (shared) mesh.material = shared;
    else baseMaterials.set(mesh.material.name, mesh.material); // also share between pack meshes (e.g. hair, moustache, beard)
    mesh.bind(new T.Skeleton(bones, mesh.skeleton.boneInverses), mesh.bindMatrix);
    // The base's skin material uses vertex colours; a pack mesh without a colour attribute would render black.
    if (mesh.material.vertexColors && !mesh.geometry.attributes.color) {
      const n = mesh.geometry.attributes.position.count;
      mesh.geometry.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    }
    armature.add(mesh);
  }
}
