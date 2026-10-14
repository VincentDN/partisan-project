# Campaign start and combat recovery

Fresh campaigns start with eight fit fighters and a nine-item reserve: two AK-74s, one rig, one vest, two medkits, one grenade pack, one smoke pack and binoculars. Carried kits are separate. The large depot remains in the standalone Band demo. Existing saves and legacy imports preserve inventory and earned wounds.

Every campaign mission shows a recovery report before returning to the map, including losses and withdrawals. It lists mission rewards and convoy cargo going to the stash, valuables with scrip values, net additions to carried kit, and expandable equipment lists by returning fighter. A withdrawal has no new rewards. Reloading the debrief uses the stored result; viewing it cannot grant rewards again. Old debriefs without an insertion snapshot explicitly say that carried-kit comparison is unavailable.

Insertion snapshots contain only deployed rebels, including their newly issued kit. Whole-squad counts include nested containers, inserted magazines and chambered rounds. Comparing the squad as a whole prevents transfers between fighters from appearing as loot. Net additions deduct ammunition fired and supplies used; they are a recovery balance, not a record of every pickup. Carried-kit rows are informational and are never added to the stash a second time.

Auto-resolve displays the same recovery report on the map. It is restricted to eligible small fights, shows odds and expected wounds, uses the encounter seed and reduces loot/cargo by 25%, rounded down. A failed save restores the prior in-memory campaign for retry. The headless sample uses the same resolver; comparison against average human-played results remains open under WP-W22.

Validation commands:

- `npm test`
- `ROOT=_site CHROMIUM=/path/to/chromium node tests/e2e/campaign-loot.mjs` — all seven mission types, actual acquired rifle, persisted quantities and identical debrief after reload.
- `ROOT=_site CHROMIUM=/path/to/chromium node tests/e2e/campaign-auto.mjs` — healthy launch, squad-dependent offer, failed-save retry, keyboard resolution, report and persistence.
- `ROOT=_site CHROMIUM=/path/to/chromium node tests/e2e/campaign-bridge.mjs` — normal return, duplicate/stale links and abandonment.
- `node tools/campaign-auto.mjs` — deterministic 1,000-seed sample for each representative contact.

Browser fixtures force mission outcomes to check the result pipeline. They do not establish difficulty or human pacing.

[Recovery-screen preview](../../outbound/wip-images/2026-10-14_125137.png).

Verified on 14 October 2026: 487 unit tests; all seven campaign mission recovery/reload checks; healthy launch and auto-resolve including failed storage; normal campaign return, stale links and abandoned missions; build/link checks, lint, formatting and typechecking. Human difficulty tuning remains open.
