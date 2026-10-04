# Deep character customisation: Recon modular equipment system

Roadmap dated 4 October 2026. Planning and the [source teardown/authoring contract](engineering/recon-modular-audit.md) are complete. The clean body, new equipment and assembly editor below remain planned work. Work packets use the `WP-CM` prefix in [packets.json](agent-ops/packets.json).

Build a character that can be stripped to complete clothing, then dressed with genuinely different carriers, chest rigs, belts, pouches and bags. Keep the Recon's hooded silhouette, compact proportions, layered fabric and readable gear shapes. The result should support assembling individual pieces, inspecting their fit in motion, saving outfits and eventually equipping the same items on rebels.

Here, **load-bearing rig** means the worn equipment. **Animation skeleton** means the bones and skin weights. Dismantle and rebuild the equipment while preserving a documented, compatible skeleton wherever possible.

## 1. Starting point and constraints

| What exists | What it means for this work |
|---|---|
| Complete inbound `PARP_Recon_hooded_model_v01_05.glb`: 193,534 triangles, original 4K texture, generated rifle | Preserve as the untouched visual reference in [the comparison view](../operator/compare.html). It is not the modular runtime body. |
| Current conversion: 14,523 triangles, 26 bones, shared 2K atlas | Almost the entire 15,000-triangle budget is already used. A new kit cannot simply be added on top. |
| Eight equipment slots, eight colour zones and fitted carry poses | Reuse the working interaction and pose systems, but replace group visibility toggles with an item assembly model. |
| Jacket includes vest surfaces; harness includes straps and a front bag | Hiding the current harness does not produce a clean unarmoured jacket. Rebuild fused surfaces and remove their baked texture marks. |
| Missing neck repaired with a collar; right glove reconstructed from the left | Author proper underlying surfaces and hand anatomy before expanding animations. |
| Hood and covered face share geometry; fingers are fixed | Separate head, mask and hood; add grip articulation rather than relying on one mitten shape for every weapon. |
| Later upstream main has a separate Recon colour bake | CM1 must reconcile the source/texture pipelines deliberately. Do not overwrite either model or remove unrelated demo work during integration. |

This roadmap covers the 3D Operator Modder. The tactical game's existing 2D character direction remains in place; it receives a separate appearance adapter later. The original comparison asset remains unchanged. Start the new character as an opt-in `recon-modular` base so existing Recon looks and links keep working throughout development.

## 2. First playable milestone

Deliver one convincing, completely reversible outfit before producing a large catalogue:

- A complete Recon body in a clean jacket, trousers, boots and gloves. Removing equipment exposes finished clothing, including the back, waist and shoulders.
- One independently removable lightweight plate carrier, with separate front/rear bags, shoulder straps and cummerbund.
- Three reusable attachments: a rifle-magazine pouch, a general utility pouch and a radio pouch with its radio. Allow multiple copies where mounts permit them.
- One equipment belt and one small daypack, with sensible strap paths and a defined relationship to the carrier.
- Clickable body regions, compatible item choices, bounded attachment placement, independent finishes, undo/redo, saved outfits and shareable links.
- Three validated looks built from these same pieces: stripped clothing, light Recon, and loaded patrol. They must be assemblies, not three separate character models.

**Milestone gate:** strip every item, rebuild each look, reload its saved link, then inspect front/back/side views and the existing pose/idle library. No missing body surfaces, floating straps, material ghosts or substantial body/gear penetration. The original source stays available beside the result for comparison.

## 3. Art and modelling plan

### A. Recover a complete base character

Audit the complete and split sources with an exploded-view contact sheet. Mark each surface as body, clothing, armour, strap, attachment or damaged/generated artefact. Record what can be reused and what must be remodelled; source segmentation boundaries are not automatically good module boundaries.

Reconstruct the jacket under the vest, shoulders under the harness, torso beneath pouches, and the missing neck. Rebuild UVs and textures for newly exposed fabric so removed equipment does not leave painted straps, buckles, shadows or empty holes. Keep silhouette and intentional facets; do not indiscriminately smooth every face or copy accidental generated lumps.

