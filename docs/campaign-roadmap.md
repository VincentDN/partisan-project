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
| Deployment | Eight healthy starting rebels; village recruits expand the named band up to 18; select six to nine fit fighters (two to four for Roadblocks); explicit identities reach the sim | Broader reserve roster UX and equipment ownership unification |
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
mission, terrain and conditions. The player selects **six to nine fit rebels**, or **two to four for a Roadblock**; the starting roster has eight. The nearby Oros roadblock has exactly four riflemen, no specialists or reinforcements. Clear it, search bodies with E, then bring the surviving crew to the marked southwest exit. Its loot follows normal one-time settlement.
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

WP-W22 offers auto-resolve when the selected six-to-nine fit fighters’ equipment-adjusted strength is at least
2.5 times enemy strength, or when facing the designated Orion patrol. Every selected fighter must carry a supported
firearm and enough compatible ammunition for the previewed cost. Reserve troop stacks do not count. Settlement
captures, Fort Orion and all defence missions are excluded. Changing the selected squad updates the offer,
victory odds and expected number wounded before the action is taken.

The encounter seed fixes the result. Wounds last 24 hours, and loot/cargo recovery is reduced by 25%, rounded down
per stack, with no rare bonus roll. The normal encounter settlement applies XP, wounds, kit return and map
consequences once. A failed save leaves the encounter unchanged for retry. Auto-resolve spends the exact previewed
rounds on either outcome and returns the remaining owned kit. Chambered rounds, inserted magazines, reachable
compatible spare magazines and loose rounds count; stash equipment, other weapons’ loaded rounds and wrong
calibres do not. Empty stacks are removed, while magazine and weapon identities remain. The odds and wound formula are provisional balance values;
the intended disadvantage against an average played fight still needs human comparison.

`node tools/campaign-auto.mjs` samples the same resolver used by the map. This is a focused balance harness,
separate from the existing 50-campaign simulation. Escalation, campaign endings and longitudinal balance remain open.

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

Fresh campaigns start with an empty reserve stash and eight healthy fighters: five Mosin-style bolt-action rifles,
two TT-33 pistols and one AKM. This rounds the requested 60% Mosin / 30% pistol / 10% AKM mix to eight people.
Each fighter owns ten rounds: Mosins have five loaded/five spare, pistols eight/two, and the AKM ten loaded.
There are no extra sidearms, launchers, grenades, armour or medical supplies. Recover better equipment and ammunition from combat; existing village barter remains
available for exchanging recovered stock. Class changes do not grant a weapon or refill ammunition. Empty slings
and spent magazines survive saves and completed missions. Existing acquired inventories are preserved.

Marksman-class fighters carrying a Mosin, and fighters using an SVD or Mk 14, can hold right-click to scope and
left-click to fire. The 2.4× view uses a sniper reticle and a directional 90-metre sight cone; cover and smoke
still block sight. Move the mouse to adjust the target; screen edges pan farther downrange. Escape, focus loss,
search and switching soldiers cancel the shot. Shift-right-click issues squad orders when using a sniper. Ordinary weapons retain click-to-fire controls.

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

| Tier | Score | Response | Additional soldiers per hunter column | Raider / Orion activation heat | Reaction / shot-spread / incoming-damage multipliers |
| --- | --- | --- | --- | --- | --- |
| 0 | 0–39 | Routine patrols | 0 | 20 / 50 | 1.60 / 1.90 / 0.65 |
| 1 | 40–59 | Active search | 4 | 15 / 45 | 1.40 / 1.65 / 0.75 |
| 2 | 60–79 | Containment | 8 | 10 / 40 | 1.20 / 1.40 / 0.85 |
| 3 | 80+ | Suppression | 12 | 5 / 35 | 1.00 / 1.20 / 0.95 |

Hunter sizes start at 31 raiders and 26 Orion soldiers. Their authored cave/hilltop waves now field the exact
strategic count, including vehicle crew, without difficulty thinning. Tier one upgrades selected regular riflemen
to grenadiers; tier two adds machine guns and tier three adds marksmen. Existing leaders, radio operators and
militia keep their roles. Garrison, militia, counterattack and convoy headcounts remain authoritative.

