# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow SemVer; `VERSION` and `index.html` change together.

## [Unreleased]

### Added (campaign)
- **Mission bridge** (WP-W2): `convoy/?campaign=<id>&encounter=<id>` plays the deployment the campaign save holds (its level, seed and fighters, the kit taken out of the stash), with no mission select, restart or practice camp; the debrief writes one result and **Return to the map** settles it once (experience, wounds, kit back, loot in, the record). A reload on the debrief shows it again; a reload mid-mission counts as withdrawn (the fighters come back wounded, nothing taken); an old link plays nothing. Practice mode is unchanged. Rules in `shared/campaign/encounter.js`; the map starts sending deployments in W8/W9.

### Added (Rebel Band)
- **The character under your hands**: point at the big character (or focus it) and WASD or the arrows walk it in place with a stride bob, the mouse swings its weapon to aim while the character keeps facing you (it never turns its back), and when the mouse leaves the weapon eases back to the angle it rests at; a click, Space or F fires with recoil and a muzzle flash, and R reloads with the gun lowered and tilted. Each weapon handles as its type (automatic or one round per press, magazine, reload time) and sounds with the shooter's recordings: footsteps with a gear rattle, real shots, an empty click, the reload choreography from the foley bank. Rounds left show over the character. Reduced motion keeps it still while every action still sounds.

### Added (campaign)
- **Campaign save v1** (`shared/campaign/state.js`, WP-W1): one versioned save for the world, the band, the stash and the encounter log. It migrates the Partisan Tactical squad and the Rebel Band saves on first load (both stay in place for the standalone modules), keeps an unreadable save aside instead of overwriting it, and never throws when storage is blocked. Nothing uses it yet; the mission bridge (W2) and the band on the map (W3) are next.

### Fixed (Operator Modder)
- **No more pixel artefacts round the operator**: the depth-of-field blur and its 4× MSAA buffer are gone; the scene draws straight to the canvas with the browser's antialiasing, and the room behind is sharp. The dirty-lens flares stay, drawn on top, and still hide behind the operator and the crew. TAC-J-54.

### Added (docs)
- **Roadmap and design document consolidated** (5 October): the master roadmap's state, milestones, order of work, tracks, risks and decisions now match the code (eleven rifles, three missions, the sprite view, Rebel Band, Equipment Wiki, the map test, the campaign). Packets that shipped in another form are marked done as built (WP-S5, S6, S21 to S24, S26, V2, V3); the V milestone no longer holds the overworld. The design document's dispatches, campaign loop, progression, feature matrix, moodboard notes, open decisions and specs follow suit.
- **Campaign decisions** (WP-W26, delegated by the owner): barter at friendly villages, auto-resolve only for lopsided fights, an overrun camp is a setback, the 3-D map is the overworld (TAC-K-01 to K-04, `docs/design-decisions/K-campaign.md`); WP-V14 to V16 retired.
- **Campaign roadmap** (`docs/campaign-roadmap.md`, on the site as `docs/campaign-roadmap.html`): how every module becomes one Bannerlord-style game. The band moves on the world map; convoys launch the Convoy Ambush, settlements the Compound Assault, armies that catch you the Rebel Base Defence; loot promotes fighters, fits guns and changes looks. New milestone W (WP-W1 to W26, first playable loop at gate W-A).
- **Walking Through, episode two**: two weeks of vibe-coded games, GPT-6 Astra and Claude Opus 5.5, and what they change for the project (engine choice, cost, assets, disclosure; three experiments). The podcast is now on the site: `docs/podcast/`, rendered with an episode index.

### Added (Overworld Map, test)
- **A Bannerlord-style campaign map** of the island, on the index as Overworld Map: rocky Mediterranean terrain with a snowy massif and an azure coast, nine provinces in their owners' colours, towns, villages, the Invader's fort and the Resistance camp, roads, forests, gulls, boats and drifting clouds. Your party (the hooded Recon, rifle raised) stands on a hill; Invader patrols stand in the distance; convoys drive the roads. Nameplates on every party and town, time controls, party panel and menu bar (placeholders). TAC-J-53.

### Changed (Partisan Tactical)
- **You see them, they see you**: soldiers see as far as you do (30 m) and cannot spot or shoot you from off the screen. The camera starts closer. TAC-B-17.
- **Fog of war** no longer flickers; soldiers fade in and out of sight. TAC-B-17.
- **The squad moves up with you** by default and catches up when left behind. TAC-B-17.

### Changed (everywhere)
- **Antialiasing** in the Operator Modder (it had none). **Faster loading**: every model is parsed once per page, attachments are built when first chosen, rifles are prepared in the background; switching weapons is near-instant. TAC-J-52.

### Added (Operator and Weapon Modders)
- **Dirty lens** in the Operator Modder: when a lamp or the rim light looks into the camera it glints, streaks faintly and lights the grime on the glass; anything in front of the light hides it. TAC-J-51.
- **Room sound**: the warehouse is alive with real recordings: rain on the roof, men talking in the next bay, radio calls, rifles being charged and loaded, bolts, brass, tools, laughter, coughs, footsteps. A Room sound button turns it off. TAC-J-49.

