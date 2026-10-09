# PARTISAN campaign: playable loop and vertical-slice roadmap

Revised 8 October 2026 against the current source, including Claude's tactical, inventory and quality work and the
campaign integration on main. This document defines the vertical slice and distinguishes implemented rules from
release acceptance still to be demonstrated. [Master roadmap](master-roadmap.md) indexes the other tracks;
[packets.json](agent-ops/packets.json) retains their full acceptance criteria. A partial implementation does not close a packet.

## 1. The experience

PARTISAN is a resistance campaign on an occupied Mediterranean island. The player leads a named band, chooses
where and when to strike, fights a tactical mission, brings people and equipment home, and uses those gains to
prepare the next operation. Terrain, travel time, wounds, ammunition and enemy pressure should make each choice
matter. The intended loop is **reconnoitre → travel → choose a fight → deploy → fight and extract → account for
losses and spoils → recover, equip and promote → change the occupation → choose the next fight**.

The campaign uses the **2.5D island map**: sprite people and 3D convoy vehicles on the terrain, a long camera lens and restrained depth
and lighting effects. `map/` is the normal map; campaign links use `map/?campaign`. The old fully 3D presentation
is `map/3d.html`, accessible under Dev tools as a demo. Old `map25/` links redirect while preserving their query
and fragment. The tactical game keeps its established sprite renderer. These are complementary views of one
campaign, not competing choices the player must configure.

A comprehensive vertical slice must demonstrate this entire chain in a bounded operation. It does not require
an entire island's worth of content, every class, or finished strategic AI. It does require the same people,
items, consequences and save state to survive every transition, and a clear beginning, setback and conclusion.

### Faction appearance backlog

Occupiers and insurgents must read as different factions through headgear, face covering, clothing and silhouette,
including at normal tactical zoom and on overworld party tokens.

- **Occupiers:** olive-drab army clothing and equipment; army helmets and covered faces wherever the available art supports them. Missing compatible helmet or face-covering assets are explicit art backlog items.
- **Default insurgents:** varied civilian clothing and distinctive hood/shemagh silhouettes, with face coverings supplied only by hoods or shemaghs. Never use army helmets for the default insurgent appearance. Clothing and equipment differences must go beyond a faction colour swap.
- Apply the same direction to tactical paper dolls, overworld people and future owned-equipment/operator appearances. Preserve class and role readability within each faction.
- Acceptance: mixed-faction contact sheets at normal play scale, showing front/side/back views, covered faces and the helmet-versus-hood/shemagh distinction. Verify that default insurgent generation never selects a helmet; do not mark complete while the assets or implementation are missing.

See [graphics roadmap](graphics-roadmap.md) for the shared appearance acceptance. This is planned art/implementation work, not a claim that current faction sprites already comply.

## 2. What the project actually contains

| Area | Implemented now | Remaining acceptance |
| --- | --- | --- |
| Campaign entry and travel | Shared version-1 save, legacy migration, click-to-march A* navigation, terrain costs, camera follow, pause and speed | First-session guidance, strategic sight and route persistence |
| Default map | 2.5D parties, island terrain, settlement and party labels; 3D demo separated | Real-device visual and frame-time acceptance |
| Encounters | Proximity contact, enemy summary, ground/time/weather/strength variants, Attack and Leave | Ambush preparation, rearguard withdrawal and strategic pursuit |
| Deployment | Eight starting rebels; select six to nine fit fighters; explicit deployed identities reach the sim | Recruit/reserve roster expansion and broader roster UX |
| Tactical missions | Convoy, compound, cave, forest road, checkpoint, village and hilltop; squad switching and class abilities | Mission pathfinding defects, tuning with eight rebels, extraction/loss policy audit |
| Durability | Rebels have 180 base HP, modified by class; army base HP remains 100 | Human difficulty and pacing playtests |
| Return | One result per encounter, XP, wounds, equipment/goods, persistent kit, abandoned-mission recovery | Concurrent-tab transaction authority and interrupted-save UX |
| Band | Promotions cost XP and equipment; grid kit and armoury; friendly-settlement recovery and trader | Owned weapon-modder and operator appearance integration |
| World consequences | Defeated contacts disappear; captured settlements change owner; convoy motion survives reload | Resupply, respawn, cargo-driven missions, garrison simulation and counterattacks |
| Pressure | Heat increases after victory and decreases when resting | Heat-driven hunters, visibility, search and response tiers |
| Slice objective | Operation Foothold: win a convoy encounter, earn three victories, liberate Fort Orion; completion in band panel | Dedicated operation summary, authored onboarding and end-to-end player acceptance |
| Quality | Deterministic replays, simulation/inventory/campaign regression suites, build/link checks | Browser, accessibility, multi-browser, memory and reference-device performance gates |