Make complete head/neck, hood and mask pieces with clean join boundaries. Retain face detail separately from fabric tints. Rebuild both gloves with a usable thumb and finger groups; validate open, relaxed, pistol-grip and support-hand shapes. Keep the existing bone names and rest convention for the torso and limbs; add documented finger/twist bones under a versioned skeleton contract.

### B. Model distinct carrier families

These are original game asset designs inspired by the Recon, not exact product replicas. Each family needs a recognisable front, side and rear silhouette, an empty configuration, removable attachments, UVs, fitting data and a posed contact sheet.

| Family | Shape and construction | Modular parts | Release |
|---|---|---|---|
| Lightweight carrier | Slim plate bags, narrow shoulders, open sides | Front/rear bags, straps, light cummerbund, interchangeable front placard | First milestone |
| Assault carrier | Broader shoulders, padded sides, larger front panel | Alternative cummerbund, side pouches, rear utility/hydration panel, shoulder pads | Expansion |
| Heavy carrier | Thicker front/back bags and broader coverage | Side plate bags, optional collar/groin pieces, heavier rear panel | Expansion; extra pieces consume the same budget |
| Standalone chest rig | Soft front harness without plate bags | Harness, magazine placard, utility insert; fits over clothing | Expansion |
| Recon cross-body harness | Original diagonal strap and satchel language, rebuilt cleanly | Adjustable fitted strap variants and removable satchel | Expansion |

Carrier families use a common attachment interface where it looks credible. They do not all need identical silhouettes or the same number of mounts. An empty carrier must look complete. Plate inserts, shell appearance and attached storage are distinct item definitions; protection or capacity must not be inferred from a colour preset.

### C. Attachment, belt and bag catalogue

| Category | Planned assets | Fit requirements |
|---|---|---|
| Magazine storage | Single rifle pouch, double rifle pouch, pistol pouch, larger support-weapon pouch | Distinct dimensions and occupied mount area; contents can be empty or filled without duplicating the pouch shell |
| Utility | Small utility pouch, larger utility pouch, medical pouch, radio pouch/radio | Mirror only items designed for either side; opening direction and arm clearance remain valid |
| Belt | Slim belt, padded belt, drop-leg adapter, sidearm holster, dump pouch | Belt supported at the waist; holster and thigh kit follow the leg without dragging the belt mesh |
| Bags | Small daypack, larger patrol pack, flat hydration pack, cross-body satchel | Separate strap route variants; explicit carrier compatibility; slung-weapon clearance |
| Small kit | Carabiner, light, antenna/cable, rolled fabric, identification patch | Shared small-detail geometry where possible; cables terminate at real connectors and follow their owner item |
| Head and neck | Hood up/down, separate face covering, scarf, soft cap, helmet, compatible ear protection | Eye visibility, neck rotation and mutually exclusive coverage rules |
| Clothing | Original-inspired field jacket, lighter combat shirt, rolled-sleeve variant; two trouser cuts; glove/boot variants | Agreed seam boundaries, body coverage and fitted carrier profiles |

Author new items as reusable assets in Blender, with a repeatable export/import command. Each deliverable includes the editable source in the established authoring location, exported runtime asset, mount data, material regions, thumbnail, triangle count and visual acceptance sheet. Do not generate a new complete character for every outfit.

## 4. Assembly and compatibility

Use a hierarchy with explicit ownership. Removing a carrier removes its mounted assembly from the character; it does not leave pouches floating in world space. In the preview, preserve the removed assembly as a recoverable draft and make the change undoable. In gameplay, removal and storage must follow the inventory transaction rules.

| Parent | Attachment regions | Typical rules |
|---|---|---|
| Body/clothing | Chest, waist, back, head, neck, thighs | One primary carrier or standalone rig; clothing defines supported fits |
| Carrier | Front placard, left/right side, shoulders, rear panel | Placard types and occupied regions must match this carrier |
| Placard/panel | Bounded attachment grid | Pouches occupy cells; overlapping cells cannot both be filled |
| Belt | Left/right/front/rear positions, holster/drop-leg mounts | Belt slot and thigh adapter dependencies; sitting/crouching clearance |
| Pack | External pockets, hydration route, bedroll region | Capacity and attachment geometry depend on the pack, not on the body |
| Headgear | Compatible accessory regions | Hood/helmet/headset combinations need authored fits or clear exclusions |