### Added (Weapon Modder)
- **Warehouse backdrop**: the rifle keeps its studio lighting in front of a 360° picture of the Operator Customiser's warehouse (crew and workbench included) that stays put as you orbit. Backdrop shows the sky instead; Warehouse brings the room back. TAC-J-50.
- **CNC kit**: a folding skeletal stock, an M-LOK handguard (RPK, StG 44), a machined grip and a translucent polymer magazine. A **Modern RPK** preset puts them together. TAC-J-50.
- **Operator Modder scene as a GLB** in `outbound/operator-modder-scene/` (character, rifle, pose, crew, room, lights, camera, plus the render settings). TAC-J-50.
- **Every rifle takes every attachment**: optics, muzzle devices, back-up sights, foregrips (GP-25 included), side-rail lights and lasers, triggers, charging handles and slings on all eleven rifles. TAC-J-48.
- **MCX retro textures**: the Spear in chunky dithered bitmap textures. TAC-J-48.

### Fixed (Weapon Modder)
- **M16A1** no longer looks stretched (it was too tall and too thin). **Bren** has blued steel and a walnut stock and grip; **StG 44** a walnut butt and Bakelite grip instead of all black. TAC-J-48.

### Added (Operator Customiser)
- **A crew in the warehouse**: three insurgents idle in the background: one sits on a crate watching your operator, two go through an open weapons crate with their backs to the camera. The workbench, with a rifle on it, is in view under its lamp. TAC-J-47.
- **Depth of field**: the operator stays sharp while the room behind softens. TAC-J-47.

### Added (Partisan Tactical)
- **Real sound**: shots, impacts, flybys, explosions, engines, fires, footsteps, breathing and ambience are now real CC0 recordings (Freesound), fetched and prepared by `tools/audio/fetch-shooter-sounds.mjs`. TAC-J-46.
- **Fog of war**: the map darkens outside what your rebels can see, and enemies there are hidden. TAC-J-46.
- **Sprint** on Shift (stamina), sneak on Ctrl; **hand grenades** on G (three each). TAC-B-16.
- **Exploding vehicles**: a destroyed vehicle blows up, hurts whoever is near, can set off the next one and burns. TAC-B-16.

### Changed
- **Difficulty** now also sets how many soldiers turn up (Easy 55% to Brutal 100%); Normal fields about 70% of a level. TAC-B-16.
- **Operator Customiser**: Bannerlord-style layout (stash left, kit right) in a textured retro Nokia skin; the operator stands in a lit spot in a dark rebel warehouse with three-point lighting. TAC-J-46.

### Changed (index, intro, operator, Rebel Band)
- **Intro boot**: the workbench scene loads behind a Nokia-style boot. The backlight fades up, a lambda draws in, PARTISAN types out, a boot log ticks through and a pixel snake runs round the border as the bench loads. Then READY blinks and the dither reveal plays. About five seconds; any key or click skips it once the bench has loaded.
- **Nokia index**: four demos (Weapon Modder, Operator Modder, Top-down Shooter Tests, Rebel Band). The tools and documents (Equipment Wiki, Asset Viewer, Game Design Doc, Moodboard, Advanced animations, Art Style Lab, Master Roadmap) sit in a Dev tools folder that unlocks after seven taps. A demo's explainer has a big LAUNCH button, and tapping anything else folds it shut. The phone's blips are louder.
- **Operator poses**: three, Hero (rifle up, the default), Relaxed (rifle hanging muzzle-down in the right hand) and Low ready. Relaxed clears the gear with all eleven rifles.
- **Rebel Band**: every rebel idles (breathing, a weight shift, the gun swaying). The upgrade buttons sit right under the character. An upgrade plays an 8-bit fanfare while the character glows, dithers into the new class with a flash and light rays, and a PROMOTED banner shows.

### Added (Partisan Tactical campaign)
- **Loot**: every mission brings home items rolled from the Equipment Wiki's Tarkov-style catalogue: equipment for the stash, trade goods for the trader, salvage from wrecked vehicles. More for winning and on harder difficulties. TAC-C-10.
- **Camp**: between missions the card shows the three missions and their record, the squad with every next class and the equipment it costs, the stash and a trader (sell goods for scrip, buy equipment). Promotions now cost equipment as well as experience. The campaign persists in the browser. TAC-C-10.

### Added (Partisan Tactical: abilities, levelling, difficulty)
- **Class abilities in every level**: each rebel's class from the Rebel Band tree sets its weapons, passives and up to three abilities on Z X V (rockets, FPV drones, guided missiles, breaching charges, smoke, sandbags, mines, recon reveals, jamming, healing, stealth and more), with cooldowns on an ability bar. TAC-B-15.
- **Levelling**: the squad earns experience in missions (kills, objectives, survival, victory) and is promoted along the class tree from the debrief or the SQUAD panel; saved in the browser. TAC-H-14.
- **Difficulty**: Easy, Normal, Hard and Brutal scale damage taken, enemy aim and reactions, and experience. TAC-B-15.
- **Slow-motion switch**: choosing a rebel slows time and dithers the map to the Nokia's two tones. TAC-J-45.

### Removed
- The old 3-D view of the top-down shooter, archived in `docs/archive/convoy-3d/`; the RimWorld-style view is the base graphics system. TAC-J-45.

