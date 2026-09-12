<!--
  ══════════════════════════════════════════════════════════════════════
  PARTISAN  ·  AI design document and roadmap
  A WW2044 setting project · Kaiser Cat Collective / Atelier Vincent De Nil BV
  ──────────────────────────────────────────────────────────────────────
  VERSION : 0.1.0
  BUILD   : 2026-09-12
  STATUS  : INTERNAL. Companion to index.html. Not deployed as a page.

  CHANGELOG
    0.1.0  Initial draft. Thesis, inheritance survey, five-layer
           architecture, belief model, morale model, director spec,
           asymmetric faction brains, validation protocol, phased
           roadmap, risk register, scope reality.
  ══════════════════════════════════════════════════════════════════════
-->

# PARTISAN — AI Design Document and Roadmap

**Companion document to `index.html` v0.2.0.** The site holds the setting. This holds the
machine. Nothing here contradicts the constraint sheet or the four pillars; where it looks
like it does, the constraint sheet wins.

**Engine version note.** Unreal's AI stack moves fast and the specific subsystem names below
reflect the 5.4–5.5 generation. Verify every named plugin against whatever version you
actually pin before you build a schedule on it. The architecture survives a rename; the
schedule does not.

---

## 0. What this document is for

One goal, stated plainly:

> **Build PvE AI for a casual shooter that reads, in the moment and in the retelling
> afterwards, as though the other side was played by people.**

Everything below exists to serve that, and to keep it from becoming a research project that
never ships. There are three audiences for this file. Future-you deciding what to build next.
Anyone you eventually bring in, who needs to understand why a decision was made before they
undo it. And present-you, who should be able to reread §16 when the scope starts breathing.

---

## 1. The thesis

### 1.1 The target everyone aims at and misses

The instinct is that "feels like a real player" means "smarter". It does not. It has never
meant that, in any game that has achieved it.

A perfect-information, optimally-planning enemy is trivially buildable and plays terribly. It
pre-aims every corner, never over-commits, never breaks contact at the wrong moment, and
never does anything you can talk about afterwards. It feels like a turret with legs. Players
describe that AI as "cheap", never as "human".

The historical record is unambiguous on this point. F.E.A.R.'s enemies were not
running deeper tactics than their contemporaries. They were running *announced* tactics.
Halo's Covenant were not out-thinking you; they were reacting visibly, at legible thresholds,
with body language you could read across a room. Alien: Isolation's creature was not
hunting you with a superior algorithm; it was hunting you with a deliberately **worse**
information set than the game itself had.

### 1.2 The five properties that actually read as human

This is the design core of the whole document. Every system in §4–§10 exists to produce one
of these five.

| # | Property | What it means mechanically | Failure mode if absent |
|---|----------|---------------------------|------------------------|
| 1 | **Imperfect belief** | The AI acts on a *model* of where you are, which is wrong in specific, plausible ways. | Omniscience. Feels like cheating even when it isn't. |
| 2 | **Legibility** | You can read intent from posture, movement, position and voice, one beat before it happens. | "It just knew." Players cannot narrate the fight. |
| 3 | **Commitment** | Having decided, it follows through past the point of optimality. It can be baited. | Twitchy re-planning. Reads as a machine re-evaluating. |
| 4 | **Personality variance** | Two riflemen in the same squad behave measurably differently in the same situation. | Uniformity. Clone army. |
| 5 | **Social behaviour** | They talk to each other, coordinate audibly, and react to each other's deaths. | Isolated agents. No sense of a unit. |

**The order matters.** If you build only one, build #1. If you build two, build #1 and #2. A
dumb AI with a believable belief model and clear telegraphs beats a brilliant one without
them, every time, and it is an order of magnitude cheaper.

### 1.3 The test we are actually running

Not a Turing test in the fight. A Turing test in the **retelling**.

> **The after-action test.** A player who has just finished an engagement should be able to
> narrate it as a story with agents in it. "They lost the sergeant and the two on the left
> pulled back to the terrace wall, but the one in the customs house didn't get the word and
> sat there for another minute." If the player can only narrate their own actions, the AI
> has failed regardless of how good the code is.

Second test, cheaper to run, useful weekly:

> **The bark test.** Turn off all AI dialogue. If the AI stops feeling intelligent, the
> intelligence was in the dialogue and the behaviour underneath is thin. If it stays
> intelligent but goes cold, you have real behaviour and need better voice. Both are useful
> diagnoses. You want the second one.

---

## 2. Inheritance — what we take from each landmark, and what we leave

This is the "bringing back the greatest AI in history" section, made specific. A generic
tribute is worthless. Each row is a concrete mechanism, a concrete lift, and a concrete
rejection.

