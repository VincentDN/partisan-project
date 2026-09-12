# Volume III — Knowledge and Belief

*The load-bearing system. If only one volume gets built, build this one.*

---

## 1. The invariant

> **No code path anywhere in PARTISAN, at any layer, in any subsystem, may read the player's
> authoritative transform for the purpose of AI decision-making.**

This is not a guideline. It is the architectural invariant on which every claim in this
compendium depends, and it must be enforced mechanically rather than by discipline, because
discipline fails at 1am in week sixty.

**Enforcement, in three parts:**

1. **API chokepoint.** A single subsystem, `UBeliefSubsystem`, exposes `GetBelief(Observer,
   TargetID)`. Nothing else exposes target position.
2. **Type-level separation.** Agent-facing code receives `FBelief`, never `FVector` from a
   pawn. Make the wrong thing hard to type.
3. **An automated test that fails the build.** A commit hook or CI step greps the AI module
   for direct pawn-transform access outside the perception module. Crude, effective, and worth
   the hour it takes to write.

> **Why enforce it this hard.** The failure is insidious. One well-meaning shortcut — "just
> for the grenade targeting, it's easier" — produces a psychic grenade, which is the single
> most commonly cited "the AI cheats" complaint in the genre, and it will be invisible in code
> review because it looks like a bug fix. The invariant only works if it is absolute.

---

## 2. The belief record

```cpp
USTRUCT()
struct FBelief
{
    FGuid    TargetID;           // who this is about
    FVector  LastKnownPos;       // best point estimate
    float    PosUncertainty;     // metres, radius of plausible location
    FVector  LastKnownVelocity;  // decays toward zero
    float    Confidence;         // 0..1, "is this target even real / still here"
    EBeliefSource Source;        // Saw | Heard | Told | Inferred | Guessed | Directed
    float    Timestamp;          // when last updated
    uint8    Corroboration;      // independent confirming sources, capped
    FGuid    ReportedBy;         // provenance, for debugging and for barks
    uint8    RegionID;           // coarse nav-region containing LastKnownPos
    bool     bStale;             // past the staleness threshold
};
```

**Two fields deserve comment.**

`Corroboration` exists because two independent reports of the same thing should produce more
confident behaviour than one, and because the bark layer wants to say "confirmed" versus
"someone thinks". It is capped at 3; beyond that it stops mattering.

`ReportedBy` is provenance. It costs four bytes and it makes the debug question "why does this
squad think I'm there" answerable in one click. It also feeds barks: *"Yiannis saw him on the
lower road."* Provenance in dialogue is a large believability win for a tiny cost.

### 2.1 Belief sources and their characteristics

| Source | Initial confidence | Initial uncertainty | Decay rate | Notes |
|---|---|---|---|---|
| `Saw` | 0.95 | 0.5–3 m by range/light | slow | The gold standard |
| `Heard` | 0.6 | 8–25 m by sound type | medium | Direction better than distance |
| `Told` (shout) | 0.7 | source + 3 m | medium | Degraded by one relay |
| `Told` (radio) | 0.65 | source + 5 m | medium | Latency, may arrive stale |
| `Told` (runner) | 0.5 | source + 10 m | fast | Arrives minutes old |
| `Told` (bell) | 0.3 | region-wide | fast | "Something happened somewhere" |
| `Inferred` | 0.4 | large, growing | fast | From evidence: a body, an open door |
| `Guessed` | 0.25 | very large | very fast | Search behaviour's own hypothesis |
| `Directed` | varies | varies | varies | Director-injected; **must carry a fabricated plausible source** (§6.3) |

**⚠ load-bearing:** the *relative* ordering of these matters more than the absolute numbers.
Saw ≫ Heard > Told > Inferred > Guessed must hold after tuning.

---

## 3. Tiered knowledge

Three tiers. Information moves **upward only through communication events** and **downward only
through orders**. Never sideways by magic.

