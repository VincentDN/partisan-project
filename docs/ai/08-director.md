# Volume VIII — The Director

*Axiom 4: pacing is an AI system. Working name: **The Quartermaster**.*

---

## 1. What it is and what it is forbidden from doing

The Quartermaster is the omniscient brain of the two-brain rule (Vol III §6). It sees
everything and **controls nothing that shoots**.

**Permitted levers:** reinforcement timing and routing, patrol density and routing, scarcity
placement, weather and time of day, unscripted event triggering, mistake-budget release, music
state, and — rate-limited and source-fabricated — belief injection.

**Forbidden, absolutely:** setting an agent's target, modifying an agent's accuracy or health
mid-engagement, spawning anything in view, or injecting a belief without a fabricated
perceptible source.

> **Why the prohibition list is short and absolute.** Every item on it is a shortcut that
> produces an immediate improvement in one encounter and a permanent degradation in player
> trust. The Director's authority is broad precisely because its *methods* are constrained;
> loosen the methods and the whole two-brain architecture is theatre.

---

## 2. Measuring intensity

### 2.1 The intensity accumulator

Per player (and per squad, for the militia's collective state):

| Input | Δ intensity |
|---|---|
| Damage taken | +0.08 per 10% health |
| Round passes within 2 m | +0.02 |
| Under sustained fire, per second | +0.04/s |
| Enemy within 20 m and aware of you | +0.03/s |
| Squadmate wounded | +0.15 |
| Squadmate killed | +0.30 |
| Ammunition below 25% | +0.10 |
| Pinned (cannot move without being hit) | +0.06/s |
| Isolated from squad | +0.02/s |
| Enemy killed | +0.03 (engagement, not relief) |
| Per second with no threat aware of you | −0.05/s |
| Per second in a safe region | −0.10/s |
| Reaching an objective | −0.20 |

Clamped `0..1`. **Note what is absent**: kills barely register. Intensity measures *pressure*,
not *activity*. A player mowing down unaware sentries has low intensity and should be given
something to worry about.

### 2.2 Secondary measures

| Measure | Use |
|---|---|
| **Time since last peak** | Drives the build-up phase |
| **Time in relax** | Gates the next build-up |
| **Resource state** | Drives scarcity placement |
| **Squad health** | Gates lethality of the next peak |
| **Exploration recency** | Rewards wandering with content, not punishment (§5.1) |
| **Death count in region** | Drives silent difficulty easing |
| **Session length** | Slow tension drift across a long session |

---

## 3. The four-phase cycle

Lifted from Left 4 Dead and adapted.

```
      intensity
        1.0 ┤          ╭───╮
            │         ╱     ╲
        0.7 ┤        ╱       ╲
            │       ╱         ╲
        0.4 ┤   ╭──╯           ╰──╮
            │  ╱                   ╲___
        0.1 ┤─╯                         ╰────────
            └──────────────────────────────────────
             BUILD    PEAK    FADE      RELAX     BUILD
             60-180s  30-90s  20-45s    90-240s
```

| Phase | Director behaviour | Exit condition |
|---|---|---|
| **Build-up** | Increase patrol density along the player's likely axis. Route a patrol to cross their path. No belief injection | Intensity > 0.5 or an engagement starts |
| **Peak** | Permit reinforcement. Allow one belief injection if the player has evaded for too long. Music up | Intensity > 0.85 sustained, or engagement resolves |
| **Fade** | Stop reinforcing. Allow the enemy to break contact. Release mistake tokens | Intensity < 0.4 |
| **Relax** | **No new threats.** Place scarcity. Run ambient AI behaviour (§4). Music down | Minimum duration elapsed AND intensity < 0.2 |

**⚠ load-bearing: the minimum relax duration.** It is the single parameter that most determines
whether the game feels paced or relentless. Start at 90 s, tune upward. The instinct under
playtest pressure ("it's boring here") is to shorten it; resist, and instead make the relax
phase *interesting* (§4) rather than short.

---

## 4. The relax phase is content, not absence

The most under-appreciated aspect of the L4D model. The lull is where the enemy becomes a
population instead of a spawn table, and it costs almost nothing because nothing is shooting.

**Ambient AI behaviour the Director schedules during relax:**

| Behaviour | What the player experiences |
|---|---|
| Sentries talking about pay, home, the weather | These men have lives. Pillar three, for free |
| A garrison radio call, audible, asking for relief that is not coming | The strategic situation, delivered as ambience |
| A work party building the fortification you provoked (Vol VII §5.3) | Your actions visibly change the world |
| A wounded man being carried to the customs house | Consequence |
| A church bell, distant | The island |
| Villagers going about business, avoiding a patrol | Occupation |
| Two soldiers arguing | Character |
| A patrol passing close by while the player is hidden | **Tension without threat.** The best item on this list |
| A boat leaving the north-shore anchorage | The smuggling route exists |

**The last one deserves emphasis.** A patrol that passes near a hidden player and does not
find them is the highest tension-per-cost event available, and it is entirely a Director
routing decision. Schedule these deliberately and often.

---

## 5. "Casual" as a hard constraint

The brief says casual PvE. That constrains the Director more than any other system.

### 5.1 The six rules

1. **Never punish exploration.** Wandering off the intended route must find *content* — an
   evidence Smart Object, an ambient scene, a supply cache, a view — not a squad wipe. Track
   exploration recency and bias placement toward it.
2. **Legibility over depth, always.** A player who does not understand why they died has had a
   bad time regardless of how sophisticated the reason was. When in doubt, make the AI dumber
   and louder.
3. **Graceful failure.** Losing a fight costs ground, ammunition, or a squadmate's health. It
   does not cost ten minutes of replay. Checkpointing should be generous to the point of feeling
   almost permissive.
4. **Comeback support.** After a loss, the Director tops up scarcity and lowers the next peak.
   Silently.
5. **No stealth tax.** Detection opens a *different* fight, never a failure state. The game
   must be completable loud, quiet, and badly.
6. **Enemies must be able to lose interest.** A player who breaks contact and hides must
   eventually be safe. Infinite pursuit is the most common way casual shooters become
   exhausting.

### 5.2 Difficulty: what scales and what must not

**⚠ The most important rule in this volume.**

| Scale these | Never scale these |
|---|---|
| Belief decay rates and uncertainty growth | **Enemy health** |
| Reaction time means | **Enemy damage** |
| Aim error base | Enemy count in an engagement (scale *frequency* instead) |
| Mistake-budget size and release rate | Player damage taken multipliers |
| Minimum relax duration | Anything the player can measure in one magazine |
| Belief-injection rate limit | |
| Scarcity generosity | |
| Morale floors (easier = enemies break sooner) | |

> **Why health scaling is forbidden.** It is detectable within one magazine. Once detected,
> the player knows the game is lying to them about the fiction, and every subsequent AI success
> — including the honest ones — is attributed to cheating. The entire compendium's credibility
> is downstream of never doing this. The alternative is strictly better anyway: an easier enemy
> who *finds you less reliably and breaks sooner* is more pleasant to fight than one who
> absorbs fewer bullets, and it reinforces the systems rather than undermining them.

### 5.3 The lethality problem

PARTISAN's setting implies high lethality: rifles, no armour, 2012 hardware. High lethality
plus casual PvE is a genuine tension and must be resolved deliberately.

**The resolution:** keep lethality high but make *being hit* rare and *being noticed* the real
failure state. Specifically:
- Enemy aim error is high at the ranges the island produces (Vol IV §5).
- Suppression makes it much higher, so the player's own fire is a defensive tool.
- Belief uncertainty means most incoming fire is aimed at where you were.
- Cover works, unambiguously.
- The player has a short grace on first contact: an agent transitioning to `Alert` has a
  reaction time, and that reaction time is the player's window.

Result: firefights where bullets are frightening and hits are uncommon, which is both
historically accurate and exactly the casual PvE feel that the brief asks for.

---

## 6. The scarcity director

PARTISAN's replacement for L4D's population control, and its main original contribution.

### 6.1 What it places

| Resource | Placement logic |
|---|---|
| Ammunition (by calibre) | Below target after a fight; biased to exploration-recent regions |
| Medical supplies | Strictly gated. Scarcity here is the primary source of tension |
| A working boat | Campaign-level, rarely, as a major event |
| Intelligence (a document, a prisoner, an overheard call) | During relax, to seed the next objective |
| A weapon upgrade (a scope, a better rifle) | Rare, memorable, from a named casualty |

### 6.2 The rules

1. **Never place in view.** Precomputed region visibility (Vol VI §7) makes this cheap.
2. **Place in plausible locations only**: a body, a cache, a house, a boat. Never floating in a
   corridor.
3. **Under-supply slightly.** The player should feel the pinch always and the crisis
   occasionally. The target is "enough, barely", not "enough".
4. **Ammunition comes from the enemy** wherever possible, closing the loop in Vol VII §6.2.

### 6.3 Why scarcity is a better Director lever than population

L4D modulates how many zombies attack. PARTISAN cannot: the garrison is ninety-one men, finite
and counted. But it *can* modulate how well-supplied the player is, which affects:

- Tactical choice (can I afford a firefight, or must I break contact?)
- Squad behaviour (the militia's pooled ammunition, Vol V §6.1)
- Risk appetite (do I take this fight for the ammunition on those bodies?)
- **And crucially, it modulates tension without modulating danger**, which is exactly what a
  casual game needs.

> This is the single design idea in the compendium most likely to be genuinely novel, and it
> follows directly from the setting's constraint sheet rather than being imposed on it.

---

## 7. Unscripted events

The Director's texture layer. A pool of events, each with preconditions, a phase restriction,
and a cooldown.

| Event | Phase | Effect |
|---|---|---|
| A goatherd on the ridge | Build | A plausible source for a belief injection (Vol III §6.3) |
| A pack mule breaks loose | Relax | Noise, comedy, a distraction with mechanical consequence |
| Weather closes in | Any | Visibility down for everyone. Favours the militia |
| A boat on the horizon | Relax | Foreshadowing. Free dread |
| Artillery registration fire | Build | REDFOR ranging in. Warns of what is coming |
| A deserter | Relax | A REDFOR soldier who wants to surrender. Information and a moral moment |
| A funeral in the village | Relax | Consequence, tone, pillar three |
| The relief ship that does not come | Campaign | The premise, dramatised |
| A rockfall closes a route | Any | The graph changes, and both sides must adapt |

**Rule:** every event must be *mechanically meaningful*, not just atmospheric. Weather changes
perception. The goatherd changes information. The mule changes noise. Atmosphere that does not
touch a system is a cutscene, and the player learns to ignore it.

---

## 8. What the Director must never be allowed to become

A running list of failure modes observed in other games:

| Failure | Symptom | Guard |
|---|---|---|
| Rubber-banding | The player notices they cannot get ahead | Never scale danger to player performance directly; scale *scarcity* and *frequency* |
| The invisible hand | Player detects placement | §6.2 rule 1 and 2 |
| The relentless machine | No relax phase in practice | Minimum relax duration, enforced, logged |
| Metronome pacing | Every peak the same length | Randomise phase durations ±30% |
| Difficulty death spiral | Losing makes it harder | §5.1 rule 4 |
| Content starvation in relax | The lull is empty | §4 |
| Belief-injection addiction | Enemies always know | Vol III §6.4 rate limit, and log every injection |

---

## 9. Instrumentation

The Director is the least visible system and the easiest to get wrong, so it needs the most
telemetry.

**The Director HUD** (debug):
- Live intensity curve, last 10 minutes, per player and per squad
- Current phase, time in phase, time to minimum exit
- Last 20 decisions with reasons and the inputs that drove them
- Belief injections, with source fabricated and whether the player could have perceived it
- Scarcity placed, where, and whether collected
- Exploration recency map

**Session summary** (logged to file, reviewed after every playtest):
- Number of peaks, durations, intensities
- Longest gap between peaks; longest continuous high-intensity period
- Relax phases below minimum duration (should be zero)
- Belief injections per hour
- Resource state over time

---

## 10. Implementation order

1. Intensity accumulator + the debug curve. `[small]`
2. The four-phase state machine with minimum durations. `[small]`
3. Reinforcement gating by phase. `[small]`
4. Out-of-sight placement using region visibility. `[small]`
5. Scarcity director. `[medium]`
6. Relax-phase ambient behaviour scheduling. `[medium]` — *the highest value item here*
7. Director HUD and session summary logging. `[medium]`
8. Belief injection with fabricated sources + rate limit. `[small]`
9. Mistake-budget release. `[small]`
10. Difficulty parameter set (belief-side only). `[small]`
11. Unscripted event pool. `[medium]`
12. Weather and time-of-day control. `[medium]`
