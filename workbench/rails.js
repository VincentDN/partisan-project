// Rail footprints: parts that share a rail cannot overlap. Pure functions (no three.js, no DOM) so the
// rules are unit-tested against the real rifle data.
//
// An item is {slot, rail, baseX, offset, fp:[minX,maxX], travel:{min,max,step}} in metres along the barrel (+x muzzle):
//   baseX   where the slot's mount sits on the rifle,   offset  how far the part has been slid from it,
//   fp      the part's extent relative to its mount (0-length means "nothing fitted"),   travel the rail's allowed slide.
export const GAP = 0.004;   // minimum clearance between neighbouring parts

export const span = it => [it.baseX + it.offset + it.fp[0], it.baseX + it.offset + it.fp[1]];
const empty = it => !(it.fp[1] - it.fp[0] > 0);
export const clash = (a, b) => {
  if (a.rail !== b.rail || a.slot === b.slot || empty(a) || empty(b)) return false;
  const [a0, a1] = span(a), [b0, b1] = span(b);
  return a0 < b1 + GAP && b0 < a1 + GAP;
};
export const clashing = (items, it) => items.filter(o => clash(it, o));

/** Offsets this slot can take, nearest to `want` first (on the rail's step grid, anchored at 0, within travel). */
export function candidates(travel, want) {
  const { min, max, step } = travel, out = [];
  for (let o = Math.ceil(min / step - 1e-9) * step; o <= max + 1e-9; o += step) out.push(Math.round(o / step) * step);
  const clamped = Math.min(max, Math.max(min, want));
  return [clamped, ...out.filter(o => Math.abs(o - clamped) > 1e-9).sort((a, b) => Math.abs(a - clamped) - Math.abs(b - clamped))];
}

/**
 * Place `slot` with footprint `fp` at (or near) `want`. May move the parts it would collide with, but only to free
 * positions on their own rails. Returns {ok, offsets:{slot:offset}, moved:[slot…], blockedBy?:[slot…]}.
 */
export function resolve(items, slot, fp, want) {
  const me = items.find(i => i.slot === slot);
  if (!me) return { ok: true, offsets: { [slot]: want }, moved: [] };
  const others = items.filter(i => i.slot !== slot);
  const place = (it, offset, fpOverride) => ({ ...it, offset, fp: fpOverride || it.fp });

  const asked = candidates(me.travel, want);
  const tryOwn = offset => {
    const mine = place(me, offset, fp);
    return { mine, hits: clashing(others, mine) };
  };
  // 1. as asked
  let { mine, hits } = tryOwn(asked[0]);
  if (!hits.length) return { ok: true, offsets: { [slot]: asked[0] }, moved: [] };

  // 2. slide the neighbours out of the way (each to its nearest free offset, with this part at the asked position)
  const offsets = { [slot]: asked[0] }, moved = [];
  let fixed = [...others.filter(o => !hits.includes(o)), mine], okAll = true;
  for (const h of hits) {
    const free = candidates(h.travel, h.offset).find(o => !clashing(fixed, place(h, o)).length);
    if (free === undefined) { okAll = false; break; }
    offsets[h.slot] = free; moved.push(h.slot); fixed = [...fixed, place(h, free)];
  }
  if (okAll) return { ok: true, offsets, moved };

  // 3. slide this part instead, neighbours fixed
  for (const o of asked.slice(1)) {
    const t = tryOwn(o);
    if (!t.hits.length) return { ok: true, offsets: { [slot]: o }, moved: [] };
  }
  return { ok: false, offsets: {}, moved: [], blockedBy: [...new Set(hits.map(h => h.slot))] };
}

/** Can this single slot take `offset` right now without moving anything else? (stepper buttons) */
export const fits = (items, slot, offset) => {
  const me = items.find(i => i.slot === slot);
  return !me || (offset >= me.travel.min - 1e-9 && offset <= me.travel.max + 1e-9 && !clashing(items.filter(i => i.slot !== slot), { ...me, offset }).length);
};
