# Volume II — The Technique Corpus

*Every architecture worth considering, what it costs, and a verdict that stops it being
re-proposed in six months.*

---

## 1. How to read a verdict

`ADOPT` — build this. `ADAPT` — take the idea, not the implementation. `REJECT` — with reason
recorded. `DEFER` — plausible later, not now.

A `REJECT` in this volume is not a claim that the technique is bad. It is a claim that for
**one developer, building a legibility-first casual PvE shooter in Unreal, at hobby pace**, the
cost/benefit is wrong. Change any of those four conditions and the verdicts change.

---

## 2. Decision architectures

### 2.1 Finite state machines

The baseline. States, transitions, one active state.

**Strengths.** Trivially debuggable. Cheap. Every programmer understands them. Excellent for
things that genuinely *are* states: awareness level, morale condition, suppression state,
posture.

**Weaknesses.** Transition count grows as O(n²). Becomes unmaintainable past ~10 states. No
natural hierarchy, no natural interruption model.

**Hierarchical FSMs** fix much of this: states contain sub-machines, transitions can be
declared at the parent level. This is what most "behaviour tree" implementations are actually
approximating.

**Verdict: `ADOPT` for state, `REJECT` as the top-level architecture.** PARTISAN has genuine
FSM-shaped concepts (Vol IV §2, §3) and they should be FSMs. The agent's *behaviour selection*
should not be.

### 2.2 Behaviour trees

The industry default since roughly Halo 2 / Spore. Composite nodes (sequence, selector,
parallel), decorators, leaf tasks. Re-evaluated from the root each tick, with various
optimisations.

**Strengths.** Authorable by designers. Composable. Visual. Enormous tooling and community
knowledge. Unreal's implementation is mature and event-driven rather than polling, which is
better than most.

**Weaknesses.** Tree structure encodes priority as *position*, which makes large trees brittle
and reorderings dangerous. Poor fit for state-heavy agents: you end up with blackboard flags
and decorator soup encoding what is really an FSM. Interruption semantics are subtle and a
common bug source. Debugging a 200-node tree at 2am is genuinely miserable.

**Verdict: `ADAPT`.** Keep BTs for small, self-contained, genuinely task-shaped sub-behaviours
(execute a bound, clear a building, move-and-shoot). Do not use one as the agent's spine.

### 2.3 Utility AI / infinite-axis utility

Each possible action scores itself continuously from world state via response curves; highest
score wins. Halo's impulse system is close to this; *The Sims* is the canonical example; Dave
Mark's work is the standard reference.

**Strengths.** Handles "many competing considerations" gracefully. Adding a new action does not
require restructuring anything. Naturally produces variance if you add noise or personality
weights. Excellent fit for **choosing between tactics**.

**Weaknesses.** Notoriously hard to debug: when an agent does something odd, you must inspect
every score. Prone to **flicker** when two options score closely. Curve tuning is an art and a
time sink.

**Verdict: `ADOPT` for tactic selection at the squad layer (Vol V §4), with two mandatory
guards:** a minimum commit timer and score hysteresis. Without those it is the single most
common source of the "reads like a computer" failure.

### 2.4 StateTree

Unreal's newer hybrid: a hierarchical state machine where states own tasks and transitions are
declared with conditions, with a data-binding model and a much cheaper tick than BT. Designed
alongside Mass.

**Strengths.** Genuinely the right shape for agents that are mostly stateful with task-shaped
leaves — which is exactly PARTISAN's agent. Conditions are declarative and visible. Performs
well. Integrates with Mass for crowd agents, so the same authoring covers both fidelity tiers.

**Weaknesses.** Younger, thinner community knowledge, and the API has moved between versions.
Some workflows still assume BT.

**Verdict: `ADOPT` as the individual-agent spine (Vol IX §2).**

> **Why, restated.** PARTISAN's agent is defined by *conditions* — awareness level, morale
> band, suppression, ammunition, role, cohesion. That is a state machine wearing a behaviour
> tree's clothes in most engines. StateTree lets it be what it is.

### 2.5 GOAP (Goal-Oriented Action Planning)

Agents hold a goal and a world-state representation; a planner (usually A* over action
preconditions/effects) assembles a sequence of actions to reach the goal.

**Strengths.** Emergent action sequences the designer did not author. Agents adapt to
unexpected world states. Authoring is per-action, which is modular.

