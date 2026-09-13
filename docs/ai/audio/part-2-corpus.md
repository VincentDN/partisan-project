# PARTISAN AI — Spoken Briefing

## Part Two: The Corpus

*Listening time: roughly twenty-six minutes. Part two of six.*

---

Part two. The history.

This is the part where I go through what's actually been built, because you said you wanted to
bring back the greatest AI in video game history, and that phrase only becomes useful if you
get specific about what each of those games actually *did*. A generic tribute is worthless.

I'm going roughly chronologically, and for each one I'll give you three things: the actual
mechanism, what PARTISAN should take, and what it should leave. Fifteen or so that matter, and
a faster run through the rest.

Settle in.

---

### Nineteen eighty. Pac-Man.

Start here, because it's the origin of something the industry forgot and then rediscovered
three times.

The four ghosts have different targeting rules. Blinky chases your tile directly. Pinky aims a
few tiles ahead of where you're facing, so it cuts you off. Inky uses a vector involving both
your position and Blinky's, which produces genuinely strange behaviour. Clyde chases you until
he gets close, then retreats to his corner.

Four short rules. No planning, no learning, nothing that would qualify as intelligence in any
technical sense. And players have been assigning those four ghosts *personalities* for
forty-five years. Blinky is aggressive. Clyde is a coward.

**Take:** personality as authored differentiation is almost free and does enormous work. Four
different rules read as four different minds.

**Leave:** everything else, obviously.

But keep the lesson, because it recurs: variance between agents is a more efficient route to
perceived character than sophistication within an agent.

---

### Nineteen ninety-three. Doom.

Simple state machines. Each monster has a handful of states and a pain chance — a probability
that being hit interrupts what it's doing.

And then there's infighting. If a monster's attack hits another monster, they turn on each
other. That was a small, almost incidental rule, and it produces emergent situations players
still talk about. Luring a baron into a crowd of imps is a *tactic*, and nobody designed it as
one.

**Take:** cheap systemic rules that let agents interact with each other produce stories that no
amount of per-agent sophistication will. The pain chance is also worth noting — it's the
earliest ancestor of suppression.

**Leave:** the state machines themselves.

---

### Nineteen ninety-eight. Half-Life.

Three things here, and it's a genuinely important entry.

First, the marine squads. Valve fused hand-authored scripted sequences with real navigation,
so a flank *read* as planned even when much of it was staged. The marines called out to each
other. They used suppressing fire. They retreated.

Second, and this is the underappreciated one: the attack slot system. Only a limited number of
enemies could actively attack you at once. The others held position, moved, looked busy. It's a
crowd-control mechanism and it does two jobs — it keeps the fight survivable, and it makes the
group look coordinated, because agents appear to be taking turns rather than swarming.

Third, Valve found — and talked about at length afterwards — that the companion problem is
much harder than the enemy problem. I'll come back to that in part five, hard.

**Take:** all three. Especially the attack slots, which we'll use as the basis for squad role
allocation. And the principle that scripted set-pieces and systemic AI are not enemies.

**Leave:** heavy scripting as the *primary* source of intelligence. It doesn't survive contact
with an open island.

---

### Nineteen ninety-eight. Thief.

Graduated awareness. The guard doesn't flip from unaware to alert. He passes through states,
and — the critical part — **every single state change is externally observable.** He says
something. He turns. He raises his lantern. He walks over to look.

This is the origin of the awareness ladder that we use directly in part three.

**Take:** the whole ladder, and the absolute rule that no state change is ever silent.

**Leave:** the single-pursuer, one-guard-at-a-time structure. We need squads.

---

### Nineteen ninety-nine. Quake Three Arena bots.

Jan Paul van Waveren's work. The bots ran fuzzy logic over an area awareness system, and
crucially each bot had a *character file* — an authored data file specifying its aim skill, its
aggression, its preferred weapons, even its chat lines.

