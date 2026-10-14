// Headless WP-W22 balance sample: the same preview and resolver as the encounter panel, across deterministic seeds.
import {newCampaign} from '../shared/campaign/state.js';
import {encounterFor} from '../shared/campaign/contacts.js';
import {autoPreview, resolveAuto} from '../shared/campaign/auto-resolve.js';
const runs = 1000;
for (const source of ['fuel-convoy', 'supply-convoy', 'orion-patrol']) {
  let wins = 0,
    wounded = 0,
    offered = 0,
    predictedWins = 0,
    predictedWounds = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const c = newCampaign({seed});
    const e = encounterFor(c, source);
    const p = autoPreview(c, e);
    if (!p.eligible) continue;
    offered++;
    predictedWins += p.odds;
    predictedWounds += p.expectedWounds;
    const {result} = resolveAuto(c, e);
    wins += result.outcome === 'won' ? 1 : 0;
    wounded += Object.values(result.fighters).filter(f => f.state !== 'fit').length;
  }
  console.log(JSON.stringify({source, runs, offered, wins, wounded, predictedWins, predictedWounds}));
}
