# Volume I — The Historical Corpus

*Forty-odd titles. What each actually did, what it cost, what PARTISAN takes.*

The brief for this project was to bring back the greatest AI in video game history. That is
only a meaningful instruction if you know, specifically and mechanically, what each of those
AIs did — because almost all of them are misremembered. The commonly repeated account of
F.E.A.R. is wrong. The commonly repeated account of Halo is wrong. The commonly repeated
account of Alien: Isolation is roughly right and is therefore the most useful of the three.

This volume is the correction pass.

---

## 1. The seven eras

A structural framing, because the canon is not a list, it is a sequence of problems being
solved and then forgotten.

| Era | Years | The problem being solved | Representative |
|---|---|---|---|
| **Pattern** | 1978–1990 | Making non-random enemies with no CPU | *Space Invaders*, *Pac-Man*, *Galaga* |
| **Script** | 1991–1997 | Making enemies that appear to have plans | *Doom*, *Half-Life* precursors, *Dark Forces* |
| **Simulation** | 1996–2001 | Making agents with internal state | *Thief*, *Half-Life*, *Close Combat*, *Quake III* bots |
| **Coordination** | 2001–2007 | Making groups that act like groups | *Halo*, *F.E.A.R.*, *Brothers in Arms*, *SWAT 4* |
| **Systemic** | 2007–2012 | Making agents that react to unauthored events | *Far Cry 2*, *S.T.A.L.K.E.R.*, *Left 4 Dead* |
| **Curation** | 2008–2016 | Making the *experience* intelligent, not the agent | *Left 4 Dead*, *Alien: Isolation*, *Shadow of Mordor* |
| **Scale / ML** | 2016– | Making many agents cheap, and learning policies | *Mass*-style ECS crowds, RL research, *MGS V* adaptation |

> **Why this matters for PARTISAN.** The design in this compendium is deliberately an
> **era-4/6 hybrid**: coordination-era squad behaviour under a curation-era director. It
> mostly skips era 7. That is not conservatism, it is the observation that no shipped game
> has yet combined coordination-era legibility with curation-era pacing *and* a scarcity
> economy, and that gap is worth more than chasing ML.

---

## 2. The four load-bearing ancestors

Four titles carry most of this design. They get full treatment. Everything else in §3 is
supporting evidence.

---

### 2.1 F.E.A.R. (Monolith, 2005) — the legibility ancestor

**The misremembering.** "F.E.A.R.'s AI was smart because it used GOAP." This is the single
most repeated and least useful claim in game AI discourse. GOAP is a *planner architecture*;
it decides how an agent selects actions from a goal and a world state. It did not, by itself,
make F.E.A.R.'s replicas feel intelligent. Jeff Orkin, who built it, has been consistent that
the perceived intelligence came from elsewhere.

**What actually produced the effect, in descending order of contribution:**

1. **The barks.** Replicas announced their intentions, specifically and directionally, before
   acting. "He's going for the stairs." "Flanking left." "I've lost him." The player's brain
   assembled a model of a thinking opponent out of *narrated intent*, then attributed the
   resulting behaviour to that model. Turn the dialogue off and the same behaviour reads as
   ordinary.
2. **Squad-level coordination behaviours.** Coordination was not emergent from individual
   planners. It was a separate layer that assigned squad behaviours (advance-cover, get-to-
   cover, orderly-advance, blitz) across agents. The squad was the planning unit.
3. **Level geometry authored for the behaviour.** F.E.A.R.'s office spaces are dense with
   overturnable tables, ducking-height cover, and multiple parallel routes. The AI looked
   clever because the spaces were built so that its limited vocabulary always had a good move
   available. **This is level design doing AI work and it is enormously underrated.**
4. **Animation.** Vaulting, sliding, kicking cover over. Motion that reads as decisive.
5. GOAP itself, which mainly bought *authoring flexibility* for the developers, not
   intelligence for the player.

**Cost.** A full GOAP implementation plus a squad behaviour layer plus a bark system plus
bespoke level geometry. Team-scale.

**PARTISAN takes:** the bark-as-plan-UI principle (Vol X §2), squad-as-planning-unit (Vol V),
and the level-geometry insight (Vol VI §7 — the terraces *are* F.E.A.R.'s office cubicles,
which is a genuinely lucky accident of the setting).

**PARTISAN rejects:** GOAP. `REJECT`. A hand-authored scored tactic set of 12–18 entries
covers the behaviour space at a fraction of the implementation and debugging cost, and is
vastly more authorable by one person. Revisit only if the authored set demonstrably runs dry,
which it will not at this scope. See Vol II §3.4 for the full argument.