Each item definition needs a stable ID, item family, geometry, material regions, compatible parent types, mount transform, footprint, coverage mask, skeleton/fit version and budget cost. Placed copies also need their own instance ID, parent instance, mount location, finish and optional contents. Socket transforms belong in asset data, not hand-written per-item branches in the editor.

Use a discrete grid on surfaces designed for pouch placement, and named sockets elsewhere. The editor can offer a few authored strap lengths or fit positions; avoid free movement and arbitrary scaling that make every loadout a new clipping problem. A large pouch can occupy several cells; left/right exclusions and pack/carrier conflicts must be validated before a change is committed. Show a plain reason such as “This pouch needs a wider front panel.”

Keep compatibility, body coverage, visual clearance and gameplay capacity as separate checks. Coverage masks may hide fully covered body patches, but must restore those patches when an item comes off. They cannot substitute for an absent torso, and cannot be used to conceal intersections at visible edges.

## 5. Materials, rigging and fit

| Area | Implementation direction | Acceptance |
|---|---|---|
| Materials | Separate fabric, webbing, hardware, rubber, lenses, patches and face/skin regions; stable UV/texel-density targets | A colour change retains seams and fabric detail; never tints skin, labels or lenses unintentionally |
| Variation | Solid finishes first, then camouflage, patch slots and bounded wear/dirt | Reuse geometry; preserve material identity; restoring “original” is lossless |
| Deformation | Clothing and soft straps skin to the torso/limbs; rigid buckles and pouches follow their parent surface | No exploding skin, crushed pouches or straps stretching across joints |
| Weapon contact | Retain data-authored poses; calibrate wrists, fingers and support points per grip family | Hands remain attached and plausibly wrapped around the supported rifles |
| Secondary motion | Small bounded movement for straps/bags after static fit is stable | Subtle movement, deterministic preview, disabled with reduced motion |
| Fit variants | One reference body initially; later a small number of authored body/clothing fit profiles | Every offered body shape has matching clothing, carrier and pack fits |

Do not start with arbitrary height, weight or limb-length sliders. They multiply the fitting workload before the modular system is proven. Deep identity customisation can first use head, face covering, skin/hair choices, clothing cut, finish and loadout silhouette. Add body variants only when a complete fitting test set exists for them.

## 6. Editor experience and saved data

The main flow is **Character → Clothing → Carrier → Attachments → Belt → Bags → Finish → Pose**. Selecting a body region focuses the camera and opens compatible choices. Show the chosen carrier by itself, then attach individual items. Provide “remove”, “move”, “duplicate where compatible”, “reset region” and undo/redo. A deliberate “strip equipment” action leaves clothing intact and can be undone as one operation.

Add front/back/side views, an exploded assembly view, a temporary isolation view, wireframe and a pose scrubber. Keep the original/current comparison and add the new modular character as another selectable subject when it is ready. Exploded/isolation views are inspection tools; saved outfits store the assembled state.

Presets are ordinary assemblies. Saving or sharing must round-trip the exact item instances, parent mounts, finishes, pose and carried Workbench build. Introduce a versioned character appearance schema alongside the existing weapon `P1` code; do not redefine `P1`. Migrate old Recon slot links through an explicit adapter, tolerate unknown/removed item IDs with a visible recovery message, and never silently erase an existing saved look. Large outfit codes need a tested URL-size policy and a JSON export/import fallback.

All actions must work through buttons and keyboard controls, with visible focus and a clear explanation for unavailable choices. Dragging may be a shortcut, not the only way to place or remove an item. Honour reduced motion for camera transitions, idles, bag movement and exploded views.

## 7. Runtime and asset budgets

The loaded operator plus every visible equipment piece remains at or below **15,000 triangles**, excluding the separately budgeted weapon. Budget the heaviest allowed outfit, not just the empty body. Reject over-budget authoring combinations or provide authored lower-detail variants; do not silently remove selected gear.

