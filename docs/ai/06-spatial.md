# Volume VI — Spatial Reasoning

*The ground is the enemy. This volume is the ground, expressed as data the AI can think with.*

---

## 1. The island as an AI problem

From the parent document: a long, thin, steep eastern Aegean island. Limestone spine.
Terraced olive and vine on the south slopes, pine and scrub on the north. Almost no flat
ground. One deep harbour town. Inland villages reachable only by switchback. A single coast
road cuttable in four places.

Restated as AI requirements:

| Terrain fact | AI consequence |
|---|---|
| Almost no flat ground | Vertical EQS, slope-aware cost, foot IK mandatory, fatigue matters |
| Terraced slopes | **Extremely regular, waist-high, linear cover.** A generated cover system will produce excellent results almost for free |
| One road | Path denial is meaningful. Nav modifiers at four points change the tactical graph at runtime |
| Switchback villages | Long approach times, predictable routes, ambush geometry |
| Spine ridge | Dominant observation. Whoever holds it sees the island. Influence maps make this legible |
| Scrub on the north | The concealment regime. High belief-decay multiplier (Vol III §4.3) |
| Sightline to Anatolia | Strategic-layer visibility, and a thematic constant |
| Sea on all sides | Bounded world. Sinks in the search distribution. Boats as a movement class |

> **The lucky accident.** F.E.A.R.'s perceived intelligence came substantially from level
> geometry that always offered its limited AI vocabulary a good move (Vol I §2.1). **Agricultural
> terracing is that geometry, occurring naturally, at scale, for free.** Parallel lines of
> waist-high stone at regular intervals up a slope is close to an ideal cover layout for
> bounding infantry. This is the strongest single argument that the setting and the AI design
> are well matched.

---

## 2. Cover

### 2.1 Generation, not annotation

Bake-time analysis over static geometry, with hand-placed overrides for authored set-pieces.

**The generator:**
1. Sample the navmesh at ~1 m intervals.
2. At each sample, cast rays outward in 16 directions at three heights (prone 0.4 m, crouch
   1.0 m, standing 1.7 m).
3. A direction is *covered* at a height if a ray hits solid geometry within 1.2 m.
4. Record a **cover profile**: 16 directions × 3 heights = 48 bits, plus a quality score.
5. Discard samples with no cover at any height. Cluster the rest into cover *positions* with a
   minimum separation of 2.5 m (which is also the reservation separation, Vol V §5.3).

**Output per position:** location, cover profile, stance requirement, exposure score, and
whether it permits firing (see §2.3).

### 2.2 Cover quality

```
CoverQuality(pos, threatDir) =
      DirectionalCover(profile, threatDir)     // hard 1.0, partial 0.5, none 0
    · StanceViability                          // can the agent use it from a useful stance
    · (1 - FlankExposure(pos, otherThreats))
    · MutualSupport(pos)                       // Vol V §5.4
    · RetreatAvailability(pos)                 // is there a way out
```

`RetreatAvailability` is unusual and worth keeping: positions with no retreat route score
poorly, which produces agents that avoid getting trapped and that *look* like they are thinking
about consequences.

### 2.3 The firing-position requirement

**A position that offers cover but no firing arc is a hiding place, not a fighting position,
and most cover systems conflate them.** A position must be tagged with which of the 16
directions it can *shoot* along while retaining cover. Terrace walls are excellent for this:
cover from below, fire over the top, expose the head only.

Three tags per position: `Cover` (protects), `Fire` (can engage), `Peek` (can observe without
engaging). Agents in `SuppressAndWait` want `Fire`. Agents in `Curious` want `Peek`. Agents
`Broken` want `Cover` only. **This one distinction does more for readable behaviour than any
amount of scoring sophistication.**

---

## 3. EQS

Expect this to be the second-largest code item in the project. Stock generators and tests will
not express this island.

### 3.1 Custom generators