### Added (Rebel Band class tree)
- **Class tree with abilities**: 44 classes over seven tiers. The path runs Village Infantry → Fighter → Insurgent, then splits into Heavy, Medium or Light builds and their specialists: machine gunners, grenadiers, anti-armour, riflemen, engineers, sappers, medics, drone operators, signallers and EW specialists, scouts, recon, marksmen, snipers, saboteurs. Each class has two abilities and keeps those of earlier tiers. A full-screen Class Tree view shows every path. TAC-H-13.

### Added (Equipment Wiki)
- **Equipment Wiki** (`wiki/`, in the index): 4,227 lootable items in 82 categories, with search, rarity, sorting and item cards (stats, ammunition, mounts, description, loot rarity). Placeholder data is copied from tarkov.dev by `tools/wiki/import-tarkov.mjs`; the icons come from the project's placeholder art. TAC-C-09.

### Removed
- The onboarding tours ("New here?" steps) in the Weapon and Operator Modders. Deprecated; the module is archived in `docs/archive/`. TAC-A-26.

### Changed (Nokia index)
- **Explain, then launch**: the first tap on a demo folds open a small explainer with a dithered preview of its gameplay and its sounds as if heard down a 1990s phone call. A second tap opens the demo. TAC-J-44.

### Documentation
- **Walking Through, episode one** (`docs/podcast/walking-through-01-game-engines.md`): a researched, narration-ready episode on which engine could carry the project into a standalone Bannerlord-like game (Unreal 5, Unity 6, Godot 4, Bevy, Flax, Stride, O3DE, modding routes, staying on the web), weighed against this project. Recommends Godot 4 for the RimWorld-style direction, with Unity 6 as runner-up and Unreal 5 for a first-person version.

### Added (Rebel Band demo)
- **Rebel Band** (`band/`, in the index): a levelling and equipment demo in the RimWorld + Nokia style. Your leader stands in the middle, the band is on the right by class, and the stolen stash is on the left. Troops climb set paths, each step needs specific equipment, and raids give experience, loot and volunteers. TAC-H-12.

### Changed
- **Partisan Tactical**: no aim wait for the player any more. The magazine, reserve and reload now show on the map, with a reload ring at the cursor. TAC-J-41.
- **Opening scene**: the Nokia is at real size, and its LCD loops a dithered lambda and a console log. The scene now loads in with a Nokia-green ordered dither. TAC-J-42.
- **Recon** now wears its generated colours: the textured model's look is baked onto the runtime model (`tools/assets/bake-generated-recon.mjs`). TAC-J-43.

### Added (Equipment assembly rules, WP-CM4)
- Add a renderer-independent equipment resolver with repeated item instances, parent-owned attachments, recoverable subtree removal, socket/grid footprints and explicit compatibility reasons. Coverage restores on removal and budgets include every loaded copy.
- Document the versioned contract for the first carrier and future editor; the existing Modder remains on its current interface.

### Added (Recon headwear and articulated hands, WP-CM3)
- Add a complete stylized head beneath independently removable mask and cap, and cuffed gloves with thirty finger joints. The original Recon remains available; the foundation keeps its hood-free silhouette and stronger chest/neck.
- Compare open, relaxed, rifle and support grips in the inspector. Headwear choices round-trip with saved outfits; poses select hand shapes automatically. The 5,568-triangle model preserves all 26 original body bones and records the recon-v2 extension.

### Changed (Recon foundation proportions, WP-CM2)
- Remove the outer hood from the clean foundation, preserve the textured eyes and rebuild a closed, fitted masked head. Broaden the chest and neck, smooth underarm deformation and retain wrist seam constraints. The foundation now uses 5,263 triangles; the original Recon remains available.

### Added (Recon clean clothing foundation, WP-CM2)
- Add an opt-in Recon foundation with a complete jacket, finished waist/neck, repaired clothing surfaces and fresh cloth textures. Remove the vest, harness and bags from this body; preserve the current Recon for comparison. The new foundation is 7,902 triangles on the unchanged 26-bone skeleton.
- Inspect it unarmed from four sides, switch poses and idles, or customise colours and carry rifles in the Operator Modder. Fit a separate grip and carry profile to the new sleeves; retain temporary headwear and fixed-finger gloves until CM3.

### Added (Recon source teardown, WP-CM1)
- Inspect all 27 original split pieces in assembled, exploded and body-candidate views; select, isolate, frame and inspect measured repair decisions. The stripped view exposes the fused vest, open torso, missing neck and right hand that need rebuilding.
- Record the canonical textured source, corrected skeleton and modular mount contract, with measured geometry allocations and a repeatable source audit. New carriers and the clean body remain subsequent modelling work.

### Planned (Deep character customisation, WP-CM0)
- Added a staged Recon-inspired modular character roadmap and dependency-linked work packets: complete underlying clothing/body, distinct carrier families, individual attachments and bags, fit validation, accessible editing and versioned outfits. This records planned work; new equipment is not implemented yet.

### Added (Recon original comparison, WP-CG2)
- Compare the complete, unchanged inbound Recon with the current modular model side by side. Orbit and zoom stay synchronized; full-body, torso and face views share lighting and scale. Available from the Operator Modder's "Compare Recon with the original model" link.