---

### 2.2 Halo: Combat Evolved (Bungie, 2001) — the thresholds ancestor

**The misremembering.** "Halo's AI was smart." Halo's AI was *readable*, *emotionally
expressive*, and *tuned within an inch of its life*. Bungie's own framing — the illusion of
intelligence — is the honest one and it is the intellectual foundation of Axiom 1.

**Mechanisms worth taking:**

- **Behaviour selection by prioritised impulses over a DAG**, rather than a strict tree. An
  agent has many possible behaviours with dynamic priorities; the highest wins. This is
  closer to **utility AI** than to behaviour trees and it is the right mental model for
  PARTISAN's individual layer even though the implementation will be StateTree.
- **Explicit fight/flight thresholds per character type.** Grunts break early and visibly.
  Elites do not break until their shields are down and their leader is dead. **The variance
  between archetypes *is* the AI**, far more than the sophistication of any one of them.
- **The leader-death cascade.** Kill an Elite and the nearby Grunts panic, run, and fire
  wildly. This one interaction generated more player stories than any other Halo AI feature
  and it costs almost nothing: one morale event, propagated by proximity, with a distinctive
  animation and vocal set.
- **The "three-second rule" of readability.** Bungie tuned encounters so a player could parse
  the situation and form a plan in a small number of seconds. Arena design, sightlines and
  enemy silhouette variety all served this.
- **Deliberate over-reaction to being shot at.** Enemies flinch, dive, and reposition more
  than is optimal, because the player needs feedback that their bullets are doing something
  even before the health bar moves.

**PARTISAN takes:** the morale cascade (Vol IV §3), archetype variance as the primary source
of interest (Vol IV §4), and over-readable reactions to incoming fire (Vol X §1).

**PARTISAN adapts:** Halo's roster variety came from alien species with wildly different
silhouettes and abilities. PARTISAN has one human silhouette and cannot do that. **The
variance must therefore come from personality and morale rather than from body plan**, which
is harder and is one of the genuine design risks in this project (Vol XIII §4).

---

### 2.3 Left 4 Dead (Valve, 2008) — the pacing ancestor

**What the Director actually is.** Not a difficulty scaler. A *pacing machine* built on an
explicit emotional model:

- A per-survivor **intensity** value accumulates from damage, proximity of threats, being
  incapacitated, and being separated. It decays when safe.
- The Director runs a four-phase cycle: **build-up → sustain peak → peak fade → relax**. It
  will not begin a new build-up until the relax phase has run for a minimum duration.
- It controls **population, item placement, and special-infected spawns**, and crucially it
  places them *out of sight*, so the player never sees the hand.
- The relax phase is deliberately quiet, and the quiet is what makes the peak read as a peak.

**The under-discussed part: the Director also authored space.** Item and enemy placement
varied across playthroughs, which meant players could not memorise a route, which meant every
run required actual play rather than execution. For a casual PvE game this is the difference
between a level and an experience.

**Valve's second contribution: the survivor bots.** Left 4 Dead's allied bots are a masterclass
in companion AI that is *good enough to not think about*. They never block, they follow
reliably, they revive, they call out, and they are deliberately slightly worse than a human so
that human players feel necessary. Vol XI leans on this heavily.

**PARTISAN takes:** the Director wholesale (Vol VIII), the four-phase curve, the out-of-sight
placement rule, and the survivor-bot non-negotiables (Vol XI §2).

**PARTISAN adapts:** L4D's Director modulates *quantity of enemies*. PARTISAN's enemies are
finite, named, and attritable — a garrison, not a horde. The Quartermaster therefore modulates
**scarcity, reinforcement routing, information, and weather** instead. This is a real design
departure and Vol VIII §4 is the argument that it works.

---

### 2.4 Alien: Isolation (Creative Assembly, 2014) — the information ancestor

**The two-brain architecture**, and it is the single most valuable structural idea in this
document.

- A **Director brain** holds perfect knowledge of the player's position at all times. It never
  moves the alien. It maintains a general sense of where the alien should be *searching* —
  broad zone guidance, tightened or loosened by tension pacing.
- The **Alien brain** has only sensory knowledge: it hears, it sees, it investigates. It does
  not know where you are. It receives *hints about regions*, not coordinates.
- The gap between the two is exactly where the horror lives. The alien finds you through its
  own senses, in a region the Director nudged it toward, and the player cannot distinguish
  that from luck or from being hunted.

