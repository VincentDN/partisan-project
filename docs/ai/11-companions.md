# Volume XI — Companion AI

**The hardest problem in the compendium.** Allied AI is judged against a standard roughly
three times stricter than enemy AI and receives none of the excuses. An enemy that does
something odd is "interesting". An ally that does the same thing is "broken". Budget it as a
separate discipline with its own phase (Vol XIII, Phase 5), not as a variant of the enemy work.

---

## 1. Why allies are harder

| Factor | Enemy AI | Ally AI |
|---|---|---|
| Player attention | Intermittent, under stress | Continuous, at close range, during calm |
| Failure interpretation | "Lucky" / "interesting" | "Broken" / "useless" |
| Physical proximity | Rarely inside 3m | Constantly inside 3m |
| Navigation scrutiny | Invisible | Every stutter is seen |
| Expected competence | Variable by design | Assumed |
| Emotional stake | Negative | Positive, and therefore fragile |
| Time on screen | Seconds | Hours |

The proximity row is the one that kills projects. Almost all allied-AI complaints across the
medium reduce to physical interference, not tactical incompetence. Players forgive an ally who
misses; they do not forgive an ally who stands in a doorway.

---

## 2. The non-negotiables

These are not guidelines. Treat a violation as a release-blocking defect.

### N1 — Never physically block the player

**Implementation:** allied capsules do not collide with the player. Push-through with a soft
separation force, plus an active "step aside" behaviour when the player approaches a doorway
the ally occupies.

Do not attempt to solve this with better avoidance. Crowd avoidance between a player who moves
erratically and an ally trying to hold a tactical position produces the doorway dance, every
time, in every engine. The correct solution is to remove the constraint, not to path around it.

> **Why the "unrealistic" solution is right.** Players do not notice walking through an ally.
> They notice, and remember for years, being trapped behind one. The realism cost is invisible;
> the interference cost is the top complaint in the category. This trade is not close.

### N2 — Never be silently absent

If a squadmate is somewhere, they are audible from there. An ally who wanders out of the fight
and says nothing reads as a bug even when their position is tactically correct. Periodic
position-confirming barks, distance-attenuated, tied to their current role.

### N3 — Never require an order to be useful

Command is optional. A player who never opens a command interface must still have a competent
squad. Any system that becomes mandatory has become a chore, and this is a casual PvE game
(C1–C7, Vol 0).

Corollary: if you build a command layer, it must be for *expression*, not for *correction*. The
moment players use commands to fix bad allied behaviour, the command layer has become a
workaround and the underlying AI is the defect.

### N4 — Never take the player's moment

At an engagement climax, squadmates suppress rather than kill. This is deliberate, explicit
dishonesty and it is correct.

**Implementation:** a "spotlight" state driven by the director. When the player is in a
one-on-one resolution, allied lethality drops hard and allied suppression rises. The ally
still looks busy, still fires, still contributes visibly — and does not steal the kill.

Tune this to be invisible. If players can detect the spotlight, it patronises. If it is absent,
the game's best moments get resolved by someone else.

### N5 — Always fail loudly

Wounded squadmates call out. Stuck squadmates say so. Out-of-ammunition squadmates say so. An
AI that announces its own failure is forgiven almost entirely; one that fails silently is not
forgiven at all.

This includes navigation failure. If an ally cannot reach a position, they should say "I can't
get up there" rather than standing against geometry. The bark converts a bug into
characterisation. This is not a cheat — it is the honest expression of a real limitation, and
players accept honest limitations readily.

### N6 — Never make the player babysit

No escort-mission failure states for squadmates in normal play. Downed rather than dead;
revivable rather than required; and if they die, the game does not end. Pillar-four permadeath
(Vol XIII open question 5) is a separate, deliberate, narratively-gated decision — not an
incidental consequence of a firefight going badly at minute forty.

### N7 — Locatable by voice at all times

The player should be able to close their eyes and know roughly where their squad is. This is
what makes a squad feel like company rather than like escorts. It requires deliberate
positional audio design and a persistent low-level chatter budget distinct from the tactical
bark budget in Vol X.

---

## 3. The corpus on companions

Four reference points worth studying, each solving a different sub-problem.

**Half-Life 2's companions** established that a companion must be *mobile and out of the way*,
and that the combination of follow behaviour with tight indoor spaces is the core difficulty.
Valve's much-discussed struggle here is the origin of most modern companion conventions.

**BioShock Infinite's Elizabeth** is the most instructive. The solution to companion
interference was not better navigation — it was to make her *not a combat entity*. She does not
occupy tactical space, does not need cover, and repositions freely, including in ways that are
not strictly plausible. Her contribution is resource-giving and presence. Ken Levine's team
also found that she needed to *look at what the player looks at* to feel present. Cheap, and
enormously effective.

**The Last of Us's Ellie** solved the stealth-companion problem by making her invisible to
enemies during stealth. This is a large, unapologetic cheat and it is correct, for exactly the
N1 reason: the alternative — a companion who can blow your stealth through pathing — converts a
character into a hazard.

**Left 4 Dead's survivor bots** are the closest analogue to PARTISAN's needs: full combat
participants in a director-paced co-op shooter. Their design lessons: bots must never wander,
must always be recoverable to the player's position, must hand over resources readily, and must
be *slightly* worse than a competent human so they do not obviate the player.