| Source | Year | The actual mechanism | What PARTISAN takes | What PARTISAN leaves |
|---|---|---|---|---|
| **Half-Life** | 1998 | Marine squads using scripted sequences fused with navigation, so flanking read as planned | The idea that hand-authored set-pieces and systemic AI are not enemies | Heavy scripting as the primary source of intelligence |
| **Thief** | 1998 | Graduated, *audible* awareness states | The whole awareness ladder, and the rule that every state change is externally observable | The stealth-game commitment to a single pursuer |
| **Quake III bots** | 1999 | Fuzzy-logic bots with per-bot characteristic files (aim skill, aggression, chat) | Per-agent personality vectors as authored data, not randomisation | Deathmatch goal-seeking; there is no item economy here |
| **Halo: CE** | 2001 | Behaviour DAG with impulses, morale thresholds, unit reaction to leader death | Leader-death cascade, visible fight/flight thresholds, the "illusion of intelligence" doctrine | Alien archetype roster; PARTISAN has one human silhouette |
| **Close Combat / Combat Mission** | 1996– | Morale, suppression and panic as first-class simulated state | The entire morale model. This is the single biggest lift in the document | Operational scale, the wargame UI |
| **Full Spectrum Warrior / Brothers in Arms** | 2004–05 | Find, fix, flank, finish as the player-facing verb set | Suppression as a *mechanic* rather than a damage effect | The command-layer interface |
| **SWAT 4** | 2005 | Compliance, surrender, non-lethal resolution, civilians who are a liability | Surrender and compliance behaviour. Directly serves pillar three | The scoring/penalty framework |
| **F.E.A.R.** | 2005 | GOAP planner plus squad-level coordination behaviours, narrated by barks | Squad-as-planning-unit, and above all the lesson that **the bark is the readable output of the plan** | GOAP itself. StateTree plus a small squad planner covers it at a fraction of the cost |
| **S.T.A.L.K.E.R.** | 2007 | A-Life: agents simulated off-screen, with their own agendas | Island-scale background simulation for the garrison and villages | Full-fidelity offscreen simulation. Ours is coarse and cheap (§4.2) |
| **Killzone 2** | 2009 | HTN planner for squad tactics | Hierarchical task decomposition as a *mental model* for the squad layer | A full HTN implementation |
| **Far Cry 2** | 2008 | Systemic reactions to unscripted events (fire, vehicles, wounds) | AI that reacts to world systems it was not authored against | The buddy-resurrection loop |
| **Left 4 Dead** | 2008 | The AI Director: intensity measurement, deliberate peak/relax pacing | The Director wholesale. This is the spine of "casual" (§8) | Horde composition. PARTISAN's enemies are finite and named |
| **MGS V** | 2015 | Enemy counter-adaptation to repeated player tactics | Adaptation as a *campaign-scale* garrison response, slow and announced | Per-mission adaptation speed, which reads as punishment |
| **Alien: Isolation** | 2014 | Two brains: a Director with perfect knowledge, an Alien with sensory knowledge only | **The two-brain rule (§4.4).** Load-bearing | Behaviour unlocking over a single long session |

**The synthesis.** F.E.A.R. gave legibility. Left 4 Dead gave pacing. Alien gave the
information split. Close Combat gave morale. Nobody has combined all four in a casual PvE
shooter with a scarcity economy. That gap is the design opportunity, and it is a real one.

---

## 3. The setting has already done half the work

The constraint sheet on the site is, read sideways, an AI design document. This is lucky and
should be exploited hard rather than treated as a limitation.

| Constraint (from the site) | What it hands the AI programmer |
|---|---|
| No drones, no thermal, no encrypted mesh | **Information scarcity is canon.** The belief model (§4.3) is not a concession to performance, it is the setting. Nobody will ask why the garrison doesn't just see you. |
| Comms are phones with patchy coverage, VHF off the boats, runners, church bells | **A physical, breakable information network.** Cutting comms is a player verb. A squad that loses contact keeps acting on a stale belief. This is nearly free drama. |
| One coast road, cuttable in four places | **Navigation is a design space, not a solved problem.** Path denial is meaningful. A flank has a cost you can see on the map. |
| No armour, no flat ground | Small agent counts, steep terrain, vertical EQS. Cheap to run, expensive to look at, which is the correct trade for a solo build. |
| Ammunition measured in rounds, not crates | The AI has a **resource state** the player can read: rate of fire is a tell. A garrison low on ammunition fights visibly differently. |
| "Nobody here is a monster" | Surrender, rout, negotiation and compliance are **required systems**, not stretch goals. This is the single most differentiating AI feature in the document. |

**Consequence.** Do not build an AI that wants to kill the player. Build an AI whose agents
want to survive, hold a position, get paid, get home, or get off the island, and for whom
killing the player is instrumental. Pillar three is not flavour text. It is the behaviour
spec.

---

## 4. Architecture

### 4.1 The five layers

Strict one-way flow. Lower layers never query upward. This is the single most important
structural rule in the document, because it is what keeps the thing debuggable by one person.

```
┌──────────────────────────────────────────────────────────────┐
│  L5  DIRECTOR            "The Quartermaster"                 │
│      Omniscient. Never controls an agent directly.           │
│      Shapes pacing, scarcity, reinforcement, weather, events.│
│      Tick: 1–5 s                                             │
├──────────────────────────────────────────────────────────────┤
│  L4  FACTION COMMAND     one per faction, island-wide        │
│      Owns the faction Knowledge Map. Assigns squad missions. │
│      Runs the comms network. Adapts across the campaign.     │
│      Tick: 2–10 s                                            │
├──────────────────────────────────────────────────────────────┤
│  L3  SQUAD               3–8 agents, the tactical unit       │
│      Owns the squad Belief. Picks and owns a squad tactic.   │
│      Allocates roles. Issues the barks. THE INTELLIGENCE     │
│      PLAYERS PERCEIVE LIVES HERE.                            │
│      Tick: 0.25–1 s                                          │
├──────────────────────────────────────────────────────────────┤
│  L2  INDIVIDUAL          one per agent                       │
│      Perception, morale, personality, role execution,        │
│      self-preservation override.                             │
│      Tick: 0.1–0.3 s (LOD-scaled)                            │
├──────────────────────────────────────────────────────────────┤
│  L1  MOTOR               animation, aim, weapon handling     │
│      Where believability is won or lost visually.            │
│      Tick: every frame                                       │
└──────────────────────────────────────────────────────────────┘
```