```
   FACTION KNOWLEDGE MAP  (L4)
   region-granular, minutes old, strategic
            ▲  radio / runner / telephone        │ orders, warnings
            │  (physical, breakable)             ▼
   SQUAD BELIEF  (L3)
   merged from members, seconds old, tactical
            ▲  shout / hand signal / visible act │ role assignment
            │  (range-limited, occludable)       ▼
   AGENT BELIEF  (L2)
   personal, current, sensory
            ▲  perception stimuli
            │
   THE WORLD
```

### 3.1 Agent → squad merge

On an agent forming or updating a belief, they attempt a **communication event**. It succeeds
if a channel is available:

- **Shout**: range 30–60 m depending on ambient noise, occluded by terrain, always available.
- **Hand signal**: requires line of sight and that the recipient is *looking*. Silent — which
  matters, because the player can hear shouts.
- **Visible act**: an agent conspicuously repositioning is itself information. Model this: a
  squadmate who sees a friend move to a flank infers the tactic even without a call.

The squad belief is a **weighted merge**, not a replacement. Two members with conflicting
beliefs produce a squad belief with higher uncertainty, not a coin flip — and the squad then
behaves *cautiously*, which reads exactly like a unit that isn't sure. This is free drama.

### 3.2 Squad → faction

Only through the comms network (Vol VII §3). Latency 5–120 seconds. Failure probability by
node health and coverage. This is the layer the player attacks.

### 3.3 What must never cross tiers

- Faction knowledge must never appear in an agent's belief without a transport event.
- An agent's belief must never be readable by another agent directly, only via a
  communication event.
- The Director's knowledge must never enter any tier except via §6.3.

---

## 4. Decay, uncertainty growth, and staleness

### 4.1 Confidence decay

```
Confidence(t) = Confidence₀ · exp(-λ_source · (t - t₀) · TerrainMultiplier)
```

`λ_source` per the table in §2.1. `TerrainMultiplier` from the nav region (§4.3).

### 4.2 Uncertainty growth

Uncertainty grows as a *reachability* radius, not a constant rate. The plausible region is
"everywhere the target could have got to", which on a steep island is heavily anisotropic —
fast along the road, slow up a terrace face.

```
Uncertainty(t) = Uncertainty₀ + ∫ v_plausible(region) · TerrainMultiplier dt
```

In practice, approximate it as a per-region expansion over the nav-region graph rather than a
Euclidean sphere. **This is the single best-value complexity in the document**: a belief that
expands along the road and stalls at the ridge line *looks* like a soldier who understands the
ground, with no behaviour code at all.

### 4.3 Terrain multipliers

Tunable per nav area class. Starting values:

| Area | Confidence decay ×| Uncertainty growth × | Rationale |
|---|---|---|---|
| Coast road, open | 0.6 | 0.7 | Long sightlines, few options |
| Harbour town streets | 1.0 | 1.2 | Corners, doors |
| Terraced olive slope | 1.4 | 1.5 | Broken ground, walls |
| Pine scrub / maquis | 2.0 | 2.0 | The partisan's ground |
| Ridge line / spine | 1.1 | 0.8 | Exposed, but few routes |
| Emery workings / interior | 1.8 | 2.5 | Tunnels, many exits |
| Open sea / anchorage | 0.4 | 0.5 | Nowhere to hide |

> **Why this table is the most important tuning surface in the game.** It encodes the first
> design pillar ("the ground is the enemy") directly into the AI's cognition. The player learns
> it experientially: *the scrub is where they lose you*. No tutorial required.

### 4.4 Staleness and what agents do about it

Past a threshold (confidence < 0.35 or age > 45s, personality-modulated), a belief is `bStale`.
Stale beliefs do **not** get deleted — they get *acted on differently*:

- The squad transitions from `Engaged` to `Search Pattern` (Vol V §3).
- Barks change register from confident callouts to uncertainty: *"He was on the wall a minute
  ago."* This is the single best bark category in the game (Vol X §2.3).
