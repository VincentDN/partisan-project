# Packet template

Copy into the packet's entry in `packets.json` (fields) and, for M packets, into the PR/branch description.

```
ID:          WP-<track><n>
Title:       <verb> <object>, one line
Milestone:   M0..M5 / TD / D / H27         Size: XS | S | M   (never L)
Needs:       browser | bpy | net | human     Agent: any | claude | codex | human
Depends on:  WP-…

Goal         One sentence, observable from outside the code.
Inputs       Exact files / line ranges to read. Nothing else is needed.
Do           3-7 steps. Name files and functions.
Acceptance   Commands (npm test, node tools/…, npm run test:e2e) and checkable facts.
Out of scope The tempting thing NOT to do in this packet.
Rollback     How to undo (usually: revert the branch).
Budget       BU estimate and the stop rule: "if 60 % of the BU is spent and acceptance is not in sight, stop and hand off".
```
