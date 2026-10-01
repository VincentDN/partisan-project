# 0004 · Handling sounds are synthesised

**Status** accepted · 2026-10-01

**Context.** The earlier workbench shipped 542 foley cuts under a "CC0 foley" label, but its own README says the cuts were classified from the audio of a YouTube video of a commercial game (The Last of Us Part II), and a git-ignored "placeholder" bank came from the same source. That provenance cannot support a public deployment.

**Decision.** All handling sounds are synthesised live (`workbench/mech.js`, Web Audio). The recorded banks (`sfx/cuts`, `sfx/reels`, ~41 MB) are not carried into this repository. Music remains the two owner-supplied tracks, recorded in the register with a "confirm rights" note.

**Consequences.** Smaller site, no provenance risk. Real recordings can return through `WP-A11` with licences recorded; the call interface in `mech.js` is unchanged.
