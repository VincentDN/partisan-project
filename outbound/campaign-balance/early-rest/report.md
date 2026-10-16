# W23 campaign balance report

Completed 50/50 campaigns (complete). Policy: early-rest. Seeds: 1–50. Horizon: 14 campaign days. Source fingerprint: `db8c0357f4fd1d60625934a40c583678fff26d6017bcd7c885a11fab6ffca3d5`.

| Metric | Reached / censored | Mean | Median | p95 | Diagnostic target | Result |
| --- | --- | --- | --- | --- | --- | --- |
| firstEncounterHours | 50 / 0 | 4.50 | 4.50 | 4.50 | 0–72; ≥90% of all seeds | PASS |
| firstPromotionHours | 0 / 50 | not reached | not reached | not reached | 0–336; ≥60% of all seeds | MISS |
| huntsPerDay | 50 / 0 | 0.09 | 0.00 | 0.21 | 0.1–2 | MISS |
| stashGrowth | 50 / 0 | 16.72 | 16.00 | 20.00 | 0–80 | PASS |

Auto-resolved fights: 279; wins: 209; paid promotions: 0; campaigns blocked by unavoidable tactical defence: 0.

Targets are calibrated for the fourteen-day scenario; other horizons are sensitivity runs. The policy does not visit villages to barter or recruit.

Times are elapsed campaign-clock hours, including travel and rest. At map speed 1, one map second advances 0.6 campaign hours. This excludes human tactical time, menus and loading. Null milestones are right-censored; means/quantiles include reached milestones only, while reach targets include every seed. Stash growth counts reserve items, excluding carried kits, goods and legacy troop stacks. Hunt counts are collected from every world-step event, not the bounded log.

The policy only auto-resolves eligible fights, leaves forbidden voluntary fights and uses real rearguards when caught. It does not fabricate tactical victories, captures, recruitment, loot or XP. Forced defence without an available rearguard stops and flags the run. This reports an auto-resolve campaign policy, not a full human campaign or the W22 played-fight comparison.
