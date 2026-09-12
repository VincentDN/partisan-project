# Volume VII — Faction and Strategic AI

*Three brains that must be distinguishable with the art turned off.*

---

## 1. The identification test

> **A player watching an unlabelled squad move and fight, with uniforms replaced by grey
> capsules and voice disabled, should identify the faction correctly better than 80% of the
> time within thirty seconds.**

If that test fails, this volume has failed, and no amount of uniform work will fix it. The
faction differences must be in *behaviour*: movement silhouette, terrain competence, tactic
selection, morale response, and resource discipline.

**The three signatures, compressed:**

| | REDFOR (garrison) | GREF (militia) | BLUFOR (relief) |
|---|---|---|---|
| Movement | Column, road-bound, unhurried | Dispersed, individual lines, off-road | Fire-team wedges, bounding, textbook |
| Terrain | Good on road, helpless above treeline | Excellent everywhere | Poor everywhere, improving slowly |
| Tactics | Static defence, indirect fire, flares | Ambush, harass, fade | Cordon, methodical advance, demand surrender |
| Morale | Low start, disciplined decay, surrenders | High start, brittle under attrition, routs | High, stable, rarely breaks |
| Resources | Rationed, artillery, no resupply | Improvised, pooled, scavenged | Abundant, naval support |
| On losing | Holds because it cannot leave | Disperses because it can | Withdraws in order |
| Information | Fixed radio net, cuttable | Runners, bells, total local coverage | Own net + naval, poor local knowledge |

---

## 2. The faction command layer (L4)

One per faction. Ticks at 2–10 s. Owns:

```cpp
class UFactionCommand
{
    EFaction              Faction;
    FKnowledgeMap         Knowledge;      // region-granular beliefs, minutes old
    TArray<FGuid>         Squads;
    TMap<FGuid,FMission>  Assignments;
    FCommsNetwork         Comms;          // §3
    FStrategicPosture     Posture;        // §5
    TArray<FAdaptation>   Adaptations;    // §5.3
    FResourcePool         Resources;      // reinforcements, ammunition, artillery rounds
    TArray<FNamedOfficer> Officers;       // §5.4
};
```

### 2.1 The knowledge map

Region-granular, **not** position-granular. The faction knows "enemy activity reported in the
upper terraces, forty minutes ago, two reports". It does not know coordinates.

Entries decay far faster than agent beliefs and are explicitly timestamped, because the
strategic layer's *staleness* is the point: a garrison commander acting on forty-minute-old
information is historically accurate and mechanically interesting.

### 2.2 Missions

L4 assigns squads a mission, not a tactic. The squad chooses its own tactic within the mission.

| Mission | Meaning | Constrains squad tactics to |
|---|---|---|
| `Hold(region)` | Defend | Hold, SuppressAndWait, HoldCutPoint, FlareAndHold |
| `Patrol(route)` | Presence and detection | RoadPatrol, HoldPosition |
| `Sweep(region)` | Find and clear | TownSweep, SearchPattern, BoundForward |
| `Reinforce(squad)` | Move to support | Movement tactics, then inherits |
| `Withdraw(region)` | Give ground | BoundBack, WithdrawToAnchor |
| `Ambush(region)` | GREF only | Ambush, Harass |
| `Screen(axis)` | Delay without committing | Harass, Fade |
| `Cordon(region)` | BLUFOR only | Cordon, AdvanceByFireTeam |

> **Why two layers of decision.** Missions give the player a *strategic* opponent whose
> intentions can be read across the campaign; tactics give a *tactical* opponent whose
> intentions can be read across a minute. Both are needed. Collapsing them into one layer loses
> the campaign-scale read, which is where the second act's drama lives.

---

## 3. The communications network

**The best system in this compendium that no other shooter has, and it comes free with the
constraint sheet.**

### 3.1 The channels

| Channel | Range | Latency | Failure | Player counter |
|---|---|---|---|---|
| Shout | 30–60 m, occluded | instant | Noise, distance | Suppressing fire, distance |
| Hand signal | LOS, requires attention | instant | Not looking | None (and that is fine) |
| Field telephone | Wired, fixed posts | 5–15 s | **Cut the wire** | Cut the wire |
| VHF handheld (off the boats) | 3–8 km, terrain-blocked | 5–20 s | Terrain shadow, battery | Destroy the set, hold the ridge |
| Mobile phone | Coverage-dependent | 10–40 s | **Coverage holes**, mast | Destroy the mast, fight in a hole |
| Runner | Walking speed | 2–15 min | Killable, gets lost | Kill the runner |
| Church bell | Island-wide | ~1 min | Requires reaching a church | Hold the churches |
| Signal lamp / flare | LOS to the ridge | instant | Requires LOS and night | Hold the signal station |

### 3.2 The network as a graph

Nodes (masts, telephone posts, the signal station, radio sets, churches) with edges. Each node
has health and can be destroyed or occupied. The network's **connectivity determines whether
squad beliefs reach L4 and whether L4's orders reach squads.**

