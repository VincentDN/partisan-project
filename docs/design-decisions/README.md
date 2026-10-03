# Design decisions: Partisan Tactical

Every decision made per build, with the reasoning, so it can be read, challenged and changed. One document per section
of the [tactical roadmap](../tactical-roadmap.md). Read them in the shell with `cat docs/design-decisions/G-squad-play.md`
or `grep -n "TAC-H-0" docs/design-decisions/*.md`.

## How to give feedback

Quote the decision ID and say what you want:

```
TAC-A-07: keep  |  TAC-C-03: change, carry weight in kg instead of slots  |  TAC-G-06: needs discussion
```

An agent turns each answer into a code change plus an update of the entry below it (status, "Owner feedback" line).
Entries marked `planned` can be changed for free; `built` ones cost a code change, noted under **Cost to change**.

## Entry format

```
### TAC-<section>-<nn> · Title
- Status: built | planned | superseded   ·   Packet: WP-S<n>
- Decision: what we do.
- Why: the reasoning, including the pillar or principle it serves.
- Alternatives rejected: what else was on the table and why not.
- Cost / risk: what it makes harder.
- Cost to change: how expensive reversing it is.
- Revisit if: the evidence that should reopen it.
- Owner feedback: (empty until you answer)
```

## Rules for agents

- A packet is not done until its decisions are written here (new entries, or edits to existing ones with the old
  reasoning kept under "Superseded").
- Never delete an entry: mark it `superseded` and point to its replacement.
- Reasoning must be honest about trade-offs. If a choice was a default nobody has challenged, say so.

## Index

| Document | Covers | Status |
|---|---|---|
| [00-principles.md](00-principles.md) | Cross-cutting principles: static site, pure simulation, data over code, difficulty is knowledge | built |
| [01-convoy-prototype.md](01-convoy-prototype.md) | The convoy ambush prototype: weapons, roles, MRAP, suppression, hearing, comms | built |
| [A-foundations.md](A-foundations.md) | WP-S1 to S4: levels as data, objectives, squad orders, guards/alarm/reinforcements/bounding | built |
| [G-squad-play.md](G-squad-play.md) | WP-S20, S21: you play every rebel; swapping with slow-motion zoom-out | planned |
| [B-levels.md](B-levels.md) | WP-S5 to S7: compound assault, cave hideout defence, visuals | planned |
| [C-inventory-looting.md](C-inventory-looting.md) | WP-S8 to S11: items, looting, inventory UI, loadouts that matter | planned |
| [D-campaign-unlocks.md](D-campaign-unlocks.md) | WP-S12 to S14: campaign, unlocks into the Modder and Customiser | planned |
| [H-progression.md](H-progression.md) | WP-S22 to S26: XP, levels, equipment-gated upgrade trees, perks, abilities | planned |
| [E-ai.md](E-ai.md) | WP-S15, S16: AI v2, morale, tuning harness | planned |
| [F-quality.md](F-quality.md) | WP-S17 to S19: tests, performance, touch, docs | planned |
| [J-graphics.md](J-graphics.md) | WP-V1 to V20: 2.5-D top-down sprites (RimWorld style), retro overworld map | planned |

| [I-extraction.md](I-extraction.md) | WP-S27–S42: persistent extraction, survival, browser resilience and optional online gates | planned |

Decision count: see `grep -c "^### TAC-" docs/design-decisions/*.md`.
