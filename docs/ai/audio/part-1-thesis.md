# PARTISAN AI — Spoken Briefing

## Part One: The Thesis

*Listening time: roughly sixteen minutes. Part one of six.*

*This is written to be read aloud or fed to text-to-speech. No tables, no code, no
cross-references. Where the written compendium shows you a diagram, this describes it. If you
lose the thread, every section ends with a short recap.*

---

Right. You're walking, so I'll set this up properly before I get into anything technical.

This is a spoken version of the PARTISAN AI compendium. Thirteen volumes, about forty-nine
thousand words in the written form. Six parts here, roughly two hours end to end. You can stop
after any part and pick up later without losing your place.

Part one is the argument. Why the whole thing is built the way it is. If you only listen to
one part, this is the one, because everything in the other five is downstream of it. Part two
is the history — what forty-five years of game AI actually did, and what's worth stealing.
Part three is the belief system and the individual soldier. Part four is squads, factions and
pacing. Part five is legibility and your own AI squadmates. Part six is Unreal, the roadmap,
and the honest conversation about scope.

Here we go.

---

### The thing everyone gets wrong

You asked for AI that makes a casual PvE shooter feel like you're playing against real people.

The instinct — everyone's instinct, mine included before I looked properly — is that this
means building smarter AI. Better planning. Better tactics. Something closer to what a good
human player would actually do.

That instinct is wrong. Not slightly wrong. Wrong in a way that, if you follow it, will burn
eighteen months and produce something that feels worse than Halo did in two thousand and one.

Here's why.

A perfect-information, optimally-planning enemy is easy to build. Genuinely easy. You give the
AI the player's position every frame, you write a decent cover-selection routine, you give it
good aim, and you're done in a fortnight. And it plays terribly. It pre-aims every corner it
should pre-aim. It never over-commits. It never breaks contact at the wrong moment. It never
does a single thing you'd tell someone about afterwards.

Players have a word for that AI. They call it cheap. They never call it human.

So the target is not intelligence. The target is something else, and the whole compendium is
an attempt to say precisely what that something else is.

---

### The claim

Here it is, and I'll repeat it a few times across these six parts because it's the load-bearing
sentence:

**Perceived intelligence in game AI is a function of communication, not computation.**

Say that again. Communication, not computation. The player cannot see your algorithm. They can
only ever see behaviour. And they credit intelligence to behaviour they can predict one beat
ahead and not two.

There are four separate lines of evidence for this, and they're independent, which is what
makes it convincing rather than just a nice line.

**The first is the historical record.** Every AI that players remember as brilliant turns out,
when you look at the technical write-ups, to have been running fairly modest logic with
exceptional output. F.E.A.R., in two thousand and five, is the famous one. Its enemies were
running a planner — goal-oriented action planning — and the planner is what got written about.
But its contemporaries could produce the same flanking, the same cover use, the same
suppression. What its contemporaries did not do was *announce every single decision out loud,
specifically, with direction and intent, in the moment.* That's the difference. The
intelligence players remember was in the audio.

Halo, in two thousand and one, is the same story from the other direction. The Covenant were
running a behaviour system considerably simpler than the hierarchical planner Guerrilla shipped
in Killzone Two eight years later. And it's Halo people remember. Because the grunts panicked
visibly when you killed an elite. Because you could read a Covenant squad's state from across a
room by body language alone.

**The second line of evidence is the negative result,** and this one's important because it's
the experiment nobody meant to run. ARMA. The ARMA series has, by any objective measure, some
of the most capable soldier AI ever shipped. Genuinely modelled perception. Genuine terrain
use. Genuine suppression. And players describe it as buggy and cheating, often in the same
sentence.

Why? Because the reasoning is invisible. An ARMA soldier does something correct and
sophisticated for reasons you cannot perceive, and from your side it's indistinguishable from
arbitrariness. Capability without legibility doesn't read as intelligence. It reads as noise.

**The third is a controlled comparison,** and it's the cleanest natural experiment in the
medium. F.E.A.R. against its own sequels. Same studio, same planner, same underlying system.
What changed was the bark density and the squad coordination audio — both went down. And
perceived AI quality went down with them, in review after review, despite the AI itself being
the same or better.

