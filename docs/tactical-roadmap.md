# Partisan Tactical: extraction roadmap

Updated 3 October 2026. Code initially reviewed at `3cc236b`, then reconciled with Claude’s `8f30cf1` on `main` in `VincentDN/partisan-project`.
This replaces the earlier tactical implementation order, preserves completed `WP-S1`–`WP-S4` plus Claude’s S20–S26 squad/progression plan, and expands
milestone **S** in [packets.json](agent-ops/packets.json). [Master roadmap](master-roadmap.md) remains the project index.
This is a plan, not a claim that the features below already exist. Packet status is authoritative for delivery.

## 1. Recommendation and scope

**Make the existing convoy into one complete, repeatable extraction raid before building the compound or cave.**
The strongest risk is spending the available hobby-project capacity on maps, models and sophisticated AI while the
player still has nothing meaningful to risk or bring home. The first success is a second deployment using a gun
stolen in the first, followed by a failed raid that actually loses the deployed equipment.

Retain PARTISAN's identity: an insurgent squad steals army equipment, denies communications, ambushes reinforcements
and brings supplies home. The existing no-shopping design stands. Do not copy a trader economy merely because
other extraction games have one. Browser Breakout and Wasteland: Extraction motivated the requested loop; their
advertised features are inspiration, not a tested quality benchmark or a specification to reproduce wholesale.

### Product defaults for this roadmap

| Decision | Proposed default | Boundary |
|---|---|---|
| Initial mode | Solo player switches between all rebels; others use AI, browser PvE | Online availability is not live multiplayer; co-op/PvP is a separate gate |
| First content | Existing convoy, one primary and one alternate extraction route | One map must prove the entire loop |
| Session | Aim for 8–12 minutes of active play; configurable 15-minute raid deadline | Initial tuning targets, not measurements; pause does not advance solo simulation time |
| Hardcore stakes | Deployed kit and carried loot are at risk; home stash is safe | No account wipe or character deletion on ordinary death |
| Squad | You, Mila, Dragan; fourth recruit after first campaign success | Reuse current squad orders; no mandatory squad permadeath |
| Injury | Downed companions miss the next completed raid; their unrecovered kit is lost | Persistent wounds follow in the survival milestone |
| Pause | Keep tactical pause for the local PvE demo | It is unavailable in future live multiplayer |
| Economy | Finite equipment, ammunition and supplies; recover through scavenging | No money, NPC shop, player market or paid progression in the first release |
| Collection | First successful extraction grants catalogue discovery | Discovery is not ownership of infinite physical copies |
| Persistence | Versioned local profile with atomic transactions and a storage adapter | Recommend IndexedDB; replaces the old localStorage-only plan; record choice in S29 |
| Presentation | Existing low-poly renderer and Nokia-green UI | No model overhaul, UE5 port or exporter on the critical path |
| Accessibility | Desktop keyboard/mouse first; touch follows core validation | Never claim mobile readiness from desktop tests alone |

Practice mode retains today's disposable sandbox, AI view and free restart. Campaign mode uses persistent rules.
Label them clearly and keep their saves separate. `?unlock=all`, appearance codes and practice loot must never
mint campaign items. These are implementation defaults; owner decisions can revise them without blocking this plan.

## 2. What the repository actually has