### Fixed (Recon textures and weapon poses, WP-CG1)
- Transfer the textured inbound model onto the modular Recon with a shared 2K atlas. Replace broken split eyes with the complete head, preserving its face UVs and repairing seam caps. Hood recolouring leaves the face intact; clothing colours retain fabric detail.
- Align glove bones and measured palm centres with the rifle grip solver. Refit eight carry poses to clear chest equipment and keep both hands within reach across eleven rifles. The complete operator remains within budget at 14,523 triangles and about 1.1 MB.
- Honor the existing site-build directory exclusion on Windows, preventing unpublished study links from entering the built site.

### Changed (Partisan Tactical: RimWorld-style shooting)
- **Rounds in flight**: bullets, rockets (with a smoke trail) and arcing grenades are drawn with the set's projectile sprites and land when they arrive; damage comes on arrival. TAC-J-40.
- **Aim warmup and the aim pie**: you aim for a moment before a string of shots; army shooters show the pie while they aim. Hovering an enemy shows your hit chance.
- **Flashes and impacts**: muzzle flashes that light the ground, dust and debris on the ground, sparks off metal, chips off walls, blood that stays.
- **Camera**: shake on your shots, near misses, hits and blasts; a screen flash for close blasts and a red edge when hit; the camera follows the mouse; hold the right button to zoom in a little and aim further.

### Changed (Operator Modder and opening scene)
- **Recon is the default operator**: the generated Recon, renamed from "Generated Recon", opens the Operator Modder; the kitbashed Recon is deprecated (off the roster, old links still work). TAC-J-38.
- **Always armed**: the AK-74M by default, or your Workbench build if you made one; rifle-less poses carry it slung across the back. No more "None" weapon.
- Faster, tighter camera moves in the Operator Modder, and Workbench handling sounds on every operator change (gear, colours, poses, weapons, presets).
- **Opening scene**: a lit Nokia on the bench; the button is now "Load all demos", which pushes in on the phone and opens the index. TAC-J-39.

### Changed (Partisan Tactical)
- **The 2.5-D RimWorld-style view is now Partisan Tactical** at `convoy/` and in the index; the old 3-D top-down page moved to `convoy/3d.html` and is deprecated. `convoy/sprites.html` redirects. TAC-J-36.

### Added (Partisan Tactical sound)
- **Soundscape** for the top-down missions (`convoy/soundscape.js`): per-weapon gunfire with echo and the speed-of-sound delay, close-pass snaps and whizzes, impacts per surface, explosions with debris and blast deafness, reloads from the foley bank, footsteps on dirt or stone, engines, burning wrecks, radio squelch, and ambience per mission (birds that fall silent when the shooting starts, wind, crickets and an owl at night, cave drips). M mutes. TAC-J-37.

### Fixed
- The hood on the lead rebel (and capes) in the 2.5-D view: drawn at double size and cropped into a green box beside the head.

### Added (Operator and Weapon Modder cameras)
- **Snap camera**: switching views in the Operator Modder and framing a slot in the Weapon Modder now accelerates, swings around the model, overshoots a touch and snaps into place, like the NFSU2 mod shop. TAC-J-35.
- **Low angle** view, **Gunner · low angle** pose and look preset in the Operator Modder: balaclava, black shirt, olive carrier and trousers, RPK with the drum across the chest, seen from knee height. The RPK now takes the drum in the Weapon Modder.

### Fixed (Weapon Modder fit pass)
- Every attachment mount on every rifle snapped onto the gun by a ray-cast audit (`tools/workbench/fit-audit.mjs`, `apply-fit.mjs`): optics and sights sit on their rails, foregrips and drums on the gun, muzzle devices on the barrel. ADR 0014.
- Bipod legs spread sideways; the AK drum follows its source; the GP-25 lost its loose grenade and clamps under the handguard; the hand stop and G3 scope sit right; the Spear's loose cartridge is gone; StG 44 and PPSh-41 mounts face the right way. Gun sprites re-rendered.

### Added (graphics test, round 2)
- **Gun sprites for every Weapon Modder rifle** (AK-74M, AK-15K, RPK, M16A1, G3A3, Mk 14, SIG Spear, StG 44, PPSh-41, Bren, Chauchat), rendered from the 3-D models with a dark outline by `tools/sprites/render-weapons.mjs` into `assets/sprites/weapons/`. Rebels carry them in the sprite view; the army carries the AK-15K. TAC-J-33.
- **Sprite cosmetics**: a Look panel per rebel (gun, body, skin, hair, shirt, outfit, headgear and their colours, from the placeholder layers) with a front and side preview, saved in the browser. TAC-J-34.

### Added (graphics test)
- **2.5-D sprite view** of Partisan Tactical (`convoy/sprites.html`, linked from the 3-D page): the convoy ambush and the other two missions drawn in the RimWorld style with the placeholder art (paper-doll pawns, sprite vehicles, props and walls, baked terrain with scatter, shadows, tracers, explosions, smoke, labels and bubbles). Same simulation, keys and orders as the 3-D page; wheel or +/- to zoom. Decision TAC-J-32.

