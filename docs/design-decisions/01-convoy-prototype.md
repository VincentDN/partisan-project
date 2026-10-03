# 01 · The convoy ambush prototype (built)

What exists in `convoy/` before the roadmap work: one level, a hand-built AI, and the combat model every later section
reuses. Principles it follows: [00-principles.md](00-principles.md).

### TAC-P-01 · Bullets are hitscan, with tracers for show
- Status: built
- Decision: A shot is resolved instantly along a ray: the nearest of the cover boxes and unit circles wins. A short
  tracer line is drawn for 70 ms.
- Why: Deterministic, cheap and trivially testable, and top-down fights read fine with tracers. Projectiles would
  need travel time, lead and per-frame collision for little gain at these ranges.
- Alternatives rejected: Projectile entities (more code, nondeterminism pressure, no tactical benefit here).
- Cost / risk: No dodging bullets, no cover-piercing arcs except for lobbed grenades (which are explicit).
- Cost to change: Medium.
- Revisit if: Long-range sniping needs bullet drop.
- Owner feedback: —

### TAC-P-02 · Units are circles, cover and vehicles are boxes
- Status: built
- Decision: Collision, sight and bullets use simple 2-D shapes on the ground plane.
- Why: Cheap enough to test thousands of games; enough to express cover, corners and flanking.
- Alternatives rejected: Navmesh and 3-D occlusion (large work, not needed for a top-down view).
- Cost / risk: No height (a wall is as good as a rock); no real pathfinding (units slide along obstacles and take a
  side step when stuck).
- Cost to change: High.
- Revisit if: Levels get mazes or multiple floors (the compound may push on this; see TAC-B-01).
- Owner feedback: —

### TAC-P-03 · Suppression comes from near misses and slows and blurs the target
- Status: built
- Decision: A bullet passing within 2.6 m raises suppression by the weapon's value. Suppression widens the victim's
  spread, slows it, and at 65% pins a soldier in place. It decays slowly.
- Why: It is the mechanic that makes machine guns and cover matter, and it is the main lever the player has against a
  stronger enemy without raw damage. It is also how the AI "feels" shot at.
- Alternatives rejected: Damage-only combat (cover becomes a hit-point shield, no tension).
- Cost / risk: Needs tuning so a pinned squad is recoverable. A gun shield halves it for the MRAP turret.
- Cost to change: Low (numbers in `weapons.js`).
- Revisit if: Playtests say pinning is frustrating or too weak.
- Owner feedback: —

### TAC-P-04 · Hearing is a blurred position, not a magic reveal
- Status: built
- Decision: A shot is heard within 85 m. The listener learns where the shooter is, off by an error that grows with
  distance and shrinks with the awareness setting. Confidence is 0.55.
- Why: Pillar 3 and 4: the enemy must be able to be wrong. Without this it either knows everything or nothing.
- Alternatives rejected: Exact knowledge on any shot (cheating); no hearing (ambushes feel safe forever).
- Cost / risk: Needs the belief system underneath (TAC-P-05).
- Cost to change: Low.
- Revisit if: Suppressors (section C) should reduce this radius; they will.
- Owner feedback: —

### TAC-P-05 · Beliefs: seen, heard, told, each with error and confidence that fades
- Status: built
- Decision: A soldier keeps a list of `{x, z, err, conf, src}`. Seeing makes a precise belief, hearing a vague one,
  being told a blurred copy. Confidence decays (seen slower than heard), error grows. Decisions read the best belief,
  not the truth.
- Why: It is the heart of the AI. It produces natural behaviours (searching, suppressing a place, being fooled) from
  one mechanism, and the AI view can draw it.
- Alternatives rejected: A finite state machine on omniscient "player visible" flags (brittle, cheats).
- Cost / risk: More state per soldier; merging near-duplicate beliefs needs care (done by radius and id).
- Cost to change: Very high.
- Revisit if: We add decoys (sound lures) and need beliefs to carry a source type for deception.
- Owner feedback: —

### TAC-P-06 · One voice per line
- Status: built
- Decision: A callout with the same text within 2.5 s by the same side is dropped, while its belief is still shared.
- Why: Eleven soldiers shouting "Contact north!" at once is unreadable. The information is not lost, only the noise.
- Alternatives rejected: Per-soldier cooldowns only (not enough); a global callout queue (more machinery).
- Cost / risk: Occasionally the "wrong" soldier gets the line.
- Cost to change: Low.
- Revisit if: Comms logs look too sparse.
- Owner feedback: —

