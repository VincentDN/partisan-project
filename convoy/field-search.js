// Searching the dead and the wrecks in a mission (WP-S9, TAC-C-11): stand by a body or a burnt-out vehicle and hold E;
// the fight pauses and the grid inventory opens with your rebel's kit beside what they find. Take magazines, loose
// rounds, a better rifle's ammunition; load rounds into empty magazines; Escape (or Close) goes back to the fight.
// The rebels fire what is in their kits (convoy/kit-ammo.js), so ammunition taken here is ammunition you have.
import {attachAmmo, SEARCH_TIME} from './kit-ammo.js';
import {mountInventory} from '../shared/inventory/grid-ui.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function createFieldSearch(cat, {onOpen = () => {}, onClose = () => {}} = {}) {
  let A = null,
    sim = null,
    target = null,
    progress = 0,
    isOpen = false;
  const hint = el('div', 'search-hint');
  hint.hidden = true;
  hint.setAttribute('aria-live', 'polite');
  const hintText = el('span'),
    bar = el('i');
  hint.append(hintText, el('b', '', ''), bar);
  const box = el('div', 'field-search inv-overlay');
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'search-title');
  const title = el('h2', '', 'Search');
  title.id = 'search-title';
  const close = el('button', 'search-close', 'Close (Esc)');
  close.type = 'button';
  close.onclick = () => shut();
  const status = el('p', 'search-status');
  status.setAttribute('role', 'status');
  const root = el('div', 'inv');
  const head = el('div', 'search-head');
  head.append(title, status, close);
  box.append(head, root);
  document.body.append(hint, box);

  /** A new mission: kits for the rebels (or the ones they bring, by unit id) and the soldiers; nothing searched yet. */
  function attach(s, {seed = 1, kits} = {}) {
    sim = s;
    A = attachAmmo(s, cat, {seed, kits, army: true});
    target = null;
    progress = 0;
    if (isOpen) shut();
  }
  /** Each frame: the hint by a body or a wreck, and the search when E has been held long enough. */
  function update(dt, holding) {
    if (A && dt > 0) A.scavenge(dt); // fighters out of rounds take magazines off the dead
    const p = sim?.player;
    if (!A || isOpen || !p?.alive || p.searching || !A.kitOf(p)) {
      progress = 0;
      hint.hidden = true;
      return;
    }
    const t = A.near(p.x, p.z);
    progress = holding && t && t === target ? progress + dt : 0;
    target = t;
    hint.hidden = !t;
    if (t) {
      hintText.textContent = `Hold E to search ${t.label}`;
      bar.style.width = `${Math.min(1, progress / SEARCH_TIME) * 100}%`;
    }
    if (t && progress >= SEARCH_TIME) show(t);
  }
  function show(t) {
    const p = sim.player;
    isOpen = true;
    progress = 0;
    hint.hidden = true;
    title.textContent = `Searching: ${t.label}`;
    status.textContent = '';
    const ui = mountInventory(root, {
      cat,
      panels: [
        {title: p.name || 'Your rebel', kit: A.kitOf(p)},
        {title: t.label, container: t.container},
      ],
      make: (slug, n) => A.factory.make(slug, n),
      onChange: why => {
        status.textContent = why || '';
        A.sync(p);
      },
    });
    box.hidden = false;
    root.querySelector('.inv-panel:last-child .inv-item, .inv-item')?.focus();
    onOpen(t);
    return ui;
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false;
    box.hidden = true;
    if (sim?.player && A?.kitOf(sim.player)) A.sync(sim.player);
    onClose();
  }
  /** Keys while the search is open belong to it: Escape closes; the game sees none. */
  function key(e) {
    if (!isOpen) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      shut();
    }
    return true;
  }
  return {
    attach,
    update,
    key,
    show,
    close: shut,
    get open() {
      return isOpen;
    },
    get ammo() {
      return A;
    },
  };
}
