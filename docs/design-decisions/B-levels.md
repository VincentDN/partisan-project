# B · The two new levels (WP-S5 to S7; planned)

Compound assault and cave hideout defence, plus the visuals they need. Principles: [00-principles.md](00-principles.md).
Built on [A-foundations.md](A-foundations.md) and designed around swapping ([G-squad-play.md](G-squad-play.md)).

## Why these two levels

### TAC-B-01 · Three missions that each test a different part of the AI
- Status: planned
- Decision: Convoy ambush (reactive AI, vehicles, global alarm), compound assault (stealth, local alarm, patrols, radio,
  reinforcements), cave defence (waves, bounding assaults, you defend). Nothing else is planned for the demo.
- Why: The owner asked for these. They are also a good spread: you attack unaware, you ambush, you defend. Each one
  exercises a different branch of the AI and a different player skill, so together they demonstrate the whole design.
- Alternatives rejected: Three variations of the ambush (no variety); a large open map (an editor and pathfinding
  project, not a demo).
- Cost / risk: Two levels is little content; replay value comes from loadouts, swapping and optional objectives.
- Cost to change: Medium (levels are data).
- Revisit if: Testers finish too fast; add an optional hard mode per level before adding a fourth level.
- Owner feedback: —

## Level 2: Compound assault (WP-S5)

### TAC-B-02 · A walled farm compound with a gate, two towers, a barracks, an armoury and a radio mast
- Status: built (convoy/levels/)  ·  Packet: WP-S5
- Decision: A single walled compound about 70 by 50 m. A gate to the south, an observation tower at two corners, a
  barracks building, an armoury building holding the cache, and a radio mast in the courtyard.
- Why: Every element is a decision for the player: which side to enter, who to remove first (tower guards see far),
  whether to kill the radio operator or the mast, and how far to push for the cache.
- Alternatives rejected: An open field (no structure for stealth); a large base (too much art and AI placement).
- Cost / risk: Buildings need doors and interior space. Our collision is boxes (TAC-P-02), so buildings are made of
  wall boxes with gaps and the AI uses simple room positions. Roofs hide interiors until you enter (TAC-B-09).
- Cost to change: Medium.
- Revisit if: Door handling in the AI proves unreliable; then use open-front buildings.
- Owner feedback: —

### TAC-B-03 · The radio mast gates the reinforcements
- Status: built (convoy/levels/)  ·  Packet: WP-S5
- Decision: Reinforcements (the truck) can only be called while the mast stands and a radio operator survives his call.
  Destroying the mast is an optional objective that removes the threat.
- Why: It gives the player two ways to prevent the worst outcome (kill the operator quietly, or cut the mast) and
  makes the optional objective matter.
- Alternatives rejected: A timer-only reinforcement (no counterplay).
- Cost / risk: Needs the mast to be a damageable target (explosives or a charge from the Demolitionist, section H).
- Cost to change: Low.
- Revisit if: Players ignore the mast; make the quiet route more rewarding.
- Owner feedback: —

### TAC-B-04 · Stealth first, loud by choice
- Status: built (convoy/levels/)  ·  Packet: WP-S5
- Decision: The level starts quiet (patrols, guards, suspicion by sight and proximity, TAC-A-24). A body that a patrol
  finds raises a local alarm (TAC-E-02). The player can finish it loudly.
- Why: Stealth makes the local alarm model worth building, and a loud option stops stealth from being a requirement.
- Alternatives rejected: Stealth-only (frustrating); no stealth (no point to the local alarm).
- Cost / risk: Stealth needs readable detection feedback (the suspicion meter over guards in the AI view and a subtle
  indicator in normal play).
- Cost to change: Medium.
- Revisit if: Testers cannot tell when they are being noticed.
- Owner feedback: —

### TAC-B-05 · Objectives: steal the cache (required), destroy the mast (optional), then extract
- Status: built (convoy/levels/)  ·  Packet: WP-S5
- Decision: `steal` the cache (hold E in the armoury), optional `destroy` the mast, then `extract` (everyone in the
  exit zone, locked until the cache is taken).
- Why: It is a heist: go in, take, leave. The locked extraction gives a second phase with the army alerted.
- Alternatives rejected: Eliminate everyone (turns it into the convoy).
- Cost / risk: The exit run needs room to breathe (cover on the way out).
- Cost to change: Low.
- Revisit if: Extraction feels like an afterthought.
- Owner feedback: —

### TAC-B-06 · The compound is winnable both quietly and loudly in the harness
- Status: built: scripted quiet pass-through in tests/levels.test.mjs; the loud side is covered by the stationary bot (about half the seeds survive), tuning continues  ·  Packet: WP-S5, S16
- Decision: The tuning harness must show both a quiet and a loud scripted player finding the level winnable.
- Why: A level that is only winnable one way is a puzzle, not a sandbox.
- Alternatives rejected: Tuning by feel.
- Cost / risk: Writing two scripted styles.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## Level 3: Cave hideout defence (WP-S6)

