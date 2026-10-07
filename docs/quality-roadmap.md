# Bug hunt and optimisation roadmap

A deep pass over the whole project for bugs, slowness and fragility, measured first and fixed against numbers. Work
packets `WP-QA1`–`WP-QA19` in [packets.json](agent-ops/packets.json) (milestone `QA`); this page is the reasoning,
the baseline and the order. Rule for every packet: **measure, change, measure again**, and leave a test or a budget
behind so the bug or the slowness cannot come back unnoticed.

## 1. Baseline (2026-10-07, branch at `baf59ba`)

Measured in this container: Node 22, headless Chromium 141 with software rendering (about one frame a second for
WebGL, so browser frame times are pessimistic; Canvas 2D is CPU either way). Scripts are in §6.

### Simulation (Partisan Tactical, `convoy/sim.js`), 2 minutes per level, Hard, the player firing

| Level | Units | ms per step, mean | worst step | ammo + banter, mean |
|---|---|---|---|---|
| convoy | 13 | 0.086 | 10.7 | 0.031 |
| compound | 16 | 0.139 | **27.1** | 0.019 |
| cave | 14 | 0.017 | 2.4 | 0.009 |
| forest-road | 13 | 0.090 | 15.2 | 0.016 |
| checkpoint | 10 | 0.027 | 2.9 | 0.010 |
| village | 11 | 0.042 | 4.7 | 0.010 |
| hilltop | 13 | 0.020 | 2.4 | 0.005 |

The mean is fine (a 60 Hz frame has 16.7 ms). The **spikes** are not: a 27 ms step drops two frames, and they come
in clusters when a fight starts (alarm, dismount, everyone re-planning cover). CPU profile of the same runs:

| Share | Where |
|---|---|
| 14.9 % | garbage collection: allocation churn per step |
| 12.1 % | `segmentBox` (sim.js:24): every ray against every box |
| 11.0 % | `step` body |
| 13.5 % | `blocked` + `slide` (sim.js:753–755): movement collision |
| 5.6 % | `armyAct` (ai.js) |
| 3.1 % | `boxes()` (sim.js:305): rebuilt on every call, though only vehicles move |

### Pages: cold load in the test browser

| Page | Ready | Requests | Bytes | Heap | Heaviest |
|---|---|---|---|---|---|
| `convoy/` | 2.1 s | 127 | **16.7 MB** | 14 MB | eight terrain PNGs from `inbound/` placeholders, 0.4–2.2 MB each (13 MB); `wiki/data/items.json` 2.15 MB |
| `map/` | 3.3 s | 95 | 5.8 MB | 43 MB | three.js 0.7 MB, four terrain JPEGs 0.7–0.8 MB, Recon GLB 1.1 MB |
| `inventory/` | 0.3 s | 12 | 2.2 MB | 10 MB | `items.json` |
| `band/` | 0.5 s | 62 | 0.5 MB | 16 MB | — |
| `menu/` | 2.8 s | 24 | 0.9 MB | 21 MB | three.js |

- Building the inventory catalogue from `items.json` (4,234 items) takes **0.7 s** in Node, on the main thread
  before a mission can start. The inventory uses a few hundred of them.
- The Partisan Tactical draw call (Canvas 2D): median 8.9 ms, **p95 34 ms** per frame in the test browser.
- The published site is **281 MB** (`_site/`).

### Code shape

Bugs live in big files. Over the project's 300-line rule: `convoy/sprite-render.js` 1,404 lines,
`convoy/soundscape.js` 978, `convoy/sim.js` 964, `operator/operator.js` 794, `workbench/attachments.js` 765,
`workbench/viewer.js` 759, `convoy/sprite-game.js` 743, `band/troops.js` 741, `operator/config.js` 634,
`workbench/rifles-extra.js` 629, `convoy/ai.js` 586, `assets/js/previews.js` 562, `workbench/mech.js` 489.

### Tests

334 unit tests, 13 browser suites, axe-core accessibility, all green. **22 fixed sleeps** (`waitForTimeout`) remain in
12 browser suites; three of them caused the last three false alarms. The full browser run takes over an hour here.

### Campaign save

A campaign with three kitted fighters, 20 items in the armoury and a full 200-entry log is 32 KB (localStorage
allows about 5 MB). Size is not a risk; corruption, two open tabs and a crash mid-settle are (§3, QA4).

## 2. Found and fixed in the survey

A fuzz run of 84 randomised fights (every level × 12 seeds × random conditions and difficulty; random movement,
fire, grenades, weapon switches, orders, abilities and loot orders; invariants checked every step: finite positions
and health, inside the map, no overheal, no negative ammunition, kit and counters agreeing, no item in two places)
found no crashes and no broken invariants, except one. That and a read of the inventory screen gave three fixes
(`baf59ba`):

1. A column still driving in from beyond the map edge dismounted **outside the map** when ambushed early
   (forest-road: the truck crew at x = −76 with the edge at −70). They now step out inside it.
2. A magazine dropped during a reload (no room in the rig) made a ground pile with **no label**: the hint read
   "Hold E to search undefined".
3. A **cancelled drag** (a touch interrupted by the system, `pointercancel`) left the item carried and the drag's
   listeners on the window. It now puts the item back.

### Found by the hunts (QA4, QA5, QA7)

