# Volume IX — Unreal Engine Implementation

**The engine chapter.** Subsystem-by-subsystem: what it does, what it is actually good for,
where it will hurt you, and the verdict for PARTISAN. Everything else in this compendium is
engine-agnostic design. This volume is where it meets the metal, and it is therefore the
volume that rots fastest. Date-stamp any decision you take from it.

---

## 1. The engine-generation problem — read before anything else

Verified 12 September 2026.

| Fact | Date | Consequence |
|---|---|---|
| **UE 5.8 released** | 17–23 June 2026 | Current stable |
| **5.8 is the last planned major UE5 release** | announced State of Unreal, 17 June 2026 | No further 5.x feature releases; bug fixes and regressions only |
| **UE6 announced** | 24 May 2026, detailed 17 June 2026 | Unifies UE5 + UEFN |
| **UE6 Early Access target** | end of 2027 | Mid-roadmap for this project |
| **UE6 direction** | — | Verse becomes the core gameplay programming model; Scene Graph introduced; **Blueprints and Actors begin a sunset**, retained in early UE6 versions |

### 1.1 What this means, stated as decisions

> **Decision IX-1. Pin UE 5.8 for the entire build. `ADOPT`**
>
> **Why.** For the first time in the engine's history, a UE5 developer gets a genuinely
> frozen target. There is no 5.9 to chase, no feature to wait for, no upgrade tax. For a
> solo developer on a multi-year hobby schedule this is worth more than any single feature
> in 5.8. The historical failure mode — spending a fortnight a year upgrading and fixing
> what the upgrade broke — is now optional rather than forced.
>
> Do not take UE6 Early Access mid-project. An Early Access engine plus a solo developer plus
> a stateful AI codebase is three sources of instability stacked on each other.

> **Decision IX-2. All AI logic in C++. Blueprints for content wiring only. `ADOPT`**
>
> **Why.** Three independent reasons, any one of which would be sufficient.
> **Correctness:** the belief model, morale accumulators and tactic scorer are stateful,
> tick-ordered and numerically sensitive. These are exactly the systems where Blueprint's
> execution model makes bugs hard to see. **Performance:** per-agent per-tick work in
> Blueprint is 10–50× the cost of the same work in C++, and AI is the tick-heaviest system
> in the game. **Migration:** Blueprints are on an announced sunset track. A 20,000-node
> Blueprint AI is a liability in 2028; 20,000 lines of C++ is a port.
>
> Blueprint remains correct for: designer-facing data assets, animation blueprint state
> wiring, UI, and one-off level scripting.

> **Decision IX-3. Isolate the engine-coupled 20% from the engine-agnostic 80%. `ADOPT` — the most important structural decision in this volume**
>
> **Why.** Sort every AI system into two buckets.
>
> **Engine-agnostic (portable, testable headless, survives UE6 or an engine change):**
> belief store and decay, morale and suppression maths, personality profiles, tactic scoring
> and selection, role allocation, squad cohesion, the director's intensity model, the
> adaptation ledger, the bark arbitration queue, all tuning data.
>
> **Engine-coupled (rewrite on any port):** perception stimulus gathering, navigation queries,
> EQS, animation and motion matching, audio playback, physics, rendering, Mass integration.
>
> Write the first bucket as plain C++ structs and free functions over a narrow interface. No
> `UObject` inheritance, no `FindPathToLocation`, no `GetWorld()`. Feed it through an
> `IPartisanWorldQuery` interface with perhaps fifteen methods, which the engine layer
> implements and the test harness stubs.
>
> **The payoff is immediate, not deferred.** This is what makes the headless AI-vs-AI harness
> (Vol XII §4) possible, which is what lets you run ten thousand engagements overnight on a
> laptop, which is the single largest velocity multiplier available to a solo developer. The
> UE6 portability is a free side-effect of doing the thing you should do anyway.

```
┌─────────────────────────────────────────────────────────────┐
│  PartisanAI  (static library, no Unreal dependency)         │
│  ─────────────────────────────────────────────────────────  │
│  FBeliefStore    FMoraleModel    FTacticScorer               │
│  FSquadState     FDirectorModel  FBarkQueue                  │
│  FCombatantProfile               FAdaptationLedger           │
│                         ▲                                    │
│                         │  IPartisanWorldQuery               │
└─────────────────────────┼───────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
┌───────▼────────────────┐      ┌────────────▼──────────────┐
│  UE 5.8 implementation │      │  Headless test harness    │
│  Perception, nav, EQS, │      │  Grid world, no rendering │
│  anim, audio, Mass     │      │  10k engagements/night    │
└────────────────────────┘      └───────────────────────────┘
```

