# Agent state

Read `AGENTS.md` first. Work queue: [packets.json](packets.json).

## Latest handoff

<!-- handoff:start -->
**2026-10-07 10:46 UTC · codex · WP-CM6 · partial**

- Branch `codex/generated-operator-equipment` at `9d01521`; working tree clean.
- Last commits: 9d01521 feat(WP-CM6): checkpoint mounted pouches for cloud continuation · d666644 docs(WP-CM5): record carrier validation and pouch handoff · ee610fa feat(WP-CM5): add fitted modular lightweight plate carrier
- What happened: Owner requested commit/push and cloud-mobile handoff. All CM6 source, runtime candidates, tests and provisional preview are committed and pushed in 9d01521. Read docs/agent-ops/CM6-CLOUD-HANDOFF.md. Focused units 3/4: Pouch_radio_4 closed fails after compressed export. Typecheck, focused lint, changed-JS formatting and eight plan checks pass. Final browser fit acceptance remains unverified. This is a partial checkpoint, not completed CM6.
- Next step: In the cloud, check out codex/generated-operator-equipment, read AGENTS.md and docs/agent-ops/CM6-CLOUD-HANDOFF.md, diagnose the radio topology failure, rerun pouch browser clearance and regressions, and finish CM6 documentation before CM7. Commit/push this feature branch only; main stays protected.
<!-- handoff:end -->

## Resume here

1. **Finish CM6; do not start CM7 yet.** Magazine, utility and radio/cable templates, six fixed mount slots, interpolation-based skin binding, colours, persistence and tests are implemented. Final fit acceptance is incomplete.
2. Run `npm run test:pouches`. Focused units currently pass 3/4: `Pouch_radio_4 closed` fails after compressed export. Inspect the radio primitive/quantization and positional edge welding; do not remove the assertion without diagnosing the cause.
3. Configured typecheck, focused lint and changed-JS formatting passed on 7 October. The earlier long browser session has no recoverable result. Rerun the 72-carry pouch browser check; inspect front/rear/side, idles, transitions and slung clearance. The committed WIP screenshot is not acceptance.
4. Source body/carrier are unchanged. Foundation 5,568 + carrier 1,116 = 6,684 triangles. Pouch templates: magazine 264, utility 220, radio 376. Six radios total 8,940 with foundation/carrier. Budget each mounted copy; document the pouch allocation trade before future packs.
5. Use cloud-local Node dependencies, Chromium and optionally Blender. Start a new server; Windows localhost and processes do not transfer. Read the cloud handoff for commands and files. No raw .blend sources or ignored scratch files should be committed.
6. After CM6 acceptance: update engineering docs/contact sheet, CHANGELOG, packets, roadmap, code map and handoff; commit/push the feature branch. CM7 is belt/daypack; CM8 is the full assembly editor, undo and versioned saves.

## Known limits

- CM6 is **partial**, with a known failing geometry test and unverified final weapon clearance. Packet stays `ready` because the queue has no partial status.
- CM5 baseline: carrier/browser regressions passed; full units 237/239 with existing downloader generated-file mismatch and missing Windows python3. Reassess on Linux. Inherited site size is 246.2 MB (target 90 MB).
- Earlier work was interrupted by an automatic approval-review usage-limit failure, not an unsafe-action determination. Local sandbox commands work again on 7 October.
- Preserve canonical body/finger frames, data-authored poses, original Recon/comparison and the hood-free muscular foundation. Do not merge/push main or open an unrequested PR. No usage calibration was invented.
