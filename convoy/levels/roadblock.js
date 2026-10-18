// Small roadside raid: exactly four ordinary soldiers, no reinforcements, with covered approaches for a small crew.
export default {
  id: 'roadblock',
  title: 'Roadblock',
  summary: 'Four occupiers at a makeshift barrier. Raid with two to four rebels and recover their equipment.',
  brief:
    'Four ordinary soldiers hold this roadblock. There is no radio team or reinforcement wave. Bring two to four rebels, approach through cover and eliminate or rout the guards. Search their bodies for weapons and ammunition then use Finish raid to return with your loot (or regroup at the southwest exit).',
  bounds: {minX: -45, maxX: 45, minZ: -32, maxZ: 32},
  ground: {color: 0x67683f, patches: [], roads: [{x: 0, z: 4, w: 100, d: 6, color: 0x6a6252}]},
  avoid: [{x: 0, z: 4, w: 100, d: 6}],
  cover: [
    {x: 2, z: 4, w: 1, d: 6, h: 1.1, kind: 'log'},
    {x: 6, z: -4, w: 4, d: 1.2, h: 1.2, kind: 'sandbag'},
    {x: 12, z: 12, w: 5, d: 4, h: 3, kind: 'building'},
    {x: -27, z: -16, w: 3, d: 3, h: 1.5, kind: 'rock'},
    {x: -15, z: -11, w: 4, d: 2, h: 1.2, kind: 'log'},
    {x: -12, z: 18, w: 4, d: 3, h: 1.5, kind: 'rock'},
  ],
  partisans: [{id: 'player', label: 'Lead rebel', x: -35, z: -23, facing: 0.6}],
  convoy: null,
  alarm: 'local',
  units: [
    {name: 'Road guard 1', role: 'rifleman', x: 0, z: 0, facing: Math.PI, group: 'barrier'},
    {name: 'Road guard 2', role: 'rifleman', x: 0, z: 8, facing: Math.PI, group: 'barrier'},
    {name: 'Road guard 3', role: 'rifleman', x: 7, z: -2, facing: Math.PI, group: 'barrier'},
    {name: 'Road guard 4', role: 'rifleman', x: 15, z: 6, facing: Math.PI, group: 'barrier'},
  ],
  objectives: [
    {id: 'guards', type: 'eliminate', routs: true, label: 'Clear the roadblock: eliminate or rout four guards'},
    {
      id: 'exit',
      type: 'extract',
      after: ['guards'],
      zone: {x: -35, z: 22, w: 16, d: 16},
      label: 'Search bodies (hold E nearby), then Finish raid or use the southwest exit',
    },
  ],
};
