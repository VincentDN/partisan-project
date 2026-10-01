# 0007 · Asset register and licence policy

**Status** accepted · 2026-10-01

**Decision.** `assets/register.json` is the source of truth for shipped assets and for the placeholder/pending pipeline. Allowed licences: CC0, CC BY 4.0 (and 3.0), original work, owner-purchased, owner-supplied. Tests fail on an unregistered file, a missing file or an unapproved licence. `tools/assets/register.mjs add` refuses other licences; there is no override flag. Candidate sources in the pipeline are leads, not clearances: each exact asset page is verified by the owner before download.

**Consequences.** The credits shown to players derive from one file. Replacing a placeholder is: import, optimise, register with `--fulfils <pipeline id>`.