### Added (Partisan Tactical, levels 2 and 3)
- **Compound assault** (`convoy/levels/compound.js`): a walled farm compound with a gate, a breach, a drain behind the armoury, two corner towers, patrols, a machine-gun post, a radio operator and a radio mast. Steal the cache (hold E), optionally cut the mast (it gates the reinforcements), then everyone and the cache back to the forest. Quiet start, local alarm.
- **Cave hideout defence** (`convoy/levels/cave.js`): night, a cavern with a mouth, a west tunnel to a fallback chamber and an east flanking tunnel. Three waves (rifle squad; machine-gun team plus a flanking party; MRAP with a searchlight), hold until dawn (4 minutes) or break the attack, and keep the army out of the chamber.
- Simulation: destructible `targets` (the mast), scheduled `waves`, loot that must be carried out and drops when its carrier falls, `defend` and hold-or-clear objectives, night sight and lamp lights. Decisions TAC-B-13 and B-14. Tests in `tests/levels.test.mjs`.

### Added · 2026-10-03 (checkpoint)
- Whole-squad control: change the active rebel without copying health, ammunition, reloads or orders;
  the mission fails on all-down rather than the first rebel's death.
- Q/button squad picker with slow-motion framing, keyboard choices, forced death selection and reduced-motion path.
  UI implementation is checkpointed; normal-motion/visual/accessibility verification remains open.
- Recovered original TLOU2 workbench analysis, illustrated HTML, reference board and six screenshots in
  `outbound/tlou2-workbench-study/`, excluded from deployment.

### Documentation · 2026-10-03
- Expanded the Partisan Tactical roadmap from the inspected shooter into staged extraction PvE: finite gear,
  looting, timed exits, permanent equipment loss, transactional saves, recovery runs and repeatable raids.
- Reordered the work queue to prove the convoy extraction loop before compound/cave content; preserved completed
  S1–S4 and added explicit acceptance gates and optional, owner-gated online research.
- Separated campaign equipment ownership from catalogue unlocks and documented browser interruption rules.
- Roadmap reconciled with Claude’s main at 8f30cf1; implementation above is on the working branch, not deployed.

### Added (Generated Recon, WP-CG1)
- Generated Recon joins the Operator Customiser as a separate roster entry, imported from the split inbound model with a fitted 26-bone rig. The 11,253-triangle, 281 KB model supports all 11 poses and three idle styles.
- Eight equipment slots cover chest rigs, radio, neck wrap, back pouches, thigh equipment, knee pads, belt clip and all carried weapons/Workbench builds. Eight independent colour zones and four presets round-trip through look links.
- A repeatable Blender importer closes segmentation cuts, removes the fused source rifle and restores its missing right glove from the mirrored left glove. The hood and face remain one generated mesh.
- Pose changes now blend smoothly; reduced-motion mode keeps poses instant and disables idle movement. Added real-geometry and browser acceptance tests (`npm run test:operator`).

### Added (Sketchfab batch, WP-A2/A3/A5/A9/A12/A13/A15 to A18)
- **Nine new rifles** in the Weapon Modder and the Operator Customiser: HK G3A3, M16A1, Mk 14 EBR, SIG Spear, StG 44, PPSh-41, Bren, Chauchat, and the real RPK 7.62×39 (replaces the kitbash).
- **Real attachment parts** replace the code-built shapes: muzzle brake and suppressor, micro dot, EOTech, ZF-4 and G3 scopes, flip-up sight, vertical, angled and hand-stop grips, weapon light, laser, light and laser combo, drum magazines. New options: bipod, GP-25 grenade launcher, PMAG drum.
- Props, vehicles and environment pieces (MATV, army truck, Humvee, barriers, sandbags, containers, church kit, radio, canister) imported and listed in the Asset Viewer.
- Importer options (`strip`, `tint`, skin baking) and an inspector (`tools/assets/inspect-glb.mjs`) that maps unnamed meshes.

## [0.3.1] · 2026-10-01

### Added (graphics roadmap)
- **Graphics roadmap** (`docs/graphics-roadmap.md`, milestone V, WP-V1 to V20, about 250 budget units): the shooter moves from 3-D to RimWorld-style 2.5-D top-down sprites (outlined, layered paper-doll people, long shadows, 2.5-D structures, lighting, effects) and the campaign gets a retro handheld-RPG island map. The simulation is untouched, so it runs in parallel with the gameplay roadmap. The 27 graphics decisions are in `docs/design-decisions/J-graphics.md`. WP-S7 (level visuals) is retired in favour of it.
- Moodboard: layered 2-D armour sprite sheets, a RimWorld-style top-down map and a retro overworld map.

### Changed (design doc)
- The Game Design Doc opens with the pitch: *Escape from Tarkov meets Mount and Blade with guns*, inspired by the Antistasi mod for Arma 3: a PvE loop where you play a group of units and level your characters and Resistance on a Mount and Blade style overworld, so stealing weapons and attachments levels up different characters, escalating from ambushes and raids to vehicle warfare against the Invader.

### Added (Partisan Tactical, roadmap round 2)
- **Play as the whole squad** (roadmap sections G and H, packets WP-S20 to S26): you control one rebel at a time, swap by button (slow-motion zoom-out, hover the rebel, take control) or automatically when yours falls, and lose only when every rebel is down. Rebels level up on Bannerlord-style upgrade trees whose branches need the right equipment, with perks and abilities.
- **Design decision log** (`docs/design-decisions/`): every decision per build with the reasoning, alternatives, cost and a feedback line, under stable IDs (`TAC-A-07`). A test keeps it complete.

