# PARTISAN campaign: playable loop and vertical-slice roadmap

Revised 15 October 2026 against the current source, including Claude's tactical, inventory and quality work and the
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

Module boundary (13 October): `map/map.js` loads sprite people and HD-2D; `map/demo-3d.js` alone imports the
operator/weapon-backed figures. Both call `map/map-runtime.js` and share terrain and 3-D convoy vehicles.
Party construction requires an explicit figure factory; there is no hidden operator fallback. Band handling audio
lives in `shared/mech.js`, with a compatibility export for weapon-demo callers. The shell hosts one active page;
its original opening scene remains separate from campaign navigation. Static import-graph tests cover lazy imports,
and `tests/e2e/module-isolation.mjs` checks actual shell/map/band/mission requests plus standalone demo startup.

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
| Campaign entry and travel | Shared version-1 save, legacy migration, click-to-march A* navigation, terrain costs, camera follow, pause and speed | First-session guidance and interrupted-save UX |
| Default map | 2.5D parties, island terrain, settlement and party labels; 3D demo separated | Real-device visual and frame-time acceptance |
| Encounters | Proximity contact, both sides and the ground, Attack, Prepare an ambush, Withdraw with a rearguard, Leave; hunters pursue the band | Ambush preparation beyond sandbags (positions, traps) |
| Deployment | Eight healthy starting rebels; village recruits expand the named band up to 18; select six to nine fit fighters; explicit identities reach the sim | Broader reserve roster UX and equipment ownership unification |
| Tactical missions | Convoy, compound, cave, forest road, checkpoint, village and hilltop; squad switching and class abilities | Mission pathfinding defects, tuning with eight rebels, extraction/loss policy audit |
| Durability | Rebels have 180 base HP, modified by class; army base HP remains 100 | Human difficulty and pacing playtests |
| Return | One result per encounter, XP, wounds, equipment/goods, persistent kit, abandoned-mission recovery | Concurrent-tab transaction authority and interrupted-save UX |
| Band | Promotions cost XP and equipment; grid kit and armoury; settlement recovery, weekly village barter and healthy tier-one recruits | Owned weapon-modder and operator appearance integration |
| World consequences | Defeated contacts disappear; captured settlements change owner; seeded convoys resupply garrisons; liberated food and saved counterattacks make territory useful and vulnerable | Human tuning of garrison sizes, travel and response pacing |
| Pressure | Four strength-based response tiers, heat-driven hunter columns, day/night sight, last-seen searches, lost-contact behavior and defence encounters | Human tuning of pursuit frequency and fair recovery |
| Slice objective | Operation Foothold: win a convoy encounter, earn three victories, liberate Fort Orion; completion in band panel | Dedicated operation summary, authored onboarding and end-to-end player acceptance |
| Quality | Deterministic replays, simulation/inventory/campaign regression suites, build/link checks | Browser, accessibility, multi-browser, memory and reference-device performance gates |

The seeded world now advances in fixed steps independently of rendering. Convoys follow saved routes, deliver
cargo to garrisons and respawn two days after destruction. Hunters react to heat, pursue sightings and search
the last known position before losing the trail. Liberated settlements supply recovery meals; villages offer volunteers, and occupation columns can retake lost seats. Troop stacks in the older Rebel Band demo are not a
second deployable army. The named campaign roster is the authority for tactical deployment.

## 3. The first complete operation

**Operation Foothold** is the bounded slice. Start with eight healthy named rebels around the Oros camp. Learn movement,
time controls, the Party panel and recovery. Intercept an occupation convoy for the first major gain, take a
second target to improve the band, then assault Fort Orion. A convoy victory, at least three recorded victories,
and Resistance ownership of Fort Orion complete the operation. These conditions are derived from persistent
records and territory, so trimming the event log cannot remove completion.

The current implementation allows any order and continued play after completion. The intended introductory
sequence is guidance, not a hard railroad. No new campaign-wide defeat rule is implied: rebels who go down come
home wounded. Camp overrun now costs half of stored stacks, relocates the band to a friendly settlement and starts three days
of rebuilding. The complete campaign defeat presentation remains planned.