| Area | Evidence at the reviewed commit | Reuse / missing work |
|---|---|---|
| Simulation | `convoy/sim.js`: seeded PRNG, 60 Hz step, pure JS, no renderer dependency | Good foundation; no serializable PRNG state or campaign boundary yet |
| Combat | `convoy/weapons.js`, `Sim.shoot/startReload/damage`: six weapon profiles, suppression, explosives, vehicles | Rifle/MG reserves default to Infinity; reload refills a magazine; no persistent physical ammunition |
| Levels | `convoy/levels/index.js`, `convoy/levels/convoy.js` | Only convoy is built; compound/cave are disabled placeholders |
| Objectives | `convoy/objectives.js`: seven checks, optional goals, prerequisites, won/lost outcome | Convoy wins on eliminate/rout; extraction is an instant all-living-squad zone check |
| Interaction | `Sim.interact`, `items`, `taken` | Timed pickup of scripted objective items, not transferable body/cargo inventory |
| Squad | `Sim.order`, `convoy/ai.js`, `convoy/game.js` | Follow/hold/move/attack/cover, Tab selection, Space pause; preserve these controls |
| Enemy AI | `convoy/ai.js`: perception, beliefs, suppression, searching, retreat, patrols, radio QRF, bounding | Extend existing behaviours; do not budget search/retreat as entirely new systems |
| UI/lifecycle | `convoy/game.js`: briefing, mission select, debrief, restart, hidden-tab pause | `newGame()` resets the run; no loadout reservation, durable settlement or campaign flow |
| Shared customisers | `shared/loadout.js`, `workbench/stats.js`, `rails.js`, `attachments.js`, `operator/config.js` | P1 codes represent builds/appearance, not ownership; tactical `ak` differs from catalogue `ak74m` |
| Architecture debt | `game.js` 790 lines, `sim.js` 635, `ai.js` 558 | Separate new responsibilities; staged extraction instead of a whole-app rewrite |
| Tests | `tests/convoy.test.mjs`, `tests/tactical.test.mjs` | Geometry, replay, objectives, orders and S4 behaviours; no persisted extraction or inventory tests |
| Delivery | `tools/build-site.mjs`, `.github/workflows/pages.yml` | Static Pages frontend, relative URLs, vendored Three.js; no authoritative game service |

The latest handoff was stale relative to `main`; the completed packet data and inspected code take precedence.
Claude’s latest merge adds design decisions and planned squad/progression packets, not runtime changes. No runtime inventory, campaign save, real multiplayer, injury system or second map was found in the tactical module.
The existing `tsconfig.json` does not include `convoy/`; add new pure modules to type-check coverage incrementally.

## 3. The playable loop and loss rules

1. **Safehouse:** inspect stash and squad; equip owned instances, compatible magazines, ammunition and supplies.
2. **Briefing:** select mission, see known threats, exits, deadline and optional objectives; review the exact kit at risk.
3. **Deploy:** commit a unique raid ID and remove deployed items from the available home stash before starting simulation.
4. **Raid:** scout, ambush, search bodies/cargo, redistribute finite equipment, and decide whether to press on.
5. **Extract:** reach an eligible zone, gather the squad or explicitly abandon stragglers, then survive a countdown.
6. **Debrief:** resolve a single immutable result, show recovered/lost kit and objective outcome, then commit it once.
7. **Prepare again:** restore only recovered items to stash; retain remaining rounds and consumed supplies; change the next loadout.

### Raid and objective outcomes are separate

Killing every defender must not end an extraction raid. Mission objectives can be fulfilled, incomplete or failed
while the player still has an opportunity to escape. Preserve the old `won/lost` behaviour in practice fixtures;
introduce an extraction-mode result rather than silently changing every existing objective test.

| Event | Raid result | Equipment and progression |
|---|---|---|
| Extract with contract complete | Extracted, contract complete | Return carried owned/looted items once; grant discoveries and mission progress |
| Extract early | Extracted, contract incomplete | Keep what was carried out; no contract completion reward; allow retry |
| Active rebel dies | Switch to a surviving rebel | Downed rebel’s kit remains recoverable; other squad members keep fighting |
| Every rebel is down | Killed | Lose all still-deployed squad kit and unsecured loot; stash remains unchanged |
| Deadline expires | Missing in action | Same gear loss as death; explicit deadline HUD and warnings |
| Explicit abandon / campaign restart | Abandoned | Confirm the loss and settle it; never call a free reset over an active campaign raid |
| Companion is downed | Raid continues | Gear stays on the body; recover it normally; companion misses the next completed raid |
| Healthy companion left behind | Extracted with abandonment | Confirmation required; their kit is lost and they are unavailable for the next completed raid |
| Home stash is empty | Campaign continues | A restricted recovery raid with a minimum loaner kit; no reset required |
| Storage fails | Unsettled locally | Show retry/export/recovery controls; do not display a successful bank or start another raid |

Companion unavailability counts completed, settled raids, not visits to the mission menu. A recovery raid may be
played without companions so multiple wounds cannot deadlock progression. A downed body has one inventory; recovery
and extraction cannot duplicate it. Rescue/revive mechanics are later additions, not implied by this first rule set.

