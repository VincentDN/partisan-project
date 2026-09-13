# PARTISAN AI — Spoken Briefing

## Part Three: Belief and the Individual

*Listening time: roughly twenty-two minutes. Part three of six.*

---

Part three. This is where it becomes buildable.

Two systems. The belief model, which is the foundation of everything. And the individual
soldier — perception, morale, personality, aim, and the interesting one, the mistake budget.

---

### The layer cake, briefly

Before the systems, the shape of the whole thing. Five layers, and the rule is that information
flows one way only. Lower layers never ask upward. That rule is what keeps this debuggable by
one person, and it's worth more than any individual feature.

**Layer five, the Director.** Omniscient. Never controls an agent directly. Shapes pacing,
reinforcement, scarcity, weather, events. Ticks every one to five seconds. That's part four.

**Layer four, Faction Command.** One per faction, island-wide. Owns the faction's knowledge
map, assigns missions to squads, runs the communications network, adapts across the campaign.
Ticks every few seconds.

**Layer three, the Squad.** Three to eight agents. Owns the squad's belief. Picks a tactic and
holds it. Allocates roles. Issues the barks. **This is where the intelligence players actually
perceive lives.** Ticks four times a second.

**Layer two, the Individual.** Perception, morale, personality, executing its assigned role,
and a self-preservation override. Ticks a few times a second.

**Layer one, Motor.** Animation, aim, weapon handling. Every frame. Where believability is won
or lost visually.

If you have ten weeks of AI time, six of them belong to layer three. Players don't perceive
individuals and they certainly don't perceive directors. They perceive *units*.

---

### The belief model

Right. The core system. Build this first, before anything else, including before you have
anything to shoot at.

**The rule: no agent, at any layer, ever reads the player's position. Ever.**

There is one function in one file through which all target-position information passes, and it
does not return the truth. It returns a belief.

A belief is a small piece of data. Let me describe its fields, because they're each doing work.

**Whose belief it is** — an agent, a squad, or a faction. These are different and they diverge.

**Who it's about.**

**Last known position** — a point in space.

**Positional uncertainty** — a radius in metres, which *grows over time*.

**Confidence** — a number from zero to one, which decays.

**Velocity** — the last observed heading, which also decays.

**Source** — and this is the interesting field. Did the agent *see* it, *hear* it, get *told*
it, *infer* it, or *guess* it? Five values, and they behave differently.

**Timestamp.**

**Corroboration** — how many independent sources agree.

That's it. That's the whole structure. And essentially everything interesting in the game falls
out of it.

---

### How beliefs move

An agent's belief becomes the squad's belief only through a **communication event**. Not
automatically. Not by shared memory. Through an event, and every one of those events is
physically breakable.

Four channels.

**A shout.** Range-limited, blocked by terrain. Forty metres, roughly.

**A radio call.** Needs a working radio and needs coverage. Two to five seconds of latency,
which means radio beliefs arrive *already slightly stale*, which is both realistic and useful.

**A runner.** Slow. Physical. Killable. This is the one that turns a communications network
into a target.

**A bell.** Loud, coarse, faction-wide, and very imprecise — it tells everyone something is
happening somewhere, within a hundred and fifty metres or so.

And then squad belief becomes faction belief only through the comms network at layer four,
which has physical nodes on the map.

Every link in that chain is something the player can cut. That's the game.

Here's the bit worth holding onto: when the player cuts the radio network, they should be able
to *hear* the garrison get stupider. The bark density drops. The coordination degrades. The
payoff for the mechanic is delivered by the audio layer, not by a UI notification. I'll come
back to that in part five.

---

### Decay, and the one parameter that matters most

Uncertainty grows with time. But — and this is the good part — it grows at different rates over
different terrain.

A belief about someone standing in the open on the coast road decays slowly. You can see the
road. If he were still there you'd know.

A belief about someone in the terraces or the pine scrub decays *fast*, because he could be
anywhere in there by now.

You implement that as a per-terrain multiplier, tagged onto the navigation mesh. Open ground,
maybe one point two metres per second of uncertainty growth. Terraces, two and a half. Scrub,
four.

**That single parameter does more for how this feels than any other number in the project.**
If I could give you one dial to spend a week tuning, it's that one.

---

### Deliberate wrongness

Now the part that I'd argue is the most important single behaviour in the compendium.