**Why the squad layer is the important one.** Players do not perceive individuals or
directors. They perceive *units*. Almost every landmark in §2 that players remember as
"smart AI" was doing its clever work at squad level. Budget accordingly: if you have ten
weeks of AI time, six of them belong to L3.

### 4.2 Unreal stack, with rationale

| Concern | Choice | Why, and what you're rejecting |
|---|---|---|
| Individual behaviour | **StateTree** | Cleaner than Behaviour Trees for state-heavy agents (morale, suppression, awareness are all states, not tasks), cheaper to tick, and far easier to read at 2am. Reject BT as the primary structure; keep it for small self-contained sub-behaviours if it helps. |
| Squad coordination | **Custom C++ subsystem**, plain data, no off-the-shelf planner | The squad tactic set is small and authored (§6.2). A full GOAP or HTN implementation is a multi-month detour for behaviour you can write as twelve hand-authored tactics with preconditions. Revisit only if the authored set demonstrably runs out. |
| Spatial reasoning | **EQS**, heavily customised | You will write custom generators (terrace edges, ridge lines, road-cut proximity) and custom tests (exposure-to-sea, uphill-of-target, distance-from-belief-centroid). Off-the-shelf EQS tests will not express the island. |
| Perception | **Custom**, built on AIPerception's stimuli only | Do **not** use the default AIPerception "I can see the pawn → I know where it is" model. It is the exact omniscience failure. Stimuli in, Belief out (§4.3). |
| Background population | **Mass Entity** | Villagers, off-screen garrison patrols, the fishing fleet. Coarse A-Life at low cost. Promote to full actors at range. |
| Abilities/damage/status | **GAS** | Suppression, wounds, panic, morale are all GameplayEffects. Do it once, correctly, early. |
| Interaction points | **Smart Objects** | Firing positions, radio sets, church bells, boat moorings, surrender points. |
| Navigation | Navmesh + **Nav Invokers** + Nav Link Proxies, dynamic Nav Modifiers on the four cut points | World Partition streaming means invoker-based generation. The cut points are modifiers, so cutting the road is a runtime navmesh change with real tactical consequence. |
| Locomotion | **Motion Matching** | Non-negotiable for legibility. Machine-legible tells require human-legible motion. |
| Voice | MetaSounds + a bark arbitration subsystem (§10.2) | The bark system is a first-class feature, not audio polish. |
| Debugging | Visual Logger + Gameplay Debugger + custom category | §13. For a solo developer this is the highest-leverage investment in the document. |
| ML | **Learning Agents: no, with one exception** | Reinforcement learning will not produce shippable tactical AI on a hobby budget, and its output is unauthorable and undebuggable, which is fatal for a legibility-first design. The one legitimate use is offline: train a movement or aim-error policy, bake it to a curve, ship the curve. |

### 4.3 The Knowledge Model — the core system

Build this first. Everything else is downstream.

**Rule: no agent, at any layer, ever reads the player's transform.** Ever. There is a single
chokepoint API and it returns beliefs.

```
FBelief
├── Subject          whose belief this is (agent / squad / faction)
├── TargetID         who it's about
├── LastKnownPos     a position
├── PosUncertainty   metres of radius, grows with age (§4.3.2)
├── Confidence       0..1, decays
├── Velocity         last observed heading, also decays
├── Source           Saw / Heard / Told / Inferred / Guessed
├── Timestamp
└── Corroboration    how many independent sources agree
```

**4.3.1 Propagation.** An agent's belief becomes the squad's belief only through a
*communication event*: a shout (range-limited, blocked by terrain), a radio call (needs a
working radio and coverage), a runner (slow, physical, killable), or a bell (loud, coarse,
faction-wide, low precision). Squad belief becomes faction belief only through the comms
network at L4. **Every link in that chain is physically breakable by the player.** That is the
game.

**4.3.2 Decay.** Uncertainty grows with time and with terrain. A belief in open ground on the
coast road decays slowly; a belief in the terraces or the pine scrub decays fast. Tune the
growth rate per terrain type via a nav modifier tag. This one parameter does more for feel
than any other number in the project.

**4.3.3 Deliberate wrongness.** Where the belief is uncertain, agents commit to a *specific
plausible* guess rather than hedging. A squad that half-knows where you are should search a
wrong ravine confidently, not stand in the middle looking undecided. **Confident error is the
single most human-reading behaviour available.** Hedging is the tell that gives away a machine.

**4.3.4 The honest-cheating clause.** The Director (L5) knows everything. It may *hand* a
belief to a faction when pacing requires it — but it must fabricate a plausible *source* for
it at the same time, and that source must be perceptible to the player. A goatherd who saw
you. A bell that rang. A radio call you could have jammed. Cheating that the player can
retroactively explain is not cheating. Cheating they cannot explain is the thing that
destroys the whole illusion, permanently, in one incident.

### 4.4 The two-brain rule

Lifted directly from Alien: Isolation and worth the whole page it takes to state.

- **The Director brain** has perfect information and no authority over agents.
- **The Agent brains** have authority and only sensory information.
- They communicate in one direction, through the Belief chokepoint, with a fabricated source.

Keep this separation clean and the AI can be simultaneously well-paced and honest. Blur it —
let the Director whisper the player's position straight into an agent's target slot — and you
get an AI that is both unfair and unreadable. There is no middle ground here and no
performance argument for crossing the line.

