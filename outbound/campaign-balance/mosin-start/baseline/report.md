# W23 campaign balance report

Completed 50/50 campaigns (complete). Policy: standard. Seeds: 1–50. Horizon: 14 campaign days. Source fingerprint: `3eea7d3728e092ce58c2ef1f76e7c6856f371961736c424b8c83ad87408f6db2`.

| Metric | Reached / censored | Mean | Median | p95 | Diagnostic target | Result |
| --- | --- | --- | --- | --- | --- | --- |
| firstEncounterHours | 50 / 0 | 4.50 | 4.50 | 4.50 | 0–72; ≥90% of all seeds | PASS |
| firstPromotionHours | 0 / 50 | not reached | not reached | not reached | 0–336; ≥60% of all seeds | MISS |
| huntsPerDay | 50 / 0 | 0.13 | 0.14 | 0.36 | 0.1–2 | PASS |
| stashGrowth | 50 / 0 | 17.20 | 16.00 | 20.00 | 0–80 | PASS |

Auto-resolved fights: 286; wins: 215; paid promotions: 0; campaigns blocked by unavoidable tactical defence: 0.

Carried ammunition audit: 50 campaigns measured; 0 rounds spent during auto-resolve; 50 campaigns fought without spending ammunition. Start/end carried weapon and round counts are retained per seed in the checkpoint. Counts cover tactical ARMS catalogue ammunition; reserve rewards are separate. Zero expenditure cannot validate the ten-round tactical opening or looting sustainability.

Targets are calibrated for the fourteen-day scenario; other horizons are sensitivity runs. The policy does not visit villages to barter or recruit.

Times are elapsed campaign-clock hours, including travel and rest. At map speed 1, one map second advances 0.6 campaign hours. This excludes human tactical time, menus and loading. Null milestones are right-censored; means/quantiles include reached milestones only, while reach targets include every seed. Stash growth counts reserve items, excluding carried kits, goods and legacy troop stacks. Hunt counts are collected from every world-step event, not the bounded log.

The policy only auto-resolves eligible fights, leaves forbidden voluntary fights and uses real rearguards when caught. It does not fabricate tactical victories, captures, recruitment, loot or XP. Forced defence without an available rearguard stops and flags the run. This reports an auto-resolve campaign policy, not a full human campaign or the W22 played-fight comparison.
