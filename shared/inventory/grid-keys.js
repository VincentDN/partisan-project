// The grid inventory's keys on an item (WP-S10): H uses medicine, T quick-moves, U unloads a magazine, E ejects a
// weapon's magazine; Enter picks the item up, then arrows and [ ] move it, R turns it, Enter drops, Escape puts it back.
import {inventoryFoley} from './foley.js';
import {roundsIn} from './ammo.js';
import {unloadInto, ejectMag} from './ammo.js';

/** ctx: the screen's own pieces ({cat, make, grids, carry(), pickUp, updateTarget, drop, use, quick, render, onChange, kitOf}). */
export function itemKeys({cat, make, grids, carry, pickUp, updateTarget, drop, use, quick, render, onChange, kitOf}) {
  function keyOnItem(e, item, from) {
    const d = cat.def(item.slug),
      k = e.key.toLowerCase();
    if (k === 'h') return use(item, from);
    if (k === 't' && from) return quick(item, from);
    const kit = kitOf(),
      places = [from?.grids ? from : null, kit?.pockets, kit?.rig, kit?.backpack].filter(Boolean);
    if (k === 'u' && d.kind === 'magazine') {
      const before = roundsIn(item);
      const kept = unloadInto(cat, item, places, make);
      inventoryFoley(roundsIn(item) < before ? 'unload' : 'reject', d.kind);
      render();
      return onChange(kept ? `No room for ${kept} rounds; they stay in the magazine.` : 'Unloaded.');
    }
    if (k === 'e' && d.kind === 'weapon' && item.mag) {
      const out = ejectMag(cat, item, [kit?.rig, kit?.pockets, kit?.backpack].filter(Boolean));
      inventoryFoley(out ? 'eject' : 'reject', d.kind);
      render();
      return onChange(out ? 'Magazine out.' : 'No room to put the magazine.');
    }
    if ((k === 'enter' || k === ' ') && from && !carry()) {
      e.preventDefault();
      const c = pickUp(item, from);
      const gi = grids.findIndex(G => G.container === from && G.g === c.was.g);
      keyCarry(Math.max(0, gi), c.was.x, c.was.y);
    }
  }
  function keyCarry(gi, x, y) {
    updateTarget(gi, x, y);
    const onKey = ev => {
      const t = carry()?.target;
      if (!t) return;
      let gi2 = grids.findIndex(G => G.container === t.container && G.g === t.g),
        nx = t.x,
        ny = t.y;
      const k = ev.key;
      if (k === 'ArrowLeft') nx--;
      else if (k === 'ArrowRight') nx++;
      else if (k === 'ArrowUp') ny--;
      else if (k === 'ArrowDown') ny++;
      else if (k === ']' || k === '[') {
        gi2 = (gi2 + (k === ']' ? 1 : grids.length - 1)) % grids.length;
        nx = ny = 0;
      } else if (k.toLowerCase() === 'r') {
        carry().rot = carry().rot ? 0 : 1;
        inventoryFoley('rotate', cat.def(carry().item.slug).kind);
      } else if (k === 'Enter' || k === ' ' || k === 'Escape') {
        ev.preventDefault();
        ev.stopImmediatePropagation(); // Escape puts the item back; it does not also close the screen
        removeEventListener('keydown', onKey, true);
        if (k === 'Escape') carry().target = null;
        return drop(ev.shiftKey);
      } else return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const G = grids[gi2].container.grids[grids[gi2].g];
      updateTarget(gi2, Math.max(0, Math.min(G.w - 1, nx)), Math.max(0, Math.min(G.h - 1, ny)));
    };
    addEventListener('keydown', onKey, true);
  }
  return keyOnItem;
}
