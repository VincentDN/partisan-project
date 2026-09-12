<!--
  ══════════════════════════════════════════════════════════════════════
  PARTISAN  ·  AI COMPENDIUM  ·  master index
  Kaiser Cat Collective / Atelier Vincent De Nil BV
  ──────────────────────────────────────────────────────────────────────
  VERSION : 1.0.0
  BUILD   : 2026-09-12
  STATUS  : INTERNAL. Repo document set. Not deployed.
  ══════════════════════════════════════════════════════════════════════
-->

# PARTISAN — AI Compendium

**Thirteen volumes plus appendices.** Supersedes `docs/ai-design.md` v0.1.0, which is retained
as the executive summary and should be read first by anyone arriving cold.

This is a working reference, not a pitch. It is written to be read out of order, grepped, and
argued with. Where it states something as settled, that means settled *in this document*, not
settled in the project.

---

## ⚠ Engine-generation warning — verified 12 September 2026

- **UE 5.8 shipped June 2026 and is the last planned major UE5 release.** Bug fixes and
  regressions only from here. No further 5.x feature releases.
- **UE6 was announced 24 May 2026 and detailed at State of Unreal on 17 June 2026.** It
  unifies UE5 with UEFN, moves the core gameplay programming model to Verse, introduces
  Scene Graph, and begins a sunset of Blueprints and Actors. Early Access targets end of 2027.

A roadmap starting now (Vol XIII: 13–22 solo-months) lands squarely on that transition. Three
consequences, argued in full in Vol IX §1:

1. **Pin UE 5.8 for the whole build.** For the first time, a UE5 developer gets a frozen
   target with no upgrade tax. That is worth more to a solo developer than any 5.8 feature.
2. **Write the AI in C++, not Blueprints.** Already correct for a stateful system; now also
   the migration-risk call.
3. **Split the engine-agnostic 80% from the engine-coupled 20%.** Belief, morale, tactic
   scoring and the director need no Actor. Written that way they are portable, headlessly
   testable, and deterministic — and the headless harness is the single largest velocity
   multiplier available to one person. Free if decided now, expensive later.

---

## How to read this

| If you are… | Read |
|---|---|
| Arriving cold | `../ai-design.md`, then Vol I §1, then Vol XIII |
| Deciding whether to build this at all | Vol XIII, then Vol I §2 |
| About to write code | Vol III, Vol IX, Vol XII |
| Designing a fight | Vol V, Vol VI, Vol VIII |
| Authoring content | Vol IV §4, Vol V §3, Appendix A |
| Wondering why a decision was made | Vol II, then the relevant volume's rationale boxes |

## The volumes

| № | Volume | Covers |
|---|---|---|
| **I** | `01-corpus-historical.md` | The game AI canon, forty-odd titles, mechanism by mechanism |
| **II** | `02-corpus-technical.md` | The academic and industry technique corpus, with verdicts |
| **III** | `03-knowledge-belief.md` | The belief model. The load-bearing system |
| **IV** | `04-individual.md` | Perception, morale, suppression, personality, aim, mistakes |
| **V** | `05-squad.md` | The tactical layer. Where perceived intelligence lives |
| **VI** | `06-spatial.md` | Terrain reasoning, cover, EQS, influence maps, navigation |
| **VII** | `07-faction-strategic.md` | Three asymmetric brains, comms networks, A-Life, adaptation |
| **VIII** | `08-director.md` | Pacing, intensity, scarcity economy, drama management |
| **IX** | `09-unreal.md` | Engine implementation. Subsystem choices, code, performance |
| **X** | `10-legibility.md` | Animation, barks, telegraphs, the readability layer |
| **XI** | `11-companions.md` | Squadmate AI. The hardest problem |
| **XII** | `12-validation.md` | Metrics, telemetry, harnesses, playtest protocol |
| **XIII** | `13-production.md` | Roadmap, task breakdown, risk, scope reality |
| **A–F** | `90-appendices.md` | Tactic sheets, bark taxonomy, tuning tables, glossary, bibliography |

---

## The four axioms

Everything in thirteen volumes reduces to four claims. If you disagree with one of them, the
volumes downstream of it are wrong and should be rewritten rather than patched.

> **Axiom 1 — Intelligence is perceived, not computed.**
> The player cannot see your algorithm. They can only see behaviour, and they attribute
> intelligence to behaviour they can *predict one beat ahead and not two*. All optimisation
> pressure should be applied to the perception, not the computation.

> **Axiom 2 — Wrongness is the signal of personhood.**
> Perfect information produces behaviour that is indistinguishable from cheating regardless
> of whether it is cheating. An agent that is *specifically, plausibly, confidently wrong* is
> the single strongest human-reading cue available, and it is cheaper than being right.

> **Axiom 3 — The unit is the character, not the agent.**
> Players narrate squads. Memorable AI in the historical record is overwhelmingly
> squad-level. Individual-agent sophistication has sharply diminishing returns above a low bar.

> **Axiom 4 — Pacing is an AI system.**
> The difference between "good AI" and "a good fight" is authored rhythm. Every canonical
> example of beloved PvE AI has a pacing layer, explicit or emergent.

---

## Conventions used throughout

- **Rationale boxes** are marked `> **Why.**` and explain a decision. Do not delete them when
  editing; they are the reason the document exists.
- **Verdict tags** on techniques: `ADOPT` / `ADAPT` / `REJECT` / `DEFER`. A `REJECT` carries
  the reason, so it does not get re-proposed in six months.
- **Cost tags**: `[trivial]` under a day, `[small]` under a week, `[medium]` under a month,
  `[large]` multi-month, `[research]` unbounded and probably a trap.
- Numbers in tables are **starting values for tuning**, never final. Where a number matters
  enough that getting it wrong breaks the system, it is marked **⚠ load-bearing**.
- Code is illustrative C++/pseudocode. It compiles in spirit only.

## Source-reliability note

This compendium draws on a large body of GDC talks, postmortems, technical books and
developer interviews. Mechanisms attributed to specific titles reflect the developer
accounts as generally reported. Where the public record is thin or contested, the text says
so rather than inventing detail. **Where a claim matters enough to build on, verify it at the
primary source in Appendix F before you spend a month on it.** Engine-specific detail
targets **UE 5.8** (see the warning above) and must be checked against your pinned version.
