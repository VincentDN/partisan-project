# Volume IV — The Individual Agent

*Perception, awareness, morale, suppression, personality, aim, mistakes, and the one reflex
that overrides everything.*

---

## 1. What an agent is

```
AGENT
├── Identity          name, village, archetype, faction, voice bank
├── Profile           FCombatantProfile (§4) — static, authored
├── Physiology        health, wounds, fatigue, ammunition
├── Psychology        morale, suppression, awareness state
├── Cognition         personal beliefs (Vol III), last-known friendlies
├── Assignment        squad, role, current tactic, reserved position
└── Motor             posture, stance, locomotion style, aim state
```

Everything the player reads as personality comes from **Profile × Psychology**. Everything they
read as competence comes from **Cognition × Assignment**. Keep the two separable, because you
will tune them independently and constantly.

---

## 2. Perception and the awareness ladder

### 2.1 Sight

```
SightScore = Visibility(target)          // posture, movement, camouflage, light
           × AngleFalloff(eccentricity)  // sharp centre, poor periphery
           × RangeFalloff(distance)
           × Occlusion(trace samples)
           × AlertnessMultiplier(state)
           × Profile.Perception
```

Accumulate `SightScore` over time into an **awareness meter per target**, rather than making a
binary detection roll. Meters rise and fall. This gives Thief's graduated states for free and
makes the system learnable.

**Parameters worth stating as design, not code:**

| Factor | Effect | Design intent |
|---|---|---|
| Prone + still + in scrub | ×0.05 | Concealment must be a real verb |
| Standing + moving + open | ×1.0 | Baseline |
| Sprinting | ×1.8 | Movement is the loudest visual signal |
| Muzzle flash at night | ×4.0, one-shot spike | Firing gives you away. Central to scarcity |
| Peripheral (>50° off-centre) | ×0.3 | Flanking works |
| Behind (>110°) | ×0.0 | Hard zero. No back-of-head detection, ever |
| Dusk / dawn | ×0.5 | The island's best hours |
| Night, no torch | ×0.15 | 2012 constraint: no NVGs. Night is *dark* |
| Lit by torch/flare | ×2.5 | Which is why they carry flares |

> **Setting payoff.** The constraint sheet bans night vision and thermal. That makes night a
> genuine tactical regime rather than a colour filter, and it makes the flare a weapon. Very
> few modern shooters can say that, because most give everyone NVGs and lose the whole axis.

### 2.2 Hearing

Sound events carry `{position, intensity, type, instigator}`. Propagation is routed through
navigable space where possible, so sound rounds corners. Intensity falls with distance and
with occlusion.

| Sound | Base radius | Belief precision |
|---|---|---|
| Silenced/suppressed shot | 40 m | Poor direction |
| Rifle shot | 400 m (echoing on the spine: 900 m, poor direction) | Direction good, distance bad |
| Grenade | 500 m | Direction good |
| Shout | 60 m | Precise |
| Footstep, hard surface | 15 m | Precise |
| Footstep, scrub | 6 m | Vague |
| Vehicle | 300 m | Direction good, continuous |
| Church bell | island-wide | Region only |
| Boat engine | 600 m over water | Direction good |

**The echo rule.** On a limestone island, a rifle shot's direction is genuinely hard to place.
Model this: a distant shot creates a belief with *good* confidence that something happened and
*poor* positional precision. This is both authentic and mechanically excellent, because it
means the player can shoot without being instantly located — which the scarcity pillar needs,
or firing becomes suicide and the game stops.

### 2.3 The awareness ladder

Six states. Every transition has a **mandatory** audible and visible tell. No silent changes.

| State | Entry | Behaviour | Tell |
|---|---|---|---|
| `Unaware` | default | Routine, Smart Object idle, conversation | Relaxed posture, slung weapon, ambient chat |
| `Curious` | meter > 0.15 | Stops task, orients, does not raise weapon | Head turn, questioning bark, task abandonment |
| `Suspicious` | meter > 0.35 | Investigates alone, low ready, may call a friend | Deliberate movement, torch on, weapon at low ready |
| `Alert` | meter > 0.65 or any shout | Weapon up, seeks cover, calls squad | Named directional callout, sprint to cover |
| `Engaged` | belief confidence > 0.5 + hostile confirmed | Squad tactic active | Sustained fire, coordination barks |
| `Broken` | morale < floor | Rout, freeze, or surrender (§3.5) | Unmistakable and unique animation set |