- Indirect fire (REDFOR artillery) will fire on a stale belief. This is historically correct,
  tactically plausible, and produces the wonderful player experience of watching shells land
  where you were ninety seconds ago.

---

## 5. The search model

When belief is stale, the squad must look for you. Search behaviour is where most games reveal
that their AI is a machine.

### 5.1 The representation

A **coarse probability distribution over nav regions**, not world-space cells. Regions are the
same graph used by the strategic layer (Vol VII §2) — typically 200–800 regions for the whole
island, each a few hundred square metres of navigable space.

```
SearchBelief : map<RegionID, float>   // sums to 1
```

**Update rules:**
- On belief becoming stale, seed the distribution from the last known position, weighted by
  reachability within the elapsed time.
- **Diffuse** each tick along the region adjacency graph, weighted by traversal cost. This is
  a discrete heat equation and is extremely cheap.
- On an agent observing a region and finding nothing, **zero that region and renormalise.**
  Negative evidence is the mechanism that produces intelligent-looking search.
- Regions the target could have left the island from (anchorages, the harbour) act as sinks,
  which correctly models "he may be gone".

### 5.2 The deliberate irrationality

A rational searcher distributes optimally and looks everywhere with the right frequency. It
looks like an algorithm.

**PARTISAN's squads commit.** On entering search, the squad samples *one* region from the
distribution — weighted, so it is usually a sensible choice, occasionally a bad one — declares
it in a bark, and searches it thoroughly before re-sampling. Minimum commit: 20–40 seconds.

> **Why.** This is Axiom 2 made concrete. A squad searching the wrong ravine confidently,
> having announced which ravine, while you watch from the correct one, is *the* signature
> PARTISAN moment. A squad correctly distributing its search effort produces no moment at all.

### 5.3 Search personality

`Curiosity` and `Discipline` modulate: high-discipline squads search their assigned region
methodically; low-discipline militia wander toward where they personally think you are. GREF
squads should be *worse* searchers and *better* guessers, because they know the island.

### 5.4 Evidence

Search generates `Inferred` beliefs from world evidence: bodies, blood, open doors, spent
casings, a warm brazier, a boat missing from a mooring. Each is a Smart Object with an
inspect behaviour and a bark. **Evidence is the cheapest believability content in the game** —
one interaction, one line, and the player feels tracked.

---

## 6. The two-brain rule

### 6.1 Statement

- **Director brain**: omniscient, no authority over agents.
- **Agent brains**: authoritative, sensory information only.
- One-directional channel between them, through §6.3 and only through §6.3.

### 6.2 Why it cannot be blurred

There is a persistent temptation, under schedule pressure, to let the Director set a target
directly "just this once, for the scripted ambush". The result is an agent acting on knowledge
with no perceptible cause. A player experiencing that **once** learns that the game cheats, and
thereafter attributes every legitimate AI success to cheating. The damage is retroactive and
permanent. There is no performance argument, no schedule argument, and no design argument that
survives this.

### 6.3 The fabricated-source protocol

When the Director needs a faction to know something for pacing reasons, it must:

1. Choose a **plausible physical source** that exists in the world: a goatherd on the ridge, a
   fishing boat that saw the landing, a telephone call from the customs house, a bell, a
   deserter.
2. **Instantiate or activate that source**, so it exists and is in principle perceivable and
   preventable by the player.
3. Inject the belief with `Source = Directed` but with `ReportedBy` set to the fabricated
   source, so the bark layer names it.
4. Log it, so any "that felt like cheating" playtest report can be checked against a record.

**The resulting property**: a player who investigates can always find the reason. A player who
does not investigate experiences an enemy that seems to know things, which is exactly the
desired feeling. Cheating that is retroactively explicable is not cheating.

### 6.4 Budget

