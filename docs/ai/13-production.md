# Volume XIII — Production

Roadmap, task breakdown, risk, and the honest section. Read this one last and reread it
quarterly.

---

## 1. Estimating basis

All estimates are **solo-months at hobby pace**: evenings and weekends around FMP, in the
range of 8–14 focused hours per week. They assume working UE5 and C++ familiarity. If you are
learning the engine concurrently, multiply by 2.5. If you are learning C++ concurrently,
stop and reconsider the whole approach (Vol XIII §6).

The estimates cover **AI only**. No art, no level design, no weapons, no UI, no narrative
content, no audio beyond the bark system's engineering, no build/release work.

Cost tags follow the compendium convention: `[trivial]` <1 day, `[small]` <1 week,
`[medium]` <1 month, `[large]` multi-month.

---

## 2. The phases

Each phase has one hard exit criterion. Nothing proceeds until it is met. The exit criteria are
deliberately behavioural rather than technical — "the system works" is not an exit, "a person
reacts this way to it" is.

---

### Phase 0 — The Room · *1–2 months*

One terrace, one stretch of road, grey box, three agents, no art.

| Task | Cost |
|---|---|
| Project setup, UE 5.8 pinned, C++ module structure | `[small]` |
| **PartisanAI static library** + `IPartisanWorldQuery` interface (Vol IX §1) | `[medium]` |
| `FBelief` struct, belief store, decay, the chokepoint API | `[medium]` |
| AIPerception as stimulus source; sight only | `[small]` |
| **Forbidden-symbol build test** (Vol IX §3.1) | `[trivial]` |
| **Belief visualiser** (Vol XII §5.1) | `[small]` |
| Visual Logger categories for belief events | `[small]` |
| StateTree skeleton: the six-state awareness ladder, placeholder tells | `[medium]` |
| One tactic: `SuppressAndWait` | `[small]` |
| Determinism: seeded RNG through the interface | `[small]` |
| **Headless harness**, minimal (Vol XII §4) | `[medium]` |

> **Exit.** You can stand behind a terrace wall and watch three agents shoot confidently at
> where they *think* you are, be wrong, and you can see exactly why, on screen, live.

**This phase is the whole project in miniature.** If watching it is not already interesting,
stop here and diagnose. Everything downstream multiplies this. A weak Phase 0 does not get
rescued by Phase 4.

---

### Phase 1 — The Squad · *2–3 months*

| Task | Cost |
|---|---|
| Squad object: merged belief, roster, succession, cohesion | `[medium]` |
| Comms events: shout, radio, runner, bell — with the shared occlusion function (Vol IX §10) | `[medium]` |
| Tactic scorer with **reason recording** (Vol XII §5.3) and minimum commit time | `[medium]` |
| Six core tactics with authored shapes | `[large]` |
| Role allocation | `[small]` |
| Bark system: generation, arbitration, budget, cooldowns | `[medium]` |
| Placeholder VO with real specificity (your own voice is fine) | `[small]` |
| EQS: `TerraceEdge`, `RidgeLine`, `BeliefPerimeter` generators | `[large]` |
| EQS: `Uphill`, `PathCostRatio`, `MutualSupport` tests | `[medium]` |
| Faction nav cost areas (Vol IX §5.3) | `[small]` |
| Detour Crowd config | `[trivial]` |
| Smart Objects for firing positions | `[small]` |
| Squad overlay debug tool | `[small]` |
| Session summary metric dump | `[small]` |

> **Exit.** The after-action test passes with you. You can narrate a fight you just had as a
> story with agents in it.

---

### Phase 2 — The Person · *1–2 months*