### Extraction rules (S30)

- Start with a proposed 10-second continuous countdown. Leaving the zone cancels progress; all required living squad
  members must remain present. Permit deliberate abandonment through an explicit UI action. Downed units never count
  as automatically extracted. Damage does not reset the timer; all-down still loses the raid.
- Process combat and all-down loss before completion on the same simulation tick. If the deadline is reached, fail before
  granting extraction. Freeze the settled simulation to prevent a late kill or pickup changing the result.
- One safe-but-long exit and one exposed-but-short exit make retreat a decision. Both must be reachable from valid
  spawns; exits cannot require eliminating the entire map or completing the main objective.
- Extraction availability, radius, duration and deadline are level data. The UI shows why an exit is unavailable.
- Initial extraction is whole-party settlement, not separately banked teammates. Split-party banking is deferred.

### Inventory rules (S8/S9/S11)

Use stable item definitions plus unique item instances. Every instance has exactly one owner/container: stash,
character slot, magazine, body, cargo or world drop. Attachments remain associated with their weapon on transfer.
Ammo definitions specify compatibility; magazines retain remaining rounds, and reload exchanges actual magazines.
Rockets/grenades are finite items. Do not count a spare magazine as a loose round or recreate ammo on weapon swap.
Field repacking/attachment fitting, if enabled later, needs a timed vulnerable action; initial fitting happens at home.

Start with a list/slot inventory, a hard capacity and a clearly displayed carry mass. Add movement penalties only
when the basic economy is tested; defer a rotating grid/Tetris interface. Transfers validate range, line of sight,
capacity and ownership in the simulation, not just in UI. Search continues the fight, breaks on movement/release,
and reveals contents only when complete. Dying during search does not grant the item.

The mounted DShK is not automatically a carryable primary. Initial cargo may provide ammunition/supplies; salvaging
an emplacement is deferred until a transport rule exists. Destroyed vehicles can lose designated cargo, communicated
before the player chooses explosives. Define this in the loot table and use a seeded roll once per container.

## 4. Proposed code boundaries and persistence contract

Paths below are proposed files unless already identified in section 2. Keep the static build, pure simulation and
relative imports. Reuse customiser compatibility data through explicit adapters; do not import renderer-heavy model
factories into headless inventory code. Keep extracted modules below roughly 300 lines where practical.

| Location | Responsibility |
|---|---|
| `convoy/sim.js`, extracted `combat.js`, `squad.js` | Step orchestration and combat/AI adapters; domain state has no DOM/storage calls |
| `convoy/game.js`, extracted `render.js`, `input.js`, `hud.js` | Rendering, controls, lifecycle wiring; reads simulation state and submits commands |
| `convoy/items.js`, `inventory.js`, `loot.js` | Definitions/ID mapping, ownership and transfer rules, seeded container contents |
| `convoy/raid.js`, `extraction.js` | Raid lifecycle and countdown; objective completion is not settlement |
| `convoy/campaign.js`, `save.js` | Profile, roster, progression, local persistence and migrations |
| `convoy/inventory-ui.js`, `safehouse-ui.js` | Accessible field search and between-raid equipment screens |
| `shared/unlocks.js`, proposed catalogue adapter | Read collection discoveries in both customisers; separate display access from owned kit |
| `tools/ai/bench.mjs` | Seeded headless scenarios and machine-readable metrics, no rendering dependency |
| `tests/` | Pure domain tests plus browser journey coverage in `tests/e2e/` |

### Profile envelope

Proposed fields: `schemaVersion`, `contentVersion`, `revision`, `profileId`, `stash`, `roster`, `discoveries`,
`campaignProgress`, `activeRaid`, bounded `settlementLedger`, and `settings`. Instance IDs, definition IDs and
container references must be validated together. Unknown future schemas are rejected with export/recovery, never
silently overwritten. Older schemas migrate on a copy with a backup and fixture tests. Existing P1 appearance/loadout
codes remain compatible but are never imported as inventory ownership.

`activeRaid` contains `raidId`, seed, mission/content version, deployed instance IDs and reservation state. A future
resume checkpoint additionally needs simulation tick, PRNG state, units, ammo, loot, objectives, in-flight AI messages,
reinforcement state and extraction progress; dumping the current circular Sim object to JSON is not sufficient.

