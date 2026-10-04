# I · Graphics (WP-V1 to V20; planned)

The 2.5-D top-down sprite look for the shooter (RimWorld style) and the retro overworld map (Pokémon-style region map). The plan: [../graphics-roadmap.md](../graphics-roadmap.md). Principles: [00-principles.md](00-principles.md). The simulation is untouched by all of this (TAC-X-02).

### TAC-J-01 · Move the shooter to 2.5-D top-down 2-D sprites in the RimWorld style
- Status: planned  ·  Packet: WP-V1, WP-V3
- Decision: The shooter's world, characters, vehicles and effects become 2-D sprites with thick dark outlines, flat fills with one or two shades, long sun shadows and walls whose front face is visible. The 3-D shooter view is retired after parity (TAC-J-24).
- Why: The owner asked for it. It also serves pillar 2 (readable at a glance): a heavy outline and chunky gear make a role readable from above, which is exactly what the shooter needs. It differentiates the shooter from the 3-D Workbench, and 2-D sprites are cheaper to author and animate for a top-down view than rigged 3-D characters. It supersedes TAC-X-11, which only listed it as a candidate.
- Alternatives rejected: Staying 3-D with the Art Style Lab's cel or ink look (close, but it keeps a 3-D asset and animation pipeline for a camera that never shows the faces); a true isometric view (TAC-J-05); a hybrid where only characters are 2-D (two looks in one scene).
- Cost / risk: A second art pipeline to build and maintain; the 3-D Sketchfab models are not used directly in the shooter (they can be baked, TAC-J-10).
- Cost to change: Medium. The simulation is untouched, so the cost is the renderer and the art.
- Revisit if: Playtesters find the 2-D look less readable than the cel/ink 3-D one, or the sprite volume is too high.
- Owner feedback: —

### TAC-J-02 · Render with Canvas 2-D, not WebGL
- Status: planned  ·  Packet: WP-V3
- Decision: A Canvas 2-D renderer with nearest-neighbour scaling, an offscreen cache for the ground and structures, and one atlas per sprite category.
- Why: A few hundred sprites at 32 px are far below Canvas 2-D's limits, pixel-perfect scaling is trivial, and it needs no shader code or WebGL context (the 3-D pages already cost us SwiftShader slowness in CI and on weak phones). It keeps the shooter light.
- Alternatives rejected: three.js with an orthographic camera and sprite quads (GPU batching and shaders, but a heavier stack and blur risk on scaling); a game library such as PixiJS (a new dependency we would vendor).
- Cost / risk: Lighting and many particles are the expensive parts; they need budgets (TAC-J-18, TAC-J-26). Heavy post-effects are unavailable.
- Cost to change: Medium. The renderer interface (TAC-J-03) makes a later WebGL backend possible.
- Revisit if: Frame time on phones cannot be met with Canvas 2-D even with caching.
- Owner feedback: —

### TAC-J-03 · A renderer interface; the 3-D view stays behind ?view=3d until parity
- Status: planned  ·  Packet: WP-V2, WP-V18
- Decision: The draw code leaves `convoy/game.js` for a `Renderer` contract (map, units, vehicles, tracers, orders, AI overlay, camera, picking). The current three.js code becomes the 3-D implementation, selectable with `?view=3d`; the 2-D one is built beside it.
- Why: A safe migration: the game stays playable while the new look is built, the two views can be compared in screenshots, and features built meanwhile (swap UX, orders) work in both. It follows TAC-X-02: the simulation never learns what draws it.
- Alternatives rejected: Rewriting the renderer in place (no way back); freezing the 3-D view and building 2-D elsewhere (two diverging copies).
- Cost / risk: Some duplicated feature work until the 3-D view is removed.
- Cost to change: Low.
- Revisit if: Keeping both views costs more than the safety is worth.
- Owner feedback: —

### TAC-J-04 · Scale: 1 metre is 32 pixels; integer zoom only
- Status: planned  ·  Packet: WP-V1, WP-V3
- Decision: The simulation's metres map to 32 px at zoom 1. Allowed zooms are 1x, 2x and 0.5x (and 3x on large screens). Sprites are drawn at integer scales with image smoothing off.
- Why: Pixel art breaks when scaled by fractions (shimmer, uneven pixels). Fixed integer steps keep it crisp and keep every sprite's size predictable: an infantry sprite is about 32 by 40 px, a jeep about 134 by 70 px, the MRAP about 190 by 86 px.
- Alternatives rejected: Free zoom (blurry or shimmering art); 16 px tiles (too little room for gear detail); 64 px tiles (heavy art cost).
- Cost / risk: Fewer zoom levels than a smooth 3-D camera; the swap zoom-out (TAC-G-08) uses a step, not a glide.
- Cost to change: Medium once sprites exist.
- Revisit if: The art needs more detail than 32 px allows.
- Owner feedback: —

### TAC-J-05 · 2.5-D top-down with y-sorting, not isometric
- Status: planned  ·  Packet: WP-V3, WP-V9
- Decision: The view looks straight down with a slight tilt in the art: people are drawn as front-facing busts, walls show a front face under a lit top, objects are depth-sorted by their ground position. The sim's x/z coordinates map one-to-one to the screen.
- Why: That is the RimWorld look in the references, and it needs no coordinate conversion, so picking, cover, line of sight and the AI view all keep working unchanged. Isometric would need diagonal art for everything and a projection layer through every system.
- Alternatives rejected: True isometric (eight-direction art and a projection through the sim, picking and orders); strict flat top-down (unreadable characters).
- Cost / risk: Tall things (towers) overlap what is behind them, so roofs and tall objects need the cut-away rules in TAC-J-15.
- Cost to change: High (it shapes all the art).
- Revisit if: —
- Owner feedback: —

