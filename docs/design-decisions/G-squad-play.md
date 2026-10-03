# G · Play as the whole squad (WP-S20 built, S21 verification pending)

In Partisan you are not one hero but all of them. One rebel is yours at a time; the others follow orders. When yours
falls you take another, and you can swap on purpose. Principles: [00-principles.md](00-principles.md).

## Core rules (WP-S20)

### TAC-G-01 · You control one rebel at a time; the rest are your squad
- Status: built  ·  Packet: WP-S20
- Decision: Every rebel is a full character with a name, loadout, health, ammo and (later) levels. Exactly one is the
  active rebel (the one WASD and the mouse drive). The others obey orders (section A, TAC-A-13).
- Why: It is the owner's stated fantasy ("you don't play as one character but as all of them") and it fixes the
  weakness of a single avatar: dying is a swap, not a restart. It also makes the squad itself the thing you manage.
- Alternatives rejected: One hero plus AI helpers (the current prototype); direct control of several at once (not
  possible with one keyboard and mouse); an RTS camera with no avatar (loses the shooter feel).
- Cost / risk: The code assumes one `sim.player`. Many tests, the HUD and the camera follow it. We keep `sim.player` as
  a getter for the active rebel so existing code and tests keep working.
- Cost to change: Medium now, high after section C (inventory is per rebel).
- Revisit if: Playtesters want to control two at once (use the order system instead).
- Owner feedback: —

### TAC-G-02 · The player pointer is an alias; ids belong to characters
- Status: built  ·  Packet: WP-S20
- Decision: `sim.active` holds the controlled rebel; `sim.player` returns it. The convoy's partisan `player` becomes a
  named rebel (it keeps the id `player` for old tests and level data, with a display name). New levels use rebel ids
  from the roster.
- Why: A big-bang rename of `player` everywhere would break the seeded fingerprint and the tests for no gain. An alias
  keeps every old test and level working while the new code uses `active`.
- Alternatives rejected: Renaming everything now (risky); copying state on swap (bug magnet).
- Cost / risk: Two names for one thing until the old one is retired.
- Cost to change: Low.
- Revisit if: The alias confuses new contributors; then rename in one mechanical commit.
- Owner feedback: —

### TAC-G-03 · The mission is lost only when every rebel is down
- Status: built  ·  Packet: WP-S20  ·  Supersedes: TAC-A-11
- Decision: "The active rebel died" is a swap. The mission is lost when no rebel can act (all down), or when a required
  `protect` objective fails.
- Why: Without this, swapping on death would be cosmetic. It also gives levels a meaningful squad-loss pressure
  (the cave defence is "how many can I keep standing until dawn").
- Alternatives rejected: Lose when the first rebel dies (defeats the premise); never lose (no stakes).
- Cost / risk: Missions become easier. We compensate with consequences: a rebel who goes down is wounded for the next
  mission (TAC-D-02), and levels can protect a named rebel.
- Cost to change: Low.
- Revisit if: The harness (WP-S16) shows win rates too high.
- Owner feedback: —

### TAC-G-04 · Each rebel keeps its own state: loadout, health, ammo, reloads, order
- Status: built  ·  Packet: WP-S20
- Decision: Nothing is shared between rebels except the squad stash (section C). Swapping does not heal, reload or
  reset anything.
- Why: Differences between rebels are what make swapping interesting (Mila's SVD, Dragan's PKM), and what makes
  looting for a particular rebel meaningful. It also avoids a cheat where you swap to dodge reloads.
- Alternatives rejected: Shared health (no stakes per rebel); shared ammo (hides logistics).
- Cost / risk: A rebel left mid-reload or mid-search is vulnerable when you leave them.
- Cost to change: Low.
- Revisit if: Players find per-rebel ammo tedious.
- Owner feedback: —

### TAC-G-05 · The rebel you leave becomes AI-controlled and keeps what it was doing
- Status: built  ·  Packet: WP-S20
- Decision: On a swap, the previous rebel keeps its standing order if it had one. If it was player-controlled, it
  holds its position facing where it aimed, and defends itself (fires on visible enemies, takes cover if pinned).
- Why: The least surprising behaviour: nobody wanders off or stands in the open. Holding keeps the squad's layout
  that the player created.
- Alternatives rejected: Auto-follow (drags the squad around); idle freeze (stands in the open, ignores fire).
- Cost / risk: A rebel left in a bad spot stays there. That is the player's responsibility, and the order system lets
  them fix it.
- Cost to change: Low.
- Revisit if: Players want a default order per rebel.
- Owner feedback: —

### TAC-G-06 · Death forces a swap; voluntary swaps have a short cooldown
- Status: built  ·  Packet: WP-S20
- Decision: When the active rebel dies, the game enters the swap sequence immediately (TAC-G-08) and you must pick a
  living rebel (it picks the nearest one if you do nothing for 3 s). A voluntary swap has a cooldown of 3 seconds of
  game time.
- Why: The forced swap is the point of the feature. The cooldown stops frame-perfect swap-dodging (swapping every
  second to avoid fire), which would turn the squad into a single immortal rebel.
- Alternatives rejected: No cooldown (abusable); a long cooldown (frustrating); a cost in health (confusing).
- Cost / risk: Three seconds is a guess; it needs playtesting.
- Cost to change: Trivial (one number).
- Revisit if: Players feel locked into a bad rebel, or abuse it.
- Owner feedback: —