This is the most direct ancestor of what PARTISAN needs, because the explicit goal of those
bots was to substitute for human players in deathmatch. And the technique that got them closest
wasn't better tactics. It was per-bot authored variance.

**Take:** personality vectors as authored data assets, not runtime randomisation. That
distinction matters and I'll explain it in part three.

**Leave:** the deathmatch goal-seeking. There's no item economy on your island.

---

### Two thousand and one. Halo: Combat Evolved.

The foundational entry for the whole thesis.

Bungie ran a behaviour system — a directed graph of behaviours with impulses that could
interrupt — that was, by later standards, not especially sophisticated. What they did that
mattered was three things.

They gave units **morale thresholds** with visible consequences. Kill an elite and the grunts
under it panic. Visibly. Audibly. They run.

They made **fight-or-flight legible**. You can see a Covenant unit's state from across a room.

And Chris Butcher and Jaime Griesemer gave a talk about it called *The Illusion of
Intelligence*, which is the title that should tell you everything. They weren't building
intelligence. They were building the perception of it, deliberately, as the stated goal.

**Take:** leader-death cascade, visible thresholds, and the entire design doctrine.

**Leave:** the alien roster. You have one human silhouette and that's a constraint worth
keeping.

---

### Two thousand and four. Halo Two.

Damián Isla's talk, *Handling Complexity in the Halo Two AI*, is where behaviour trees entered
mainstream game development. Before it, everyone rolled bespoke state machines. After it,
behaviour trees were the default for about fifteen years.

Worth knowing historically. We're not using behaviour trees as the primary structure — I'll
explain why in part six — but you should know where they came from and that the reason for
their dominance was *authorability*, not capability.

---

### Two thousand and five. F.E.A.R.

The one everybody cites. Jeff Orkin at Monolith.

The mechanism was goal-oriented action planning — GOAP. Each agent has goals and a library of
actions with preconditions and effects, and it plans backwards from the goal to find a valid
action sequence. On top of that sat squad behaviours that coordinated groups.

Now. Here's the part that matters and that gets consistently misread.

The planner is not why F.E.A.R.'s AI is remembered. I said this in part one and I'll say it
again with the specifics: F.E.A.R.'s enemies flanked, suppressed, used cover, and fell back.
So did enemies in a dozen other shooters that year. What F.E.A.R. did uniquely was **narrate
every one of those decisions out loud, in the moment, with specificity.** "He's flanking!"
"Cover me!" "I've lost him!"

Players attributed the intelligence to the planner because the planner is what got written
about. It was in the barks.

**Take:** squad-as-planning-unit, and above all the principle that the bark is the readable
output of the plan. That's the single most transferable idea in the entire corpus.

**Leave:** GOAP itself. Two months of work to produce behaviour you can get from fifteen
authored tactics, while being much harder to debug at two in the morning. More on that in part
six.

---

### Two thousand and five. SWAT Four.

Underrated and directly relevant to your third pillar.

Irrational built suspects with compliance behaviour. You shout at them. They might surrender.
They might not. They might surrender and then grab a weapon. Civilians are present and are a
liability rather than a target. Non-lethal resolution is not just possible, it's scored as the
better outcome.

This is the closest prior art that exists to "nobody here is a monster" in a first-person
shooter, and there isn't much else. It's worth studying properly.

**Take:** surrender and compliance behaviour wholesale.

**Leave:** the scoring and penalty framework, which turns it into an exam.

---

### Two thousand and seven. S.T.A.L.K.E.R.

A-Life. Agents simulated off-screen, with their own agendas, moving around the world whether or
not you're watching.

The reality was messier than the marketing and the full simulation was scaled back
considerably. But the *feeling* it produced — that the world has business of its own — is real
and it's what you want for the island.

**Take:** coarse background simulation for the garrison and the villages.

**Leave:** full-fidelity off-screen simulation. Ours is cheap and abstract. In part six I put
it in phase six specifically because it's the most deferrable thing in the plan.

