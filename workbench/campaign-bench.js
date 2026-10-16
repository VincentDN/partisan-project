// The Workbench in a campaign (WP-W16): opened as workbench/?campaign=<id>&fighter=<id> (from the band panel), it arms
// one fighter. Only what the band owns can be fitted (shared/campaign/builds.js says why the rest is locked and where
// it is found); "Assign" keeps the build on the fighter, and it is the gun they carry next mission. Outside a campaign
// this is not mounted and the Workbench is unchanged.
import {createStore} from '../shared/campaign/state.js';
import {showStale, STALE_TEXT} from '../shared/campaign/stale-notice.js';
import {NAMES} from '../convoy/roster.js';
import {TROOPS} from '../band/troops.js';
import {rifleLock, partLock, makeBuild, buildGear} from '../shared/campaign/builds.js';

/**
 * opts: {params (URLSearchParams), root (where the panel goes), current: () => {rifle, build: {slot: option}}}.
 * Returns null outside a campaign, else {fighter, rifle(id), part(slot, option), startHash, assign(), onFighter}.
 */
export function mountCampaignBench({params, root, current}) {
  if (!params.has('campaign')) return null;
  let store;
  try {
    store = createStore(localStorage, {onConflict: showStale});
  } catch {
    store = createStore(null);
  }
  const campaign = store.load().campaign;
  store.watch(campaign); // WP-W24
  const ids = Object.keys(campaign.band.fighters);
  let who = ids.includes(params.get('fighter')) ? params.get('fighter') : ids[0];
  const name = id => NAMES[id] || id;

  const el = (tag, attrs = {}, text = '') => Object.assign(document.createElement(tag), attrs, text ? {textContent: text} : {});
  const panel = el('section', {className: 'campaign-bench', ariaLabel: 'Arming a fighter'});
  const pick = el('select', {id: 'bench-fighter'});
  for (const id of ids)
    pick.append(new Option(`${name(id)} (${TROOPS[campaign.band.fighters[id].class]?.label || ''})`, id, false, id === who));
  const assign = el('button', {type: 'button', id: 'bench-assign', className: 'primary'}, 'Assign this build');
  const status = el('p', {id: 'bench-status', role: 'status'});
  const back = el('a', {className: 'back', href: `../map/?campaign=${encodeURIComponent(campaign.id)}`}, 'Back to the campaign map');
  const label = el('label', {}, 'Arming ');
  label.append(pick);
  panel.append(el('h2', {}, 'CAMPAIGN ARMOURY'), label, assign, status, back);
  root.prepend(panel);
  const describe = () => {
    const b = campaign.band.fighters[who].build;
    status.textContent = b
      ? `${name(who)} carries a ${b.rifle.toUpperCase()} build${buildGear(b).length > 1 ? ` with ${buildGear(b).length - 1} fitted part(s)` : ''}. Parts the band does not have are locked.`
      : `${name(who)} has no build yet: they carry their class weapon. Parts the band does not have are locked.`;
  };
  describe();

  const api = {
    get fighter() {
      return who;
    },
    /** May the fighter have this rifle? {ok, reason}. */
    rifle: id => rifleLock(campaign, who, id),
    /** May the fighter fit this option? {ok, reason}. A rifle found comes bare: even its factory suppressor or sight is gear. */
    part: (slot, option) => partLock(campaign, who, slot, option),
    /** The Workbench link of the fighter's build, to open it as it was (or '' for none). */
    get startHash() {
      return campaign.band.fighters[who].build?.hash || '';
    },
    onFighter: () => {},
    /** Keep the shown build on the fighter: the rifle and its non-factory parts. */
    assign() {
      const {rifle, build} = current();
      const parts = {...build}; // every slot; only band gear among them counts against the stash
      for (const [slot, o] of Object.entries(parts)) if (!api.part(slot, o).ok) return (status.textContent = api.part(slot, o).reason);
      if (!api.rifle(rifle).ok) return (status.textContent = api.rifle(rifle).reason);
      campaign.band.fighters[who].build = makeBuild(rifle, parts, location.hash.replace(/^#/, ''));
      if (!store.save(campaign))
        return (status.textContent = store.stale ? STALE_TEXT : 'The campaign could not be saved: browser storage is full or blocked.');
      status.textContent = `Assigned: ${name(who)} carries this ${rifle.toUpperCase()} next mission.`;
    },
  };
  assign.onclick = () => api.assign();
  pick.onchange = () => {
    who = pick.value;
    describe();
    api.onFighter(who);
  };
  return api;
}