**Consequences that emerge without being authored:**
- Cutting the telephone line to the customs house means the harbour garrison acts on its own
  stale picture and does not get reinforced.
- Holding the signal station denies REDFOR its fastest channel and gives it to GREF.
- A mobile coverage hole in the north-shore anchorages is *why the smuggling route works*.
- REDFOR being six months unpaid means batteries and spares are scarce, which can be modelled
  as node degradation over the campaign.

### 3.3 Degraded operation

When a squad loses contact with L4:
- It keeps executing its last mission, indefinitely, on stale information. **This is the single
  most realistic and most useful AI behaviour in the game.**
- Morale drains slowly (Vol IV §3.2).
- It will send a runner if it has one to spare.
- Its beliefs stop being corroborated, so its uncertainty grows faster.

A player who cuts communications and then walks past a garrison position still watching an
approach that no longer matters has experienced something almost no shooter delivers.

### 3.4 Interception

GREF can listen: captured VHF sets, and the simple fact that the town knows everything.
Represent as a slow leak of REDFOR knowledge into the GREF map with latency and partial
corruption. Historically right — the occupied population is the intelligence service.

---

## 4. A-Life, honestly scoped

S.T.A.L.K.E.R. is the warning (Vol I §3.4): offscreen simulation is the most over-promised
feature in game AI. PARTISAN's version is deliberately coarse and is described honestly here so
it does not inflate later.

### 4.1 Three fidelity tiers

| Tier | Range | Representation | Cost |
|---|---|---|---|
| **Full** | Near player, in combat | Full actors, StateTree, animation, EQS | High |
| **Mass** | Visible but distant | Mass entities, simplified StateTree, no EQS, LOD animation | Low |
| **Ledger** | Offscreen | **Not simulated.** A record: squad, region, mission, strength, morale, progressing along a schedule | ~0 |

### 4.2 The ledger

Offscreen squads are rows in a table, advanced once a second:
- Progress along their mission (moving between regions at a rate, executing a hold, patrolling).
- Resolve offscreen engagements **abstractly**: two ledger squads meeting roll a quick
  strength/morale comparison and produce casualties and a bark-worthy report.
- Generate reports into the faction knowledge map with appropriate latency.

**Promotion** to Mass or Full happens on approach, instantiating actors consistent with the
ledger state — a squad that lost two men offscreen spawns with two men missing and lowered
morale.

### 4.3 What this buys, and what it does not

**Buys:** an island that appears to be doing things while you are elsewhere. Patrols that are
somewhere plausible rather than where you left them. A campaign where your actions in the north
plausibly affect the south. Reports arriving over the comms network about events you did not
see.

**Does not buy:** genuine emergent narrative from full simulation. Do not claim otherwise, to
players or to yourself. The ledger is a **plausibility engine**, not a world simulation, and
that is the correct scope for one person.

### 4.4 Civilians

The harbour town and the villages have a population, run in Mass over Smart Objects and
ZoneGraph. They are:
- An information source for GREF (§3.4) and a liability for REDFOR.
- Morale-relevant: harming civilians has consequences through squad reaction, not a score.
- Atmosphere, which on an island whose whole story is about who the island belongs to is not
  decoration but theme.

---

## 5. Strategic posture and adaptation

### 5.1 Posture

Each faction holds a posture that changes slowly over campaign time.

**REDFOR postures:** `Routine` → `Alerted` → `Consolidating` (pulls back to the harbour and the
customs house) → `Besieged` (holds only the harbour) → `Negotiating` → `Surrendered`.

**GREF postures:** `Conspiring` → `Rising` → `Holding` (the five-month republic) → `Contested`
(BLUFOR arrives) → `Deciding` (the second act).

**BLUFOR postures:** `Approaching` → `Landed` → `Accepting` (taking the surrender) →
`Administering` → `Enforcing`.

Posture changes are **events the player witnesses**: a withdrawal from the outer positions, a
flag raised, a ship on the horizon, a proclamation nailed to a door.

### 5.2 What posture controls

Mission mix, resource allocation, morale modifiers, rally availability, and — importantly —
**willingness to negotiate**, which is the mechanical spine of the second act.

### 5.3 Counter-adaptation

The MGS V lift, slowed and telegraphed.

| Player pattern | REDFOR adaptation | Telegraph |
|---|---|---|
| Repeated night attacks | Standing flare watch, more `FlareAndHold` | A flare crate delivered; sentries with flare pistols visible |
| Repeated ambush at one cut point | That point fortified, others thinned | Sandbags appear over days; a work party is visible |
| Repeated attacks on the road | Patrols move off-road where possible, slowly and badly | Visible discomfort; barks about it |
| Sniping officers | Officers remove insignia | **Visible.** You can no longer identify the leader |
| Cutting comms | Runners become routine; a bell schedule | You see runners on the road |
| Heavy use of one approach | An observation post placed on it | Construction, visible |