**The fourth is just the mechanism.** Players infer intelligence by predicting behaviour and
being rewarded for the prediction. A system whose decisions are opaque cannot be predicted, so
it can never be credited. A system that announces its decision one beat before executing it can
be predicted, countered, and therefore respected.

Which gives you a conclusion that sounds backwards and isn't:

**Predictability at the tactical timescale is a prerequisite for perceived intelligence, not
the opposite of it.**

Sit with that one for a minute. The more reliably an enemy telegraphs what it's about to do in
the next second, the smarter it feels — provided you can't predict what it'll do in the next
thirty.

---

### What this is not an argument for

It is not an argument for shallow AI. That's the misreading and it's worth heading off.

It's an argument for spending the budget somewhere different. Three places, specifically.

On the belief model, which makes the behaviour *justifiable* — there's always an in-world
reason the enemy did what it did.

On the output layer, which makes it *legible* — you can perceive that reason.

On the morale model, which makes it *human* — the enemy has something at stake other than
your death.

And not on the planner, which makes it *optimal*. Optimal is the thing you don't want.

Rough rule for effort allocation, which I'll come back to in part five: if you have ten units
of effort for a given behaviour, four go on the decision and six go on making it perceivable.
Most projects split that nine to one, and then wonder why the AI doesn't feel smart.

---

### The six properties

So if it isn't intelligence, what is it? Six properties. The first five are general and the
sixth is specific to PARTISAN, and the sixth is the one I'd actually build the game around.

**Property one. Imperfect belief.** The AI acts on a model of where you are, and that model is
wrong in specific, plausible ways. Not randomly wrong — *plausibly* wrong. It thinks you're
behind the wall because that's where you were eight seconds ago and it hasn't seen you since.

If you build only one of the six, build this one. It's the foundation and everything else sits
on top of it.

**Property two. Legibility.** You can read intent from posture, movement, position and voice,
one beat before it happens. Covered fully in part five.

**Property three. Commitment.** Having decided something, the AI follows through past the
point where a machine would re-evaluate. Which means it can be baited. Being baitable is
enormous. It's the specific thing players describe as outsmarting someone.

**Property four. Personality variance.** Two riflemen in the same squad behave measurably
differently in the same situation. And you can tell, across a courtyard, before either of them
fires.

**Property five. Social behaviour.** They talk to each other. They coordinate audibly. And —
this is the bit that gets skipped — they react to each other's deaths differently from how
they react to their own damage.

And then property six, which is PARTISAN's:

**Property six. Mortality of purpose.** Can an enemy stop fighting for a reason other than
dying?

That's the differentiator. That's the one nobody's shipped in this shape. An enemy who runs
out of ammunition, watches his sergeant die, finds himself alone, and puts his hands up — and
you have to decide what to do about it.

It's cheap relative to its impact. And it is the mechanical form of your third pillar, the one
on the site that says nobody here is a monster. That pillar isn't flavour text. It's a
behaviour specification, and property six is what implementing it actually looks like.

---

### Recap one

Before I move on. Four things so far.

One: smarter AI is the wrong target, and chasing it is actively harmful.

Two: perceived intelligence comes from communication, not computation — four independent lines
of evidence.

Three: this means predictability at the one-second scale, unpredictability at the thirty-second
scale.

Four: six properties. Imperfect belief, legibility, commitment, personality variance, social
behaviour, and mortality of purpose. Belief is the foundation. Mortality of purpose is the
differentiator.

---

### The test you're actually running

You need a way to know if this is working. Not a metric — a test you can apply on a Sunday
afternoon with one person in the room.

It isn't a Turing test during the fight. It's a Turing test in the *retelling*.

Here it is. Call it the after-action test.

> A player who has just finished a fight should be able to narrate it as a story with agents in
> it.

Something like: "They lost the sergeant, and the two on the left pulled back to the terrace
wall, but the one in the customs house didn't get the word and sat there for another minute."

That's the target sentence. Listen for the shape of it.