## Graphics

The shooter is moving from 3-D to RimWorld-style 2.5-D sprites, and the campaign map gets a retro island look. See [graphics-roadmap.md](graphics-roadmap.md); it runs in parallel with everything above.

## Risks

### Transaction invariants (S29)

- Deploy is one durable reservation. If the write fails, the raid does not start. Two tabs cannot deploy the same kit.
- Settlement applies only to that active raid ID and expected profile revision. Repeated clicks, reloads, callbacks
  or retrying a completed result return the same settlement rather than crediting it again.
- Stash, discoveries, roster and the settlement record update in one transaction. No reward is visible before commit.
- Limit concurrent writers with a tested per-profile ownership mechanism; stale tabs become read-only. Atomic revision
  checks remain necessary even with a UI lock. Test simultaneous tabs and interrupted ownership transfer.
- Recommendation: IndexedDB transactions behind `save.js`. The earlier roadmap named localStorage; document the change
  in an ADR, and inspect/migrate a legacy `parp-tactical-v1` key only if it exists. No evidence of such a live tactical
  save was found at the reviewed commit. Local storage is still editable by its owner; this is not anti-cheat.

### Browser interruption policy (first release)

Hidden tab: pause local simulation, clear held inputs, and require an explicit resume on return. Full reload, tab close
or crash: an already durable active raid is recovered as **abandoned**, with loss shown on next open. Explain this
before deployment. Do not rely on an unload handler to persist loss; reservation already removed the gear. This is a
strict first-release policy, not crash-safe mid-raid resume. A later checkpoint/resume feature must preserve PRNG and
content versions and prove there is no duplicate settlement. Practice remains freely restartable.

If a browser cannot store the profile, offer clearly labelled non-persistent practice. Keep a backup/export path;
imports validate schema and are unavailable while a raid is active. Local exports must never become trusted inputs
for a future online economy.

## 5. Delivery sequence and release gates

Budgets use the repository's existing XS=3, S=8, M=20 BU convention. They are relative planning estimates, not hours,
tokens, subscription guarantees or a release date. Full packet dependencies, inputs and acceptance live in packets.json.
Work sequentially on one branch at a time. Refine a future packet before starting it if its implementation exceeds M.

| Gate | Work packages | User-visible result / exit evidence |
|---|---|---|
| G0: squad control and baseline | S20, S21, S28, S16 | Existing convoy still behaves the same; seeded harness reports baseline and stuck agents |
| G1: first extraction loop | S8, S29, S9, S10, S11, S30, S12, S34, S35 | Deploy finite kit, loot a body/cargo, survive timed extraction, reload, equip recovered gear and redeploy; death loses it |
| G2: replayable hardcore PvE | S31, S32, S33, S15 | Injuries/supplies, readable detection, multiple routes, useful repeat raids, recovery economy; tension without opaque deaths |
| G3: campaign, progression and collection | S5, S6, S7, S13, S14, S22–S26 | Compound and cave reuse the loop; recovered gear appears in customisers; no free inventory from gallery unlocks |
| G4: browser release candidate | S18, S17, S19 | Touch/accessibility, performance, end-to-end campaign regression and accurate player documentation |
| G5: optional live multiplayer | S36–S42 | Explicit decision first, then authoritative co-op; PvP only after measured network and security gates |

### Existing packets retained and refined

| Packet | Change in this roadmap |
|---|---|
| S1–S4 | Remain done. Level/objective/order/AI foundations are reused. Extraction completion is extended separately in S30 |
| S8 | Item instances, ownership, capacity and pure schema/serialization. Persistence transaction work moves to S29 |
| S9 | Real bodies and cargo, one-time seeded contents, interrupted search and teammate loot order |
| S10 | Finite stash/loadout and field UI; preserve Tab for squad selection; use I for inventory and E for interaction |
| S11 | Player and AI consume actual kit, partial magazines and compatible ammo. Enlarge to M; no UI dependency needed for core tests |
| S12 | Campaign controller, briefing/debrief, raid results, wounds/recruit and save wiring. Enlarge to M |
| S5/S6 | Follow the first-loop gate. Compound requires real loot; cave adds a timed withdrawal exit if defence fails |
| S7 | Follow both maps; one contact sheet, performance measurement, reduced-motion support |
| S13/S14 | Extraction grants catalogue discovery; physical possession still gates campaign equipment; gallery bypass is isolated |
| S15 | Add body discovery, structured search and morale/surrender on top of current belief/search/retreat logic |
| S16 | Start immediately with baseline convoy; report extraction and net supplies later, not only kill/win rate |
| S17/S18/S19 | Full regression and mobile acceptance after loop and maps exist; final docs follow implementation |

