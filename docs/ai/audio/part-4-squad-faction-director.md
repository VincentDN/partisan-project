# PARTISAN AI — Spoken Briefing

## Part Four: Squads, Factions and the Director

*Listening time: roughly twenty-one minutes. Part four of six.*

---

Part four. Three layers, going upward. The squad, which is where perceived intelligence
actually lives. The three faction brains, which is where your story lives. And the Director,
which is where "casual" lives.

---

### The squad object

A squad owns: the merged belief of everyone in it, the current tactic, role assignments, a
cohesion anchor which is usually the leader, a shared ammunition pool, and a bark budget.

It ticks about four times a second, and it **persists through agent deaths**, with succession.
The squad is the character. The men in it are its state.

---

### The tactic library

Eighteen tactics. Hand-authored. Each with preconditions, role slots, an abort condition, a
signature set of barks, and — importantly — **an authored shape on the ground.**

That last one is why this is a content problem and not an algorithm problem, and treating it as
a content problem is what keeps it shippable by one person.

Let me give you the main ones.

**Fix and flank.** Needs four effective men, a flank route that the environment query system
can actually find, decent belief confidence, decent morale. Base of fire holds and shoots. The
flank element moves wide. It's timed. It aborts if the flank element takes heavy losses or if
confidence in the belief collapses.

**Bound forward.** Alternating pairs. One moves, one shoots. Needs advantage and low
suppression.

**Bound back.** Same thing reversed, toward the cohesion anchor. Triggered by casualties or
falling morale.

**Suppress and wait.** Low on ammunition or no flank route available. Pin, call for help, don't
commit. Underrated — this is what a real unit does most of the time.

**Search pattern.** Confidence below zero point four. Sweep the belief radius. Confidently
wrong, as discussed.

**Hold cut point.** Garrison-only. Static, mutually supporting, uphill where possible.

**Rush.** Zealot leader, close range, high morale. Reckless and memorable.

**Withdraw to anchor.** Leader dead or morale collapsing. Deliberately disordered.

**Surrender.** Isolated, no ammunition, morale at the floor, and an offer available. The hard
one, and the important one.

**Ambush.** Militia only. Requires local terrain knowledge and a predicted route. Patient,
prepared, above the road.

**Fade.** Militia only. Outmatched, so break contact uphill and don't trade.

**Cordon.** Relief force only. Slow, methodical, encircling.

**Call for fire.** Needs an indirect asset and a belief less than forty-five seconds old.

**Recover casualty.** Someone's down, a loyalty check passes, and — critically — it doesn't
cross the player's firing line.

**Demand surrender.** Enemy morale visibly low, close range. Speak first, shoot second.

Those last two, recover casualty and demand surrender, are your pillar-three tactics. Build
them even if the set has to shrink elsewhere.

---

### Selection, and the most important number in the squad layer

Score every tactic on every squad tick. Preconditions, personality mix, morale, ammunition,
terrain. Pick the highest.

**And then hold it for a minimum of about eight seconds.**

That minimum commit time is the entire source of property three. Without it, the squad flickers
between individually good decisions and reads as a computer re-evaluating. With it, the squad
can be **baited** — and being baitable is the specific thing that players describe as
outsmarting someone.

Eight seconds. That's the number. And when you're profiling later and you're tempted to tune it
down for responsiveness, don't.

There's one more thing about the scorer worth mentioning, and it's a tooling point that I'll
expand on in part six: **make the scorer record its own reasoning.** Not just "chose fix and
flank" but "chose fix and flank, scored zero point seven one, because a flank route existed,
plus zero point three; belief confidence was zero point six eight, plus zero point two; four
effective, plus zero point one five — and suppress-and-wait scored zero point six four and
would have won if ammunition had dropped."

That costs a day. It saves weeks. Build it in phase one, not later.

---

### Cohesion, and why degradation should look like bad execution

A squad has a cohesion value. It falls with distance from the anchor, with leader loss, with
communication failure.

