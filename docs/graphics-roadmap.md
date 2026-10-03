# Partisan Tactical: graphics roadmap (2.5D top-down sprites and a retro overworld)

The shooter stops being 3-D. It becomes a **RimWorld-style 2.5-D top-down game made of 2-D sprites**: thick dark
outlines, flat fills with a shade or two, layered paper-doll people, long sun shadows, walls you see the front of.
The campaign map becomes a **retro handheld-RPG island map** (the Pokémon region-map look): a low-resolution green
landmass shaded in height bands, flat blue sea, yellow routes, red-roofed towns.

Milestone **V** in `docs/agent-ops/packets.json`; packets `WP-V1` to `WP-V20`, none bigger than M (20 BU), about 250 BU in
total. Every decision and its reasoning is in [design-decisions/I-graphics.md](design-decisions/I-graphics.md)
(IDs `TAC-I-nn`). A packet is not done until its decisions are logged there.

References (on the moodboard in the Game Design Doc):
`ref-2d-armour-sprites-1/2.png` (layered sprites: bodies, helmets, hoods, torso armour, gloves),
`ref-2d-topdown-map.jpg` (the world: tiles, scatter, shadows, ruins, rocks),
`ref-retro-overworld-map.jpg` (the overworld),
`ref-2d-sprite-soldier.jpg` (the outline-and-gear look on a modern soldier).

## What stays and what changes

| Stays | Changes |
|---|---|
| The whole simulation, AI, levels-as-data, objectives, orders ([TAC-X-02](design-decisions/00-principles.md)) | The shooter's renderer: three.js scene → Canvas 2-D sprite renderer |
| The Nokia-green side panels, comms log, HUD | Characters, vehicles, terrain, cover, effects, lighting |
| The Workbench, Operator Customiser, Asset Viewer, Art Style Lab (they stay 3-D on purpose, [TAC-I-25](design-decisions/I-graphics.md)) | The campaign map (a new retro island renderer) |

Because the simulation never touches the renderer, this runs **in parallel** with the gameplay roadmap
([tactical-roadmap.md](tactical-roadmap.md)). WP-V3 gets the existing convoy mission playable in 2-D with placeholder
shapes first, so gameplay work is never blocked on art.

## Sections and packets

Sizes: XS 3, S 8, M 20 budget units.

### Section A: Direction and renderer

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-V1 | S | **Art bible.** Palette, outline rule, scale (1 m = 32 px), sun direction, shadow rule, sprite sizes and naming, layer order; the four references annotated | One page the other packets obey; palette as data (`shared/sprite-palette.js`) with a test that every colour is in the palette |
| WP-V2 | S | **Renderer interface.** Pull the draw calls out of `convoy/game.js` into a `Renderer` contract (map, units, vehicles, tracers, orders, AI overlay, camera); the current three.js code becomes `renderer-3d.js` behind `?view=3d` | The game plays identically through the interface; fingerprint test unchanged |
| WP-V3 | M | **Canvas 2-D renderer.** Camera with integer zoom and pan, pixel-perfect scaling, y-sorted layers (ground, decals, shadows, objects, units, roofs, light, overlays), screen-to-world picking, DPR handling; draws today's level with flat placeholder sprites | Convoy plays in `?view=2d` with orders, pause and AI view; smoke test |
| WP-V4 | S | **Sprite tooling and Sprite Lab.** `tools/sprites/` builds atlases and a manifest from layer images or recipes; a Sprite Lab page shows any sprite, layer stack and animation at zoom with palette swaps (the 2-D twin of the Art Style Lab) | Atlas build is reproducible; manifest validated by tests; Sprite Lab opens every sprite |

### Section B: Characters

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-V5 | M | **Paper-doll people.** Procedural layered soldier in front, back and side views (right mirrored): body, head, face, headgear, vest, pack, gloves, with the dark outline pass; role silhouettes kept (antenna, beret, tube, shield); factions by palette | Every role and every rebel renders; contact sheet reviewed against the references |
| WP-V6 | S | **Equipment layers.** A registry mapping item ids (weapons, attachments, helmets, vests, packs) to sprite layers; weapons and vehicles may be baked from the 3-D models by a top-down render-to-sprite pass (the Sketchfab models, with the ink look) | Every Workbench weapon has an in-hand sprite; attachments show on it |
| WP-V7 | S | **Animation and states.** Walk and sprint bob, sneak, aim, fire recoil, reload, kneel to search, wounded, down; weapon layer rotates freely to the aim while the body keeps four directions; swap highlight and selection brackets | Each state visible in the Sprite Lab and in play; reduced-motion safe |

