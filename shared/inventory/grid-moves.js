// Where a moved item ends up (the grid inventory's forgiving moves): a drop that misses by a cell or two lands in the
// nearest free place in that grid (then anywhere in that box), and a quick move (Ctrl-click, T) sends an item to the
// first place it fits on the other side: from a body or a cache into the kit (a long gun onto the sling, if it is free),
// from the kit into what is searched. Pure, no DOM.
import {footprint, fits, placeAt, add} from './grid.js';

/** Put `item` at (x, y) in grid `g`, or as near to it as it fits in that grid, or anywhere in `container`. */
export function placeNear(cat, container, g, item, x, y, rot = 0) {
  if (placeAt(cat, container, g, item, x, y, rot)) return true;
  const grid = container.grids[g];
  let best = null;
  for (const r of [rot, rot ? 0 : 1]) {
    item.rot = r;
    const [w, h] = footprint(cat, item);
    for (let yy = 0; yy + h <= grid.h; yy++)
      for (let xx = 0; xx + w <= grid.w; xx++) {
        const d = Math.hypot(xx - x, yy - y) + (r === rot ? 0 : 0.5);
        if ((!best || d < best.d) && fits(cat, grid, w, h, xx, yy)) best = {x: xx, y: yy, r, d};
      }
  }
  item.rot = rot;
  if (best) return placeAt(cat, container, g, item, best.x, best.y, best.r);
  return !!add(cat, container, item);
}

/** The kit's boxes, in the order a quick move fills them. */
export const kitBoxes = kit => [kit.rig, kit.pockets, kit.backpack].filter(Boolean);

/**
 * Quick-move `item` (already taken out of where it was) to the other side: into `kit` when `toKit`, else into
 * `container`. Returns where it went ('the sling', a box's name) or null when there is no room.
 */
export function quickPlace(cat, item, {kit, container, toKit}) {
  if (!toKit) return container && add(cat, container, item) ? 'there' : null;
  if (cat.def(item.slug).kind === 'weapon')
    for (const slot of ['primary', 'secondary'])
      if (!kit[slot]) {
        item.rot = 0;
        kit[slot] = item;
        return slot === 'primary' ? 'your hands' : 'the sling';
      }
  for (const box of kitBoxes(kit)) if (add(cat, box, item)) return box === kit.pockets ? 'pockets' : cat.def(box.slug).short;
  return null;
}