The old roadmap described many already-connected pieces as wholly future work. Conversely, visible convoy tokens
and a heat number are not a strategic simulation. Convoys currently follow fixed roads and turn around; patrols
and raiders are encounter tokens, not searching armies. Troop stacks in the older Rebel Band demo are not a
second deployable army. The named campaign roster is the authority for tactical deployment.

## 3. The first complete operation

**Operation Foothold** is the bounded slice. Start with eight named rebels around the Oros camp. Learn movement,
time controls, the Party panel and recovery. Intercept an occupation convoy for the first major gain, take a
second target to improve the band, then assault Fort Orion. A convoy victory, at least three recorded victories,
and Resistance ownership of Fort Orion complete the operation. These conditions are derived from persistent
records and territory, so trimming the event log cannot remove completion.

The current implementation allows any order and continued play after completion. The intended introductory
sequence is guidance, not a hard railroad. No new campaign-wide defeat rule is implied: rebels who go down come
home wounded. Camp overrun remains a future setback with evacuation and recovery, rather than deletion of the save.

### Start and orient

The opening scene's campaign action loads the saved band or creates one. The main map shows the band, contacts,
settlements, time controls and the operation checklist. Party opens the roster, promotions, kit, recovery and
trade. New saves and migrated old three-person saves have eight rebels. Migration preserves existing wounds,
experience, classes and kits and adds missing starters once; it does not repeatedly grant new fighters.

### Plan and travel

Click land to find a traversable route. Roads are faster, forest and difficult ground slower, sea is impassable.
The camera follows until the player pans; F restores follow. Pause stops campaign movement and time, while camera
inspection remains available. Hidden tabs do not advance the map. Encounter, band and kit panels block time and
movement; keyboard speed shortcuts cannot resume the world behind a modal.

Position and campaign state autosave during active time and on page exit. This is browser-local storage, not a
server account. A route is not yet restored across reload. The next stage must show travel estimates, why a path
is unavailable and the strategic implications of moving at night without exposing implementation details.

### Contact and deployment

Reaching a hostile party or occupied settlement offers an encounter. The summary names the enemy, strength,
mission, terrain and conditions. The player selects **six to nine fit rebels**; the starting roster has eight.
Wounded fighters stay behind. Fewer than six fit fighters requires recovery before launching another fight.
Leave suppresses that immediate contact until the band moves clear, avoiding repeated dialogs.

A deployment records the encounter ID, seed, source, selected fighter IDs, conditions and reserved kit. Saving
must succeed before navigating away. Duplicate fighter IDs are refused. Tactical setup uses exactly those IDs;
it must never merge the practice roster back into a campaign and silently deploy wounded companions.

| Contact/context | Tactical mission |
| --- | --- |
| Convoy in open terrain | Convoy ambush |
| Convoy in forest or mountains | Forest-road ambush |
| Garrison post/checkpoint | Checkpoint assault |
| Occupied village | Village raid |
| Occupied town or Fort Orion | Compound assault |
| Raiders near the hideout | Cave defence |
| Raiders away from camp | Hilltop defence |

The mapping and environment variants exist. Actual strategic cargo manifests, complete garrison compositions and
pursuit-generated defence conditions remain future work. A strength multiplier is not the same as deploying the
exact army seen on the map.

### Fight

The player controls one rebel and can switch to another while issuing orders to companions. Classes provide
weapons, passive modifiers and active abilities. Every mission now begins with the larger roster, with explicit
cover-safe starting positions for the convoy and deterministic placement elsewhere. Rebels have 180 base HP;
class bonuses and difficulty still apply. This is an intentional balance change, not a performance change.