**Weaknesses.** Expensive to implement correctly. World-state representation design is the
hard part and is invisible in most writeups. Planning cost grows badly. **And critically: the
plans it produces are rarely legible to the player.** A GOAP agent doing something clever and
unannounced reads as random. Debugging requires a plan visualiser you must build yourself.

**Verdict: `REJECT`.** Recorded reason, so this does not get re-litigated:

> PARTISAN's tactical vocabulary is small (12–18 squad tactics, ~8 individual roles) and
> bounded by the setting. A planner's value is generating sequences beyond what a human
> authored; at this vocabulary size there is nothing beyond it worth generating. The
> implementation cost is 1–3 months and the debugging cost is permanent. The same behaviour
> is reachable with scored selection over authored tactics at a fraction of the cost, and is
> *more* legible because each tactic ships with its own bark set and authored shape.
> **F.E.A.R.'s magic was the barks, not the planner (Vol I §2.1). Take the magic, skip the
> planner.**

### 2.6 HTN (Hierarchical Task Network) planning

Decompose an abstract task into sub-tasks recursively via authored methods until primitives
remain. Killzone 2's approach.

**Strengths.** Authored structure plus planning flexibility. Far more controllable than GOAP —
the designer constrains the decomposition. Naturally hierarchical, which matches squad→role→
action.

**Weaknesses.** Still a planner: replanning cost, plan invalidation, debugging.

**Verdict: `ADAPT`.** Use HTN as the **mental model** for Vol V's structure (squad tactic →
role assignment → individual behaviour) without building a planner. The hierarchy is real and
useful; the search is not needed when the decomposition has one or two options per level.

### 2.7 Blackboard architectures

Shared data store; multiple knowledge sources read and write. Old (1970s speech recognition)
and ubiquitous in games as BT scratch memory.

**Verdict: `ADOPT`, restructured.** PARTISAN's squad object *is* a blackboard, and the faction
Knowledge Map is a second one. But blackboards must be **tiered and access-controlled** (Vol
III §3): agent-local, squad-shared, faction-shared. The classic failure is one flat blackboard
that becomes an omniscience leak by accident.

### 2.8 Subsumption architecture

Brooks' layered reactive control: low layers handle reflexes, higher layers suppress them.

**Verdict: `ADAPT`, one specific use.** The self-preservation override (Vol IV §7) is a
subsumption layer: a reflex that can suppress the tactical layer without asking permission.
This is the correct architecture for that one feature and it should be built that way
explicitly.

### 2.9 Monte Carlo Tree Search, minimax, and game-tree search

**Verdict: `REJECT`.** Continuous-space, hidden-information, real-time, many-agent. Wrong tool.
Listed only so it is recorded as considered.

### 2.10 Reinforcement learning and Learning Agents

Unreal ships a Learning Agents plugin for RL/imitation learning.

**Where it genuinely could help.** Low-level continuous control: locomotion policies, aim
tracking curves, cover-approach paths. Offline, in a training harness, baked to data.

**Where it will not help.** Tactical decision-making, for four reasons, all fatal in
combination:
1. **Unauthorable.** You cannot ask a policy to be 15% more cautious for the Old Soldier
   archetype.
2. **Undebuggable.** "Why did it do that" has no answer, which breaks Vol XII entirely.
3. **Optimisation pressure is wrong.** RL optimises for winning. PARTISAN's AI must optimise
   for *being interesting to fight*, which is not expressible as a reward without enormous
   reward-shaping effort that is itself the authoring work you were trying to avoid.
4. **Legibility is anti-correlated with optimality.** The behaviours that read as human (Axiom
   2) are exactly the ones RL will train out.

**Verdict: `DEFER` for offline motor policies only. `REJECT` for behaviour.** Do not spend a
month on this before Phase 3 exists. It is the single most seductive time sink available.

### 2.11 Imitation learning from player data

Train on recorded human play to produce human-like movement. Academically promising.

**Verdict: `REJECT` at this scope.** Requires a corpus of human play that does not exist for a
game that does not exist. Chicken and egg. Note it as a Phase 8+ possibility only.

### 2.12 LLM-driven NPCs

**Verdict: `REJECT` for behaviour. `DEFER` for authoring.**

Latency, cost, non-determinism and lack of grounding make runtime LLM control unsuitable for
combat agents in a fast-paced shooter. Barks must be tight, specific, correct about the world
state, and sub-100ms — all things a local generative system is currently bad at and a lookup
table is perfect at.

