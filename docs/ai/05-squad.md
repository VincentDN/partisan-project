# Volume V — The Squad

*Axiom 3: the unit is the character. This is where perceived intelligence lives, and where
six of every ten hours of AI work should go.*

---

## 1. The argument for the squad layer

Players do not narrate agents. They narrate units. Every canonical "smart AI" memory in the
historical corpus — F.E.A.R.'s replicas, Halo's Covenant, Killzone's Helghast, ArmA's fire
teams — is a *squad* memory. Individual sophistication above a fairly low bar has sharply
diminishing returns; squad coordination has almost none.

**Budget rule.** If there are ten weeks of AI engineering available, six belong here. If there
is a choice between a more sophisticated individual and a better-coordinated squad, the squad
wins every time.

---

## 2. The squad object

```cpp
class USquad
{
    FGuid            SquadID;
    EFaction         Faction;
    TArray<FGuid>    Members;          // living
    TArray<FGuid>    Casualties;       // for morale and barks
    FGuid            Leader;           // cohesion anchor
    FBelief          SquadBelief;      // merged, Vol III §3.1
    FSearchDist      SearchBelief;     // Vol III §5
    FName            CurrentTactic;
    float            TacticStartTime;  // for minimum commit
    TMap<FGuid,ERole> Roles;
    FPositionPool    ReservedPositions;
    float            SharedAmmo;       // rounds, pooled — scarcity pillar
    uint8            GrenadeBudget;
    float            Cohesion;         // 0..1
    FBarkBudget      Barks;
    FGuid            ParentCommand;    // faction-level assignment
    FName            Mission;          // from L4
};
```

Ticks at 0.25–1s, LOD-scaled. Persists through member deaths. Dissolves only when empty, or
merges into an adjacent squad below 2 members (a real behaviour: remnants join up).

### 2.1 Leadership succession

On leader death: a 3–8 second **gap** during which cohesion drops, no tactic changes are
permitted, and the squad barks confusion. Then the highest-`Discipline` survivor assumes
command, announces it, and cohesion partially restores.

> **Why the gap.** The pause is the entire dramatic payload of killing a leader. Instant
> succession makes leader-targeting pointless; a visible, audible period of a squad not knowing
> who is in charge makes it the most valuable shot in the game. **⚠ load-bearing.**

### 2.2 Cohesion

```
Cohesion = clamp01(
      0.4 · LeaderPresence          // unbroken leader within 25 m
    + 0.3 · Proximity               // members within mutual support range
    + 0.2 · CommsHealth             // can they hear each other
    + 0.1 · AvgMorale
)
```

Cohesion does **not** silently penalise accuracy. It degrades *execution*:

| Cohesion | Execution |
|---|---|
| > 0.8 | Tactics execute as authored: timing tight, bounds synchronised |
| 0.6–0.8 | Timing slips 0.5–1.5s. One member may be a beat late |
| 0.4–0.6 | One member may not receive the order at all and continues the previous role |
| < 0.4 | Tactic selection restricted to `Withdraw`, `Hold`, `Suppress`. No flanks |

> **Why degrade execution rather than stats.** A squad with poor cohesion executing a good plan
> badly *looks like a real unit under stress*. A squad with a hidden accuracy debuff looks like
> nothing at all. This is the single clearest example in the compendium of the general
> principle: **model the cause, show the symptom, never apply an invisible modifier.**

---

## 3. The tactic catalogue

Eighteen tactics. Each is a data asset with: preconditions, role slots, an authored ground
shape, abort conditions, a minimum commit time, a bark set, and a faction availability mask.

### 3.1 Universal tactics