---

## 5. Individual AI (L2)

### 5.1 Awareness ladder

Six states. Every transition has a mandatory audible and visible tell. No silent state
changes, ever.

| State | Behaviour | Tell |
|---|---|---|
| `Unaware` | Routine, Smart Object idle, conversation | Relaxed posture, ambient chatter |
| `Curious` | Orients, stops task, does not raise weapon | Head turn, a questioning bark, movement stops |
| `Suspicious` | Investigates alone, weapon low-ready | Calls it out, moves deliberately, torch on |
| `Alert` | Weapon up, seeks cover, calls squad | Named callout with a direction |
| `Engaged` | Full squad tactic active | Sustained fire, coordination barks |
| `Broken` | Morale-driven. Rout, freeze, or surrender | Unmistakable: dropped weapon, hands, flight |

Time-to-escalate and time-to-decay are both **personality-modulated** (§5.3). The veteran
sergeant goes Curious→Alert in a beat. The eighteen-year-old conscript sits on Suspicious for
six seconds and then panics past Alert straight to Broken.

### 5.2 Morale and suppression — the Close Combat lift

Two independent floats per agent, both GameplayEffect-driven.

**Suppression** `0..1`. Rises from rounds passing near, explosions, and losing cover. Falls
with time in safety. Effects: accuracy penalty, reluctance to expose, head-down animation
set, and above all *visible rate-of-fire collapse*. Suppression must be legible from thirty
metres away without a UI element.

**Morale** `0..1`. Slower. Inputs:

| Input | Effect |
|---|---|
| Nearby friendly killed | −, scaled by proximity and by whether it was seen |
| **Squad leader killed** | −− and a cohesion penalty until someone assumes command |
| Sustained suppression | − |
| Wounded | −− |
| Ammunition low | − |
| Isolated (no squad contact) | − per second |
| Comms lost with L4 | − |
| Winning: enemy killed, ground taken | + |
| Reinforcement arrives | ++ |
| Leader present and unbroken | + per second |

Below a personality-set threshold, the agent enters `Broken` and rolls on a weighted table:
**fall back to the nearest cohesion anchor / go to ground and stop fighting / rout / surrender**.
Weights shift by faction (§7) and by whether a surrender is even accepted here.

**Why this is the highest-value system in the document.** It produces emergent narrative for
free. It makes the player's actions matter beyond the damage numbers. It is the mechanical
expression of pillar three. And it is the thing almost no modern shooter does, so it is
differentiating in a way that "better pathfinding" never will be.

### 5.3 Personality vectors — the Quake III lift

Authored, not random. A small set of hand-written archetype assets, each an instance of the
same struct, each visibly different in play.

```
FCombatantProfile
├── Aggression            0..1   push vs hold
├── Caution               0..1   exposure tolerance
├── Discipline            0..1   adherence to the squad tactic when scared
├── MoraleFloor           0..1   where Broken begins
├── ReactionTime          ms     mean, with per-instance jitter
├── AimSkill              0..1   feeds the error model (§5.4)
├── Curiosity             0..1   investigation willingness
├── Loyalty               0..1   likelihood of covering a wounded friend
├── Chattiness            0..1   bark frequency
└── VoiceBank             id
```

Archetypes to author first, each in a single pass so they read as a set:

*The Sergeant* (high discipline, high morale floor, the cohesion anchor — killing him is the
tactical objective). *The Conscript* (low everything, panics, the one you feel bad about).
*The Old Soldier* (low aggression, very high caution and aim skill, does not waste rounds).
*The Zealot* (high aggression, no caution, will charge — the source of most player deaths and
most player stories). *The Shepherd* (GREF: unmatched local knowledge, poor discipline,
appears where he should not be able to).

**Squad composition is a design lever.** A squad's feel comes more from its profile mix than
from its size. Author squads as compositions, not counts.

### 5.4 The aim and mistake model

Do not roll for hit. Model the weapon pointing somewhere wrong, then let the bullet be honest.

```
AimError = BaseError(profile.AimSkill)
         × Suppression multiplier
         × Movement multiplier (self and target)
         × Range curve (per weapon class)
         × Belief uncertainty factor      ← the important one
         × Fatigue / wound multiplier
```

Belief uncertainty feeding aim error is what makes concealment work without a visibility
hack. An agent shooting at a *guess* misses in a way that looks like a person shooting at a
guess: rounds land near, in a plausible cluster, and the player can read from the impacts
that they have not been precisely located. That single coupling does more for "this feels
like a person" than any behaviour tree.

**The mistake budget.** Each agent carries a small, explicit allowance of authored errors per
engagement: reload at the wrong moment, over-push, mis-call a direction by one landmark,
break cover early, fire at a shadow. Spend them under a Director hint at pacing lows. Mistakes
must be *plausible* and *readable*, never arbitrary. A player who catches an enemy in a bad
reload feels clever. A player who watches an enemy walk into a wall feels cheated. The
distance between the two is entirely in the authoring.

### 5.5 Self-preservation override

One hard rule that sits above the squad layer: an agent about to die pointlessly may break
formation without permission. Universal, not personality-gated. It is the strongest single
signal that there is a person in there rather than a unit token, and it costs almost nothing
to implement.

---

## 6. Squad AI (L3) — where the perceived intelligence lives

### 6.1 The squad object

Owns: the merged squad Belief, the current tactic, role assignments, the cohesion anchor
(usually the leader), a shared ammunition pool, and the bark budget. Ticks at 0.25–1s.
Persists across agent deaths, with succession.