Fifteen methods is roughly the right size for the interface. A sketch:

```cpp
class IPartisanWorldQuery
{
public:
    virtual ~IPartisanWorldQuery() = default;

    // Spatial
    virtual bool  HasLineOfSight(FVec3 From, FVec3 To) const = 0;
    virtual float PathCost(FVec3 From, FVec3 To, EAgentClass Class) const = 0;
    virtual bool  IsReachable(FVec3 From, FVec3 To, EAgentClass Class) const = 0;
    virtual float TerrainConcealment(FVec3 At) const = 0;   // feeds belief decay
    virtual float TerrainSlope(FVec3 At) const = 0;
    virtual bool  IsOnRoadNetwork(FVec3 At) const = 0;

    // Cover and positions
    virtual int32 QueryPositions(const FPositionQuery& Q,
                                 TArray<FScoredPoint>& Out) const = 0;

    // Perception inputs (pushed, not pulled)
    virtual void  DrainStimuli(TArray<FStimulus>& Out) = 0;

    // Comms topology
    virtual bool  HasRadioCoverage(FVec3 At, EFaction F) const = 0;
    virtual float SoundAttenuation(FVec3 From, FVec3 To) const = 0;

    // Time and randomness (deterministic in harness)
    virtual double Now() const = 0;
    virtual float  Rand01() = 0;

    // Output
    virtual void  IssueOrder(FAgentId Agent, const FOrder& Order) = 0;
    virtual void  SpeakBark(FAgentId Agent, FBarkId Bark, const FBarkArgs& Args) = 0;
    virtual void  Log(const FAILogEvent& Event) = 0;
};
```

Everything in Volumes III–VIII is implementable against that interface alone. That is the
test of whether the separation is real.

---

## 2. Decision-making structures in UE5

### 2.1 Behaviour Trees — `ADAPT`, secondary role only

Unreal's BT is a mature, well-documented, event-driven implementation. It is not a textbook BT:
it uses a conditional-abort model via decorators rather than re-evaluating the whole tree, which
is both its performance win and its main source of confusion.

**Where it is genuinely good:** short, task-shaped, sequential behaviours. "Move to the smart
object, play the montage, wait, return." Sub-behaviours with a clear beginning and end.

**Where it hurts for PARTISAN:** our agents are *state*-dominated, not task-dominated. Morale,
suppression, awareness level, ammunition state and injury are all persistent states that
modulate everything. Expressing "suppressed and low on ammunition and the leader is dead"
in a BT means a thicket of decorators and blackboard keys, and the abort semantics get
genuinely hard to reason about. This is a well-known pain point and not a skill issue.

**Verdict:** keep BTs for self-contained sub-behaviours invoked by the state layer. Do not
make the BT the top-level structure.

### 2.2 StateTree — `ADOPT`, primary individual structure

StateTree is Epic's hybrid of a hierarchical state machine and a behaviour tree: states with
enter/exit conditions and transitions, tasks that run inside states, and selection that can be
evaluated in a BT-like way. It was built alongside Mass and is designed to be cheap to tick at
scale.

**Why it fits PARTISAN.** The awareness ladder (Vol IV §2) *is* a state machine. Morale states
*are* states. The mapping is direct rather than translated. StateTree also has significantly
better data-oriented characteristics than BT, and integrates with Mass if you later promote or
demote agents between fidelity levels (§6).

**What to watch:**
- Tooling is younger than BT's. Debug visualisation is good but less battle-tested; expect to
  write your own Gameplay Debugger category regardless (Vol XII).
- The schema/parameter binding system is powerful and initially opaque. Budget a week of
  learning before you trust a schedule built on it.
- Keep StateTree assets *small*. The failure mode is the 200-state god-tree, which is as
  unreadable as the 500-node BT it replaced. One tree per agent role, composed.

**Recommended structure:**

