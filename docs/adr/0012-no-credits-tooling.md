# 0012 · No credits page and no licence audit

**Status** accepted · 2026-10-02 · supersedes 0004 (provenance rule) and 0007 (licence policy)

**Context.** The project is a hidden, SEO-excluded test site (`noindex`, `seo_hidden`). A credits page, a generated licence table, an allow-list audit and a CI gate for them cost agent tokens and maintenance for no audience.

**Decision.**
1. The Credits section of the game design document, the per-demo credit lists, `tools/assets/register*.mjs`, `assets/REGISTER.md`, the register audit tests and packet WP-Q3 are removed.
2. Every place that carried credits now carries one line: credits and licences are in the GitHub documentation, or contact the owner through GitHub.
3. `assets/register.json` stays only as the list of models and their triangle budgets for the Asset Viewer.
4. Every agent instruction page (AGENTS.md, CLAUDE.md, docs/agent-ops/README.md, STATE.md and both session prompts) carries an express instruction not to spend tokens on credits or licences.

**Consequences.** Asset rights are the owner's responsibility outside the repo's tooling. If the site ever becomes public and indexed, reintroduce a credits page first.
