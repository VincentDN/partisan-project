# 0008 · Bench Lab: the advanced workbench animations return as an opt-in experiment

**Status** accepted · 2026-10-01 · amends 0005

**Context.** ADR 0005 removed the "Advanced animations" experiment (articulated hands, staged part changes) with the rest of the old bench. The owner has asked for that work to continue.

**Decision.**
1. Rebuild it as a separate, opt-in demo, **Bench Lab** (`bench/`), not as part of the Workbench or the Operator Customiser. The Workbench stays the fast editing tool.
2. Keep the proven ideas from the archived prototype: a deterministic action timeline with one commit, cancel before the commit, Skip, pause-at-checkpoint review mode, stalled-frame cue suppression, a parts tray, in-place families (stock).
3. Rewrite everything that depended on retired code: hands and arms are new original geometry driven by a two-bone IK solver (`bench/ik.js`, `bench/hands.js`; superseded by the restored operator, see below); the rifle, rules, rails and loadout codec are the Workbench's own modules; handling sounds are the Workbench's synthesised cues (`workbench/mech.js`), not recorded samples.
4. Still out of scope: weapon firing, recoil, reload drills, the code-built operator, and any recorded foley without a register row.

**Consequences.** `bench/` is allowlisted in the Pages build and covered by unit tests (timeline, motion, IK), a browser test and the accessibility audit. Visual quality (grip contacts per option, hand anatomy) is tracked as separate packets rather than claimed done.

**Update 2026-10-02.** At the owner's request the earlier code-built operator and its articulated hands are restored for Bench Lab and the opening scene (`shared/legacy-operator/`, `bench/legacy-arms.js`). The new Base Operator is used only by the Operator Customiser. `bench/hands.js` remains as a lighter alternative with the same interface.