4. **The map stopped reporting results after about 80 encounters** (QA7 soak). The map remembered how far it had
   read the campaign log as a position in it, but the log keeps only its last 200 entries: once full, every new
   entry pushed one out and the position never moved past the end. Won fights no longer took enemy parties off the
   map and raids no longer took settlements. Log entries now carry a sequence number that only grows; old saves are
   numbered on load and read on from where they were.
5. **A failed catalogue download disabled the kit screen** until the page was reloaded (the rejected promise was
   cached). It now tries again on the next open and says why it could not.
6. **A save that could not be written was silent** (storage full, or blocked in private mode). The map now says so
   once.

The inventory hunt (9,000 random operations) and the save hunt (2,500 damaged saves: 2,472 repaired into usable
campaigns, 28 refused and kept aside) found nothing else.

### Static checks (QA19)

`node tools/qa/unused.mjs` reports exports no other file mentions: 52, nearly all used inside their own module; three
were dead outright and are gone (`CAMO_PATTERNS` in shared/camo.js, `LOOP_SECONDS` in shared/music.js,
`savedLoadout` in workbench/apply-loadout.js, with the imports only it used). No file is unreferenced. Strict
type-checking of `shared/` pulls in the mission modules and reports 161 errors, nearly all inference from untyped
`null` initialisers; the two that looked like bugs (a `'dusk'` comparison, a string compared with a number) are
the same inference and not bugs. Typing them is its own packet, QA20.

## 3. Where bugs are likely: hunts

Ranked by (how likely × how bad), with the method for each.

| Packet | Area | Why suspect | Method |
|---|---|---|---|
| QA4 | Campaign save | One save holds everything; written from two pages; settle must apply once | Property-based fuzz of `normalize`/`migrate` (garbage, truncated JSON, old shapes); two tabs (`storage` event); a crash between `writeResult` and `settle`; quota exceeded |
| QA5 | Inventory | Rounds must never be created or lost; items in one place only | Random operation sequences (move, turn, split, merge, load, unload, reload, fire, loot, eject, use) with conservation and ownership checked after each; a random-drag browser test |
| QA6 | Sim and AI | Long fights are rarely tested | 10-minute soaks per level and variant: stuck units, units inside cover, objectives that cannot complete, outcome never reached |
| QA7 | Campaign loop | 30 encounters in a row are never tested | Pure-module soak: deploy, result, settle, clock, healing, parties, settlements, with invariants |
| QA8 | Input and focus | Four overlays now stack (encounter, band, kit, search) | Keyboard-only walk of every overlay; Escape order; focus restore; held keys through blur and overlays; touch |
| QA9 | Other browsers | Only Chromium is tested | Firefox and WebKit smoke (Canvas `roundRect`, audio unlock, pointer events) |
| QA10 | Memory | Restarts, overlays and map↔mission trips allocate | 50 restarts, 100 inventory open/close, 10 map↔mission trips; heap snapshots; window listener counts; three.js disposal |

## 4. Where time goes: optimisation

| Packet | Target | Now | Budget after |
|---|---|---|---|
| QA11 | Sim hot path: static boxes cached per level (only vehicles move), a spatial grid for rays and movement, no per-step allocation | worst step 27 ms, GC 15 % | worst step < 4 ms on every level, GC < 5 %, mean −40 % |
| QA12 | Inventory catalogue: a compact build with only the kinds the inventory uses | 2.15 MB, 0.7 s | < 200 KB, < 50 ms |
| QA13 | Assets: mission terrain at the size it is drawn, WebP; the site trimmed to what pages load | `convoy/` 16.7 MB; site 281 MB | `convoy/` < 4 MB; site < 120 MB |
| QA14 | Mission renderer: fog of war (360 rays per rebel per frame) at a lower rate or incremental; static layers cached | draw p95 34 ms (software) | p95 < 12 ms (software), 60 fps on a 2020 laptop |
| QA15 | Map: 3-D figures loaded only when drawn (not in the 2.5-D map); texture sizes; draw calls | 5.8 MB, 43 MB heap | < 4 MB, < 35 MB heap |
| QA16 | Test suite: no fixed sleeps; suites in parallel | 22 sleeps; > 1 h here | 0 sleeps; CI browser run < 20 min |

`WP-Q2` (60 fps desktop, 30 fps mid-range phone) stays the acceptance for the whole: QA11–QA15 are how it is met.

## 5. Order

1. **Instruments first**: QA18 golden replays (same seed and inputs, same debrief: proves an optimisation changed
   nothing), QA1 the fuzz harness in the repo, QA2 perf budgets, QA3 every browser suite fails on a console error.
2. **Hunts**: QA4, QA5, QA6, QA7, then QA8–QA10.
3. **Optimise** behind the golden replays: QA11, QA12, QA13, then QA14–QA16.
4. **Structure**: QA17 splits the oversized modules along their seams once replays guard them; QA19 static checks.

## 6. Reproducing the numbers

The survey scripts become packets QA1 and QA2 (`tests/fuzz/`, `tools/perf/`); until then:

- Sim: step every level for 120 s with `new Sim({level, seed: 3, difficulty: 'hard'})`, the player firing at the
  nearest soldier, timing `sim.step` with `performance.now()`; profile with `node --cpu-prof`.
- Pages: Playwright, count response bytes from a reload until the page's `PARP_*` object is ready; read
  `performance.memory`.
- Renderer: wrap `PARP_SPRITES.renderer.draw` and time it for 8 s of a running mission.