**The second mechanism: graduated behaviour unlocking.** The alien's behaviour set expanded
over the course of a playthrough as the player demonstrated tactics — reportedly implemented
as behaviour-tree nodes becoming available over time. The alien "learned" to check lockers
after the player had used lockers. This is *authored adaptation with a trigger*, not machine
learning, and it is the correct model for PARTISAN's campaign adaptation (Vol VII §5).

**The third mechanism, least discussed: perceptual honesty.** The alien has a modelled hearing
system with real ranges and occlusion, and a vision cone that the player can learn. Because
the rules are learnable, the player can build a mental model, and because the Director keeps
nudging, that model never becomes a solved problem.

**PARTISAN takes:** the two-brain rule as an architectural invariant (Vol III §6), region
hints rather than position hints, authored adaptation with visible triggers, and learnable
perception rules.

---

## 3. The wider canon

Shorter entries. Each is here because it contributes at least one specific mechanism.

### 3.1 Morale, suppression and the wargame lineage

**Close Combat** (Atomic Games, 1996–) — **the most important under-cited ancestor in this
document.** Soldiers had psychological state: morale, fatigue, cohesion, and a set of
conditions (nervous, shaken, panicked, berserk, cowering). They disobeyed orders. They routed.
They surrendered. A squad that lost its leader became measurably worse at everything.

> **Why this is the biggest lift in the compendium.** Every modern shooter models enemies as
> hit-point containers with a behaviour tree. Close Combat modelled them as *people who could
> break*. PARTISAN's third pillar demands exactly this, and almost nobody in the shooter
> lineage has done it since SWAT 4. This is the differentiator.

**Combat Mission** (Battlefront, 1997–) — refined the same: suppression as a distinct axis
from morale, the distinction between *pinned* (cannot move) and *broken* (will not fight), and
the observation that most casualties in real combat are caused by suppression enabling
manoeuvre rather than by direct aimed fire. Vol IV §3 formalises this.

**Total War** series (2000–) — chain routs. Morale propagates through adjacency, and a local
collapse can cascade across a line. PARTISAN wants a *limited* version of this: the garrison
should be able to collapse, but not instantaneously across the island. Vol IV §3.6 adds
hysteresis and cohesion anchors to prevent runaway.

**Steel Panthers / Advanced Squad Leader lineage** — the idea that a unit has a *state* the
player can read and exploit, and that manoeuvre exists to change that state rather than to
deal damage.

### 3.2 Stealth and awareness

**Thief: The Dark Project** (Looking Glass, 1998) — graduated, audible awareness states. Every
transition narrated. The guard who says "must have been the wind" is arguably the most
influential single line of AI-driven dialogue ever written, because it taught the entire
industry that **AI state must be broadcast**. `ADOPT` wholesale (Vol IV §2).

**Metal Gear Solid** (1998) — alert / evasion / caution phases with explicit timers, and a
*visible* transition. The player learns the system and plays against it. Also: soldiers who
call for backup on a radio you can destroy. PARTISAN's comms model (Vol VII §3) is a direct
descendant.

**Splinter Cell** (2002) — light and shadow as a legible, quantified stealth currency. The
lesson is not the light meter, it is that **the player must be able to see the input to the
AI's perception**, not just the output.

**Commandos** (1998) — vision cones drawn on screen. The most literal possible expression of
the same principle. Crude, and it worked.

**Hitman** (2016–) — the "suspicion" intermediate state, and NPCs who behave differently
because of *who they think you are*. The enforcer/crowd distinction is a belief model in
disguise.

### 3.3 Squad shooters

**Half-Life** (Valve, 1998) — marine squads that flanked, suppressed, threw grenades to flush,
and retreated. Much of the perceived intelligence came from **scripted sequences fused with
navigation** and from barks. Half-Life is the first mainstream proof that authored set-pieces
and systemic behaviour are complementary, not opposed.

**Rainbow Six** (1998) and **Ghost Recon** (2001) — lethality as an AI design tool. When two
rounds kill, the AI does not need to be clever; it needs to be *positioned*. Reaction time and
accuracy become the entire difficulty curve. PARTISAN inherits the lethality but must be
careful: high lethality plus casual PvE is a hard combination (Vol VIII §5).

**Operation Flashpoint / ArmA** (Bohemia, 2001–) — **the most relevant technical ancestor for
PARTISAN's terrain problem.** Long sightlines, suppression, formations, and a genuine
knowledge model: ArmA agents have a `knowsAbout` value per target that grows with observation
and decays with time, and information is *shared across a group* with delays. ArmA also
demonstrates the failure modes: agents that spot you at absurd range through foliage, path
failures on complex terrain, and coordination that reads as robotic because it is never
narrated. **Study ArmA for the knowledge model and for the negative examples in equal
measure.**

