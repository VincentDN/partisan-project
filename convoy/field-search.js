// Searching the dead and the wrecks in a mission (WP-S9, TAC-C-11): stand by a body or a burnt-out vehicle and hold E;
// the fight pauses and the grid inventory opens with your rebel's kit beside what they find. Take magazines, loose
// rounds, a better rifle's ammunition; load rounds into empty magazines; Escape (or Close) goes back to the fight.
// The rebels fire what is in their kits (convoy/kit-ammo.js), so ammunition taken here is ammunition you have.
import {attachAmmo, SEARCH_TIME} from './kit-ammo.js';
import {inventoryFoley} from '../shared/inventory/foley.js';
import {mountInventory} from '../shared/inventory/grid-ui.js';
import {useMed} from '../shared/inventory/meds.js';
import {trapTab} from '../shared/modal.js';

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
  trapTab(); // Tab stays in the search while it is open

  /** A new mission: kits for the rebels (or the ones they bring, by unit id) and the soldiers; nothing searched yet. */
  function attach(s, {seed = 1, kits, campaign = false} = {}) {
    sim = s;
    A = attachAmmo(s, cat, {seed, kits, army: true, campaign});
    target = null;
    progress = 0;
    if (isOpen) shut();
  }
  /** Each frame: the hint by a body or a wreck, and the search when E has been held long enough. */
  function update(dt, holding) {
    if (A && dt > 0 && !sim.outcome) A.scavenge(dt); // fighters out of rounds take magazines off the dead
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
  function groundAt(p) {
    let pile = A.drops.find(d => d.label === 'Dropped equipment' && Math.hypot(d.x - p.x, d.z - p.z) < 2);
    if (!pile) {
      pile = {x: p.x, z: p.z, label: 'Dropped equipment', container: A.factory.place('body', 'Ground')};
      A.drops.push(pile);
    }
    return pile.container;
  }
  function show(t) {
    const p = sim.player;
    isOpen = true;
    progress = 0;
    hint.hidden = true;
    title.textContent = `Searching: ${t.label}`;
    status.textContent =
      'Double-click or T to transfer. Drag rifles onto Primary to swap; drag yours to the body or Ground to leave it. H uses medicine.';
    const ui = mountInventory(root, {
      cat,
      panels: [
        {title: p.name || 'Your rebel', kit: A.kitOf(p)},
        {title: t.label, container: t.container},
        ...(t.label === 'Dropped equipment' ? [] : [{title: 'Ground · dropped items stay here', container: groundAt(p)}]),
      ],
      make: (slug, n) => A.factory.make(slug, n),
      // H on a bandage or a medkit: patch the rebel up here, mid-mission
      onUse: item => {
        const r = useMed(cat, item, (p.maxHp ?? 100) - p.hp);
        p.hp += r.healed;
        return r.why;
      },
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
    inventoryFoley('close');
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
    inventory() {
      if (!sim?.player?.alive || !A?.kitOf(sim.player) || isOpen) return;
      show({label: 'Dropped equipment', container: groundAt(sim.player)});
      title.textContent = 'Your inventory';
    },
    close: shut,
    get open() {
      return isOpen;
    },
    get ammo() {
      return A;
    },
  };
}
