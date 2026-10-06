// The inventory's grids (TAC-C-11): a container is a list of grids, each {w, h, items: [{item, x, y}]}; an item covers
// its catalogue footprint (w x h cells, or h x w when item.rot is 1) from its top-left cell, and no two items overlap.
// Containers are plain objects (they serialise as they are): a rig's pouches, a backpack, pockets, a body, a cache.
// Pure: every function takes the catalogue (shared/inventory/catalogue.js) for footprints.

/** The cells an item covers: [w, h], swapped when it is rotated. */
export function footprint(cat, item) {
  const d = cat.def(item.slug);
  return item.rot ? [d.h, d.w] : [d.w, d.h];
}

/** Is the w x h rectangle at (x, y) inside the grid and clear of every item but `skip`? */
export function fits(cat, grid, w, h, x, y, skip = null) {
  if (x < 0 || y < 0 || x + w > grid.w || y + h > grid.h) return false;
  for (const e of grid.items) {
    if (e.item === skip) continue;
    const [ew, eh] = footprint(cat, e.item);
    if (x < e.x + ew && e.x < x + w && y < e.y + eh && e.y < y + h) return false;
  }
  return true;
}

/** Put `item` at (x, y) of grid `g` of `container`, rotated or not; false (and nothing changes) when it does not fit. */
export function placeAt(cat, container, g, item, x, y, rot = item.rot || 0) {
  const grid = container.grids[g];
  if (!grid) return false;
  const was = item.rot;
  item.rot = rot;
  const [w, h] = footprint(cat, item);
  if (!fits(cat, grid, w, h, x, y)) {
    item.rot = was;
    return false;
  }
  grid.items.push({item, x, y});
  return true;
}

/** The first place `item` fits in `container`: {g, x, y, rot} (upright first, then turned), or null. */
export function findSpot(cat, container, item) {
  const d = cat.def(item.slug);
  const rots = d.w === d.h ? [0] : [0, 1];
  for (let g = 0; g < container.grids.length; g++) {
    const grid = container.grids[g];
    for (const rot of rots) {
      const [w, h] = rot ? [d.h, d.w] : [d.w, d.h];
      for (let y = 0; y + h <= grid.h; y++) for (let x = 0; x + w <= grid.w; x++) if (fits(cat, grid, w, h, x, y)) return {g, x, y, rot};
    }
  }
  return null;
}

/** Put `item` wherever it first fits. Returns its spot, or null when the container is full. */
export function add(cat, container, item) {
  const s = findSpot(cat, container, item);
  if (s) placeAt(cat, container, s.g, item, s.x, s.y, s.rot);
  return s;
}

/** Take the item with `uid` out of `container`. Returns {item, g, x, y} (where it was), or null. */
export function remove(container, uid) {
  for (let g = 0; g < container.grids.length; g++) {
    const items = container.grids[g].items;
    const i = items.findIndex(e => e.item.uid === uid);
    if (i >= 0) {
      const [e] = items.splice(i, 1);
      return {item: e.item, g, x: e.x, y: e.y};
    }
  }
  return null;
}

/** Every item lying in a container's grids (not inside magazines or nested containers). */
export const contents = container => container.grids.flatMap(g => g.items.map(e => e.item));

/** Move an item between containers (or within one): to a spot, or to the first free place. Single ownership: it is
 * taken out before it is put in, and put back where it was if there is no room. Returns true when it moved. */
export function move(cat, from, uid, to, at = null) {
  const was = remove(from, uid);
  if (!was) return false;
  const ok = at ? placeAt(cat, to, at.g, was.item, at.x, at.y, at.rot ?? was.item.rot) : !!add(cat, to, was.item);
  if (!ok) placeAt(cat, from, was.g, was.item, was.x, was.y, was.item.rot);
  return ok;
}