| Tactic | Preconditions | Shape | Commit |
|---|---|---|---|
| `FixAndFlank` | ≥4 effective, flank route in EQS, confidence >0.6, cohesion >0.7 | Base of fire holds and *sustains*; flank element moves wide and low; assault on a called signal | 20s |
| `BoundForward` | Advantage, suppression <0.4, morale Steady | Alternating pairs; one element always firing | 12s |
| `BoundBack` | Casualties ≥1 or morale Shaken | Same, reversed, toward the cohesion anchor | 12s |
| `SuppressAndWait` | Ammo adequate, no flank route, or awaiting support | Pin, call for help, hold. **The default** | 15s |
| `SuppressAndCall` | As above + comms available | Same, plus a radio request that actually reaches L4 | 15s |
| `SearchPattern` | Belief stale (Vol III §4.4) | Committed search of one sampled region | 25s |
| `HoldPosition` | Ordered, or no contact | Static, mutually supporting arcs, sentry rotation | — |
| `WithdrawToAnchor` | Leader dead, cohesion <0.4, or morale Wavering | Disordered movement toward the anchor. Not a clean bound | 20s |
| `Surrender` | Isolated, ammo <10%, morale < floor, offer available | Squad-wide. Rare and enormous when it happens | — |
| `Regroup` | Post-engagement, cohesion low | Consolidate, redistribute ammo, treat wounded, re-report | 30s |
| `Rally` | Leader alive, squad Wavering, leader has a rally available | Leader moves to the squad, animation, morale spike | 10s |
| `CasualtyEvacuation` | Wounded member, Loyalty threshold met | Two members break off to drag. **Powerful and costly** | 20s |

### 3.2 REDFOR-specific

| Tactic | Notes |
|---|---|
| `HoldCutPoint` | Static defence of one of the four road cut points. Mutually supporting, uphill-facing, pre-registered artillery |
| `RoadPatrol` | Movement in formation along the road, with a point man and rear security. **The silhouette of the garrison** |
| `CallIndirect` | Requests the mountain gun onto the faction-level (stale) belief. Long delay, loud, terrifying |
| `TownSweep` | Building-by-building in the harbour town. Slow, methodical, civilian-aware |
| `FlareAndHold` | Night only. Illuminate and defend rather than pursue. Correct doctrine for an outnumbered garrison |

### 3.3 GREF-specific

| Tactic | Notes |
|---|---|
| `Ambush` | Prepared position above the road, on a predicted route. Requires local knowledge. The militia's signature |
| `Fade` | Break contact uphill and disperse. **Refuses the fight.** The most important GREF tactic and the hardest to make satisfying for the player |
| `Harass` | Long-range, low-volume fire to fix a garrison element without committing |
| `Infiltrate` | Approach through terraces and scrub using GREF-only nav links |
| `BellAlarm` | Send a runner to a church. Island-wide, imprecise alert. Thematically perfect |

### 3.4 BLUFOR-specific

| Tactic | Notes |
|---|---|
| `Cordon` | Slow, methodical encirclement. Numbers-dependent. Reads as inevitability |
| `DemandSurrender` | Pause, call, timer, then assault. The restraint behaviour that carries pillar four |
| `CallNavalGunfire` | Via a spotter the player can remove. Enormous, slow, Director-mediated |
| `AdvanceByFireTeam` | Textbook, drilled, and *visibly better* than either other faction |

### 3.5 The authored ground shape

Each tactic carries a **shape**: a parameterised spatial arrangement, not just a set of roles.
`FixAndFlank` specifies that the base of fire is 40–120 m from the objective with a clear arc,
the flank element travels at least 60 m laterally out of the objective's belief cone, and the
assault comes from within 45° of perpendicular to the base of fire's axis.

> **Why shapes matter.** Roles without shapes produce squads that are technically coordinated
> and visually indistinguishable from four men standing near each other. The shape is what the
> player *sees*. It is also what makes the tactic counterable, which is what makes it fun.

---

## 4. Tactic selection

### 4.1 Scored selection

Every squad tick, score all available tactics:

```
Score(T) = Precondition(T) ? (
      W_situation   · SituationFit(T)        // belief, terrain, range, numbers
    + W_personality · PersonalityFit(T)      // squad's mean Aggression/Caution/Discipline
    + W_morale      · MoraleFit(T)
    + W_resource    · ResourceFit(T)         // ammo, grenades, cohesion
    + W_mission     · MissionFit(T)          // L4 assignment alignment
    + W_variety     · VarietyBonus(T)        // recently-unused tactics get a nudge
    + Noise(σ)                               // small, personality-scaled
) : -INF
```

### 4.2 The two mandatory guards