The tactical loop includes movement, cover, suppression, weapon and ammunition use, objectives, looting, and
mission-specific completion/extraction. The inventory tracks magazines and ammunition in fighter kits. Tests
must verify the identity of every deployed fighter and conservation of items across entry and return; a HUD
count alone is insufficient. Human playtesting must check whether the larger squad trivializes objectives,
blocks passages or consumes supplies too quickly.

### Debrief and return

The mission writes one debrief for its encounter. Returning settles XP, fighter condition, reserved kit, recovered
equipment and trade goods once. Grid kits return in their changed state; replaced kit goes to the armoury.
Reloading an unfinished mission withdraws the band, wounds the deployed fighters and returns their original kit
without new loot. Reloading a completed debrief must not award it again.

The map reports the result once, hides defeated contacts and changes captured settlements to Resistance
ownership. Victory increases heat. A failed browser save must keep the player on the current page with their
in-memory result instead of navigating away and losing it. Cross-tab conflict resolution still needs a single
writer or revision-based transaction model before claiming robust multi-tab support.

### Recover, trade, equip and promote

At friendly or independent settlements within the service radius, Party offers 12-, 24- or 48-hour rest. Wounded
fighters recover in 24 hours; fighters brought down take 48. Rest advances campaign time and reduces heat. There
is currently no strategic enemy advance during the instant rest action; its eventual risk must be integrated
with the world simulation, not implemented as a separate timer.

The settlement trader sells recovered valuables for scrip and offers promotion equipment. The same campaign
stash, goods and scrip are updated and saved. Promotions consume their class's XP and equipment requirements.
The kit screen prepares carried weapons, magazines and rounds for the next sortie. Trading counts for promotion
equipment and concrete inventory item instances still need a unified ownership model before modder integration.

After recovery the player can deploy again with the same experienced fighters. The regression scenario explicitly
covers a failed mission, all eight rebels wounded, save/load, safe-haven rest, and another eight-person deployment.
This recovery path prevents a normal defeat from making the campaign unplayable.

### Finish and continue

Operation Foothold completes when its three conditions are true. Show which conditions remain and acknowledge
completion without resetting the band. The full release should add a dedicated operation debrief: time elapsed,
missions won/lost, wounded survivors, promoted fighters, equipment gained and territory freed. Continuing into a
larger island campaign is the next expansion, not a prerequisite for accepting this slice.

## 4. Vertical-slice acceptance contract

A release candidate must demonstrate, from a clean save and again from a migrated save:

1. Enter the default 2.5D map; understand the objective, roster and time controls without developer tools.
2. Travel to a convoy, select six to eight starters, fight, return, and retain fighter identity, XP and kit.
3. Observe a persistent world consequence and no duplicate rewards after reload.
4. Lose or abandon a sortie, recover at a safe haven and launch another mission without resetting the campaign.
5. Sell loot, acquire required equipment, promote a fighter and see the promoted class in the next deployment.
6. Win another target and Fort Orion, receive the operation completion acknowledgement, reload and retain it.
7. Complete the same flow by keyboard; modal focus and reduced-motion behavior remain usable.
8. Pass the browser/performance gates below with no console errors, missing assets or item duplication.

Current pure-module tests cover the state transitions and recovery. Browser tests exercise the map/mission bridge
and promotions; they are not proof of an unaided human playthrough. Hosted CI now passes the campaign bridge, travel and loop. The complete browser run is still a release gate: an operator reload timeout interrupted later character suites and accessibility. Do not mark the entire campaign or CM6 complete merely
because unit and build checks pass.

## 5. Performance plan and completed code review

The review found unnecessary work in both CPU and GPU paths. The default now avoids the operator/weapon/GLB
module graph by loading it only for the 3D demo. The post-process uses nine texture reads instead of 39 and drops
4× multisampling on the HDR render target. The drawing buffer is capped at approximately 1.2 million pixels and
1.25 device pixel ratio; shadows use a 1024 map refreshed at most ten times a second. This keeps the miniature
look while substantially reducing the work requested of the GPU.

