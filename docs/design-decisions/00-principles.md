# 00 · Principles (cross-cutting)

The rules every section inherits. Section documents refer to these by ID instead of repeating them.

### TAC-X-01 · A static, buildless site with three.js only
- Status: built
- Decision: Plain ES modules, no bundler, no framework, three.js vendored. Pages are served as files from GitHub Pages
  under `/partisan-project/`, with relative URLs only.
- Why: The project is a hidden design document made of playable demos. A build step is a failure surface (it already
  cost us a broken deploy once) and a barrier to the owner reading the code. Static hosting is free and instant to
  roll back.
- Alternatives rejected: Vite or webpack (faster dev, but a build to maintain); a game engine (heavy, not
  inspectable on the page).
- Cost / risk: No TypeScript compile step (we type-check with `tsc` over JSDoc instead); every new library is vendored by hand.
- Cost to change: High. It would touch every page and the deploy workflow.
- Revisit if: Bundle size or load time becomes a problem on phones.
- Owner feedback: —

### TAC-X-02 · The simulation is pure, seeded and separate from the renderer
- Status: built
- Decision: `convoy/sim.js` and `convoy/ai.js` import no DOM or three.js. They take a seed and a fixed 1/60 s step.
  The renderer (`convoy/game.js`) only reads state and sends input.
- Why: It makes the AI testable in node in milliseconds, lets a headless harness play thousands of games for balance
  (WP-S16), makes every bug reproducible from a seed, and lets us prove a refactor changed nothing (we hash twelve
  seeded runs; the hash was identical across the level-framework refactor).
- Alternatives rejected: Putting logic in the render loop (simpler, untestable); a physics engine (nondeterministic,
  heavy).
- Cost / risk: State must be explicit data (no hidden scene-graph state); animation polish needs a read-only layer.
- Cost to change: Very high. This is the foundation for testing and tuning.
- Revisit if: We need real physics (ragdolls, vehicles); then it would be a visual-only layer on top.
- Owner feedback: —

### TAC-X-03 · Data over code: levels, weapons, roles, objectives, loot, trees are data
- Status: built (levels, weapons, roles, objectives); planned (loot, trees, perks)
- Decision: Anything a designer would tune is a plain object in a data module, validated by tests.
- Why: Section G and H add dozens of items, perks and upgrade nodes; if each were code, balancing would mean editing
  logic. As data, a new level or perk is a data entry plus one test.
- Alternatives rejected: JSON files (no comments, no shared constants, needs a fetch); a visual level editor (a large
  tool for a three-level demo).
- Cost / risk: Data modules can grow large; the format must be documented (it is, at the top of `levels/index.js`).
- Cost to change: Medium.
- Revisit if: Non-programmers need to author levels.
- Owner feedback: —

### TAC-X-04 · Difficulty is what the enemy knows, never its stats
- Status: built
- Decision: The awareness setting changes hearing precision, spotting speed, callout delay and reaction time. It never
  changes health, damage or accuracy. Perks and abilities (section H) follow the same rule for the enemy.
- Why: Design pillar 4 ("fair, not cheap"). A harder enemy that is harder because it is wiser is a harder enemy the
  player can learn to beat; one with more health is one the player can only grind.
- Alternatives rejected: Classic health/damage multipliers (cheap to build, feel unfair).
- Cost / risk: Balance must come from information and tactics, so it needs the tuning harness (WP-S16).
- Cost to change: Low in code, high in identity.
- Revisit if: Playtesters find the top difficulty trivial. Then add more tactics (flanking, grenades), not health.
- Owner feedback: —

### TAC-X-05 · The enemy is smart because it speaks
- Status: built
- Decision: Every AI decision that matters is announced as a callout ("Contact north-west!", "Fireteam, flank west!",
  "Radio's down!") and the callout carries real information (it creates beliefs in squadmates, with delay and error).
