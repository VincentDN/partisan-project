# Partisan Project master roadmap

**Partisan Project** · version 0.3.0 · updated 1 October 2026 · single maintained roadmap

This document supersedes the four earlier plans (customiser, Partisan, content roster, workbench animation) and
the 30 September 2026 master roadmap, which is kept for traceability in
[`archive/legacy-master-roadmap-2026-09-30.md`](archive/legacy-master-roadmap-2026-09-30.md).
Work is planned as **packets sized for two $20 subscriptions** (Claude Pro and ChatGPT Plus), passed back and
forth between windows: see [`agent-ops/README.md`](agent-ops/README.md). The plan itself is data
([`agent-ops/packets.json`](agent-ops/packets.json)); the tables below are generated from it.

> Links: [Design document (one-pager)](game-design-master-doc.html) · [Index](../) · [Art direction](art-direction.md) ·
> [Engineering standards](engineering/standards.md) · [Asset register](../assets/REGISTER.md) · [Decisions (ADRs)](adr/README.md)

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
The owner's two actions (`WP-A1`: download packs into `assets-incoming/`; `WP-A9`: verify the G3A3 licence) unblock the rest,
and the import path (`import-asset.py` → `optimize-glb.mjs` → `register.mjs add --fulfils …`) was tested end to end on a synthetic model.

### 5.2 Characters (Operator Customiser)

Done: Base Operator **plus Recon, Insurgent and Enforcer v1** (original extension packs: hood, houndstooth scarf, chest radio, knit beanie, shemagh, a shirt torso, generated plaid and recon camo); slots (headgear, headset, face, body armour, chest rig, belt, backpack, holsters, pads, carried
weapon); colour zones (top, trousers, armour, helmet, gear, gloves, boots, skin) with the pack's own camo plus four
generated camos; ten poses (Relaxed, Hero rifle-up, Low ready, High ready, Shoulder arms, Crouch, Kneel, Salute, Radio check, Overwatch; legs fold via a `lower` offset); three idles (Calm,
Alert scanning, Weary); URL looks; photo export; triangle/draw-call readout against budget.

Next: patches and props (`C3`, `C7`), more poses (`C8`), idle polish (`C9`), faces/hair (`C10`), owner sign-off of the three roster operators.

*Pose model.* Poses and idles are JSON in character-space degrees applied over the rest pose, so they work on any base
that shares the 83-bone skeleton. `tools/pose-fit.mjs` solves arm angles to hit a hand target (e.g. a rifle grip) and
prints numbers to paste. **No hand IK at runtime, no firing, no bench animation** (ADR 0005).

### 5.3 Integration and sharing

Done: the Workbench build carries onto the operator ("Workbench build" weapon option; the operator link embeds the build so it works for anyone) and versioned `P1.` codes with backward compatibility for every old link (`shared/loadout.js`). Next: grip-contact data per weapon/stock combination (`WP-I2`) and a combined share card (`WP-I4`).

### 5.4 Quality and release

Accessibility (WCAG 2.2 AA target), performance acceptance on a real mid-range phone, credits generated from the
register, guided first run, release checklist. Targets: 60 fps desktop / 30 fps mid-range phone *as goals, not measured claims*.

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
| **M1** Gun modder: real parts, three weapons | v0.4.0 | 4/11 | 143 BU | 48% |
| **M2** Operator roster: Recon, Insurgent, Enforcer | v0.5.0 | 10/11 | 172 BU | 95% |
| **M3** Integration and sharing | v0.6.0 | 4/6 | 96 BU | 58% |
| **M4** Weapon roster 2: modern and WW2 | v0.7.0 | 0/7 | 111 BU | 0% |
| **M5** Production acceptance | v1.0.0 | 2/6 | 67 BU | 42% |
| **TD** Tech debt (fill windows) | — | 4/4 | 44 BU | 100% |
| **D** Design docs | — | 2/5 | 59 BU | 27% |
| **H27** 2027 horizon | — | 0/3 | 48 BU | 0% |

