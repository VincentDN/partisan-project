// The grid inventory test page (WP-S10, TAC-C-11): a rebel's 60-round kit beside a fallen soldier and a supply
// cache, to loot by hand before the screen goes into the missions (WP-S9).
import {createCatalogue} from '../shared/inventory/catalogue.js';
import {createKit} from '../shared/inventory/kit.js';
import {roundsCarried} from '../shared/inventory/ammo.js';
import {mountInventory} from '../shared/inventory/grid-ui.js';

const data = await (await fetch('../convoy/data/inventory-items.json')).json();
const cat = createCatalogue(data);
const kit = createKit(cat);
const rebel = kit.issue('ak74m');
rebel.backpack = kit.make('scav-backpack');
let seed = Number(new URLSearchParams(location.search).get('seed')) || 1;

const status = document.getElementById('status'),
  carried = document.getElementById('carried');
const count = () => (carried.textContent = `5.45 carried: ${roundsCarried(cat, rebel, '545x39')} rounds`);
let ui;
function mount() {
  const panels = [
    {title: 'Your rebel', kit: rebel},
    {title: 'Fallen soldier', container: kit.body('rifleman', seed)},
    {title: 'Supply cache', container: kit.cache(seed, {label: 'Supply cache', calibres: ['ak', 'pkm']})},
  ];
  ui = mountInventory(document.getElementById('inv'), {
    cat,
    panels,
    make: (s, n) => kit.make(s, n),
    onChange: why => {
      status.textContent = why || '';
      count();
    },
  });
  count();
  window.PARP_INV = {cat, kit, rebel, panels, ui, ready: true};
}
document.getElementById('reroll').onclick = () => {
  seed++;
  mount();
};
mount();