### Claude’s merged squad and progression work (preserved)

WP-S20 makes `sim.player` an alias for the controlled rebel; every rebel retains health, weapons, ammunition and orders.
Only all-down loses the squad (or a required protection failure in practice). WP-S21 adds Q to choose a rebel through
slow motion and squad framing, with keyboard/touch/reduced-motion paths. These precede inventory and new levels.
WP-S22–S26 add per-rebel XP, levels, equipment-gated Bannerlord-style branches, perks/abilities, AI use and rebel sheets.
They follow campaign/inventory; do not discard them or reuse their packet IDs. See
[G-squad-play](design-decisions/G-squad-play.md) and [H-progression](design-decisions/H-progression.md).

The extraction design refines earlier planned defaults in [I-extraction](design-decisions/I-extraction.md).
The original hero dying is no longer an automatic raid loss. Earned XP is attributed to the actor, with the exact
banking/loss rules recorded in S22 before rewards are persisted; client retries must not duplicate XP or perk points.

### New packets

| Packet | Size | Deliverable / acceptance |
|---|---|---|
| S27 | S | This roadmap and synchronized packet graph, master index and handoff; documentation only |
| S28 | M | Stage module extraction and practice/campaign seams; same seeded combat replay and same practice controls |
| S29 | M | Profile persistence, deploy reservation, migration and idempotent settlement; fault injection and two-tab ownership tests |
| S30 | M | Timed extraction and independent mission/raid outcomes; all-down/deadline/abandonment priority and partial success tests |
| S31 | M | One bleeding state, limited bandages/medkits, timed treatment, simple armour mitigation and persistent squad wounds |
| S32 | M | Reachable loot/exits, reliable squad navigation, normal-play visibility rules, readable danger and extraction indicators |
| S33 | M | Repeatable raid variants, recovery kit rules and finite supplies economy; useful progression without infinite farming |
| S34 | S | Reload/close/hidden-tab, input clearing, storage-error/retry and backup/import journeys implemented and tested |
| S35 | S | Convoy vertical-slice acceptance: extract/reload/redeploy/die, loss and duplication checks, small human playtest report |
| S36 | XS | Owner gate: remain local PvE or fund live co-op/PvP; record hosting, concurrency and operating-cost limits |
| S37 | M | Conditional server simulation spike: protocol, authoritative tick, headless compatibility and latency benchmark |
| S38 | M | Conditional online identity and profile store: server transactions, authentication, duplicate-request tests |
| S39 | M | Conditional 2–4-player co-op: lobbies, loadouts, replication, reconnect and per-player ownership/extraction rules |
| S40 | M | Conditional online abuse/operations gate: rate limits, visibility-filtered state, monitoring, restore and load test |
| S41 | XS | Owner gate: approve PvP after co-op results, retention and operating costs are recorded |
| S42 | M | Conditional small closed PvPvE experiment; no public launch until fairness, exploit and population checks pass |

S36 and S41 are blocked owner gates. Their dependent packets cannot be selected until the gate is explicitly resolved.
The online packets are bounded feasibility/closed-test work, not a complete commercial multiplayer release estimate.
If multiplayer is declined, keep that track blocked; it must not prevent the local browser release.

## 6. Mechanics after the first loop

### Survival, fairness and navigation

S31 adds a single understandable bleeding state and a small set of medical supplies, with treatment interruption and
ammo/medical expenditure visible in debrief. Avoid hunger/thirst, detailed limb surgery, complex penetration tables,
weapon jamming or many crafting materials until short raids show a reason to need them. For armour, use a small
explicit mitigation model with wear and testable bounds; avoid unexplained damage immunity or sponge enemies.

