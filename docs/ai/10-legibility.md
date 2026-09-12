# Volume X — Legibility

**The output layer.** Everything in Volumes III–VIII produces decisions. This volume is about
the only part of them the player will ever perceive. By the thesis (Vol 0), this is where the
perceived intelligence is actually manufactured, which makes this the volume most likely to be
under-budgeted and the one whose under-budgeting is most fatal.

---

## 1. The central claim, stated sharply

> **An AI decision that the player cannot perceive did not happen.**

This is not a figure of speech. For design purposes, treat unperceived decisions as having
zero value. A flanking manoeuvre executed perfectly, out of sight, that results in the player
being shot from a new angle is — from the player's side — indistinguishable from a spawn. The
flank cost you two months of squad-coordination work and returned nothing.

The corollary is uncomfortable and correct:

> **A crudely-implemented decision that is perfectly telegraphed is worth more than a
> sophisticated decision that is silent.**

Budget accordingly. If you have ten units of effort for a behaviour, the split is roughly
4 on the decision, 6 on making it visible. Most projects split it 9/1 and then wonder why the
AI "doesn't feel smart".

---

## 2. The telegraph rule

**Every AI decision that affects the player must be observable at least one beat before its
effect lands.** A beat is roughly 0.5–1.5 seconds, long enough to react, short enough not to
feel scripted.

| Decision | Telegraph | Channel |
|---|---|---|
| Flank begins | Movement bark naming a direction + visible break from cover + body turn | Audio + motion |
| Grenade | Distinct call + overhand windup silhouette + optionally a warning from your own squad | Audio + motion + ally audio |
| Rush | Shout, posture drop, acceleration, weapon lowered to run | Audio + motion |
| Suppression begins | Volume of fire rises audibly before accuracy matters | Audio + VFX |
| Squad withdrawing | Order barked, then staggered movement, then the position empties | Audio + motion |
| Morale collapsing | Vocal pitch and breath change, weapon handling degrades, cover-hugging increases | Audio + motion |
| About to surrender | Fire stops, a called plea, weapon lowered | Audio + motion |
| Artillery incoming | Spotter visible or radio call audible, then the whistle | World + audio |
| Adaptation (campaign scale) | The change is visible in the world before the player meets it in a fight | World |

### 2.1 The predictability paradox

Players consistently rate AI as *more* intelligent when it is *more* predictable at the
1–2 second horizon, provided it is unpredictable at the 10–30 second horizon.

The mechanism: perceived intelligence comes from the player successfully modelling the
opponent. A model that never predicts correctly is indistinguishable from randomness, and
randomness is never credited as intelligence. A model that always predicts correctly is
credited as intelligence *once*, then becomes boring. The sweet spot is a model that predicts
the *next move* reliably and the *plan* unreliably.

This has a direct design consequence: **variance belongs at the tactic-selection level, not at
the execution level.** Which tactic the squad picks should surprise you. How they execute the
tactic they picked should not.

> **Why.** Execution variance reads as incompetence or bugginess. Selection variance reads as
> decision-making. Same amount of randomness, opposite interpretation, entirely because of
> where it is applied.

### 2.2 The unforgivable failure

One metric above all others, from Vol XII: **deaths with no preceding telegraph should be
zero.** Not low. Zero, as a target, treated as a bug class.

When a playtester says "that felt cheap", the reflex is to check whether the AI cheated. It
usually did not. In nearly every case the actual defect is a missing or inaudible telegraph —
the AI did something reasonable and legal and the player had no way to know. Fix the
telegraph, not the behaviour.

---

## 3. Barks

### 3.1 The F.E.A.R. principle

> **The bark is not commentary on the tactic. The bark is the tactic's user interface.**

This is the single most transferable lesson in the corpus (Vol I). F.E.A.R.'s planner produced
coordination its contemporaries could also produce. What it did that they did not was announce
every coordination decision, specifically, in the moment, with direction and intent. Players
attributed the intelligence to the planner. It was in the audio.

### 3.2 Generation rules

| Rule | Rationale |
|---|---|
| **Generated at the squad layer**, on tactic selection and role assignment | Barks must reflect real decisions. Individually-triggered ambient barks are flavour, not interface |
| **Specific and directional** | "Above the wall, two of them" ≫ "Contact". Specificity is the entire mechanism by which the AI sounds like it knows something |
| **Reflect belief, including error** | An enemy confidently calling a position you left thirty seconds ago is the best single moment the system can produce. Vol III §6 |
| **Name people** | "Stelios is hit" carries ten times the weight of "man down". Requires named agents, which you want anyway |
| **One speaker per squad at a time** | Arbitration, §3.4 |
| **Urgency from state, not from the line** | The same line at morale 0.8 and morale 0.2 must sound different. MetaSound parameters, Vol IX §10 |
| **Never repeat within a window** | Repetition is the fastest way to break the illusion. Track per-line cooldowns per squad |