Reaction, spread and incoming-damage multipliers apply on top of the chosen tactical difficulty. Higher reaction
and spread values mean slower, less accurate troops. Base rebel health stays 180; routine troops inflict 65%
of the selected difficulty’s damage. Roadblocks retain four ordinary riflemen at every tier. Party shows the score breakdown and next threshold, map labels show current hunter strength, and
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
variants, simulation spatial cache, replays and quality harnesses. The next engineering priorities are campaign endings (W21), onboarding (W25), and manual-play balance acceptance; W23 now supplies the repeatable baseline; additional showcase assets are secondary to those campaign dependencies.

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

## W23 assignment and test chunks — 16 October 2026

**Owner: Codex, explicitly assigned by Vincent.** W23 balance harness and its testing are reserved for Codex;
other agents should leave this packet and `tools/campaign/` to that work. This assignment does not transfer
W21 endings, W25 onboarding, W22 human-play comparison or W24 physical-device measurements.

1. Define reproducible simulation policies, metric units and provisional targets; implement the shared-rule harness.
2. Run fifty seeds in five resumable chunks: 1–10, 11–20, 21–30, 31–40 and 41–50. Retain per-seed results and aggregate reports.
3. Review the baseline, run an explicitly labelled tuning comparison and report misses, censored milestones and limitations.
4. Verify reproducibility/reload behavior, run required checks and commit the report and handoff to main.

There are no numeric W23 pacing targets in the existing roadmap. Codex will document initial diagnostic thresholds
before collecting the baseline. Campaign-clock hours and map-speed-equivalent seconds must remain distinct from
human active play time. A seed that never reaches an encounter or promotion must remain visible as a censored result.

### W23 provisional diagnostic thresholds

For the initial 14-day auto-resolve-policy runs: at least 90% of seeds should reach a hostile contact within
72 campaign hours; at least 60% should pay for a first promotion within 336 hours; mean hunts should be
0.1–2 per campaign day; mean reserve-stash growth should be 0–80 items. These are new diagnostic thresholds,
not previously approved human-play targets. Report failures openly; do not tune seeds or grant equipment to pass.
Baseline policy rests when fewer than six fighters are fit. The paired tuning comparison rests below eight.
Both start from normal fresh saves, move on A* routes, use legal auto-resolve and paid promotions, leave optional
forbidden fights and use the game's rearguard rule when caught. They do not simulate manual tactical victories
or liberation. Compare seeds 1–50 under both policies; human-play pacing remains outside W23's evidence.

### W23 completed evidence and remaining balance acceptance

Codex completed the fifty-seed baseline and fifty-seed paired recovery-policy comparison in five chunks each.
The [review and reproduction instructions](../outbound/campaign-balance/review.md),
[baseline](../outbound/campaign-balance/baseline/report.md) and
[early-rest comparison](../outbound/campaign-balance/early-rest/report.md) retain results and limitations.
The baseline averages 0.13 hunts/day and +17.20 reserve items; all seeds meet a hostile contact within 4.50
campaign hours. Neither policy promotes within fourteen days: XP and required equipment are both barriers.
Early recovery lowers pressure without improving progression. No runtime balance change follows from these
limited policies. W23's harness/report packet is complete; manual-play pacing, barter-inclusive policy coverage,
full-endgame balance and W22's human comparison remain open. W23 testing ownership remains **Codex**.

W23 dependency clarification: the harness consumes W22's implemented resolver. Its outstanding human-play
comparison is a separate acceptance task, not a prerequisite to measuring the current code. W23 therefore
retains W20 as its completion dependency; W22 remains open and is not declared balanced by these reports.

The retained W23 baseline/comparison predates the Mosin-only, ten-round campaign start. Its source fingerprints
make it historical evidence, not validation of this new opening balance. Codex owns the follow-up measurement;
manual-combat ammunition scarcity and loot progression require played comparison beyond the auto-only harness.


### W23 Mosin-start follow-up — 17 October 2026

Codex completed another fifty-seed standard run and fifty-seed early-rest comparison in ten-seed chunks,
including checkpoint resumption. The [Mosin-start review](../outbound/campaign-balance/mosin-start/review.md)
records 565 auto-resolved fights with **zero rounds spent**. Every band retained its eight rifles and eighty
rounds; measured strategic outcomes match the historical policies seed for seed. These results validate the
harness's strategic reproducibility, not ammunition scarcity or tactical sustainability.