**⚠ These are the difference between "feels like a squad" and "feels like a computer."**

1. **Minimum commit time.** Once selected, a tactic is held for `T.MinCommit` regardless of
   score changes, except on abort conditions (§4.3). Typical 12–25s.
2. **Hysteresis.** After the commit window, a competing tactic must beat the current one by a
   margin (0.15 of the score range) to displace it.

> **Why, at length.** Utility systems without these re-derive the optimal action every tick.
> Since the situation changes continuously, so does the optimum, and the squad flickers between
> good decisions. Players perceive this as twitchy and machine-like — and worse, it makes the
> squad *unbaitable*, which removes the player's primary source of feeling clever. A committed
> squad can be lured into a bad flank. An optimal squad cannot. **The ability to be outsmarted
> is a feature that must be deliberately engineered in.**

### 4.3 Abort conditions

Override the commit timer:
- Leader killed (forces the succession gap, §2.1).
- Cohesion falls below 0.4.
- Two or more members `Broken` within 5 seconds.
- The tactic's own spatial preconditions become impossible (flank route destroyed, cover
  collapsed).
- Direct order from L4.
- Self-preservation cascade: 50%+ of members in override (Vol IV §7).

### 4.4 Variety and repetition

The `VarietyBonus` prevents the squad from selecting the same tactic three engagements running
purely because it scores well. Small nudge, meaningful effect on how the game reads over an
hour. Track per-squad, decay over minutes.

---

## 5. Roles and position reservation

### 5.1 Roles

| Role | Behaviour | Typical profile fit |
|---|---|---|
| `Leader` | Directs, rallies, positions centrally, calls the barks | High Discipline |
| `BaseOfFire` | Sustained suppression from a static position. Ammo-hungry | High Caution, high AimSkill |
| `FlankElement` | Movement under cover to the flanking position | High Fitness, high Aggression |
| `Assault` | Closes and clears on the signal | High Aggression, low Caution |
| `Security` | Watches the unengaged arc. Boring and essential | Any; never assign a lone Conscript |
| `Grenadier` | Holds the squad grenade budget | Medium everything |
| `Casualty` | Wounded; a liability and a morale sink | — |
| `Medic`/`Carrier` | Assigned dynamically on `CasualtyEvacuation` | High Loyalty |

### 5.2 Allocation

Hungarian-style assignment over a cost matrix of (agent × role), costs derived from profile
fit, current position, wounds, and ammunition. Re-allocated only on **death, wounding, tactic
change, or role impossibility** — never per tick, or you get role churn, which is tactic
flicker's cousin.

### 5.3 Position reservation

Tactical positions (from Vol VI §3) are drawn from a **squad-scoped exclusive pool**:

- An agent claims a position; the claim is exclusive and expires on arrival + occupancy, or on
  timeout if they cannot reach it.
- A second agent cannot claim a claimed position or one within `MinSeparation` (2.5 m) of one.
- Claims are released on death, role change, or tactic change.

Without this you get the **cover conga line** (Vol I §3.7): four men queueing behind the same
wall, which is one of the most visible and most common AI failures in the genre and takes
about a day to prevent.

### 5.4 Mutual support

A position is only valid for `BaseOfFire` if at least one other squad position can cover its
approach. Cheap check against the precomputed regional visibility (Vol VI §7). Produces
positions that *look* deliberate.

---

## 6. Squad resources — the scarcity pillar at the tactical layer

### 6.1 Pooled ammunition

The squad holds a shared pool. Individual agents draw from it. When it runs low:

1. Barks change: individual agents announce their own state, then the leader announces the
   squad's.
2. `SuppressAndWait` and `BaseOfFire` become unaffordable — a base of fire costs rounds and the
   scoring function must know that.
3. `Regroup` scores higher, and the squad redistributes visibly (an animation, an exchange).
4. GREF squads will break contact (`Fade`) rather than fight on empty. **REDFOR will not**,
   because they cannot; they hold the road because they have nowhere else to go. This single
   asymmetry does an enormous amount of characterisation.

### 6.2 Grenade budget

Squad-level, small (1–3), with a shared cooldown. Prevents the four-simultaneous-grenades
failure and makes each grenade an event.