### Added (Partisan Tactical, section A)
- **Partisan Tactical**: the top-down shooter, renamed. It has a mission select (convoy ambush now; compound assault and cave defence listed as coming).
- **Levels are data** (`convoy/levels/`): map, cover, squad, convoy, foot soldiers, items, objectives. The convoy is level 1, and its seeded replays are identical to before.
- **Objectives** (`convoy/objectives.js`):
  - Types: eliminate, reach, destroy, steal (hold E), hold, protect, extract.
  - Objectives can be optional or locked until earlier ones are done.
  - A debrief screen shows the objectives, each partisan's state and kills, and what was taken.
- **Squad orders**:
  - Tab selects teammates; F follow, H hold, G go, T attack, C cover a sector; right-click to go or attack.
  - Space pauses the fight so you can give orders. Order markers show on the ground and the squad list in the HUD.
- **AI behaviours**:
  - Guards on posts that scan; patrols on routes.
  - Local alarm: word travels by shout (30 m), by radio (only while a radio operator lives) and by gunfire.
  - Reinforcements need a radio operator who survives his call.
  - Bounding-overwatch assault groups.

### Added (round 6)
- **Convoy Ambush** (`convoy/`, index entry 5): a top-down shooter and test bed for the enemy AI.
  - Scenario: you and two partisans ambush an eight-man army convoy that a log roadblock stops under your ridge.
  - Beliefs: soldiers act on what they believe (seen, heard, told over the radio), with error and fading confidence.
  - Callouts: they shout what they do, and the callouts share those beliefs with the squad.
  - Behaviour: dismount away from the threat, take cover, suppress where they think you are, get pinned, flank on the sergeant's order, search last-known positions and fall back after heavy losses.
  - The AI view shows each soldier's beliefs, view and state. The enemy awareness setting changes perception and comms, never health or aim.
  - The simulation is pure and seeded (`convoy/sim.js`, `convoy/ai.js`), with unit tests in `tests/convoy.test.mjs`.
- Convoy Ambush, round 2:
  - **MRAP** with a shielded DShK turret gunner. Rifles bounce off it; three RPG rockets destroy it, and any vehicle can burn.
  - **Weapons** (`convoy/weapons.js`): AK-74, PKM, SVD, RPG-7 (direct, splash, anti-vehicle), GP-25 (lobbed over cover) and the mounted DShK. You switch with 1, 2, 3; Mila carries the SVD and Dragan the PKM.
  - **Enemy roles**: squad leader, rifleman, machine gunner, marksman, radio operator (callouts twice as fast; kill him to slow the squad) and grenadier (lobs at believed positions). Each has its own silhouette.
  - Soldiers take a moment to react when the ambush opens. Failed smoke checks now close their pages, so one failure no longer starves the rest.
- Art Style Lab: **Cel shaded** style (two hard tones, bright flat colour, thick outlines).
- **Art Style Lab** (`operator/?lab`, index entry 4). It switches the operator and its rifle between art styles: Lit low-poly, Toon cel, Toon + ink, Clay study, Silhouette test, Nokia LCD, PS1 retro and Night vision. Styles are data in `shared/art-styles.js`: material swaps plus screen-space passes through the new `stage.setRender` hook. The chosen style is kept in the address (`?lab=<id>`).
- **Hands on the rifle**: `operator/grip.js` solves both arms onto the carried rifle each frame (two-bone IK, hand aligned to the grip). Weapon poses place the rifle in body space (`hold`, `muzzle`, `up`). The hero pose follows the moodboard. Also new: *Hero · both hands* and *Port arms* (replaces *Shoulder arms*). Low ready, high ready, crouch and kneel are reworked.
- `outbound/` (files for the owner, starting with the weapon sounds package) and `inbound/` (files from the owner). Neither is deployed.

### Removed (round 6)
- **Chiptune cover on the Nokia index** (deprecated: it did not hold up in use). The index plays the recording like every other page. Removed: the cover's player code (variant crossfade, lockstep sync), the `npm run test:audio` check and its CI step. `duce-chiptune.mp3` moved to `outbound/`, so it no longer ships; the generator `tools/audio/chiptune-duce.py` stays for a later attempt.

### Changed (round 6)
- The Base Operator defaults to plain olive fabric; the pack camo stays selectable as *Original camo*.
- Tool-page sidebars, share cards and the style guide use Nokia greens instead of blue-grey.
- The Pages deploy no longer waits for the browser tests; they run in parallel.
- The Weapon Modder lists the modernised RPK.

### Removed
- **Credits page and licence audit**: the Credits section of the design document, per-demo credit lists, the register audit tools and tests, `assets/REGISTER.md` and packet WP-Q3. Each place now says: credits and licences are in the GitHub documentation, or contact the owner. All agent instruction pages carry an express instruction not to spend tokens on credits or licences.