Now — here's the design decision that matters. **Do not model low cohesion as a hidden penalty
that quietly worsens accuracy.**

Model it as **bad execution of a good plan.** The timing slips. The flank goes early. Somebody
doesn't get the word to fall back and sits there on his own for a minute.

That's exactly what a real unit under stress looks like. And crucially, it's what the player
can *read*. A hidden accuracy penalty is invisible and therefore worthless. A flank that goes
thirty seconds early because the sergeant is dead is a story.

---

### Three asymmetric brains

Your three-faction structure is an enormous AI gift and you should spend it.

Here's the test: **if a player can't tell which faction they're fighting from behaviour alone,
with the art stripped out, this has failed.**

**The garrison. REDFOR.**

Doctrine: hold the harbour, the customs house, the road. Do not pursue uphill.

Highest discipline, lowest morale. Trained, drilled, and abandoned. Nobody's paid them in six
months and they know the relief isn't coming.

Excellent on the road and in the town. Poor above the treeline — and you encode that *literally*
as a navigation cost multiplier, not as a scripted boundary. They pay about four times the cost
to move through scrub. Which means they *can* come uphill, but they almost never will, and when
the tactical value is high enough that they do, it reads as a decision rather than a fence.

That's worth dwelling on. A scripted boundary is discoverable and exploitable, and the moment a
player finds it the AI looks stupid forever. A cost gradient isn't discoverable as a rule. It's
discoverable as a *tendency* — which is what doctrine actually is.

They're the only faction with artillery, and the artillery fires on **stale beliefs**, which is
both historically right and a superb readable mechanic. You can watch shells land where you
were.

Their comms are a fixed network with physical nodes you can cut.

And here's the thing: **morale is the win condition.** The campaign objective isn't to kill the
garrison. It's to break it. Every system should be readable as pressure on that one number.

They adapt across the campaign, slowly. Keep attacking at night, you get more flares and
standing patrols. Keep ambushing one cut point, that point gets fortified and the other three
get thinned. And every adaptation is visible in the world *before* you meet it in a fight.
Adaptation you can see coming is a compliment. Adaptation you discover by dying is a punishment.

**The militia. GREF. Your side.**

Highest local knowledge — goat tracks and ambush positions and navigation links that literally
no other faction can traverse.

Lowest discipline. They break a tactic to save a neighbour. That's the loyalty override and
it's a feature, tuned to be charming rather than infuriating.

Scarcity is their central mechanic. Pooled squad ammunition. They ration. They tell you when
they're low. And they pick up garrison weapons mid-fight and switch, visibly and audibly —
which does more work for your scarcity pillar than any interface element could.

**The relief force. BLUFOR.**

This is the clever one and it carries your fourth pillar.

**Best tactics, worst knowledge.** Highest discipline, best equipment, real combined arms — and
a belief model that decays *fastest of the three* off the road, because they have never seen
this island in their lives.

They're mechanically inverted from the militia. And the player should feel that difference
within a single engagement.

Naval gunfire as a director-mediated asset — enormous, slow, and dependent on a spotter you can
remove.

And restraint behaviour. Their rules of engagement are different. They call for surrender
before firing. They hesitate against a target they can't identify.

In act two, when you may be on the wrong end of them, that hesitation is the entire emotional
payload of your fourth pillar — expressed as AI behaviour rather than as a cutscene. That's
worth a lot. A cutscene tells you they're not monsters. A soldier hesitating because he can't
tell what you are makes you feel it.

---

### The Director

Left Four Dead, adapted for scarcity instead of hordes. Call it the Quartermaster.

**What it measures.** An intensity value, accumulating from damage taken, near misses,
suppression, threat proximity, squadmate losses, ammunition state, and time under fire. It
decays when you're safe.

**What it controls.** Never an agent's actions. Only these:

Reinforcement timing and route — the primary pacing tool.

Patrol density.

Belief hints with fabricated sources — rarely, capped, always with a visible cause.

**Scarcity placement** — ammunition, medical supplies, a working boat. That's the
PARTISAN-specific lever and it's a good one.

