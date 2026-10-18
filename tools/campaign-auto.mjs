// Headless WP-W22 sample: fresh and explicitly equipped veteran bands, with actual ammo expenditure across fixed seeds.
import {newCampaign} from '../shared/campaign/state.js';
import {starterKit} from '../shared/campaign/starter-kit.js';
import {encounterFor} from '../shared/campaign/contacts.js';
import {autoPreview, resolveAuto} from '../shared/campaign/auto-resolve.js';
const runs = 1000;
for (const scenario of ['fresh', 'equipped-veterans'])
  for (const source of ['fuel-convoy', 'supply-convoy', 'orion-patrol']) {
    let wins = 0,
      wounded = 0,
      offered = 0,
      predictedWins = 0,
      predictedWounds = 0,
      ammunitionSpent = 0;
    for (let seed = 1; seed <= runs; seed++) {
      const c = newCampaign({seed});
      if (scenario === 'equipped-veterans')
        for (const [id, f] of Object.entries(c.band.fighters)) {
          f.class = 'sniper';
          f.kit = starterKit('dragan');
          f.kit.primary.uid = `${id}-rifle`;
          f.kit.primary.mag.uid = `${id}-mag`;
        }
      const e = encounterFor(c, source),
        p = autoPreview(c, e);
      if (!p.eligible) continue;
      offered++;
      predictedWins += p.odds;
      predictedWounds += p.expectedWounds;
      const {result} = resolveAuto(c, e);
      wins += result.outcome === 'won' ? 1 : 0;
      wounded += Object.values(result.fighters).filter(f => f.state !== 'fit').length;
      ammunitionSpent += result.ammoSpent;
    }
    console.log(JSON.stringify({scenario, source, runs, offered, wins, wounded, predictedWins, predictedWounds, ammunitionSpent}));
  }