### TAC-B-07 · You defend your own camp at night until dawn
- Status: built (convoy/levels/)  ·  Packet: WP-S6
- Decision: A cave camp with an entrance, two tunnels and a fallback chamber. It is night. The objective is to hold
  until dawn (a timer of about four minutes) or break the attack.
- Why: It flips the player's role from attacker to defender, uses the bounding-assault AI (TAC-A-23) as a threat, and
  uses swapping (G) as the defender's main tool: you can be at the cave mouth, then in a tunnel.
- Alternatives rejected: Hold-until-extraction (no sense of time); eliminate the attackers (too much like the
  convoy).
- Cost / risk: A timer-based end means fights must stay interesting for four minutes.
- Cost to change: Low.
- Revisit if: Four minutes is too long or short.
- Owner feedback: —

### TAC-B-08 · Three attack waves with different shapes
- Status: built (convoy/levels/)  ·  Packet: WP-S6
- Decision: Wave 1: rifle squads bounding in. Wave 2: a machine-gun team that suppresses the entrance while others
  flank through the east tunnel. Wave 3: an MRAP with a searchlight and a turret.
- Why: Each wave asks for a different answer (cover and crossfire; kill the gunner or use the tunnel; use the RPG), and
  the third reuses the MRAP the player already learnt in the convoy.
- Alternatives rejected: Endless random waves (no arc, no learning).
- Cost / risk: Wave data and timing need tuning with the harness.
- Cost to change: Low (data).
- Revisit if: One wave is a difficulty spike.
- Owner feedback: —

### TAC-B-09 · A pre-fight placement phase where you place the squad and spend the stash
- Status: planned: needs the inventory (section C); until then the 40 s before wave one are for orders  ·  Packet: WP-S6 (needs S10)
- Decision: Before wave 1 you get a calm minute: place your rebels, give orders, and equip them from the stash
  (looted gear from missions 1 and 2).
- Why: It pays off looting and the inventory (section C) in the one mission where you can prepare. It makes the
  difference between a good and a bad loot run visible.
- Alternatives rejected: Starting in the fight (no use of the stash).
- Cost / risk: Needs the inventory UI available in-mission (TAC-C-07).
- Cost to change: Low.
- Revisit if: The phase drags; add a "ready" button and a countdown.
- Owner feedback: —

### TAC-B-10 · A fallback chamber to retreat to and rest
- Status: built (convoy/levels/)  ·  Packet: WP-S6
- Decision: A small chamber at the cave's end where wounded rebels recover slowly and ammo can be shared (using the
  stash).
- Why: A defender needs somewhere to fall back to, and it gives a reason to swap to a rebel in the back to heal and
  rearm others.
- Alternatives rejected: No retreat (a straight hold-the-line).
- Cost / risk: Needs a simple "healing zone" rule in the sim.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-B-11 · Losing: every rebel down, or the chamber is overrun
- Status: built (convoy/levels/)  ·  Packet: WP-S6
- Decision: Lost when every rebel is down (TAC-G-03) or enemy soldiers hold the chamber for a few seconds.
- Why: Two ways to lose give the squad a clear last line.
- Alternatives rejected: Only all-down (no sense of a last stand).
- Cost / risk: Needs a chamber-held rule in the objectives (a new `defend` type, or a protect zone).
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## Visuals (WP-S7)

### TAC-B-12 · Roof cut-away indoors, darkness and lamp light in the cave, searchlight and muzzle flash at night
- Status: planned (partly built: night light, lamps and the searchlight; roof cut-away waits for the 2-D renderer (WP-V9))  ·  Packet: WP-S7 (retired)
- Decision: Roofs fade out when a rebel is inside; the cave is dark with a small light around each rebel and the lamps;
  muzzle flashes briefly light the scene; the MRAP's searchlight is a cone.
- Why: Readability from above is the constraint (pillar 2). Lighting gives mood and tells you what you can see.
- Alternatives rejected: Real-time shadow-casting lights for everything (too slow on phones); no night (loses the
  atmosphere the level is for).
- Cost / risk: Cheap lighting tricks (light sprites and a darkness overlay) can look flat; verify in screenshots.
- Cost to change: Medium.
- Revisit if: Frame rate drops on phones (WP-S17 sets a budget).
- Owner feedback: —