| Generator | Produces | Used by |
|---|---|---|
| `TerraceEdges` | Points along terrace wall tops and bases, with the wall's axis | Bounding, base of fire |
| `RidgeLine` | Points along local elevation maxima | Observation, overwatch |
| `FlankCorridor` | Points forming a traversable lateral path outside a given belief cone | `FixAndFlank` |
| `RoadCutProximity` | Points with a firing arc onto a road cut point | `HoldCutPoint`, `Ambush` |
| `ApproachFan` | Points on the plausible approach routes to a position | Security, ambush |
| `DefiladeFromSea` | Points not visible from a given sea bearing | Naval gunfire avoidance. **Pillar-four flavour** |
| `GoatTrackNodes` | Points on GREF-only nav links | `Infiltrate`, `Fade` |
| `BuildingInteriors` | Room-granular points in the harbour town | `TownSweep` |
| `RecentlyUnsearched` | Points weighted by the recency influence map | `SearchPattern` |

### 3.2 Custom tests

| Test | Scores by |
|---|---|
| `CoverFromBelief` | Cover profile vs the *belief* direction, never the truth |
| `ExposureToOtherThreats` | Flank vulnerability from known enemy positions |
| `UphillOf` | Elevation advantage over the target |
| `SlopeCost` | Traversal cost to reach, slope-weighted |
| `DistanceFromBeliefCentroid` | For search spreading |
| `VisibilityToSea` | Naval gunfire and observation exposure |
| `MutualSupport` | Covered by a friendly position |
| `RetreatAvailable` | Escape route exists |
| `ThreatInfluence` | Sampled from the threat influence map (§4) |
| `SearchRecency` | Sampled from the recency map |
| `FiringArcTo` | Can actually engage from here |
| `NoiseFloor` | Ambient noise at this location (near the sea, near the generator) |

### 3.3 The tactical position evaluation

The single query that most determines whether the AI *looks* competent. Composite, weighted by
role:

| Role | Dominant weights |
|---|---|
| `BaseOfFire` | FiringArcTo ×3, CoverFromBelief ×3, MutualSupport ×2, RetreatAvailable ×1 |
| `FlankElement` | ExposureToOtherThreats ×−3, SlopeCost ×−2, DistanceFromBeliefCentroid ×2 |
| `Assault` | SlopeCost ×−2, CoverFromBelief ×1, UphillOf ×1 |
| `Security` | FiringArcTo (on the unengaged arc) ×3, Peek ×2 |
| `Broken` | CoverFromBelief ×4, RetreatAvailable ×3, everything else 0 |

### 3.4 Cost control

EQS is not cheap. Guards:
- **Budget queries per squad per second**, not per agent. The squad runs the query, distributes
  results to roles.
- **Cache aggressively.** Positions change only when the belief moves significantly or cover is
  destroyed.
- **Tier by LOD.** Distant squads use a coarse query over region centroids.
- Run on the async EQS path. Never block.

---

## 4. Influence maps

Cheap, underused, high-value. Four maps over the nav-region graph (not a dense grid — regions,
Vol III §5.1).

| Map | Source | Consumers |
|---|---|---|
| **Threat** | Known/believed enemy positions, decayed | Position scoring, path costs, Director |
| **Visibility-to-sea** | Precomputed, static | Naval gunfire, BLUFOR behaviour, pillar four |
| **Search recency** | Time since any friendly agent observed the region | `SearchPattern`, `RecentlyUnsearched` generator |
| **Friendly support** | Friendly positions, blurred over adjacency | Mutual support, withdrawal targets, cohesion anchors |

**Operations:** sum, difference, blur (diffuse along adjacency), threshold, gradient.
"Where is the front" is `Threat − FriendlySupport` thresholded at zero. "Where should we
withdraw" is the gradient of `FriendlySupport − Threat`. This is a handful of lines and it
answers questions that would otherwise need bespoke code.

**Update cost:** a few hundred regions, a handful of maps, updated at 1–2 Hz. Negligible.

---

## 5. The region graph