**Decay** is slower than ascent, and personality-modulated. `Alert → Suspicious` takes 20–60s
of nothing happening. `Suspicious → Unaware` takes another 30–90s. **Never let an agent return
to `Unaware` while a body is visible or a friend is missing** — that single omission is
responsible for most of the "AI is stupid" reaction in stealth games.

### 2.4 The learnability requirement

Every parameter above must be discoverable by a player through play. This means:

- Consistent. No random detection rolls that produce different outcomes from identical inputs.
- Telegraphed. The tell precedes the consequence.
- Symmetric where possible. What the player can hear, the AI can hear, using the same
  propagation code (Vol II §8.2).

---

## 3. Morale and suppression

**The single largest differentiator in the project.** Two floats, both `GameplayAttribute`s,
both driven by `GameplayEffect`s, both independently readable from thirty metres without UI.

### 3.1 Suppression — fast, tactical

Range `0..1`. Rises fast, falls fast.

| Input | Δ |
|---|---|
| Round passes within 1 m | +0.25 |
| Round passes within 3 m | +0.12 |
| Round impacts cover within 2 m | +0.15 |
| Automatic fire in your direction (per second) | +0.30/s |
| Explosion within 15 m | +0.50 |
| Losing cover while under fire | +0.20 |
| Friend hit within 5 m | +0.15 |
| Per second not under fire | −0.20/s |
| Per second in hard cover, not under fire | −0.35/s |

**Effects of suppression:**

| Suppression | Effect |
|---|---|
| 0.0–0.25 | Normal |
| 0.25–0.5 | Aim error ×1.4, reluctant to leave cover, head-down animation layer |
| 0.5–0.75 | Aim error ×2.2, will not move between cover, fires blind, rate of fire halves |
| 0.75–1.0 | **Pinned.** Will not fire aimed shots. Will not move. Morale drains at 0.05/s |

> **⚠ load-bearing.** The rate-of-fire collapse is the player's read on suppression. It must be
> unmistakable by ear. If a player cannot tell a suppressed enemy from an unsuppressed one with
> their eyes closed, this system is invisible and worthless. Test this specifically.

### 3.2 Morale — slow, dramatic

Range `0..1`. Starts at a per-archetype value. Changes are events, not continuous, except where
noted.

| Input | Δ |
|---|---|
| Friendly killed, seen, within 10 m | −0.20 |
| Friendly killed, seen, 10–40 m | −0.12 |
| Friendly killed, heard only | −0.06 |
| **Squad leader killed** | **−0.30** and cohesion penalty until succession |
| Wounded (any) | −0.25 |
| Wounded (serious) | −0.40 |
| Pinned, per second | −0.05/s |
| Ammunition below 25% | −0.10 one-shot, then −0.02/s |
| No squad contact, per second | −0.03/s |
| Comms lost with faction command | −0.10 |
| Enemy killed by self or squad | +0.12 |
| Objective taken or held | +0.15 |
| Reinforcement arrives visibly | +0.30 |
| Leader present and unbroken, per second | +0.02/s |
| In safe area, per second | +0.04/s |
| Officer rallies (explicit action) | +0.25, once per N minutes |

### 3.3 The morale bands

| Band | Range | Behaviour |
|---|---|---|
| `Steady` | > 0.7 | Full tactical repertoire, will advance, will flank |
| `Shaken` | 0.45–0.7 | Will not advance. Holds. More cover-seeking. Discipline degrades |
| `Wavering` | `Floor`–0.45 | Seeks the cohesion anchor. Executes tactics badly. Vocal fear |
| `Broken` | < `Floor` | §3.5 |

`Floor` is `Profile.MoraleFloor`, typically 0.15 (Zealot) to 0.40 (Conscript).

### 3.4 Cohesion and propagation

Morale propagates only by **perception**, never globally. An agent's morale changes because
they *saw or heard* something. This keeps it honest and keeps the player's actions causal.

**Cohesion anchors** damp propagation. An unbroken leader within 25 m applies a morale floor
bonus to the squad and slows decay. **Killing the leader is therefore the correct tactical
play, discoverable without a tutorial, and produces a visible cascade.** This is Halo's
grunt-panic mechanism, generalised.