**Brothers in Arms** (Gearbox, 2005) — suppression as a mechanic the player commands, and the
find/fix/flank/finish verb set made explicit and teachable. Its key insight: **a player who
understands the doctrine the AI is using enjoys fighting it far more.**

**SWAT 4** (Irrational, 2005) — compliance and surrender. Suspects who could be talked down,
who panicked, who dropped weapons, who sometimes complied and then didn't. Civilians as
liabilities. Morality encoded as mechanics. Directly serves pillar three. `ADOPT` (Vol IV §6).

**Killzone 2** (Guerrilla, 2009) — HTN planning for squad tactics, with a well-documented
architecture. Worth reading for the *decomposition mental model* (Vol II §3.5) even though the
implementation is rejected.

**Full Spectrum Warrior** (Pandemic, 2004) — an actual US Army training tool turned game.
Suppression, bounding, and the hard truth that realistic infantry tactics are slow and that
games must compress them.

### 3.4 Systemic and open-world

**S.T.A.L.K.E.R.: Shadow of Chernobyl** (GSC, 2007) — A-Life. Agents existed and acted outside
the player's presence, with their own goals, migrating and fighting each other. The shipped
version was far more constrained than the design intent, which is itself the lesson:
**offscreen simulation is the most over-promised feature in game AI**. PARTISAN wants a
deliberately *coarse* version (Vol VII §4): garrison patrols and village life simulated as
cheap state machines over a graph, promoted to full actors only near the player.

**Far Cry 2** (Ubisoft Montreal, 2008) — AI that reacted to systems it was not authored
against: spreading fire, vehicle collisions, wounds. Enemies fled fire, dragged wounded, and
improvised. The lesson: **give the AI a small number of world-state inputs and let the
reactions compose**, rather than authoring reactions to specific events.

**Far Cry 2's buddy system** — the first serious attempt at companions with independent
agendas. Widely regarded as a near-miss, and instructive for Vol XI.

**Shadow of Mordor** (Monolith, 2014) — the Nemesis system. Not tactical AI at all; a
*relationship and memory* system that generated persistent named antagonists who remembered
previous encounters. **PARTISAN should steal the principle, not the system**: a garrison
officer who survives an ambush and is thereafter more cautious, named, and recognisable is
enormous narrative value from a small amount of state (Vol VII §5.4).

**Metal Gear Solid V** (Kojima, 2015) — counter-adaptation. Repeated headshots → helmets.
Repeated night infiltration → flashlights and night vision. Repeated tranq → armoured
personnel. Announced through intel briefings. The crucial detail is **the telegraph**: the
player is *told* the enemy is adapting, so it reads as respect rather than as punishment.

**Dishonored** (Arkane, 2012) — awareness that degrades gracefully, and a search behaviour that
is believable because guards search *plausible* places rather than the correct place. Direct
support for Axiom 2.

### 3.5 Bots and the "feels like a player" lineage

This is the sub-canon most directly relevant to the stated brief, and the least studied.

**Quake III Arena bots** (Jan Paul van Waveren, 1999) — the reference work. Fuzzy-logic goal
selection over item and weapon preferences, an area-awareness system for navigation, and
**per-bot characteristic files**: aim skill, aim accuracy, reaction time, aggression,
chat frequency, weapon weights. Different bots had different *names and personalities* and
players recognised them. Also chat: bots talked, taunted, and responded to events.

> **The crucial finding from this lineage.** Bots that "feel human" do so because of
> **imperfection profiles and social behaviour**, not tactical quality. Van Waveren's bots
> modelled aim as a *tracking process with error and latency*, not as a hit roll. PARTISAN's
> aim model (Vol IV §5) is a direct descendant.

**Unreal Tournament bots** (Epic, 1999–2004) — widely considered the best-feeling deathmatch
bots ever shipped. Skill levels changed reaction time, aim error, and *decision quality*
separately, so a low-skill bot was not merely inaccurate, it made worse choices. This
separation is important and most games get it wrong.

**Counter-Strike bots** — the lineage from third-party bots through to Valve's official ones
(built by Michael Booth, who then built the L4D Director, which is not a coincidence). Booth's
bots used a learned navigation mesh, radio commands, and per-bot "personality" profiles
including morale and aggression. **The single most relevant precedent in existence for
"PvE that feels like PvP."**

