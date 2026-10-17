# W23 Mosin-start follow-up — 17 October 2026

Owner: **Codex**. This follows the Mosin-only opening shipped in `a956a3c`.
The earlier [review](../review.md) and its reports remain historical and unchanged.

Both policies ran seeds 1–50 for fourteen campaign days, in five ten-seed batches each.
The standard baseline stopped after the first batch and resumed from its checkpoint.
Reports use a new source fingerprint and retain start/end carried weapon and ammunition counts for every seed.

| Metric | Standard | Early rest |
| --- | --- | --- |
| Campaigns | 50 | 50 |
| Auto-resolved fights | 286 | 279 |
| Wins | 215 | 209 |
| First hostile contact, campaign hours | 4.50 | 4.50 |
| Mean hunts/day | 0.1285 | 0.0885 |
| Mean reserve growth, items | 17.20 | 16.72 |
| Promotions | 0 | 0 |
| Carried rounds per band, start → end | 80 → 80 in every seed | 80 → 80 in every seed |
| Carried weapons per band, start → end | 8 → 8 in every seed | 8 → 8 in every seed |
| Rounds spent during auto-resolve, all campaigns | 0 | 0 |

[Standard report](baseline/report.md) · [Early-rest report](early-rest/report.md).
Each directory retains its complete machine-readable `checkpoint.json`.

## Finding: strategic success bypasses ammunition scarcity

Every seed's first-contact time, first-promotion result, hunt frequency, reserve growth, fight count and win
count is identical to its corresponding pre-Mosin run. Absolute reserve quantities are nine items lower,
because fresh campaigns now start with no reserve. Both policies still miss the promotion diagnostic; early
rest also misses the provisional lower hunt-frequency target.

`shared/campaign/auto-resolve.js` computes strength from selected fighter class tiers and enemy strength.
It does not inspect carried rifles or rounds. It settles without changed kits, so the campaign bridge returns
the original equipment. The observed 565 fights therefore spend no ammunition. That is current game behavior,
not an assumption introduced by this harness. The new audit measures the difference immediately around each
auto-resolve call, independently of reserve rewards. It also counts carried weapons and rounds at campaign start
and end, including chambered and magazine ammunition.

This evidence does **not** establish that ten rounds per fighter are enough for manual combat. It also does not
show that the new start has no balance impact: this policy bypasses the resource constraint being tested.
The audit covers ammunition named by the tactical ARMS catalogue, not every item in the inventory catalogue.
No runtime odds, XP, loot, ammo or promotion tuning is included in this testing milestone.

## Remaining work, explicitly separate

- **W22:** make auto-resolve respect equipped weapons and available ammunition, with deterministic expenditure,
  clear preview reasons when a band cannot fight, and the usual one-time settlement/reload guarantees. Preserve
  the existing played-fight comparison acceptance; these automated campaigns cannot replace it.
- **W23 / Codex:** add a separately labelled tactical-combat policy that spends real ammunition and recovers
  actual equipment, plus village-barter coverage. Compare its shortages, casualty rate and progression with
  human play. Keep test runs in ten-seed chunks and distinguish scripted bots from human evidence.
- **W21/W25:** endings and onboarding remain open. Guidance should explain finding ammunition and better weapons.

## Reproduce

Use fresh output directories to preserve committed reports:

```sh
node tools/campaign/bench.mjs --out /tmp/partisan-mosin-baseline --max-chunks 1
node tools/campaign/bench.mjs --out /tmp/partisan-mosin-baseline --resume
node tools/campaign/bench.mjs --policy early-rest --out /tmp/partisan-mosin-early-rest
node --test tests/campaign-bench.test.mjs
```

The regression suite checks actual chamber/magazine/spare-round counting, excludes reserve equipment, verifies
unchanged ammo after real auto-resolve, and retains deterministic/reload parity and resume mismatch checks.
