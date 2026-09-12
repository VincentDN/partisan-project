# Volume XII — Difficulty, Validation and Tooling

Three subjects that belong together because they are all about the same question: **how do you
know the AI is doing what you think it is doing, and how do you keep it doing that for
different players?**

---

## Part A — Difficulty and fairness

## 1. The invariant, stated once more

> **C5. Difficulty scales the information and time the AI has. Never its health or damage.**

This is the most-violated convention in the genre and the most important one in this project.

### 1.1 Why health and damage scaling is wrong here

| Scaling method | What the player perceives |
|---|---|
| Enemy health ↑ | The world became made of different material. Weapons feel worse. **Destroys the scarcity pillar**, because ammunition economy is now a difficulty tax |
| Enemy damage ↑ | Deaths become less explicable, violating C1 |
| Enemy accuracy ↑ (as a flat multiplier) | Reads as cheating, because it is invisible and unmotivated |
| Enemy count ↑ | Legitimate but crude; changes the fantasy from partisan to action hero |
| **Belief decay ↑/↓** | The enemy is better or worse at *tracking you*. Motivated, legible, thematic |
| **Reaction time ↓/↑** | The enemy is more or less alert. Visible in behaviour |
| **Mistake budget ↓/↑** | The enemy errs more or less. Produces the player's best moments |
| **Comms reliability ↑/↓** | The enemy coordinates better or worse. **Thematically perfect** |
| **Morale floor ↓/↑** | The enemy breaks sooner or later. Ties to the pillar |

The bottom five are all invisible-as-mechanics and visible-as-behaviour, which is exactly the
right property. A player on Easy is not fighting weaker soldiers; they are fighting soldiers
who are worse at finding them, slower to react, and quicker to break. That is a *different
fight*, not a discounted one.

### 1.2 The difficulty parameter set

| Parameter | Easy | Standard | Hard |
|---|---|---|---|
| Belief uncertainty growth rate | ×1.6 | ×1.0 | ×0.7 |
| Belief confidence decay | ×1.5 | ×1.0 | ×0.75 |
| Mean reaction time | ×1.4 | ×1.0 | ×0.8 |
| Mistake budget per engagement | ×1.8 | ×1.0 | ×0.5 |
| Comms success probability | ×0.75 | ×1.0 | ×1.0 |
| Morale floor | ×1.25 (break sooner) | ×1.0 | ×0.85 |
| Aim error at given skill | ×1.3 | ×1.0 | ×0.9 |
| Director scarcity generosity | ×1.4 | ×1.0 | ×0.8 |
| Enemy health | ×1.0 | ×1.0 | ×1.0 |
| Enemy damage | ×1.0 | ×1.0 | ×1.0 |

The last two rows are in the table specifically so that their being 1.0 is visible and
deliberate rather than forgotten.

⚠ **load-bearing**: comms success probability on Hard must not exceed 1.0. The temptation to
give hard-mode enemies *better than normal* coordination reintroduces omniscience by the back
door. Hard mode makes the AI *slower to forget*, never *faster to know*.

### 1.3 Dynamic difficulty adjustment

`ADOPT`, narrow, silent, director-mediated (Vol VIII). Per C7:

- A struggling player receives: quieter scarcity top-ups, slightly longer relax phases, a
  fractionally widened enemy mistake budget.
- A dominating player receives: shorter relax phases, earlier reinforcement, a tightened
  mistake budget.
- **Never** adjusted mid-engagement. Only between them, at phase boundaries.
- **Never** announced. Never visible in UI. Never mentioned in the options menu.
- Bounded hard: DDA may move any parameter by at most ±25% of its difficulty-level value, so a
  Hard player cannot be silently dropped to Easy.

> **Why bounded and silent.** Unbounded DDA punishes success, which players detect and
> resent — the classic rubber-band complaint. Announced DDA invalidates achievement. Bounded
> silent DDA smooths the tail of the distribution without ever becoming the player's model of
> the game.

### 1.4 The fairness principle

Fairness is *perceived*, not computed. Two rules follow:

1. **Any AI advantage must be attributable.** A belief injection (Vol VIII) must come with a
   fabricated, perceptible source. An enemy who knows where you are must have been told, or
   have seen something, and the player must be able to find out which afterwards.
2. **Perceived unfairness is a telegraph defect until proven otherwise.** When a tester says
   "that cheated", check the log first (§5). It almost never cheated; a channel failed.

---

## Part B — Validation

## 2. Metrics

Instrument from Phase 0. Retrofitting telemetry is miserable and it is exactly what you skip
when busy.

### 2.1 Core metrics with targets