### Start and orient

The opening scene's campaign action loads the saved band or creates one. The main map shows the band, contacts,
settlements, time controls and the operation checklist. Party opens the roster, promotions, kit, recovery and
trade. New saves and migrated old three-person saves have eight rebels. Fresh campaigns begin with zero wounded;
the initial map card also shows eight fit fighters and zero wounded before the save loads. Migration preserves existing wounds,
experience, classes and kits and adds missing starters once; it does not repeatedly grant new fighters.

### Plan and travel

Click land to find a traversable route. Roads are faster, forest and difficult ground slower, sea is impassable.
The camera follows until the player pans; F restores follow. Pause stops campaign movement and time, while camera
inspection remains available. Hidden tabs do not advance the map. Encounter, band and kit panels block time and
movement; keyboard speed shortcuts cannot resume the world behind a modal.

Position and campaign state autosave during active time and on page exit. This is browser-local storage, not a
server account. Routes now persist across reload. The next stage must show travel estimates, why a path
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
| Counterattack column | Hilltop defence with the exact saved column strength |

The mapping, environment variants, convoy cargo and pursuit-generated defence conditions exist. Convoy ambushes
field the vehicles and escort shown on the map. Settlement missions now field the saved garrison and militia exactly, with at most 24 active defenders and reserve groups. Choose a raid to take supplies without changing ownership, or a liberation assault to break all defenders and capture the seat. Defender losses persist after raids and defeats. A strength multiplier is not the same as deploying the
exact army seen on the map.

### Resolve a small fight

WP-W22 offers auto-resolve when the selected six-to-nine fit fighters' summed tiers are at least 2.5 times the
enemy strength, or when facing the designated Orion patrol. Reserve troop stacks do not count. Settlement
captures, Fort Orion and all defence missions are excluded. Changing the selected squad updates the offer,
victory odds and expected number wounded before the action is taken.

The encounter seed fixes the result. Wounds last 24 hours, and loot/cargo recovery is reduced by 25%, rounded down
per stack, with no rare bonus roll. The normal encounter settlement applies XP, wounds, kit return and map
consequences once. A failed save leaves the encounter unchanged for retry. Auto-resolve leaves carried grid kits
intact; ammunition expenditure is not simulated yet. The odds and wound formula are provisional balance values;
the intended disadvantage against an average played fight still needs human comparison.

`node tools/campaign-auto.mjs` samples the same resolver used by the map. This is a focused balance harness,
not the planned 50-campaign simulation. Escalation, campaign endings and longitudinal balance remain open.

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

The mission writes one debrief for its encounter. The detailed recovery screen lists mission rewards and convoy
cargo going to the stash, named trade goods with their scrip values, net new carried equipment/ammunition, and
expandable returned-kit lists for each fighter. Net additions compare the entire squad at insertion and return,
so issued supplies and transfers between fighters do not appear as new loot. Fired ammunition is deducted.
The same stored result is shown after reloading the debrief; displaying it does not award anything. Returning settles XP, fighter condition, reserved kit, recovered
equipment and trade goods once. Grid kits return in their changed state; replaced kit goes to the armoury.
Reloading an unfinished mission withdraws the band, wounds the deployed fighters and returns their original kit
without new loot. Reloading a completed debrief must not award it again.

The map reports the result once, hides defeated contacts and changes captured settlements to Resistance
ownership. Victory increases heat. A failed browser save must keep the player on the current page with their
in-memory result instead of navigating away and losing it. Cross-tab conflict resolution still needs a single
writer or revision-based transaction model before claiming robust multi-tab support.

### Recover, trade, equip and promote

At friendly or independent settlements within the service radius, Party offers 12-, 24- or 48-hour rest. Wounded
fighters recover in 24 hours; fighters brought down take 48. Rest advances campaign time and reduces heat. The map runs the shared world simulation through that time, including convoy movement and hunter activity.
The player-facing interruption and risk presentation still needs pacing acceptance.