**The legitimate use is offline authoring:** generating bark *variation* against a strict
schema, then baking and voicing the results. That is a content-pipeline tool, not an AI
architecture, and it is genuinely useful given a solo developer needs hundreds of lines.

---

## 3. Perception and knowledge

### 3.1 Naive perception (the default, and the enemy)

"Can I trace to the pawn? Then I know where it is." Unreal's `AIPerception` makes this the
path of least resistance.

**Verdict: `REJECT` as a knowledge model.** `ADOPT` only as a *stimulus source*. The
distinction is the whole of Vol III. Stimuli in, belief out, and nothing downstream ever sees
the stimulus directly.

### 3.2 Sensory models with occlusion, FOV, peripheral degradation

Cone plus range plus trace, with acuity falling off by eccentricity, target motion, contrast,
light level, and target posture.

**Verdict: `ADOPT`, and make the rules learnable** (Alien: Isolation's lesson). The player must
be able to build an accurate mental model of what enemies can see. A perception system the
player cannot learn is indistinguishable from randomness.

### 3.3 Auditory perception with propagation

Sound events with intensity, falloff, and occlusion-aware propagation (ideally routed through
navigable space rather than straight lines, so sound goes around corners like it should).

**Verdict: `ADOPT`.** On a steep island with a road in a valley, sound propagation is
tactically enormous and thematically perfect. Gunfire echoes. Church bells carry. The whole
comms model (Vol VII §3) leans on this.

### 3.4 Bayesian occupancy grids / probabilistic search

Maintain a probability distribution over where the target might be; update on negative
evidence ("I looked there and it was empty"); search the high-probability cells.

**Strengths.** Produces genuinely excellent search behaviour, including the beautiful emergent
property that agents *stop* searching cleared areas and expand outward as the target's possible
reachable set grows.

**Weaknesses.** Memory and cost if done densely. Can look *too* good — a perfectly rational
searcher reads as a machine.

**Verdict: `ADAPT`, coarsely.** Vol III §5 specifies a low-resolution belief grid over
navigation-graph regions, not world-space cells, with deliberate irrationality injected: the
squad commits to *one* plausible region rather than distributing optimally. See Axiom 2.

### 3.5 Particle-filter target tracking

Maintain N hypotheses about target position, propagate them by assumed motion, cull on
negative evidence.

**Verdict: `ADAPT` as the implementation of §3.4 if the grid proves awkward.** Particles map
nicely onto "the squad believes he went one of three ways" and onto a debug visualiser.
Decide during Phase 1 prototyping; both are acceptable, and the API above them (Vol III §2)
is identical, which is the point of having an API.

### 3.6 Information sharing / distributed knowledge

How belief moves between agents. Most games do this instantly and globally, which is the
single largest source of "the AI cheats" complaints in the genre.

**Verdict: `ADOPT` with physical transport.** Vol VII §3. Shout, radio, runner, bell — each
with range, latency, failure probability, and a player-facing counter.

---

## 4. Spatial reasoning

### 4.1 Navigation meshes

**Verdict: `ADOPT`** (it is the engine default and correct). Vol VI §6 covers the island
specifics: invoker-based generation under World Partition, nav modifiers for the four road cut
points, nav links for goat tracks usable only by GREF, and area cost multipliers encoding
faction terrain competence.

### 4.2 Waypoint graphs and A* variants

Largely superseded by navmesh for agent movement, but **still correct for the strategic layer**:
the faction Knowledge Map and A-Life simulation should run over a coarse region graph, not a
navmesh (Vol VII §4).

**Hierarchical pathfinding (HPA\*)** — `ADOPT` conceptually for the strategic layer: region
graph on top, navmesh underneath.

**Jump Point Search** — `REJECT`, grid-specific, not applicable.

**Flow fields** — `REJECT`, designed for many agents to one goal. PARTISAN has few agents with
many goals.

### 4.3 Influence maps / potential fields

A grid or graph carrying per-faction influence, threat, visibility, tension, or recency values.
Classic RTS technique, underused in shooters.

**Strengths.** Extremely cheap tactical reasoning. Answers "where is it dangerous", "where is
the front", "where has nobody looked recently", "where can I be flanked from" in one lookup.
Composable: sum, subtract, blur, threshold.

**Verdict: `ADOPT`, and this is an under-appreciated high-value item.** Vol VI §4 specifies
four maps: **threat**, **visibility-to-sea**, **recency-of-search**, and **friendly-support**.
They feed EQS tests, director decisions, and search behaviour, and they cost almost nothing.

### 4.4 Environment Query System (EQS)

Unreal's spatial query framework: generate candidate points, score them by weighted tests, pick
the best.

**Verdict: `ADOPT`, heavily customised.** The stock generators and tests will not express a
terraced limestone island. Vol VI §3 lists the custom generators and tests to write. Expect
this to be a genuine chunk of engineering and budget it honestly: **EQS customisation is
probably the second-largest code item in the project after the belief system.**

### 4.5 Cover systems: annotated vs. generated

*Annotated* — level designers place cover markers. Precise, controllable, laborious, and
breaks when geometry changes.

*Generated* — runtime or bake-time analysis finds cover from geometry. Scales, survives
iteration, less precise.

**Verdict: `ADAPT` — generated with annotation override.** Generate at bake time from geometry
(terrace walls are extremely regular and will generate well), and allow hand placement for
the authored set-pieces. Vol VI §2.

### 4.6 Tactical position evaluation

Score positions on: cover from the believed threat, cover from *other* threats, exposure to
flanks, distance to squad, distance to objective, retreat availability, elevation, and
*firing-position quality* (can I actually shoot from here).

**Verdict: `ADOPT`.** This is the single system that most determines whether the AI looks
competent. Vol VI §3.3.

### 4.7 Visibility precomputation

Bake a coarse "who can see whom" region-to-region visibility matrix offline.

**Verdict: `ADOPT` at region granularity.** On an island defined by a limestone spine and
sightlines to the Anatolian coast, precomputed regional visibility is cheap and enables
strategic-layer reasoning (Vol VII §2) that would otherwise require traces.

---

## 5. Group behaviour

### 5.1 Flocking / boids / steering behaviours

**Verdict: `ADAPT` narrowly.** Reynolds' separation/alignment/cohesion is wrong for infantry —
soldiers do not flock, they take positions. But *separation* alone, as a local avoidance layer
under the tactical positioning, is correct and prevents clumping.

### 5.2 Formations

Slot-based formations with terrain adaptation.

**Verdict: `ADOPT` for BLUFOR and REDFOR movement, `REJECT` for GREF.** This is a *characterful*
distinction: the relief force and the garrison move in recognisable formations; the militia
moves as individuals who happen to be going the same way. The player should be able to
identify the faction from movement silhouette alone (Vol VII §1).

### 5.3 Squad slot reservation

Agents claim tactical positions from a shared pool; claims are exclusive and time-limited.

**Verdict: `ADOPT`, mandatory.** Without it you get the cover conga line (Vol I §3.7). This is
cheap and prevents a highly visible failure.

### 5.4 Role-based coordination

Assign roles (base of fire, flank, security, casualty, leader) and let each role's behaviour
be simple.

**Verdict: `ADOPT`.** Vol V §5. The complexity lives in *allocation*, not in role behaviour,
which is the cheap way to buy apparent sophistication.

### 5.5 Shared cooldowns and squad-level resources

Squad ammunition pool, grenade budget, "someone is allowed to flank right now" tokens.

**Verdict: `ADOPT`.** Directly serves the scarcity pillar and prevents the six-simultaneous-
grenades failure.

---

## 6. Pacing and experience management

### 6.1 Drama managers (academic lineage)

The interactive-drama research tradition: a system that monitors story state and intervenes to
shape the arc. Mateas and Stern's *Façade* is the canonical implementation.

**Verdict: `ADAPT`.** The vocabulary is useful — *beat*, *beat goal*, *tension arc*,
*intervention* — even though the implementations are aimed at narrative rather than combat.
Vol VIII borrows the beat structure.

### 6.2 The L4D Director model

Covered in Vol I §2.3.

**Verdict: `ADOPT` as the architecture, `ADAPT` in its levers.**

### 6.3 Dynamic difficulty adjustment

**Verdict: `ADOPT` with a hard constraint.** DDA is correct for casual PvE and wrong if the
player can detect it. Vol VIII §5: **adjust belief parameters, reaction times, mistake budgets
and scarcity. Never adjust health or damage.** Health scaling is detectable within one
magazine and is the fastest way to destroy the illusion the whole compendium is built on.

### 6.4 Procedural content placement

**Verdict: `ADAPT`, small scope.** PARTISAN is an authored island, not a generated one. But
patrol routing, scarcity placement, and reinforcement timing should vary, so the player cannot
memorise a route (Vol I §2.3's under-discussed lesson).

---

## 7. Animation and motion

### 7.1 Motion Matching / Pose Search

Database-driven animation selection matching a desired trajectory against a pose corpus.

**Verdict: `ADOPT`.** Vol X §3. Non-negotiable for legibility: the tells that Axiom 1 depends
on are *postural*, and hand-authored state-machine locomotion cannot express "this man is
frightened" with the fidelity required.

**Cost warning.** Motion matching needs a large, well-captured, consistent animation corpus
*per movement style*. Five personality archetypes × distinct locomotion styles is a serious
animation budget. Vol XIII §3 treats this as a top-three cost risk and proposes mitigations
(fewer styles, additive layers, procedural overlays).

### 7.2 Procedural aim offsets, look-at, and additive fear layers

**Verdict: `ADOPT`, high value per cost.** Additive layers (breathing rate, weapon shake, head
darting, shoulder hunch) driven directly from the suppression and morale floats give
personality-specific motion without multiplying the locomotion corpus. **This is the cheap
route to §7.1's benefit and should be built first.**

### 7.3 Inverse kinematics for terrain

**Verdict: `ADOPT`.** On an island with no flat ground, foot IK is not polish, it is the
difference between soldiers and skating props.

---

## 8. Audio

### 8.1 Bark systems

**Verdict: `ADOPT` as a first-class system, not audio dressing.** Vol X §2. Requires: a
selection layer, an arbitration layer, a budget, a cooldown model, and a debug log. Build it
in Phase 1, not Phase 8.

### 8.2 Propagated, occluded combat audio

**Verdict: `ADOPT`.** Also feeds §3.3 — the same propagation model should serve player
audibility and AI hearing, so that what the player hears is genuinely what the AI hears. This
consistency is a large, cheap credibility win.

### 8.3 Dynamic music tied to Director state

**Verdict: `ADOPT`, carefully.** Music that tracks intensity is standard and effective; music
that *leads* intensity spoils the Director's surprises. Lag it.

---

## 9. Summary verdict table

| Technique | Verdict | Volume | Cost |
|---|---|---|---|
| FSM for state | ADOPT | IV | small |
| Behaviour Trees as spine | REJECT | — | — |
| BT for sub-behaviours | ADAPT | IX | small |
| Utility scoring for tactics | ADOPT | V | medium |
| StateTree as agent spine | ADOPT | IX | medium |
| GOAP | REJECT | — | — |
| HTN as mental model | ADAPT | V | trivial |
| Tiered blackboards | ADOPT | III | small |
| Subsumption for reflexes | ADAPT | IV | small |
| MCTS / game-tree search | REJECT | — | — |
| RL for behaviour | REJECT | — | — |
| RL for offline motor policy | DEFER | — | research |
| LLM runtime NPCs | REJECT | — | — |
| LLM offline bark authoring | DEFER | X | small |
| Naive perception as knowledge | REJECT | — | — |
| Sensory model w/ occlusion | ADOPT | III | medium |
| Auditory propagation | ADOPT | III | medium |
| Coarse Bayesian belief | ADAPT | III | medium |
| Particle-filter tracking | ADAPT | III | medium |
| Physical information transport | ADOPT | VII | medium |
| Navmesh | ADOPT | VI | small |
| Region graph / HPA* strategic | ADOPT | VII | small |
| Influence maps | ADOPT | VI | small |
| EQS, customised | ADOPT | VI | **large** |
| Generated cover + annotation | ADAPT | VI | medium |
| Tactical position evaluation | ADOPT | VI | medium |
| Region visibility precompute | ADOPT | VI | small |
| Separation-only steering | ADAPT | VI | trivial |
| Formations (REDFOR/BLUFOR only) | ADOPT | VII | small |
| Slot reservation | ADOPT | V | small |
| Role-based coordination | ADOPT | V | medium |
| Squad-level resources | ADOPT | V | small |
| Drama-manager vocabulary | ADAPT | VIII | trivial |
| L4D Director architecture | ADOPT | VIII | medium |
| DDA on belief params only | ADOPT | VIII | small |
| Varied placement | ADAPT | VIII | small |
| Motion Matching | ADOPT | X | **large** |
| Additive fear/suppression layers | ADOPT | X | small |
| Foot IK | ADOPT | X | small |
| Bark system w/ arbitration | ADOPT | X | medium |
| Shared player/AI audio propagation | ADOPT | X | medium |
| Lagged dynamic music | ADOPT | X | small |

**Two `large` items: EQS customisation and Motion Matching.** Those are the schedule. Vol XIII
plans around them.