**W22 remaining scope:** equipment/ammunition-aware auto-resolve strength and expenditure, preview feedback for
unarmed/dry bands, and one-time settlement/reload conservation, followed by the existing human-play comparison.
**W23 testing remains assigned to Codex:** add real-ammunition tactical and barter policies in ten-seed chunks,
then compare with human outcomes. Endings/onboarding and physical-device acceptance remain open.


### Inventory feedback — 17 October 2026

Body searches, caches and campaign kits now use prominent gun-handling Foley for opening, closing and item
operations, including keyboard transfers and magazine handling. Failed moves use quieter clicks. Playback
respects tactical SFX mute/volume and caps overlapping voices; no demo modules are required.

## Campaign interface clarity — 17 October 2026

The test campaign now displays the operation objective and next step, expandable progress, live fit/wounded
fighter counts, carried rounds and reserve items. Travel status stays visible, with Find band, Stop travel,
clock state and an expandable controls guide. Paused kit changes refresh the dashboard.

Band & supplies places inventory and weapon actions beside each fighter's readiness, with navigation to
fighters, recovery/trade and reserve stash. Desktop and phone layouts use readable panels and reachable
close controls; encounter selection explains the six-to-nine deployment requirement. Browser coverage checks
keyboard operation, persisted route cancellation, live status, phone bounds and scoped HUD accessibility.
This is a W25 interface milestone; the complete guided move → encounter → loot → promote journey remains
open alongside W21 operation endings and physical-device acceptance.

## Opening difficulty and results — 17 October 2026

The mixed scarce starting kit and small Roadblock provide an equipment-recovery step before convoy ambushes.
Tactical response now starts slower, less accurate and less damaging, escalating gradually across four tiers.
A deterministic 1,000-shot-per-profile test measures 603 hits at 30 metres for the previous Normal baseline;
new tiers 0–3 yield 339, 402, 457 and 517 hits. Damage tests ensure ordinary
AK, PKM, SVD and HMG rounds cannot kill a healthy rebel in one hit on Normal. These checks are not human-play
pacing acceptance; W23’s older Mosin-only auto-resolve reports remain historical and do not validate this opening.

Combat results now headline VICTORY or DEFEAT, including the victory spoils overlay, with distinct ascending
and descending sound cues through the existing SFX volume/mute controls. Roadblocks include a loot window
before extraction so the last guard’s equipment remains recoverable. W21’s campaign-wide ending remains open.

## W22/W23 ammunition-aware follow-up — 18 October 2026

Auto-resolve uses class tier multiplied by owned-weapon effectiveness: Mosin 0.8, TT pistol 0.4, AK/AKM 1.0,
AK-15K/SVD/Mk 14 1.1, RPK 1.2, PKM 1.3, SMG 0.7 and shotgun 0.6. Unsupported primary weapons block the offer.
The per-fighter cost is at least two rounds, otherwise the rounded-up enemy count divided by squad size times
2 for precision rifles, 3 for assault rifles/shotguns, 4 for pistols/SMGs/RPK, or 5 for PKM. Insufficient ammunition
reduces preview strength and blocks resolution. These are provisional aggregate combat assumptions, not tactical
ballistics or completed human-play calibration. Restrictions on captures, defences, Roadblocks and the finale remain.

The [equipment-aware review](../outbound/campaign-balance/equipment-auto/review.md) records a new 50-seed run in
five ten-seed batches. The fresh-band auto-only policy cannot progress, correctly requiring actual tactical play
and looting first; zero fights must not be mistaken for validated scarcity. Separate equipped-veteran samples
exercise 3,000 real resolutions with positive ammunition expenditure on wins and losses. W23 follow-up testing
stays Codex-owned. W22’s average-human comparison, tactical/barter policy, W21 endings and W25 onboarding remain open.

## New priorities — 18 October 2026

