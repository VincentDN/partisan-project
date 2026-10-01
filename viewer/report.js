// Pure reporting helper (no DOM) so it can be unit-tested: model stats vs registered budgets.
export function summarise(root, animations, entry, box) {
  let triangles = 0,
    meshes = 0,
    bones = 0;
  const materials = new Set();
  root.traverse(o => {
    if (o.isMesh) {
      meshes++;
      triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      for (const m of [].concat(o.material)) materials.add(m.name || '(unnamed)');
    }
    if (o.isBone) bones++;
  });
  const size = box.max.clone().sub(box.min);
  const budget = entry?.budget?.triangles;
  const rows = [
    [
      'Triangles',
      `${Math.round(triangles).toLocaleString('en')}${budget ? ` / ${budget.toLocaleString('en')}` : ''}`,
      budget && triangles > budget,
    ],
    ['Meshes', meshes],
    ['Materials', materials.size],
    ['Bones', bones],
    ['Animations', animations.length ? animations.map(a => a.name).join(', ') : 'none'],
    ['Size (m)', [size.x, size.y, size.z].map(n => n.toFixed(2)).join(' × ')],
    ['Licence', entry ? entry.license : 'NOT REGISTERED', !entry],
    ['Status', entry ? entry.status : 'unknown', !entry || entry.status !== 'real'],
  ];
  return {triangles, meshes, bones, materials: [...materials], rows};
}