Where a belief is uncertain, the agent should commit to a **specific plausible guess** rather
than hedging.

A squad that half-knows where you are should search *one wrong ravine, confidently*, for
twenty seconds. Not stand in the middle of three options looking indecisive.

**Confident error is the single most human-reading behaviour available to you.**

And hedging is the tell that gives away a machine. When an agent visibly weighs options and
splits the difference, it looks like what it is — a scoring function. When it picks the wrong
answer and commits to it hard, it looks like a person who made a call.

This is also why the search behaviour has a minimum commit time of about twenty seconds before
re-evaluating. Without that, new information constantly re-steers the search and it looks like
a machine updating. With it, it looks like a sergeant who decided, and was wrong.

---

### The honest-cheating clause

The Director — layer five — knows everything. Sometimes pacing requires it to hand a faction a
belief it didn't earn.

That's allowed. With one absolute condition.

**It must fabricate a plausible source at the same time, and that source must be perceptible to
the player.**

A goatherd who saw you and went to tell someone. A bell that rang. A radio call you could have
jammed. A body you left in the open.

Cheating that the player can retroactively explain is not cheating. Cheating that they cannot
explain is the thing that destroys the entire illusion — permanently, in a single incident.

Cap it hard. No more than about four injections an hour. If you need more than that, the
problem is your encounter design, not your director.

---

### The two-brain rule, stated once more

From Alien: Isolation, and it's worth repeating because it's the structural backbone.

The Director has perfect information and **no authority** over agents.

The agents have authority and **only sensory information**.

They communicate in one direction, through the belief chokepoint, with a fabricated source.

Keep that line clean and your AI can be both well-paced and honest. Blur it — let the Director
whisper the player's actual position into an agent's target slot during a late-night bugfix —
and you get AI that's simultaneously unfair and unreadable. There's no middle ground and no
performance argument for crossing it.

Which is why I'd genuinely recommend an automated test that greps the AI module for forbidden
symbols and fails the build. It sounds excessive. It's the single highest-leverage piece of
process in the project, because this leak *will* happen, it will happen when you're tired, and
it will silently destroy the thing everything else rests on.

---

### Recap

Belief, not truth. One chokepoint. Five sources. Uncertainty that grows by terrain type — that's
your main feel dial. Communication events that the player can physically break. Confident
wrongness over hedging. And a director that may cheat only by fabricating a perceptible source.

---

### The individual: the awareness ladder

Six states, straight out of Thief, and **every single transition has a mandatory audible and
visible tell.** No silent state changes. Not one.

**Unaware.** Routine. Idling, patrolling, having a conversation. Relaxed posture.

**Curious.** Something registered. He orients. Stops what he's doing. Doesn't raise the weapon
yet. Says something questioning.

**Suspicious.** Investigates alone. Weapon at low ready. Moves deliberately. Torch on if it's
dark.

**Alert.** Weapon up. Seeks cover. Calls the squad with a direction.

**Engaged.** Full squad tactic running.

**Broken.** Morale-driven. Rout, freeze, or surrender. Unmistakable — dropped weapon, hands up,
or flight.

Now the good part: the time to escalate between these, and the time to decay back down, is
**personality-modulated**.

The veteran sergeant goes from Curious to Alert in a single beat. The eighteen-year-old
conscript sits on Suspicious for six seconds, then panics straight past Alert into Broken
without ever fighting properly.

Same ladder. Completely different characters. And the player can see it.

---

### Morale and suppression

Two separate numbers per agent, both from zero to one.

**Suppression** is fast. It rises from rounds passing near you, from explosions, from losing
cover. It falls when you're safe for a while. Effects: accuracy penalty, reluctance to expose
yourself, head-down animations, and above all a **visible collapse in rate of fire.**

That last one matters. Suppression has to be legible from thirty metres away with no UI. If you
can't tell a suppressed enemy from an unsuppressed one by looking and listening, the system is
invisible and therefore worthless.

**Morale** is slow. Here's what moves it.

Down: a nearby friendly killed, scaled by distance and by whether he actually saw it. Sustained
suppression. Being wounded. Being low on ammunition. Being isolated from his squad — that one
ticks down continuously. Losing comms with command.

Way down: **the squad leader killed.** That's the big one, and it also applies a cohesion
penalty until someone assumes command. There's a deliberate three-to-six second confusion
window before succession, and that window is a feature.