```
AgentStateTree (root)
├── Unaware        → idle / SmartObject / patrol subtree
├── Curious        → orient, short investigate
├── Suspicious     → solo investigate toward belief centroid
├── Alert          → take cover, report, await squad tactic
├── Engaged        → EXECUTE_ROLE (role comes from squad layer)
│   ├── BaseOfFire
│   ├── FlankElement
│   ├── Security
│   └── Casualty
└── Broken         → rout / freeze / surrender  (highest priority, global transition)
```

`Broken` as a globally-reachable high-priority state is the structural expression of the
self-preservation override in Vol IV §7. Get that transition right and half the emergent
drama comes free.

### 2.3 Utility / scoring — `ADOPT` for the squad layer

Unreal ships no first-class utility AI system. That is fine; utility scoring is forty lines of
code. The squad tactic scorer (Vol V §4) is a weighted-sum utility selector with a minimum
commit time, written as plain C++ in the engine-agnostic library.

Resist the temptation to reach for a full Infinite Axis Utility System implementation. The
tactic set is ~15 items with ~8 considerations each. A hand-written scorer with named,
inspectable terms will be more debuggable than a generic framework, and debuggability is the
binding constraint for one person.

### 2.4 GOAP / HTN / planners — `REJECT`, with the reason recorded

Both are covered in Vol II. Recording the rejection here so it is not re-proposed:

**Why not GOAP.** GOAP's value is emergent action sequencing from a large action pool under
varying world states. PARTISAN's tactics are authored, few, and shape-specific — a flank
around a terrace has a *designed* geometry that a planner will not discover and would ruin if
it did. GOAP would cost two months and produce behaviour indistinguishable from fifteen
authored tactics, while being far harder to debug at 2am. F.E.A.R.'s achievement was the bark
layer, not the planner; we can take the achievement without the planner.

**Why not HTN.** Same logic, plus: HTN's hierarchical decomposition is genuinely useful as a
*mental model* for structuring the tactic library, and we take that for free. The
implementation buys the ability to compose novel plans, which we do not want, because
composed plans are not legible and legibility is Axiom 1.

**Reconsider only if:** playtesting shows the authored tactic set demonstrably exhausted —
players predicting every engagement by the third hour and the fix is not more tactics but
more combination. That is a real signal. It has not occurred yet and probably will not at this
scope.

### 2.5 Learning Agents / reinforcement learning — `DEFER`, one narrow exception

Unreal's Learning Agents plugin is real and usable. It is also the wrong tool for tactical AI
here, for reasons that are design reasons rather than technical ones:

1. **Unauthorable.** You cannot ask a trained policy to be *more legible*, or to make a
   specific plausible mistake. Every property in the thesis is an authoring requirement.
2. **Undebuggable.** "Why did it do that" has no answer. For a solo developer that is fatal.
3. **Optimises the wrong objective.** RL converges on winning. We want behaviour that is
   satisfying to fight, which is nearly the opposite objective and cannot be specified as a
   reward without essentially hand-authoring the behaviour anyway.

**The one legitimate use:** offline, to *generate a curve you then bake and ship*. Example:
train a movement policy on the terraced terrain to learn realistic uphill/downhill speed and
route preference, sample it into a cost table, ship the table, delete the model. You get the
data benefit with none of the runtime unpredictability. `[research]` — do not schedule it.

---

## 3. Perception

### 3.1 Do not use AIPerception as designed

`UAIPerceptionComponent` with `UAISense_Sight` gives you, out of the box, exactly the thing
this compendium exists to prevent: *"I can see the pawn, therefore I have its actor pointer,
therefore I know where it is, continuously and exactly."* Every omniscience complaint in every
shooter traces to some version of this.

> **Decision IX-4. Use AIPerception as a stimulus source only. `ADOPT` ⚠ load-bearing**
>
> Sight, hearing and damage senses produce *stimuli*. A stimulus is an event with a position,
> a time, a confidence and a type. It is written into the belief store (Vol III) and then the
> actor reference is **discarded**. No agent code may hold a pointer to a player pawn.
>
> **Enforce this mechanically.** Wrap the player pawn access in a single function in a single
> file and add an automated test that greps the AI module for forbidden symbols and fails the
> build. This sounds excessive. It is the single highest-leverage piece of process in the
> project, because this leak will happen, it will happen during a late-night bugfix, and it
> will silently destroy the property the whole design rests on.

### 3.2 Custom senses worth writing

`UAISense` is subclassable. Worth the effort:

| Sense | Why | Cost |
|---|---|---|
| `Sense_Report` | Radio and shout-based belief transfer between agents. Not really a sense, but reusing the machinery gives free filtering and team logic | `[small]` |
| `Sense_Disturbance` | Physical traces: a body, a spent casing pile, a cut road, a moved boat, an open gate. The investigation economy (Vol III §7) runs on these | `[medium]` |
| `Sense_Silhouette` | Low-confidence sight: "something moved on the ridge" without identification. Feeds `Source=Guessed` beliefs. **Cheap and disproportionately effective** | `[small]` |

`Sense_Silhouette` deserves emphasis. Most of the perceived humanity in the belief model comes
from agents reacting to *ambiguous* input. A binary see/don't-see sense produces binary
behaviour. A sense with an identification confidence separate from a detection confidence
produces the "is that one of ours?" moment, which is both dramatically valuable and, in act
two of PARTISAN, thematically the entire point.

### 3.3 Sight configuration realities

- Sight is a periodic trace, not continuous. The period is configurable and is a real
  performance lever (§7). At 0.3s it is imperceptible and cheap; at 0.05s it is expensive and
  makes agents feel instant.
- Peripheral vision angle is a single cone. Real eyes have a detection gradient. Implement the
  gradient yourself as a confidence multiplier on the stimulus rather than reaching for
  multiple cones.
- `AutoSuccessRangeFromLastSeenLocation` is a convenience that reintroduces omniscience.
  Disable it.
- Sight does not natively account for concealment (vegetation, dust, darkness). Add a
  concealment term via a trace against a concealment channel; the pine scrub and olive terraces
  on the island should meaningfully degrade detection confidence, not just block it or not.

---

## 4. Spatial reasoning: EQS

EQS is the right tool and the stock library is insufficient for this island. Budget custom
generators and tests as a first-class content task, not an afterthought.

### 4.1 Custom generators worth writing

| Generator | Produces | Used by |
|---|---|---|
| `TerraceEdge` | Points along dry-stone terrace lips, which are the island's natural firing positions | Base of fire, ambush |
| `RidgeLine` | Points along the limestone spine with sightlines both ways | Signal station fights, GREF overwatch |
| `RoadOffset` | Points at a given lateral offset from the road network | REDFOR everything |
| `BeliefPerimeter` | Ring of points at radius = belief uncertainty around the belief centroid | Search behaviour ⚠ the important one |
| `FlankArc` | Points on an arc that maintains a minimum path distance from the base of fire | Flank element |
| `WithdrawalChain` | Successive points each further from threat and closer to the cohesion anchor | Bounding back, rout |

`BeliefPerimeter` is load-bearing. Search behaviour that queries *the belief*, rather than the
player's actual position, is what makes an AI look like it is genuinely hunting rather than
pretending to hunt. It is also what allows the confidently-wrong search (Vol III §6), which is
the single most human-reading behaviour in the compendium.

### 4.2 Custom tests worth writing

| Test | Scores on | Note |
|---|---|---|
| `ExposureToSea` | Visibility from the naval approach | Act two: BLUFOR gunfire makes seaward positions lethal |
| `Uphill` | Elevation delta to threat | The island's whole tactical grammar |
| `PathCostRatio` | Path distance ÷ straight-line distance | Detects "looks close, isn't" — critical on a switchback island |
| `ConcealmentQuality` | Vegetation density | Distinct from cover: concealment stops detection, cover stops bullets. Modelling them separately is worth it here |
| `BeliefExposure` | Is this point inside anyone's belief radius | Lets agents *avoid* where they think the enemy thinks they are. Reads as very smart, costs almost nothing |
| `MutualSupport` | Line of sight to friendly positions | Squad shapes that hold together |
| `SoundMasking` | Ambient noise (surf, wind, generator) | Movement stealth economy |

### 4.3 EQS performance discipline

- Run queries **asynchronously**. A synchronous EQS on a 300-point grid with six tests will
  spike a frame.
- Prefer small point sets with good generators over large grids with clever tests. 40 well-
  placed points beat 400 sampled ones, every time, in both cost and quality.
- Cache. Terrain-only tests (slope, concealment, sea exposure) do not change. Bake them into a
  spatial grid at cook time and have the test read the bake. This is a large win and is the
  difference between EQS being affordable and not.