### Changed (round 5)
- **Chiptune cover of *The Duce Puts On His Uniform*** (`assets/audio/duce-chiptune.mp3`, `tools/audio/chiptune-duce.py`), the same length and beat grid as the recording. The Nokia index switches the player to it with an equal-power crossfade; other pages fade back to the recording; the two never restart (`Music.setVariant`, `sound.variant`). `npm run test:audio` (also in CI) checks sync and the handover.
- Nokia index blips are 50% louder.
- Game design doc: new section **Low poly and loud** (tone: native three.js low-poly look, milsim-inspired animation and sound, loud and chaotic gunfights).

### Changed (round 4)
- **Index**: opens straight on the menu (the "press any key" splash is gone); the camera follows the mouse 60% less; new **1. Weapon Workbench** (the opening scene) and the former 1 is now **2. Weapon Modder**.

### Changed (round 3)
- **Original opening scene and advanced animations restored verbatim** (`intro/`, ADR 0011): the code from vincentdenil-site, with its own operator, hands and bench timeline, wired to the current weapon customiser and the shared top bar and music player. One orange button on the scene: *Customize this weapon*. The rebuilt scene and Bench Lab are removed; the index lists "Advanced animations".

### Changed (round 2)
- **Top bar v2**: thinner (28 px), smaller type, dark-green base with pale-green ink and a little LCD scanline and dithered edge; the game design doc keeps the pale-green version. Left: a plain lambda with "Partisan Project" (tooltip "Return to home", goes to the opening scene). Buttons: INDEX and GAME DESIGN DOC only. The music player is a small drop-down (on/off, three tracks, volume) from one ♪ button.
- **Favicon** is now the lambda (dark green on bright green, 1px border, dithered shadow).
- **Names**: the abbreviation PARP is gone from page titles ("Partisan Project | Subpage"), the interface and every document; it survives only inside file names, storage keys and code identifiers.
- **Index scene** zoomed in on the phone; **interface sounds** (tap, select, back) synthesised in `shared/ui-sounds.js`, silent when the music is off.
- **The earlier operator is back** in the opening scene and in Bench Lab (`shared/legacy-operator/`, `bench/legacy-arms.js`), with its articulated hands; the Operator Customiser keeps the new Base Operator.

### Changed (site structure)
- **Opening scene restored** (`intro/`): the old workbench table, your saved rifle, the old radio tuning in, the FIA flag. One orange button bottom left: Customize this weapon (the index and the game design doc are in the top bar; Bench Lab is on the index). Arms are the Bench Lab IK arms; the code-built operator stays retired.
- **The music plays through the whole site**: `index.html` is now a shell that owns the sound layer and shows every page in one frame (ADR 0010). The radio and camp sound (`shared/bench-audio.js`) plays on the scene and the index, the clean track elsewhere.
- **One top bar on every page** (`shared/topbar.js`): Nokia LCD strip with INDEX and DESIGN DOC buttons and the music player (on/off, three tracks, volume). It replaces the per-page headers and music panels.
- **The Nokia index lies on the workbench table** (`menu/`): a close-up of a phone on the table with the live LCD laid over its screen by a projective transform (`shared/homography.js`). The phone body and keypad are gone from the HTML; the dithered key art is full width.
- Favicon inverted: dark green glyph on a bright green LCD card, 1px dark border and a dithered drop shadow.

### Performance
- **Idle render throttle** (`shared/stage.js`): a still scene renders at 8 fps instead of 60; any input, camera move or `stage.wake()` restores full rate; demos declare self-animation with `stage.setAnimated()`. Big battery and heat win on phones.
- **Half-size HDR environments** (512x256, `tools/assets/downscale-hdr.py`) are loaded on phones and coarse pointers: about a quarter of the bytes and GPU memory (Operator page 1.79 to 1.07 MB).
- Phones also use hard-edged PCF shadows; Data Saver skips the rifle prefetch.
- `Rig.update` skips the 83-bone pass when nothing changed (held pose, no idle, head still, springs settled); spring snaps to rest. Cached eyelid lookup; no per-frame allocations for mount-point labels.

### Added
- **Recorded handling foley restored** (ADR 0009): the 42-take bank from the earlier workbench (`assets/audio/foley/`, about 1.5 MB), owner-cleared and registered take by take. `workbench/mech.js` plays it once loaded and falls back to the synthesised sounds; Workbench, Customiser and Bench Lab all use it.
- **Bench Lab** (`bench/`, WP-X1, ADR 0008): the advanced workbench animations return as an opt-in experiment. Pick a part and two IK arms take the old one off, set it in the tray, fetch the new one and fit it, with Skip, Cancel, Quick changes, a review mode (`?review=1`) and synthesised handling sounds. No firing.

### Changed
- **WP-C3 (props)**: Recon gets a chest carabiner and a back canister ("Hip props" slot); recon pack 388 triangles. Owner sign-off still pending.
- **WP-C10**: bare-head options grow to 4 hairstyles (short crop, buzz, swept fringe, long) and 3 facial-hair styles plus both (moustache, goatee, beard), all in the Hair colour zone; core pack 984 triangles.
- **WP-D5**: `docs/ui-style-guide.md`; shared design tokens extracted to `shared/tokens.css` (imported by `panel-ui.css`).
- **WP-I4**: Operator Customiser "Save share card" (`operator/share-card.js`): operator render, look list, carried weapon and its stat bars, branding and link in one PNG.
- **WP-Q4**: guided first-run tour (`shared/tour.js`, 3 steps, Skip/Esc, remembered per demo) in the Workbench and Operator Customiser.
- Fixed: the Workbench stats panel had no mount point or styles after the migration; `#stats` and its CSS are back.
- **WP-C11**: secondary motion — a damped spring (`Spring` in `operator/rig.js`) makes the neck/scarf bone trail the torso's idle; off under reduced motion; unit-tested for stability and cost.
- **WP-T1**: `workbench/viewer.js` now uses `shared/stage.js` and `shared/music-ui.js`; stats panel, summary and PNG export moved to `stats-panel.js`, `summary.js`, `export.js` (1,109 → ~720 lines). Behaviour unchanged.

