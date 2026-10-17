// A fresh campaign's owned rifle and ten rounds, created once without loading the inventory catalogue.
import {ARMS} from '../inventory/arms.js';

export function starterKit(id) {
  const a = ARMS.hunting;
  const item = (suffix, slug) => ({uid: `starter-${id}-${suffix}`, slug, rot: 0});
  const magazine = (suffix, n) => ({...item(suffix, a.mag), rounds: [[a.round, n]]});
  return {
    armsId: 'hunting',
    primary: {...item('rifle', a.weapon), usesMag: true, mag: magazine('loaded', 4), chamber: a.round},
    secondary: null,
    armor: null,
    headwear: null,
    rig: null,
    backpack: null,
    pockets: {
      ...item('pockets', 'pockets'),
      grids: [{w: 1, h: 1, items: [{item: magazine('spare', 5), x: 0, y: 0}]}, ...Array.from({length: 3}, () => ({w: 1, h: 1, items: []}))],
    },
  };
}