1. **WP-W27 — rebel battle AI (highest priority).** Followers should spread out, take reachable nearby cover against visible threats, and advance when the leader moves on. Cover destinations must not be shared; explicit hold and sector orders remain authoritative. Verify obstacles, sustained following, leader changes and combat performance.
2. **WP-W28 — campaign event log.** Add a bounded, saved campaign-screen history of fighter recovery, enemy movement rumours and intercepted intelligence. Recovery plays a small sound once, respecting SFX settings. Include time, source and uncertainty; rumours must not become an omniscient enemy tracker. Support keyboard and narrow screens.
3. **WP-W29 — character dialogue and persuasion.** Show the speaker fullscreen with A/B/C/D choices, usable by keyboard or pointer. Town barter and recruitment use visible persuasion dice rolls with explained modifiers and consequences. Save resolved decisions to prevent reload rerolls, validate costs/stock and retain transaction rollback. Accessible focus, exit and reduced motion are part of acceptance.

These are additional campaign milestones; W21 endings, W22 human balance comparison, W23 tactical/barter policies, W24 device acceptance and W25 onboarding remain open. Implement W27 first, then W28 and W29.

### W27 first AI milestone delivered

Followers now use staggered rows with destinations reserved at least 2.4 metres apart. Blocked slots search reachable nearby ground instead of collapsing onto the player. In combat they seek distinct protected cover within six metres of their slot and twelve metres of the leader, using visible enemies rather than hidden enemy positions. Cover searches are limited to once per 0.6 simulated seconds per follower. Brief cover memory avoids immediately leaving a position because it broke enemy sight; moving the leader three metres releases it. Explicit hold and sector orders remain unchanged. This is follow-position coordination, not a new squad bounding/fireteam system or hard body collision.

Regression coverage includes eight-person wall layouts, separate cover reservations, thin sandbag protection, leader switching and hold orders. Golden replays were intentionally refreshed because changed rebel movement and corrected stationary movement flags alter combat outcomes. The two-minute, two-seed soak across eight levels found no stuck units or units inside cover; thirteen unfinished-objective findings remain because this firing/movement script does not perform mission interactions. Normal/reduced-motion browser squad controls pass.

A direct current-main comparison with three-run median CPU measurements found standard stationary-player benchmark costs no higher. A separate 60-second moving-follow combat probe across eight levels measured 0.018–0.1514 ms CPU per simulation step. Hilltop increased from 0.0116 to 0.0270 ms; other per-level changes ranged from lower costs to an 8% increase. These are cloud simulation measurements, not browser/device or human-play acceptance, and the historical performance baseline is unchanged. W28 event history and W29 dialogue remain planned next.

## Field log and reported playtest blockers — 18 October 2026

**W28 delivered:** the campaign objective panel now contains a saved, expandable field log (the existing bounded 200-entry history). It shows named recoveries, rest, combat outcomes, clearly unconfirmed daily rumours and intercepted counterattack orders. Intelligence contains no current enemy coordinates or hidden strength numbers. New recoveries play a quiet two-note SFX after user activation, honoring mute/volume; reload displays historical entries silently. Medication recovery also records a report. Rumours are ambient unverified reports, not guaranteed live convoy observations.

**W30 delivered:** inventory tiles have local equipment-category silhouettes; double-click/T/Ctrl-click transfers items. Drags start after a movement threshold and Escape cancels without losing the item. Primary weapons can be put down, swapped with an occupied slot, or recovered; bodies offer a separate persistent-in-mission Ground container. Lootable rigs/backpacks solve the starter's small-pocket capacity limit. A 6L23 is a 5.45 magazine, requiring a compatible rifle and a suitable pouch; incompatible weapon drops explain the mismatch. Magazine exchanges preserve the old magazine or refuse when it cannot fit. Roadblock shows a secured prompt and Finish raid after all four guards are defeated, preserving the looting window and the original extraction route.

**W31 queued:** larger playable approach areas across missions, with a covered walk before first contact. Review spawn-to-enemy sight distance, terrain, AI routes, extraction travel and browser budgets, preserving deliberate defence missions.

**W32 queued:** stop the workbench soundtrack on campaign entry, including embedded navigation. Add a separate subdued guitar/plucked-string and sad-string ambient score. Preserve mute/volume and browser audio activation; check map/combat/band/demo transitions without overlapping playback.

