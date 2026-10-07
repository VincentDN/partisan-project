// Kit between missions (TAC-C-11, WP-S10): from the band panel, a fighter's grid kit beside the band's armoury. Load
// loose rounds into empty magazines, hand a fuller magazine over, set a looted rifle aside. Ammunition carried home
// is all there is: what a fighter spent stays spent, so restock here before the next deployment. A fighter who has
// never deployed is issued the 60-round kit of their class's weapon on first look. Saves on every change.
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {createKit} from '../shared/inventory/kit.js';
import {add} from '../shared/inventory/grid.js';
import {roundsCarried} from '../shared/inventory/ammo.js';
import {mountInventory} from '../shared/inventory/grid-ui.js';
import {useMed} from '../shared/inventory/meds.js';
import {newArmoury} from '../shared/campaign/state.js';
import {kitFor} from '../convoy/abilities.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
let catalogue = null;
// a failed download is forgotten, so the next open tries again
const loadCatalogue = () =>
  (catalogue ||= fetch(new URL('../wiki/data/items.json', import.meta.url))
    .then(r => r.json())
    .then(d => createCatalogue(d))
    .catch(e => {
      catalogue = null;
      throw e;
    }));

/** {campaign, save, names: {id: name}, onClose} -> {open(fighterId), close(), isOpen} */
export function createKitScreen({campaign, save, names = {}, onClose = () => {}}) {
  const box = el('div', 'kit-screen inv-overlay');
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'kit-title');
  const title = el('h2', '', 'Kit');
  title.id = 'kit-title';
  const status = el('p', 'search-status');
  status.setAttribute('role', 'status');
  const close = el('button', 'search-close', 'Close (Esc)');
  close.type = 'button';
  close.onclick = () => shut();
  const head = el('div', 'search-head'),
    root = el('div', 'inv');
  head.append(title, status, close);
  box.append(head, root);
  document.body.append(box);
  let isOpen = false;

  async function open(id) {
    let cat;
    try {
      cat = await loadCatalogue();
    } catch {
      document.querySelector('.band-panel .note')?.replaceChildren('The kit list could not be loaded. Check the connection and try again.');
      return;
    }
    const f = campaign.band.fighters[id];
    if (!f) return;
    // ids made here never meet a mission's (those start m<seed>-) or an earlier visit's
    const factory = createKit(cat, {prefix: `k${campaign.settled.length}-${Date.now() % 1e6}-`});
    if (!f.kit) {
      const armsId = kitFor(f.class, id === 'player')[0];
      f.kit = factory.issue(armsId);
      f.kit.armsId = armsId;
    }
    campaign.armoury ||= newArmoury();
    const inbox = campaign.armoury.inbox || [];
    campaign.armoury.inbox = inbox.filter(item => !add(cat, campaign.armoury, item)); // set-aside kit finds a place
    save();
    const name = names[id] || id;
    const count = () => {
      const cal = cat.def(f.kit.primary.slug).calibre;
      return `${roundsCarried(cat, f.kit, cal)} rounds for the ${cat.def(f.kit.primary.slug).short}`;
    };
    title.textContent = `${name}'s kit`;
    status.textContent = count();
    mountInventory(root, {
      cat,
      panels: [
        {title: name, kit: f.kit},
        {title: 'Armoury', container: campaign.armoury},
      ],
      make: (slug, n) => factory.make(slug, n),
      // medicine shortens a wound: two points of healing an hour off the time to heal
      onUse: item => {
        const r = useMed(cat, item, f.wounded ? f.healIn * 2 : 0);
        f.healIn = Math.max(0, f.healIn - r.healed / 2);
        if (f.wounded && !f.healIn) f.wounded = false;
        return r.healed ? `${r.why} ${f.wounded ? `${Math.ceil(f.healIn)}h to heal.` : `${name} is fit.`}` : r.why;
      },
      onChange: why => {
        save();
        status.textContent = `${why ? why + ' ' : ''}${count()}.`;
      },
    });
    box.hidden = false;
    isOpen = true;
    root.querySelector('.inv-item')?.focus();
  }
  function shut() {
    if (!isOpen) return;
    isOpen = false;
    box.hidden = true;
    save();
    onClose();
  }
  return {
    open,
    close: shut,
    get isOpen() {
      return isOpen;
    },
  };
}