**Rules for every adaptation, without exception:**
1. It takes **days of campaign time**, not minutes.
2. It is **constructed in the world**, visibly, before it is effective.
3. It is **counterable** by a different approach.
4. It is **announced** somewhere the player can find — a bark, an intercepted message, a
   villager.

> **The officer-insignia adaptation is the best one and should be built first.** It is
> mechanically meaningful (leader-targeting becomes harder), thematically perfect (an army
> learning it is being hunted), emotionally complicated (they are frightened of you), and it is
> a *removal* of information, which is cheaper than adding content.

### 5.4 Named officers — the Nemesis principle, cheaply

Do not build a Nemesis system. Build the 10% of it that produces 80% of the value.

- Each faction has 4–8 named officers, each commanding a sector.
- They carry a small memory: engagements survived, tactics the player used against them,
  casualties taken, and a disposition (cautious / vengeful / demoralised / respectful).
- That memory modulates their sector's posture, tactic weights, and **their dialogue**.
- If one survives an ambush, his sector thereafter avoids that approach, and he says so.
- If the player captures rather than kills him, he exists later — which the second act needs.

**Cost:** a struct and a handful of hooks. **Value:** the player has *opponents* rather than
opposition, which is the strongest available route to "it felt like playing against people".

---

## 6. Resources and reinforcement

### 6.1 REDFOR's predicament, as numbers

The garrison is understrength, unpaid, and cannot be reinforced (the relief column failed to
sail — this is the premise). Model it:

- **Fixed manpower.** Every REDFOR casualty is permanent for the campaign. The player can
  *count*.
- **Finite ammunition**, tracked at the faction level, distributed to squads by posture.
  Depletion is visible as rate-of-fire discipline across the whole faction.
- **Finite artillery rounds.** Perhaps thirty for the campaign. Each one is an event.
- **No medical chain worth the name**, so wounded become non-combatants permanently.

> **This is a strategy layer hiding inside a shooter, and it is nearly free.** A player who
> understands that there are ninety-one Ottoman soldiers on this island and that each one they
> kill or capture is gone forever is playing a different, better game than one fighting
> respawning enemies. It also, crucially, makes *not* killing them a coherent strategy, which
> pillar three requires.

### 6.2 GREF's predicament

- **Manpower grows** with posture and with victories: villages send men. And it *falls*
  permanently with casualties, because these are named neighbours.
- **Ammunition is scavenged**, primarily from REDFOR casualties. This closes a beautiful loop:
  killing the garrison arms you, but the garrison is finite, so a war of attrition is a war you
  can literally run out of.
- **Boats** are the strategic resource. Losing the fishing fleet is worse than losing men.

### 6.3 BLUFOR

Effectively unlimited, arriving on a schedule the player cannot affect. That asymmetry is the
point of act two: the militia's carefully hoarded scarcity meets an organisation for which
scarcity is not a concept.

---

## 7. The second act, mechanically

Pillar four ("liberation is not the end") needs AI support, not just narrative.

When BLUFOR lands and the postures shift:

1. **GREF squads gain a new state**: `Uncertain`. They will not fire on BLUFOR without an
   order, they bark disagreement, and their cohesion depends on whether the player's decisions
   match their individual dispositions.
2. **Dispositions become visible.** Each named GREF member has a stance on annexation. That
   stance was established through fifteen hours of barks and behaviour, so it lands.
3. **BLUFOR's restraint behaviour** (`DemandSurrender`, hesitation against unidentified targets,
   `Cordon` over assault) means that if it comes to a fight, they are visibly reluctant. **The
   AI does the emotional work.**
4. **REDFOR may still be on the island**, now a third party to a two-way problem.
5. Morale, for the first time, runs on the player's own side, against the player's own
   decisions.

> **This is the payoff for every system in the compendium.** Morale, disposition, barks,
> restraint and named characters are all built for act one's combat, and act two reuses every
> one of them for something the player does not expect. That is what makes the investment
> proportionate.

---

## 8. Debug requirements

The **Strategic Overlay**:
- Region graph coloured by faction control and by each influence map
- Every squad as a token with mission, strength, morale, and comms status
- The comms network graph with node health and live message traffic
- Each faction's knowledge map, with age shading
- Posture, resources, and adaptation progress per faction
- The ledger, as a scrollable table
- A campaign event log

---

## 9. Implementation order

1. Faction command object, missions, squad assignment. `[medium]`
2. Region-granular knowledge map with decay. `[small]`
3. Comms network graph, two channels (shout already exists; add radio). `[medium]`
4. Degraded operation on comms loss. `[small]` — *very high value*
5. Strategic overlay debug tool. `[medium]`
6. Postures and posture transitions. `[medium]`
7. Faction resource pools, finite REDFOR manpower and ammunition. `[medium]`
8. Named officers with memory. `[small]` — *very high value*
9. The ledger tier and promotion/demotion. `[large]`
10. Remaining comms channels. `[medium]`
11. Counter-adaptations, starting with officer insignia. `[medium]`
12. Civilians in Mass. `[large]`
13. Act two states and dispositions. `[large]`