### TAC-J-06 · One outline rule: a dark 2 px outline on everything, flat fills, one or two shades
- Status: planned  ·  Packet: WP-V1
- Decision: Every sprite gets a near-black warm outline (about #1a1410), two pixels thick at zoom 1, fills of a base colour and one darker shade, an occasional highlight. The outline is applied by a shared pass in the sprite tooling.
- Why: It is what unifies the references (armour sheets, ruins, trees, rocks) and what makes things readable on busy ground. A shared pass means procedurally generated and hand-drawn sprites match.
- Alternatives rejected: Coloured outlines per object (busy); no outline (blends into foliage); thick outlines on characters only (inconsistent).
- Cost / risk: Outlines eat detail at 32 px; art must be simple. That is the point.
- Cost to change: Low (tool setting).
- Revisit if: Dark outlines on night scenes look too heavy; add a lighting-aware outline tint.
- Owner feedback: —

### TAC-J-07 · One sun, from the upper left; cast shadows are skewed silhouettes
- Status: planned  ·  Packet: WP-V1, WP-V8
- Decision: A single global light direction. Each object casts a darkened, sheared copy of its silhouette toward the lower right (as in the world reference). Shadows are off at night and in caves, where lights replace them (TAC-J-18).
- Why: Long shadows give the 2.5-D depth and the mood of the reference at almost no cost, and a single direction means one shadow routine for everything.
- Alternatives rejected: Per-object shadow directions (inconsistent); real-time projected shadows (expensive); no shadows (flat).
- Cost / risk: Shadows lie on the ground only; they ignore the height of the terrain.
- Cost to change: Low.
- Revisit if: Levels need dawn or dusk with long low shadows; then add a per-level sun angle.
- Owner feedback: —

### TAC-J-08 · People are layered paper dolls in front, back and side views; the weapon layer rotates freely
- Status: planned  ·  Packet: WP-V5, WP-V7
- Decision: Each person is a stack of layers (body, head, face, headgear, vest, pack, gloves) in four directions (front, back, left, right mirrored). The held weapon and hands are a separate layer that rotates to the aim angle while the body keeps its four directions.
- Why: It matches the armour-sheet references (the same figure with different helmets, hoods and armour), keeps art per layer instead of per combination, and handles 360-degree aiming without drawing every angle. RimWorld does it this way for the same reasons.
- Alternatives rejected: Eight or sixteen directions of whole-body art (a combinatorial explosion with equipment); rotating the whole body sprite (turns people into tokens).
- Cost / risk: The body-versus-weapon mismatch can look odd at fast turns; a short body-turn animation hides it.
- Cost to change: Medium.
- Revisit if: —
- Owner feedback: —

### TAC-J-09 · Procedural paper-dolls first; hand-drawn or generated art can replace any layer later
- Status: planned  ·  Packet: WP-V5, WP-V4
- Decision: The first characters are generated from layered shapes by code (with the shared outline pass), driven by data. The atlas format treats a procedural layer and a hand-drawn layer the same, so any can be replaced one at a time.
- Why: There is no dedicated artist, the equipment system needs hundreds of layer combinations, and generated layers are consistent and instant to change. Replacing layers later (by hand or by an image model) needs no code change.
- Alternatives rejected: Waiting for hand-drawn art (blocks everything); generating whole sprite sheets with an image model now (consistency across hundreds of sprites is unreliable); pixel art by the owner (the best result, but a large task).
- Cost / risk: Procedural figures can look generic until real art replaces them.
- Cost to change: Low.
- Revisit if: Review in the Sprite Lab says the procedural look is not good enough for the demo.
- Owner feedback: —

### TAC-J-10 · Weapons and vehicles may be baked from the 3-D models by a top-down render-to-sprite pass
- Status: planned  ·  Packet: WP-V6, WP-V10
- Decision: A tool renders a model from above with the ink look into a sprite, with its attachments installed. Used for in-hand weapons and vehicles; characters stay paper dolls.
- Why: One rifle model drives the Workbench, the Operator Customiser and the shooter, so a stolen weapon with an optic looks identical everywhere, and the Sketchfab models are reused instead of redrawn.
- Alternatives rejected: Drawing every weapon by hand (dozens of rifles with attachments); using the 3-D model live in a 2-D view (two renderers at once).
- Cost / risk: A baked sprite per weapon and attachment combination; the number of combinations needs a limit (bake on demand and cache).
- Cost to change: Low.
- Revisit if: The baked look does not match the hand-drawn characters; adjust the ink pass or draw them by hand.
- Owner feedback: —

### TAC-J-11 · Equipment drives appearance: layers are keyed by item id
- Status: planned  ·  Packet: WP-V6
- Decision: A registry maps item ids (the Workbench's and the inventory's) to sprite layers: weapon, attachments, helmet, vest, pack. A rebel's sprite is rebuilt when their loadout changes.
- Why: The promise of the loot loop is that what you steal shows on your people. One id space (TAC-C-02) makes it free once the registry exists.
- Alternatives rejected: Hand-assigned sprites per character (does not follow loot).
- Cost / risk: Every new item needs a layer entry; a missing one falls back to a generic silhouette.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-12 · A Sprite Lab viewer is the review tool for all 2-D art
- Status: planned  ·  Packet: WP-V4
- Decision: A page like the Art Style Lab: pick any sprite, see its layers, animation and directions at 1x to 4x on different ground colours, swap palettes, toggle the outline and the shadow.
- Why: Art needs a place to be judged against the references quickly, and the owner needs it to give feedback. It is cheap to build on the atlas manifest.
- Alternatives rejected: Reviewing in the game only (slow, cannot isolate a sprite).
- Cost / risk: One more page to maintain.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-13 · Ground is tiles with variants and soft transitions, baked per chunk
- Status: planned  ·  Packet: WP-V8
- Decision: 32 px tiles of grass (several variants), dirt, road, sand, rock and floor. Transitions are soft-edged overlay decals rather than a full autotile set. The ground is drawn once into offscreen chunks and reused.
- Why: Variants break up repetition (the world reference has none visible); decals cost far less art than a full 47-tile autotile set per pair; baking removes ground cost from the frame.
- Alternatives rejected: Full autotile sets (large art cost); one tile per type (visibly repetitive); drawing the ground every frame (wasteful).
- Cost / risk: Transitions look softer than hard-edged autotiles, which suits the reference.
- Cost to change: Low.
- Revisit if: Edges look muddy.
- Owner feedback: —

### TAC-J-14 · Scatter (trees, bushes, flowers, stones) is seeded decoration, never collision unless the level lists it
- Status: planned  ·  Packet: WP-V8
- Decision: Decoration is generated from the level seed and drawn with shadows. Collision and cover come only from the level's `cover` list; a tree that should block must be listed there.
- Why: It keeps the simulation exactly as tested (TAC-X-02) and lets the map look rich without changing the AI or balance. The convoy fingerprint stays valid.
- Alternatives rejected: Making every tree an obstacle (changes pathing and balance everywhere); no decoration (bare ground).
- Cost / risk: A soldier can walk through a decorative bush; the art should keep decor low and small so that reads fine.
- Cost to change: Low.
- Revisit if: Players expect trees to block; promote the larger ones into cover data.
- Owner feedback: —

### TAC-J-15 · Structures are 2.5-D: lit top, visible front face, doors, floors, and roofs that fade when you are inside
- Status: planned  ·  Packet: WP-V9
- Decision: Walls show a top edge and a front face; buildings are built from level boxes; a roof layer fades out when any rebel is inside and returns when none is. Towers and cave walls follow the same rules.
- Why: It is the RimWorld look and the readability fix for interiors under TAC-J-05. It also supersedes TAC-B-12 (roof cut-away).
- Alternatives rejected: Hiding roofs always (no interiors seen from outside); always visible (cannot see inside).
- Cost / risk: Interiors need floor art and furniture props.
- Cost to change: Medium.
- Revisit if: —
- Owner feedback: —

### TAC-J-16 · Vehicles are sprites with a separate turret layer and damage states
- Status: planned  ·  Packet: WP-V10
- Decision: A hull sprite plus a turret sprite that rotates independently, a damaged state and a burning wreck. Drawn facing east and rotated at runtime, with nearest-neighbour scaling.
- Why: It reuses the sim's turret facing for the MRAP's gun and keeps art to a few sprites per vehicle.
- Alternatives rejected: Pre-rendered rotations (many frames per vehicle); 3-D live (two renderers).
- Cost / risk: Runtime rotation of pixel art can shimmer; the baked option (TAC-J-10) and a snap to 16 angles are fallbacks.
- Cost to change: Low.
- Revisit if: Rotation shimmer is visible.
- Owner feedback: —

### TAC-J-17 · Effects are procedural particles; no gore
- Status: planned  ·  Packet: WP-V11
- Decision: Tracers, muzzle flashes, sparks, dust, smoke, explosions and casings are drawn by code. Hits show sparks and dust, downed soldiers lie down; there is no blood.
- Why: Particles in code need no art, scale with budgets and stay consistent. No gore matches the project's tone so far (and its rating-neutral, portfolio setting).
- Alternatives rejected: Sprite-sheet effects (art volume); graphic damage (against the tone).
- Cost / risk: Less flavour than hand-drawn effects.
- Cost to change: Low.
- Revisit if: The owner wants more visceral feedback; add it as an option.
- Owner feedback: —

### TAC-J-18 · Lighting is a darkness mask with lights cut out of it
- Status: planned  ·  Packet: WP-V12
- Decision: A time-of-day tint, plus an offscreen darkness layer in which muzzle flashes, lamps and the MRAP's searchlight cone are cut out as radial gradients and cones. Night and caves use it; shadows are off there.
- Why: It gives the night and cave levels their mood in Canvas 2-D without shaders, and it is cheap at this scale.
- Alternatives rejected: Per-pixel lighting (WebGL); no night (the cave level loses its premise).
- Cost / risk: A single mask limits colour variety; heavy overlap of lights costs more.
- Cost to change: Low.
- Revisit if: Frame time suffers on phones; lower the mask resolution.
- Owner feedback: —

### TAC-J-19 · In-world UI is drawn on the canvas; labels stay in the DOM
- Status: planned  ·  Packet: WP-V13
- Decision: Selection brackets, order markers, health pips and the AI-view overlay are canvas drawings. Callout bubbles and state labels stay DOM elements over the canvas.
- Why: DOM text is accessible, crisp and already built; canvas overlays are cheap for shapes.
- Alternatives rejected: Everything on the canvas (loses accessibility and crisp text); everything in the DOM (slow with many markers).
- Cost / risk: Two layers to align.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-20 · The overworld looks like a retro handheld region map: banded greens, flat blue sea, yellow routes, red-roofed towns
- Status: planned  ·  Packet: WP-V14, WP-V15
- Decision: A low-resolution height grid drawn in green bands (light highland to dark coast) with a thick coast outline on flat blue sea, scaled with nearest-neighbour. Routes are yellow on land and blue on the sea; towns and bases are small red-roofed icons.
- Why: That is the fourth reference and the owner's brief. It reads instantly as 'a map you travel on', it is very cheap to render, and it contrasts with the tactical view so you always know which layer you are in.
- Alternatives rejected: A painted map (art volume); a satellite or realistic terrain map (does not match the retro direction); reusing the tactical renderer for it (wrong scale and no overview).
- Cost / risk: A stylised map gives less sense of terrain for tactics; the tactical map carries that.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-21 · The island is authored data, with generated shading
- Status: planned  ·  Packet: WP-V14, WP-V17
- Decision: The island's shape and node positions are a stored, seeded grid with hand edits, not random each visit. Bands and coast are computed from the grid.
- Why: The island is a story object: it has a name, towns, a front line you push. A different island each time would break the campaign's continuity and the saved territory state.
- Alternatives rejected: Fully random islands (no story, saves break); a hand-painted image (hard to change and to colour by territory).
- Cost / risk: A change to the island needs a data edit (and migration if saves reference cells).
- Cost to change: Medium once saves exist.
- Revisit if: We want replayable random islands.
- Owner feedback: —

### TAC-J-22 · The whole island fits one screen at an integer zoom; entering a node zooms into its tactical map
- Status: planned  ·  Packet: WP-V16
- Decision: The overview shows everything at 1x or 2x with optional pan; selecting a node and entering a mission is a zoom transition into the tactical view.
- Why: A small island is readable in one glance, which suits a demo and phones. The zoom transition shows how the two layers relate (the tactical map is a close-up of a place on the overworld).
- Alternatives rejected: A scrolling world map (more art and UI); a menu list of missions (loses the overworld).
- Cost / risk: Limited island size.
- Cost to change: Low.
- Revisit if: The island needs more than one screen.
- Owner feedback: —

### TAC-J-23 · Territory is shown by tint plus a non-colour cue
- Status: planned  ·  Packet: WP-V15
- Decision: Resistance-held regions tint green, Invader-held red, contested regions are hatched. Icons and outlines change too (a flag shape), so colour is not the only signal.
- Why: The Resistance and the Invader must be distinguishable by colour-blind players, and the hatched state tells the story of a front line.
- Alternatives rejected: Colour only (accessibility); hard borders only (loses the retro fill).
- Cost / risk: More states to draw.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-24 · 2-D becomes the default only when a parity checklist is green; 3-D stays one release
- Status: planned  ·  Packet: WP-V18
- Decision: A checklist lists every 3-D feature (orders, pause, AI view, loot, swap, objectives, MRAP turret, effects). When all work in 2-D and contact sheets match, 2-D becomes the default and `?view=3d` remains for one release, then goes.
- Why: A visible, testable bar, and a way back if something is missed. The 3-D code is deleted rather than kept as dead weight.
- Alternatives rejected: Switching on a date; keeping both forever.
- Cost / risk: A period of two views.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-25 · Two looks on purpose: the Workbench and Operator Customiser stay 3-D; the shooter and overworld are 2-D
- Status: planned  ·  Packet: WP-V6, WP-V18
- Decision: The gear-focused pages keep their 3-D presentation (rotate a rifle, strip it, dress an operator); the playing field is 2-D. A shared palette, a shared outline rule and baked weapon sprites tie them together.
- Why: 3-D is the right tool for inspecting gear from every angle; 2-D is the right tool for a readable battlefield. The same rifle must look like the same rifle in both, which TAC-J-10 provides.
- Alternatives rejected: Moving everything to 2-D (loses the Workbench's strengths); everything 3-D (loses the shooter's readability).
- Cost / risk: Two renderers to maintain.
- Cost to change: Low.
- Revisit if: The mismatch bothers players.
- Owner feedback: —

### TAC-J-26 · Performance budget: 60 fps on desktop, a 30 fps floor on a mid phone, with caches and caps
- Status: planned  ·  Packet: WP-V19
- Decision: Ground and structures are cached to offscreen canvases; sprites come from atlases; particle and light counts are capped; a test checks the draw and sprite counts per level.
- Why: The site already adapts resolution and throttles idle rendering for phones; the shooter must fit that. A numeric budget in a test stops drift.
- Alternatives rejected: No budget (it will regress); only desktop testing.
- Cost / risk: Caps can clip big fights visually.
- Cost to change: Low.
- Revisit if: Real-device numbers disagree with the budget.
- Owner feedback: —

### TAC-J-27 · Gameplay is never blocked on art: placeholders first
- Status: planned  ·  Packet: WP-V3
- Decision: WP-V3 draws today's level with flat placeholder sprites, so every gameplay packet (swap, levels, inventory) is playable in the 2-D view while the art arrives.
- Why: The two roadmaps run in parallel. A real renderer with placeholders is better than waiting for finished art, and it lets us judge layout and readability early.
- Alternatives rejected: Building all art first (a long wait with no playable result).
- Cost / risk: Placeholders look rough for a while.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-J-28 · The RimWorld-style placeholder set is the interim art for the 2-D renderer
- Status: planned  ·  Packet: WP-V3, WP-V5, WP-V6, WP-V8, WP-V9, WP-V10
- Decision: The owner's `inbound/Placeholder Assets/` set (about 5,400 files, RimWorld-style) stands in for hand-made art while the renderer, paper dolls and levels are built. Its conventions become ours: a 128 px canvas per character layer, three drawn directions (south, east, north; west is east mirrored), grey layers tinted by palette, 4×4 auto-tile atlases for walls and cover. The survey and the file-to-packet mapping are in `docs/placeholder-assets.md`.
- Why: It matches the references already on the moodboard (outlined paper-doll layers, armour and helmet sets, top-down ruins and wrecks), so the look is right from day one and gameplay is never blocked on art (TAC-J-27).
- Alternatives rejected: Waiting for generated or hand-drawn art (a long wait with no playable result); drawing all placeholders procedurally (slower and looks worse than the set).
- Cost / risk: The set appears to be RimWorld's own textures, so it is a stand-in only and must be replaced before any public release; the swap path is the manifest in TAC-J-29.
- Cost to change: Low.
- Revisit if: Owner-made or licensed art arrives, or before the first public release.
- Owner feedback: —

### TAC-J-29 · The raw set stays out of the site; only converted, listed sprites ship
- Status: planned  ·  Packet: WP-V4
- Decision: The 987 MB set stays in `inbound/` (never deployed: the Pages build is an allowlist). A converter in `tools/sprites/` flattens PSDs, trims, quantises to the palette and writes atlases plus a manifest that lists every source file used. Only the atlases and the manifest enter `assets/`.
- Why: The set is mostly layered PSDs and 512 px textures. Shipping it would bloat the site by about a gigabyte and tie us to files we need to replace. The manifest makes the replacement list exact.
- Alternatives rejected: Copying PNGs into `assets/` by hand (no record, no palette pass); committing the PSDs to `assets/`.
- Cost / risk: The repository itself is heavy (a gigabyte of binary history); the owner may want to move `inbound/` out of git.
- Cost to change: Low.
- Revisit if: Repository size becomes a problem.
- Owner feedback: —

### TAC-J-30 · Paper dolls are built from the set's layers; weapons come from the set first, our own rifles from render-to-sprite
- Status: planned  ·  Packet: WP-V5, WP-V6
- Decision: Bodies (thin, average, female, fat, hulk), heads, hair, beards and the apparel pieces (flak vest, recon armour, helmets, hoods, parka, duster, pants, shirts, masks) are the layer stack, tinted by faction palette. Side-view weapon sprites (assault rifle, LMG, sniper, bolt action, shotgun, machine pistol, heavy SMG, rocket launcher, pistols, grenades) cover the first loadouts; rifles the set lacks (G3, Mk 14, SIG Spear, StG 44, PPSh-41, Bren, Chauchat, our AKs) come from the render-to-sprite pass on the Workbench models (TAC-J-10).
- Why: The set gives a complete layered character and a convincing first weapon roster; the Workbench models cover what it lacks and keep the rifle in the shooter identical to the rifle on the bench.
- Alternatives rejected: Only render-to-sprite (loses the hand-drawn outline look); only the set (no G3, Spear or AK).
- Cost / risk: Two weapon styles side by side until the render pass gets the same outline treatment.
- Cost to change: Low.
- Revisit if: The mix looks inconsistent in the Sprite Lab.
- Owner feedback: —

### TAC-J-31 · Terrain, cover and wrecks come from the set, downscaled and palette-snapped to 32 px per metre
- Status: planned  ·  Packet: WP-V8, WP-V9, WP-V10
- Decision: The 512 px surface textures (soil, rich soil, packed dirt, gravel, sand, concrete, asphalt, flagstone, wood floor, mud, mossy) are scaled down to 32 px tiles and snapped to the art-bible palette, with edge-blend variants made by the converter. Walls, sandbags, barricades and fences use the set's 4×4 atlases. Cover and wrecks use the ruins: concrete barriers, crates, military crates, tank traps, razor wire, rusted military jeep, truck, APC and tank wrecks. Trees, bushes and grass come from the plant sprites. Intact vehicles are recoloured wrecks or render-to-sprite from the Sketchfab MATV, Humvee and army truck.
- Why: Every piece the convoy valley, compound and cave need exists in some form, and the wrecks give the vehicle wreck state (WP-V10) for free.
- Alternatives rejected: Hand-drawing terrain tiles; using the textures at full size (blurry against the sprites, heavy).
- Cost / risk: The textures are photographic next to the outlined sprites; the palette snap must hide that.
- Cost to change: Low.
- Revisit if: The snapped terrain looks muddy in the contact sheet.
- Owner feedback: —

### TAC-J-32 · A first 2.5-D sprite view, side by side with the 3-D page, before the renderer interface
- Status: built  ·  Packet: WP-V3 (early test)
- Decision: `convoy/sprites.html` plays the same missions through the same simulation, drawn on a Canvas 2-D with the placeholder art: paper-doll pawns built from tinted body, clothes, head, hair and headgear layers (three directions, west mirrored), side-view weapons that turn with the aim, rusted vehicle sprites tinted army green (burnt when destroyed), rocks, logs, sandbag-atlas walls, a plank barn, a baked ground of feathered terrain textures with grass and stone scatter, shadows, tracers, muzzle flashes, explosions that scorch the ground, smoke, RimWorld-style name labels, health bars, selection brackets and speech bubbles.
- Why: The owner asked to see the ambush in the target style now. A separate page proves the look and the art pipeline without touching the 3-D game, and it uses only the simulation's public state, so it becomes the 2-D renderer of WP-V3 once the interface of WP-V2 exists.
- Alternatives rejected: Waiting for WP-V1 and V2 (no picture to judge for weeks); switching the 3-D page over (risky, and the AI view is not ported yet).
- Cost / risk: Two input and HUD copies (game.js and sprite-game.js) until WP-V2 merges them; the AI view is not in the sprite page yet.
- Cost to change: Low.
- Revisit if: The owner prefers the 2-D view as the default before WP-V18.
- Owner feedback: —

### TAC-J-33 · Weapon sprites are rendered from the Workbench models, outlined, at real length
- Status: built  ·  Packet: WP-V6 (early)
- Decision: `tools/sprites/render-weapons.mjs` renders every Workbench rifle in its factory build side-on (muzzle right) with flat light, then draws a dark outline round the silhouette, lifts and warms the colours, and writes `assets/sprites/weapons/<id>.png` (256 px) with a manifest of labels and real lengths. The sprite view draws each gun at 1.4 times its real length, the way the set oversizes weapons. Re-run the script when a rifle or its default build changes.
- Why: The gun in the shooter must be the gun on the bench (TAC-J-10); rendering keeps the two in step automatically, and the outline pass makes the 3-D art read like the hand-painted set sprites next to it.
- Alternatives rejected: Hand-drawing each gun (slow, drifts from the bench); using only the set's eight guns (no G3, Spear, AKs).
- Cost / risk: Factory builds only; a player's custom build is not drawn yet.
- Cost to change: Low.
- Revisit if: The custom build should show in the shooter (render on demand from the loadout code).
- Owner feedback: —

### TAC-J-34 · Rebel cosmetics in the sprite view: layers from the set, chosen per rebel, saved in the browser
- Status: built  ·  Packet: WP-V5 (early)
- Decision: A Look panel per rebel picks the gun shown (every Workbench rifle plus the set's guns), body type, skin, hair and hair colour, shirt, outfit (jacket, parka, duster, flak vest or jacket, recon or plate armour, cape, robe), headgear (helmets, hood, tuque, cowboy and bowler hats, masks, veil) and the colour of each. It previews front and side, and saves to `localStorage` (`parp-sprite-looks`). Cosmetics change only the sprites; the simulated weapon and stats stay as they are.
- Why: The paper-doll layers make dressing a rebel cheap, and seeing your own squad on the field is the point of the style test. Keeping it cosmetic avoids touching the balance before the inventory (section C) exists.
- Alternatives rejected: Tying the gun choice to the simulated weapon now (needs per-gun stats in the shooter); a separate customiser page (more clicks for a test).
- Cost / risk: A cosmetic gun can disagree with the weapon the HUD names until the inventory links them.
- Cost to change: Low.
- Revisit if: Section C (inventory and looting) lands: the equipped item then decides the sprite.
- Owner feedback: —


### TAC-J-35 · Modder cameras snap like a garage camera; a low-angle gunner shot in the Operator Modder
- Status: built  ·  Packet: WP-V5 (early)
- Decision: Every camera move in the Operator and Weapon Modders (`shared/stage.js` `moveCamera`) winds up, accelerates hard, swings around the subject (direction slerped, distance lerped) instead of cutting through it, overshoots its mark by about 3 % and clicks into place, in 0.55 s, after the mod-shop camera of Need for Speed: Underground 2. Reduced motion still jumps. The Operator Modder gains a **Low angle** view (lens at knee height, medium close-up on the chest and face), a **Gunner · low angle** pose (machine gun across the chest, muzzle up and to the left, both hands on) and a **Gunner · low angle** look preset that combines them with a balaclava, black shirt, olive plate carrier and mag pouches, olive trousers and an RPK with the drum (now offered on the RPK).
- Why: The owner asked for a snap feel when switching cameras and for a shot matching a reference photo of a masked gunner seen from below.
- Alternatives rejected: A spring simulation per frame (harder to time and to test); the old ease-out glide (no snap).
- Cost / risk: The overshoot can clip near geometry on very close views; the swing makes back-to-front moves longer arcs.
- Cost to change: Low (three constants in `shared/stage.js`).
- Revisit if: Owner feedback on the feel, or the in-game camera needs the same moves.
- Owner feedback: —

### TAC-J-36 · The 2.5-D view is Partisan Tactical; the 3-D top-down page is deprecated
- Status: built  ·  Packet: WP-V5
- Decision: `convoy/` now opens the 2.5-D RimWorld-style view (formerly `convoy/sprites.html`, which redirects there). The 3-D page moves to `convoy/3d.html`, says it is deprecated, leaves the index menu, and gets no new work; it stays only because the AI view has not moved across yet. The paper-doll layers are scaled to the 128 px doll canvas (the hood and capes come at 256 px and were drawn cropped, a green box beside the head).
- Why: The owner judged the 2.5-D style better than the 3-D top-down view.
- Alternatives rejected: Deleting the 3-D page now (loses the AI view, which the AI work still uses); keeping both in the menu (two doors to the same game).
- Cost / risk: Two renderers share one simulation until the 3-D page goes; its tests still run.
- Cost to change: Low.
- Revisit if: The AI view is ported to the 2.5-D renderer: then delete `convoy/3d.html` and `convoy/game.js`.
- Owner feedback: "the rimworld style works better than 3d"

### TAC-J-37 · A synthesised soundscape for the top-down missions
- Status: built  ·  Packet: WP-V5
- Decision: `convoy/soundscape.js` gives both top-down views sound. The simulation queues sound events (`sim.sounds`: shot, impact, explode, reload, switch, death, hurt, wreck, collapse, say, alarm); the soundscape drains them each frame and polls what has no event (reload progress, footsteps, engines). Gunfire is synthesised per weapon (crack, band-passed blast, low thump, rolling tail, echo off the treeline), with supersonic snaps and whizzes for rounds passing close, impacts per surface (ground, wall, metal with ricochets, flesh), explosions with debris and blast deafness, engines that rev with speed, burning wrecks, radio squelch on the radio operator's calls, and per-level ambience (wind, birds that fall silent at the first shots, crows, leaves; night crickets and an owl; cave drips and drone with a long reverb). Reloads use the recorded Workbench foley bank in a per-weapon choreography. Sound is placed relative to the active rebel: pan, distance gain, air low-pass and the speed-of-sound delay. The tactical pause and slow-motion picker dull the mix. M or the Sound button mutes; the choice is saved (`parp-sfx`).
- Why: The owner asked for a detailed soundscape with good gun sounds, environments and reloads. No gunfire recordings are in the project, and synthesis keeps the build small and every sound tunable in code.
- Alternatives rejected: Recorded gunfire packs (none in the repository; licensing and size); one generic shot sound (every gun sounding alike).
- Cost / risk: Synthesised gunfire is less rich than good recordings; heavy fire is capped at about 90 voices (far shots drop first).
- Cost to change: Low: swap a synth voice for a sample in `shot()` when recordings arrive.
- Revisit if: Recorded weapon sounds land in `inbound/`.
- Owner feedback: —

### TAC-J-38 · The Recon (generated) is the default operator, always armed; the kitbashed Recon is deprecated
- Status: built  ·  Packet: WP-CG1 follow-up
- Decision: The Operator Modder opens on the generated Recon, now called just "Recon", in low ready. The kitbashed Recon (Base Operator plus the hood pack) leaves the roster as deprecated; `#base=recon` links still load it. The operator always holds a weapon: the weapon slot has no "None", the default is the AK-74M, or the user's Workbench build when one is saved in the browser (`parp-loadout`); that default fills fresh states (first load, reset, presets, base switch), not the slot default, so shared links keep naming their gun. Poses with no hands on the rifle (Relaxed, Radio check, Overwatch, Salute) carry it slung across the back. Camera moves in the Operator Modder are faster and tighter (0.32 s, about 2 % overshoot). Every change on the operator plays a Workbench handling sound (recorded foley): gear latches and clunks, colours tap, poses handle, weapons set down and rack, presets and random clunk and rack.
- Why: Owner request.
- Alternatives rejected: Deleting the kitbashed Recon (breaks old links); hiding the gun in rifle-less poses (the owner wants it always in the scene).
- Cost / risk: The slung position is one placement for every operator; a bulky pack can show the rifle clipping it.
- Cost to change: Low.
- Revisit if: More generated operators land, or the sling needs per-operator offsets.
- Owner feedback: —

### TAC-J-39 · The opening scene's button loads every demo through the Nokia
- Status: built  ·  Packet: WP-V5
- Decision: A half-size Nokia lies lit on the workbench in the opening scene, beside the rifle. "Customize this weapon" became "Load all demos": a key press, then the camera pushes down onto the phone's screen, fades, and the index (`menu/`, the same phone close up) opens. The Weapon Modder stays one entry in that index.
- Why: Owner request; the index holds every demo, so it is the right first step.
- Alternatives rejected: Keeping both buttons (the scene has one action by design).
- Cost / risk: The Weapon Modder is one click further from the opening scene.
- Cost to change: Low.
- Revisit if: The opening scene gets a second purpose (a story beat, a save slot).
- Owner feedback: —

### TAC-J-40 · RimWorld-style shooting in the 2.5-D view: rounds in flight, aim warmup, motes, hit chance, camera feel
- Status: built  ·  Packet: WP-V5
- Decision: Compared with RimWorld's combat, the 2.5-D view drew hitscan lines and resolved hits at once. Now, as in RimWorld, where a round goes is decided when it is fired and it lands when it arrives: `sim.projectiles` holds rounds in flight at each weapon's speed (rifles 45 m/s, PKM 48, SVD 62, DShK 50, RPG 28, grenades 16 on an arc), drawn with the set's bullet, rocket and grenade sprites (the rocket trails smoke, the grenade arcs over its shadow); damage, bursts and impacts happen on arrival (`sim.impacts`). The player aims before a string of shots (`warmup`: 0.25 s rifle to 0.8 s RPG) and, like every army shooter waiting to fire, shows RimWorld's aim pie over the head. Hovering an enemy shows the hit chance (from the simulation's own spread model), "No clear shot" or "Out of range". Every shot flashes at the muzzle and lights the ground (stronger at night); hits throw dust and debris, sparks off metal, chips off walls, and blood that stays on the ground as filth; blasts throw debris, dust rings and a glow. Beyond RimWorld, at the owner's request: the camera kicks with your own shots, near misses, hits on you and blasts (none under reduced motion), a near blast flashes the screen and a hit reddens its edge, the camera follows the mouse (it leans toward the cursor's side of the screen), and holding the right mouse button zooms in a little and leans further (a right click still gives squad orders).
- Why: Owner request: make the shooting feel like RimWorld's, with shake, flash, projectiles, a right-click zoom and a camera that moves with the mouse.
- Alternatives rejected: Visual-only bullets over hitscan damage (the target would fall before the round reached it); RimWorld's click-to-target drafting in place of twin-stick control (a different game; the warmup and pie carry the feel).
- Cost / risk: Hits land up to two seconds late for rockets, so the AI and tests see damage after the flight; the 3-D page gets the same delay without the sprites.
- Cost to change: Medium (simulation timing).
- Revisit if: Rounds should be dodgeable (re-test the hit on arrival instead of at launch), or the inventory brings per-gun stats.
- Owner feedback: —

### TAC-J-41 · No aim wait for the player; ammo and reload on the map
- Status: built  ·  Packet: WP-V5
- Decision: The player's aim warmup from TAC-J-40 is removed: the trigger fires on the first frame. Army shooters keep RimWorld's aim pie before a burst (it tells you who is about to fire). The map shows the magazine and reserve bottom left (flashing when low), a reload bar, and a reload ring with "RELOADING" round the cursor; an empty magazine says "R RELOAD" or "EMPTY" there.
- Why: Owner feedback: the wait before shooting read as a bug; a reload and an ammo counter were missing on the map.
- Alternatives rejected: A shorter warmup (still a wait under direct control).
- Cost / risk: Less of RimWorld's rhythm for the player; the enemy pies keep the read.
- Cost to change: Low.
- Revisit if: Orders-based (drafted) control returns, where a warmup belongs.
- Owner feedback: "having to wait before shooting is probably a bug"

### TAC-J-42 · A real-size Nokia with a live screen, and a dithered load-in for the opening scene
- Status: built  ·  Packet: WP-V5
- Decision: The opening scene's phone is a 3310 at real size (113 x 48 x 22 mm) with an 84 x 48 pixel LCD drawn about 12 times a second: a lambda turning in a sweeping light, ordered-dithered to the LCD's two tones, then a console log scrolling, in turn. The screen is unlit (backlit, never washed out by the lamp). While the scene loads, a Nokia-green band sweeps through an 8 x 8 ordered dither on black; when it is ready the black drops out from the middle outwards.
- Why: Owner request.
- Alternatives rejected: A video or GIF on the screen (bytes, and no dither control).
- Cost / risk: The phone is small in the opening frame; the push-in still lands on its screen.
- Cost to change: Low.
- Revisit if: The phone becomes interactive in the scene.
- Owner feedback: —

### TAC-J-43 · The Recon wears its generated colours
- Status: built  ·  Packet: WP-CG1 follow-up
- Decision: `tools/assets/bake-generated-recon.mjs` bakes the textured generated model's colours onto the runtime Recon (one 2048 px atlas, one tile per part, nearest-point transfer in the importer's frame), so the Recon loads in its original look; "Original" in each colour zone shows it and any other colour repaints flat.
- Why: Owner: the Recon's textures existed but were not loaded. The split-parts source the runtime model is built from has no material and per-part UVs, so the importer had used flat colours.
- Alternatives rejected: Shipping the 193,534-triangle textured mesh (no separate equipment, no rig); per-part textures (27 images).
- Cost / risk: The model grows from 281 KB to 633 KB; nearest-point transfer softens fine detail at seams.
- Cost to change: Low (re-run the bake after the importer).
- Revisit if: A higher-detail runtime mesh, or a source with the textures on the split parts.
- Owner feedback: —

### TAC-J-44 · The Nokia index explains before it launches: a dithered preview, sounds down a phone line
- Status: built  ·  Packet: WP-V5
- Decision: In the index (`menu/`), the first tap, Enter or number key on a demo folds open an explainer under it instead of launching. The explainer holds a 112 x 44 pixel preview of the demo, drawn as grey shapes and ordered-dithered to the two LCD tones about ten times a second. Each demo has its own scene: the convoy under fire, an optic snapping onto a rifle, the operator turning while kit appears, a band member levelling up, a turning wireframe and so on. Below the preview sit the demo's description and a blinking "TAP AGAIN TO OPEN". A second tap on the item or the explainer, Enter, the same number or the OPEN soft key launches the demo; another item moves the explainer there; Escape or BACK folds it shut. While the explainer is open, the demo's sounds come in as if down a GSM call: telephone band, coarse quantiser, codec warble, line hiss, the 217 Hz buzz and occasional drop-outs. They play only when the site's sound preference is on. Sound and About still act at once. Under reduced motion the preview is a still frame and the fold does not animate.
- Why: Owner request: tapping should explain the demo first, with a small dithered gameplay animation and phone-call sound.
- Alternatives rejected: Dithered screenshots or video of each demo (bytes, and stale as the demos change); a separate preview screen (loses the place in the menu).
- Cost / risk: One more tap to reach a demo.
- Cost to change: Low (`assets/js/previews.js`).
- Revisit if: The previews should show real captured gameplay.
- Owner feedback: —

### TAC-J-45 · The 3-D shooter is retired; switching rebel slows time and dithers the world
- Status: built  ·  Packet: WP-V
- Decision: The RimWorld-style 2.5-D view is the only view of Partisan Tactical. The three.js page (`convoy/3d.html`, `convoy/game.js`) moves to `docs/archive/convoy-3d/`, its link leaves the page, and its browser tests now run on the sprite page. While you choose a rebel (Q), time runs at 15% and the map eases into the Nokia's two tones: a third-resolution Bayer 4x4 dither of the frame (ink #16200f, paper #b5c79a) laid over the scene with a dark green vignette, and back out when you pick. Under reduced motion time stops instead, with no dither.
- Why: Owner request: deprecate all 3-D top-down shooter code (RimWorld is the base graphics system), and make the switch a slow-motion moment with a dither effect.
- Alternatives rejected: A full-resolution dither (too fine to read as the LCD); greyscale only (loses the Nokia identity).
- Cost / risk: A frame read-back each frame while the picker is open (small, at a third of the resolution).
- Cost to change: Low (`ditherOverlay` in `convoy/sprite-render.js`).
- Revisit if: The picker should freeze time completely.
- Owner feedback: —