### 3.3 The taxonomy

Twelve categories, minimum viable set. Expanded from the short document.

| # | Category | Trigger | Must carry | Example shape |
|---|---|---|---|---|
| 1 | **Contact** | Belief created, confidence > 0.5 | Direction + landmark + count if known | "Up on the terrace, by the olive!" |
| 2 | **Update** | Belief revised | New direction, and audible doubt if confidence dropped | "He's moved — left, going left!" |
| 3 | **Stale** | Belief aged past threshold, still acting on it | Explicit uncertainty | "He was on the wall a minute ago. Was." |
| 4 | **Loss** | Belief confidence below threshold | Admission | "I've lost him. Anyone?" |
| 5 | **Tactic call** | Tactic selected | The intent, plainly | "Pin him! I'm going round the wall!" |
| 6 | **Role call** | Role assigned | A name and a task | "Yusuf — the road. Don't let him cross." |
| 7 | **Suppression** | Under sustained fire | Pinned, asking for help | "Can't move! Get something on that ridge!" |
| 8 | **Ammunition** | Below threshold | The actual state | "Two magazines. Two." |
| 9 | **Casualty** | Friendly down | The name, and a reaction that varies by Loyalty | "They got Stelios — Stelios!" |
| 10 | **Leader down** | Cohesion anchor lost | Confusion, then succession | "Who's calling it? …I'm calling it." |
| 11 | **Morale** | Approaching floor | Escalating fear, breath, pitch | — |
| 12 | **Surrender** | Broken + offer available | Unambiguous, in both languages | — |

Plus two that carry the setting rather than the tactics:

| 13 | **Lull** | Director relax phase | Character, grievance, homesickness, rumour | "Six months. Six months no pay." |
| 14 | **Recognition** | Act two, ambiguous identification | Hesitation | "Is that one of ours? …Is that one of ours!" |

Category 13 is where PARTISAN's setting lives. The garrison calling for a relief that is not
coming, during a quiet moment, does more for the premise than any cutscene. It costs recording
time and no engineering.

Category 14 is the mechanical seed of pillar four and should be built in Phase 2, long before
it is narratively needed, so it is mature by act two.

### 3.4 Arbitration

A bark queue per squad with:

- **Priority** (leader-down and surrender outrank ammunition state)
- **Budget**: maximum N barks per squad per window, tuned down until it feels like a unit
  rather than a crowd
- **Exclusivity**: one speaker per squad, enforced
- **Interruption rules**: high-priority barks cut low ones mid-line, which itself reads as
  urgency and is a feature
- **Global cap** across all squads in earshot, so a three-squad fight does not become noise
- **Cooldown per line** and per category per speaker

> **Why a budget rather than "play everything".** Barks are an information channel with a
> bandwidth limit set by human attention, not by audio voices. Past roughly one line every
> three seconds in a fight, comprehension collapses and the player stops parsing any of it.
> Under-speaking is recoverable. Over-speaking destroys the channel.

### 3.5 Language

Greek and Turkish, subtitled. This is a legibility *asset*, not an obstacle:

- Tone, direction, urgency and breath carry fully without comprehension. The information layer
  the player needs most in the moment is entirely preserved.
- It forces investment in **delivery** over vocabulary size, which is the correct place to
  spend and the place most projects underspend.
- Subtitles handle the semantic layer, and subtitle timing gives you a second, tunable channel.
- Act two acquires an extra dimension for free: the player's own side and the relief force
  speak the same language, and the difference is accent and register rather than tongue.

Practical: subtitle only what the player could plausibly parse. A distant enemy shout is
directional audio without a subtitle. The subtitle appearing *is itself* a proximity cue.

---

## 4. Motion as telegraph

### 4.1 What body language must carry

| Signal | Read | Implementation |
|---|---|---|
| Weight and momentum | This is a person, not a capsule | Motion matching, proper deceleration |
| Commitment to a direction | A flank is starting | Turn-in-place before movement, shoulder lead |
| Suppression | They are pinned | Posture drop, head-down, hesitation before exposure |
| Fear | Morale is failing | Faster, less controlled movement; poor weapon discipline; looking backward |
| Confidence | Morale is high | Deliberate pace, weapon up, scanning |
| Fatigue | Long engagement, wounds | Slower recovery, heavier steps, weapon lowering between bursts |
| Injury | Wounded state | Asymmetric gait, favoured side, degraded aim |
| Intent to surrender | Read it before it happens | Weapon lowering by degrees over two seconds |

### 4.2 Per-profile locomotion

