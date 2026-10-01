# Asset register

Generated from `assets/register.json` by `node tools/assets/register.mjs md`. Do not edit by hand.

Policy: CC0 or CC BY 4.0 only for downloaded assets, unless the owner records an explicit exception here. Every shipped file under assets/ must be listed in `assets`.

## Shipped assets

| Asset | File | Kind | Status | Licence | Author | Source |
|---|---|---|---|---|---|---|
| Base Operator | `assets/models/operators/base-operator.glb` | character | real | Purchased asset (commercial licence) — TERMS TO BE CONFIRMED by the owner before wide promotion | (purchased pack "Low_Poly_US_Soldier") | Owner purchase; see docs/art-direction.md |
| AK-74M Zenitco | `assets/models/weapons/ak-74m-zenitco.glb` | weapon | real | CC BY 4.0 | D_U | [link](https://sketchfab.com/3d-models/low-poly-ak-74m-zenitco-35ad8e37a513453cbbbd04064fa5fb79) |
| AK-15K | `assets/models/weapons/ak-15k.glb` | weapon | real | CC BY 4.0 | D_U | [link](https://sketchfab.com/3d-models/low-poly-ak-15-k-68725380dd654391bb6b751e888e2c44) |
| Quarry 01 (HDR) | `assets/lighting/quarry_01_1k.hdr` | lighting | real | CC0 | Poly Haven | [link](https://polyhaven.com/a/quarry_01) |
| Venice Sunset (HDR) | `assets/lighting/venice_sunset_1k.hdr` | lighting | real | CC0 | Poly Haven | [link](https://polyhaven.com/a/venice_sunset) |
| Studio (HDR) | `assets/lighting/studio.hdr` | lighting | real | Original (CC0 by the project) | PARP | tools/assets/generate-studio-hdr.py |
| The Duce Puts On His Uniform | `assets/audio/duce-uniform.mp3` | music | real | Supplied by the project owner; recorded as rights-cleared in the earlier README | (1940 Greek war song, recording supplied by owner) | Owner |
| Abdulena | `assets/audio/abdulena.mp3` | music | real | Supplied by the project owner | (supplied by owner) | Owner |

## Pipeline: placeholders and pending assets

| Item | Status | Target | Candidate sources (verify licence on the exact asset) | Blocked by |
|---|---|---|---|---|
| Optics (red dot, micro dot, holographic, 4x scope) | placeholder | Real CC0 optic meshes | byzmod3d Low Poly Weapon Pack (OpenGameArt, CC0); chilly-durango Low Poly Firearms (itch.io, CC0) as geometry reference | Sandbox network blocks OpenGameArt/itch.io; owner downloads into assets-incoming/ then runs tools/assets/import-asset.py |
| Muzzle devices (DTK-1, AK-74 brake, compensator, suppressor) | placeholder | Real CC0 muzzle meshes | byzmod3d Low Poly Weapon Pack (CC0) | same |
| Foregrips (vertical, angled, hand stop) | placeholder | Real CC0 foregrip meshes | byzmod3d pack; chilly-durango pack (reference) | same |
| Magazines (30, 45, 60, drum) | placeholder | Real CC0 magazine meshes (WP-A1 exit: at least the magazine) | byzmod3d pack | same |
| Pistol grips, stocks, side-rail light/laser | placeholder | Real CC0 meshes | byzmod3d pack; chilly-durango pack | same |
| G3A3 | pending | Third rifle, Stage 1 | 3DCADBrowser G3A3 (licence: verify); Sketchfab "G3"/"CETME" CC0/CC BY substitute | licence check + network |
| M16 / modernized M16 | pending | Stage 2 | byzmod3d pack m16.obj (CC0); Gintoki1234 M16 A4 (CC BY 4.0) | network |
| Modernized RPK | pending | Stage 2 | D_U Sketchfab catalogue (CC BY 4.0, matches current art style) | network; no confirmed free source |
| Mk14 EBR | pending | Stage 2 | notcplkerry (licence: verify); samanthacford Low Poly MK14 (licence: verify) | licence check + network |
| SIG Spear (MCX-SPEAR) | pending | Stage 2 | none free found; paid options exist (owner decision) | no free source: needs a paid-asset decision or a code-built placeholder |
| STG44 (modernized) | pending | Stage 3 | byzmod3d pack stg44.obj (CC0) | network |
| PPSh-41 (modernized) | pending | Stage 3 | victorcstr mini pack of WW2 weapons (licence: verify) | licence check + network |
| Bren (modernized) | pending | Stage 3: source only | bigmack WWII Mega Gun Pack; jimhatama World Wars Weapons Pack; marmok1932 Soviet Weapons Pack (none confirmed) | no confirmed source |
| Chauchat (modernized) | pending | Stage 3: source only | none surfaced; likely commission or from-scratch build | no confirmed source |
| Handling foley (CC0 recordings) | pending | Replace synthesised handling sounds with cleared CC0 recordings | freesound.org CC0 search; Kenney/Sonniss GDC bundles (check licence) | network; earlier recorded bank removed for provenance (ADR 0004) |
| Recon operator | pending | Hooded recon from moodboard sheet v01-09 | in-house build on the Base Operator skeleton | art production (WP-C2) |
| Insurgent operator | pending | From moodboard keyframe 2 | in-house build | art production (WP-C3) |
| Enforcer operator | pending | From moodboard keyframe 1 | in-house build | art production (WP-C4) |
