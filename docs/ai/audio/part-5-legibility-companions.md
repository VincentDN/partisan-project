# PARTISAN AI — Spoken Briefing

## Part Five: Legibility and Companions

*Listening time: roughly eighteen minutes. Part five of six.*

---

Part five. The output layer, and then the hardest problem in the project.

Everything in parts three and four produces decisions. This part is about the only portion of
them the player will ever perceive. By the thesis from part one, this is where the perceived
intelligence is actually manufactured — which makes this the part most likely to be
under-budgeted, and the one where under-budgeting is fatal.

---

### The central claim

**An AI decision the player cannot perceive did not happen.**

That's not a figure of speech. For design purposes, treat unperceived decisions as having
literally zero value.

Think about what that means concretely. A flanking manoeuvre, executed perfectly, entirely out
of sight, that results in you being shot from a new angle — from your side, that is
indistinguishable from a spawn. It cost two months of squad coordination work and it returned
nothing.

And the corollary is uncomfortable and correct:

**A crudely implemented decision that is perfectly telegraphed is worth more than a
sophisticated decision that is silent.**

Which is where that effort split comes from. Four units on the decision, six on making it
visible. Most projects do nine to one and then wonder why their AI doesn't land.

---

### The telegraph rule

Every AI decision that affects the player must be observable **at least one beat** before its
effect lands. A beat is roughly half a second to a second and a half — long enough to react,
short enough not to feel staged.

Let me run through them.

**A flank beginning:** a movement bark naming a direction, plus a visible break from cover, plus
the body turning to commit.

**A grenade:** a distinct call, an overhand windup you can read in silhouette, and ideally a
warning from your own squad as well.

**A rush:** a shout, a posture drop, acceleration, weapon lowered to run.

**Suppression starting:** the *volume* of fire rises audibly before the accuracy matters.

**A squad withdrawing:** the order gets barked, then staggered movement, then the position
empties.

**Morale collapsing:** vocal pitch and breathing change, weapon handling degrades, they hug
cover more.

**About to surrender:** fire stops, there's a called plea, the weapon lowers by degrees.

**Artillery incoming:** a spotter visible or a radio call audible, and only *then* the whistle.

**Campaign adaptation:** the change appears in the world before you meet it in a fight.

---

### The predictability paradox

I mentioned this in part one and here's the mechanism properly.

Players consistently rate AI as more intelligent when it is *more* predictable at the one-to-two
second horizon, provided it stays unpredictable at the ten-to-thirty second horizon.

Why? Perceived intelligence comes from successfully modelling your opponent. A model that never
predicts correctly is indistinguishable from randomness, and randomness never gets credited as
intelligence. A model that always predicts correctly gets credited once and then becomes boring.

The sweet spot is a model that predicts the *next move* reliably and the *plan* unreliably.

And that gives you a direct, actionable design rule:

**Variance belongs at tactic selection. Never at execution.**

Which tactic the squad picks should surprise you. How they execute the tactic they picked
should not.

Execution variance reads as incompetence or bugginess. Selection variance reads as
decision-making. Same amount of randomness. Opposite interpretation. Entirely because of where
you put it.

---

### The unforgivable failure

One metric above all others: **player deaths with no telegraph in the preceding three seconds
should be zero.** Not low. Zero, as a target, treated as a bug class.

And here's the diagnostic insight that'll save you a lot of wasted time.

When a playtester says "that felt cheap," your reflex will be to check whether the AI cheated.
It almost never did. In nearly every case the actual defect is a missing or inaudible
telegraph. The AI did something entirely reasonable and legal, and the player had no way to
know it was coming.

**Fix the telegraph, not the behaviour.**

That one habit will keep you from slowly nerfing your own AI into blandness over six months of
feedback.

---

### Barks

The F.E.A.R. principle, stated properly:

**The bark is not commentary on the tactic. The bark is the tactic's user interface.**

Generation rules, and these matter.

**Generated at the squad layer**, on tactic selection and role assignment. Not by individuals
firing off ambient lines on timers. Barks have to reflect *real decisions* or the whole channel
becomes noise.

**Specific and directional.** "Above the wall, two of them" is worth ten times "Contact."
Specificity is the entire mechanism by which the AI sounds like it knows something.

