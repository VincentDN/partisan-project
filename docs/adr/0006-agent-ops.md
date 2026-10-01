# 0006 · Work packets and budget units

**Status** accepted · 2026-10-01

**Context.** Development is done by AI agents on two $20 plans (Claude Pro, ChatGPT Plus) with 5-hour windows and weekly caps whose exact token sizes are unpublished and change.

**Decision.** Work is split into packets (XS 3 BU, S 8 BU, M 20 BU; no L) held in `docs/agent-ops/packets.json`. Budget is expressed in BU (1 % of a 5-hour window on the weaker plan) and **calibrated empirically** (`usage.mjs`). State lives in the repo: `STATE.md` handoff, generated code map, generated roadmap table. Tooling and tests keep the plan valid.

**Consequences.** Either agent can resume from the repo alone. Numbers are hypotheses until two weeks of measurements exist; the README says so.