### 6.2 The authored tactic set

Twelve to eighteen tactics, each with preconditions, role slots, an abort condition, a
signature bark set, and an authored *shape* on the ground. This is a content problem, not an
algorithm problem, and treating it as such is what keeps it shippable.

| Tactic | Precondition | Shape |
|---|---|---|
| `Fix and Flank` | ≥4 effective, flank route exists in EQS, belief confidence > 0.6 | Base of fire holds, element moves wide, timed |
| `Bound Forward` | Advantage, low suppression | Alternating pairs, one moves one shoots |
| `Bound Back` | Casualties taken or morale dropping | Same, reversed, toward a cohesion anchor |
| `Suppress and Wait` | Low ammunition or no flank route | Pin, call for help, do not commit |
| `Search Pattern` | Confidence < 0.4 | Sweep the belief radius, confidently wrong (§4.3.3) |
| `Hold Cut Point` | Road tactic | Static, mutually supporting, uphill |
| `Rush` | Zealot leader, close range, morale high | Reckless, fast, memorable |
| `Withdraw to Anchor` | Leader dead or morale collapsing | Cohesion-seeking, disordered |
| `Surrender` | Isolated, no ammunition, morale floor, offer available | Weapons down, hands, the hard one |
| `Ambush` | GREF only, terrain knowledge, player predicted on road | Prepared, patient, above the road |
| `Fade` | GREF only, outmatched | Break contact uphill, do not trade |
| `Cordon` | BLUFOR only, numbers advantage | Slow, methodical, encircling |

**Selection is scored, not sequential.** Score every tactic each squad tick against
preconditions, personality mix, morale, ammunition and terrain; pick the best; **then hold it
for a minimum commit time.** The minimum commit is what produces property #3. Without it the
squad flickers between good decisions and reads as a computer. With it, the squad can be
baited, which is the thing players describe as outsmarting someone.

### 6.3 Role allocation

Within a tactic, assign: `BaseOfFire`, `FlankElement`, `Security`, `Casualty`, `Leader`.
Allocation respects personality (do not send the Old Soldier on the wide flank; do not put
the Conscript on rear security alone) and respects wounds. Roles are re-allocated only on
death, wounding, or tactic change.

### 6.4 Cohesion

A squad has a cohesion value that falls with distance from the anchor, with leader loss, and
with communication failure. Low cohesion degrades tactic execution *visibly*: timing slips,
the flank goes early, someone doesn't get the word to fall back. Do not model this as a
penalty float that silently worsens accuracy. Model it as *bad execution of a good plan*,
which is exactly what a real unit under stress looks like and exactly what a player can read.

---

## 7. Three asymmetric faction brains

The site's three-faction structure is an AI gift. Build three genuinely different brains.
If a player cannot tell which faction they are fighting from behaviour alone, with the art
stripped out, this section has failed.

### 7.1 REDFOR — the garrison

**Doctrine:** hold the harbour, the customs house and the road. Do not pursue uphill.

- Highest **discipline**, lowest **morale**. Trained, drilled, and abandoned.
- Excellent on the road and in the town, poor above the treeline. Encode this literally as a
  navigation cost multiplier off the road network, not as a scripted boundary.
- The only faction with **artillery**: an indirect-fire asset that fires on *stale beliefs*,
  which is both historically right and a superb readable mechanic.
- Comms: a fixed radio network with physical nodes the player can cut. Cut nodes and the
  garrison's faction-level Knowledge Map goes stale in a way the player can observe.
- **Morale is the win condition.** The campaign objective is not to kill the garrison, it is
  to break it. Every system above should be readable as pressure on that one number.
- **Campaign adaptation** (MGS V, slowed down): repeated night attacks → more flares and
  standing patrols. Repeated ambushes at one cut point → that point gets fortified and the
  other three thinned. Announce every adaptation in the world, visibly, before the player
  meets it. Adaptation the player can see coming is a compliment. Adaptation they discover by
  dying is a punishment.

### 7.2 GREF — the militia (player's side)

The hardest AI in the project, because allied AI is judged far more harshly than enemy AI.

- Highest **local knowledge**: ambush positions, goat tracks, and nav links no other faction
  can use.
- Lowest **discipline**: they will break a tactic to save a neighbour. Model **Loyalty** as an
  override on tactic adherence. This is a feature and should be tuned to be charming rather
  than infuriating.
- **Scarcity is the central mechanic.** Squad ammunition is a pooled resource. Squadmates
  ration. They tell you when they are low. They pick up garrison weapons and switch, visibly,
  mid-fight.
- **Squadmate rules** (see §9): never block a doorway, never steal the player's kill at the
  climax, never die silently, never require micromanagement, always be diegetically locatable
  by voice.

### 7.3 BLUFOR — the relief force

The clever one, and the one that carries the fourth pillar.

- **Best tactics, worst knowledge.** Highest discipline, best equipment, real combined arms —
  and a belief model that decays fastest of the three off the road, because they have never
  seen this island. Mechanically inverted from GREF. The player should *feel* the difference
  in one engagement.
- Naval gunfire as a Director-mediated asset: enormous, slow, and reliant on a spotter the
  player can remove.
- **Restraint behaviour.** Their rules of engagement are different. They will call for
  surrender before firing. They will hesitate against a target they cannot identify. In the
  second act, when the player may be on the wrong end of them, this hesitation is the entire
  emotional payload of pillar four, expressed as AI behaviour rather than as a cutscene.