Coarse spatial decomposition, ~200–800 nodes for the island. Used by: the search distribution,
influence maps, faction knowledge, A-Life, and the strategic layer.

**Generation:** partition the navmesh by watershed on the distance field, then merge small
regions and split large ones, then hand-correct. Semi-automatic; expect a day of manual
cleanup, which is fine because the island is authored and static.

**Per-region data:** centroid, area, adjacency list with traversal costs, terrain class
(feeding Vol III §4.3 multipliers), visibility set (§7), cover density, faction familiarity
(§6.3), and named landmark (for barks — *"above the chapel"* requires the region to know it is
above the chapel).

> **The landmark field is not decoration.** Bark specificity (Vol X §2.2) is a top-three
> believability system and it is entirely dependent on regions having human names. Author them
> at the same time as the toponym pass the parent document already flags as pending.

---

## 6. Navigation

### 6.1 Navmesh under World Partition

Nav Invokers around the player and around active squads. Generation at runtime for streamed
cells. Standard, but verify generation cost on steep terraced geometry early — terracing
produces a lot of navmesh edges and it is worth knowing the cost in Phase 0, not Phase 6.

### 6.2 Area classes and faction cost multipliers

**This is how faction terrain competence is implemented, and it should be data, not code.**

| Area class | REDFOR | GREF | BLUFOR |
|---|---|---|---|
| Coast road | 1.0 | 1.2 | 1.0 |
| Town street | 1.0 | 1.0 | 1.1 |
| Terrace path | 1.6 | 1.0 | 1.8 |
| Terrace face (climb) | 3.0 | 1.3 | 3.5 |
| Scrub / maquis | 2.5 | 1.1 | 3.0 |
| Goat track (nav link) | ∞ | 1.0 | ∞ |
| Ridge scramble | 2.8 | 1.2 | 3.0 |
| Emery workings | 2.0 | 1.4 | 2.5 |

> **What this table buys.** The garrison genuinely cannot follow you uphill — not because a
> script forbids it, but because the pathfinder costs it out. The relief force is *worse* than
> the garrison off-road, because they have never been here. A player will feel this within one
> engagement and will never be told it. Pillars one and the faction asymmetry of Vol VII, both
> delivered by one data table. **Highest design value per byte in the compendium.**

### 6.3 Faction familiarity

A per-region scalar per faction, 0–1. GREF is 1.0 nearly everywhere. REDFOR is high on the road
and in town, low above the treeline. BLUFOR starts near zero everywhere and **rises slowly with
occupation**, which is a quiet, excellent expression of an occupying force learning the ground.

Familiarity feeds: path cost, search competence, ambush avoidance, and how quickly beliefs
decay for that faction in that region.

### 6.4 The four cut points

Dynamic nav modifiers. When cut (by the player, by a Director event, by a landslide):
- Traversal cost rises sharply or becomes impassable for wheeled movement.
- The region graph adjacency changes, which propagates automatically into search, influence
  maps, and strategic reasoning.
- REDFOR's supply and reinforcement routing (Vol VII §6) is directly affected.
- A bark fires. The garrison *notices*.

**This is the single most mechanically satisfying player verb the terrain offers** and it works
because the AI genuinely reasons over the modified graph rather than following a script.

### 6.5 Nav links

| Link type | Usable by | Cost |
|---|---|---|
| Terrace wall vault | All | Low, animation-gated |
| Goat track | GREF only | Low |
| Drainage culvert | GREF, and BLUFOR after familiarity > 0.5 | Medium |
| Rooftop crossing (town) | All, with a fitness check | Medium |
| Boat mooring → land | Anyone with a boat | High, slow, very visible |
| Mine shaft | GREF only initially | Medium |

### 6.6 Stuck detection and graceful recovery

Every game has stuck agents. Plan for it.

1. Track displacement over a rolling window. If an agent has a move order and has travelled
   <0.5 m in 4 s, flag stuck.
