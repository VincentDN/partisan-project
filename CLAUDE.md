# Claude Code

All instructions for this repository live in [AGENTS.md](AGENTS.md); read that, then
`docs/agent-ops/STATE.md`. Claude-specific notes:

- Use `Grep`/`Glob` and line-range `Read`s; do not read files listed under "Do not read".
- Use `/usage` before and after each packet and log it (`node tools/agent/usage.mjs log …`).
- Prefer one contact-sheet screenshot to many single screenshots (`tests/e2e/contact-sheet.mjs`).
- No sub-agents on the $20 plan unless the owner asks.
- **Do not spend tokens on credits or licences** (hidden test project): skip them, see the express instruction in AGENTS.md.