---

### Two thousand and eight. Far Cry Two.

Systemic reaction. Fire propagates. Vehicles break down. Wounds persist. The AI reacts to
things the designers didn't author it against, because the systems are general.

**Take:** the principle. AI that reacts to world systems rather than to scripted triggers.
Your road cuts and your comms network are exactly this kind of system.

**Leave:** the buddy resurrection loop.

---

### Two thousand and eight. Left Four Dead.

Michael Booth's AI Director, and the spine of everything in part four.

The Director measures player intensity — damage taken, proximity of threats, time under fire —
and deliberately shapes the experience into a curve. Build-up. Peak. **Relax.** Build again.

The relax phase is the insight. Most games treat quiet time as wasted time. Left Four Dead
treats it as load-bearing, because without the trough there's no peak. Intensity is relative.
A constant maximum is a flat line, and a flat line is boring no matter how high it is.

The Director also never controls an individual agent's actions. It controls spawning, pacing,
placement, item distribution. It shapes; it doesn't puppet.

**Take:** the Director wholesale. It is the mechanism that makes "casual" work.

**Leave:** horde composition. Your enemies are finite, named, and have mothers.

---

### Two thousand and nine. Killzone Two.

Guerrilla used hierarchical task networks for squad tactics — a planner that decomposes a
high-level task into sub-tasks recursively.

Technically more sophisticated than what Halo was doing eight years earlier. Considerably less
memorable.

**Take:** hierarchical decomposition as a *mental model* for how to structure the tactic
library. That's free.

**Leave:** the implementation. Same reasoning as GOAP.

---

### Two thousand and fourteen. Alien: Isolation.

The single most important structural idea in the compendium, and it's worth the walk on its
own.

Creative Assembly built the alien with **two brains.**

Brain one is a director. It has perfect knowledge of where you are, always. It has no authority
over the alien's actions.

Brain two is the alien. It has authority. It has only sensory knowledge — what it has actually
seen or heard.

The director nudges the alien toward your general area. It never tells it where you are. The
alien then has to actually find you.

That separation is why the alien feels like a predator rather than a homing missile. It's
hunting you with *worse* information than the game has, deliberately, and that deliberate
handicap is the entire source of the tension.

They also built the alien's behaviour tree with a large set of nodes that unlocked over time as
it "learned" your habits — so it would start checking lockers once you'd used lockers.

**Take:** the two-brain rule, absolutely and without compromise. It's the structural backbone
of part three and part four.

**Leave:** the behaviour unlocking over a single session. Ours works at campaign scale instead.

---

### Two thousand and fifteen. Metal Gear Solid Five.

Counter-adaptation. Keep taking headshots and the guards start wearing helmets. Keep attacking
at night and they get night-vision equipment and more flares.

The thing that makes it work and not feel punitive is that it's slow and it's visible. You see
the helmets. You understand what happened and why.

**Take:** adaptation at campaign scale, always telegraphed in the world *before* the player
meets it in a fight.

**Leave:** the speed. Per-mission adaptation reads as punishment.

---

### The wargames. Close Combat, from nineteen ninety-six. Combat Mission, from two thousand.

This is the biggest single lift in the compendium and almost nobody in the shooter space has
taken it.

These games model morale, suppression and panic as **first-class simulated state**. A unit
isn't just alive or dead. It's steady, or shaken, or pinned, or broken, or routing. Suppression
degrades accuracy and willingness to expose. Losing a leader is a distinct event with distinct
consequences. Units surrender. Units panic and run and can sometimes be rallied.

In Close Combat particularly, the soldiers have individual psychological state and they will
stop obeying you.

**Take:** the entire morale model. Part three covers it in detail. It is the mechanical
expression of your third pillar and the single most differentiating feature available to you.

**Leave:** the operational scale and the wargame interface.

---

