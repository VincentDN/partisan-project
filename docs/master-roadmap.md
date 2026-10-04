# Partisan Project master roadmap

**Partisan Project** · version 0.3.0 · updated 3 October 2026 · master index and generated work queue

This document supersedes the four earlier plans (customiser, Partisan, content roster, workbench animation) and
the 30 September 2026 master roadmap, which is kept for traceability in
[`archive/legacy-master-roadmap-2026-09-30.md`](archive/legacy-master-roadmap-2026-09-30.md).
Work is planned as **packets sized for two $20 subscriptions** (Claude Pro and ChatGPT Plus), passed back and
forth between windows: see [`agent-ops/README.md`](agent-ops/README.md). The plan itself is data
([`agent-ops/packets.json`](agent-ops/packets.json)); the tables below are generated from it.

> Links: [Design document (one-pager)](game-design-master-doc.html) · [Index](../) · [Art direction](art-direction.md) ·
> [Engineering standards](engineering/standards.md) · [Decisions (ADRs)](adr/README.md)

## 1. What Partisan Project is

An **interactive game design document**. Instead of a static PDF, each aspect of the future game is a playable
or inspectable demo, tied together by an in-universe design document and a Nokia-style index.

**2026 goals (the two demos that must be excellent):**

1. **Operator Customiser**: a fully customisable operator with hero poses and equipment (roster: Base → Recon, Insurgent, Enforcer).
2. **Weapon Workbench**: a fully customisable gun modder with many weapons and real attachments.

Everything else (environment diorama, AI belief-model visualiser) is the 2027 horizon.

## 2. Where we are (v0.3.0, "Foundation")

