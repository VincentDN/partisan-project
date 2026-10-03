# Placeholder assets: survey for the 2.5-D top-down look

The owner added `inbound/Placeholder Assets/` (987 MB, about 3,400 PSD, 1,660 PNG and 30 JPG files, RimWorld-style). This page says what is in it and which graphics packets (`docs/graphics-roadmap.md`, WP-V1 to V20) can use it. Decisions are TAC-I-28 to TAC-I-31 in [design-decisions/I-graphics.md](design-decisions/I-graphics.md).

**Provenance.** The folder layout and names (Things, Terrain, World, UI, Damage, Weather, Designations, `Recon armor`, `Thrumbo`) match RimWorld's own texture set, so treat it as a stand-in for development only. It is never deployed (the Pages build is an allowlist), and the swap list is exact once the converter writes its manifest (TAC-I-29).

## What is in it

| Folder | Files | Size | Content |
|---|---|---|---|
| `Things/Pawn` | 1,209 | 37 MB | Humanlike bodies, heads, hair, beards, apparel; 60 animals; mechanoids; wounds; overlays |
| `Things/Building` | 674 | 201 MB | Walls and fences (auto-tile atlases), sandbags, barricades, doors, ruins, turrets, furniture, power, ship parts |
| `Things/Item` | 311 | 11 MB | Weapons (ranged and melee), resources, meals, drugs, medicine |
| `Things/Mote` | 220 | 30 MB | Effects: flashes, puffs, smoke, sparks, blood, fire, beams, debuff icons |
| `Things/Plant` | 177 | 9.8 MB | Trees, bushes, grass, crops, cacti, in growth and season variants |
| `Things/Filth`, `Projectile`, `Special`, `Gas`, `Skyfaller` | 130 | 56 MB | Rubble and spatter, bullets, shells, rockets, grenades, fire, drop pods |
| `Terrain` | 43 | 359 MB | Surface textures at 512 px (soil, sand, gravel, concrete, asphalt, flagstone, floors), scatter debris and smears |
| `UI` | 544 | 228 MB | Icons, buttons, widgets, cursors, overlays, 220 MB of hero art |
| `World` | 80 | 28 MB | Biome tiles, hills, mountains, settlement and caravan glyphs |
| `Damage`, `Weather`, `Designations`, `Other` | 62 | 30 MB | Scratch overlays, rain and snow, order icons, fog of war, noise masks |

About two thirds of the files are layered PSDs. `convert file.psd[0]` (ImageMagick) flattens them; the PNGs are ready to use.

## What it looks like

- **Characters** (`Things/Pawn/Humanlike`): 128 px canvases, thick dark outline, three directions drawn (south, east, north; west is a mirror). Body, head and hair layers are grey and meant to be tinted; apparel layers are shaded for a body type each (thin, average, female, fat, hulk). This is the paper-doll format in `ref-2d-armour-sprites-1/2.png`.
- **Weapons** (`Things/Item/Equipment/WeaponRanged`, 31 PNG): side-view 128 px sprites with the same outline: assault rifle (M16-like), LMG (Bren-like), sniper, bolt-action, shotgun, machine pistol, heavy SMG, rocket launcher, revolver, pistol, grenades, molotov, bows.
- **Ruins** (`Things/Building/Ruins`): concrete barriers, crates, military crates, tank traps, razor wire, security turrets, and wrecks: rusted military jeep, truck, car, APC and tank (320×192 px, damaged and rusted).
- **Walls and cover** (`Things/Building/Linked`): 4×4 auto-tile atlases (bricks, planks, smooth, sandbags, barricades, metal fences) so edges and corners join.
- **Terrain** (`Terrain/Surfaces`): seamless 512 px painterly textures, not pixel art.
- **Plants**: painterly trees, bushes and grass sprites.
- **Effects** (`Things/Mote`): soft puffs, flashes, sparks, blood splashes, fire; bullets are streak sprites.
- **World map** (`World`): biome tiles are flat textures and the glyphs are white icons, so they suit a legend, not the Pokémon-style island.

## Mapping to the graphics packets

| Packet | Use from the set | Notes |
|---|---|---|
| WP-V1 art bible | Outline weight, 128 px layers, three directions plus mirror | Use as the measured reference for outline and proportion |
| WP-V3 renderer | Anything as placeholder sprites | Lets gameplay packets play in 2-D at once (TAC-I-27) |
| WP-V4 sprite tooling | Converter: flatten PSD, trim, palette-quantise, atlas, manifest | The set is far too big to ship as is (TAC-I-29) |
| WP-V5 paper dolls | Bodies, heads, hair, beards, apparel (flak vest, recon armour, helmets, hood, parka, duster, pants, shirts, mask) | Faction by tint; PSD-only pieces need flattening first |
| WP-V6 equipment | 31 weapon sprites, melee, grenades; projectiles | Rifles the set lacks come from render-to-sprite of the Workbench models |
| WP-V7 animation | Static poses only; bob, recoil and kneel are code | Same as the original game; wounds and scratch overlays help |
| WP-V8 terrain | Eleven surface textures, scatter debris and smears, grass, bushes, trees, rubble | Downscale 512 to 32 px tiles and snap to the palette |
| WP-V9 structures and cover | Wall, sandbag, barricade and fence atlases; concrete barriers, crates, tank traps, razor wire, turrets, doors, rocks | Cave walls: rock atlases |
| WP-V10 vehicles | Rusted jeep, truck, car, APC and tank as wrecks; wheels and engine blocks as debris | Intact vehicles: recolour or render-to-sprite from the Sketchfab MATV, Humvee and army truck |
| WP-V11 effects | Muzzle flash, puffs, sparks, blood, explosion flash, bullet streaks, shells, rockets, fire | No gore: use the dust and spark motes |
| WP-V12 lighting | Light shafts, fog of war masks, noise masks | Optional |
| WP-V13 world UI | Selection and order icons, health and status motes, cursors | The Nokia-green HUD stays; these are in-world markers |
| WP-V14 to V17 overworld | Not suited | The retro island needs its own tile set (WP-V14) |
| Inventory and looting (roadmap section C) | Item icons: resources, medicine, meals, drugs, weapons | 128 px icons for the loot grid |

## Gaps

- No intact military vehicles (wrecks only), no soldiers in modern fatigues (the apparel is sci-fi, tribal and colonial: recolour the flak vest, helmets, hood and duster), no jungle or island terrain tiles beyond soil, sand, gravel and mossy, no retro overworld tiles.
- Several PSD-only pieces (hood, parka, plate armour, most of Things/Building) need a flatten step.
- Two weapon styles will sit side by side until render-to-sprite gets the outline pass (TAC-I-30).

## Housekeeping

- The set is 987 MB of binary files in the repository. Consider moving `inbound/` out of git (an archive branch or release asset) once the converter has made the atlases.
- Next step: WP-V4 builds the converter (`tools/sprites/`), starting with the 31 weapons, the paper-doll layers for one body and the ruins, then a Sprite Lab contact sheet to judge the match.
