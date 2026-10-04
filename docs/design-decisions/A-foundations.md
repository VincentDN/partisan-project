# A · Foundations (WP-S1 to S4, built)

Turning the single convoy level into a game: levels as data, objectives, squad orders, and the AI behaviours the new
levels need. Principles: [00-principles.md](00-principles.md). Combat model: [01-convoy-prototype.md](01-convoy-prototype.md).

## WP-S1 · Level framework

### TAC-A-01 · A level is a JavaScript module of plain data
- Status: built  ·  Packet: WP-S1
- Decision: `convoy/levels/<id>.js` exports an object (bounds, ground, cover, partisans, convoy, foot units, items,
  objectives). `levels/index.js` documents the format and lists the missions.
- Why: Comments, shared constants and imports are allowed; no fetch is needed so tests load levels synchronously; the
  renderer and the simulation read the same object.
- Alternatives rejected: JSON (no comments, extra loading step); a visual editor (too much tooling for three levels).
- Cost / risk: Levels can contain logic by accident. Rule: data only; behaviour goes in `ai.js` or `objectives.js`.
- Cost to change: Medium.
- Revisit if: Levels need to be authored by non-programmers.
- Owner feedback: —

### TAC-A-02 · The product is called Partisan Tactical; the folder stays `convoy/`
- Status: built  ·  Packet: WP-S1
- Decision: The page title, index entry and headings say Partisan Tactical. The directory, URLs and test hook
  (`window.PARP_CONVOY`) keep the old name.
- Why: Renaming the folder breaks links, the build allowlist, tests and anyone's bookmarks for no player-visible gain.
- Alternatives rejected: A full rename now (churn) or never renaming the product (confusing as it grows).
- Cost / risk: A small inconsistency a developer will notice.
- Cost to change: Low (a mechanical rename later).
- Revisit if: The module grows past the shooter (e.g. a campaign map lives beside it).
- Owner feedback: —

### TAC-A-03 · The refactor was proved by a hash of twelve seeded games
- Status: built  ·  Packet: WP-S1
- Decision: Before changing anything I ran four seeds at three awareness levels with a scripted player and hashed the
  results (outcome, time, stats, every callout, every unit position). The hash was identical after moving the world
  into level data.
- Why: A refactor of a deterministic sim can be proved behaviour-preserving. It protects the convoy from regressions
  while the framework changed under it.
- Alternatives rejected: Eyeballing a few runs.
- Cost / risk: The hash script lives in a scratch folder, not the repo. It should become a committed regression test
  (see TAC-F-01).
- Cost to change: Low.
- Revisit if: Intentional AI changes make the fingerprint obsolete; then re-baseline deliberately.
- Owner feedback: —

### TAC-A-04 · The mission select shows what is coming
- Status: built  ·  Packet: WP-S1
- Decision: Compound assault and cave defence appear as disabled buttons with a hint.
- Why: It tells the owner (and testers) the plan in the product itself and lets us test the select with three entries.
- Alternatives rejected: Showing only built levels.
- Cost / risk: Visible placeholders.
- Cost to change: Trivial.
- Revisit if: —
- Owner feedback: —

### TAC-A-05 · The renderer rebuilds the map from level data
- Status: built  ·  Packet: WP-S1
- Decision: Ground, patches, roads and cover meshes are created from the level and disposed when the mission changes.
- Why: A new level costs data, not renderer code.
- Alternatives rejected: Per-level scene files.
- Cost / risk: Cover kinds are a fixed list in the renderer (`rock`, `wall`, `wreck`, `barn`, `log`); new kinds need a
  case there. Cave and compound will add a few.
- Cost to change: Low.
- Revisit if: Real models replace boxes (the Sketchfab kit), then `kind` maps to a model.
- Owner feedback: —

## WP-S2 · Objectives and outcomes

### TAC-A-06 · Seven objective types
- Status: built  ·  Packet: WP-S2
- Decision: eliminate, reach, destroy, steal, hold, protect, extract.
- Why: They are exactly what the three planned missions need (ambush: eliminate/destroy; compound: steal, extract,
  destroy the mast; cave: hold) plus reach and protect for flexibility. Each is a pure function of the simulation.