After the inventory/event-log milestone, W32 soundtrack handoff was completed below. Next: W31 approach pacing, then W29 fullscreen A/B/C/D persuasion dialogue.

### W32 soundtrack handoff delivered — 18 October 2026

Campaign pages now use an original synthesized 50 BPM minor-key score: sparse plucked strings over soft bowed tones, without percussion or extra recording downloads. The shared shell stops the demo recording when entering a campaign; direct campaign links select the same mode. Map, combat, band and campaign equipment pages share it without restarting it. Campaign music controls retain mute and volume, show the campaign score and leave the saved demo track untouched. Returning to a demo/menu restores that selection.

Track changes stop the outgoing recording and disconnect its synthesized output, including scheduled notes and reverb tails. Removing delayed track-switch callbacks prevents rapid navigation from resurrecting the previous song. Browser coverage exercises shell → map → combat → band → menu, mute/zero volume, rapid switches and preservation of the demo selection. An offline render checks a non-silent, finite signal below clipping. This establishes playback behavior; the instruments are synthesized rather than a recorded guitar performance.

### W31 campaign approaches delivered — 18 October 2026

Roadblock, convoy, forest-road, compound, checkpoint and village campaign missions now gain a 32–44 metre covered staging approach. Playable bounds expand to contain the whole squad with a margin; flanking rocks offer cover without blocking the centre or authored interactions. The existing objective areas, enemy strengths, convoy roadblocks and extraction points remain intact. The briefing explains the additional approach distance.

This expansion applies to campaign deployments, including settlement/condition variants. Standalone practice layouts remain the existing authored benchmarks. Cave and hilltop defence retain their preparation period and defensive positions: those missions intentionally begin at the objective being defended.

Seven deterministic checks cover all six expanded missions and both defence exceptions: full-squad spawns clear of obstacles, reachable original attack lines, larger bounds, eight seconds of quiet staging and at least ten metres of walking over four further seconds without alarm. Chromium verifies campaign Roadblock deployment into the larger area and subsequent completion. A three-run median 30-second simulation probe measured 0.0104–0.0392 ms CPU per step on these six maps; this is cloud simulation evidence, not W24 physical-device acceptance. W29 fullscreen persuasion dialogue is next.

### W29 — village dialogue (18 October 2026)

Village services now open a fullscreen representative portrait with A/B/C/D keyboard and pointer choices. D20 rolls show the die, liberated-village trust bonus (+3, otherwise +0), target and outcome. Price negotiation targets 12 and reduces barter costs by another ten percentage points for the current week. Recruitment targets 14 and adds one healthy, unequipped volunteer for one village meal, requiring liberation and a free roster slot; regular volunteer availability is preserved. Each topic resolves once per village per week, including failures, and survives reload. Normal village services remain available after failure. No resources or outcomes are committed if saving fails. Static presentation, focus return, keyboard exit and narrow-screen layout support access. This is a rudimentary village dialogue system; authored NPC stories and branching quests remain future work.

### W33 — Yantis culture and campaign opening (21 October 2026)