### A faster run through the rest

**Brothers in Arms, two thousand and five.** Suppress and flank as the explicit player-facing
verb set — find, fix, flank, finish. Made suppression a *mechanic* rather than a damage effect.
Take that distinction.

**Rainbow Six and the original Ghost Recon.** High lethality, fast reaction. Taught the genre
that a realistic time-to-kill changes AI design completely, because a single mistake ends the
engagement. Relevant to your ammunition scarcity.

**Total War.** Chain routs. One unit breaks, which drops the morale of adjacent units, which
break in turn. Cascading collapse at scale. Directly applicable to your garrison, and it's the
thing you have to put hysteresis on or the entire island surrenders at once.

**Batman: Arkham Asylum, two thousand and nine.** The predator encounters. Thugs get visibly,
audibly frightened as you pick them off. Their breathing changes. They start calling out to
each other in panic. It's a morale system built almost entirely in the audio and animation
layer, and it's enormously effective.

**Crysis, two thousand and seven.** CryEngine's tactical point system — a conceptual ancestor
of Unreal's environment query system. Scored positions against weighted criteria.

**Splinter Cell: Chaos Theory.** The awareness ladder refined, with the additional idea that
guards *investigate collaboratively*.

**The Last of Us, two thousand and thirteen.** Two things. Infected and human enemies with
completely different sensory models, which teaches the player to think about perception. And
Ellie — a companion who is deliberately invisible to enemies during stealth, which is a large,
unapologetic cheat and completely correct. Part five.

**BioShock Infinite, two thousand and thirteen.** Elizabeth. The solution to companion
interference was to make her *not a combat entity at all*. She doesn't occupy tactical space.
She repositions freely, including implausibly. And she looks at what you look at. Part five
again.

**Doom, twenty sixteen.** Demon archetypes designed as a rock-paper-scissors set to force
movement. AI as a pacing device rather than an opponent. Worth knowing as the modern statement
of encounter design.

**Deep Rock Galactic, Vermintide, Darktide, Helldivers Two.** The modern casual PvE co-op
lineage, all descended from the Left Four Dead director. Helldivers Two in particular is worth
studying for patrol behaviour and reinforcement waves, and for the fact that its enemies aren't
smart at all — the tension comes entirely from pacing and volume. That's a useful counterpoint
to everything else here.

**Ready or Not.** The modern inheritor of SWAT Four's compliance systems. Current prior art for
your surrender mechanic.

---

### The synthesis

Now the point of all that.

F.E.A.R. gave the industry legibility. Left Four Dead gave it pacing. Alien: Isolation gave it
the information split. Close Combat gave it morale.

**Nobody has combined all four.** Certainly not in a casual PvE shooter with a scarcity
economy, and certainly not in a setting where the fiction makes ignorance canon.

That's the gap. It's a real one, it's identifiable, and it's specific. Which is a much better
position to be in than "I want to make good AI."

And it's worth noting what the gap is *not*. It's not a technical gap. Every one of those four
things was shipped between nineteen ninety-six and two thousand and fourteen on hardware
dramatically weaker than a modern laptop. The gap is a design-attention gap. Nobody has wanted
all four things at the same time.

---

### End of part two

Recap.

Personality as authored variance goes back to Pac-Man and is nearly free. Thief gave us the
observable awareness ladder. Halo gave us morale thresholds and the explicit doctrine of
illusion. F.E.A.R.'s real contribution was barks, not planning. SWAT Four is the prior art for
surrender. Left Four Dead gave us the director and the relax phase. Alien gave us two brains —
perfect knowledge with no authority, authority with no knowledge. And the Close Combat lineage
gave us morale as first-class state, which is the lift almost nobody in shooters has taken.

The synthesis of those four is available and unclaimed.

Part three is the belief system and the individual soldier. It's where the abstract argument
becomes a specification you could actually build. About twenty minutes.

*End of part two.*