**Reflecting belief, including when the belief is wrong.** An enemy confidently calling out a
position you left thirty seconds ago is the single best moment this system can produce. That's
the belief model made audible.

**Naming people.** "Stelios is hit" carries enormously more weight than "man down." Which means
your agents need names, which you want anyway.

**Urgency from state, not from the line.** The same line at high morale and at low morale has
to sound different. Breathlessness scaled by fear does an extraordinary amount of
characterisation work for almost no cost.

---

### Arbitration, and why more barks is not more legibility

One speaker per squad at a time. Priority-queued. Budget per squad. Cooldowns per line.

And here's the counterintuitive bit. Barks are an information channel with a bandwidth limit
set by **human attention**, not by audio voices. Past roughly one line every three seconds in a
fight, comprehension collapses and the player stops parsing *any* of it.

Under-speaking is recoverable. Over-speaking destroys the channel entirely.

Target something like eight to twenty barks a minute in combat. Tune it *down* until it feels
like a unit rather than a crowd.

---

### The two bark categories that carry the setting

Beyond the tactical ones, two that do narrative work.

**Lull barks.** Director relax phase. Character, grievance, homesickness, rumour. "Six months.
Six months, no pay."

This is where PARTISAN's setting lives. The garrison calling for a relief that isn't coming,
during a quiet moment, does more for your premise than any cutscene will. It costs recording
time and zero engineering.

**Recognition barks.** Act two. Ambiguous identification. "Is that one of ours? …Is that one of
ours!"

Build that category in phase two, long before it's narratively needed, so it's mature by the
time act two arrives.

---

### Language

Greek and Turkish, subtitled. And this is a legibility **asset**, not an obstacle.

Tone, direction, urgency and breath all carry fully without comprehension. The information
layer you need most in the moment survives completely.

It forces investment in **delivery** over vocabulary size, which is the correct place to spend
and the place most projects underspend. Twenty well-delivered lines with fear and urgency
variants beat two hundred flat ones.

And practically: only subtitle what the player could plausibly parse. A distant enemy shout is
directional audio with no subtitle. **The subtitle appearing is itself a proximity cue.**

---

### Silence as a channel

A bark system that runs constantly has no dynamic range.

A squad that goes quiet is manoeuvring. Train the player on that and it's free tension.

Cut comms and the player should *hear* the garrison become stupider. That's the entire payoff
of the comms mechanic and it's delivered by the audio layer.

And after a garrison position surrenders, that area goes quiet in a specific way. Earned quiet.

---

### One warning about UI

When AI state is hard to read, the temptation is to surface it in the interface. Threat
indicators. Awareness meters. Morale bars.

Resist, for a specific reason:

**Every piece of AI state you move into UI is a piece of AI state that no longer needs to be
expressed in behaviour.** And behaviour is the only channel that makes it feel like a person.
UI legibility *competes with* and *displaces* behavioural legibility.

If the player can't tell an enemy is about to break without a bar, your animation and audio
work isn't done — and the bar will let you never finish it.

The one exception worth building is an explicit accessibility mode for players who can't use
the audio channel. Build it as accessibility, never as default, so it never becomes the crutch.

---

### Companions. The hardest problem.

Right. Your own squad.

Allied AI gets judged against a standard about three times stricter than enemy AI and gets none
of the excuses. An enemy that does something odd is "interesting." An ally doing the same thing
is "broken."

Why is it harder? Go through it.

Your attention on an enemy is intermittent and under stress. Your attention on an ally is
continuous, at close range, during calm moments.

An enemy is rarely within three metres of you. An ally constantly is.

Enemy navigation failures are invisible. Every ally stutter is seen.

And you have a *positive* emotional stake in an ally, which makes it fragile.

That proximity point is the one that kills projects. Almost every allied-AI complaint across
the entire medium reduces to **physical interference**, not tactical incompetence. Players
forgive an ally who misses. They do not forgive an ally who stands in a doorway.

---

### The seven non-negotiables

Treat a violation as a release blocker.

**One. Never physically block the player.** Allied capsules don't collide with the player.
Push-through with a soft separation force, plus an active step-aside behaviour.