### TAC-P-07 · Awareness never changes health or aim
- Status: built
- Decision: The slider scales hearing error, spotting rate, callout delay and reaction time only.
- Why: See TAC-X-04.
- Alternatives rejected: Accuracy scaling.
- Cost / risk: Extreme values (0% or 100%) change tactics, not lethality. That is intended.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-P-08 · A reaction delay when the ambush opens
- Status: built
- Decision: Each soldier waits 0.5 to 1.5 s (shorter when aware) before returning fire.
- Why: The first version killed the player 0.3 s after he was spotted. People are not instant. It also gives the player
  a window to use the opening move, which is the point of an ambush.
- Alternatives rejected: Slower enemy accuracy (violates TAC-X-04).
- Cost / risk: Needs the local-alarm version in new levels (done: `alert()` sets it per soldier).
- Cost to change: Low.
- Revisit if: Ambushes feel too safe.
- Owner feedback: —

### TAC-P-09 · Weapons are a data table; explosives are first-class
- Status: built
- Decision: `weapons.js` defines AK-74, PKM, SVD, RPG-7, GP-25 and DShK: cadence, damage, spread, range, suppression,
  burst pattern, splash and vehicle damage. The RPG bursts on impact; the GP-25 lobs over cover.
- Why: Balance by editing numbers. Splash and lobbing give the AI and the player a way to flush cover, which fixes the
  "everyone hides behind a rock" stalemate.
- Alternatives rejected: Per-weapon code.
- Cost / risk: Weapon stats here are separate from the Workbench's stats; section C must reconcile them (TAC-C-02).
- Cost to change: Low.
- Revisit if: Attachments change handling (they will).
- Owner feedback: —

### TAC-P-10 · Seven enemy roles, each with a job and a silhouette
- Status: built
- Decision: Leader (orders flank/retreat), rifleman, machine gunner (heavy suppression), marksman (long sight, never
  fires blind), radio operator (halves callout delay; his death slows the squad), grenadier (lobs at believed
  positions), MRAP gunner (shielded). Each has a distinct top-down shape.
- Why: Roles create target priorities for the player (kill the radio first) and readable tactics from above. They are
  cheap: a role is a row in a table plus a few lines of behaviour.
- Alternatives rejected: Identical soldiers (no decisions for the player); many more roles (unreadable).
- Cost / risk: Seven is the readable limit from above; more would need icons.
- Cost to change: Low.
- Revisit if: New levels need new jobs (a medic, a sniper-spotter pair).
- Owner feedback: —

### TAC-P-11 · The MRAP is an armoured target that only RPGs can kill
- Status: built
- Decision: The MRAP has 520 hit points, rifles do nothing to the hull, an RPG does 230, and its turret gunner (shielded,
  half suppression) is a separate, exposed target. Destroying it kills everyone aboard.
- Why: It forces the player to use the RPG and a plan, instead of shooting everything with the same gun. It also
  tests the vehicle and splash systems.
- Alternatives rejected: A softer vehicle (no tension); an invulnerable one (no counterplay).
- Cost / risk: Three rockets means a missed shot hurts; tuned so it is winnable.
- Cost to change: Low.
- Revisit if: Looted RPGs (section C) make rockets plentiful.
- Owner feedback: —

### TAC-P-12 · The sergeant orders a flank after nine seconds of stalemate; the squad retreats at 40%
- Status: built
- Decision: If contact has lasted 9 s and at least three soldiers are ready, two flank from the side the squad is not on.
  At 40% strength or fewer the squad falls back off the map.
- Why: It stops static firefights, gives the player a thing to watch for, and ends missions without hunting every
  last soldier.
- Alternatives rejected: Pure cover fighting (stalls); suicidal charges (unreadable).
- Cost / risk: Retreating soldiers are lost loot; section C must decide whether they drop gear (TAC-C-04).
- Cost to change: Low.
- Revisit if: The harness shows flanks are too rare or too deadly.
- Owner feedback: —

### TAC-P-13 · Fixed 60 Hz step with an accumulator
- Status: built
- Decision: The sim steps at 1/60 s regardless of frame rate; the renderer interpolates nothing yet.
- Why: Determinism and testability (TAC-X-02). Frame-rate-independent behaviour.
- Alternatives rejected: Variable dt (nondeterministic).
- Cost / risk: Large frame gaps are capped (0.25 s) so a stalled tab does not fast-forward the fight.
- Cost to change: Low.
- Revisit if: We need smoother motion (add render interpolation).
- Owner feedback: —
