// W20 response curve: use the same campaign rules and tactical factory as normal play, without rendering.
import {newCampaign} from '../shared/campaign/state.js';
import {response} from '../shared/campaign/response.js';
import {encounterFor, sourceFor} from '../shared/campaign/contacts.js';
import {SETTLEMENTS} from '../map/island.js';
import {LEVELS} from '../convoy/levels/index.js';
import {vary, enemyCount} from '../convoy/levels/variants.js';
const rows = [];
for (const recruits of [0, 4, 10])
  for (const seats of [0, 1, 2, 3, 4]) {
    const c = newCampaign();
    for (let i = 0; i < recruits; i++) c.band.fighters[`volunteer-${i}`] = {class: 'volunteer'};
    SETTLEMENTS.filter(s => s.faction === 'invader')
      .slice(0, seats)
      .forEach(s => (c.world.settlements[s.id] = {owner: 'resistance'}));
    const r = response(c),
      source = sourceFor(c, 'raiders'),
      e = encounterFor(c, 'raiders', source),
      L = vary(LEVELS[e.level], e.variant);
    const specialists = L.waves
      .flatMap(w => w.squads.flatMap(s => s.units))
      .filter(u => ['mg', 'marksman', 'grenadier'].includes(u.role)).length;
    rows.push({
      fighters: 8 + recruits,
      seats,
      score: r.score,
      tier: r.tier,
      response: r.label,
      hunters: enemyCount(L),
      specialists,
      heatToHunt: 20 - r.heatDiscount,
      react: r.react,
      spread: r.spread,
    });
  }
console.table(rows);
console.log('Deterministic response curve; human difficulty/pacing acceptance remains open.');
