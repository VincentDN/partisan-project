# PARTISAN AI — Spoken Briefing

## Part Six: Engine, Roadmap and the Honest Part

*Listening time: roughly twenty-three minutes. Part six of six.*

---

Part six. Unreal, the build plan, and then the conversation about what this actually costs.

If you've got a long walk left, this is the part to think hardest about.

---

### The engine-generation problem

Start here, because it changed the plan and it's recent enough that you may not have taken it
in yet.

Three facts, as of September twenty twenty-six.

**Unreal five point eight shipped in June, and it is the last planned major Unreal Five
release.** Bug fixes and regressions from here. No more feature releases on the five line.

**Unreal Six was announced in May and detailed at State of Unreal in June.** It unifies Unreal
with the Fortnite editor toolset, moves the core gameplay programming model to Verse,
introduces something called Scene Graph, and begins a sunset of Blueprints and Actors — both
retained in early versions, but on the way out.

**Unreal Six Early Access targets the end of twenty twenty-seven.**

Now do the arithmetic. A roadmap starting now, at thirteen to twenty-two solo months, finishes
somewhere between late twenty twenty-seven and mid twenty twenty-nine. That window straddles
the transition exactly.

Three consequences.

**One: pin five point eight and stay there for the whole build.**

And this is genuinely good news rather than a constraint. For the first time in the engine's
history you get a *frozen target*. There's no five point nine to chase. No feature to wait for.
No upgrade tax. The traditional solo-developer failure — spending a fortnight a year upgrading
and fixing what the upgrade broke — is now optional rather than forced.

Do not take Unreal Six Early Access mid-project. An Early Access engine, plus a solo developer,
plus a stateful AI codebase is three sources of instability stacked on each other.

**Two: write the AI in C++, not Blueprints.**

Three independent reasons and any one would be enough. Correctness — the belief model and the
morale accumulators are stateful, tick-ordered and numerically sensitive, which is exactly where
Blueprint's execution model makes bugs invisible. Performance — per-agent per-tick work in
Blueprint runs ten to fifty times the cost, and AI is the tick-heaviest thing in your game.
And migration — a twenty-thousand-node Blueprint AI is a liability in twenty twenty-eight. Twenty
thousand lines of C++ is a port.

**Three, and this is the most important structural decision in the whole compendium: split the
engine-agnostic eighty percent from the engine-coupled twenty percent.**

Sort every system into two buckets.

Engine-agnostic: belief store and decay, the morale and suppression maths, personality
profiles, tactic scoring and selection, role allocation, squad cohesion, the director's
intensity model, the adaptation ledger, bark arbitration, and all your tuning data.

Engine-coupled: perception gathering, navigation queries, environment queries, animation, audio
playback, physics, and Mass integration.

Write the first bucket as plain C++ structs and free functions behind a narrow interface. No
UObject inheritance. No GetWorld. About fifteen methods — has line of sight, path cost, terrain
concealment, drain stimuli, radio coverage, sound attenuation, now, random, issue order, speak
bark, log. That's most of it.

**And here's the thing: the payoff is immediate, not deferred.** The Unreal Six portability is
a free side effect. The *actual* reason to do it is that it's what makes a headless test
harness possible — and the headless harness is the single largest velocity multiplier available
to one person working alone. I'll come back to that.

---

### Engine choices, quickly

**StateTree over Behaviour Trees** as the primary individual structure. Your agents are
state-dominated, not task-dominated — morale, suppression, awareness, ammunition, injury are
all persistent states that modulate everything. Expressing "suppressed and low on ammunition
and the leader is dead" in a behaviour tree means a thicket of decorators and genuinely
difficult abort semantics. StateTree maps directly instead of translating. Keep behaviour trees
for small self-contained sub-behaviours.

And keep your StateTree assets small. The failure mode is the two-hundred-state god-tree, which
is as unreadable as the five-hundred-node behaviour tree it replaced.

**AI Perception as a stimulus source only.** The default component gives you exactly the thing
this whole compendium exists to prevent — I can see the pawn, therefore I have its pointer,
therefore I know where it is, continuously and exactly. Take the stimuli, write them into the
belief store, and *discard the actor reference.*

And add an automated build test that greps the AI module for forbidden symbols and fails on
player-transform access. It sounds excessive. It's the highest-leverage piece of process in the
project.

**Environment Query System with custom generators.** The stock library won't express your
island. You'll want generators for terrace edges, ridge lines, road offsets, flank arcs — and
one called belief perimeter, which generates a ring of points at a radius equal to the belief's
uncertainty. That one's load-bearing. Search behaviour that queries the *belief* rather than
the player's actual position is what makes an AI look like it's genuinely hunting rather than
pretending to.

**Navigation with faction cost multipliers** — as discussed in part four. Militia pay one point
one to move through scrub. The garrison pays four. That's doctrine as a data table.