Fresh campaigns keep only nine reserve items: two AK-74s, a rig, a vest, two medkits, a grenade pack,
a smoke pack and binoculars. Carried fighter kits are issued separately. Existing campaign and legacy-import
inventories are preserved; reopening a save does not remove equipment.

Campaign trade is item-for-item barter at neutral and liberated **villages only**. Camp and towns have no trader;
practice mode keeps its existing shop. Choose quantities of supplies to receive and spare equipment or recovered
valuables to offer. The preview shows both values and any donated excess before exchanging. No currency or change
is awarded; old saves retain their legacy scrip but campaign services do not spend it. Failed saves restore the
original inventory and selected offer for retry. The recovery report values goods using the same barter table.

Each village's seeded stock refreshes every seven campaign days: meals, medical supplies, grenades, smoke, one
common equipment type and a 20% chance of one AK-74. Liberated stock is larger on its next generation and its
prices immediately improve by 15%. Visiting, reloading or changing ownership does not replenish an existing
week's market. Meals bought at neutral villages also support recovery. Liberated settlements provide four free
meals weekly; each 12 hours of rest consumes one for six additional wound-recovery hours without skipping world time.

Liberated villages offer two tier-one volunteers weekly. Recruiting consumes one meal, adds a healthy named
fighter with zero XP, and respects an 18-person band capacity. Volunteers can be selected for the next six-to-nine
person mission and promoted normally. Their class supplies the initial carried kit, like existing starters;
this remains part of the broader equipment-ownership work. Weekly stock and volunteer quotas survive reload.
Promotions consume their class's XP and equipment requirements.
The kit screen prepares carried weapons, magazines and rounds for the next sortie. Trading counts for promotion
equipment and concrete inventory item instances still need a unified ownership model before modder integration.

After recovery the player can deploy again with the same experienced fighters. The regression scenario explicitly
covers a failed mission, all eight rebels wounded, save/load, safe-haven rest, and another eight-person deployment.
This recovery path prevents a normal defeat from making the campaign unplayable.

### Hold liberated territory

A won liberation assault records Resistance ownership, clears the defeated garrison and updates the settlement
banner and province information. Raids leave the owner unchanged and subtract actual defender casualties.
Twenty-four campaign hours after capture, the nearest occupied seat with at least twelve soldiers sends half its
garrison, capped at 24, along a traversable saved route. Those troops leave the sending garrison; convoy resupply
can replenish it later. The column appears on the map and can be intercepted before reaching its target.

On arrival, the column starts a six-hour siege. A band within the settlement's service radius can defend it;
an absent band lets it fall after the deadline. Contact opens a hilltop defence with exactly the saved column's
soldiers, without difficulty thinning. A win breaks the column and preserves liberation. Defeat or withdrawal
returns the settlement to occupation. Retaking disables friendly services, restores a hostile contact and updates
map ownership. Capturing it again schedules a new response; a won defence does not spawn endless replacement
columns. Arrival, departure and retaking are announced; route, siege timing and result application survive reload.

These are implemented rules, with deterministic simulation and browser transition checks. Full human pacing
acceptance, interruption of long rests and more varied settlement-defence terrain remain future work.

### Occupation escalation

The response score is the sum of every named fighter's class tier plus twelve points for each originally occupied
settlement currently liberated. Wounded fighters and reserves count; legacy troop stacks, selected squad size and
heat do not inflate the score. The fresh eight-person band scores 28. Losing territory can reduce the response.

| Tier | Score | Response | Additional soldiers per hunter column | Raider / Orion activation heat | Reaction / shot-spread multipliers |
| --- | --- | --- | --- | --- | --- |
| 0 | 0–39 | Routine patrols | 0 | 20 / 50 | 1.00 / 1.00 |
| 1 | 40–59 | Active search | 4 | 15 / 45 | 0.90 / 0.95 |
| 2 | 60–79 | Containment | 8 | 10 / 40 | 0.80 / 0.90 |
| 3 | 80+ | Suppression | 12 | 5 / 35 | 0.70 / 0.85 |