- Query frequency is a LOD parameter (§7).

### 4.4 Influence and threat maps — `ADOPT` at low resolution

A coarse grid (say 8m cells over the play area) carrying per-faction influence, recent-contact
recency, and known-danger decay. Updated at 1–2 Hz on a worker thread. Feeds:

- Faction-level mission assignment (Vol VII)
- The `BeliefExposure` test
- Director region selection (Vol VIII)
- GREF route planning, which should prefer low-influence ground even at higher path cost

Do not build a high-resolution potential-field system. The island's chokepointed geography
means graph-based reasoning over the road network and a handful of named regions will
outperform a fine grid for a fraction of the cost.

---

## 5. Navigation

### 5.1 The stack

`RecastNavMesh` remains the baseline. For a steep, vertical, terraced island:

| Setting | Guidance |
|---|---|
| Agent radius/height | One agent size. Resist multiple sizes; each adds a full navmesh |
| Cell size | Smaller than default. Terrace lips and goat tracks disappear at coarse cell sizes |
| Max slope | **Per-faction via nav areas, not one global value** — see §5.3 |
| Tile size | Tune for World Partition streaming granularity, not for build time |
| Nav Invokers | Required under World Partition. Generate around the player and around active squads |

### 5.2 Nav links as content

Goat tracks, terrace-wall drops, the switchbacks, boat moorings, the emery-workings shafts.
Each is a `NavLinkProxy` with a cost and — importantly — a **faction restriction**.

### 5.3 Faction-differentiated navigation ⚠ load-bearing

This is the mechanical expression of the three-brain asymmetry (Vol VII) and it is almost free:

```
NavArea_Road         GREF ×1.0   REDFOR ×0.7   BLUFOR ×0.8
NavArea_Terrace      GREF ×1.0   REDFOR ×2.5   BLUFOR ×2.0
NavArea_Scrub        GREF ×1.1   REDFOR ×4.0   BLUFOR ×3.0
NavArea_GoatTrack    GREF ×1.0   REDFOR ×∞     BLUFOR ×∞     (link restricted)
NavArea_Shore        GREF ×1.2   REDFOR ×2.0   BLUFOR ×1.0   (naval familiarity)
```

A garrison that *can* leave the road but pays four times the cost will, without any scripting,
naturally cling to the road, pursue reluctantly, and give up uphill pursuits. The player will
read this as doctrine. It is a cost table.

> **Why this beats scripting it.** A scripted "garrison may not leave the road" boundary is
> discoverable and exploitable, and once discovered it makes the AI look stupid. A cost
> gradient is not discoverable as a rule — it is discoverable as a *tendency*, which is what
> doctrine actually is. And in the rare case where the tactical value justifies it, the
> garrison *will* come uphill, which makes the tendency feel like a choice rather than a fence.

### 5.4 Dynamic navmesh: the four cut points

The site's four road cut points are `NavModifierVolume`s toggled at runtime. Cutting one:

1. Applies a blocking or high-cost area
2. Triggers a navmesh rebuild of the affected tiles (async; budget for the hitch and test it)
3. Invalidates REDFOR faction-level route plans
4. Is *observable*: the garrison's next patrol takes a visibly longer route

This is one of the strongest player-verb-to-AI-response loops available in the project and it
is nearly free once the navmesh is dynamic.

### 5.5 Avoidance

Detour Crowd over RVO for squad-sized groups; it produces more coherent formation movement.
But: **turn crowd avoidance off between the player and allied squadmates** and use push-through
capsules instead (Vol XI). Avoidance-based squadmates block doorways. Every time. It is the
single most common allied-AI complaint in the medium and it is solved by not using avoidance
for that specific relationship.

---

## 6. Mass Entity — background population

`ADOPT` for anything the player cannot resolve as an individual.

**Use for:** villagers, distant patrols, the fishing fleet, off-screen garrison routine, the
coarse A-Life layer (Vol VII §5).

**Do not use for:** anything in an active engagement. The fidelity is wrong and the
promotion/demotion boundary is where bugs live.

**The promotion boundary.** A Mass entity that comes within engagement range is promoted to a
full actor with a StateTree; the reverse on exit. Rules that make this survivable:

- Promotion must be **invisible**: the actor spawns with the entity's position, velocity,
  animation phase and state. Nothing pops.