| Area | State |
|---|---|
| Home | Partisan Project index browser (1-bit LCD, dither, keypad), design document, this roadmap, moodboard |
| Repository | Moved out of the portfolio site into `partisan-project`; buildless static site; three.js vendored; Pages workflow (needs one owner click, `WP-F8`) |
| Operator Customiser | **Live**: four operators on one skeleton, *Base*, *Recon*, *Insurgent*, *Enforcer* (extension packs bound to the purchased soldier's rig by bone name); 10+ equipment slots, 8–10 colour zones per base, 5 hero poses, 3 idle animations, shareable URL looks, optional carried rifle as a prop |
| Weapon Workbench | **Live**: AK-74M and AK-15K, 12 slots on three rails that cannot overlap (back-up sight, trigger, charging handle, sling…), stats and hover deltas, rules, presets, finishes, camo, wear, photo and loadout card |
| Asset Viewer | **Live**: inspects registered GLBs against budgets |
| Removed | Test fire, recoil, reload, range drill, bench scene with hands, Advanced animations experiment (returned as the opt-in Bench Lab, ADR 0008), code-built operator |
| Not done | Real CC0 attachments and extra weapons (the build sandbox cannot reach OpenGameArt, itch.io, Sketchfab: see §5); roster patches/props and owner art sign-off |

## 3. Instruction log (what the owner asked for on 1 October 2026, and where it landed)

| Instruction | Outcome |
|---|---|
| Token-budget system for $20 plans, handing off between agents | `docs/agent-ops/` + `tools/agent/*` (WP-F3) |
| Remove the project from vincentdenil-site, host in `partisan-project` with GitHub Pages; outbound links from `/projects` | Done in both repos; Pages workflow built; owner enables Pages (WP-F8) |
| Rename to Partisan Project, abbreviation Partisan Project | Done everywhere |
| Hierarchy: `workbench`, `viewer`, `docs`, `docs/moodboard` | Done, plus `operator`, `shared`, `assets`, `vendor`, `tools`, `tests` |
| `docs/game-design-master-doc.html` (in-universe one-pager) and `docs/master-roadmap.md` | Done |
| Ingest `feedback/` images for art direction; moodboard folder | `docs/moodboard/`, `docs/art-direction.md` |
| Nokia-style / DOS dither index browser | `index.html` |
| Remove shooting, operator and workbench hand animation features | Done (ADR 0005) |
| Replace the generated operator with the purchased asset; Base Operator; Recon / Insurgent / Enforcer later | Base Operator live; others planned (M2) |
| Character customiser separate from the workbench | `operator/` |
| Idle animations and hero poses from the sheet | 10 poses (incl. the sheet's hero pose, crouch, kneel, salute), 3 idles, data-driven |
| Replace generated assets and attachments with real CC0 counterparts; add all outstanding assets | **Pipeline and register done; downloads blocked in this sandbox** (M1/M4 packets list each one) |
| Consolidate with the old roadmap into a master document and a one-page site | This file and the design document |
| The earlier `partisan-project` contents (AI docs) move to vincentdenil-site/docs | Done: `vincentdenil.com/docs/partisan-ai/` |

## 4. Milestones

Dates are **targets, not commitments**; capacity is measured in windows, not weeks (see agent-ops §3).

| Milestone | Target | Outcome | Exit gate |
|---|---|---|---|
| **M0 Foundation** v0.3.0 | 1 Oct 2026 | Restructure, removals, Operator Customiser v1, docs, Pages workflow | Owner enables Pages; live smoke test (WP-F8, WP-F10) |
| **M1 Gun modder** v0.4.0 | mid Nov 2026 | Real CC0 attachments; G3A3 as third rifle; rail footprints; new slots; stat consistency | ≥ 3 weapons, visible compatibility reasons, hover deltas, presets, no code-built primitive left unregistered |
| **M2 Operator roster** v0.5.0 | mid Dec 2026 | Recon, Insurgent, Enforcer on the shared skeleton; roster switcher; patches; more poses; idle polish; hair/face | Each operator signed off against its moodboard reference; ≤ 15 k triangles; no clipping in all poses. *v1 of Recon, Insurgent and Enforcer is live (v0.3.1); sign-off, patches and more poses remain* |
| **M3 Integration** v0.6.0 | Jan 2027 | Workbench build carried onto the operator; per-weapon grip data; versioned share codes; combined share card | Round-trip of weapon + operator + pose through a link, including legacy AK hashes |
| **M4 Roster 2** v0.7.0 | Q1 2027 | M16, Mk14, RPK, Spear (decision), STG44, PPSh; Bren and Chauchat sources | Each item shipped as real geometry or recorded as "no free source" |
| **M5 Production** v1.0.0 | Q2 2027 | Accessibility, performance, credits, guided first run, release | Checklist in `engineering/standards.md` |
| **2027 horizon** | after v1.0 | Ruined-checkpoint environment demo; belief-model visualiser from the AI compendium | Own packets (WP-E*) |

*Budget arithmetic.* Open work today is ~695 BU of packets (see §6). At the planning assumption of 8 usable windows per plan per week and 25 % reserve, one plan carries roughly 600 BU a week, so the plan is capacity-feasible with slack; the real constraint is **owner actions** (downloads, licence checks, art sign-off), which is why they sit at the top of every milestone. Re-run the calculation after two weeks of calibration data.

## 5. Tracks

### 5.1 Weapons (Workbench)

Preserve what exists (finishes, camo, wear, presets, hash state, hover deltas, rules). Extend rule semantics
(`requires`, `excludes`, `replaces`) with visible reasons; generalise rail length, pitch and footprints; add slots
(sling mount, charging handle, trigger, dust-cover rail). Stats stay *illustrative* handling values, never claims
about real-world performance.

**Content stages** (sources are **leads**, not clearances; the owner verifies each exact asset page before download;
full list with candidates and blockers: [`../assets/REGISTER.md`](../assets/REGISTER.md)):

| Stage | Items | Notes |
|---|---|---|
| 1 | Real attachment geometry (magazine, muzzle device, optic first), **G3A3** | Generic donor: byzmod3d *Low Poly Weapon Pack* (CC0); chilly-durango *Low Poly Firearms* (CC0) as modular reference. G3A3: 3DCADBrowser licence unknown, else a Sketchfab G3/CETME substitute. |
| 2 | M16 / modernised M16, Mk14 EBR, modernised RPK, SIG Spear | RPK: look for D_U's catalogue (same author, CC BY 4.0), else kitbash; Spear has **no free source** (owner decision: pay or placeholder). Reference photo for the RPK target look is in the legacy roadmap archive. |
| 3 | STG44 and PPSh-41 as modernised kitbashes; Bren and Chauchat sources only | Chauchat is the rarest free asset on the list. |

Scope-honesty rules carried forward: better code-built shapes are an acceptable *interim* but do **not** satisfy
"real downloaded geometry"; an uncleared source leaves its milestone open; a placeholder is labelled as one.

**Why none of this shipped in v0.3.0.** The session that did the restructure could only reach npm, PyPI and the
GitHub API. OpenGameArt, itch.io, Sketchfab, Poly Haven and Freesound were blocked by the sandbox's network policy.
The owner's two actions (`WP-A1`: download packs into `assets-incoming/`) unblock the rest,
and the import path (`import-asset.py` → `optimize-glb.mjs` → `register.mjs add --fulfils …`) was tested end to end on a synthetic model.

### 5.2 Characters (Operator Customiser)

Done: Base Operator **plus Recon, Insurgent and Enforcer v1** (original extension packs: hood, houndstooth scarf, chest radio, knit beanie, shemagh, a shirt torso, generated plaid and recon camo); slots (headgear, headset, face, body armour, chest rig, belt, backpack, holsters, pads, carried
weapon); colour zones (top, trousers, armour, helmet, gear, gloves, boots, skin) with the pack's own camo plus four
generated camos; ten poses (Relaxed, Hero rifle-up, Low ready, High ready, Shoulder arms, Crouch, Kneel, Salute, Radio check, Overwatch; legs fold via a `lower` offset); three idles (Calm,
Alert scanning, Weary); URL looks; photo export; triangle/draw-call readout against budget.

Next priority: [deep character customisation](character-customisation-roadmap.md), packets `WP-CM0`–`WP-CM21`. Rebuild a complete Recon underbody, then author interchangeable carrier families, individual pouches, belts and bags with fitting, compatibility and saved assemblies. The first gate is a stripped character plus one carrier, three pouch modules, a belt and a daypack. Reuse the older C-series patch, prop and headwear work where compatible; the new 3D release does not wait for inventory/sprite integration.

*Pose model.* Poses and idles are JSON in character-space degrees applied over the rest pose. Legacy operators use the shared skeleton; the generated Recon has a fitted 26-bone skeleton and a pose profile. Runtime two-bone arm IK in `operator/grip.js` places palms on the carried rifle. The modular roadmap preserves this data interface while adding articulated hands and fitted gear. Weapon firing and recoil remain outside the Operator Modder.

### 5.3 Integration and sharing

Done: the Workbench build carries onto the operator ("Workbench build" weapon option; the operator link embeds the build so it works for anyone) and versioned `P1.` codes with backward compatibility for every old link (`shared/loadout.js`). Next: grip-contact data per weapon/stock combination (`WP-I2`) and a combined share card (`WP-I4`).

### 5.4 Quality and release

Accessibility (WCAG 2.2 AA target), performance acceptance on a real mid-range phone, credits generated from the
register, guided first run, release checklist. Targets: 60 fps desktop / 30 fps mid-range phone *as goals, not measured claims*.

### 5.6 Partisan Tactical (the top-down shooter)

**3 October review:** S1–S4 are implemented on main: level data, objectives, squad orders and new AI behaviours.
The current convoy is still a disposable combat scenario. The next goal is a complete **persistent extraction loop
on that map**: risk owned kit, search bodies/cargo, survive a timed exit, bank once, and redeploy with recovered gear.
Defeat, timeout and abandonment lose deployed equipment. More maps follow that playable gate.

The [tactical roadmap](tactical-roadmap.md) now contains the code audit, loss rules, save/transaction design,
packet dependencies, survival/economy work, three-mission progression, customiser integration and acceptance matrix.
Physical gear and permanent catalogue discoveries are separate. The initial browser release is solo PvE with AI
squadmates; authoritative co-op and PvPvE are gated research, not existing features or v0.8.0 promises.
Start with WP-S20/WP-S21 (whole-squad control), then WP-S28 and WP-S16, then WP-S8/WP-S29. Milestone S totals include optional online research and are relative
BU estimates, not dates or subscription-window guarantees. This tactical work supersedes the older horizon wording
above only for the now-existing shooter; other modules retain their own priorities.

Claude’s merged WP-S20–S26 remain: switch between rebels, lose only on all-down, then per-rebel XP and equipment-gated branches. Their decision log is retained.

### 5.7 Graphics (2.5-D sprites and the retro overworld)

The shooter's world becomes RimWorld-style 2.5-D top-down sprites (thick outlines, paper-doll people, long shadows) and the
campaign map a retro handheld-RPG island map. The simulation is untouched, so it runs in parallel with the gameplay work.
Plan: [graphics-roadmap.md](graphics-roadmap.md) (milestone V, WP-V1 to V20). Reasoning: [design-decisions/J-graphics.md](design-decisions/I-graphics.md).

### 5.5 Design documentation

Setting reconciliation (`WP-D1`) comes first: the earlier premise (Yantis, 2012, a *WW2044* prologue) and the
modern low-poly look must be reconciled before more art is made. Then GDD expansion, insignia, audio direction, a
UI/UX style guide.

## 6. Work packets (generated)

Do not edit between the markers; edit `agent-ops/packets.json` and run `node tools/agent/roadmap-table.mjs`.

<!-- packets:start -->

| Milestone | Target | Packets | Budget | Progress |
|---|---|---|---|---|
| **M0** Foundation | v0.3.0 | 10/10 | 130 BU | 100% |
| **M1** Gun modder: real parts, three weapons | v0.4.0 | 9/11 | 143 BU | 89% |
| **M2** Operator roster: Recon, Insurgent, Enforcer | v0.5.0 | 13/33 | 552 BU | 36% |
| **M3** Integration and sharing | v0.6.0 | 4/8 | 124 BU | 45% |
| **M4** Weapon roster 2: modern and WW2 | v0.7.0 | 7/7 | 111 BU | 100% |
| **M5** Production acceptance | v1.0.0 | 3/5 | 59 BU | 61% |
| **TD** Tech debt (fill windows) | — | 4/4 | 44 BU | 100% |
| **D** Design docs | — | 3/5 | 59 BU | 61% |
| **H27** 2027 horizon | — | 0/3 | 48 BU | 0% |
| **S** Partisan Tactical: extraction PvE, campaign and gated online research | v0.8.0 | 6/42 | 645 BU | 13% |
| **V** Graphics: 2.5D top-down sprites and the retro overworld | v0.9.0 | 0/20 | 251 BU | 0% |

### M0 · Foundation

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-F1` | Restructure into the Partisan Project layout; migrate from vincentdenil-site | M (20) | done | — | — |
| `WP-F2` | Remove firing, range drill, bench-hand animation, advanced-animation experiment and the procedural operator | M (20) | done | — | — |
| `WP-F3` | Agent-ops: work-packet system, calibration, handoff protocol and tooling | M (20) | done | — | — |
| `WP-F4` | Master roadmap, design-doc one-pager, moodboard and Nokia-style index | M (20) | done | — | — |
| `WP-F5` | Operator Customiser v1: Base Operator ingest, equipment slots, colour zones, 5 hero poses, 3 idles | M (20) | done | — | — |
| `WP-F6` | Asset import tooling and triangle budgets (bpy + glTF-Transform) | S (8) | done | — | — |
| `WP-F7` | GitHub Pages workflow, allowlist site build, link checker, dev server | S (8) | done | — | — |
| `WP-F8` | Owner: enable Pages (Settings > Pages > Source: GitHub Actions) and merge the branch to main | XS (3) | done | owner | — |
| `WP-F9` | Browser smoke tests (Playwright) for index, workbench, operator, viewer, in CI | S (8) | done | — | — |
| `WP-F10` | Verify the live Pages deployment; fix any base-path problem | XS (3) | done | browser | `WP-F8` |

### M1 · Gun modder: real parts, three weapons

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-A1` | Fetch the chosen Sketchfab sources into assets-incoming/ (node tools/assets/sketchfab-fetch.mjs, needs SKETCHFAB_TOKEN) | XS (3) | done | owner, net | — |
| `WP-A2` | Import and normalise attachment parts (magazine, muzzle device, optic) from the CC0 packs | S (8) | done | bpy | `WP-A1` |
| `WP-A3` | Wire real parts through glb() for magazines, one muzzle device and one optic | S (8) | done | — | `WP-A2` |
| `WP-A4` | Generalise finishes/camo to real-asset material names | S (8) | planned | — | `WP-A3` |
| `WP-A5` | Convert remaining attachment families to real parts (foregrip, grip, stock, side rail, suppressor, brake) | M (20) | done | bpy | `WP-A3` |
| `WP-A6` | Rail footprints: parts on one rail cannot overlap (footprints, travel, auto-slide, repair on load) | M (20) | done | — | — |
| `WP-A7` | New slots: sling mount, charging handle, trigger, dust-cover rail | M (20) | done | — | `WP-A6` |
| `WP-A8` | Stat consistency pass: ergonomics, recoil, mass, length, ADS, sound signature, hover deltas for every option | S (8) | done | — | — |
| `WP-A9` | G3A3: import D_U low-poly HK G3 (+ .308 drum, bipod, Z-24 scope), models.js entry | M (20) | done | bpy | `WP-A1` |
| `WP-A10` | Weapon-depth exit tests: >=3 weapons, visible compatibility reasons, hover deltas, presets, regression | S (8) | planned | — | `WP-A9`, `WP-A7`, `WP-A8` |
| `WP-A11` | Handling sounds from cleared CC0 recordings (optional upgrade over synthesis) | M (20) | done | net | — |

### M2 · Operator roster: Recon, Insurgent, Enforcer

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-C1` | Skeleton contract: document the shared 83-bone rig, add a test that poses/idles run on any base with the same bone names | S (8) | done | — | — |
| `WP-C2` | Recon: hood and scarf meshes skinned to the Base skeleton (bpy), plate-carrier variant | M (20) | done | bpy, browser | `WP-C1` |
| `WP-C3` | Recon: gear props (carabiner, canister, radio handheld) and owner sign-off against the sheet | S (8) | planned | — | `WP-C2` |
| `WP-C4` | Roster switcher: data-driven per-base slot and zone configs | S (8) | done | — | `WP-C1` |
| `WP-C5` | Insurgent: plaid shirt, shemagh, bare head, AK-pattern kit built from Base parts plus new meshes | M (20) | done | bpy | `WP-C4` |
| `WP-C6` | Enforcer: black kit, bold pouches, NVG helmet variant | M (20) | done | bpy | `WP-C4` |
| `WP-C7` | Insignia and patch system: six sleeve patch designs, left and right (faction flags come with WP-D3) | M (20) | done | — | `WP-C4` |
| `WP-C8` | Pose library expansion: crouch, kneel, sit, salute, sling carry, rifle-on-shoulder | M (20) | done | browser | `WP-C1` |
| `WP-C9` | Idle polish: blink and head-follow of the camera (reduced-motion safe) | M (20) | done | — | `WP-C1` |
| `WP-C10` | More hairstyles and facial-hair options for bare-head looks | M (20) | done | bpy | `WP-C4` |
| `WP-C11` | Secondary motion: scarf drape and strap follow-through on the idle | S (8) | done | bpy, browser | `WP-C9` |
| `WP-CG1` | Generated Recon: textured modular model, fitted animation rig and weapon clearance | M (20) | done | bpy, browser | — |
| `WP-CG2` | Compare untouched Recon source with the modular conversion | S (8) | done | browser | `WP-CG1` |
| `WP-CM0` | Deep character customisation roadmap and work queue | S (8) | done | — | `WP-CG2` |
| `WP-CM1` | Audit Recon sources, module boundaries and skeleton contract | S (8) | ready | bpy, browser | `WP-CM0` |
| `WP-CM2` | Rebuild the clean Recon torso and clothing underneath equipment | M (20) | planned | bpy, browser | `WP-CM1` |
| `WP-CM3` | Separate Recon headwear and rebuild articulated hands | M (20) | planned | bpy, browser | `WP-CM2` |
| `WP-CM4` | Define item instances, assembly hierarchy and compatibility resolver | S (8) | planned | — | `WP-CM1` |
| `WP-CM5` | Model the lightweight modular plate carrier | M (20) | planned | bpy, browser | `WP-CM2`, `WP-CM4` |
| `WP-CM6` | Model magazine, utility and radio attachment modules | M (20) | planned | bpy, browser | `WP-CM5` |
| `WP-CM7` | Model the equipment belt and small daypack | M (20) | planned | bpy, browser | `WP-CM3`, `WP-CM5` |
| `WP-CM8` | Build the assembly editor, undo/redo and versioned outfit saves | M (20) | planned | browser | `WP-CM4`, `WP-CM6`, `WP-CM7` |
| `WP-CM9` | Validate the first modular character milestone | M (20) | planned | browser | `WP-CM3`, `WP-CM8` |
| `WP-CM10` | Model the assault carrier family | M (20) | planned | bpy, browser | `WP-CM9` |
| `WP-CM11` | Model the heavy carrier family and optional coverage pieces | M (20) | planned | bpy, browser | `WP-CM10` |
| `WP-CM12` | Model a standalone chest rig and Recon cross-body harness | M (20) | planned | bpy, browser | `WP-CM9` |
| `WP-CM13` | Expand pouch, belt and holster modules | M (20) | planned | bpy, browser | `WP-CM9` |
| `WP-CM14` | Model hydration pack, patrol pack and cross-body satchel | M (20) | planned | bpy, browser | `WP-CM9`, `WP-CM12` |
| `WP-CM15` | Author alternate upper clothing and trouser fits | M (20) | planned | bpy, browser | `WP-CM10`, `WP-CM12` |
| `WP-CM16` | Add fitted headgear and identity choices | M (20) | planned | bpy, browser | `WP-CM3`, `WP-CM9` |
| `WP-CM17` | Add per-item camouflage, patch and wear presets | S (8) | planned | browser | `WP-CM9` |
| `WP-CM18` | Author a second bounded body fit profile | M (20) | planned | bpy, browser | `WP-CM11`, `WP-CM14`, `WP-CM15`, `WP-CM16` |
| `WP-CM21` | Validate and release the expanded modular catalogue | M (20) | planned | browser | `WP-CM11`, `WP-CM12`, `WP-CM13`, `WP-CM14`, `WP-CM15`, `WP-CM16`, `WP-CM17`, `WP-CM18` |

### M3 · Integration and sharing

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-I1` | Shared loadout state: carry the Workbench build into the Operator Customiser (URL + localStorage) | M (20) | done | — | `WP-C4` |
| `WP-I2` | Per-weapon grip contact data and pose-fit for every supported weapon/stock combination | M (20) | blocked | — | `WP-I1`, `WP-A10` |
| `WP-I3` | Versioned loadout codes (P1.<base64url>) with backward compatibility for old AK hashes | S (8) | done | — | `WP-I1` |
| `WP-I4` | Combined share card (operator + weapon + stats) and photo-mode extras | S (8) | done | — | `WP-I3` |
| `WP-X1` | Original opening scene and advanced-animations test restored verbatim from vincentdenil-site (intro/), wired to the current customiser and the shared music player | M (20) | done | browser | — |
| `WP-X2` | Advanced animations: contact, sound and device review (the original prototype's open gates) | M (20) | planned | browser | `WP-X1` |
| `WP-CM19` | Connect modular appearances to owned rebel equipment | M (20) | planned | browser | `WP-CM9`, `WP-S8`, `WP-S14` |
| `WP-CM20` | Map modular gear to tactical sprite appearance layers | S (8) | planned | browser | `WP-CM19`, `WP-V6` |

### M4 · Weapon roster 2: modern and WW2

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-A12` | M16: import TastyTony Low-Poly M16, models.js entry | M (20) | done | bpy, net | — |
| `WP-A13` | Mk14 EBR: import TastyTony Low-Poly Mk14 EBR, models.js entry | M (20) | done | bpy, net | — |
| `WP-A14` | Modernised RPK (D_U catalogue, else kitbash from AK-74M/AK-15K) | M (20) | done | bpy | — |
| `WP-A15` | SIG Spear: import D_U low-poly SIG MCX Spear (free download, no purchase) | S (8) | done | owner | — |
| `WP-A16` | StG 44 modernised: D_U low-poly Stg44 as the base | M (20) | done | bpy, net | — |
| `WP-A17` | PPSh-41 modernised: D_U low-poly PPSH-41 as the base | M (20) | done | bpy, net | — |
| `WP-A18` | Bren and Chauchat: sources confirmed (TastyTony Low-Poly Bren Gun, Low-Poly Chauchat) | XS (3) | done | owner, net | — |

### M5 · Production acceptance

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-Q1` | Accessibility audit across all demos (axe-core in CI, keyboard orbit, contrast, reduced motion) | M (20) | done | — | — |
| `WP-Q2` | Performance acceptance: desktop 60 fps and a mid-range phone 30 fps, cold/warm load, memory under repeated actions | M (20) | planned | — | — |
| `WP-Q4` | Short guided first run across demos (preset > part > stat; look > pose) | S (8) | done | — | — |
| `WP-Q5` | Release checklist and v1.0.0 tag for the 2026 demo | S (8) | done | — | `WP-Q1` |
| `WP-Q6` | Manual accessibility pass: screen reader (NVDA/VoiceOver), zoom 200 %, high-contrast mode, a real phone | XS (3) | planned | owner | `WP-Q1` |

### S · Partisan Tactical: extraction PvE, campaign and gated online research

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-S1` | Level framework: level data format, Sim takes a level, convoy as level 1, mission select (module named Partisan Tactical) | M (20) | done | — | — |
| `WP-S2` | Objectives and outcomes: eliminate, reach, destroy, steal, hold, protect, extract; debrief screen | S (8) | done | — | `WP-S1` |
| `WP-S3` | Squad orders: select teammates, follow/hold/move/attack/cover, tactical pause, order markers | M (20) | done | — | `WP-S1` |
| `WP-S4` | AI behaviours for new scenarios: guard posts, patrols, alarm propagation, radio reinforcements, bounding attack waves | S (8) | done | — | `WP-S1` |
| `WP-S5` | Level 2 Compound assault: walled compound, towers, armoury cache, radio mast, stealth then alarm, extract | M (20) | planned | — | `WP-S35`, `WP-S32`, `WP-S4` |
| `WP-S6` | Level 3 Cave hideout defence: cave, tunnels, fallback chamber, night, three attack waves, hold until dawn | M (20) | planned | — | `WP-S35`, `WP-S31`, `WP-S32`, `WP-S3`, `WP-S4` |
| `WP-S7` | Level visuals (retired: delivered by WP-V9 structures and WP-V12 lighting in the 2-D renderer) | S (8) | blocked | — | — |
| `WP-S8` | Inventory domain: unique items, ownership, loadout slots, compatible magazines, capacity and schema | M (20) | planned | — | `WP-S28` |
| `WP-S9` | Looting in levels: soldiers drop kit, vehicle cargo, hold E to search (exposed), carry limits, order a teammate to loot | M (20) | planned | — | `WP-S8`, `WP-S2` |
| `WP-S10` | Inventory UI: field loot panel, between-mission squad screen, attachment install with compatibility reasons, stat deltas | M (20) | planned | — | `WP-S8`, `WP-S9`, `WP-S29` |
| `WP-S11` | Finite combat loadouts: player and AI use owned weapons, attachments, partial magazines and consumable ammunition | M (20) | planned | — | `WP-S8`, `WP-S3` |
| `WP-S12` | Campaign controller: briefing, durable deployment, debrief settlement, squad availability, recruit and reset | M (20) | planned | — | `WP-S29`, `WP-S30`, `WP-S10`, `WP-S11` |
| `WP-S13` | Unlocks into the Weapon Modder: first extraction unlocks; locked parts greyed with where to steal them; ?unlock=all | M (20) | planned | — | `WP-S12`, `WP-S33` |
| `WP-S14` | Unlocks into the Operator Customiser: looted helmets, vests, NVGs, patches | S (8) | planned | — | `WP-S13` |
| `WP-S15` | AI v2: investigate noises and bodies, search patterns, squad morale (fall back, surrender), AI timeline view | M (20) | planned | — | `WP-S4`, `WP-S32` |
| `WP-S16` | AI tuning harness: headless runs over seeds x awareness x player styles per level, report table | S (8) | ready | — | `WP-S1` |
| `WP-S17` | Tactical tests and performance: smoke per level, inventory and unlock e2e, phone budget, CI under 10 min | M (20) | planned | — | `WP-S5`, `WP-S6`, `WP-S7`, `WP-S14`, `WP-S15`, `WP-S18`, `WP-S31`, `WP-S33`, `WP-S34`, `WP-S35`, `WP-S25`, `WP-S26` |
| `WP-S18` | Touch controls: twin-stick, tap to loot, long-press orders | S (8) | planned | — | `WP-S35`, `WP-S10`, `WP-S3` |
| `WP-S19` | Docs: design doc sections (scenarios, loot loop, unlock economy), changelog, index entry renamed Partisan Tactical | XS (3) | planned | — | `WP-S17` |
| `WP-S20` | Play as the whole squad: active-rebel pointer, loss when every rebel is down, forced swap on death, AI takes over the one you leave | M (20) | done | — | `WP-S1`, `WP-S3` |
| `WP-S21` | Swap UX: switch button, slow-motion zoom-out, hover the new rebel, take control (reduced-motion safe) | S (8) | ready | — | `WP-S20` |
| `WP-S22` | Progression core: XP from kills, objectives and looting; levels 1-10 per rebel; perk points; persistent in the campaign save | M (20) | planned | — | `WP-S12`, `WP-S20` |
| `WP-S23` | Upgrade trees: Bannerlord-style tiers per rebel with two branches, gated by the equipment carried | M (20) | planned | — | `WP-S8`, `WP-S22` |
| `WP-S24` | Perks and abilities: passive perks per level, active abilities with cooldowns unlocked by branch | M (20) | planned | — | `WP-S23` |
| `WP-S25` | Teammate AI uses abilities; progression balance pass with the tuning harness | S (8) | planned | — | `WP-S24`, `WP-S16` |
| `WP-S26` | Rebel sheet UI: level, XP, tree with locked branches and the gear they need, perk picks | S (8) | planned | — | `WP-S23`, `WP-S10` |
| `WP-S27` | Extraction roadmap: repository audit, staged delivery gates and synchronized work packets | S (8) | done | — | — |
| `WP-S28` | Tactical boundaries: extract lifecycle/render/input seams while preserving seeded practice behaviour | M (20) | ready | — | `WP-S1`, `WP-S2`, `WP-S3`, `WP-S4`, `WP-S20`, `WP-S21` |
| `WP-S29` | Persistence transactions: profile schema, reservation, idempotent settlement, migration and concurrent-tab ownership | M (20) | planned | — | `WP-S8` |
| `WP-S30` | Extraction lifecycle: countdown, deadline, early retreat and explicit squad abandonment | M (20) | planned | — | `WP-S2`, `WP-S9`, `WP-S29` |
| `WP-S31` | Hardcore survival: bleeding, finite medical supplies, treatment, simple armour and squad wounds | M (20) | planned | — | `WP-S35` |
| `WP-S32` | Raid readability and navigation: reachable loot/exits, squad pathing and contact visibility | M (20) | planned | — | `WP-S35` |
| `WP-S33` | Repeatable scavenging economy: raid variants, restricted recovery kit and stash overflow | M (20) | planned | — | `WP-S35` |
| `WP-S34` | Browser campaign resilience: refresh loss, hidden-tab pause, failed saves and backup/import | S (8) | planned | — | `WP-S12` |
| `WP-S35` | Convoy extraction gate: end-to-end second deployment, loss accounting and first playtest | S (8) | planned | browser | `WP-S12`, `WP-S34`, `WP-S16` |
| `WP-S36` | Owner decision: local PvE or funded live co-op; region, concurrency and operating budget | XS (3) | blocked | owner | `WP-S17` |
| `WP-S37` | Conditional online spike: authoritative simulation protocol and server tick benchmark | M (20) | planned | net | `WP-S36` |
| `WP-S38` | Conditional online profiles: identity, server-owned inventory and durable settlement | M (20) | planned | net | `WP-S37`, `WP-S29` |
| `WP-S39` | Conditional co-op closed alpha: lobbies, replication, reconnect and squad loot ownership | M (20) | planned | browser, net | `WP-S38` |
| `WP-S40` | Conditional online operational gate: abuse tests, hidden-state filtering, restore and load costs | M (20) | planned | net | `WP-S39` |
| `WP-S41` | Owner decision: approve a PvPvE experiment after co-op retention, fairness and cost review | XS (3) | blocked | owner | `WP-S40` |
| `WP-S42` | Conditional PvPvE experiment: small closed raid population and fairness evaluation | M (20) | planned | browser, net | `WP-S41` |

### V · Graphics: 2.5D top-down sprites and the retro overworld

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-V1` | Art bible: palette, outline rule, 1 m = 32 px scale, sun direction, shadow rule, sprite sizes, layer order | S (8) | ready | — | — |
| `WP-V2` | Renderer interface: extract the draw calls from convoy/game.js; the three.js code becomes renderer-3d behind ?view=3d | S (8) | planned | — | `WP-V1` |
| `WP-V3` | Canvas 2-D renderer: integer zoom and pan, y-sorted layers, picking, DPR; today's level with placeholder sprites | M (20) | planned | — | `WP-V2` |
| `WP-V4` | Sprite tooling and Sprite Lab: atlas and manifest build, a viewer for layers, animations and palette swaps | S (8) | planned | — | `WP-V3` |
| `WP-V5` | Paper-doll people: layered soldiers in front/back/side views with the outline pass; role silhouettes and factions | M (20) | planned | — | `WP-V4` |
| `WP-V6` | Equipment layers: item id to sprite layers; weapons and vehicles baked from 3-D models by a top-down render-to-sprite pass | S (8) | planned | — | `WP-V5` |
| `WP-V7` | Animation and states: walk, sneak, aim, recoil, reload, search, wounded, down; free-rotating weapon layer; swap highlight and selection brackets | S (8) | planned | — | `WP-V5` |
| `WP-V8` | Terrain: 32 px tiles with variants and soft transitions, seeded scatter with long shadows, chunk-baked ground | M (20) | planned | — | `WP-V4` |
| `WP-V9` | Structures and cover: 2.5-D walls, doors, floors, fading roofs, towers, cave walls, cover props | M (20) | planned | — | `WP-V8` |
| `WP-V10` | Vehicles: jeep, truck, MRAP with a rotating turret layer, damage and wreck states, searchlight | M (20) | planned | — | `WP-V4` |
| `WP-V11` | Effects: tracers, muzzle flash, sparks, dust, smoke, explosions, casings, suppression pulses (no gore) | S (8) | planned | — | `WP-V3` |
| `WP-V12` | Lighting: time-of-day tint, darkness mask with lights, cave darkness, searchlight cone | M (20) | planned | — | `WP-V9`, `WP-V11` |
| `WP-V13` | World-space UI: selection brackets, order markers, health pips, callouts and the AI-view overlay in 2-D | S (8) | planned | — | `WP-V3` |
| `WP-V14` | Overworld island renderer: low-res height grid in banded greens, coast outline, flat sea, nearest-neighbour scaling | M (20) | planned | — | `WP-V4`, `WP-V17` |
| `WP-V15` | Overworld icons and routes: red-roofed towns, yellow land routes, blue sea routes, territory tint with non-colour cue, squad marker | S (8) | planned | — | `WP-V14` |
| `WP-V16` | Overworld UI and transitions: integer pan/zoom, node panel, travel, clock, zoom into the tactical map | M (20) | planned | — | `WP-V15` |
| `WP-V17` | Overworld data: island.js format (nodes, routes, regions, starting control), reachability test, first island | S (8) | planned | — | `WP-V1` |
| `WP-V18` | Parity and switch: parity checklist, per-level contact sheets, 2-D default, 3-D behind ?view=3d for one release then removed | S (8) | planned | — | `WP-V5`, `WP-V9`, `WP-V10`, `WP-V11`, `WP-V12`, `WP-V13` |
| `WP-V19` | Performance and phones: sprite and draw-call budget, caches, particle caps, 30 fps floor on a mid phone, non-colour cues | S (8) | planned | — | `WP-V12` |
| `WP-V20` | Docs: Game Design Doc visuals section, changelog, moodboard, decision log | XS (3) | planned | — | `WP-V18` |

### TD · Tech debt (fill windows)

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-T1` | Fold the Workbench viewer into shared/stage.js and shared/music-ui.js; split viewer.js into state/ui/camera/photo modules | M (20) | done | — | — |
| `WP-T2` | Formatter + linter (Prettier, ESLint) and reformat the dense legacy modules | S (8) | done | — | — |
| `WP-T3` | Type-check with JSDoc + tsc --checkJs (no build step) | S (8) | done | — | `WP-T2` |
| `WP-T4` | Unit tests for stats, compatibility rules and Workbench hash codes | S (8) | done | — | — |

### D · Design docs

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-D1` | Owner decision: setting canon (Yantis / WW2044 prologue vs the modern low-poly operator look) for the demos | XS (3) | ready | owner | — |
| `WP-D2` | Design doc expansion: core loop, progression, feature matrix, AI summary linking the earlier AI compendium | M (20) | done | — | — |
| `WP-D3` | Faction insignia and flag set (Free State flag, patches, armbands) | M (20) | planned | — | `WP-D1` |
| `WP-D4` | Audio direction one-pager (music, foley, UI sounds, provenance rules) | S (8) | done | — | — |
| `WP-D5` | UI/UX style guide: the Nokia/DOS language across all demos | S (8) | done | — | — |

### H27 · 2027 horizon

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-E1` | Environment demo A: low-poly barrier/sandbag/pallet/container kit and ruin pieces (sources chosen) | S (8) | planned | net | — |
| `WP-E2` | Environment demo B: ruined-checkpoint diorama viewer with weather and haze | M (20) | planned | — | `WP-E1`, `WP-Q5` |
| `WP-E3` | AI demo: belief-model visualiser derived from the AI compendium | M (20) | planned | — | `WP-D2`, `WP-Q5` |

<!-- packets:end -->

## 7. Acceptance and test matrix

| Dimension | Coverage |
|---|---|
| Models and builds | Both rifles; default, folded stock, no optic, large scope, extended magazine, drum, extreme rail offsets; every operator × every pose |
| Operator proportions | Base first; roster bases must pass the same pose set with no clipping |
| State | Geometry, stats and hash agree after any change; unknown hash keys ignored; legacy AK hashes still load |
| Audio | First gesture, mute, volume zero, track switch, autoplay blocked, hidden tab |
| Navigation | Index → demo → back; copied links; `file://` is unsupported (modules), documented |
| Input/accessibility | Pointer, touch, keyboard; reduced motion; visible focus; understandable errors |
| Visual checks | Contact sheet per pose and per operator; owner sign-off |
| Performance | Desktop and a mid-range phone; cold/warm load; stable memory over repeated changes |
| Build | Allowlist build, link check, import-map check, size ≤ 90 MB |

A passing test certifies mechanics, never art quality.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Free sources for Spear, RPK, Bren, Chauchat do not exist | The owner decides pay / commission / placeholder; never silently substitute |
| Concept images are AI-assisted and reference commercial games | Documentary use only; never shipped as assets |
| Plan limits change under us | Calibration loop; BU is relative; packets never exceed M |
| Rig fidelity (clipping, stiff hands) in close-ups | Hero distance only for now; poses are data and cheap to retune; `WP-C8/C9` |
| One-person bottleneck on art sign-off and downloads | Owner actions front-loaded in each milestone |
| Single large legacy file (`workbench/viewer.js`) | `WP-T1`, scheduled as filler work |
| Setting canon unresolved | `WP-D1` before more roster art |

## 9. Open decisions (owner)

1. **Setting canon** for demos: Yantis / WW2044 prologue, or the modern low-poly world? (`WP-D1`)
2. **Roster naming** from the keyframes (proposal in `art-direction.md` §4).
3. **Credits and licences:** out of scope for the tooling; the pages point to the GitHub documentation or the owner.
4. **Indexing:** pages are `noindex` (link-only) like the portfolio's projects. Flip when Partisan Project should be discoverable.
5. **Budget calibration:** which plan meters to read, and the weekly window count, after the first two weeks.

## 10. Maintenance

On every change update the packet status, regenerate the table (`roadmap-table.mjs`), the code map, the register and
`CHANGELOG.md`. `npm test` fails if the roadmap table or the plan drift.