| Allocation target | Triangles |
|---|---:|
| Complete body, head, hands and clothing | 8,000 |
| Carrier | 1,700 |
| Mounted pouches | 1,400 |
| Belt and adapters | 450 |
| Pack | 1,450 |
| Head/neck additions | 650 |
| Small kit | 350 |
| Reserve | 1,000 |
| **Maximum assembled outfit** | **15,000** |

These are initial allocation targets to prove in CM1–CM3, not measurements of new assets. Larger modules must trade budget with other modules. Keep a high-detail authoring source; generate runtime assets and manifests through `tools/assets/`. Share materials and atlases across repeated gear, load the active outfit before catalogue thumbnails, cache reusable assets, and release obsolete GPU resources. Start with the existing vendored Three.js/meshopt stack.

Record triangles, draw calls, decoded texture memory, compressed outfit bytes and first useful render time for stripped, patrol and maximum kit on desktop and a representative mobile device. Preserve the repository's under-three-second broadband render target; establish measured draw-call/texture-memory ceilings before expanding the catalogue. The existing site already exceeds its stated total-size target, so a larger catalogue must not be mistaken for a free size increase. Keep source inspection assets separate from ordinary outfit loading.

## 8. Sequence and work packets

Sizes are repository planning units (S = 8 BU, M = 20 BU), not days or delivery promises. Each packet is bounded to its listed deliverable; split it further if the modelling or fitting work will exceed M. CM0 and CM1 are complete. CM2 and CM4 are ready; later dependent packets remain planned until their gates pass.

| Packet | Deliverable | Depends on | Size | Done when |
|---|---|---|---|---|
| CM0 | This roadmap and executable work queue | CG2 | S | Scope, asset families, dependencies, budgets and review gates are recorded |
| CM1 | Source audit, canonical source/texture choice, asset boundaries and skeleton contract | CM0 | S | Exploded source sheet, reuse/rebuild list, measured budget and upstream reconciliation plan exist |
| CM2 | Clean torso/clothing foundation | CM1 | M | Vest, harness and bags removed; front/back/shoulders/waist are complete and textures show clean cloth |
| CM3 | Separate head/hood/mask, complete neck and articulated hands | CM2 | M | Bare and covered heads join correctly; glove grip poses work on the reference skeleton |
| CM4 | Item definitions, assembly resolver and compatibility validation | CM1 | S | Parent/child instances, repeated pouches, footprints and conflict reasons work without renderer dependencies |
| CM5 | Lightweight carrier and its fit profile | CM2, CM4 | M | Empty and loaded carrier render, remove cleanly and follow torso poses |
| CM6 | First three reusable pouch modules | CM5 | M | Magazine, utility and radio modules can be placed, duplicated and removed within their footprints |
| CM7 | Belt and small daypack | CM3, CM5 | M | Waist/pack fits and straps work with and without the carrier; slung weapon is accounted for |
| CM8 | Assembly editor, undo/redo and versioned outfit saves | CM4, CM6, CM7 | M | Three first-milestone outfits can be built and round-trip; old links still work |
| CM9 | First-milestone pose, equipment and performance gate | CM3, CM8 | M | Stripped/light/patrol looks pass visual, geometry, accessibility and budget checks |
| CM10 | Assault carrier family | CM9 | M | Distinct padded carrier supports shared modules and its authored fit variants |
| CM11 | Heavy carrier family | CM10 | M | Side protection and optional coverage pieces fit; maximum allowed kit stays within budget |
| CM12 | Chest rig and Recon cross-body harness | CM9 | M | Both standalone alternatives remove fully and obey pack/carrier exclusions |
| CM13 | Expanded pouch and belt accessories | CM9 | M | Double/pistol/support pouches, medical/dump pouches and holster adapter have distinct fits and silhouettes |
| CM14 | Hydration pack, patrol pack and satchel | CM9, CM12 | M | Bag families have correct straps, attachment relationships and slung-weapon profiles |
| CM15 | Alternate shirt/jacket and trousers | CM10, CM12 | M | Clothing can change under supported rigs without holes, ghost textures or new intersections |
| CM16 | Headgear and identity choices | CM3, CM9 | M | Hood/mask/scarf/cap/helmet combinations and protected face/skin regions follow explicit compatibility |
| CM17 | Camouflage, patches and wear presets | CM9 | S | Material variants preserve detail and round-trip per item without changing gameplay properties |
| CM18 | Additional fitted body profiles | CM11, CM14, CM15, CM16 | M | A second bounded body profile fits the shipped kit; unsupported combinations remain unavailable |
| CM19 | Rebel equipment and inventory adapter | CM9, S8, S14 | M | Appearance resolves from existing item IDs/instances without inventing ownership, protection or capacity |
| CM20 | Tactical sprite appearance adapter | CM19, V6 | S | Key carrier/pack/headgear silhouettes map to the established 2D paper-doll system |
| CM21 | Expanded catalogue release gate | CM11–CM18 | M | Coverage matrix, save migrations, catalogue load/memory and representative outfits pass |