### Section C: World

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-V8 | M | **Terrain.** 32 px tiles (grass variants, dirt, road, sand, rock, floor), soft-edged transitions, seeded scatter (trees, bushes, flowers, stones, mushrooms) with long sun shadows, baked per chunk to an offscreen canvas; `ground` in level data gains tiles and scatter | The convoy valley looks like the world reference; no per-frame cost for ground |
| WP-V9 | M | **Structures and cover.** 2.5-D walls (top and front face), doors, floors, roofs with cut-away when a rebel is inside, towers, cave walls; cover props (rocks, wall segments, wrecks, sandbags, crates, barrels, logs); compound and cave built from level boxes | A building reads as a building; the roof fades when entered; cover looks like what it is |
| WP-V10 | M | **Vehicles.** Jeep, truck, MRAP with a separate rotating turret layer, damage and wreck states, burning, searchlight | All convoy vehicles in 2-D, wrecks included |
| WP-V11 | S | **Effects.** Tracers, muzzle flash, hit sparks and dust, smoke, RPG and grenade explosions, casings, suppression pulses; no gore | Every weapon has a readable effect; particle budget enforced |

### Section D: Light and in-world UI

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-V12 | M | **Lighting.** Time-of-day tint, a darkness mask with lights (muzzle flash, lamps, the MRAP searchlight cone), cave darkness, shadows off at night | Night and cave look right; frame time within budget |
| WP-V13 | S | **World-space UI.** Selection brackets, order markers, health pips, callout bubbles and the AI-view overlay (beliefs, fans, states) ported to the 2-D view; DOM labels stay for accessibility | Everything the 3-D view shows is available in 2-D |

### Section E: The overworld map (retro island)

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-V14 | M | **Island renderer.** A low-resolution height grid drawn as banded greens with a thick coast outline on flat blue sea, scaled with nearest-neighbour; the island is authored data (a seeded generator plus hand edits), not random per visit | The island looks like the overworld reference |
| WP-V15 | S | **Icons and routes.** Towns, outposts, bases, depots, checkpoints as retro icons with red roofs; yellow land routes; blue sea routes; territory tint (Resistance green, Invader red, contested hatched) with a non-colour cue; squad marker | Every node type has an icon; routes drawn from data |
| WP-V16 | M | **Overworld UI and transitions.** Pan and zoom at integer steps, node panel, travel, day/night clock, the zoom-in from a node into its tactical map, Nokia-green HUD | The overworld is a page you can click through and enter a mission from |
| WP-V17 | S | **Overworld data.** `overworld/island.js` format (nodes, routes, regions, starting control), a test that every node is reachable, the first island | Format documented; tests green |

### Section F: Switch-over and polish

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-V18 | S | **Parity and switch.** A parity checklist (every 3-D feature present in 2-D), screenshot contact sheets per level, then 2-D becomes the default; 3-D stays behind `?view=3d` for one release, then is removed | Checklist green; deploy with 2-D default |
| WP-V19 | S | **Performance and phones.** Draw-call and sprite budget, cached ground and structures, particle caps, 60 fps on a desktop and a 30 fps floor on a mid phone, reduced-motion and non-colour cues | Budget numbers recorded and checked by a test |
| WP-V20 | XS | **Docs.** Game Design Doc visuals section, changelog, moodboard, decision log | Doc renders; links work |

## Order of work

1. **A** first and in order: V1 → V2 → V3 → V4. After V3 the 2-D view is playable with placeholders.
2. **B and C in parallel** after V4: V5 → V7 and V8 → V9, V10, V11; V6 follows V5 and the inventory.
3. **D** (V12, V13) once units and structures exist.
4. **E (the overworld) is independent** after V1 and V4: V17 → V14 → V15 → V16. It can start any time.
5. **F** closes it out: V18 after A to D are done, V19 alongside, V20 last.

## Relationship to other packets

- **WP-S7** (level visuals) is superseded by WP-V9 and WP-V12 and is retired.
- **WP-S5, S6** (compound and cave) are built as data and play fine through the placeholder 2-D view; their final look arrives with V8 to V12.
- **WP-S21** (swap UX) needs the camera in V3 (zoom-out) in 2-D; it is built against the interface from V2 so it works in both views.
- The **overworld gameplay** (what happens on the map: territory, supplies, recruiting, missions as map events) is a separate roadmap, to be written next. This one only covers how it looks and how you move around it.

## Risks

- **Art volume.** Dozens of sprites with animations. Mitigation: procedural paper dolls first (TAC-I-09), atlas that lets hand-drawn art replace any layer later, and render-to-sprite for weapons and vehicles.
- **Looking generic.** Procedural sprites can read as clip art. Mitigation: the art bible's outline and palette rules, review against the four references in the Sprite Lab, and a swap path to hand-drawn or generated layers.
- **Two looks in one product** (3-D Workbench, 2-D shooter). Mitigation: shared palette, shared outline, and baked weapon sprites so a rifle looks like the same rifle in both (TAC-I-25).
- **Phone performance.** Canvas 2-D is cheap for hundreds of sprites, but lighting and particles are not. Mitigation: chunk caches, budgets and a test (WP-V19).
- **Renderer switch regressions.** Mitigation: the interface (V2), the unchanged simulation fingerprint, and the parity checklist (V18).
