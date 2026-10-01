# 0009 · Recorded handling foley restored

**Status** accepted · 2026-10-01 · supersedes 0004 for handling sounds

**Context.** ADR 0004 removed the recorded handling bank because the earlier README described the cuts as classified from a longer recording and the provenance could not be shown from the repository. The owner has stated that each sound was checked and cleared, and asked for the sounds to be restored as they were.

**Decision.**
1. Restore the 42 takes that shipped (6 each of click, clunk, ratchet, slide, hit, handle, long, about 1.5 MB) to `assets/audio/foley/` with the original `manifest.json`.
2. `workbench/mech.js` plays the recorded take when the bank has loaded and falls back to the synthesised sound before that or if a fetch fails, exactly as before. The call interface is unchanged, so the Workbench, the Customiser and Bench Lab all get the recordings.
3. Each file has a register row with the licence "Supplied by the project owner; checked and cleared by the owner". The remaining ~500 unshipped cuts, the reels and the git-ignored placeholder bank stay out.

**Consequences.** Rights rest on the owner's statement; the register records it. If a take is ever challenged, delete its file and register row and the synthesis covers it. Foley is still not generated audio; new takes need a register row first (docs/audio-direction.md).