Weather, time of day, sea state. Slow, atmospheric, powerful.

Unscripted events — a goatherd, a bell, a broken-down truck, a wounded man calling out.

And permission for enemies to spend mistakes at intensity lows.

**The curve.** Build-up, peak, **relax**, rebuild.

And the relax phase is not empty time. That's the mistake everyone makes. The relax phase is
when the AI talks to itself. It's when you hear the garrison calling for a relief that isn't
coming. It's when a wounded man gets dragged off. It's when someone complains about not being
paid for six months.

**Ambient AI behaviour during the lull is what makes the enemy feel like a population rather
than a spawn table** — and it costs almost nothing, because nothing is shooting. That's your
best value-per-hour in the entire director.

Minimum relax duration, about forty-five seconds. Enforce it. The temptation to shorten it when
the game feels slow is always wrong; a game with no troughs has no peaks.

---

### What casual actually requires of the director

Back to those seven invariants from part one, now with the mechanism.

Never punish exploration. Wandering off should find content, not a squad wipe.

Legibility over depth, always. A player who doesn't understand why they died had a bad time,
regardless of how sophisticated the reason was.

Graceful failure. Losing a fight costs ground, ammunition, or a squadmate's health. Not ten
minutes of replay.

Comeback mechanics — the director tops up scarcity after a loss, silently.

No stealth tax. Being spotted opens a different fight, never a failure state.

And the big one, which I'll give you the full argument for now.

**Difficulty moves the belief model, not the health bars.**

Easier means: beliefs decay faster. Uncertainty grows quicker. Reaction times lengthen. The
mistake budget widens. Comms fail more often. Morale floors rise so enemies break sooner.

Harder means the reverse — with one hard limit: **comms reliability never exceeds one hundred
percent.** Hard mode makes the enemy slower to *forget*. Never faster to *know*. The moment you
give hard-mode enemies better-than-normal coordination, you've reintroduced omniscience through
the back door.

And enemy health and damage stay at exactly one point zero on every difficulty. Put those rows
in the table with one point zero written in them, so that it's visible and deliberate rather
than forgotten.

Why does this matter so much? Three reasons. Bullet-sponge enemies make your weapons feel bad.
They destroy the ammunition economy, which means your scarcity pillar becomes a difficulty tax.
And most importantly, a player on Easy shouldn't be fighting *weaker soldiers*. They should be
fighting soldiers who are **worse at finding them, slower to react, and quicker to break.**
That's a different fight, not a discounted one.

---

### Dynamic difficulty

Yes, but narrow, silent and bounded.

A struggling player gets quieter scarcity top-ups, slightly longer relax phases, a fractionally
wider enemy mistake budget.

A dominating player gets shorter relax phases, earlier reinforcement, a tighter mistake budget.

Never adjusted mid-engagement. Only between them.

Never announced. Never in the options menu.

And bounded hard — no parameter moves more than about twenty-five percent from its difficulty
setting, so a player on Hard can't be silently dropped to Easy.

Unbounded adjustment punishes success, players detect it, and they resent it. That's the
classic rubber-band complaint. Bounded and silent smooths the tail of the distribution without
ever becoming the player's mental model of the game.

---

### End of part four

Recap.

The squad is the unit of perceived intelligence. Eighteen authored tactics with authored ground
shapes. Minimum commit of eight seconds, which is what makes the AI baitable. Cohesion
degradation expressed as bad execution, not hidden penalties. A scorer that records its own
reasoning.

Three genuinely different brains: the garrison with discipline and no morale and a cost
gradient that reads as doctrine; the militia with local knowledge and no discipline; the relief
force with the best tactics and the worst knowledge, whose hesitation carries your fourth
pillar.

And a director that never touches an agent, shapes a curve with a mandatory trough, uses the
trough for character, and expresses difficulty entirely through information and time.

Part five is legibility and your own squadmates — the output layer, and the hardest problem in
the project. About seventeen minutes.

*End of part four.*