The Director gets a **rate limit** on directed beliefs: at most one per N minutes, scaled by
difficulty, and never during a relax phase. Overuse produces an omniscient-feeling world even
with perfect sourcing.

---

## 7. Belief and combat behaviour

How belief feeds the things the player actually sees.

### 7.1 Aim

Belief uncertainty is a direct multiplier on aim error (Vol IV §5). An agent firing at a
`Guessed` belief produces a plausible-looking near-miss cluster. The player can *read the
impacts* and infer they have not been precisely located — a genuine information channel
delivered by a system rather than a UI element.

### 7.2 Indirect fire

REDFOR's mountain gun fires on the **faction-level** belief, which is minutes old. Historically
right and mechanically superb.

### 7.3 Grenades

Grenades target the belief, with the belief's uncertainty applied. **No exceptions, ever.** See
§1.

### 7.4 Movement

Assault routes are planned against the belief centroid. A squad flanking a position you left
is correct behaviour, not a bug, and must be barked so the player understands it was a
reasonable mistake rather than a pathing failure.

### 7.5 Cover selection

An agent takes cover from the *believed* threat direction. Beautifully, this means an agent
with a stale belief will take cover from the wrong direction and expose their back — a genuine,
earned, systemic reward for manoeuvre that no scripted system can replicate.

---

## 8. Failure modes and guards

| Failure | Symptom | Guard |
|---|---|---|
| Belief never decays | Enemies track you forever | Decay unit test; debug readout of oldest live belief |
| Belief decays too fast | Enemies are goldfish, no tension | Minimum search duration independent of confidence |
| Instant faction-wide propagation | Whole island alerted by one sighting | §3.2 transport with latency; no global writes |
| Belief centroid averaging | Two beliefs merge into a position nobody reported | Merge must pick, not average, when uncertainty is low |
| Search converges too well | Reads as an algorithm | §5.2 commitment; sample, don't optimise |
| Search never converges | Enemies wander stupidly | Diffusion rate cap; sinks at exits |
| Directed-belief overuse | World feels omniscient | §6.4 rate limit; Director log review |
| Uncertainty grows isotropically | Beliefs ignore terrain, looks wrong on a cliff | §4.2 region-graph expansion, not spheres |

---

## 9. Debug visualisation — build this in week one

**The Belief Visualiser** is the highest-leverage tool in the project. Specification:

- Every live belief drawn as a sphere at `LastKnownPos`, radius `PosUncertainty`.
- Colour by `Source` (green Saw, yellow Heard, blue Told, grey Inferred, red Directed).
- Opacity by `Confidence`.
- A label: observer name, age in seconds, corroboration count, `ReportedBy`.
- Lines from observer to belief.
- Toggle: agent-tier / squad-tier / faction-tier.
- The search distribution rendered as region-coloured heat over the nav graph.
- A time-scrub mode reading from Visual Logger, so you can replay "why did they do that".

Without this you are debugging blind, and belief bugs are invisible in normal play — they
present as "the AI felt weird", which is unactionable. **Estimate: one to two weeks. It pays
back within a month.**

---

## 10. Implementation order

1. `FBelief`, `UBeliefSubsystem`, the chokepoint API. Nothing else. `[small]`
2. The visualiser. `[medium]`
3. Sight stimuli → belief. Decay. `[small]`
4. Aim error coupled to uncertainty. `[small]` — *this is where it first feels different*
5. Hearing stimuli → belief. `[medium]`
6. Shout propagation, agent → squad merge. `[medium]`
7. Region graph, search distribution, negative evidence. `[medium]`
8. Committed search with barks. `[small]` — *this is where it first feels human*
9. Radio/runner/bell, faction tier. `[medium]`
10. Directed beliefs with fabricated sources. `[small]`

**Steps 1–4 are Phase 0 and are the proof of the whole thesis.** If step 4 does not visibly
change how the game feels, something is wrong and the rest of the compendium is built on sand.