### 6.3 The support token

At most one squad in a local area may be executing a `FlankElement` movement at any time,
arbitrated at L4. Prevents the "everyone flanks simultaneously and the player is surrounded
from four directions with no warning" failure, which is both unfair and unreadable.

---

## 7. Loyalty, disobedience, and character

The `Loyalty` override is GREF's defining behaviour and should be tuned to be *charming*, not
infuriating.

**Rule:** when a squadmate goes down within a `Loyalty`-scaled radius, an agent rolls against
`Loyalty × (1 - Discipline)`. On success they abandon their role to reach the casualty,
announcing it.

| Faction | Typical outcome |
|---|---|
| GREF | Frequent. Two men break a perfectly good flank to drag a neighbour out. This is who they are |
| REDFOR | Occasional. Discipline usually holds, which is its own sad characterisation |
| BLUFOR | Procedural. They have a *drill* for it, executed cleanly, which is the third flavour |

> **Design note.** Three factions, one mechanic, three completely different readings, achieved
> with two floats. This is the cheapest characterisation in the entire document and it is worth
> hunting for more examples of the same pattern.

---

## 8. Multi-squad coordination

Above the squad and below the faction. Kept deliberately thin.

- **Adjacency awareness**: squads within mutual support range share belief more readily (they
  can shout to each other) and will not both flank (§6.3).
- **Sequencing**: L4 may assign a `Fix` mission to one squad and a `Flank` to another. The
  fixing squad's tactic choice is constrained accordingly.
- **No multi-squad tactic objects.** Resist this. It is a large system for a small gain, and
  the same effect emerges from L4 mission assignment plus squad-local scoring.

---

## 9. Squad barks — the readable output

Full treatment in Vol X §2. Stated here because the bark is generated *by this layer*, at
*these moments*:

| Moment | Bark category | Must contain |
|---|---|---|
| Tactic selected | Tactic call | The intent, plainly, in one clause |
| Role assigned | Role call | A name and a task |
| Belief created / updated | Contact / Update | Direction + landmark |
| Belief stale | Stale | Explicit uncertainty |
| Commit window expiring on a failed tactic | Frustration | Character |
| Abort | Abort | The reason, if the reason is knowable |
| Leader killed | Confusion → succession | The gap (§2.1) is *audible* |
| Ammo threshold | Resource | The number |
| Member Broken | Reaction | Name + reaction, faction-specific |

**One speaker per squad at a time.** Arbitration and budget are in Vol X §2.4.

---

## 10. Debug requirements

The **Squad Overlay** is the second tool to build after the Belief Visualiser:

- Current tactic + time remaining on commit + top three competing scores with their components
- Role assignments drawn as labels on each member
- Reserved positions drawn, with claimant
- The tactic's authored shape drawn (base-of-fire arc, flank corridor, assault vector)
- Cohesion, pooled ammo, grenade budget, bark budget
- A rolling log of the last ten tactic decisions with full score breakdowns

Without the score breakdown, tuning the utility weights is guesswork. With it, it is an
afternoon.

---

## 11. Implementation order

1. Squad object, membership, leader, succession gap. `[small]`
2. Belief merge from members. `[small]`
3. Four tactics: `SuppressAndWait`, `HoldPosition`, `BoundBack`, `SearchPattern`. `[medium]`
4. Scored selection **with commit timer and hysteresis from day one**. `[medium]`
5. Squad Overlay debug tool. `[medium]`
6. Role allocation + position reservation. `[medium]`
7. Bark generation hooks at the nine moments in §9. `[small]`
8. `FixAndFlank` with authored shape. `[medium]` — *the first tactic that will impress anyone*
9. Cohesion and execution degradation. `[small]`
10. Pooled resources. `[small]`
11. The remaining universal tactics. `[medium]`
12. Faction-specific tactic sets. `[medium]`
13. Loyalty override, casualty evacuation. `[small]`
14. Multi-squad tokens. `[small]`

**Step 8 is the demo.** A squad that fixes you with sustained fire while a named element works
around your flank, announcing each step, and that can be baited into doing it wrong, is the
single clip that proves this project to anyone.
