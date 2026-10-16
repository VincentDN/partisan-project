// W23 metric contract: provisional diagnostic targets, explicit censored milestones and policy-limited conclusions.
export const TARGETS = {
  firstEncounterHours: {max: 72, reach: 0.9},
  firstPromotionHours: {max: 336, reach: 0.6},
  huntsPerDay: {min: 0.1, max: 2},
  stashGrowth: {min: 0, max: 80},
};
export function aggregate(rows) {
  if (!rows.length) throw Error('No campaign results');
  const result = {};
  for (const [key, target] of Object.entries(TARGETS)) {
    const values = rows
        .map(r => r[key])
        .filter(n => n !== null)
        .sort((a, b) => a - b),
      reached = values.length;
    const mean = reached ? values.reduce((a, b) => a + b, 0) / reached : null;
    const within = values.filter(v => v <= (target.max ?? Infinity) && v >= (target.min ?? -Infinity)).length;
    result[key] = {
      target,
      reached,
      censored: rows.length - reached,
      mean,
      median: reached ? values[Math.floor((reached - 1) / 2)] : null,
      p95: reached ? values[Math.ceil(reached * 0.95) - 1] : null,
      within,
      pass: target.reach !== undefined ? within / rows.length >= target.reach : mean !== null && mean >= target.min && mean <= target.max,
    };
  }
  return {
    campaigns: rows.length,
    metrics: result,
    blockedDefences: rows.filter(r => r.blockedDefence).length,
    autoFights: rows.reduce((a, r) => a + r.autoFights, 0),
    wins: rows.reduce((a, r) => a + r.wins, 0),
    promotions: rows.reduce((a, r) => a + r.promotions, 0),
    promotionBarriers: {
      campaignsWithXp: rows.filter(r => r.promotionBarriers?.xpReady > 0).length,
      campaignsWithGear: rows.filter(r => r.promotionBarriers?.gearReady > 0).length,
      campaignsReady: rows.filter(r => r.promotionBarriers?.ready > 0).length,
    },
  };
}
export function markdown(report) {
  const a = report.summary;
  return (
    `# W23 campaign balance report\n\nCompleted ${report.summary.campaigns}/${report.options.campaigns} campaigns (${report.complete ? 'complete' : 'partial'}). Policy: ${report.options.policy}. Seeds: ${report.options.startSeed}–${report.options.startSeed + report.options.campaigns - 1}. Horizon: ${report.options.days} campaign days. Source fingerprint: \`${report.fingerprint}\`.\n\n` +
    '| Metric | Reached / censored | Mean | Median | p95 | Diagnostic target | Result |\n| --- | --- | --- | --- | --- | --- | --- |\n' +
    Object.entries(a.metrics)
      .map(
        ([k, m]) =>
          `| ${k} | ${m.reached} / ${m.censored} | ${fmt(m.mean)} | ${fmt(m.median)} | ${fmt(m.p95)} | ${m.target.min ?? 0}–${m.target.max}${m.target.reach ? `; ≥${m.target.reach * 100}% of all seeds` : ''} | ${m.pass ? 'PASS' : 'MISS'} |`,
      )
      .join('\n') +
    `\n\nAuto-resolved fights: ${a.autoFights}; wins: ${a.wins}; paid promotions: ${a.promotions}; campaigns blocked by unavoidable tactical defence: ${a.blockedDefences}.\n\n` +
    'Targets are calibrated for the fourteen-day scenario; other horizons are sensitivity runs. The policy does not visit villages to barter or recruit.\n\nTimes are elapsed campaign-clock hours, including travel and rest. At map speed 1, one map second advances 0.6 campaign hours. This excludes human tactical time, menus and loading. Null milestones are right-censored; means/quantiles include reached milestones only, while reach targets include every seed. Stash growth counts reserve items, excluding carried kits, goods and legacy troop stacks. Hunt counts are collected from every world-step event, not the bounded log.\n\n' +
    'The policy only auto-resolves eligible fights, leaves forbidden voluntary fights and uses real rearguards when caught. It does not fabricate tactical victories, captures, recruitment, loot or XP. Forced defence without an available rearguard stops and flags the run. This reports an auto-resolve campaign policy, not a full human campaign or the W22 played-fight comparison.\n'
  );
}
const fmt = n => (n === null ? 'not reached' : n.toFixed(2));