- Alternatives rejected: A scripting language for objectives (overkill); a minimal set of two (would push logic back
  into levels).
- Cost / risk: Adding a type is code plus a test.
- Cost to change: Low.
- Revisit if: A mission needs an objective we cannot express (e.g. "do not be seen").
- Owner feedback: —

### TAC-A-07 · "Protect" is met when everything else is done and fails the moment its unit falls
- Status: built  ·  Packet: WP-S2
- Decision: A `protect` objective never wins a mission alone; when all other required objectives are done it counts as
  met. If a protected rebel dies it fails at once (and, if required, loses the mission).
- Why: "Keep Mila alive" is a constraint on the whole mission, not a goal; making it a goal would let a mission end
  the instant the player stood still.
- Alternatives rejected: A goal-style protect (ends missions wrongly).
- Cost / risk: With rebel swapping (section G) "the player dying" is no longer a loss, so protect becomes the way a
  level can demand a specific rebel survives.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-A-08 · Optional objectives matter for the debrief, not for winning
- Status: built  ·  Packet: WP-S2
- Decision: An optional objective cannot win or lose the mission; it is shown and recorded.
- Why: It rewards play without making it mandatory. Later it can feed bonus XP (section H).
- Alternatives rejected: Scoring now (no economy exists yet).
- Cost / risk: Currently no reward, so players may ignore them.
- Cost to change: Low.
- Revisit if: S22 adds XP; optional objectives should award it.
- Owner feedback: —

### TAC-A-09 · Objectives unlock in order with `after`
- Status: built  ·  Packet: WP-S2
- Decision: An objective with `after: [ids]` is hidden and locked until those are done.
- Why: "Extract" must not be satisfiable at the start. It also gives missions a visible shape.
- Alternatives rejected: Phases as a separate concept.
- Cost / risk: None significant.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-A-10 · Taking an item means holding E, exposed
- Status: built  ·  Packet: WP-S2
- Decision: An item takes `search` seconds (default 3) of holding E within 1.8 m. Letting go or moving away resets it.
- Why: It turns looting into a risk decision (the same rule will apply to bodies and crates in section C) instead of an
  instant pickup.
- Alternatives rejected: Walk-over pickup (no tension).
- Cost / risk: Needs a clear UI progress readout (HUD shows it).
- Cost to change: Low.
- Revisit if: It is too slow or too fiddly on touch (TAC-F-03).
- Owner feedback: —

### TAC-A-11 · The mission outcome now comes from objectives; the player's death still loses
- Status: built (superseded by TAC-G-03 when WP-S20 lands)  ·  Packet: WP-S2
- Decision: Win when all required (non-protect) objectives are done; lose if the player dies or a required objective
  fails.
- Why: One place for end-of-mission logic, driven by level data.
- Alternatives rejected: Hard-coded rules per level.
- Cost / risk: "The player died" becomes wrong once you play every rebel; WP-S20 changes it to "every rebel is down".
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-A-12 · The debrief shows what happened, per rebel
- Status: built  ·  Packet: WP-S2
- Decision: Time, kills, vehicles, each objective's state, each rebel's state and kills, and items taken.
- Why: It is the feedback loop for the player and the data source for XP and for the tuning harness.
- Alternatives rejected: A bare win/lose card.
- Cost / risk: Needs persistence to be meaningful across missions (section D).
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## WP-S3 · Squad orders and pause

### TAC-A-13 · Five orders: follow, hold, move, attack, cover
- Status: built  ·  Packet: WP-S3
- Decision: Exactly these five.
- Why: They cover every tactical question the three missions ask (stay with me, stay there, go there, kill that, watch
  that way) without a command wheel. More orders would slow the player and the AI test matrix.
- Alternatives rejected: A full RTS command set; no orders (squad is useless).
- Cost / risk: No "retreat" or "regroup"; follow covers regroup, move covers retreat.
- Cost to change: Low.
- Revisit if: Playtesters ask for a specific missing order (likely "fire at will / hold fire").
- Owner feedback: —

