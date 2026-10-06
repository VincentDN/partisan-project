// Partisan Tactical inside a campaign (WP-W2): with ?campaign=<id>&encounter=<id> the page plays the deployment the
// map wrote into the campaign save (shared/campaign/*) instead of its own mission select, writes the one result at
// the debrief, and settles it when the player returns to the map. No restarts, no practice camp: a mission left
// without a result (reload, closed tab) comes back as withdrawn. Without ?campaign the page is the practice sandbox.
import {createStore} from '../shared/campaign/state.js';
import {enter, writeResult, withdraw, settle} from '../shared/campaign/encounter.js';
import {missionXp} from './progression.js';

const MAP = new URL('../map/', import.meta.url).href;

/**
 * Open the campaign named in the URL, or null for practice. Returns {campaign, deployment, action, ...}: action is
 * 'play' (set the level up from the deployment), 'withdrawn' (the mission was left: already settled), 'debrief'
 * (the result exists: show it and offer the way back) or 'none' (nothing to play for this encounter).
 */
export function openCampaign(params, storage) {
  if (!params.has('campaign')) return null;
  const store = createStore(storage);
  const {campaign} = store.load();
  const encounter = params.get('encounter') || '';
  const deployment = campaign.deployment;
  let action = enter(campaign, encounter);
  let settled = null;
  if (action === 'reload') {
    withdraw(campaign, encounter);
    settled = settle(campaign, encounter);
    action = 'withdrawn';
  }
  store.save(campaign);
  return {
    campaign,
    deployment,
    encounter,
    action,
    settled,
    /** {rebel id: class id} for the fighters deployed (the sim's squad option). */
    classes: () => Object.fromEntries((deployment?.fighters || []).map(f => [f, campaign.band.fighters[f].class])),
    /** Write the debrief as the mission's result (once). loot: the rolled entries ({gear} or trade goods). */
    finish(d, diffId, loot = []) {
      const earned = missionXp(d, diffId);
      const fighters = {};
      for (const u of d.byPartisan)
        if (deployment.fighters.includes(u.id)) fighters[u.id] = {state: u.state, xp: earned[u.id]?.total || 0, kills: u.kills};
      const bag = {},
        goods = [];
      for (const e of loot)
        if (e.gear) bag[e.gear] = (bag[e.gear] || 0) + 1;
        else goods.push({id: e.id, name: e.name, rarity: e.rarity, price: e.price});
      const wrote = writeResult(campaign, encounter, {
        outcome: d.outcome === 'won' ? 'won' : 'lost',
        fighters,
        loot: bag,
        goods,
        kills: d.kills,
        time: d.time,
        destroyed: d.vehiclesDestroyed,
      });
      store.save(campaign);
      return wrote;
    },
    get result() {
      return campaign.deployment?.result || settled;
    },
    /** Settle the result into the campaign and go back to the map. */
    returnToMap() {
      settle(campaign, encounter);
      store.save(campaign);
      location.href = MAP;
    },
  };
}

/** One line for a settled or written result, for the card. */
export function describe(r) {
  if (!r) return '';
  const hurt = Object.entries(r.fighters).filter(([, x]) => x.state !== 'fit').length;
  const taken = Object.values(r.loot).reduce((a, b) => a + b, 0) + r.goods.length;
  if (r.outcome === 'withdrawn')
    return 'You left the mission. The fighters fell back to the band, wounded, with their kit; nothing was taken.';
  return `${r.outcome === 'won' ? 'Accomplished' : 'Failed'}: ${r.kills} down, ${hurt} of yours hurt, ${taken} item${taken === 1 ? '' : 's'} brought home.`;
}
