// Sample the real rifle geometry against the deformed torso, face and chest equipment.
export function reconClearance() {
  const o = window.PARP_OPERATOR,
    T = o.stage.T,
    solids = [];
  for (const mesh of o.meshes.filter(m => m.visible && /Jacket|Hood|SK_CM_Head|Harness|Scarf|UtilityPouch|MagPouches/.test(m.name))) {
    mesh.skeleton.update();
    const positions = [];
    for (const i of mesh.geometry.index.array)
      positions.push(...mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(mesh.matrixWorld).toArray());
    const geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingBox();
    const solid = new T.Mesh(geometry, new T.MeshBasicMaterial({side: T.DoubleSide}));
    solid.name = mesh.name;
    solids.push(solid);
  }
  const ray = new T.Raycaster(),
    direction = new T.Vector3(1, 0.173, 0.317).normalize(),
    violations = [];
  o.weapon.rifle.model.updateMatrixWorld(true);
  o.weapon.rifle.model.traverse(mesh => {
    if (!mesh.isMesh || !mesh.visible) return;
    for (let parent = mesh.parent; parent; parent = parent.parent) if (!parent.visible) return;
    const indices = [...new Set(mesh.geometry.index?.array || Array.from({length: mesh.geometry.attributes.position.count}, (_, i) => i))];
    for (let j = 0; j < indices.length; j += Math.max(1, Math.floor(indices.length / 40))) {
      const p = mesh.getVertexPosition(indices[j], new T.Vector3()).applyMatrix4(mesh.matrixWorld);
      for (const solid of solids) {
        if (!solid.geometry.boundingBox.containsPoint(p)) continue;
        ray.set(p, direction);
        const hits = ray.intersectObject(solid, false).filter((h, i, list) => !i || h.distance - list[i - 1].distance > 1e-5);
        // Allow contact at a surface; reject samples buried more than 12 mm inside it.
        if (hits.length % 2 && hits[0].distance > 0.012) violations.push(`${mesh.name} inside ${solid.name}`);
      }
    }
  });
  for (const solid of solids) {
    solid.geometry.dispose();
    solid.material.dispose();
  }
  return [...new Set(violations)];
}

export function reconPalmDistances() {
  const o = window.PARP_OPERATOR,
    {Vector3: V, Quaternion: Q} = o.stage.T;
  return Object.keys(o.rig.data.poses[o.state.pose].weapon.hands).map(side => {
    const h = o.rig.bones.get('hand_' + side);
    const palm = h.getWorldPosition(new V()).add(o.rig.grip.palms[side].clone().applyQuaternion(h.getWorldQuaternion(new Q())));
    const at = side === 'r' ? [-0.028, -0.058, 0] : o.weapon.rifle.config.handguardAt || [0.3, 0.008, 0];
    return palm.distanceTo(o.pivot.localToWorld(new V(...at)));
  });
}