Up: killing an enemy. Taking ground. Reinforcements arriving. And the leader simply being
present and unbroken, which ticks up continuously.

Below a personality-set threshold, the agent breaks. And then he rolls on a weighted table:
fall back to the nearest anchor, go to ground and stop fighting, rout outright, or surrender.
Roughly forty, twenty-five, twenty, fifteen percent, shifted by faction and by whether a
surrender is even possible in that situation.

Put hysteresis on that threshold — about zero point one — or agents will flicker in and out of
broken, which looks terrible.

**Why this is the highest-value system in the compendium:** it produces emergent narrative for
free. It makes your actions matter beyond damage numbers. It's the mechanical expression of
your third pillar. And almost no modern shooter does it, so it's differentiating in a way that
better pathfinding will never be.

---

### Personality vectors

Authored. Not randomised. That distinction is worth a moment.

Randomised variance produces agents that are *different from each other* but not *characters*.
Authored archetypes produce recognisable types that a player learns to read — and learning to
read them is the whole pleasure.

Ten fields per profile. Aggression. Caution. Discipline, which is adherence to the squad tactic
when frightened. Morale floor, which is where broken begins. Reaction time in milliseconds.
Aim skill. Curiosity. Loyalty, which is how likely he is to break formation for a wounded
friend. Chattiness. And a voice bank.

Five archetypes to author first, and author them in one sitting so they read as a set:

**The Sergeant.** High discipline, high morale floor. He's the cohesion anchor. Killing him is
the tactical objective and the player should work that out on their own.

**The Conscript.** Low everything. Panics. He's the one you feel bad about afterwards.

**The Old Soldier.** Low aggression, very high caution, very high aim skill. Doesn't waste
rounds. Doesn't expose himself. Extremely dangerous and extremely patient.

**The Zealot.** High aggression, no caution. Will charge you. He is the source of most of your
deaths and most of your stories.

**The Shepherd.** Militia only. Unmatched local knowledge, poor discipline. Appears where he
should not be able to appear.

And then the design lever that falls out of it: **a squad's character comes more from its
profile mix than from its size.** Author squads as compositions, not as counts. Two conscripts
and a sergeant plays completely differently from three old soldiers, at the same head count.

---

### Aim, and belief-coupled error

Don't roll for a hit. Model the weapon pointing somewhere slightly wrong and then let the
bullet fly honestly.

Aim error is a base value from the profile's aim skill, multiplied by: suppression, own
movement, target movement, a range curve, fatigue and wounds — and then the important one:
**belief uncertainty.**

That last multiplier is the whole trick. An agent shooting at a *guess* misses in a way that
looks like a person shooting at a guess. The rounds land near you, in a plausible cluster,
slightly off. And you can read from the impacts that you haven't been precisely located.

That single coupling does more for "this feels like a real person" than any behaviour tree
will. It's a multiplication. It's about four lines of code. And it makes concealment work
without any visibility hack.

---

### The mistake budget

Each agent carries a small explicit allowance of authored errors per engagement.

Reload at the wrong moment. Over-push. Mis-call a direction by one landmark. Break cover
slightly early. Fire at a shadow.

The Director hands out permission to spend them during pacing lows.

The rule is that mistakes must be **plausible** and **readable**, never arbitrary. A player who
catches an enemy in a bad reload feels clever. A player who watches an enemy walk into a wall
feels cheated. The distance between those two experiences is entirely in the authoring, and
that's where the craft is.

---

### The self-preservation override

One hard rule that sits above the squad layer.

An agent about to die pointlessly may break formation without permission.

Universal. Not personality-gated. Not overridable by the tactic.

It's the strongest single signal that there's a person in there rather than a unit token, and
it costs almost nothing to implement — it's one high-priority global transition in the state
machine.

---

### End of part three

Recap.

Five layers, information flowing one way, and the squad layer is where perceived intelligence
lives.

The belief model: never the truth, one chokepoint, five sources, terrain-dependent decay,
communication events the player can cut, confident wrongness over hedging, and a director that
may only cheat with a perceptible fabricated source.

The individual: a six-state awareness ladder with no silent transitions, morale and suppression
as separate first-class numbers with leader-death as the big lever, five authored archetypes
that compose into squad character, aim error coupled to belief uncertainty, an explicit mistake
budget, and a universal self-preservation override.

Part four is squads, factions and the director. About twenty minutes.

*End of part three.*