> **The synthesis for PARTISAN.** Take Elizabeth's spatial permissiveness (allies may occupy
> implausible positions to stay out of the way), Ellie's stealth exemption (militia squadmates
> do not break the player's concealment through pathing), and the L4D bot's competence ceiling
> (visibly useful, deliberately not decisive).

---

## 4. GREF squadmates specifically

The militia are the player's side, and their AI must express the faction character from Vol VII
rather than being a generic competent squad.

### 4.1 What makes them *militia*

| Trait | Behaviour | Reads as |
|---|---|---|
| **Local knowledge** | Use goat-track nav links no other faction can. Appear above the enemy without being told | "They know this island" |
| **Low discipline** | Loyalty overrides tactic adherence: they break formation to reach a wounded friend | Human, occasionally infuriating — tune carefully |
| **Scarcity** | Ration ammunition audibly. Pick up and switch to garrison weapons mid-fight, visibly | The whole scarcity pillar, in one behaviour |
| **Local stake** | React to *places*: the village, the monastery, someone's house | This is their island and not yours |
| **No uniform discipline** | Individual silhouettes, no drill, ragged movement | The visual identity from the constraint sheet |

The weapon-switching behaviour deserves emphasis. A squadmate who runs dry, takes a dead
garrison soldier's rifle, and continues the fight with a different weapon sound is doing more
work for the scarcity pillar than any UI could. `[medium]` and worth it.

### 4.2 The loyalty override, tuned

Loyalty breaking the tactic is charming at the right frequency and enraging at the wrong one.
Guidance:

- Trigger only for **named** squadmates, not generic militia
- Only when the casualty is within a short distance
- Never when it would cross the player's firing line (a hard geometric check)
- Never more than once per engagement per agent
- Always barked before it happens, so it reads as a choice rather than a pathing failure

⚠ **load-bearing**: the firing-line check. An ally who walks into your shot while being
heroic converts a beloved feature into a hated one instantly.

### 4.3 Named characters

Squadmates should have names, a village, and a position on the annexation. This is cheap
content with a disproportionate return, and it is *load-bearing for act two*: pillar four
requires the player to care what the militia think about the relief force, which requires them
to be people first.

Minimum viable characterisation per named squadmate:
- A name and a face
- A profile from Vol IV (which archetype)
- Three to five lull barks that are *theirs*
- A stated position on independence versus union
- One relationship to another squadmate

That is perhaps an hour of writing per character and it converts "my AI squad" into "Stelios
and Yorgos".

---

## 5. The optional command layer

If built — and it is legitimately optional (N3) — keep it to three verbs:

| Verb | Effect |
|---|---|
| **Move** | Reposition the squad to a marked point, using their own judgement about route and cover |
| **Focus** | Direct fire and attention at a marked area. Feeds their belief directly |
| **Hold / Follow** | Toggle between anchoring here and staying with the player |

Three verbs is enough for expression and too few to become a chore. Resist adding stance,
formation and engagement-rule commands; each one converts an AI responsibility into a player
responsibility, which is backwards.

**The Focus verb is the interesting one**, because it is the player writing into the AI's
belief store. It gives the player a legible, mechanical relationship with the core system of
the game, and it makes allied belief error visible in a way the player is complicit in.

---

## 6. Squadmate failure modes to test for explicitly

Add these to the automated harness (Vol XII) and the manual checklist:

| Failure | Test |
|---|---|
| Doorway block | Player charges every doorway in the level with an ally in it. Zero blocks |
| Stuck on geometry | 30-minute traversal soak over the full terrace/switchback set |
| Lost squad | Player sprints away for 60s; squad must recover to the player without teleporting in view |
| Friendly fire into player | Firing-line violations logged; target zero |
| Silent absence | No squadmate goes >20s without a positional audio cue while alive |
| Kill stealing | Spotlight state fires in the last 2s of a 1v1; measure ally kills in that window |
| Ammunition hoarding | Allies must hand over from the pool when the player is dry |
| Reviving loops | Two downed allies adjacent must not deadlock each other |
| Loyalty override abuse | Frequency per engagement ≤1 per agent |
| Stealth breaking | Ally pathing must not trigger detection during player concealment |

---

## 7. Cost and phasing

Companion AI is Phase 5 in the roadmap and carries `[large]`. A realistic breakdown:

| Item | Cost |
|---|---|
| Push-through capsules + step-aside | `[small]` |
| Follow / regroup / recover behaviour | `[medium]` |
| Role participation in squad tactics (reuse of Vol V) | `[small]` — it is the same system |
| Positional chatter budget and audio design | `[medium]` |
| Loyalty override with all safety checks | `[medium]` |
| Weapon scavenging and switching | `[medium]` |
| Spotlight state | `[small]` |
| Named character content (×6–8) | `[medium]` |
| Optional command layer | `[medium]` |
| The failure-mode test suite | `[medium]` |

The reuse row matters. If Vol V's squad layer is built faction-agnostically, allied squad
tactics are *free* — the militia squad runs the same scorer with a GREF tactic set and a
different profile mix. Design for that from Phase 1 and Phase 5 halves in cost.

---

*Vol XI · PARTISAN AI Compendium v1.0.0 · internal*