**The four cut points as dynamic navigation modifiers.** Cut one, the mesh rebuilds, the
garrison's route plans invalidate, and their next patrol visibly takes a longer way round.
That's one of the strongest player-verb-to-AI-response loops available to you.

**Gameplay Ability System for status** — morale, suppression, wounds, fear effects, the
leader-present bonus. But keep the *decisions* out of it. Put state in GAS and decisions in the
agnostic library reading that state. The moment ability activation becomes your control flow,
you've got a second invisible behaviour tree living in your effects system.

**Mass Entity for background population** — villagers, distant patrols, the fishing fleet. But
late. Phase six. It's a genuine paradigm shift from actor-oriented Unreal and someone who
starts there will spend two months on infrastructure before seeing a fight.

**And three rejections**, recorded so they don't get re-proposed in six months.

No GOAP. Authored tactics are cheaper and more legible, and F.E.A.R.'s achievement was the bark
layer, which you can take without the planner.

No hierarchical task network implementation. Same reasoning; the mental model is free.

No runtime machine learning. Three reasons: it's unauthorable, so you can't ask a trained
policy to be more *legible* or to make a specific plausible mistake — and every property in the
thesis is an authoring requirement. It's undebuggable, so "why did it do that" has no answer,
which is fatal for one person. And it optimises the wrong objective — reinforcement learning
converges on *winning*, and you want behaviour that's satisfying to fight, which is nearly the
opposite.

The one legitimate use is offline: train something, bake it to a curve, ship the curve, delete
the model. Don't schedule it.

---

### The headless harness

I want to spend a minute on this because it's the thing I'd most want you to actually do.

Take that engine-agnostic library, compile it as a standalone executable against a stub world
interface backed by a simple grid. No rendering. No Unreal. No editor.

What that buys you:

Ten thousand engagements overnight on a laptop. Which means statistical confidence on tuning
changes that would otherwise take months of manual play.

Deterministic replay from a seed, so bug reports reproduce.

Parameter sweeps — "at what belief decay rate does the search behaviour stop feeling random"
becomes an empirical question rather than a guess.

Regression detection. A tuning change that quietly breaks your surrender rate gets caught the
same night.

Morale runaway detection — the whole-garrison-routs-at-once failure, found without a playtest.

And continuous integration. Every commit runs five hundred engagements and fails on metric
regression.

For a solo developer working evenings, that's several extra pairs of hands. And there's a
motivational angle too: on weeks where the business takes everything, the project still
produces a report on Monday morning. That continuity matters more than it sounds.

What it *cannot* tell you: anything from part five. It has no audio, no animation, no player
perception. It validates decisions and never legibility. A harness-green build can still feel
terrible.

---

### The phases

Eight phases. Each has one hard exit criterion, and the exits are deliberately *behavioural*
rather than technical. "The system works" is not an exit. "A person reacts this way to it" is.

**Phase zero. The Room. One to two months.**

One terrace, one stretch of road, grey box, three agents, no art.

The agnostic library and the world interface. The belief struct, store, decay and chokepoint.
Perception as stimuli. The forbidden-symbol build test. **The belief visualiser** — debug
spheres sized by uncertainty, coloured by source, drawn live in the world. The awareness ladder
with placeholder tells. One tactic. Seeded determinism. And a minimal harness.

Exit: you can stand behind a terrace wall and watch three agents shoot confidently at where
they *think* you are, be wrong, and see exactly why, on screen, live.

**This phase is the whole project in miniature. If watching it isn't already interesting, stop
and diagnose.** A weak phase zero doesn't get rescued by phase four. Everything downstream
multiplies it.

**Phase one. The Squad. Two to three months.**

Squad object, merged belief, the four comms channels, the tactic scorer with reason recording,
six core tactics, role allocation, the bark system with arbitration, custom environment
queries, faction navigation costs.

Exit: the after-action test passes with you. You can narrate a fight you just had as a story
with agents in it.

**Phase two. The Person. One to two months.**

GAS integration. The full morale model. Suppression with visible rate-of-fire collapse. The
broken state — rout, freeze, surrender. The surrender animation and the acceptance interaction.
Five archetypes. Belief-coupled aim error. The mistake budget. The self-preservation override.
The silhouette sense. Recognition barks, seeded early. And the nearby-death reaction animation,
which is routinely omitted and is what makes the entire morale system visible.

Exit: an enemy surrenders and you feel something about it.

**Phase three. The Director. One to two months.**

Intensity, the four-phase curve with minimum durations, reinforcement, scarcity, the lull
behaviour, belief injection with fabricated sources, the difficulty parameter set, bounded
silent adjustment, and a director heads-up display that shows decisions *with reasons*.

Exit: a twenty-minute unscripted session has a shape, and a fresh player describes its peaks
without being prompted.

**Phase four. The Three Brains. Two to three months.**

Faction command, knowledge maps, the cuttable comms topology, the influence grid, the three
doctrines, campaign adaptation, and the dynamic cut points.

Exit: a blind test where players identify the faction from behaviour alone, with the art
stripped, materially better than chance.

