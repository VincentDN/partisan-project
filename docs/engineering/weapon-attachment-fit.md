# Weapon attachment fitting

The October 2026 pass covers all 12 selectable weapon variants and 446 slot choices. Shared attachments retain consistent dimensions across rifles. Fictional combinations, including a G3 with a GP-25, use visible adapter mounts and remain selectable.

## Placement and source ownership

`workbench/attachment-fit.js` defines seats in normalized rifle space: barrel forward is +X, up is +Y. Factory geometry keeps its original position. Library attachments use authored receiver, handguard and side seats. Scope tubes use two low rings instead of the old oversized inherited mounts. Lights and lasers face forward with their mounting shoes toward the weapon; AK drums keep their source orientation.

Underbarrel mounting posts raycast against the selected handguard. Changing magazines, handguards or rail offsets recomputes the fit. Triangle clipping finds the magazine's forward surface within the attachment's vertical and lateral envelope, preserving 8 mm clearance without pushing parts forward based on unrelated lower magazine geometry. Bren optics sit beside its top-fed magazine.

`rifle-partitions.js` separates shared source triangles into replaceable furniture and fixed chassis. Mk14 stock and magazine swaps preserve the receiver; AK15 grips preserve the trigger guard. StG grip regions and Bren grip ownership avoid removing unrelated metalwork. Source GLBs and cached templates remain unchanged.

## Acceptance and reproduction

Run `CHROMIUM=/path/to/chromium npm run test:weapon-fit`. It loads production models and attachment builders in a real browser, including asynchronously loaded geometry. It checks:

- 446 choices across 12 variants for finite geometry and bounded dimensions.
- 801 magazine/underbarrel/handguard cases at minimum, centre and maximum rail offsets, including physical clearance, mounting post heights, repeated application and selection order.
- 102 optic/back-up-sight combinations against production rail overlap resolution.
- 7,476 pairs of slot selections for visibility and finite transforms. These are selection-state checks; they do not certify triangle-level clearance for every pair.
- Source geometry partition tests preserve triangle counts, overall bounds and unmodified cached templates.

Run `CHROMIUM=/path/to/chromium node tools/qa/weapon-fit.mjs build/weapon-fit-visuals` to regenerate individual-choice contact sheets and a combined overview. Each sheet renders every nonempty option against the factory build; the overview combines scope, GP-25, light and suppressor on every rifle. Review both the sheets and interacting checks when adding weapons or changing source models.

This pass does not close WP-A10's remaining UI/finish acceptance or claim real-world attachment compatibility.

## Reviewed visual record

| Weapon / overview | Committed contact sheet |
| --- | --- |
| ak15k | [Contact sheet](../../outbound/wip-images/2026-10-14_074049.png) |
| ak74m | [Contact sheet](../../outbound/wip-images/2026-10-14_074050.png) |
| bren | [Contact sheet](../../outbound/wip-images/2026-10-14_074051.png) |
| chauchat | [Contact sheet](../../outbound/wip-images/2026-10-14_074052.png) |
| g3 | [Contact sheet](../../outbound/wip-images/2026-10-14_074053.png) |
| m16 | [Contact sheet](../../outbound/wip-images/2026-10-14_074054.png) |
| mk14 | [Contact sheet](../../outbound/wip-images/2026-10-14_074055.png) |
| overview | [Contact sheet](../../outbound/wip-images/2026-10-14_074056.png) |
| ppsh41 | [Contact sheet](../../outbound/wip-images/2026-10-14_074057.png) |
| rpk | [Contact sheet](../../outbound/wip-images/2026-10-14_074058.png) |
| spear-retro | [Contact sheet](../../outbound/wip-images/2026-10-14_074059.png) |
| spear | [Contact sheet](../../outbound/wip-images/2026-10-14_074100.png) |
| stg44 | [Contact sheet](../../outbound/wip-images/2026-10-14_074101.png) |

[Actual Workbench G3 with scope, GP-25 and light](../../outbound/wip-images/2026-10-14_074426.png).

Validation on main: 480 unit tests, built-site attachment acceptance, build/link checks, lint, typechecking and formatting passed. The actual Workbench G3 build loaded and rendered without page errors.