### TAC-G-07 · Order selection never includes the rebel you control
- Status: built  ·  Packet: WP-S20
- Decision: Tab cycles through the other living rebels; the active rebel is excluded and is also what Follow follows.
- Why: Orders to the rebel you are driving make no sense. After a swap the old active becomes selectable and the new
  active leaves the list.
- Alternatives rejected: Letting orders override driving.
- Cost / risk: Selection state must be cleaned on swap.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## The swap experience (WP-S21)

### TAC-G-08 · The swap is a short, slow-motion zoom-out where you hover and take control
- Status: planned  ·  Packet: WP-S21
- Decision: Pressing the switch button (Q) slows the simulation to about 15% speed and the camera zooms out to frame
  every living rebel. Hovering a rebel highlights it and shows its name and loadout; clicking it (or pressing 1 to 4)
  takes control, and the camera glides in to it while time returns to normal. Total: about a second and a half.
- Why: This is the owner's spec. Slow motion makes the choice feel tactical rather than a menu; the zoom-out shows the
  whole squad so you pick by position and situation; hovering is the quickest possible choice; the glide keeps your
  orientation.
- Alternatives rejected: A full pause with a menu (kills the momentum and the drama); instant cycling with a key
  (no information about where each rebel is); portraits (small and need art).
- Cost / risk: Slow-motion is a sim time scale, which must remain deterministic (we scale `dt`, so we do not break
  seeded replays). The zoom-out and glide need to feel good, which is why it is its own packet.
- Cost to change: Medium.
- Revisit if: It feels slow when you swap often; shorten, or allow a quick-swap key (1 to 4 without the zoom).
- Owner feedback: —

### TAC-G-09 · The choice is timed in slow motion, not paused
- Status: planned  ·  Packet: WP-S21
- Decision: In a voluntary swap the world keeps moving at 15% speed while you choose; if you take more than about 2.5
  real seconds, time slowly resumes and the nearest rebel is chosen. In a death swap the same applies with a 3 s limit
  (TAC-G-06).
- Why: A true pause removes all pressure and gives free information; a timeout keeps a cost to indecision.
- Alternatives rejected: Unlimited slow-motion (turns into a pause); instant auto-pick (no choice).
- Cost / risk: Needs clear on-screen feedback of the remaining time (a thin ring or bar).
- Cost to change: Trivial.
- Revisit if: Players find the time limit stressful.
- Owner feedback: —

### TAC-G-10 · Reduced motion and touch have their own path
- Status: planned  ·  Packet: WP-S21
- Decision: With `prefers-reduced-motion` there is no zoom or slow-motion: the swap is an instant cut with a highlight
  and a short pause-style picker. On touch you tap a rebel's marker.
- Why: Accessibility, and the whole site already respects reduced motion. Touch cannot hover.
- Alternatives rejected: Ignoring reduced motion.
- Cost / risk: Two code paths to test (smoke test covers both).
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-G-11 · Feedback: the HUD shows all rebels, the world shows the swap
- Status: planned  ·  Packet: WP-S21
- Decision: The HUD lists every rebel with health and what they are doing; the active one is marked. During a swap
  the highlighted rebel shows its name, health and weapon above its head. A subtle sound change (a low heartbeat and a
  filtered mix) accompanies slow-motion.
- Why: You choose whom to take by condition and weapon, so that information must be visible at the moment of choice.
- Alternatives rejected: Hiding health.
- Cost / risk: The sound change needs the shared sound layer (`parpSound`); we may start with visuals only.
- Cost to change: Low.
- Revisit if: The audio is annoying.
- Owner feedback: —

## Interactions with other sections

### TAC-G-12 · Levels are designed around swapping
- Status: planned
- Decision: The compound and cave levels (section B) are written after this section, with rebels placed to give the
  swap a purpose: a sniper on a tower, a gunner at the cave mouth, a medic in the fallback chamber.
- Why: Swapping is a mechanic, so levels should give it tactical weight (go and take the sniper for one shot).
- Alternatives rejected: Retrofitting later.
- Cost / risk: Section G slips ahead of section B in the schedule (it is built first).
- Cost to change: —
- Revisit if: —
- Owner feedback: —

### TAC-G-13 · XP belongs to whoever did it, not to whoever you were driving
- Status: planned  ·  Packet: WP-S22
- Decision: Kills, loots and objective actions award XP to the rebel that performed them, including AI-controlled ones.
- Why: Otherwise you would feed one rebel by always swapping to them. See [H-progression.md](H-progression.md).
- Alternatives rejected: Shared squad XP (removes the identity of each rebel); XP for the active rebel only.
- Cost / risk: Needs credit tracking (the sim already records kills by partisan id).
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## 3 October implementation checkpoint

S20 is implemented in `convoy/squad-control.js` with Sim adapters and seven focused tests.
S21 UI is implemented, but remains open until normal-motion pointer, visual and accessibility verification finishes.
The reduced-motion browser journey passed. The initial normal-motion test waited for moving projected buttons to
stop; the test now sends immediate pointer actions, but its interrupted rerun has no retained result.
The host scales the frame accumulator, keeping the simulation step at 1/60; it does not vary simulation dt.
Host-time choice timeouts are explicit via `advanceSwap(seconds)` for headless reproducibility.
Switching cancels a partial scripted hold-E search without granting its item; reload/ammo/health remain on each rebel.
The original `player` ID is retained with the neutral display label Lead rebel. Audio filtering/heartbeat is deferred,
as allowed by TAC-G-11; this checkpoint supplies visual feedback only.
