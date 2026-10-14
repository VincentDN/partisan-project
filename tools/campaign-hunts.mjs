// Hunts per day (WP-W7 harness metric): seeded headless campaigns, the band marching between friendly settlements and
// ambushing now and then (heat up), the world running; prints how often the columns found it and lost it.
// Usage: node tools/campaign-hunts.mjs [campaigns=10] [days=6]
import {newCampaign} from '../shared/campaign/state.js';
import {buildNav, findPath} from '../shared/campaign/nav.js';
import {createWorld, HOURS_PER_SECOND} from '../shared/campaign/world.js';
import {huntMetrics} from '../shared/campaign/hunt.js';
import {readResults} from '../shared/campaign/contacts.js';
import {logEvent} from '../shared/campaign/state.js';
import {SETTLEMENTS, PARTY_SPOTS} from '../map/island.js';

const [N = 10, DAYS = 6] = process.argv.slice(2).map(Number);
const nav = buildNav();
const homes = {raiders: PARTY_SPOTS.raiders, 'orion-hunters': PARTY_SPOTS.column};
const places = SETTLEMENTS.filter(s => s.faction !== 'invader');
const rows = [];
for (let seed = 1; seed <= N; seed++) {
  const c = newCampaign({id: `h${seed}`, seed});
  const [x, z] = PARTY_SPOTS.player;
  c.world.party = {x, z, route: null};
  const w = createWorld(c, {nav, hunters: homes});
  let r = seed * 9301;
  const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let hour = 0; hour < DAYS * 24; hour += 4) {
    if (!c.world.party.route) {
      const to = places[Math.floor(rnd() * places.length)];
      const path = findPath(nav, c.world.party, {x: to.x + 6, z: to.z + 6});
      if (path) c.world.party.route = {points: path.points, leg: 1};
    }
    if (rnd() < 0.15) {
      // an ambush where the band is: heat, and the columns learn where
      logEvent(c, {kind: 'result', source: null, outcome: 'won', at: {x: c.world.party.x, z: c.world.party.z}});
      c.world.heat = Math.min(100, c.world.heat + 10);
      readResults(c);
    }
    w.step(4 / HOURS_PER_SECOND);
  }
  rows.push({seed, ...huntMetrics(c), heat: c.world.heat});
}
console.table(rows);
const mean = rows.reduce((a, x) => a + x.perDay, 0) / rows.length;
console.log(`hunts per day: ${mean.toFixed(2)} on average over ${N} campaigns of ${DAYS} days`);
