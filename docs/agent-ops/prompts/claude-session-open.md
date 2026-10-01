# Claude Code: session opener (paste as the first message)

```
You are working on PARP (Partisan Project) under docs/agent-ops/README.md. Follow it strictly.
1. Read AGENTS.md and docs/agent-ops/STATE.md only.
2. My window: I have used <N>% so far, so your budget is <80-N> BU.
   Run: node tools/agent/next-packet.mjs --budget <BU> --agent claude --can browser,bpy
3. Continue the handoff's "Next step" if there is one, otherwise the top packet. Say the packet ID and its acceptance command.
4. Read only the packet's inputs. Use docs/CODEMAP.md to find anything else. No sub-agents.
5. Work on a branch claude/<topic>. Commit at every green step.
6. At ~80% of the budget, or when done: run the acceptance command and `npm test`, commit, push, then run
   node tools/agent/handoff.mjs --agent claude --packet <ID> --status <done|partial> --note "…" --next "…"
   (and usage.mjs log if I give you the meter reading). Then stop.
```
