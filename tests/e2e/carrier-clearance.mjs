// Sample skinned carrier vertices against the closed posed jacket in the actual browser rig.
export function carrierClothingClearance() {
  const o = window.PARP_OPERATOR,
    T = o.stage.T,
    jacket = o.meshes.find(m => m.name === 'SK_CM_Jacket');
  jacket.skeleton.update();
  const positions = [];
  for (const i of jacket.geometry.index.array)
    positions.push(...jacket.getVertexPosition(i, new T.Vector3()).applyMatrix4(jacket.matrixWorld).toArray());
  const geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingBox();
  const solid = new T.Mesh(geometry, new T.MeshBasicMaterial({side: T.DoubleSide})),
    ray = new T.Raycaster(),
    direction = new T.Vector3(1, 0.173, 0.317).normalize(),
    failures = [];
  for (const m of o.meshes.filter(m => m.visible && (m.userData.packPart?.startsWith('SK_LC_') || m.userData.pouchInstance))) {
    m.skeleton.update();
    let count = 0;
    for (let i = 0; i < m.geometry.attributes.position.count; i++) {
      const p = m.getVertexPosition(i, new T.Vector3()).applyMatrix4(m.matrixWorld);
      if (!geometry.boundingBox.containsPoint(p)) continue;
      ray.set(p, direction);
      const hits = ray.intersectObject(solid, false).filter((h, i, a) => i === 0 || Math.abs(h.distance - a[i - 1].distance) > 1e-5);
      if (hits.length % 2 && hits[0].distance > 0.005) count++;
    }
    if (count) failures.push(m.name + ': ' + count);
  }
  geometry.dispose();
  solid.material.dispose();
  return failures;
}