**Next modelling session:** CM2. Follow the [measured teardown and contract](engineering/recon-modular-audit.md) to rebuild the underlying torso before CM5 models the first new carrier. CM4 can implement the item resolver against the established conventions. Do not begin by multiplying pouches on the existing nearly-full-budget model.

CM19–CM20 are integration follow-ups and do not block the 3D catalogue release. They extend the existing inventory/unlock and sprite-equipment work instead of duplicating it. CM1 should also reuse completed patches, headwear and prop work from the older C packets where it fits the new contracts.

## 9. Acceptance and integration gates

| Gate | Evidence required |
|---|---|
| Strip test | All wearable equipment off, viewed through 360 degrees; complete clothing/body and no baked gear remnants |
| Assembly tests | Valid repeated items, dependency removal/undo, mount occupancy, unknown IDs, invalid attachment rejection and budget accounting |
| Pose test | All existing hero/ready/crouch/kneel/comms/salute poses, all idles and representative intermediate blend frames; add walk/run only when a locomotion preview is introduced |
| Weapon test | Every supported rifle, representative long stock/suppressor/scope/large-magazine builds, two-hand grips and slung positions with every bag family |
| Visual review | Front, back, sides and face close-up; solid and wireframe; original reference and new body visible together; no substantial penetration, floating straps or implausible hand contact |
| Combination coverage | Exhaustive slot validity and budget checks; pairwise equipment/pose coverage plus explicit worst-case stacks and highest-risk triples such as pack + rear panel + slung rifle |
| Material test | Remove carrier after recolouring; change hood without skin changing; restore original; light and dark finishes under multiple environments |
| Save/UI test | Legacy link migration, duplicate item identity, undo/redo, refresh, export/import, keyboard placement, mobile overflow and reduced motion |
| Performance test | Maximum supported outfit and repeated item switching meet recorded budgets without accumulating meshes, textures or listeners |

Geometry sampling is a regression aid, not proof that every combination is collision-free. Keep visual contact sheets and inspect transition frames. When a combination fails, adjust its authored fit, supply a supported alternate, or explicitly disallow it with a useful reason; do not hide it with camera framing.

The preview catalogue may show every item for experimentation. Campaign equipment must come from the existing owned-item system; a saved appearance or shared link does not grant equipment. Map armour, storage and mass to the established gameplay definitions when the adapter is built, leaving placeholder values labelled as such. Coordinate with the newer Rebel Band and Equipment Wiki on main rather than creating another independent item database. The tactical renderer receives visible appearance categories, not the complete 3D scene or an assumption that 3D armour automatically changes protection.

## 10. Completion and later scope

Deep customisation v1 is complete when the first milestone and expanded-catalogue gate pass: the character can be stripped, rebuilt with distinct carrier/rig and bag families, personalised, posed, saved and restored without breaking its body or equipment relationships. Keep a reviewed reference loadout for each family so future items have a concrete fit target.

Later work can add unrestricted body morphing, complex cloth simulation, bespoke faces, additional character archetypes and user-imported equipment. They are separate projects after the fitting and data contracts are stable. No new asset is marked shipped merely because it appears in this roadmap; catalogue availability follows modelling, fit and release acceptance.