### TAC-A-14 · Space pauses; the world is frozen while you give orders
- Status: built  ·  Packet: WP-S3
- Decision: Pause stops the simulation; orders can be given while paused.
- Why: Real-time squad control on a keyboard is hard; a pause is the cheapest fix. See TAC-X-06.
- Alternatives rejected: Slow-motion for orders (reserved for swapping, TAC-G-06); no pause.
- Cost / risk: A free look at the AI view (acceptable: it is a test bed).
- Cost to change: Low.
- Revisit if: Pause makes fights trivial.
- Owner feedback: —

### TAC-A-15 · Tab selects, hotkeys act at the cursor, right-click is contextual
- Status: built  ·  Packet: WP-S3
- Decision: Tab cycles nobody, each teammate, all. F/H apply directly; G/T/C use the point under the cursor; right-click
  attacks an enemy within 2.5 m of the cursor, otherwise moves.
- Why: One hand on WASD, one on the mouse: orders use keys near the left hand and the cursor.
- Alternatives rejected: Clicking portraits (small screen, no portraits yet); a radial menu (slow).
- Cost / risk: Touch needs a different scheme (TAC-F-03). With swapping, "who is selected" must exclude the active
  rebel (TAC-G-09).
- Cost to change: Low.
- Revisit if: Players cannot discover the keys (the paused banner lists them).
- Owner feedback: —

### TAC-A-16 · Followers take slots behind you and walk at your pace
- Status: built  ·  Packet: WP-S3
- Decision: Slots are 2.2 m behind, alternating left and right in 1.4 m steps; followers adopt your speed (so they sneak
  when you sneak).
- Why: Predictable formation without pathfinding; matching pace makes stealth possible with a squad.
- Alternatives rejected: Formations with commands (more orders).
- Cost / risk: Slots can land inside cover (units slide along obstacles).
- Cost to change: Low.
- Revisit if: Squads clump at doors in the compound.
- Owner feedback: —

### TAC-A-17 · A cover order engages only inside a ±0.9 rad sector
- Status: built  ·  Packet: WP-S3
- Decision: A teammate watching a sector fires only at targets whose bearing is within 0.9 rad (about 100° total) of the
  ordered angle, and faces that angle when idle.
- Why: It lets the player place a machine gunner on a lane without him chasing every target, and without giving away
  the position early.
- Alternatives rejected: Free-fire only.
- Cost / risk: A sector is not a range limit; far targets inside it are engaged.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-A-18 · An attack order overrides hold-fire
- Status: built  ·  Packet: WP-S3
- Decision: Before the ambush is sprung teammates hold fire, except when ordered to attack a target.
- Why: Without it you cannot start an ambush with your sniper.
- Alternatives rejected: Hold-fire always (no opening move for teammates).
- Cost / risk: Orders can spring the alarm by accident.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-A-19 · Teammates acknowledge orders aloud
- Status: built  ·  Packet: WP-S3
- Decision: "On you.", "Holding.", "Engaging.", "In position."
- Why: Feedback without UI, and it uses the existing callout system (TAC-X-05).
- Alternatives rejected: Silent orders.
- Cost / risk: None.
- Cost to change: Trivial.
- Revisit if: —
- Owner feedback: —

## WP-S4 · AI for the new scenarios

### TAC-A-20 · Alertness is per soldier; the convoy keeps its global alarm
- Status: built  ·  Packet: WP-S4
- Decision: Every soldier has `alert`. Levels choose `alarm: 'global'` (everyone alert at once, the convoy) or
  `'local'` (word has to spread).
- Why: The compound and cave need unaware guards; the convoy must behave exactly as before. Keeping both modes let me
  prove the convoy unchanged (TAC-A-03).
- Alternatives rejected: One mode for all (would change the convoy and its tuning).
- Cost / risk: Two code paths to keep consistent.
- Cost to change: Medium.
- Revisit if: The convoy should also have unaware soldiers (it does not today).
- Owner feedback: —