S32 must test squad pathing around the compound and cave, narrow passages, occupied exits and unreachable loot.
Current sliding collision is not proof of navigation around walls. Add a small navigation representation derived from
level data if needed, with stuck detection and bounded recovery; never teleport characters through cover to finish a raid.

Normal play should reveal enemies through squad sight/contact information, with last-known markers distinguished
from live knowledge. Keep the existing omniscient AI debug display in practice/diagnostic sessions. Audio/callouts,
cover silhouettes and extraction prompts should explain threats; do not hide essential warnings solely in colour or sound.
Prevent enemy reinforcements spawning in the player's visible area or directly at an extraction point.

### Repeat raids and economy

S33 varies patrols, cargo and secondary objectives using the seeded RNG while maintaining authored routes and cover.
A primary objective might be supplies, a radio component or a specialist weapon; incidental loot should still make an
early retreat worthwhile. First deploy uses a fixed starter stash exactly once per new profile. Subsequent loadouts
must never be replenished automatically.

Define recovery gear as a non-bankable loaner: it cannot be moved into stash, stripped for parts or multiplied by
repeated deployments. Loot recovered on that run is normal gear. Admit recovery raids only under a documented
insufficient-loadout rule. Stash-full extraction must go to an overflow resolution screen; never silently destroy
legitimate rewards or add them twice. Ammunition, treatment and optional repair/camp supply projects are sinks;
no trader or auction house is needed. Future supply projects must use idempotent spends and remain optional.

Measure surplus ammunition/medical supplies, useful loot per minute, gear lost, recovery-raid frequency and stash
saturation over repeated runs. Do not tune with price inflation when there is no money economy. First checkpoint:
players should face at least one meaningful continue-versus-extract decision per raid.

### Campaign content and customisers

- **Convoy:** disable/distract the escort, seize transport supplies, withdraw before pressure escalates. Full elimination
  is optional. Preserve the old ambush as practice. A minimum viable route must not require rare anti-armour gear.
- **Compound:** scout two ingress routes, avoid or disable alarm communications, raid armoury cargo, choose an exit.
  `destroy` currently targets vehicles; explicitly add destructible static mission targets for the radio mast, or use
  a documented typed target adapter. Do not pretend the mast or reinforcement truck is already implemented.
- **Cave:** prepare squad positions, survive authored waves and withdraw with carried supplies if overrun. Do not wipe
  the off-map stash on failure. Waves need a timed level-data scheduler; existing bounding groups alone are not a scheduler.
- **Collection:** map tactical IDs to catalogue IDs explicitly. Not every tactical weapon has a corresponding rendered
  Workbench model. Mark unavailable previews honestly; do not block the playable loop on importing the full weapon roster.
  A discovered attachment can remain visible after its last physical copy is lost, but cannot be equipped in a campaign
  loadout without a compatible owned instance.

## 7. Live multiplayer boundary

There is no backend in the current tactical module. GitHub Pages can remain the frontend, but persistent multiplayer
requires a separate authenticated service and authoritative simulation. Do not expose current debug hooks or trust
client-supplied kills, positions, random seeds, item grants or extraction results as server facts.

S36 records desired mode, region, expected concurrency, monthly cost cap and who operates incidents. S37 benchmarks
whether the pure Sim can run under a server tick budget; no provider or networking library is preselected here.
Keep item/raid commands transport-neutral now, but do not build speculative networking into G1.

Co-op needs server-owned RNG and time, validated movement/fire/loot requests, versioned protocol and content, lobby
ownership, client interpolation/prediction as needed, and reconnect grace rules. Decide whether an absent player
remains vulnerable and how disconnected bodies/gear settle. Pause and tab-hiding cannot stop a live raid. Party AI,
shared loot and per-player extraction need explicit ownership rules before implementation.

S40 validates concurrent loot claims, duplicate settlement requests, disconnect during extraction, crashed server
recovery, old clients and fabricated inventory. It also supplies logs/metrics, backup restoration, rate limits and
cost per active raid. Only transmit enemy state the player is entitled to know; merely hiding meshes is insufficient.
Local saves and `?unlock=all` never carry equipment into the online profile.

S41 requires a recorded decision before PvP. A small player population, latency, exploits and gear disparity can make
PvP worse than a good PvE game. The failure condition is inability to offer fair populated raids within the agreed
operating budget. If that happens, keep co-op/PvE and stop the competitive track.