- Why: Design pillar 3. Perceived intelligence comes from legibility. It also gives the player something to react to
  and gives us free debugging of the AI.
- Alternatives rejected: Silent AI (feels dumb even when it is clever); fake barks unrelated to state.
- Cost / risk: Callout spam. We mitigate with per-soldier cooldowns and a one-voice-per-line rule (TAC-P-06).
- Cost to change: Low.
- Revisit if: The comms log becomes noise on small screens.
- Owner feedback: —

### TAC-X-06 · Real-time with a tactical pause, not turn-based
- Status: built
- Decision: The fight runs live. Space pauses it for orders; section G adds a brief slow-motion for swapping rebels.
- Why: The convoy prototype is real-time and the feel (suppression, bounding, reaction) depends on it. A pause gives
  squad control without needing a turn system.
- Alternatives rejected: Turn-based (a rewrite of the AI and of the feel); pause-less pure real-time (squad orders
  become frantic).
- Cost / risk: Real-time needs the AI to be fair under time pressure (reaction delay, TAC-P-08).
- Cost to change: Very high.
- Revisit if: Players find the pause too powerful (it is also a way to read the AI view for free).
- Owner feedback: —

### TAC-X-07 · Persistence in localStorage, versioned, with a reset
- Status: planned
- Decision: Campaign, stash, loadouts and progression are saved in `localStorage` under a versioned key
  (`parp-tactical-v1`) with a migration function and a Reset button.
- Why: No accounts or servers on a static site. Versioning stops an old save from breaking a new build.
- Alternatives rejected: Cookies (size, sent to servers); IndexedDB (overkill); server saves (no server).
- Cost / risk: Saves are per browser and can be cleared. Private windows may refuse writes, so the game must run
  without saving.
- Cost to change: Medium.
- Revisit if: Players want cross-device saves; then an export/import code (like the Workbench's loadout codes).
- Owner feedback: —

### TAC-X-08 · Merge to main only when tests pass; packets never exceed M
- Status: built
- Decision: Lint, type-check, unit tests, the browser smoke test and the accessibility audit run before merging. A
  packet is at most 20 budget units; anything bigger is split.
- Why: We merged twice before tests finished and broke main; the usage budget makes large uninterruptible tasks risky.
  Small packets can be done in one sitting and verified.
- Alternatives rejected: Gating deploys on the browser tests (it made deploys slow; we deploy after the build and run
  browser tests in parallel as a check instead).
- Cost / risk: Process overhead per packet.
- Cost to change: Low.
- Revisit if: The suite gets too slow to run per packet (WP-S17 watches this).
- Owner feedback: —

### TAC-X-09 · One visual language: Nokia greens, flat low-poly, readable at a glance
- Status: built
- Decision: Panels use the shared tokens (`shared/tokens.css`); the shooter uses flat-shaded low-poly shapes with
  distinct silhouettes per role; the Art Style Lab shows the alternatives.
- Why: Consistency across the whole project (the owner asked for it) and design pillar 2: a role must be readable from
  above by silhouette alone (antenna, beret, tube, shield).
- Alternatives rejected: Per-page styling.
- Cost / risk: Top-down silhouettes are simple until real models arrive.
- Cost to change: Low.
- Revisit if: The real Sketchfab models change the look; then the shooter adopts a chosen Art Style Lab style.
- Owner feedback: —

### TAC-X-10 · Credits and licences are out of scope here
- Status: built
- Decision: Nothing in this project spends effort on credits, licences or provenance (ADR 0012). Pages point to the
  GitHub documentation or the owner's contact address.
- Why: A hidden, SEO-excluded test project; the owner asked to stop spending tokens on it.
- Alternatives rejected: A credits page and an audit tool (removed).
- Cost / risk: If the project ever goes public this must be revisited from scratch.
- Cost to change: High (tooling was deleted).
- Revisit if: The project is published or sold.
- Owner feedback: —