### TAC-A-21 · Word spreads by shout (30 m), by radio only while a radio operator lives, and by gunfire
- Status: built  ·  Packet: WP-S4
- Decision: In local mode, an alerted soldier shares what he knows with anyone within 30 m after 0.4 to 0.9 s, and to
  everyone via radio if an alert, living radio operator exists. A radio operator who is alerted announces on the net at
  once. Gunfire is heard out to 85 m (TAC-P-04).
- Why: It makes the radio operator the key target in the compound (kill him early and the base stays unaware) and
  makes stealth a real choice.
- Alternatives rejected: Everyone alerts instantly (no stealth); a fixed alarm radius (not tied to a thing the player
  can kill).
- Cost / risk: The player may not discover this unaided; the AI view and callouts show it.
- Cost to change: Low.
- Revisit if: Players cannot tell why the base went loud.
- Owner feedback: —

### TAC-A-22 · Reinforcements need the radio operator to survive his call
- Status: built  ·  Packet: WP-S4
- Decision: When an alert radio operator exists, he makes a call (4 s by default). If he lives to the end, a group arrives
  after a delay (20 s default) and assaults the best-believed position. If he dies during the call, nobody comes.
- Why: It creates a clear window the player can exploit and a visible threat if they ignore the radio.
- Alternatives rejected: Reinforcements on a fixed timer (not player-influenced).
- Cost / risk: Needs a radio mast objective in the compound so the player can also cut it (TAC-B-03).
- Cost to change: Low.
- Revisit if: The window is too short to react to.
- Owner feedback: —

### TAC-A-23 · Assaults bound: half the group moves to cover while the other half fires
- Status: built  ·  Packet: WP-S4
- Decision: An assault group splits into two fireteams. One bounds to the next cover (5 to 16 m on, nearer the goal);
  when they arrive or after 12 s they swap. Within 10 m of the goal, or with an enemy within 12 m, the group becomes
  a normal fight.
- Why: It reads as competent from above, gives the player cover fire to hide from and gaps to exploit, and is the
  behaviour the cave waves need.
- Alternatives rejected: Walking straight at the player (dumb); a full formation system.
- Cost / risk: Cover search per bound is a cost per group (cheap at this scale).
- Cost to change: Low.
- Revisit if: Waves in open ground do not look right.
- Owner feedback: —

### TAC-A-24 · Guards scan a post; patrols loop a route; unaware soldiers do not fire
- Status: built  ·  Packet: WP-S4
- Decision: A guard stands at its post and sweeps its facing about 0.7 rad; a patrol walks waypoints and loops. In local
  mode a soldier that is not alert never fires.
- Why: The compound's stealth phase needs predictable, readable routines the player can time.
- Alternatives rejected: Random wandering (unreadable, unfair).
- Cost / risk: Predictable routines are exploitable; that is the intended reward for observation.
- Cost to change: Low.
- Revisit if: Stealth is too easy; add rotating patrol timings and body discovery (TAC-E-02).
- Owner feedback: —

### TAC-A-25 · A real bug found by testing: messages sent during delivery were dropped
- Status: built  ·  Packet: WP-S4
- Decision: Deliver due messages from a snapshot so messages created during delivery are kept.
- Why: A radio operator relaying a shout created a message while the list was being filtered, and it vanished. The
  unit test for radio spread caught it.
- Alternatives rejected: —
- Cost / risk: None.
- Cost to change: —
- Revisit if: —
- Owner feedback: —

### TAC-A-26 · The first onboarding tour is deprecated
- Status: built  ·  Packet: —
- Decision: The guided first-run tours ("New here?" callouts stepping through presets, parts and stats) are removed from the Weapon Modder and the Operator Modder, with their CSS. The module moves to `docs/archive/onboarding-tour-v1.js` for reference; nothing imports it.
- Why: Owner request: deprecate the onboarding system; a new one will be written later.
- Alternatives rejected: Hiding the tours behind a setting (keeps code nobody wants).
- Cost / risk: First-time visitors get no guidance until the new system lands.
- Cost to change: Low.
- Revisit if: The new onboarding system is designed.
- Owner feedback: "remove those 'tour' tooltips you built. Depreciate that onboarding system"