### M0 · Foundation

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-F1` | Restructure into the Partisan Project layout; migrate from vincentdenil-site | M (20) | done | — | — |
| `WP-F2` | Remove firing, range drill, bench-hand animation, advanced-animation experiment and the procedural operator | M (20) | done | — | — |
| `WP-F3` | Agent-ops: work-packet system, calibration, handoff protocol and tooling | M (20) | done | — | — |
| `WP-F4` | Master roadmap, design-doc one-pager, moodboard and Nokia-style index | M (20) | done | — | — |
| `WP-F5` | Operator Customiser v1: Base Operator ingest, equipment slots, colour zones, 5 hero poses, 3 idles | M (20) | done | — | — |
| `WP-F6` | Asset register, licence policy and import tooling (bpy + glTF-Transform) | S (8) | done | — | — |
| `WP-F7` | GitHub Pages workflow, allowlist site build, link checker, dev server | S (8) | done | — | — |
| `WP-F8` | Owner: enable Pages (Settings > Pages > Source: GitHub Actions), merge the branch to main, confirm licences (purchased pack redistribution, music rights) | XS (3) | done | owner | — |
| `WP-F9` | Browser smoke tests (Playwright) for index, workbench, operator, viewer, in CI | S (8) | done | — | — |
| `WP-F10` | Verify the live Pages deployment; fix any base-path problem | XS (3) | done | browser | `WP-F8` |

### M1 · Gun modder: real parts, three weapons

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-A1` | Owner: download the CC0 weapon packs into assets-incoming/ and screenshot each licence page | XS (3) | ready | owner, net | — |
| `WP-A2` | Import and normalise attachment parts (magazine, muzzle device, optic) from the CC0 packs | S (8) | planned | bpy | `WP-A1` |
| `WP-A3` | Wire real parts through glb() for magazines, one muzzle device and one optic | S (8) | planned | — | `WP-A2` |
| `WP-A4` | Generalise finishes/camo to real-asset material names | S (8) | planned | — | `WP-A3` |
| `WP-A5` | Convert remaining attachment families to real parts (foregrip, grip, stock, side rail, suppressor, brake) | M (20) | planned | bpy | `WP-A3` |
| `WP-A6` | Rail footprints: parts on one rail cannot overlap (footprints, travel, auto-slide, repair on load) | M (20) | done | — | — |
| `WP-A7` | New slots: sling mount, charging handle, trigger, dust-cover rail | M (20) | done | — | `WP-A6` |
| `WP-A8` | Stat consistency pass: ergonomics, recoil, mass, length, ADS, sound signature, hover deltas for every option | S (8) | done | — | — |
| `WP-A9` | G3A3: verify licence (owner), import, models.js entry (parts, sockets, defaults, factory options) | M (20) | blocked | bpy | `WP-A1` |
| `WP-A10` | Weapon-depth exit tests: >=3 weapons, visible compatibility reasons, hover deltas, presets, regression | S (8) | planned | — | `WP-A9`, `WP-A7`, `WP-A8` |
| `WP-A11` | Handling sounds from cleared CC0 recordings (optional upgrade over synthesis) | M (20) | done | net | — |