From Vol IV: the five archetypes need distinguishable movement, not just distinguishable
numbers. Separate pose databases per profile is expensive — `[large]` — and it is the specific
expense that converts "the AI has personality parameters" into "that one moves like an old
man". A player who can tell the Old Soldier from the Conscript across a courtyard, before
either fires, is experiencing the payoff.

Cheaper partial version, if the full databases are out of scope: one database, per-profile
**Chooser** tables plus per-profile additive layers and speed/acceleration curves. Gets perhaps
60% of the read for 20% of the cost. Acceptable for Phases 0–7; revisit in Phase 8.

### 4.3 The set-piece exceptions

Almost everything should be procedural. Four moments justify authored root-motion set-pieces,
because they carry disproportionate emotional weight and must be unambiguous:

1. **Surrender.** Weapon lowered, then dropped, hands raised. Must be readable at 60m and
   instantly distinguishable from reloading, which is a real and dangerous confusion.
2. **Rout start.** The moment of breaking. Turn, stumble, run.
3. **Casualty drag.** Loyalty made visible. Two agents, one authored interaction.
4. **Death reactions of nearby friendlies.** The flinch and turn toward a killed squadmate.
   This is the animation that makes morale legible, and without it the entire morale system
   in Vol IV is invisible.

Item 4 is routinely omitted and is the highest-value of the four.

---

## 5. Silence as a channel

A bark system that runs continuously has no dynamic range. Deliberate silence is itself
information:

- **A squad that goes quiet is manoeuvring.** Train the player on this. It is free tension.
- **Comms cut = audible reduction in barks.** The player who cuts the radio network should
  *hear* the garrison become stupider. This is the entire payoff of the comms mechanic and it
  is delivered by the audio layer, not the logic layer.
- **The lull.** Vol VIII's relax phase is where category-13 barks live. Silence, then a
  distant conversation about pay, then silence again.
- **Post-surrender.** After a garrison position gives up, that area goes quiet in a specific
  way. Earned quiet.

---

## 6. The legibility audit

A recurring process, not a one-off. Run it every milestone.

**Procedure:**
1. Record a playtest with full AI logging (Vol XII).
2. For every player death, scrub back 3 seconds. Identify the telegraph. If there is none, log
   a defect against the behaviour, not the balance.
3. For every "that was cheap" comment, find the corresponding log entry, establish what the AI
   actually knew and why, and determine which channel failed.
4. For every engagement, ask whether the player could have narrated the enemy's plan. Sample
   this by actually asking them (Vol XII §3).

**Defect classes to expect, in descending frequency:**

| Class | Symptom | Usual fix |
|---|---|---|
| Missing telegraph | "Where did that come from" | Add the bark or the motion tell |
| Inaudible telegraph | The bark played and was masked | Ducking priority, not volume |
| Ambiguous telegraph | Two behaviours share a tell | Differentiate the animation |
| Untimely telegraph | Tell and effect simultaneous | Add lead time to the behaviour |
| Contradicted telegraph | Announced a flank, did something else | Minimum commit time too short (Vol V) |
| Overspoken | Nothing parsed | Tighten the bark budget |

The last row is the one that surprises people. More barks is not more legibility.

---

## 7. UI restraint

The temptation, when AI state is hard to read, is to surface it in UI: threat indicators,
awareness meters, morale bars. Resist, for a specific reason.

> **Every piece of AI state moved into UI is a piece of AI state that no longer needs to be
> expressed in behaviour — and behaviour is the only channel that makes it feel like a
> person.** UI legibility competes with, and displaces, behavioural legibility.

Permitted UI: damage direction, squadmate status at a glance, objective markers. Not permitted:
enemy awareness meters, morale bars, tactic indicators. If the player cannot tell an enemy is
about to break without a bar, the animation and audio work is not done, and the bar will let
you never finish it.

The single exception worth considering is an accessibility option (Vol IX/XII): a mode that
surfaces AI state visually for players who cannot use the audio channel. Build it as an
accessibility feature explicitly, not as a default, so it never becomes the crutch.

---

## 8. Checklist — the readable enemy

Before any behaviour ships:

- [ ] Does it have an audio telegraph that names direction or intent?
- [ ] Does it have a motion telegraph readable in silhouette at 40m?
- [ ] Is the telegraph at least 0.5s before the effect?
- [ ] Is the telegraph distinguishable from every other behaviour's telegraph?
- [ ] Does the bark reflect the agent's *belief*, including when wrong?
- [ ] Does the tell degrade correctly under suppression, fear and injury?
- [ ] Does a nearby friendly react to it?
- [ ] Can a playtester describe the behaviour in their own words afterwards?
- [ ] Does it produce zero untelegraphed deaths in the log?

---

*Vol X · PARTISAN AI Compendium v1.0.0 · internal*