**Phase five. The Squad Beside You. Two to three months.**

All of part five's companion work.

Exit: zero blocking incidents across a full session, and a tester refers to a squadmate by name
without being prompted.

**Phase six. The Island. Two to four months.**

Mass Entity, background population, the promotion boundary, navigation invokers, boats.

Exit: the island feels inhabited when nothing is shooting.

**And phase six is the most deferrable thing in the plan.** If scope pressure arrives, this is
what goes. Knowing that in advance removes a category of guilt.

**Phase seven. The Turn. Two to three months.**

The relief force as an ambiguous presence. Restraint and hesitation. Morale systems applied to
your own side. Non-combat resolution.

Exit: the fourth pillar lands, through behaviour, without a cutscene.

**Phase eight. Legibility polish. Ongoing. Never finished.**

Per-profile motion matching. Real voice work in Greek and Turkish. The telegraph audit against
every logged death, monthly, forever.

---

### The numbers

Phases zero to two — the thesis slice — four to seven solo months.

Phases zero to five — a complete combat game's AI — nine to sixteen.

Phases zero to eight — the full design — thirteen to twenty-two, or more.

Solo months at hobby pace. Evenings and weekends around the business. AI only. Before any art,
content, level design, weapons, interface, narrative, or audio beyond the bark engineering.

That's not a discouraging number. It's a planning number. And it's the input to what I want to
say next.

---

### The honest part

Two halves. What's real and what isn't.

**What's real.** The thesis is correct and the historical record supports it. The architecture
is sound and buildable by one competent person. And the specific combination — belief modelling,
plus morale, plus surrender, plus legibility, in a casual PvE shooter with a scarcity economy —
is a genuine gap that nobody has shipped.

F.E.A.R. had the legibility without the morale. Close Combat had the morale without the
legibility or the first-person immediacy. Left Four Dead had the pacing without either. The
synthesis is available and unclaimed.

And PARTISAN's setting fits it better than almost any premise you could have picked. The
constraint sheet makes information scarcity *canon*. Nobody will ask why the garrison doesn't
just see you. Your own production note — that twenty-twelve irregular warfare is the most
photographed conflict aesthetic of two decades, so reference is everywhere — holds for AI
reference too.

**What isn't real.** "Award-winning and genre-defining" is an outcome, not a specification, and
no plan can contain it.

The comparisons are instructive rather than discouraging. F.E.A.R. had a team and a publisher.
Left Four Dead had Valve. Alien: Isolation had on the order of a hundred people and several
years, and its AI was one system among many.

None of that means a solo developer can't build something genuinely remarkable. It does mean
the honest version of this project is **a vertical slice that demonstrates the thesis**, not a
shipped game. And that isn't a consolation prize.

---

### The recommendation

Treat phases zero to two as the project.

Four to seven solo months. One terrace. One stretch of road. One squad. Three or four minutes
of play. Belief, morale, barks, surrender.

If that slice makes people say *"the AI in this is doing something I haven't seen before"* —
then you've proved the thesis, you have something genuinely showable, and you've earned the
right to decide whether phases three to eight are worth another year and a half of evenings.
With much better information than you have today.

If it doesn't, you've spent four to seven months and learned the most valuable thing in
thirteen volumes.

Either outcome is a good outcome. That's what makes it the right first commitment.

---

### And the second return

One more thing, and then I'll stop.

This compendium is content.

The Collective is explicitly a hobby now — content and portfolio value, no revenue targets. And
a rigorous, sourced, argued design document that traces a line from Pac-Man's four targeting
rules, through Halo's morale thresholds and F.E.A.R.'s barks and Alien's two brains, to a
specific unbuilt game — that is publishable material in its own right.

A devlog series, one volume at a time. A video essay or a series on the Kaiser Cat Cinema
channel, which is exactly the kind of thing that channel exists for. The artefact that makes
PARTISAN's hidden site worth showing to someone. A credible answer to "what have you been
working on."

That return is available right now, from the document as it stands, and it isn't contingent on
a single line of C++. Realistically it's also the highest expected-value output in the entire
plan on a per-hour basis.

Which raises the open question I'd leave you with on the rest of the walk, and it deserves a
real decision rather than a drift:

**Is the AI the product?**

Not the game. The thinking about the game, published well, plus a four-minute slice that proves
it. That might be a better-shaped project than the one you started describing.

Worth turning over.

---

### End of the briefing

Six parts. The thesis — communication, not computation. The corpus — forty-five years, and a
synthesis of four ideas nobody's combined. Belief and the individual — never the truth,
confident wrongness, morale as first-class state. Squads, factions and pacing — eight-second
commitment, doctrine as a cost table, difficulty as information. Legibility and companions —
unperceived decisions have zero value, and never block the player. And the engine and the plan
— pin five point eight, split the agnostic eighty percent, and treat phases zero to two as the
project.

That's the lot. Enjoy the rest of the walk.

*End of part six. End of briefing.*
