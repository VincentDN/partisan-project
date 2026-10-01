# Art direction

Derived from the four reference images the owner supplied (committed in `docs/moodboard/`). The two keyframes
and the character sheet are concept art (AI-assisted) and the fourth is a screenshot of *Abiotic Factor*
(Deep Field Games) used as a style reference only. **None of them is a runtime asset.**

## 1. What the references say

| Reference | Takeaways |
|---|---|
| **Recon character sheet v01-09** (`recon-character-sheet.jpg`, `recon-turnaround.jpg`, `recon-hero-pose.jpg`, `recon-insignia-props.jpg`) | Front / side / back / **hero pose** turnaround. Hooded face-mask recon in desaturated olive-grey camo; houndstooth scarf; plate carrier with a large admin pouch, mag pouches and a back panel; knee pads; gloves; thigh holster; **hero pose: rifle held upright in the right hand, relaxed weight on one leg, head turned slightly to camera**. Side column: patch "MP-O", mountain shield patch, handheld radio, red carabiner, a small canister. Spent casings on the ground tell a story. |
| **Keyframe 1** (`keyframe-1-nvg-plaid.jpg`) | Golden-hour dust. Tan helmet with a **dual-tube NVG mount** and green patch, green patterned face cover, **plaid shirt** under a vest, star patch, wristwatch, G3-style rifle with a holographic sight and a weapon light. Rubble, rebar, a limp flag, signage. Warm key, long shadows, flying debris. |
| **Keyframe 2** (`keyframe-2-firefight.jpg`) | Cool overcast haze with **god-rays**. Black beanie, shemagh, black kit, bold olive pouches on the belt, knee pads; modern M-LOK rifle with an optic. Second operator with an AK in brown/olive. Impact sparks, tumbling casings, jersey barriers, grass tufts. |
| **Abiotic Factor style** (`ref-abiotic-factor-low-poly.jpg`) | Chunky proportions, **low-resolution painted textures with visible pixels**, big readable helmet and visor, bright accent colour (yellow-green) against sand, a radio on the chest. A reminder that readability beats polish. |

## 2. Rules

1. **Faceted, flat-shaded low poly.** Visible polygons on skin, cloth and armour. Soft painterly colour variation *per facet*, never smooth normal-mapped skin. (The purchased Base Operator matches: 8,646 triangles.)
2. **Silhouette first.** Every operator must be identifiable from a black silhouette at hero distance: head-gear shape (hood, helmet+NVG, beanie), shoulder width (pads, pouches), backpack/back panel, weapon outline.
3. **Layered identity.** Operators are built from *slots* (headgear, face, armour, rig, belt, pack, pads, holsters) plus colour zones and insignia, so one skeleton and one set of poses serves a whole roster.
4. **Palette discipline.** Desaturated olive, coyote tan, charcoal and wolf grey carry the world; saturation is a reward (a patch, a carabiner, a muzzle spark, a hazard accent). See §3.
5. **Light tells the mood.** Two lighting families: *golden-hour dust* (warm key, long shadows) and *overcast haze with god-rays* (cool, volumetric). Rim light separates dark kit from dark backgrounds. The demos ship Studio / Outdoor / Sunset environments plus a blurred backdrop.
6. **Storytelling props.** Spent casings, rebar, worn paint, taped magazines, a radio, a carabiner, patches. Wear is a slider on weapons and (planned) fabrics.
7. **Weapons are real silhouettes.** Real platforms (AK-74M, AK-15K, G3, M16, Mk14, RPK, STG44, PPSh) so players recognise them; modern furniture (M-LOK, rails, red dots, lights) shows the "modernised" idea.
8. **Hero pose language.** Weight on one leg, one hand carrying the rifle upright or low, the other hand relaxed, head turned 5–15° toward camera, three-quarter camera 24° off front.
9. **No smooth UI.** UI wears the phone/DOS language: 1-bit LCD tones, ordered dither, stencil type, hard edges (`index.html`, to be extended to a style guide by `WP-D5`).

## 3. Palette

Colours are sampled from the references (k-means on the images, then curated by hand) and from the Base Operator's materials.

| Name | Hex | Where it appears |
|---|---|---|
| Night kit | `#17181d` | black kit, Enforcer, deep shadows |
| Charcoal | `#3b3635` | gloves, boots, plate carrier |
| Coyote | `#b68f65` | helmets, webbing, golden-hour dust |
| Sand | `#d7b892` | desert fabrics, skin highlights |
| Olive drab | `#4b5a3a` | uniform, pouches (Base), Recon |
| Pouch olive | `#6e6f43` | the Base Operator pouch colour |
| Wolf grey | `#758492` | overcast sky, haze, urban camo |
| Concrete | `#afb3b3` | barriers, ruins |
| Spark | `#ef8f39` | the PARP accent: muzzle sparks, selections, UI focus |
| Hazard | `#959622` | Abiotic-style accent, hi-vis moments |
| LCD ink / paper | `#16200f` / `#b5c79a` | the index browser's 1-bit screen |

## 4. The roster

| Operator | Built from | Status |
|---|---|---|
| **Base Operator** | Purchased pack, unmodified silhouette, recolourable | **Live** (v0.3.0) |
| **Recon** | Hooded mask, houndstooth scarf, plate carrier + admin pouch, patches, radio, carabiner | Planned (`WP-C2`, `WP-C3`) |
| **Insurgent** | Plaid shirt, shemagh, bare head or beanie, AK kit, minimal rig | Planned (`WP-C5`) |
| **Enforcer** | Black kit, bold belt pouches, NVG helmet, modern rifle | Planned (`WP-C6`) |

Mapping from keyframes to roster names is the agent's proposal; the owner confirms it in `WP-C2`/`C5`/`C6` sign-off.
The *Base Operator* style presets in the customiser (Recon-/Insurgent-/Enforcer-style) are placeholders that show
the direction using existing parts.

## 5. Technical art budgets

Operator + equipment ≤ 15,000 triangles and ≤ 60 draw calls; ≤ 1.5 MB per GLB (meshopt); textures ≤ 512² for fabric
camo, flat colours elsewhere; one shared skeleton (UE5-mannequin-style, 83 bones) for the whole roster; names
`SK_*` for meshes and `M_*` for materials; materials matte (roughness ≈ 0.9) with metal only on guards.

## 6. Open art questions

- Setting reconciliation (`WP-D1`): the earlier premise (Yantis, 2012, WW2044 prologue) reads very differently from modern kit. Which is canon for the demos?
- Signage in the keyframes ("BLACKSITE") is concept-art text, not a name decision.
- The purchased pack's redistribution terms (register note).
