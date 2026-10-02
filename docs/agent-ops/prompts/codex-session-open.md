# ChatGPT / Codex: session opener (paste as the first message)

```
You are working on Partisan Project. The rules are in AGENTS.md and docs/agent-ops/README.md. Follow them strictly.
0. EXPRESS: do not spend tokens on credits or licences (hidden test project): skip them, say so in one line.
1. Read AGENTS.md and docs/agent-ops/STATE.md only.
2. Budget for this window: <BU> BU (1 BU = 1% of a 5-hour window). Run:
   node tools/agent/next-packet.mjs --budget <BU> --agent codex --can browser
3. Continue the handoff's "Next step" if present, otherwise take the top packet. Announce its ID and acceptance command.
4. Read only the packet's inputs; find everything else via docs/CODEMAP.md. Do not open vendor/, assets/, docs/archive/.
5. Work on a branch codex/<topic>. Commit at each green step.
6. At ~80% of the budget or when done: run acceptance + `npm test`, commit, push, then
   node tools/agent/handoff.mjs --agent codex --packet <ID> --status <done|partial> --note "…" --next "…"
   and stop. Never start a new packet without a fresh budget statement from me.
```