| Task | Cost |
|---|---|
| GAS integration: attributes, tags, effects for morale/suppression/wounds | `[medium]` |
| Morale model with the full input set (Vol IV) | `[medium]` |
| Suppression model + visible rate-of-fire collapse | `[small]` |
| `Broken` state: rout / freeze / surrender, weighted | `[medium]` |
| **Surrender set-piece animation + acceptance interaction** | `[medium]` |
| Five personality archetypes as data assets | `[small]` |
| Aim error model with **belief-uncertainty coupling** | `[medium]` |
| Mistake budget | `[small]` |
| Self-preservation override as a global StateTree transition | `[small]` |
| `Sense_Silhouette` (Vol IX §3.2) | `[small]` |
| Category-14 recognition barks (seeded early for act two) | `[small]` |
| Nearby-death reaction animation (Vol X §4.3 item 4) | `[medium]` |
| Morale/suppression debug bars | `[trivial]` |

> **Exit.** An enemy surrenders and you feel something about it. Property 6 exists.

---

### Phase 3 — The Director · *1–2 months*

| Task | Cost |
|---|---|
| Intensity accumulator + debug curve | `[small]` |
| Four-phase state machine with minimum durations | `[small]` |
| Reinforcement gating, out-of-sight placement | `[medium]` |
| Scarcity director | `[medium]` |
| **Relax-phase ambient behaviour scheduling** + category-13 lull barks | `[medium]` |
| Belief injection with fabricated sources, rate-limited | `[small]` |
| Mistake-budget release at lows | `[trivial]` |
| Difficulty parameter set, belief-side only (Vol XII §1.2) | `[small]` |
| Bounded silent DDA | `[small]` |
| Director HUD with decision reasons | `[medium]` |
| Unscripted event pool | `[medium]` |

> **Exit.** A twenty-minute unscripted session has a shape, and a fresh player describes its
> peaks without being prompted.

---

### Phase 4 — The Three Brains · *2–3 months*

| Task | Cost |
|---|---|
| Faction command layer, per-faction Knowledge Maps | `[medium]` |
| Comms network topology with physical, cuttable nodes | `[medium]` |
| Coarse influence/recency grid | `[medium]` |
| REDFOR: doctrine, road bias, artillery on stale beliefs | `[medium]` |
| REDFOR: campaign adaptation ledger with in-world telegraphing | `[medium]` |
| GREF: goat-track nav links, loyalty override, pooled ammunition | `[medium]` |
| BLUFOR: cordon tactics, restraint behaviour, naval gunfire | `[medium]` |
| **Dynamic nav modifiers for the four cut points** | `[medium]` |
| Faction-differentiated tactic sets | `[medium]` |
| Comms topology and nav cost debug views | `[small]` |

> **Exit.** A blind test where players identify the faction from behaviour alone, art
> stripped, materially better than chance.

---

### Phase 5 — The Squad Beside You · *2–3 months*

All of Vol XI. See §7 there for the breakdown.

> **Exit.** Zero blocking incidents across a full session, and a tester refers to a squadmate
> by name unprompted.

---

### Phase 6 — The Island · *2–4 months*

| Task | Cost |
|---|---|
| Mass Entity setup, fragments, processors | `[large]` |
| Promotion/demotion boundary with lossless state round-trip | `[large]` |
| Village and fishing-fleet background behaviour | `[medium]` |
| Offscreen garrison routine (coarse A-Life) | `[medium]` |
| Nav Invokers under World Partition | `[medium]` |
| Boat and sea AI | `[medium]` |

> **Exit.** The island feels inhabited when nothing is shooting.

**Phase 6 is the most deferrable phase in the roadmap.** If scope pressure arrives, this is
what goes.

---

### Phase 7 — The Turn · *2–3 months*

| Task | Cost |
|---|---|
| BLUFOR as an ambiguous presence: ROE, hesitation, identification | `[medium]` |
| Morale systems applied to the player's own side | `[medium]` |
| Recognition/ambiguity behaviours matured from Phase 2 | `[medium]` |
| Militia political positions affecting squadmate behaviour | `[medium]` |
| Non-combat resolution paths | `[large]` |

> **Exit.** Pillar four lands, through behaviour, without a cutscene.

---

### Phase 8 — Legibility polish · *ongoing, never finished*