**Halo multiplayer bots** and **Titanfall 2 grunts** — the modern case that *bad* bots serve a
purpose: Titanfall's AI grunts exist to make players feel powerful and to fill space, and are
tuned deliberately weak. PARTISAN must not accidentally build these.

**FIFA / sports AI** — largely irrelevant tactically, but worth one note: sports AI invests
heavily in *animation-driven believability* and hides simple decision logic behind superb
motion. Vol X §3.

### 3.6 Companions

**Half-Life 2: Alyx Vance** (Valve, 2004) — the benchmark. Never blocks, never dies
accidentally, always audible, always contextually commenting. Valve's own account emphasises
how much of this was *negative* engineering: enormous effort spent on preventing annoyance
rather than adding capability.

**BioShock Infinite: Elizabeth** (Irrational, 2013) — the most documented companion in the
industry. Key findings: she never needs protecting; she *gives* the player things at moments
of need (a Director-like function); her pathing was heavily special-cased; and vast effort went
into making her *look at the right thing at the right time*. Gaze is a legibility system.

**The Last of Us: Ellie** (Naughty Dog, 2013) — famously allowed to be invisible to enemies
during stealth, because the alternative — a companion who can blow your stealth — tested
terribly. **A deliberate, well-chosen lie in service of the experience.** Vol XI §3 argues
PARTISAN needs its own version of this and names which lies are acceptable.

**Left 4 Dead survivor bots** — covered above. The gold standard for *reliability*.

**Ico** (2001) — companion AI as the entire emotional payload, with almost no tactical
capability. Proof that companion value is relational, not combat-effective.

### 3.7 The negative canon

Failures are more instructive than successes and are almost never written down.

| Failure | Where it shows up | Root cause | PARTISAN's guard |
|---|---|---|---|
| **Omniscient snap-aim** | Most modern shooters on high difficulty | Difficulty implemented as accuracy/health scaling | Vol VIII §5: difficulty moves belief parameters only |
| **The blocking companion** | Endemic | Collision on allies | Vol XI §2, push-through capsules, tested every build |
| **Tactic flicker** | Utility-AI systems without hysteresis | Re-scoring every tick | Vol V §4, minimum commit time **⚠ load-bearing** |
| **Bark soup** | Games with per-agent bark timers | No arbitration | Vol X §2.4, one speaker per squad |
| **The psychic grenade** | Enemies who grenade your exact position | Grenades targeting truth, not belief | Vol III §4, indirect fire aims at beliefs |
| **Silent death** | Player dies with no idea why | No telegraph | Vol XII §1, zero-tolerance metric |
| **The cover conga line** | Agents queueing for the same cover slot | No slot reservation | Vol V §5, reservation system |
| **The suicidal advance** | Agents walking into fire because the plan said so | No self-preservation override | Vol IV §7 |
| **Adaptation as punishment** | MGS V done badly | Unannounced counter-adaptation | Vol VII §5, mandatory in-world telegraph |
| **The stuck agent** | Every game ever | Navigation edge cases | Vol VI §6, stuck detection and graceful teleport-out-of-sight |
| **Offscreen simulation that isn't** | STALKER's shipped A-Life | Over-promise | Vol VII §4, coarse by design and honestly described |

---

## 4. What the canon collectively proves

Compressed findings, each supported by multiple titles above:

1. **Narration beats computation.** (F.E.A.R., Thief, Half-Life, Halo) Barks and audible state
   transitions do more for perceived intelligence than any planner.
2. **Variance beats sophistication.** (Halo, Quake III, UT) A roster of differently-flawed
   agents reads smarter than a roster of uniformly good ones.
3. **Morale generates stories.** (Close Combat, Halo, SWAT 4) Agents that break produce
   memorable events at almost no computational cost.
4. **Imperfect information is the source of drama.** (Alien, Thief, ArmA, MGS) Every canonical
   tense AI moment is an information asymmetry being resolved.
5. **Pacing must be authored.** (L4D, Alien, Halo encounter design) Left alone, systemic AI
   produces flat, uniform combat.
6. **Space is AI.** (F.E.A.R., Halo, Thief) A large fraction of perceived intelligence is level
   geometry giving a limited vocabulary good moves.
7. **Companions are judged by their failures, not their successes.** (Alyx, Elizabeth, L4D
   bots, Far Cry 2 buddies) Removing annoyance beats adding capability.
8. **Telegraphed adaptation is respect; untelegraphed adaptation is cheating.** (MGS V, Alien)
9. **Nobody has combined 1–8 with a scarcity economy in a casual PvE shooter.** That is the
   opportunity and it is the whole argument for this project.