### Added
- **Recon, Insurgent, Enforcer** (v1) in the Operator Customiser as roster bases: original extension packs (hood, houndstooth scarf, chest radio; knit beanie, shemagh) bound to the Base Operator skeleton by bone name, plus a shirt torso pack so "Uniform only" no longer shows a hollow chest.
- Generated plaid and Recon camo fabrics; `tools/assets/blender_common.py`, `build-*-pack.py`, `optimize-pack.mjs`.
- `docs/engineering/skeleton-contract.md`, skeleton-contract and per-base tests, Recon/Insurgent/Enforcer browser tests.

- **Pose library to 10**: High ready, Shoulder arms, Crouch, Kneel (legs fold via a pose `lower` offset), Salute; `tools/pose-fit.mjs` can solve a raised elbow (`lowerZ=1`).

- **Idle polish**: eyelids blink on a deterministic schedule, and the head follows the camera (clamped, smoothed, off under reduced motion or with the toggle).
- **A real head**: the purchased character only has an eye strip inside a balaclava, so "bare head" showed floating eyes. The core pack adds a skull with ears and nose, a short-crop hairstyle, moustache and beard, hair colour and new slots (hair, facial hair). Beanie sits above the eyes.

- **Shared loadouts**: the Workbench publishes its build; the Operator Customiser can carry it as "Workbench build" (finishes, wear, rail offsets, rule repair). `shared/loadout.js` adds versioned `P1.` codes (also accepting every legacy link; retired Field/operator keys are ignored) with Copy code / Load code in the Workbench.

- **Rail footprints** (`workbench/rails.js`): parts on one rail can no longer overlap; fitting a long scope slides the back-up sight forward, stepper buttons stop at neighbours, links are repaired on load.
- **New slots**: back-up sight (flip-up), top rail (removable on the AK-74M, with a rule that blocks optics without it), trigger, charging handle, sling swivel and two-point sling.
- Workbench tests (`tests/workbench.test.mjs`, `tests/rails.test.mjs`): stat coverage, rule symmetry, exhaustive rail combinations.

- **Accessibility**: axe-core audit (`npm run test:a11y`, in CI) clean on every page; 3D stages are keyboard-operable; index d-pad targets enlarged, page headings and landmarks fixed.

- **Sleeve patches** (`patches-pack.glb`): six designs (star roundel, mountain shield, MP-O tag, tricolour placeholder, medic cross, chevrons) on either sleeve; Recon wears the shield and the MP-O tag, Insurgent the star.

- **Tooling**: ESLint 9 flat config, Prettier (JS formatted across the legacy modules), `tsc --checkJs` on the typed core modules; all three run in CI before the tests.

### Fixed
- Optimiser no longer merges materials (it had fused the top and trousers camo and two strap materials); packs keep UVs for runtime textures.
- Helmet and other multi-primitive parts now toggle correctly.

## [0.3.0] · 2026-10-01 · "Foundation"

### Added
- **Partisan Project** repository layout: `workbench/`, `operator/`, `viewer/`, `docs/`, `shared/`, `assets/`, `vendor/`, `tools/`, `tests/`.
- **Operator Customiser**: Base Operator from the purchased low-poly soldier (8,646 triangles, 83 bones), 10 equipment slots, 8 colour zones, 5 hero poses (including the character sheet's rifle-up pose), 3 idle animations, optional carried rifle prop, shareable URL looks, photo export, budget readout.
- Data-driven pose system: character-space rotations over the rest pose (`operator/poses.json`, `operator/rig.js`), `tools/pose-fit.mjs`.
- **Asset Viewer** and the **asset register** (`assets/register.json`) with licence audit and import tooling (`tools/assets/*`).
- Nokia-style 1-bit LCD **index browser** with Bayer dither.
- In-universe **design document** (`docs/game-design-master-doc.html`), **master roadmap**, **moodboard** and **art direction**.
- **Agent-ops**: work packets, budget units, handoff protocol and tooling for two $20 subscriptions.
- GitHub Pages workflow with allowlist build, link/import checker and unit + browser smoke tests.

### Changed
- Weapon Workbench moved out of the portfolio site; three.js vendored (no CDN); shared stage, sound layer and music UI.

### Removed
- Test fire, muzzle flash, recoil kick, reload, range drill, the bench scene with articulated hands, the Advanced animations experiment, the code-built procedural operator and Field mode.
- The recorded foley bank (provenance could not be shown): handling sounds are synthesised.
- The previous `partisan-project` contents (AI compendium and premise page) moved to `vincentdenil.com/docs/partisan-ai/`.