Per-profile motion matching databases `[large]`. Real VO in Greek and Turkish `[large]`.
Telegraph audit against every logged death. Bark specificity pass. The legibility audit (Vol X
§6) run monthly forever.

---

## 3. Totals

| | Low | High |
|---|---|---|
| Phases 0–2 (the thesis slice) | 4 | 7 |
| Phases 0–5 (a complete combat game's AI) | 9 | 16 |
| Phases 0–8 (the full design) | 13 | 22+ |

**Solo-months, AI only, before any art, content, level design, weapons, UI or narrative.**

That is not a discouraging number. It is a planning number, and it is the input to §6.

---

## 4. Dependency order

Some orderings are forced. These are the ones that will hurt if violated:

```
Belief model ──┬── Squad tactics ──── Faction brains ──── The turn
               ├── Aim error model
               ├── Search behaviour
               └── Barks (content)
Morale ────────┬── Surrender ──────── Pillar three
               └── Cohesion ───────── Squad execution degradation
Harness ───────── everything (it is how you tune all of it)
Engine-agnostic split ──── harness, UE6 portability, determinism, replay
Squad layer (faction-agnostic) ──── allied squad AI comes nearly free
```

Two of these are worth restating as rules:

- **Build the harness before the content it validates**, not after. Phase 0.
- **Build the squad layer faction-agnostically**, so Phase 5 reuses it. This single decision
  removes roughly a month from Phase 5.

---

## 5. Risk register

| Risk | Sev | Likelihood | Mitigation |
|---|---|---|---|
| **Belief system leaks; an agent reads the player transform** | Fatal | High | Single chokepoint + automated build-failing test. Vol IX §3.1 |
| Legibility under-budgeted; AI is smart and feels dumb | Fatal | High | Vol X §6 audit monthly from Phase 1. The 4/6 effort split |
| Squad tactics flicker | High | Medium | Minimum commit time, tuned in Phase 1, never removed as an optimisation |
| Barks become noise | High | High | Budget and arbitration from day one, not retrofitted |
| Squadmates block doorways | High | Certain if avoidance is used | Push-through capsules. Vol XI N1 |
| Morale runaway: everyone routs at once | Medium | Medium | Per-squad thresholds, cohesion anchors, hysteresis. Caught by the harness |
| Mass Entity eats two months before a fight exists | High | Medium | Phase 6, not earlier. Vol IX §6 |
| Adaptation reads as punishment | Medium | Medium | Slow it; telegraph in-world before the player meets it |
| ML detour | Medium | Low | Policy recorded in Vol IX §2.5 so it is not re-proposed |
| EQS performance spike on a 300-point grid | Medium | High | Async, cached terrain bakes, small point sets |
| Dynamic navmesh hitch on cut points | Medium | Medium | Async tiled rebuild; test on the lowest target hardware |
| **UE6 transition strands the project** | Medium | Medium | Decision IX-3. The agnostic library is the insurance |
| **Scope: the AI is excellent and no game exists around it** | **High** | **High** | §6 |
| Motivation collapse at month 9 | High | Medium | §7 |

---

## 6. Scope reality

This section exists because a design document that only describes the ambition is not useful,
and because you will reread it in a year.

### 6.1 What is genuinely real here

The thesis (Vol 0) is correct and the historical record supports it. The architecture is sound
and buildable by one competent person. The specific combination — **belief modelling plus
morale plus surrender plus legibility**, in a casual PvE shooter with a scarcity economy — is a
real gap. Nobody has shipped it. F.E.A.R. had the legibility without the morale. Close Combat
had the morale without the legibility or the first-person immediacy. Left 4 Dead had the
pacing without either. The synthesis is available.

And PARTISAN's setting is a better fit for it than almost any premise you could have chosen.
The constraint sheet makes information scarcity *canon*: no drones, no thermal, no mesh, comms
that are phones and bells and runners. Nobody will ask why the garrison does not simply see
you. The production note on the site — that 2012 irregular warfare is the most photographed
conflict aesthetic of two decades, so reference is everywhere — holds for AI reference too.

### 6.2 What is not real

"Award-winning and genre-defining" is an outcome, not a specification, and it is not something
a plan can contain. The comparisons are instructive rather than discouraging: F.E.A.R. had a
team and a publisher. Left 4 Dead had Valve. Alien: Isolation had on the order of a hundred
people and several years, and its AI was one of several systems.

None of that means a solo developer cannot build something genuinely remarkable. It does mean
the honest version of this project is **a vertical slice that demonstrates the thesis**, not a
shipped game — and that this is not a consolation prize.

### 6.3 The recommendation

**Treat Phases 0–2 as the project.** Four to seven solo-months. One terrace, one stretch of
road, one squad, three or four minutes of play. Belief, morale, barks, surrender.

If that slice makes people say *"the AI in this is doing something I have not seen"*, you have
proved the thesis, you have something genuinely showable, and you have earned the right to
decide whether Phases 3–8 are worth another year and a half of evenings — with much better
information than you have now.

If it does not, you have spent four to seven months and learned the most valuable thing in
thirteen volumes.

Either outcome is a good outcome. That is what makes it the right first commitment.

### 6.4 The second return, which does not require any code

This compendium is content.

KCC is explicitly a hobby, reclassified for content and portfolio value with no revenue
targets. A rigorous, sourced, argued AI design document that traces a line from Pac-Man's
per-ghost targeting through Halo's morale thresholds and F.E.A.R.'s barks to a specific
unbuilt game is publishable material in its own right:

- A devlog series, one volume at a time
- A video essay or series on the Kaiser Cat Cinema channel, which is exactly the kind of thing
  that channel is for
- The artefact that makes PARTISAN's hidden site worth showing to someone
- A credible answer to "what have you been working on"

That return is available now, from the document as it stands, and it is not contingent on a
single line of C++. It is also, realistically, the highest expected-value output in the whole
plan on a per-hour basis.

---

## 7. Sustaining it

Practical notes on the thing that actually kills solo projects, which is not scope but
attrition.

- **The weekly loop** in Vol XII §7 exists for this reason. Automated overnight work means
  Monday always has something to react to, which is much easier than Monday having a blank
  page.
- **Phase exits are behavioural**, so every phase ends with a moment worth having. "An enemy
  surrendered and I felt something" is a better milestone than "the morale system compiles".
- **Ship the document before the game.** §6.4. Getting a real response to the thinking, early,
  is worth more for motivation than any amount of private progress.
- **Phase 6 is expendable.** Knowing in advance which phase you are allowed to cut removes a
  category of guilt.
- **The harness runs while you do not.** On weeks where FMP takes everything, the project still
  produces a regression report. That continuity matters more than it sounds.

---

## 8. Open questions

Carried forward from the site's own list, plus the ones this compendium raised.

1. **Does PARTISAN ship as a game at all?** The site lists this as not started. Thirteen
   volumes are downstream of this question and do not settle it.
2. **First or third person?** Third serves legibility — you can read your own squad's body
   language. First serves scarcity and fear. Affects Vol X §4 heavily and must be settled
   before animation budget is spent.
3. **Continuous island or discrete missions?** The director works in both. Vol VII's adaptation
   and Vol VIII's scarcity economy are much stronger in the continuous version.
4. **Does the player command the militia or serve in it?** Changes Vol XI fundamentally.
5. **Permadeath for named squadmates?** Pillar four says yes. C2 says no. Genuinely unresolved,
   and the best available compromise is probably narratively-gated permadeath: safe in ordinary
   play, real at authored moments.
6. **How much of act two is playable versus narrated?** Phase 7 is the most expensive and least
   certain phase in the roadmap.
7. **New this document: is the AI the product?** §6.4 raises the possibility that the
   compendium and a Phase 0–2 slice, presented as devlog content, is a better-shaped project
   than a game. That deserves a real decision rather than a drift.

---

*Vol XIII · PARTISAN AI Compendium v1.0.0 · internal*