---

## 8. The Director (L5) — "The Quartermaster"

The Left 4 Dead lift, adapted for scarcity rather than horde.

### 8.1 What it measures

An **intensity** value per player and for the squad, accumulating from damage taken, near
misses, suppression, proximity of threats, loss of squadmates, ammunition state, and time
under fire. Decays in safety.

### 8.2 What it controls

Never an agent's actions. Only:

| Lever | Use |
|---|---|
| Reinforcement timing and route | The primary pacing tool |
| Patrol density and routing | Background pressure |
| **Belief hints with fabricated sources** | §4.3.4. Use sparingly and always with a visible cause |
| **Scarcity placement** | Ammunition, medical supplies, a working boat. The PARTISAN-specific lever |
| Weather, time of day, sea state | Slow, atmospheric, powerful |
| Unscripted events | A goatherd, a bell, a broken-down truck, a wounded man calling out |
| Mistake-budget release | Permission for enemies to err at intensity lows |

### 8.3 The curve

Build-up → peak → **relax** → rebuild. The relax phase is not empty time; it is when the AI
talks to itself, when the player hears the garrison calling for a relief that is not coming,
when a wounded man is dragged off. Ambient AI behaviour during the lull is what makes the
enemy feel like a population rather than a spawn table, and it costs almost nothing because
nothing is shooting.

### 8.4 What "casual" actually requires

The brief says casual PvE. That is a constraint with teeth, and it mostly constrains the
Director:

1. **Never punish exploration.** Wandering off should find content, not a squad wipe.
2. **Legibility over depth, always.** A player who does not understand why they died has had
   a bad time no matter how sophisticated the reason was.
3. **Graceful failure.** Losing a fight should cost ground, ammunition, or a squadmate's
   health, not ten minutes of replay.
4. **Comeback mechanics.** The Director tops up scarcity after a loss. Silently.
5. **No stealth tax.** Being spotted must open a different fight, not a failure state.
6. **Difficulty should move the belief model, not the health bars.** Easier = beliefs decay
   faster, uncertainty grows quicker, reaction times lengthen, mistake budgets widen. Harder =
   the reverse. **Never** scale enemy health or damage. Bullet-sponge difficulty destroys
   property #1 and is the fastest way to make good AI feel fake.

---

## 9. Squadmate AI — the hardest problem in the document

Allied AI carries three times the scrutiny of enemy AI and none of the excuses. Budget for it
separately and do not fold it into the enemy work.

**The non-negotiables:**

- **Never physically block the player.** Push-through capsules or soft avoidance. No
  exceptions. This one bug erases everything else.
- **Never be silently absent.** If a squadmate is somewhere, they are audible from there.
- **Never require an order to be useful.** Command is optional. A mute player should still
  have a competent squad.
- **Never take the player's moment.** At an engagement climax the squadmate suppresses rather
  than kills. This is explicit, deliberate, and the right kind of dishonest.
- **Always fail loudly.** Wounded squadmates call out. Stuck squadmates say so. An AI that
  announces its own failure is forgiven; one that fails silently is not.
- **Model the relationship.** Given the setting, squadmates should have names, a village, and
  an opinion about the annexation. Their L2 personality profile should be *readable as
  character*, so that in act two, when the political turn lands, their reactions are already
  established behaviour rather than a script.

---

## 10. Legibility systems

### 10.1 The telegraph rule

**Every AI decision that affects the player must be observable one beat before its effect.**
Before a flank: a movement bark and a visible break from cover. Before a grenade: a call and
a windup. Before a rush: a shout and a posture change. Before a rout: a morale tell.

A player's sense of enemy intelligence is almost entirely built from successfully predicting
enemy behaviour. Counter-intuitively, **the more predictable the AI is in the short term, the
smarter it feels**, provided the prediction is hard-won and the decisions are good.

### 10.2 Barks as the readable output of the plan

The F.E.A.R. lesson, stated as a rule: **the bark is not commentary on the tactic, it is the
tactic's user interface.**

Requirements:
- Generated by the squad layer at tactic selection and role assignment, not by individuals at
  random intervals.
- **Directional and specific.** "Above the wall, two of them" beats "contact". Specificity is
  what makes the AI sound like it knows something.
- **Reflect belief, including when belief is wrong.** An enemy confidently calling out a
  position you left thirty seconds ago is the single best moment the whole system can produce.
- Arbitrated: one speaker per squad at a time, priority-queued, with a per-squad budget.
  Overlapping barks read as chaos, not competence.
- In-language, subtitled. Greek and Turkish. The language barrier is a legibility asset:
  tone, direction and urgency carry even when words do not, and it is a strong argument for
  investing in *delivery* over vocabulary size.

### 10.3 Motion

Motion Matching with distinct per-profile locomotion sets. Panicked movement should look
panicked. The Old Soldier moves differently from the Conscript before either of them says a
word. This is expensive in animation authoring and it is where a large share of the
"award-winning" perception actually lives. Budget it as an AI cost, not an animation cost,
because it is one.

---

## 11. Validation — how you know it worked

### 11.1 Instrumented metrics