Hunter sizes start at 31 raiders and 26 Orion soldiers. Their authored cave/hilltop waves now field the exact
strategic count, including vehicle crew, without difficulty thinning. Tier one upgrades selected regular riflemen
to grenadiers; tier two adds machine guns and tier three adds marksmen. Existing leaders, radio operators and
militia keep their roles. Garrison, militia, counterattack and convoy headcounts remain authoritative.

Reaction and spread multipliers apply on top of the chosen tactical difficulty; rebel health and damage settings
are preserved. Party shows the score breakdown and next threshold, map labels show current hunter strength, and
encounter briefings show the tier. Deployment snapshots the tier and hunter count so a mission cannot change its
rules during loading. Practice levels retain their original setup. Auto-resolve uses the same eligibility rule
but accounts for escalation in victory odds and expected wounds.

Run `node tools/campaign-response.mjs` to inspect the same rules over 8/12/18-person bands and zero to four
liberated seats. The fresh band reaches tier one after its first liberation; an eighteen-person band with two
liberated seats reaches containment. This is a deterministic progression curve, not a claim that human difficulty
or multi-campaign economy balance is finished. W23 supplies that longitudinal harness; W24 retains device acceptance.

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
| Later expansion | 50-campaign tuning harness, additional regions, larger war and vehicle escalation | Build only after the core loop is stable and understandable |

Do not restart Claude's completed tactical systems. Continue from the working inventory, squad control, mission
variants, simulation spatial cache, replays and quality harnesses. The next engineering priorities are campaign endings (W21), the 50-campaign balance harness (W23),
and stronger save authority; additional showcase assets are secondary to those campaign dependencies.

## 7. Packet reconciliation

W1–W3 provide the save, bridge and travel foundation. W8 is done (2026-10-13): the encounter panel shows both sides
and the ground, and offers Attack, Prepare an ambush (two hours, then sandbags), Withdraw leaving a rearguard (when
hunters have caught the band) and Leave. W11 is done (2026-10-13): with the heat up, the raiding party
hunts the band across the map; caught at Oros Camp the band fights the cave defence, elsewhere in the open; an
overrun camp follows TAC-K-03 (half of every stack lost, fall back to the nearest friendly settlement, three days of
rebuilding, the old camp burnt, heat halved). W9 is done (2026-10-13): an ambushed convoy fields the map
convoy's own vehicles and escort, and the encounter panel offers the ambush start (the roadblock, or a road charge
spent from the stash that blows the lead vehicle). W13 is done (2026-10-12): a won fight leaves its mark on the
map where it happened (a convoy's charred wrecks and smoke, scorch and smoke at a post, smoke over a taken settlement),
kept in the save, the smoke thinning over two campaign days and the marks gone after two weeks. W14 is done (2026-10-12): convoys carry fixed cargo
manifests shown before the fight, a won ambush takes the cargo home less what burns, and the stash shows where its
items came from (missions, cargo, the trader). W15 is done (2026-10-12): the Rebel Band screen opens from the
map's band panel on the campaign save, shows the named fighters above the troop stacks and promotes them with their
experience and the stash's kit; the standalone demo keeps its own save. W4–W7 now supply day/night time, a fixed-step seeded world, convoy resupply/respawn and searching hunter columns.
W10 is complete: exact garrison/militia composition, bounded reserves, raid/capture choices and night conditions. W19 now provides weekly recovery meals and saved, garrison-funded counterattacks: intercept or defend; unattended sieges and lost defences reverse ownership. W18 completes its recruitment benefit.
W12 now targets six-to-nine-person deployment rather than the obsolete four-person plan. W18 is complete: finite seeded village barter, better liberated rates, healthy weekly volunteers and failed-save rollback. W20 implements the documented response curve and its harness. W21 has a bounded objective, not the complete endgame/defeat presentation. W24's browser gate is done (save
revisions refuse a stale tab, smoke round trip, map frame budget measured); the real-device 30 fps reading remains. W26's visual decision is superseded by the owner's 2.5D-default request.

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