- Promotion must happen **out of sight or at distance**, gated by the director's region
  visibility check.
- State must round-trip losslessly. Design the Mass fragment set and the actor state to share
  one serialisable struct from the start. Retrofitting this is miserable.
- Beliefs survive the transition. A demoted entity keeps a coarse belief; a promoted one
  inherits it. Otherwise the player learns that walking away resets enemy knowledge, which is
  both exploitable and immersion-fatal.

**Honest cost note.** Mass is powerful and its learning curve is steep — the processor/fragment/
trait model is a genuine paradigm shift from actor-oriented Unreal. `[large]`. It belongs in a
late phase (Vol XIII, Phase 6), not an early one. A solo developer who starts with Mass will
spend two months on infrastructure before seeing a fight.

---

## 7. Performance and LOD

AI is the tick-heaviest system in a game like this. Budget it explicitly.

### 7.1 The LOD ladder

| Tier | Condition | Perception | StateTree | EQS | Squad tick | Animation |
|---|---|---|---|---|---|---|
| **0 Combat** | In active engagement with player | 0.15s | 0.1s | on demand | 0.25s | full |
| **1 Near** | Within ~80m, not engaged | 0.4s | 0.3s | cached | 0.5s | full |
| **2 Distant** | Visible, beyond 80m | 1.0s | 0.5s | none | 1.0s | reduced |
| **3 Offscreen** | Not rendered, actor alive | 2.0s | 1.0s | none | 2.0s | budget-allocated |
| **4 Mass** | Beyond streaming/engagement range | abstract | none | none | 5.0s | none |

Use the **Significance Manager** to drive the tier, not raw distance. Significance can
incorporate "is this squad in the player's current objective" which matters more than metres on
a vertical island where a squad 200m away laterally may be the one shooting at you.

### 7.2 Specific costs to watch

- **Sight traces** dominate. They scale as agents × targets × frequency. Cull by distance and
  by facing *before* tracing, not in the trace.
- **Navmesh rebuilds** from dynamic modifiers. Async, tiled, and tested on the lowest target
  hardware.
- **EQS** — async, cached terrain tests, small point sets.
- **Animation** — use the Animation Budget Allocator for tier 2+. Motion matching is expensive
  per-agent and must be tier 0–1 only.
- **Bark audio** — voice count, not CPU, is the limit. Arbitration (Vol X) caps it naturally.

### 7.3 Determinism

Make the engine-agnostic library **deterministic given a seed**. Route every random draw
through `IPartisanWorldQuery::Rand01()`. This buys: reproducible bug reports, a replay system
nearly for free, and a harness that can bisect a regression across ten thousand runs. `[small]`
if done at the start, `[large]` if retrofitted.

---

## 8. Gameplay Ability System

`ADOPT`, early, with discipline.

**What goes through GAS:**

| Concept | GAS form |
|---|---|
| Morale | Attribute, clamped 0–1 |
| Suppression | Attribute with a periodic decay GameplayEffect |
| Wounds | Attribute set + `State.Wounded` tag |
| Ammunition | Attribute (per-agent) + squad pool (separate, not GAS) |
| Broken / Routing / Surrendering | Gameplay tags with exclusivity rules |
| Fear from a nearby death | Instant GE with a falloff magnitude |
| Leader-present bonus | Infinite GE applied by the squad layer, removed on leader death |
| All AI-visible status | Gameplay tags, so tactics can query them uniformly |

**Discipline required.** GAS is powerful and easy to over-apply. Do not put the *decision* logic
in GAS — put the *state* in GAS and the decisions in the engine-agnostic library reading that
state. The moment ability activation becomes the AI's control flow, you have a second,
invisible behaviour tree living inside your effects system.

**Gameplay Cues** are the natural home for the legibility layer: a morale-drop cue plays the
flinch animation, the fear vocalisation and the posture change as one authored unit. This is
exactly the coupling you want, because it makes "state changed silently" structurally hard.

---

## 9. Animation

Covered as design in Vol X. Engine notes:

- **Motion Matching** (Pose Search + Chooser) for tier 0–1 agents. This is where a
  disproportionate share of the perceived quality lives: an agent that decelerates, plants and
  turns like a person reads as a person before it does anything intelligent.
- **Per-profile pose databases.** The Old Soldier and the Conscript need different databases,
  not different parameters on one. This is the expensive part of Vol IV §4 and it is the part
  that sells it.
