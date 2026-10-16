# W23 baseline and tuning review — 16 October 2026

Owner: **Codex**, assigned by Vincent. Harness/test chunks remain reserved for Codex.

The baseline and paired early-recovery comparison each contain seeds 1–50 over fourteen campaign days,
processed in five ten-seed chunks. The baseline deliberately stopped after seed ten and resumed from its
checkpoint to exercise the production resume path. Both reports share the same source fingerprint.

| Per-campaign metric | Standard (rest below 6 fit) | Early rest (below 8 fit) | Paired mean change |
| --- | --- | --- | --- |
| autoFights | 5.720 | 5.580 | -0.140 |
| wins | 4.300 | 4.180 | -0.120 |
| huntsPerDay | 0.129 | 0.088 | -0.040 |
| stashGrowth | 17.200 | 16.720 | -0.480 |
| rests | 4.460 | 7.380 | +2.920 |
| rearguards | 0.780 | 0.500 | -0.280 |

All 50 seeds meet a hostile contact at 4.50 campaign hours (7.5 map seconds at speed 1). This is identical
because the fresh map position and opening route are identical; campaign seed first changes combat outcomes.
The first legal auto-resolve occurs later, recorded separately in each per-seed result. Neither number includes
human tactical play, pause/menu time or loading.

No seed promotes a fighter under either policy. At the horizon, **zero campaigns have an XP-ready fighter and
zero have the equipment for a promotion path**. The highest individual XP is 72 in the baseline and 68 with
early recovery, against the starter insurgent's 120-XP threshold. Auto-resolve currently awards 12 XP for a win
and 4 for a loss; fuel-convoy cargo and the generic AK-74 reward do not provide the helmet, AK-74M or SMG required
by the insurgent's promotion branches. This result is scoped to the tested policy, which never barters or plays
manual-only missions. It is not evidence that a normal human campaign cannot promote.

**Tuning decision:** retain the standard policy as the reference baseline. Earlier recovery lowers pressure but
does not improve progression, and pushes hunts below the provisional lower bound. No runtime XP, loot or enemy
balance changes were justified by this comparison. Next tuning evidence should add a separately labelled manual
combat policy and village barter, then compare with actual human outcomes before adjusting W22 rewards. W21
endings and W25 onboarding are independent work; the new-player guidance should explain manual raids and where
promotion equipment comes from.

The harness and its first paired review are complete; human balance acceptance remains open. It does not exercise
liberation, high response tiers, full endgame, manual tactical ammunition expenditure, recruitment or barter.
W20's separate response-curve harness covers escalation thresholds. W22 still needs a human-play comparison;
W24 still needs physical-device performance evidence. The provisional targets are diagnostic, not a release gate.

## Reproduce and resume

From the repository root:

```sh
node tools/campaign/bench.mjs --out /tmp/partisan-baseline --max-chunks 1
node tools/campaign/bench.mjs --out /tmp/partisan-baseline --resume
node tools/campaign/bench.mjs --policy early-rest --out /tmp/partisan-early-rest
node --test tests/campaign-bench.test.mjs
```

Defaults: 50 seeds, seed 1 first, 14 days, chunks of 10. `--campaigns`, `--start-seed`, `--days`, `--chunk-size`
and `--max-chunks` permit bounded independent runs. `--resume` rejects a different source fingerprint, different
scenario options or an invalid seed sequence. Checkpoints are written by atomic rename after each batch; an
interruption can repeat only an unfinished batch. Reports record completion, scenario options, fingerprint,
per-seed metrics and final-state hashes. JSON records are machine-readable and retain null milestones explicitly.

Daily campaign normalization checkpoints match uninterrupted runs. Hunt events are counted during world steps,
so the bounded campaign log cannot erase the metric. Promotions call the game's paid promotion function at safe
havens. No test-only wins, XP grants or equipment grants enter the fifty-seed runs. The isolated paid-promotion
regression fixture verifies that an eligible promotion consumes the correct XP and gear.