### TAC-B-13 · The simulation grows four small features instead of per-level code
- Status: built  ·  Packet: WP-S5, WP-S6
- Decision: Levels stay pure data. The simulation gains `targets` (destructible structures such as the radio mast), `waves` (scheduled attacks with squads, tunnel paths and a parked vehicle), `lights` and a `sight` factor for night, and two objective types: `defend` (fails when the army holds a zone for a grace period) and `extract` with `carry` (the loot must be in a living rebel's hands in the zone). A casualty drops what he carried.
- Why: The compound needs a mast you can shoot and loot you must bring home; the cave needs a clock, waves and a last line. Putting them in the engine keeps every later level a data file (TAC-X-02), and the tests cover each rule once.
- Alternatives rejected: Scripting each level in code (not data, not testable the same way); a general trigger system (too much for two levels).
- Cost / risk: More fields for level authors to learn; they are listed at the top of `convoy/levels/index.js`.
- Cost to change: Low.
- Revisit if: A level needs a rule these do not cover.
- Owner feedback: —

### TAC-B-14 · Towers are cover boxes outside the corners, and the north is the quiet way in
- Status: built  ·  Packet: WP-S5
- Decision: Sight is 2-D (no height), so a tower on a wall would be blind. The towers stand just outside the north-west and south-east corners, their guards face away from the north approach, and a drain through the north wall behind the armoury gives a route that walls and facing hide. The gate and the breach are watched.
- Why: It keeps the stealth route real (patience and timing, not luck) and the loud routes costly, without adding elevation to the simulation.
- Alternatives rejected: Height in line of sight (a large change to a tested AI); towers that see through walls (breaks the stealth route).
- Cost / risk: A tower reads as a lookout post, not a tall one; the 2-D renderer can draw it taller later.
- Cost to change: Low.
- Revisit if: Elevation is added to the simulation.
- Owner feedback: —

### TAC-B-15 · Class abilities in missions, and four difficulties
- Status: built  ·  Packet: WP-S (late)
- Decision: The active abilities of the class tree play in every level (`convoy/abilities.js`). Up to three, newest first, sit on an ability bar at the bottom of the map on Z, X and V, each with a cooldown sweep, aimed at the cursor and clamped to a range. They are built from a few effects the simulation understands: rockets, tandem rounds, guided missiles and FPV drones in flight; blasts and breaching charges; suppression; reveals (marked soldiers get red brackets and the squad is told where they are); healing and revives; sandbag walls that block like cover; smoke that blocks sight; mines that burst under soldiers and vehicles; jamming (the army's radio is cut, so word only travels by voice); spoofing (the army hears contact where you point); stealth (seen only within 4 m); dashes; rally; a bipod (less spread and more suppression while still) and a held breath (one steady shot). Passives multiply speed, reload, spread, damage, vehicle damage, suppression dealt, damage taken, recovery, search speed, noise and cooldowns. A difficulty select (Easy, Normal, Hard, Brutal) scales the damage the rebels take, the army's aim and its reaction time, and the experience paid; it is saved in the browser.
- Why: Owner request: the shooter levels with abilities, a levelling system and difficulty options.
- Alternatives rejected: Per-ability code paths (44 classes; a few shared effects keep it testable); difficulty by army numbers (the levels are hand-built; multipliers keep them as designed).
- Cost / risk: Some actives with no fitting effect show on the bar as unusable; numbers are first guesses.
- Cost to change: Low (tables in `convoy/abilities.js` and `convoy/difficulty.js`).
- Revisit if: Abilities need their own art and sounds, or the army gets abilities too.
- Owner feedback: —

### TAC-B-16 · Sprint, hand grenades, burning wrecks, and difficulty sets how many soldiers turn up
- Status: built  ·  Packet: WP-S (late)
- Decision: The active rebel sprints on Shift (6.6 m/s, about five seconds of stamina that comes back resting; wider aim while sprinting) and sneaks on Ctrl. G throws a hand grenade at the cursor: each rebel carries three, one a second, out to 28 m, arcing over cover and bursting on landing (4.5 m, 115 at the centre); the squad's "go" order moved to right-click only. A destroyed vehicle now explodes: a 7 m blast that hurts anyone near, sets off a vehicle parked close (an RPG into the lead jeep can chain down the column), and burns for 45 s. Difficulty also sets how many soldiers a level fields: Easy 55%, Normal 70%, Hard 85%, Brutal 100% of foot soldiers, convoy riders, wave squads and the reaction force, thinned evenly; leaders, radio operators and turret gunners always come, so the objectives and the radio rules still work.
- Why: Owner request: sprint with Shift, grenades on G, too many enemy soldiers, and cars that explode when hit with the RPG.
- Alternatives rejected: Fewer soldiers by editing the levels (difficulty would stop meaning anything); grenades as a class ability only (every rebel should have them).
- Cost / risk: The levels were balanced at full strength; Normal is now lighter than designed.
- Cost to change: Low (`thinLevel` in `convoy/sim.js`, `force` in `convoy/difficulty.js`).
- Revisit if: A level needs a fixed garrison whatever the difficulty.
- Owner feedback: —