And do *not* try to solve this with better avoidance. Crowd avoidance between a player who
moves erratically and an ally trying to hold a tactical position produces the doorway dance,
every time, in every engine. The correct solution is to remove the constraint, not to path
around it.

The realism cost of walking through your mate is invisible. The interference cost is the top
complaint in the category. That trade isn't close.

**Two. Never be silently absent.** If a squadmate is somewhere, they're audible from there.

**Three. Never require an order to be useful.** Command is optional. And here's the corollary:
if players start using commands to *fix* bad allied behaviour, the command layer has become a
workaround and the underlying AI is the defect.

**Four. Never take the player's moment.** At an engagement climax, squadmates suppress rather
than kill. Deliberate, explicit dishonesty, and it's correct. If players can detect it, it
patronises. If it's absent, your best moments get resolved by someone else.

**Five. Always fail loudly.** Wounded squadmates call out. Stuck squadmates say so. Including
navigation failure — if an ally can't reach a position, they should say "I can't get up there"
rather than standing against geometry. That bark converts a bug into characterisation. It's not
a cheat; it's an honest statement of a real limitation, and players accept honest limitations
readily.

**Six. Never make the player babysit.** No escort-failure states in normal play. Downed rather
than dead.

**Seven. Locatable by voice at all times.** You should be able to close your eyes and know
roughly where your squad is. That's what makes a squad feel like company rather than like
luggage.

---

### Three solutions from the corpus

**BioShock Infinite's Elizabeth.** The solution to companion interference was to make her *not
a combat entity*. She doesn't occupy tactical space. She repositions freely, including
implausibly. And she looks at what the player looks at, which is cheap and enormously effective
for presence.

**The Last of Us's Ellie.** Invisible to enemies during stealth. A large, unapologetic cheat,
and completely right — the alternative is a companion who can blow your stealth through pathing,
which converts a character into a hazard.

**Left Four Dead's survivor bots.** Closest analogue to your needs. Full combat participants in
a director-paced co-op shooter. The lessons: never wander, always recoverable to the player,
hand over resources readily, and be *slightly* worse than a competent human so they don't
obviate the player.

Synthesis for PARTISAN: Elizabeth's spatial permissiveness, Ellie's stealth exemption, and the
Left Four Dead bot's deliberate competence ceiling.

---

### What makes your squadmates *militia*

They shouldn't be a generic competent squad. Five things.

**Local knowledge.** Goat-track navigation links nobody else can use. They appear above the
enemy without being told to.

**Low discipline.** The loyalty override — breaking formation to reach a wounded friend. Tuned
carefully: only for named characters, only nearby, only once per engagement, always barked
first so it reads as a choice rather than a pathing failure, and — this one is critical —
**never crossing your firing line.** A hard geometric check. An ally who walks into your shot
while being heroic turns a beloved feature into a hated one instantly.

**Scarcity.** Pooled ammunition. Audible rationing. And picking up dead garrison soldiers'
weapons mid-fight and switching, so you *hear* the weapon change.

**Local stake.** They react to places. The village. The monastery. Somebody's actual house.

**No uniform discipline.** Individual silhouettes, ragged movement, no drill.

And give them names, a village, and a position on the annexation. Maybe an hour of writing
each. That's what turns "my AI squad" into "Stelios and Yorgos" — and it's load-bearing for act
two, because your fourth pillar needs you to care what the militia think about the relief
force, which needs them to be people first.

---

### End of part five

Recap.

Unperceived decisions have zero value. One beat of telegraph, always. Variance at selection,
never at execution. Zero untelegraphed deaths, and when something feels cheap, fix the
telegraph rather than the behaviour.

Barks are the tactic's interface, not its commentary — specific, directional, belief-reflecting,
named, and budgeted, because over-speaking destroys the channel.

Keep AI state out of the UI, because UI displaces behaviour.

And companions: seven non-negotiables, of which never blocking the player is the one that
decides whether the game is liked. Push-through capsules, not better avoidance. Fail loudly.
Take Elizabeth's permissiveness, Ellie's exemption, and the L4D bots' ceiling.

Part six is the engine, the roadmap, and the honest conversation. About twenty-two minutes, and
it's the one where I tell you what this actually costs.

*End of part five.*
