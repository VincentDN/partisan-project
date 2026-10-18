# W23 campaign balance report

Completed 50/50 campaigns (complete). Policy: standard. Seeds: 1–50. Horizon: 14 campaign days. Source fingerprint: `a49daf8aaded334e3f6a777af5f67ee67ce58f619da6460b701d7a634aa60a83`.

| Metric | Reached / censored | Mean | Median | p95 | Diagnostic target | Result |
| --- | --- | --- | --- | --- | --- | --- |
| firstEncounterHours | 0 / 50 | not reached | not reached | not reached | 0–72; ≥90% of all seeds | MISS |
| firstPromotionHours | 0 / 50 | not reached | not reached | not reached | 0–336; ≥60% of all seeds | MISS |
| huntsPerDay | 50 / 0 | 0.00 | 0.00 | 0.00 | 0.1–2 | MISS |
| stashGrowth | 50 / 0 | 0.00 | 0.00 | 0.00 | 0–80 | PASS |

Auto-resolved fights: 0; wins: 0; paid promotions: 0; campaigns blocked by unavoidable tactical defence: 0.

Carried ammunition audit: 50 campaigns measured; 0 rounds spent during auto-resolve; 0 campaigns fought without spending ammunition. Start/end carried weapon and round counts are retained per seed in the checkpoint. Counts cover tactical ARMS catalogue ammunition; reserve rewards are separate. Zero expenditure cannot validate the ten-round tactical opening or looting sustainability.

Targets are calibrated for the fourteen-day scenario; other horizons are sensitivity runs. The policy does not visit villages to barter or recruit.

Times are elapsed campaign-clock hours, including travel and rest. At map speed 1, one map second advances 0.6 campaign hours. This excludes human tactical time, menus and loading. Null milestones are right-censored; means/quantiles include reached milestones only, while reach targets include every seed. Stash growth counts reserve items, excluding carried kits, goods and legacy troop stacks. Hunt counts are collected from every world-step event, not the bounded log.

The policy only auto-resolves eligible fights, leaves forbidden voluntary fights and uses real rearguards when caught. It does not fabricate tactical victories, captures, recruitment, loot or XP. Forced defence without an available rearguard stops and flags the run. This reports an auto-resolve campaign policy, not a full human campaign or the W22 played-fight comparison.