### M2 · Operator roster: Recon, Insurgent, Enforcer

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-C1` | Skeleton contract: document the shared 83-bone rig, add a test that poses/idles run on any base with the same bone names | S (8) | done | — | — |
| `WP-C2` | Recon: hood and scarf meshes skinned to the Base skeleton (bpy), plate-carrier variant | M (20) | done | bpy, browser | `WP-C1` |
| `WP-C3` | Recon: gear props (carabiner, canister, radio handheld) and owner sign-off against the sheet | S (8) | blocked | — | `WP-C2` |
| `WP-C4` | Roster switcher: data-driven per-base slot and zone configs | S (8) | done | — | `WP-C1` |
| `WP-C5` | Insurgent: plaid shirt, shemagh, bare head, AK-pattern kit built from Base parts plus new meshes | M (20) | done | bpy | `WP-C4` |
| `WP-C6` | Enforcer: black kit, bold pouches, NVG helmet variant | M (20) | done | bpy | `WP-C4` |
| `WP-C7` | Insignia and patch system: six sleeve patch designs, left and right (faction flags come with WP-D3) | M (20) | done | — | `WP-C4` |
| `WP-C8` | Pose library expansion: crouch, kneel, sit, salute, sling carry, rifle-on-shoulder | M (20) | done | browser | `WP-C1` |
| `WP-C9` | Idle polish: blink and head-follow of the camera (reduced-motion safe) | M (20) | done | — | `WP-C1` |
| `WP-C10` | More hairstyles and facial-hair options for bare-head looks | M (20) | done | bpy | `WP-C4` |
| `WP-C11` | Secondary motion: scarf drape and strap follow-through on the idle | S (8) | done | bpy, browser | `WP-C9` |

### M3 · Integration and sharing

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-I1` | Shared loadout state: carry the Workbench build into the Operator Customiser (URL + localStorage) | M (20) | done | — | `WP-C4` |
| `WP-I2` | Per-weapon grip contact data and pose-fit for every supported weapon/stock combination | M (20) | blocked | — | `WP-I1`, `WP-A10` |
| `WP-I3` | Versioned loadout codes (P1.<base64url>) with backward compatibility for old AK hashes | S (8) | done | — | `WP-I1` |
| `WP-I4` | Combined share card (operator + weapon + stats) and photo-mode extras | S (8) | done | — | `WP-I3` |
| `WP-X1` | Original opening scene and advanced-animations test restored verbatim from vincentdenil-site (intro/), wired to the current customiser and the shared music player | M (20) | done | browser | — |
| `WP-X2` | Advanced animations: contact, sound and device review (the original prototype's open gates) | M (20) | planned | browser | `WP-X1` |

### M4 · Weapon roster 2: modern and WW2

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-A12` | M16 and modernised M16 | M (20) | planned | bpy, net | `WP-A10` |
| `WP-A13` | Mk14 EBR (licence verify per candidate) | M (20) | blocked | bpy, net | `WP-A10` |
| `WP-A14` | Modernised RPK (D_U catalogue, else kitbash from AK-74M/AK-15K) | M (20) | planned | bpy | `WP-A10` |
| `WP-A15` | SIG Spear: owner decision (pay / placeholder), then implement | S (8) | blocked | owner | `WP-A10` |
| `WP-A16` | STG44 modernised kitbash (CC0 base) | M (20) | planned | bpy, net | `WP-A10` |
| `WP-A17` | PPSh-41 modernised kitbash (licence verify) | M (20) | blocked | bpy, net | `WP-A10` |
| `WP-A18` | Bren and Chauchat: confirm sources only | XS (3) | blocked | owner, net | `WP-A10` |

### M5 · Production acceptance

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-Q1` | Accessibility audit across all demos (axe-core in CI, keyboard orbit, contrast, reduced motion) | M (20) | done | — | — |
| `WP-Q2` | Performance acceptance: desktop 60 fps and a mid-range phone 30 fps, cold/warm load, memory under repeated actions | M (20) | planned | — | — |
| `WP-Q3` | Credits page generated from the asset register; licence audit as a CI gate | S (8) | planned | — | `WP-F8` |
| `WP-Q4` | Short guided first run across demos (preset > part > stat; look > pose) | S (8) | done | — | — |
| `WP-Q5` | Release checklist and v1.0.0 tag for the 2026 demo | S (8) | planned | — | `WP-Q1`, `WP-Q2`, `WP-Q3` |
| `WP-Q6` | Manual accessibility pass: screen reader (NVDA/VoiceOver), zoom 200 %, high-contrast mode, a real phone | XS (3) | planned | owner | `WP-Q1` |

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
| `WP-D2` | Design doc expansion: core loop, progression, feature matrix, AI summary linking the earlier AI compendium | M (20) | planned | — | `WP-D1` |
| `WP-D3` | Faction insignia and flag set (Free State flag, patches, armbands) | M (20) | planned | — | `WP-D1` |
| `WP-D4` | Audio direction one-pager (music, foley, UI sounds, provenance rules) | S (8) | done | — | — |
| `WP-D5` | UI/UX style guide: the Nokia/DOS language across all demos | S (8) | done | — | — |

### H27 · 2027 horizon

| ID | Packet | Size | Status | Needs | Depends on |
|---|---|---|---|---|---|
| `WP-E1` | Environment demo A: source a CC0 low-poly ruin/barrier kit | S (8) | planned | net | — |
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
| Build | Allowlist build, link check, import-map check, size ≤ 90 MB, register audit |

A passing test certifies mechanics, never art quality.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Free sources for Spear, RPK, Bren, Chauchat do not exist | Register tracks them; owner decides pay / commission / placeholder; never silently substitute |
| Purchased-pack licence forbids public redistribution of the GLB | `WP-F8` asks the owner to confirm; raw sources are not in the repo; the GLB can be pulled and the demo reverted to a placeholder |
| Music rights | Same: register notes, owner confirms |
| Concept images are AI-assisted and reference commercial games | Documentary use only; credited; never shipped as assets |
| Plan limits change under us | Calibration loop; BU is relative; packets never exceed M |
| Rig fidelity (clipping, stiff hands) in close-ups | Hero distance only for now; poses are data and cheap to retune; `WP-C8/C9` |
| One-person bottleneck on art sign-off and downloads | Owner actions front-loaded in each milestone |
| Single large legacy file (`workbench/viewer.js`) | `WP-T1`, scheduled as filler work |
| Setting canon unresolved | `WP-D1` before more roster art |

## 9. Open decisions (owner)

1. **Setting canon** for demos: Yantis / WW2044 prologue, or the modern low-poly world? (`WP-D1`)
2. **Roster naming** from the keyframes (proposal in `art-direction.md` §4).
3. **Licences:** purchased pack redistribution; two music tracks; asset exceptions to CC0/CC BY (SIG Spear, G3A3).
4. **Indexing:** pages are `noindex` (link-only) like the portfolio's projects. Flip when Partisan Project should be discoverable.
5. **Budget calibration:** which plan meters to read, and the weekly window count, after the first two weeks.

## 10. Maintenance

On every change update the packet status, regenerate the table (`roadmap-table.mjs`), the code map, the register and
`CHANGELOG.md`. `npm test` fails if the roadmap table, the plan, or the register drift.