And the failure condition is very specific. If the player can only narrate *their own* actions
— I went here, I shot this, I got flanked — then the AI has failed, regardless of how good the
code is. The enemy wasn't a character. It was weather.

There's a cheaper test you can run weekly, and it's diagnostic rather than pass-fail.

Turn off all AI dialogue. Play a fight in silence.

If the AI stops feeling intelligent, then the intelligence was living in the dialogue and the
behaviour underneath is thin.

If it stays intelligent but goes cold — you can still read what they're doing, it just isn't
enjoyable any more — then you have real behaviour and you need better voice work.

Both results are useful. You want the second one. If you get the first one, you know exactly
what to fix, which is worth a lot on its own.

---

### The setting has already done half the work

This is the part I'd want you thinking about on the walk, because it's the bit that makes
PARTISAN specifically a good vehicle for this rather than a generic one.

Your constraint sheet — the one on the site — reads, sideways, as an AI design document. It's
almost suspiciously well-suited.

Go through it.

*No drones. No thermal. No encrypted mesh.* That means information scarcity is **canon**. The
belief model isn't a performance concession or a design compromise. It's the setting. Nobody
will ever ask why the garrison doesn't just see you, because the fiction has already answered
it. That is worth an enormous amount. Most games that want imperfect enemy knowledge have to
fight their own premise to get it.

*Comms are phones with patchy coverage, VHF off the boats, runners, and church bells.* That's
a physical, breakable information network. Which means cutting communications is a player verb.
A squad that loses contact keeps acting on a stale belief. That's drama, nearly for free, and
it falls straight out of the fiction.

*One coast road, cuttable in four places.* Navigation becomes a design space instead of a
solved problem. Denying a path means something. A flank has a cost you can see on the map.

*No armour, no flat ground.* Small numbers of agents, steep terrain. Cheap to run, expensive to
look at — which is exactly the right trade for one person.

*Ammunition measured in rounds, not crates.* The AI has a resource state the player can read.
Rate of fire becomes a tell. A garrison running low fights visibly differently.

And *nobody here is a monster* — which, as I said, makes surrender and rout and negotiation
required systems rather than stretch goals.

So here's the consequence, and this is the single most useful reframing in the whole
compendium:

**Do not build an AI that wants to kill the player.**

Build an AI whose agents want to survive, hold a position, get paid, or get home — and for whom
killing you is instrumental to one of those.

That one sentence changes what you build. It's the difference between a target that shoots back
and a person who'd rather be somewhere else.

---

### What casual actually constrains

Last thing in part one. You said casual PvE. That's a real constraint with teeth, and it's
worth being precise about what it binds, because it mostly *doesn't* bind the agent AI. It
binds the pacing layer and the difficulty model.

Seven invariants. I'll say them plainly and they recur throughout.

One. A death must be explicable in one sentence by the player who died.

Two. Failure costs resources or ground. Never repeated time.

Three. Exploration is never punished with a wipe.

Four. Being detected opens a different fight. Never a fail state.

Five — and this is the big one — difficulty scales the *information and the time* the AI has.
Never its health, never its damage.

Six. The player's competence is the fantasy. The AI's job is to make that competence visible,
not to contest it evenly.

Seven. A losing player gets quiet help. A winning player gets quiet pressure. Neither is ever
announced.

Number five is the most violated convention in the entire genre and the most important one
here. I'll argue it properly in part six. The short version: bullet-sponge difficulty destroys
property one, wrecks your ammunition economy, and is the fastest available way to make good AI
feel fake.

---

### End of part one

Where we've got to.

The target isn't smart AI, it's communicated AI. Six properties, with belief as the foundation
and mortality of purpose as your differentiator. Two tests — the after-action narration and the
silent-dialogue diagnostic. A setting that's already done half the design work by making
ignorance canon. And seven casual-design invariants that mostly constrain pacing rather than
behaviour.

Part two is the history. Forty-five years, about forty titles, what each one actually did
mechanically, and specifically what's worth taking and what to leave behind. It's the longest
part — about twenty-five minutes — and it's the one that'll give you the most to think about
while you walk.

*End of part one.*
