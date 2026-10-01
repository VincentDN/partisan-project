# Handoff template

`node tools/agent/handoff.mjs …` writes this into `STATE.md`. If you must write it by hand, keep to these lines.

```
<date> UTC · <agent> · <packet> · done | partial | blocked
- Branch <name> at <sha>; tree clean (or: N uncommitted files, committed as wip)
- What happened: 1-2 sentences, facts only (what works, what was verified, what was not)
- Next step: the exact next action, with file + function + command
- Gotchas: anything that cost time and will again (optional, max 3 bullets)
```

Rules: no history of the conversation, no opinions about the previous agent, no TODO lists longer than 3
items (long lists belong in `packets.json`).