- **Chooser tables** keyed on morale band, suppression band, wound state and weapon. This is
  the right place for the legibility coupling because it is data, not code.
- **Layered additives** for suppression flinch and fatigue over any base state.
- **Turn-in-place and lean** matter more than they sound. Telegraphing a flank requires the
  agent to *visibly commit its body* before it moves.
- **Root motion** for surrender, rout-start, and casualty-drag. Set-piece animations for the
  emotionally loaded moments; procedural for everything else.

---

## 10. Audio

- **MetaSounds** for bark playback with runtime parameter control (urgency, distance,
  breathlessness scaled by morale and suppression). Breathlessness-under-fear alone does an
  extraordinary amount of characterisation work for near-zero cost.
- **Audio occlusion and attenuation must match the shout propagation model** in Vol III. If a
  shout transfers belief at 40m through terrain but the player cannot hear it at 40m through
  terrain, the player cannot model the AI's information, and the whole comms-cutting mechanic
  becomes invisible. **These two systems must share one distance/occlusion function.** ⚠
- **Audio Modulation** for ducking: a bark that matters must be audible over gunfire. Priority
  ducking, not volume tuning.
- **Concurrency groups** per squad and per faction, so barks cannot pile up.
- Recording in Greek and Turkish: budget for *delivery direction* over line count. Twenty
  well-delivered lines with fear and urgency variants beat two hundred flat ones.

---

## 11. Tooling and debug

This is Vol XII's subject; the engine hooks are:

| Tool | Use |
|---|---|
| **Gameplay Debugger** custom category | Per-agent: belief list, morale, suppression, role, current tactic, hold timer |
| **Visual Logger** | Every belief update, tactic change, bark, morale event. Timestamped, replayable. **The single most valuable tool for a solo AI developer** |
| **Custom belief visualiser** | Debug spheres sized by uncertainty, coloured by source. Build this in week one |
| **Director HUD** | Intensity curve, phase, last decisions with reasons |
| **`stat ai` / Unreal Insights** | Per-system timing. Insights traces for the AI thread specifically |
| **Automated forbidden-symbol test** | §3.1. Fails the build on player-transform access from the AI module |

---

## 12. Verdict summary

| Subsystem | Verdict | Phase | Cost |
|---|---|---|---|
| Engine-agnostic AI library | `ADOPT` | 0 | `[medium]` |
| C++ over Blueprint for AI | `ADOPT` | 0 | — |
| Pin UE 5.8 | `ADOPT` | 0 | — |
| StateTree (individual) | `ADOPT` | 0–1 | `[medium]` |
| Behaviour Trees (sub-behaviours) | `ADAPT` | 1 | `[small]` |
| AIPerception as stimulus source | `ADOPT` | 0 | `[small]` |
| Custom senses (Silhouette, Disturbance, Report) | `ADOPT` | 1–2 | `[medium]` |
| EQS with custom generators/tests | `ADOPT` | 1 | `[large]` |
| Coarse influence grid | `ADOPT` | 4 | `[medium]` |
| Recast + faction nav costs | `ADOPT` | 1 | `[small]` |
| Dynamic nav modifiers (cut points) | `ADOPT` | 4 | `[medium]` |
| Detour Crowd (enemies only) | `ADOPT` | 1 | `[trivial]` |
| Push-through capsules (allies) | `ADOPT` | 5 | `[small]` |
| GAS for status | `ADOPT` | 2 | `[medium]` |
| Motion Matching | `ADOPT` | 8 | `[large]` |
| Mass Entity | `ADOPT` | 6 | `[large]` |
| Smart Objects | `ADOPT` | 1 | `[small]` |
| MetaSounds + shared occlusion fn | `ADOPT` | 1 | `[medium]` |
| Utility scorer (hand-written) | `ADOPT` | 1 | `[small]` |
| GOAP | `REJECT` | — | reason in §2.4 |
| HTN implementation | `REJECT` | — | reason in §2.4 |
| Learning Agents runtime | `REJECT` | — | reason in §2.5 |
| Learning Agents offline-bake | `DEFER` | — | `[research]` |
| UE6 migration | `DEFER` | post-1.0 | mitigated by IX-3 |

---

*Vol IX · PARTISAN AI Compendium v1.0.0 · internal*
