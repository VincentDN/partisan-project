# Equipment-aware auto-resolve review — 18 October 2026

Owner: Codex (W23). This supersedes the zero-ammunition auto-resolve behavior found in the historical Mosin-start report; it does not supersede the need for tactical/human pacing tests.

## Reproduction and scope

- `node tools/campaign/bench.mjs --campaigns 50 --chunk-size 10 --out outbound/campaign-balance/equipment-auto`
- `node tools/campaign-auto.mjs > outbound/campaign-balance/equipment-auto/resolver-sample.jsonl`
- `node --test tests/campaign-auto.test.mjs tests/campaign-bench.test.mjs`
- `CHROMIUM=/usr/bin/chromium node tests/e2e/campaign-auto.mjs`

The complete checkpoint records seeds 1–50, 14 campaign days, the standard policy and a source fingerprint. Five batches of ten seeds were completed. The policy only chooses eligible auto-resolve targets; it does not play Roadblocks, loot bodies, barter or recruit.

## Findings

All fifty fresh-band campaigns made zero auto-resolutions and zero promotions. Their starting 80 rounds remained intact. No encounter was reached because the auto-only policy had no eligible target to pursue; these are censored milestones, not successful pacing. Starting class tiers no longer let the policy bypass weak carried weapons and low ammunition. The player must use actual tactical fights and looting before auto-resolve becomes viable.

The separate resolver sample uses explicit fixtures: eight sniper-class veterans, each equipped with an AKM and ten rounds. These are test fixtures, not equipment granted by promotion or obtainable progression claims. Each target is sampled with 1,000 deterministic seeds:

| Target | Victories | Predicted victories | Wounded | Rounds per fight | Total rounds spent |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fuel convoy | 916 | 921.2 | 1,695 | 32 | 32,000 |
| Supply convoy | 899 | 883.2 | 2,060 | 48 | 48,000 |
| Orion patrol | 787 | 777.3 | 2,854 | 72 | 72,000 |

All 3,000 accepted resolutions spent the previewed cost on either outcome: 152,000 rounds in total. The fresh-band fixtures were offered no auto-resolutions against those three targets.

Regression checks cover dry/missing weapons, wrong calibres, alternate ammunition, loose stacks, weapon/magazine identity, seeded reload parity, double settlement, and failed storage followed by retry. The browser fixture starts with 80 rounds, deliberately fails the save, then succeeds with exactly 40 rounds remaining; reload does not grant ammunition back.

## Remaining acceptance

The weapon effectiveness and per-target ammunition factors are provisional aggregate combat rules. Human-played fight comparisons, a tactical/looting/barter harness policy, actual scarce-opening sustainability and campaign progression remain open. These results validate eligibility and inventory accounting, not that auto-resolve is balanced against a human player. W23 follow-up testing remains Codex-owned.
