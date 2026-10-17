// Fresh eight-person band: five Mosins, two TT pistols and one AKM; ten owned rounds each, never reissued.
import {ARMS} from '../inventory/arms.js';

export function starterKit(id) {
  const armsId = id === 'dragan' ? 'akm' : ['lena', 'niko'].includes(id) ? 'tt' : 'hunting';
  const a = ARMS[armsId],
    loaded = armsId === 'hunting' ? 4 : armsId === 'tt' ? 7 : 9;
  const spare = 9 - loaded;
  const item = (suffix, slug) => ({uid: `starter-${id}-${suffix}`, slug, rot: 0});
  const magazine = (suffix, n) => ({...item(suffix, a.mag), rounds: [[a.round, n]]});
  return {
    armsId,
    primary: {...item('rifle', a.weapon), usesMag: true, mag: magazine('loaded', loaded), chamber: a.round},
    secondary: null,
    armor: null,
    headwear: null,
    rig: null,
    backpack: null,
    pockets: {
      ...item('pockets', 'pockets'),
      grids: [
        {w: 1, h: 1, items: spare ? [{item: magazine('spare', spare), x: 0, y: 0}] : []},
        ...Array.from({length: 3}, () => ({w: 1, h: 1, items: []})),
      ],
    },
  };
}
