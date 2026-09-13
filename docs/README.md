# PARTISAN — Internal documents

Repo documents. None are deployed as pages; they do not affect the site `VERSION`
and each carries its own version in its header comment.

## Read in this order

| # | Document | What it is | Length |
|---|---|---|---|
| 1 | `ai-design.md` | Executive summary of the AI design. The twenty-minute version | ~5k words |
| 2 | `audience-and-playtest-strategy.md` | Who this is for, how to reach them, and how that constrains the design | ~2k words |
| 3 | `ai/00-index.md` | The AI Compendium. Thirteen volumes plus appendices | ~49k words |
| 4 | `ai/audio/00-listen-first.md` | Spoken-briefing adaptation of the Compendium, six parts | ~2 hours |

## Contents

**`ai-design.md`** — five-layer architecture, belief model, morale, director,
three faction brains, phased roadmap. Hand this to anyone arriving cold.

**`audience-and-playtest-strategy.md`** — the aged-out casual shooter player.
Sentiment mining without PII, the density map, the wishlist funnel, positioning
hypotheses, and §9 where audience facts become design constraints.

**`ai/`** — the Compendium.
`01–02` the historical and technical corpus · `03` belief · `04` the individual ·
`05` squads · `06` spatial reasoning · `07` factions · `08` the director ·
`09` Unreal 5.8 implementation · `10` legibility · `11` companions ·
`12` validation and tooling · `13` production and scope · `90` appendices.

**`ai/audio/`** — the same material rewritten for listening. No tables, no code,
recaps throughout. Feed to text-to-speech or read aloud.

## The two claims these documents share

1. **Perceived intelligence comes from communication, not computation.** Budget
   accordingly: four units of effort on the decision, six on making it perceivable.
2. **Difficulty scales what the enemy knows and how long it takes to know it —
   never health, damage, or reflex demand.** The AI work and the audience work
   reached this independently, from opposite directions.

## Current recommendation

Treat Phases 0–2 as the project (`ai/13-production.md` §6.3). Four to seven
solo-months. One terrace, one road, one squad, belief + morale + barks +
surrender. The r/DadGamers post (`audience-and-playtest-strategy.md` §7) costs
nothing and can go out before any of it.