## 8. Acceptance, measurement and rollout

| Risk | Required evidence before its gate closes |
|---|---|
| Regression in current shooter | Existing convoy/tactical tests and deterministic practice replay remain green after each structural change |
| Item duplication or deletion | Generated transfer sequences preserve ownership/counts; deploy/settle retries, death while looting, two tabs, full stash and interrupted writes |
| Fake extraction | No bank on objective completion alone; timer cancellation, dead squad members, abandonment, simultaneous lethal damage/deadline and extraction |
| Ammunition creation | Partial-mag reload, swap/cancel, empty reserves, AI consumption, compatible ammo, repeated deploy/return preserve counts |
| Save corruption | Fixtures for each schema, unknown future version, invalid IDs, failed storage, same-raid retry and backup restore |
| Lifecycle loopholes | Restart, menu navigation, frame navigation, refresh, hidden tab, repeated Enter, held inputs after focus loss; all settle under the stated policy |
| Unreachable content | Reachable spawn/loot/exits over a fixed seed corpus; stuck-unit diagnostics and deadlines bound the run |
| UI exclusion | Click/keyboard equip; focus returns after inventory/debrief; readable capacity/errors; axe plus manual keyboard and 200% zoom |
| Artificially easy economy | Multi-raid scenarios track net ammo/medicine, recovered/lost gear and recovery frequency; tuning values committed |
| Misleading unlocks | Extract once then view in both customisers; loss keeps discovery but removes possession; practice/URL bypass cannot alter campaign |
| Performance regression | Record device, resolution, browser, p50/p95 frame time, simulation cost, draw calls, entity count, heap trend and load time |

Proposed performance targets: 60 fps desktop, 30 fps mid-range phone, first meaningful render under 3 seconds on the
repository's broadband target, site under 90 MB, CI under 10 minutes. These are targets to measure, not current claims.
Cap live enemies, containers and effects using measured results. Check a repeated ten-raid session for resource growth;
`newGame()` currently removes scene objects, so disposal of GPU resources must be verified when lifecycle code changes.

Headless scripts: cautious scavenger, objective-focused, aggressive and retreat-early. Use fixed seeds in CI and a larger
recorded corpus for tuning. The older 40–70% scripted win-rate goal is diagnostic only; report extraction separately
from contract success. Script success cannot certify enjoyable play. Initial human gate: 3–5 testers can deploy,
identify an exit, extract and understand a loss without coaching; record confusing moments and reasons to redeploy.
If the convoy does not produce meaningful risk/reward, change it before funding maps or multiplayer.

Implementation workflow: branch per packet; run relevant unit/browser checks plus `npm test`, `npm run build` and
`npm run check`; apply lint/type checks to affected code, keep packet tables synchronized and write a handoff.
Keep practice fixtures for baseline comparisons while new campaign tests encode deliberately different outcomes.
Publish the local PvE release only after the release checklist; this roadmap change itself does not deploy gameplay.

## 9. Immediate next work and deferred decisions

Checkpoint: **WP-S20 is built and unit-tested**. The **WP-S21 interface is implemented but verification is unfinished**.
Resume with normal-motion pointer, visual and accessibility checks for S21. Reduced-motion browser checks already passed.
Then **WP-S28** (module boundaries), **WP-S16** (measurement), **WP-S8** (inventory) and **WP-S29** (save transactions).
See [the session handoff](agent-ops/STATE.md) for exact commands and remaining checks.
The next visible review should be one convoy raid with finite starting equipment, a recoverable weapon, a countdown
exit and a saved second deployment. It should not be another map-only demo.

Owner decisions that can wait: live PvP versus co-op (S36/S41), permanent companion death, secure-container/insurance
rules, hunger/thirst, a trader economy, a shared-world campaign and UE5 integration. Default them out of the first loop.
Preserve setting canon decisions in WP-D1 separately; no new faction art is required to validate extraction.

No calendar completion promise: after S20/S21/S28/S8/S29, recalibrate packet sizes using actual work and blockers. A solo
operator should finish one gate before opening the next. The generated master table reports current totals; it does
not establish that the remaining work fits a particular number of subscription windows.
