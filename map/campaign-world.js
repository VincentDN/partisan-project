// The campaign world on the map (WP-W5, W6, W7): the fixed-step simulation (shared/campaign/world.js) runs the convoys,
// the band's march, the hunters and the clock; this stands the map's parties where it says, and tells the player what
// they can see happen: convoys out and garrisons resupplied, the band spotted by a column or a trail lost. It draws the
// sight rings (map/sight-rings.js): the band's, and each hunter column's that is out.
import {createWorld} from '../shared/campaign/world.js';
import {CONVOYS} from '../shared/campaign/convoys.js';
import {isOut} from '../shared/campaign/hunt.js';
import {SOURCES, isGone} from '../shared/campaign/contacts.js';
import {byId} from './island.js';

/** opts: {campaign, travel, parties, toast, save, rings}. Returns {world, stepHunters(dt), news(stepResult)}. */
export function mountWorld({campaign, travel, parties, toast, save, rings = null}) {
  // the world runs in fixed steps (shared/campaign/world.js, WP-W5): convoys, the band's march, the hunters, the
  // clock; the map only draws it. The convoys' motion and the hunters' places are the save's.
  const hunters = parties.parties.filter(p => SOURCES[p.id]?.kind === 'hunters' && p.place);
  const convoys = parties.parties.filter(p => p.kind === 'convoy');
  const world = createWorld(campaign, {
    nav: travel.nav,
    party: travel.party,
    hunters: Object.fromEntries(hunters.map(p => [p.id, p.home])),
    vehicles: Object.fromEntries(convoys.map(p => [p.id, SOURCES[p.id].vehicles.length])),
  });
  travel.driven = true;
  for (const p of convoys) {
    p.state = world.motion(p.id);
    p.driven = true;
    p.update(0, 0);
  }
  /** The hunters' news (WP-W7): spotted, or the trail lost; and the sight rings, the band's and each column out. */
  function huntNews({hunts}) {
    for (const {id, event} of hunts)
      toast(event === 'spotted' ? `${SOURCES[id].name} has spotted the band!` : `${SOURCES[id].name} lost your trail.`, 4500);
    if (hunts.length) save();
    if (!rings) return;
    rings.show('band', travel.party.x, travel.party.z, world.sight());
    for (const p of hunters) {
      const h = campaign.world.hunters?.[p.id];
      if (h && isOut(campaign, p.id) && !isGone(campaign, p.id) && Number.isFinite(h.x))
        rings.show(p.id, h.x, h.z, world.spotted(), h.hunting ? '#ff7a5c' : '#c99a8c');
      else rings.hide(p.id);
    }
  }
  /** Convoys out again, and garrisons resupplied where the band can see it happen (WP-W6). */
  function convoyNews({resupplied, respawned}) {
    for (const p of convoys) if (p.root.visible === isGone(campaign, p.id)) (isGone(campaign, p.id) ? p.hide : p.show)();
    for (const id of respawned) {
      const from = byId(CONVOYS[id].from);
      if (world.sees(from.x, from.z)) toast(`A new ${SOURCES[id].name.toLowerCase()} sets out from ${from.name}.`);
    }
    for (const r of resupplied) {
      const s = byId(r.settlement);
      if (world.sees(s.x, s.z)) toast(`${SOURCES[r.id].name} reached ${s.name}: its garrison is ${r.garrison} now.`);
    }
    if (resupplied.length || respawned.length) save();
  }
  /** Stand the hunters where the world has them; dt > 0 also lets the world run (a rearguard sends them home). */
  function stepHunters(dt) {
    if (dt) world.step(dt);
    for (const p of hunters) {
      const h = campaign.world.hunters?.[p.id];
      if (!h || isGone(campaign, p.id)) continue;
      const heading = p.last ? Math.atan2(h.x - p.last.x, h.z - p.last.z) : null;
      if (!p.last || Math.hypot(h.x - p.last.x, h.z - p.last.z) > 0.01) p.place(h.x, h.z, heading);
      p.last = {x: h.x, z: h.z};
    }
  }
  /** Everything a world step reports. */
  function news(step) {
    convoyNews(step);
    huntNews(step);
  }
  return {world, stepHunters, news};
}
