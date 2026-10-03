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