The [game design document](game-design-master-doc.html#culture) establishes Yantis as a home worth defending: righteous rebels, villainous foreign occupiers, and people/environments/music that support that emotional direction. Rebel music blends Southern Balkan and Mediterranean folk traditions using acoustic instruments and voices, with no synths. Occupier music is digital, modern and aggressive, with heavy synth/dubstep as the reference. Embedded listening references: LADANIVA — Saraiman, “Heroes” — Song of the Greek Partisans, and a Bosnian/Italian Bella Ciao cover.

Fresh campaigns fade in over the real island and slowly approach the band for 22 seconds. The exact text appears in sequence: “YOU ARE THE RESISTANCE.”, “FIVE YEARS AGO, THE INVADERS TOOK YOUR LAND”, “YOU HAVE ONLY ONE OBJECTIVE”, a two-second dramatic pause, then “DRIVE OUT THE INVADER / AND FREE YANTIS!”. Campaign dates begin in occupation year six to match five elapsed years. World simulation stays paused; pause and skip are available. Reduced motion shows the complete text on a stationary map. Completing or skipping is saved, interrupted new openings can resume, and legacy campaigns do not replay the prologue.

**WP-W34 — planned production work:** Replace the current synthesized campaign ambience with acoustic folk performances. Scene A is a rebel band playing folk guitar and strings around a campfire; Scene B is heavily equipped occupiers around an NPC listening to heavy synth dubstep. The document contains the staging, visual and emotional direction; these scenes and the acoustic soundtrack are not implemented by W33. Deliver soundtrack and scene staging as separate reviewable milestones. W21/W22/W23/W24/W25 remain open.

### W35 — combat usability and victory recovery (21 October 2026)

During combat the battlefield fills the available viewport; the explanatory sidebar is hidden. A compact control bar exposes Inventory (I), primary/secondary weapon selection (1/2), rebel switching, pause, SFX, current health/ammunition and the active objective. Briefing settings remain available before the mission begins. The inventory can open anywhere with a ground panel for dropped equipment.

Equipped slots now feed the actual selected weapon's ammunition, including two rifles of the same type. Switching or replacing a physical weapon cancels its stale reload; replacing a modified primary removes its old build modifiers and visual override. Empty ground piles no longer take precedence over nearby bodies.

Victory enters a recovery phase: battle time, enemies, projectiles and hazards freeze, while surviving rebels can move, switch control and search bodies. “Finish mission · take loot” closes recovery and commits the final carried kits and mission rewards once. Explicit Roadblock departure remains a departure; ordinary objective completion leaves the recovery window. Defeat still opens the debrief immediately. Leaving/reloading before explicit departure remains an unfinished deployment under the existing abandonment rules.

### W36 — recorded loot and map audio (21 October 2026)

The spoils screen now uses the same recorded gun-handling Foley as inventory, replacing synthesized reward blips/chords. Missing samples are silent on this screen; reveal timing, hurry controls and transfers do not depend on audio availability.

The campaign map has quiet recorded countryside ambience, gravel footsteps only while the band travels, occasional distant radio chatter and brief walla acknowledgements for march orders and button actions. It reuses local recordings, starts after a user gesture, limits simultaneous voices, stops on hidden/unloaded pages and respects SFX volume/mute. The map's Ambience button persists the shared SFX preference. Music remains separately controlled. W34's acoustic score replacement and authored campfire/occupier music scenes remain planned.

## Approved interface and reported blockers — 22 October 2026

- **W37 delivered:** approved paper campaign GUI. Left management, bottom-centre circular Play/Pause and time controls, right objectives and reports; retain existing island rendering.
- **W38 delivered:** project-wide loaders: centred placement, named loading phases/assets, measurable progress bars, honest indeterminate fallback and useful failure messages.
- **W39 investigated/fixed:** primary weapon looted from a body reportedly cannot fire/reload after replacement. Reproduce through combat and repair physical weapon/ammunition synchronization.
- **W40 investigated/improved:** bandages reportedly do not work. Verify use controls, reachable supply, consumption, healing and player feedback.

The reports above were logged before implementation. W37, W39/W40 and W38 were delivered in that order; reproduction findings and scope are recorded below.

### W39/W40 — weapon selection and medicine follow-up (22 October 2026)

A live-browser ordinary Primary swap already fired/reloaded correctly. The identified edge case was replacing Primary while the sling was selected: it left the sling active. Inventory Primary replacement now explicitly selects the new rifle; browser regression drags the corpse rifle onto Primary with a pistol selected beforehand, then fires and reloads it through real inputs. Post-victory recovery intentionally still freezes combat.

H on a bandage already heals correctly. Medicine now also has visible Use buttons alongside inventory panels, preserving double-click transfer. Browser checks full-health use consumes nothing, two uses restore 15 HP each, the spent bandage disappears, and both pointer and H work.

### W38 — loading feedback delivered (22 October 2026)

Shared loading bootstrap now covers map, 3-D map demo, combat, band, equipment wiki, weapon/operator/asset viewers and the three operator inspection pages. ID-specific legacy status styling no longer puts cards in the top-left corner. Cards show resource/stage names, accessible progress bars and clear reload guidance on loading failures. Three.js reports actual completed resource counts; the band tracks icon completion. Unknown-duration work remains explicitly indeterminate, never a timer-based fake percentage. Campaign terrain/sprites/vehicles/restoration, combat data and catalogue stages are named.

Browser checks cover all eleven loader placements and progress/error states. Live shell → map → band → mission remains free of demo imports, and the standalone map, workbench and operator load successfully. The protected original intro code is unchanged.

## Culture of Yantis — analogue homeland and technological occupation (22 October 2026)

Yantis is a fictional setting drawing on southern Europe and neighbouring regions: the Mediterranean, the southern Balkans and the Caucasus. It should feel a little suspended in time, with less technology, more analogue objects and a closer relationship with nature. Its people, buildings, clothing and music establish a home worth defending.

The central contrast is between the righteous Rebels and the evil Empire/occupiers. Their technological superiority should stand out against Yantis’s older, grounded way of life. This art direction reinforces the campaign’s scavenging loop: stealing the Empire’s superior weapons and using them to fight back should feel like a meaningful reversal of power.

**W41 — planned art-direction implementation:** apply this contrast to settlements, civilian/rebel clothing, everyday props, faction equipment and environmental storytelling. Use Vincent’s two image references: old stone monastery architecture beneath snowy mountains, and red traditional clothing in a meadow of poppies and wildflowers. Carry their sense of place, colour and connection to nature into the fictional island. Coordinate with W34’s acoustic folk music and faction vignettes. Preserve the normal 3-D island view; the paper treatment remains a GUI treatment.

Acceptance: a representative local settlement/rebel gathering and occupier position visibly communicate this contrast; starter equipment and captured occupier weapons make the progression from scarcity to fighting back legible. This is recorded direction and planned production, not a claim that new scene assets have been implemented.

> **Note from Vincent:** “We could use *Star Wars Rebels* as a reference here too, but honestly I’m just so over Star Wars, man. They’re making more Star Wars than I can watch each year.”

See the [Culture of Yantis design notes](game-design-master-doc.html#culture).


## 27 October 2026 — loading correction and W34 guitar shortlist

W38: Combat loading remains visible until sprite, loot, inventory and initial game setup finish,
then disappears before play. Cards reserve the same rectangle for phase text, progress and errors.
Browser regression covers all 11 maintained pages and practice/campaign combat at desktop and phone widths.

W34 music discovery (owner explicitly requested CC0 and real guitars):

- **First audition: [3 Acoustic Guitars (Instrumental), Aussens@iter](https://ccmixter.org/files/tobias_weber/56668)**.
  1:29, 108 BPM; artist explicitly identifies a recorded Walden steel-string guitar and CC0.
  Suggested for travel/camp based on its instrumental acoustic/chill description.
- **[Prelude For Classical Guitar (Instrumental), Aussens@iter](https://ccmixter.org/files/tobias_weber/57952)**.
  2:17, 110 BPM; artist identifies a recorded Yamaha CX40 acoustic guitar, DADGAD tuning and CC0.
  Candidate for quieter reflective scenes; amp processing is disclosed by the artist.
- **[A Small Fire Will Do, Trex0n](https://opengameart.org/content/a-small-fire-will-do-calming-loop)**.
  CC0 acoustic-guitar-tagged calming loop, a potential camp theme. Source does not confirm live guitar recording.

### W34 audio milestone — 27 October

Integrated **3 Acoustic Guitars** as the campaign default on `codex/campaign-acoustic-recording`.
The artist's page confirms a recorded Walden steel-string guitar and CC0. The local asset is
`assets/audio/campaign-acoustic-guitars.mp3`; no external audio requests are needed during play.
The original 88.97-second recording is encoded at 128 kbps stereo, attenuated by 6 dB, with a 0.12-second
fade-in and a 1.27-second fade-out beginning at 87.7 seconds. This is a repeated complete performance,
not a claim of a musically seamless loop. Source URL remains the first shortlist link above.

Preparation with FFmpeg: `-map_metadata -1 -af "volume=-6dB,afade=t=in:d=0.12,afade=t=out:st=87.7:d=1.27" -codec:a libmp3lame -b:a 128k -ar 44100`.
Campaign mode keeps the saved demo selection, mute and volume; shell navigation retains the same music player.
Owner listening acceptance and the separate faction vignettes remain open; W34 as a whole is not complete.