2. First remedy: re-path with a randomised nearby target.
3. Second remedy: nav-project to the nearest valid navmesh point and teleport **only if not
   visible to the player** (test against the player camera frustum and a trace).
4. Third remedy: despawn and respawn out of sight, preserving identity and squad membership.
5. **Always log it.** A stuck-agent count per session is a build-health metric (Vol XII §1).

### 6.7 Movement styles and the readable silhouette

Path *following* matters as much as path *finding*. Three faction movement silhouettes:

- **REDFOR patrol**: column on the road, point man, spacing, rear security. Unhurried. Reads as
  routine.
- **GREF movement**: dispersed, no formation, individuals choosing their own line, frequent
  stops. Reads as amateur and local.
- **BLUFOR advance**: fire-team wedges, bounding, mutual support, textbook spacing. Reads as
  professional and out of place.

A player should identify the faction from a distant silhouette in motion before seeing a
uniform. Vol VII §1.

---

## 7. Precomputed visibility

Bake a region-to-region visibility matrix offline: for each region pair, the fraction of sample
points in A that can see sample points in B.

**Uses:** strategic reasoning without traces, Director placement ("spawn out of sight" requires
knowing what is out of sight), naval gunfire arcs, ambush position evaluation, mutual support
at region granularity, and the signal station's dominance being an actual data fact rather than
a fiction.

**Cost:** N² for a few hundred regions is trivial to store and takes minutes to bake.

---

## 8. Sound propagation as a spatial system

Shared with Vol IV §2.2. Propagate sound through the region adjacency graph with per-edge
attenuation, rather than by Euclidean distance with a trace. Consequences:

- Sound follows valleys and the road, and is blocked by the spine. Correct, and free.
- A gunshot in the harbour town is heard along the road but not over the ridge.
- The same graph serves the player's audio occlusion, so what the player hears *is* what the AI
  hears (Vol II §8.2). This consistency is a very large credibility win.

---

## 9. The level design contract

AI quality is partly a level-design problem, and the contract should be written down so it is
not rediscovered per-level.

**Every combat space must provide:**
1. At least two viable approach routes to any defended position (or the `FixAndFlank` tactic is
   unavailable and fights become static).
2. A lateral corridor for flanking that is at least partially concealed.
3. Cover at three scales: individual (a wall), squad (a terrace line), and withdrawal (a fold
   in the ground).
4. At least one position with observation but no good firing arc, so `Peek` matters.
5. A named landmark per region, for barks.
6. A retreat route from every defensible position, or the defenders will die in place and the
   morale system produces nothing.
7. Vertical separation between at least two of the approaches, so elevation is a real variable.

**And must avoid:**
- Single-corridor engagements with no alternative (the AI's vocabulary collapses to
  `SuppressAndWait` and the fight is boring).
- Symmetric arenas (they read as arenas, not as an island).
- Cover that is uniformly the same height (removes the stance decision).

> **This contract is the cheapest AI improvement available.** Retrofitting an AI to cope with a
> bad space costs months; designing the space to the contract costs nothing extra at authoring
> time. Give it to whoever builds levels, including future-you.

---

## 10. Implementation order

1. Region graph generation + hand cleanup + landmark naming. `[medium]`
2. Navmesh area classes and the faction cost table. `[small]` — *huge value, do it early*
3. Cover generation and the Cover/Fire/Peek tagging. `[medium]`
4. Precomputed region visibility bake. `[small]`
5. Influence maps (four). `[small]`
6. Custom EQS generators, first three: `TerraceEdges`, `FlankCorridor`, `ApproachFan`. `[medium]`
7. Custom EQS tests, first six. `[medium]`
8. Tactical position evaluation per role. `[medium]`
9. Sound propagation over the region graph. `[medium]`
10. Nav links, GREF-only classes. `[small]`
11. Dynamic cut-point modifiers. `[small]`
12. Stuck detection and recovery. `[small]`
13. Remaining EQS generators and tests. `[medium]`
14. Movement styles per faction. `[medium]` — mostly animation