| Metric | Target | Catches |
|---|---|---|
| **Belief positional error at moment of fire** | median 3–8m, **never 0** | Omniscience leaks ⚠ |
| Belief age at moment of fire | median 2–6s | Beliefs updating too eagerly |
| % of shots fired at a belief with confidence <0.5 | 10–25% | Whether "confidently wrong" is actually happening |
| % engagements with ≥1 tactic change | 30–60% | Rigidity (low) or flicker (high) |
| Median tactic hold duration | ≥8s | Commitment (property 3) |
| **% enemies who break rather than die** | **>25%** | Property 6. The differentiator |
| Surrender events per hour | >1 | Pillar three is real |
| Bark coverage of tactic changes | **100%** | Silent decisions |
| Barks per minute in combat | 8–20 | Over/under-speaking (Vol X §3.4) |
| **Player deaths with no telegraph in prior 3s** | **0** | The unforgivable one ⚠ |
| Squadmate blocking incidents | **0** | Vol XI N1 ⚠ |
| Squadmate silent periods >20s | 0 | Vol XI N2 |
| Friendly-fire-into-player events | 0 | Vol XI §4.2 |
| Behaviour variance across identical seeds+1 | measurably >0 | Determinism masking variety |
| Director relax phases below minimum duration | 0 | Pacing (Vol VIII) |
| Belief injections per hour | <4 | Director over-reliance on the cheat |
| Time-to-first-contact after player enters a region | 8–30s | Too instant or too dead |

### 2.2 Metrics that sound useful and are not

Recording these as explicit non-goals so they do not creep in:

- **AI win rate.** Meaningless; it is a difficulty setting, not a quality measure.
- **Average engagement duration.** Varies legitimately by encounter design.
- **Accuracy percentage.** A derived symptom of the aim model, not a target. Tuning to an
  accuracy target will break the belief coupling in Vol IV §5.
- **Pathing success rate.** Should be ~100% and is a bug metric, not a quality metric.

---

## 3. Playtest protocol

Always the same, so results are comparable across months.

### 3.1 The three questions

Asked after every session, in this order, before any discussion:

1. **"Tell me what happened in that fight."**
   The after-action test. Listen for whether they narrate *agents* ("the one on the left pulled
   back") or only *events* ("I got shot"). Agent-narration is the primary success signal of
   the entire project.

2. **"When were you surprised, and was it fair?"**
   Separates good surprise (tactic selection variance) from bad surprise (missing telegraph).

3. **"Did anything feel like it cheated?"**
   Then check the log. Record both the perception and the ground truth. The gap between them
   is the legibility defect list.

### 3.2 What not to ask

- Do not ask "was the AI good?" It produces politeness, not data.
- Do not ask about specific systems by name. A player who has been told about morale will
  report morale.
- Do not explain a behaviour before asking about it. The explanation is the thing you are
  testing for.

### 3.3 Cadence

| Milestone | Testers | Focus |
|---|---|---|
| Phase 0 exit | 1 (you) | Does watching the belief system work feel interesting |
| Phase 1 exit | 2–3 | The after-action test |
| Phase 2 exit | 3–5 | Does a surrender land emotionally |
| Phase 3 exit | 3–5, fresh | Can they describe the session's shape unprompted |
| Phase 4 exit | 5+, blind | Faction identification from behaviour alone |
| Phase 5 exit | 5+ | Squadmate name recall, zero blocking |
| Phase 7 exit | 5+, narrative-sensitive | Does pillar four land through behaviour |

Fresh testers matter from Phase 3. Repeat testers cannot evaluate pacing because they know the
content.

---

## 4. The headless harness

`ADOPT`, Phase 0, and the highest-leverage single item in the compendium for a solo developer.

### 4.1 What it is

The engine-agnostic library (Vol IX §1, Decision IX-3) compiled as a standalone executable
against a stub `IPartisanWorldQuery` backed by a simple grid or navmesh dump. No rendering, no
Unreal, no editor.

### 4.2 What it buys

| Capability | Value |
|---|---|
| 10,000 engagements overnight on a laptop | Statistical confidence on tuning changes that would take months of manual play |
| Deterministic replay from a seed | Bug reports that reproduce |
| Bisection across a parameter sweep | "At what belief-decay rate does the search behaviour stop feeling random" answered empirically |
| Regression detection | A tuning change that breaks surrender rates is caught the same night |
| Morale runaway detection | Whole-garrison-routs-at-once found without a playtest |
| Tactic deadlock detection | Two squads both waiting for the other, found in minutes |
| CI | Every commit runs 500 engagements and fails on metric regression |

### 4.3 Test scenarios to script

- REDFOR squad vs GREF squad, symmetric terrain
- REDFOR squad vs GREF squad, GREF uphill (should favour GREF heavily)
- One squad vs a phantom player that behaves scriptedly (rushes, hides, flanks)
- Comms severed vs intact, same scenario, compare belief quality and outcome
- Leader killed at t=5s vs never, compare morale trajectories
- Full-garrison morale cascade: kill one squad entirely, measure adjacent-squad morale
- Search behaviour: player hides, measure how long until the squad's belief becomes useless and
  whether the search *looks* plausible in the log

### 4.4 What it cannot tell you

Everything in Vol X. The harness has no audio, no animation and no player perception, so it
validates *decisions* and never *legibility*. Both are needed and they do not substitute. A
harness-green build can still feel terrible.

---

## Part C — Tooling

## 5. The debug toolkit

Built in Phase 0. Not negotiable, and specifically not deferrable, because velocity on a
stateful AI project is almost entirely a function of state visibility.

### 5.1 The belief visualiser ⚠

**If you build one tool, build this one.**

Draw, in world space, live:
- Every agent's beliefs as spheres, radius = positional uncertainty
- Colour by source: Saw / Heard / Told / Inferred / Guessed
- Opacity by confidence
- A line from agent to belief centroid
- Age in seconds as a label
- The squad's merged belief in a distinct colour
- The faction's belief in another

The moment you can *see* three agents holding three different, differently-wrong beliefs about
you, the whole design becomes tractable. Before that point, you are debugging blind.

### 5.2 The rest

| Tool | Shows | Phase |
|---|---|---|
| Squad overlay | Current tactic, hold timer, role assignments, cohesion, ammunition pool, why this tactic scored highest | 1 |
| Morale/suppression bars | Debug-draw over each agent | 2 |
| Director HUD | Intensity curve over time, current phase, last 5 decisions **with reasons** | 3 |
| Bark log | Speaker, category, the belief that generated it, whether it was audible to the player | 1 |
| Comms topology view | Radio nodes, coverage, cut links, message flow | 4 |
| Nav cost overlay | Per-faction traversal cost as a heatmap. Makes §IX 5.3 legible | 4 |
| Influence map view | Per-faction influence and recency grid | 4 |
| Visual Logger categories | Every belief update, tactic change, morale event, bark, timestamped and replayable | 0 |
| Forbidden-symbol build test | Fails on player-transform access from the AI module | 0 |
| Session summary dump | All §2.1 metrics to a file after every session | 1 |

### 5.3 The "why" requirement

Every debug display must answer **why**, not only **what**. A squad overlay that says
`Tactic: FixAndFlank` is half a tool. One that says:

```
Tactic: FixAndFlank  (held 6.2s / min 8.0s)
  scored 0.71  ← selected
    flank route exists      +0.30
    belief confidence 0.68  +0.20
    4 effective             +0.15
    morale 0.72             +0.06
  SuppressAndWait  0.64
    ammunition low          -0.18  ← would win if ammo dropped
  Rush             0.22
```

…is a complete tool, because it tells you what to change. Building the scorer to record its
own reasoning costs perhaps a day and saves weeks. Do it in Phase 1, not later.

---

## 6. Telemetry from external playtests

Once testing beyond your own machine:

- Log the §2.1 metric set per session, anonymised, to a file the tester sends back
- Log every death with a 5-second window of AI state before it
- Log every "cheap" flag if you give testers a hotkey to mark moments — **do this**, it is one
  keybind and it turns vague post-hoc complaints into timestamped log entries
- Never log anything identifying. This is a hobby project with friends as testers; keep it
  obviously clean.

The mark-a-moment hotkey deserves emphasis. "Something felt off around twenty minutes in" is
almost useless. A timestamp with 5 seconds of belief state around it is a fixable defect.

---

## 7. The weekly loop

The sustainable working rhythm this all supports:

1. **Monday:** read last week's harness regression report over coffee. Fix anything red.
2. **Midweek:** build one thing. One tactic, one sense, one telegraph.
3. **Thursday:** run the harness overnight on a parameter sweep for whatever you built.
4. **Weekend:** play it yourself for 30 minutes with the debug overlays on. Then play it once
   with them off. The second session is the real test.
5. **Monthly:** one external tester, the three questions, the legibility audit (Vol X §6).

The discipline that makes this work is that steps 1 and 3 are automated and run without you.
That is what the harness is for, and it is why it belongs in Phase 0 rather than "later".

---

*Vol XII · PARTISAN AI Compendium v1.0.0 · internal*