### 3.5 The Broken state

On crossing `Floor`, roll on a weighted table. Weights are per-faction and per-archetype.

| Outcome | Behaviour | REDFOR | GREF | BLUFOR |
|---|---|---|---|---|
| `FallBack` | Retreat to nearest anchor, still armed, will fight if cornered | 35% | 45% | 50% |
| `GoToGround` | Stops fighting, stays in cover, does not shoot, may recover | 25% | 25% | 30% |
| `Rout` | Flees, drops nothing, will not stop until safe or dead | 20% | 25% | 10% |
| `Surrender` | Weapon down, hands up, becomes a non-combatant | 20% | 5% | 10% |

**Recovery** is possible from `FallBack` and `GoToGround` if morale rises above `Floor + 0.15`
(hysteresis, mandatory, or agents oscillate). `Rout` and `Surrender` are terminal for that
engagement.

### 3.6 Runaway prevention

Total Wars' chain rout is dramatic and would be wrong here: the garrison collapsing across the
whole island from one lost squad destroys the campaign. Guards:

1. Propagation requires perception (§3.4) — no global morale.
2. Hysteresis on `Broken` entry and exit.
3. **Per-squad floor**: a squad cannot lose more than 2 members to `Broken` in 10 seconds; the
   third is deferred. This is an unapologetic gameplay lie in service of pacing and it should
   be logged so it can be tuned.
4. Faction command can commit a rally (officers, Vol VII).

---

## 4. Personality

### 4.1 The profile

```cpp
USTRUCT()
struct FCombatantProfile
{
    float Aggression;       // 0..1  push vs hold
    float Caution;          // 0..1  exposure tolerance
    float Discipline;       // 0..1  adherence to tactic under stress
    float MoraleFloor;      // 0..1  where Broken begins
    float MoraleStart;      // 0..1  starting morale
    float ReactionMean;     // ms
    float ReactionJitter;   // ms
    float AimSkill;         // 0..1
    float Curiosity;        // 0..1  investigation willingness
    float Loyalty;          // 0..1  will break formation for a wounded friend
    float Chattiness;       // 0..1
    float Fitness;          // 0..1  movement on steep ground, fatigue rate
    FName VoiceBank;
    FName LocomotionStyle;
};
```

### 4.2 The authored archetypes

Author these **as a set, in one pass**, so they read as contrasting. Then never randomise
between them arbitrarily — squad composition is a design decision (§4.4).

| | Aggr | Caut | Disc | Floor | React | Aim | Curio | Loyal | Chat | Fit |
|---|---|---|---|---|---|---|---|---|---|---|
| **The Sergeant** (R) | .55 | .55 | .95 | .15 | 320 | .75 | .70 | .80 | .75 | .70 |
| **The Conscript** (R) | .25 | .80 | .35 | .40 | 750 | .30 | .30 | .40 | .85 | .55 |
| **The Old Soldier** (R) | .30 | .90 | .70 | .20 | 400 | .90 | .50 | .50 | .25 | .40 |
| **The Zealot** (R/G) | .95 | .10 | .30 | .10 | 380 | .45 | .60 | .30 | .60 | .85 |
| **The Shepherd** (G) | .45 | .75 | .25 | .25 | 500 | .60 | .90 | .90 | .50 | .95 |
| **The Fisherman** (G) | .50 | .55 | .40 | .30 | 550 | .50 | .55 | .95 | .70 | .75 |
| **The Schoolteacher** (G) | .30 | .70 | .60 | .35 | 650 | .35 | .80 | .85 | .95 | .45 |
| **The Ex-Sergeant** (G) | .60 | .50 | .80 | .15 | 340 | .80 | .65 | .75 | .80 | .65 |
| **The Lieutenant** (B) | .60 | .60 | .95 | .12 | 300 | .80 | .75 | .70 | .85 | .75 |
| **The Regular** (B) | .50 | .60 | .85 | .22 | 380 | .70 | .50 | .60 | .45 | .80 |

*(R) REDFOR, (G) GREF, (B) BLUFOR.* These are starting values. **⚠** The *spread* matters more
than the values: if `ReactionMean` ranges only 300–400ms across the roster, the roster is
uniform and the design has failed.