| Metric | Target | What it catches |
|---|---|---|
| Belief error at time of fire | **> 0** always, median 3–8 m | Omniscience leaks |
| % engagements with a tactic change | 30–60% | Rigidity or flicker |
| % enemies who break rather than die | **> 25%** | Pillar three is real or it isn't |
| Bark coverage of tactic changes | **100%** | Silent decisions |
| Median tactic hold duration | ≥ 8 s | Commitment (property #3) |
| Player deaths with no preceding telegraph | **0** | The unforgivable one |
| Squadmate blocking incidents | **0** | §9 |
| Behaviour variance between same-tactic runs | measurably > 0 | Determinism |

### 11.2 Playtest protocol

Three questions after every session, always the same three:

1. *Tell me what happened in that fight.* (The after-action test, §1.3. Listen for whether
   they narrate agents.)
2. *When were you surprised, and was it fair?*
3. *Did anything feel like it cheated?* (Then check the log. Usually it did not cheat, and
   the real bug is a missing telegraph.)

### 11.3 The AI-vs-AI harness

Build early, keep forever. REDFOR squad versus GREF squad, no player, running headless on a
loop. It surfaces navigation failures, tactic deadlocks and morale runaway far faster than
playtesting, it runs while you sleep, and for a solo developer it is worth several extra pairs
of hands.

---

## 12. Tooling

Non-negotiable, built in phase 0, because a solo developer's velocity on an AI project is
almost entirely a function of debug visibility:

- **Belief visualiser.** Draw every agent's belief as a sphere sized by uncertainty, coloured
  by source, in the world, live. If you build one tool, build this one.
- **Squad overlay.** Current tactic, role assignments, cohesion, ammunition pool, hold timer.
- **Morale/suppression bars** in debug draw.
- **Director HUD.** Intensity curve, current phase, last five decisions with reasons.
- **Visual Logger categories** for every belief update and tactic change, so any "that felt
  like it cheated" report can be answered from a recording.
- **Bark log** with speaker, tactic, and the belief that generated it.

---

## 13. Roadmap

Phases, not dates. Each has a hard exit criterion; nothing proceeds until it is met. Estimates
are in **solo-months at hobby pace**, assuming evenings and weekends around FMP, and they
assume UE5 familiarity. If you are learning the engine at the same time, multiply by two and a
half.

---

### Phase 0 — The Room *(1–2 months)*

One room, or rather one terrace and one stretch of road. Grey box. Three agents. No art.

- Belief struct and the chokepoint API. **No code anywhere may read a player transform.**
- Belief visualiser.
- Awareness ladder with placeholder tells.
- One tactic: `Suppress and Wait`.
- Visual Logger integration.

**Exit:** you can stand behind a terrace wall and watch three agents shoot confidently at
where they think you are, and be wrong, and you can see exactly why on screen.

**This phase is the whole project in miniature. If it is not fun to watch, stop and fix it
here.** Everything downstream multiplies this.

---

### Phase 1 — The Squad *(2–3 months)*

- Squad object, merged belief, comms events (shout / radio / runner / bell).
- Six core tactics with scored selection and minimum commit time.
- Role allocation.
- Bark system and arbitration, placeholder voice, real specificity.
- EQS custom generators for terraced and ridge terrain.

**Exit:** the after-action test passes with a developer. You can narrate a fight as a story.

---

### Phase 2 — The Person *(1–2 months)*

- Morale and suppression on GAS.
- The five personality archetypes.
- Aim error model with belief coupling.
- Broken state: rout, freeze, surrender.
- Mistake budget.

**Exit:** an enemy surrenders, and you feel something about it. Pillar three is now a system
rather than a sentence.

---

### Phase 3 — The Director *(1–2 months)*

- Intensity measurement and the curve.
- Reinforcement, scarcity placement, belief hints with fabricated sources.
- Ambient lull behaviour.
- The difficulty model, expressed as belief parameters only.

**Exit:** a twenty-minute unscripted session has a shape, and a fresh player can describe its
peaks without prompting.

---

### Phase 4 — The Three Brains *(2–3 months)*

- Faction command layer, per-faction Knowledge Maps, breakable comms topology.
- REDFOR doctrine, road-bias navigation, artillery on stale beliefs, campaign adaptation.
- GREF local-knowledge nav links, loyalty override, pooled ammunition.
- BLUFOR cordon tactics, restraint behaviour, naval gunfire.

**Exit:** a blind test where a player identifies the faction from behaviour alone, art
stripped, better than chance.

---

### Phase 5 — The Squad Beside You *(2–3 months)*

Squadmate AI against the §9 non-negotiables. Named characters. Optional command layer.

**Exit:** zero blocking incidents in a full session, and a playtester refers to a squadmate by
name without being prompted.

---

### Phase 6 — The Island *(2–4 months)*

- Mass Entity background population: villages, offscreen patrols, the fishing fleet.
- The four cut points as runtime navmesh modifiers with real consequence.
- Nav Invokers under World Partition.
- Sea and boat AI.

**Exit:** the island feels inhabited when nothing is shooting.

---

### Phase 7 — The Turn *(2–3 months)*

The second act. BLUFOR arrives. Former allies become an ambiguous presence. Restraint
behaviour carries the emotional load. Morale systems now run on the *player's own side*.

**Exit:** pillar four lands, and it lands through behaviour rather than cutscene.

---

### Phase 8 — Legibility polish *(ongoing, never finished)*

Motion Matching sets per profile. Real voice, in-language. Telegraph audit: every death
reviewed against the "was there a tell" metric. Bark specificity pass.

---

**Total, honestly: 13–22 solo-months of focused work, before any content, art, level design,
weapons, UI, or audio outside the bark system.** That is not a discouraging number, it is a
planning number, and it is what makes §16 worth reading.

---

## 14. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Belief system leaks and an agent reads the player transform somewhere | **Fatal** | Single chokepoint, enforced in code review; an automated test that fails the build on direct access |
| Squad tactics flicker | High | Minimum commit time, tuned early, never removed as an "optimisation" |
| Barks become noise | High | Arbitration and per-squad budget from day one, not retrofitted |
| Squadmates block doorways | High | Push-through capsules in phase 5, tested every session |
| Morale runaway: whole garrison routs at once | Medium | Cohesion anchors, per-squad thresholds, hysteresis on the Broken transition |
| Performance: too many full-fidelity agents | Medium | LOD the tick rates hard; Mass for anything the player cannot see clearly |
| Adaptation reads as punishment | Medium | Slow it down; always telegraph in-world before the player meets it |
| ML detour eats a year | Medium | §4.2 policy. Offline only, baked to curves, or not at all |
| Scope: the AI is great and the game does not exist | **High** | §16 |

---

## 15. Open questions

Listed here so they stop being re-litigated, in the style of the parent document.

1. **Does PARTISAN ship as a game at all?** The parent document lists "any decision about what
   form PARTISAN actually ships in" as not started. This whole file is downstream of that
   decision and does not settle it.
2. **First-person or third?** Third person serves legibility, because you can see your own
   squadmates' body language. First person serves the scarcity and fear. This affects §10.3
   heavily and should be decided before any animation budget is spent.
3. **Single continuous island or discrete missions?** The Director works in both; §6 and the
   campaign adaptation model in §7.1 are far stronger in the continuous version.
4. **Does the player command the militia or serve in it?** Changes §9 fundamentally.
5. **Permadeath for named squadmates?** Pillar four says yes. Casual says no. Unresolved, and
   genuinely hard.
6. **How much of the second act is playable versus narrated?** Phase 7 is the most expensive
   and least certain phase in the roadmap.

---

## 16. Scope reality

This section exists because a design document that only describes the ambition is not
actually useful, and because you will reread this file in a year.

**What is real here:** the design thesis in §1 is correct and well-supported by the historical
record. The architecture in §4 is sound and buildable. The belief model plus morale plus
legibility combination genuinely is a gap in the market, and the PARTISAN setting suits it
better than almost any other premise you could pick, because the constraint sheet makes
information scarcity *canon* rather than a concession. The production note on the site —
that 2012 irregular warfare is cheap to reference — holds for AI too.

**What is not:** "award-winning and genre-defining" is an outcome, not a specification.
F.E.A.R. had a team. Left 4 Dead had Valve. Alien: Isolation had roughly a hundred people and
several years. None of that means a solo developer cannot build something genuinely
remarkable, but it does mean the honest version of this project is **a vertical slice that
demonstrates the thesis**, not a full game — and that Phase 0 alone, done properly, would
already be a more interesting artefact than most shipped shooters' AI.

**The recommendation.** Treat phases 0–2 as the project. One terrace, one road, one squad,
three or four minutes of play. Belief, morale, barks, surrender. If that slice makes people
say "the AI in this is doing something I haven't seen", you have proved the thesis, you have
something genuinely showable, and you have earned the right to decide whether phases 3–8 are
worth eighteen months of evenings. If it does not, you have spent three to six months and
learned the most valuable thing in the document.

And there is a second, cheaper win sitting in here. **This file is content.** The KCC side is
explicitly portfolio and content value rather than revenue, and a rigorous, well-argued AI
design document that traces a line from Halo's morale thresholds through F.E.A.R.'s barks to
a specific unbuilt game is publishable material in its own right — as a devlog series, as a
video essay on the Kaiser Cat Cinema channel, or as the thing that makes PARTISAN's site
worth showing to someone. That return does not require a single line of C++.

---

## Appendix A — Bark taxonomy

Minimum viable set. Every line specific, directional, and generated by the squad layer.

| Category | Trigger | Must contain |
|---|---|---|
| Contact | Belief created | Direction and a landmark |
| Update | Belief revised | New direction, and doubt if confidence is low |
| Stale | Belief aged past threshold | Uncertainty, explicitly. "He was on the wall a minute ago" |
| Tactic call | Tactic selected | The intent, plainly stated |
| Role call | Role assigned | A name and a task |
| Suppression | Under fire | Pinned, and asking for help |
| Ammunition | Below threshold | The number, if low enough to matter |
| Casualty | Friendly down | The name |
| Leader down | Anchor lost | Confusion, then succession |
| Morale | Approaching floor | Fear, escalating |
| Surrender | Broken + offer | Unambiguous, in both languages |
| Lull | Intensity low | Character. This is where the setting lives |

## Appendix B — Reading list

Primary sources worth the time, in rough order of value to this project:

- Jeff Orkin, *Three States and a Plan: The AI of F.E.A.R.* — read for the barks, not the GOAP
- Michael Booth, *The AI Systems of Left 4 Dead* — the Director, in full
- Chris Butcher, *The Illusion of Intelligence* (Halo) — the foundational argument of §1
- Tommy Thompson's analyses of Alien: Isolation — the two-brain split
- Guerrilla's Killzone 2 HTN write-ups — hierarchical decomposition as a mental model
- Jan Paul van Waveren, *The Quake III Arena Bot* — personality vectors as authored data
- *Game AI Pro* series — for the EQS, navigation and squad-coordination chapters specifically
- Unreal's own StateTree, Mass Entity and Smart Object documentation, against your pinned
  engine version

---

*PARTISAN · AI design document v0.1.0 · internal · © 2026 Kaiser Cat Collective / Atelier Vincent De Nil BV*
