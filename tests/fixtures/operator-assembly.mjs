// Synthetic equipment definitions and instances for resolver tests; not asset-backed carrier dimensions.
const socket = (id, type) => ({id, type, kind: 'socket', position: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: 1, depthRange: [0, 0.05]});
const item = (id, family, owner, mountType, triangleCount, extra = {}) => ({
  id,
  family,
  owner,
  mountType,
  triangleCount,
  skeletonId: 'recon-v1',
  fitProfile: 'recon-standard',
  footprint: [1, 1],
  excludes: [],
  coverage: [],
  materialRegions: ['fabric'],
  depth: 0.01,
  mounts: [],
  ...extra,
});
// Contract fixtures only: CM5/CM6 will provide measured asset-backed catalogue entries and mount fits.
export const catalogue = [
  item('body.recon', 'body', [], null, 5568, {
    skeletonId: 'recon-v2',
    complete: true,
    compatibleSkeletons: ['recon-v1'],
    coverageRegions: ['chest', 'back'],
    mounts: [socket('chest', 'carrier'), socket('waist', 'belt'), socket('back', 'bag')],
  }),
  item('carrier.light', 'carrier', ['body'], 'carrier', 1700, {
    coverage: ['chest', 'back'],
    mounts: [
      {...socket('front', 'webbing'), kind: 'grid', columns: 6, rows: 3, spacing: [0.025, 0.03], position: [-0.075, 1.2, 0.12]},
      {...socket('rear', 'webbing'), kind: 'grid', columns: 6, rows: 3, spacing: [0.025, 0.03]},
    ],
  }),
  item('pouch.mag', 'pouch', ['carrier', 'belt'], 'webbing', 300, {footprint: [2, 2]}),
  item('pouch.radio', 'radio-pouch', ['carrier'], 'webbing', 250, {mounts: [socket('contents', 'radio')]}),
  item('radio.small', 'radio', ['radio-pouch'], 'radio', 100),
  item('bag.day', 'bag', ['body'], 'bag', 1200, {excludes: ['radio']}),
];
export const placed = (id, itemId, parentId, mount, cell = [0, 0], extra = {}) => ({id, itemId, parentId, mount, cell, ...extra});
export const outfit = () => ({
  version: 1,
  rootId: 'body',
  instances: [
    placed('body', 'body.recon', null, null),
    placed('vest', 'carrier.light', 'body', 'chest'),
    placed('mag-a', 'pouch.mag', 'vest', 'front'),
    placed('mag-b', 'pouch.mag', 'vest', 'front', [2, 0], {finish: {fabric: 'olive'}}),
    placed('radio-pouch', 'pouch.radio', 'vest', 'rear'),
    placed('radio', 'radio.small', 'radio-pouch', 'contents'),
  ],
});