Terrain picking now samples the baked field instead of testing 86,400 triangles. Route dots update after movement
at a bounded cadence and reuse their instance transforms while paused; date text only changes when needed;
town-label projection is throttled; sprite frame changes no longer request shader recompilation. Hidden tabs
skip the update/render work. Convoy positions persist without a new randomized starting point on every load.

[Performance review](engineering/campaign-performance.md) records the reproducible CPU measurement and remaining
bottlenecks. CPU microbenchmarks are not browser FPS measurements. Reference acceptance is sustained 30 FPS or
better on a midrange phone and 60 FPS on a normal laptop at the balanced default, with p95 frame-time reporting,
responsiveness during routing, and no steady memory growth across ten map/mission trips. Record device, browser,
resolution and hardware acceleration; software-rendered cloud Chromium is a correctness check, not a consumer
GPU benchmark. Next profiling targets are terrain texture bandwidth, props/draw calls, map startup, party label
updates, and navigation baking. Do not cut art or claim achieved FPS without measurements.

## 6. Revised delivery order

| Order | Work | Exit evidence |
| --- | --- | --- |
| A: stabilize this operation | Map default, roster/HP balance, recovery/trader, durable deployment, operation checklist | All unit/replay/build checks plus browser loop, keyboard and screenshot review |
| B: reliable world simulation | W4/W5 fixed-step clock and seeded parties; convoy route/cargo/resupply; save/restore mid-route | Headless equivalence at different render rates; interrupted-save and reload tests |
| C: meaningful pressure | W7 hunters and sight; heat-driven response; escape and rest risk | Explainable pursuit, lost-contact behavior, defence encounters and fair recovery |
| D: economy and territory | W14/W18/W19 ownership unification, recruits/reserves, service stocks, garrisons and counterattacks | No duplication; repeated operations sustain a band; captured places matter |
| E: owned customisation | W16/W17 and CM19/CM20 connect real owned items to modder and appearance | Preview cannot grant equipment; visuals match the deployed kit |
| F: slice release | W21/W24/W25 operation debrief, onboarding, browser/device budgets, accessibility and pacing | Recorded complete player journey and acceptance contract above |
| Later expansion | Auto-resolve, 50-campaign tuning harness, additional regions, larger war and vehicle escalation | Build only after the core loop is stable and understandable |

Do not restart Claude's completed tactical systems. Continue from the working inventory, squad control, mission
variants, simulation spatial cache, replays and quality harnesses. The next engineering priority is the strategic
simulation and save authority; additional showcase assets are secondary to those campaign dependencies.

## 7. Packet reconciliation

W1–W3 provide the save, bridge and travel foundation. W8–W11, W13–W15 and W19 have meaningful playable subsets but
retain unfinished acceptance (ambush choices, exact enemy/cargo composition, aftermath, territory simulation).
W12 now targets six-to-nine-person deployment rather than the obsolete four-person plan. W18 has recovery/trade
but not recruitment. W21 has a bounded objective, not the complete endgame/defeat presentation. W24 retains the
real-device budget and final browser gate. W26's visual decision is superseded by the owner's 2.5D-default request.

Packet notes record these distinctions and the generated master table remains synchronized. A ready packet means
work can proceed; it is not a claim that its entire acceptance criterion has shipped.

## 8. Save and integration boundaries

`shared/campaign/state.js` owns normalization/migration and storage; `encounter.js` owns deployment/result/settlement;
`contacts.js` owns source mapping and world consequences; `operations.js` owns recovery and the bounded operation.
`map/campaign-ui.js` presents these rules. `convoy/campaign-mode.js` bridges a mission without using the standalone
practice save. `convoy/roster.js` centralizes starting identities, health, size and safe insertion placement.

Keep encounter settlement idempotent, campaign IDs checked, invalid rosters rejected before removing kit, and
failed writes explicit. Preserve old saves where possible. Strategic party motion is stored in world party
records, while destroyed-state records retain their historical effect. Future save version changes need migration
fixtures, corruption recovery, conflict tests and a documented rollback path. No backend, multiplayer authority,
cloud save or final persistent-war guarantee is implied by the current browser-local slice.
