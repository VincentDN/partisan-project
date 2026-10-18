// Pointer inventory gestures: clicks stay clicks; dragging begins after a movement threshold.
import {inventoryFoley} from './foley.js';
export function pointerDrag(e, item, from, {cat, root, carry, pickUp, quick, updateTarget, drop}) {
  if (e.button !== 0 || carry() || !from) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    return quick(item, from);
  }
  const tile = e.currentTarget;
  let ghost = null;
  const move = ev => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 5) return;
      const c = pickUp(item, from);
      ghost = tile.cloneNode(true);
      ghost.classList.add('inv-ghost');
      document.body.append(ghost);
      c.ghost = ghost;
      tile.style.opacity = '0.25';
    }
    ev.preventDefault();
    ghost.style.left = `${ev.clientX - 23}px`;
    ghost.style.top = `${ev.clientY - 23}px`;
    const under = document.elementsFromPoint(ev.clientX, ev.clientY).filter(n => root.contains(n));
    const g = under.find(n => n.dataset?.grid !== undefined),
      w = under.find(n => n.dataset?.weapon);
    if (w) carry().target = {weapon: w.dataset.weapon};
    else if (g) {
      const r = g.getBoundingClientRect();
      updateTarget(+g.dataset.grid, Math.floor((ev.clientX - r.left) / 46), Math.floor((ev.clientY - r.top) / 46));
    } else carry().target = null;
  };
  const key = ev => {
    if (ev.key === 'Escape' && carry()) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      up({type: 'pointercancel'});
      return;
    }
    if (ev.key.toLowerCase() === 'r' && carry()) {
      carry().rot = carry().rot ? 0 : 1;
      inventoryFoley('rotate', cat.def(item.slug).kind);
      ghost?.classList.toggle('turned-ghost', !!carry().rot);
    }
  };
  const up = ev => {
    for (const [type, fn] of listeners) removeEventListener(type, fn, type === 'keydown');
    if (!ghost) return;
    if (ev.type === 'pointercancel') carry().target = null;
    else move(ev);
    drop(ev.shiftKey);
  };
  const listeners = [
    ['pointermove', move],
    ['pointerup', up],
    ['pointercancel', up],
    ['keydown', key],
  ];
  for (const [type, fn] of listeners) addEventListener(type, fn, type === 'keydown');
}