### 4.3 Per-instance jitter

Each spawned agent gets ±10% on every float, seeded from their identity so it is stable across
saves. Two Conscripts are not identical, but a Conscript is always recognisably a Conscript.

### 4.4 Squad composition as a design lever

A squad's *feel* comes from its mix. Author compositions, not counts.

| Composition | Feel | Use |
|---|---|---|
| Sergeant + 3 Conscripts | Brittle, held together by one man. Kill him and it folds | Early REDFOR. Teaches the leader mechanic |
| Old Soldier + 2 Regulars | Slow, accurate, will not be baited | Customs house garrison. Hard fight |
| Zealot + 3 Conscripts | Chaotic, dangerous, self-destructive | Night counter-attack. Memorable |
| 4 Regulars + Lieutenant | Competent, coordinated, unflashy | BLUFOR. Feels *different* immediately |
| Shepherd + Fisherman + Schoolteacher | Amateur, brave, disobedient | Player's squad. Charming |

---

## 5. Aim, reaction, and the error model

### 5.1 Do not roll for hits

Model the weapon pointing somewhere wrong; let ballistics be honest. This is the Quake III bot
lesson (Vol I §3.5) and it is the difference between an enemy that *misses* and an enemy that
*fails to hit*.

### 5.2 The aim pipeline

```
1. AimPoint  = Belief.LastKnownPos + LeadEstimate(Belief.Velocity) · Profile.AimSkill
2. Error     = BaseError(Profile.AimSkill)
             × SuppressionMult          1.0 → 3.0
             × MovementMult(self)       1.0 → 2.5
             × MovementMult(target)     1.0 → 1.8
             × RangeCurve(weapon, d)
             × UncertaintyMult          1 + Belief.PosUncertainty / 4      ← the important one
             × WoundMult                1.0 → 2.0
             × FatigueMult              1.0 → 1.5
             × StanceMult               prone .6, crouch .8, standing 1.0, moving 1.6
3. Apply error as a slowly-drifting offset, not per-shot randomness (§5.3)
4. Converge toward AimPoint over TrackingTime = f(Profile.ReactionMean, angular distance)
5. Fire when |aim - AimPoint| < FireThreshold, subject to weapon discipline and ammo state
```

### 5.3 Drifting error, not per-shot randomness

Per-shot random error produces a shotgun scatter that reads as machine noise. Real bad
shooting is **correlated**: a man who is aiming slightly left keeps hitting slightly left.

Implement error as a low-frequency noise field (Perlin or a simple damped random walk) sampled
over time, so that impacts *cluster* and the cluster *drifts*. The player can then read the
cluster and know they have been approximately located but not precisely — an information
channel delivered by physics.

### 5.4 Reaction time

Two components, both mattering:

- **Detection-to-orient**: `Profile.ReactionMean ± Jitter`, modified by awareness state
  (an `Alert` agent reacts in half the time of an `Unaware` one).
- **Orient-to-fire**: angular distance / turn rate, plus a weapon-raise animation time that is
  *actually the animation's length*, not a number. Making the delay come from animation is
  what makes it look real.

### 5.5 Weapon discipline and the scarcity read

Ammunition state must be audible. Agents with a full magazine fire in bursts; agents below 30%
fire single aimed shots and say so. **A player should be able to hear a position running dry.**
This is the scarcity pillar expressed through the aim system and it is nearly free.

---

## 6. Compliance, surrender, and the third pillar

Pillar three ("nobody here is a monster") is a systems requirement, not a tone note.

### 6.1 Surrender behaviour

An agent entering `Broken → Surrender`:
1. Ceases fire immediately.
2. Plays an unmistakable, long, uninterruptible animation: weapon dropped, hands raised.
3. Calls out — **in their own language** — and keeps calling.
4. Becomes a non-combatant entity with its own state (`Compliant`, `Fleeing`, `Reneging`).
5. Can be accepted (moves to a holding point), ignored (stays), or killed.

### 6.2 The renege

A small fraction of surrenders are false: the agent recovers morale, picks the weapon back up,
and fights. Rate: 5–10%, higher for Zealots, lower for Conscripts.

> **Why include this at all.** Without it, surrender is a free win and the player accepts every
> one without thought. With it, accepting a surrender is a *decision with risk*, which is
> exactly the moral texture pillar three asks for. Tune the rate low enough that trusting is
> still correct, high enough that it is a choice. This is the most ethically interesting number
> in the game and it should be set deliberately.

### 6.3 Calls for surrender

BLUFOR and REDFOR officers will **demand** surrender from an isolated, low-morale enemy before
assaulting: a pause, a call, a timer. If the player's squad is the target, this is a genuine
mechanic. If the enemy is the target, the player watches it happen and understands these are
people with procedures.

### 6.4 Wounded

Wounded agents call out, and their squadmates' `Loyalty` may override the tactic to reach them
(Vol V §7). A wounded man calling for help is the most powerful audio asset in the game and
should be treated as such.

### 6.5 The atrocity guard

The game must be able to depict, without endorsing, the thing that happened on these islands.
Surrendered and wounded agents must be killable, the game must notice, and squadmates must
react — morale, barks, and later dialogue. **Do not implement a score penalty.** Implement a
*reaction*. Vol XI §5.

---

## 7. The self-preservation override

One subsumption layer (Vol II §2.8) sitting above the tactical assignment.

**Trigger conditions** (any):
- Incoming grenade within lethal radius.
- Health below 25% and under direct fire.
- Cover destroyed while under fire.
- Suppression at 1.0 for more than 2 seconds with a better position available.
- Vehicle or falling hazard.

**Effect:** the agent abandons its role assignment, takes the local survival action, barks an
apology or an alarm, and *reports the break to the squad*, which may trigger a tactic
re-evaluation.

> **Why this matters more than its size suggests.** An agent that follows orders into obvious
> death reads as a token. An agent that breaks, survives, and then sheepishly returns to its
> position reads as a person. This is perhaps the highest ratio of believability to code in the
> entire compendium: a few hundred lines for one of the top three "there's someone in there"
> moments.

---

## 8. The mistake budget

Authored fallibility, spent deliberately.

Each agent carries `N` mistake tokens per engagement (2–5, inverse to `Discipline` and
`AimSkill`). A mistake is **released** when: the Director signals a pacing low, the agent's
suppression is low (mistakes under fire read as panic, not error), and a cooldown has elapsed.

**The authored mistake catalogue:**

| Mistake | Reads as | Risk if overused |
|---|---|---|
| Reload at a bad moment | Human timing error | Low |
| Over-push past the tactic's bound | Eagerness | Medium — can read as stupid |
| Mis-call a direction by one landmark | Confusion under stress | Low. **Best value** |
| Break cover a beat early | Impatience | Low |
| Fire at a shadow or an animal | Nerves | Low. Excellent at night |
| Fail to check a flank | Tunnel vision | Medium |
| Bunch up with a squadmate | Poor drill | Medium |
| Drop or fumble a grenade | Panic | High — use once per hour at most |
| Announce a plan too loudly | Indiscipline | Low. **Best value** |

**⚠ The distinction that matters**: a mistake must be *plausible* and *readable*. A player who
catches an enemy mid-reload feels clever. A player who watches an enemy walk into a wall feels
cheated. All the value is in the authoring, none in the randomness.

---

## 9. Fatigue and the vertical island

Steep terrain, no flat ground. Fatigue accumulates from climbing, sprinting, and carrying, and
it feeds aim error, movement speed, and morale decay.

**The design payoff:** GREF's `Fitness` is high and their terrain cost off-road is low; REDFOR's
is the reverse. A garrison squad that chases the militia uphill arrives exhausted and shoots
badly. **The pillar "the ground is the enemy" becomes a stat the player can exploit**, learned
by watching rather than by reading.

---

## 10. Individual implementation order

1. Awareness ladder as a StateTree, with tells. `[medium]`
2. Sight and hearing stimuli feeding Vol III. `[medium]`
3. Aim pipeline with drifting error and belief coupling. `[medium]`
4. Suppression on GAS, with the rate-of-fire read. `[small]`
5. Morale on GAS, bands, cohesion anchors. `[medium]`
6. Broken state and the four outcomes. `[medium]`
7. The five core archetypes, authored. `[small]` but high-value
8. Self-preservation override. `[small]`
9. Surrender, compliance, renege. `[medium]`
10. Mistake budget. `[small]`
11. Fatigue. `[small]`
