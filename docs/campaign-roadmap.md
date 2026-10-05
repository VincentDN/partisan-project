# Partisan Campaign: the Bannerlord loop

Written 5 October 2026. This is the plan that joins the modules into one game. It is a plan, not a claim that the
features below exist yet; packet status in [packets.json](agent-ops/packets.json) (milestone **W**) is authoritative for
delivery. The [master roadmap](master-roadmap.md) remains the project index, and the
[tactical roadmap](tactical-roadmap.md) still owns the rules inside a mission (extraction, inventory, loss).

![Concept keyframe: four low-poly rebels around a map table in a lamp-lit hideout, planning the next raid](moodboard/keyframe-3-war-room.jpg)
*Between raids: the squad plans the next ambush over the island map. Concept art, reference only.*

## 1. The game in one paragraph

You load into the **world map** as your rebel band: one hooded figure on the island, with a nameplate showing your
strength. You click to move. Time runs while you march. **Invader convoys** drive the roads between towns and the
army base; reach one and you **launch the Convoy Ambush mission**. March on a **town, village or the base** and you
**launch the Compound Assault**. Meanwhile **enemy armies hunt you**: if one touches your band, it launches the **Rebel
Base Defence** mission (in the cave hideout when they catch you at camp, a hasty defence when they catch you in the
open). Every mission ends with **loot**. Loot and experience **upgrade your fighters** along the class tree (Village
Infantry to elite machine gunners, marksmen, drone operators). Stolen guns go to the **Weapon Modder**, and stolen
kit changes how your people look in the **Operator Customiser**. Stronger bands take bigger targets, the Invader
answers with bigger hunters, and in the end you drive them off the island. That is the full Bannerlord loop:
**move → fight → loot → upgrade → move on, stronger**.

## 2. The loop

```
                 ┌──────────────────────── WORLD MAP (map/) ─────────────────────────┐
                 │  your band moves · time runs · convoys drive · armies hunt you    │
                 └───────┬───────────────────────┬──────────────────────────┬────────┘
          you reach a convoy        you march on a settlement     an army touches you
                 ▼                       ▼                          ▼
          ENCOUNTER PANEL: enemy strength, terrain, your fighters ── Attack / Ambush / Withdraw
                 ▼                       ▼                          ▼
          Convoy Ambush            Compound Assault           Rebel Base Defence
          (convoy level)           (compound level)           (cave level / field variant)
                 └───────────────────────┼──────────────────────────┘
                                         ▼
                        DEBRIEF: survivors, wounds, experience, LOOT
                                         ▼
          BAND SCREEN (band/)  ─ promote fighters with experience + stolen gear
          WEAPON MODDER (workbench/) ─ fit owned attachments to owned guns
          OPERATOR CUSTOMISER (operator/) ─ the look follows the kit
                                         ▼
                        back to the WORLD MAP: changed territory, more heat
```

## 3. What each module brings today

The campaign is mostly **wiring**: most of the parts exist as separate demos. The table is from the code on `main`
(5 October 2026).

| Module | What exists | Its job in the campaign | Missing for the campaign |
|---|---|---|---|
| **World map** (`map/`) | 3-D island with provinces, nine settlements, roads, three factions; the player's Recon figure, Invader patrols, convoys driving the roads, nameplates, time controls, province card. Placeholder only, nothing wired | The campaign screen: movement, time, encounters, territory | Click-to-move, a world simulation, real AI parties, encounters, save |
| **Partisan Tactical** (`convoy/`) | Three levels as data: **Convoy ambush**, **Compound assault** (guards, alarm, armoury cache, radio mast), **Cave hideout defence** (three waves at night, hold until dawn). Squad control, orders, abilities, AI, difficulty, 2.5-D sprite view | Every fight. The three levels are the three encounter types | Parameters from the map (enemy strength, cargo, time of day), launch from and return to the map |
| **Loot** (`convoy/loot.js`) | Seeded loot rolled from the Equipment Wiki catalogue per level; gear goes to the stash, the rest is trade goods sold for scrip; salvage from wrecks | What a mission pays | Loot driven by what you fought (convoy cargo manifest, settlement armoury) |
| **Progression** (`convoy/progression.js`, `camp.js`) | Three rebels earn experience (kills, objectives, survival, victory) and are promoted for experience plus equipment; camp screen with stash and trader | The upgrade rules | One save shared with the band and the map |
| **Rebel Band** (`band/`) | Bannerlord party screen: stash, selected soldier, band by class; a class tree of over 40 troop types in heavy, medium and light builds to elite tiers; each step costs experience and the kit the new class carries | The party screen you open from the map | Read and write the campaign save instead of its own; feed the deploy screen |
| **Weapon Modder** (`workbench/`) | 11 rifles, universal attachments, stats, P1 build codes | Where stolen guns and parts are fitted | Show only what you own; assign a build to a fighter |
| **Operator Customiser** (`operator/`) | Recon, Insurgent and Enforcer bases, equipment slots, poses, the Workbench build carried onto the character | How your fighters look, on the map and in the field | Looks from owned kit and class |
| **Equipment Wiki** (`wiki/`) | The item catalogue the loot rolls from | The codex: what an item is and where it drops | "Where to steal it" from campaign data |

Two existing plans touch this one:

- The **tactical roadmap** plans durable inventory (unique item instances, `WP-S8`), save transactions (`WP-S29`) and
  extraction rules (`WP-S30`). The campaign's first playable slice does **not wait** for them. It uses today's
  stash-of-counts and scrip and adopts those packets when they land, so the two milestones meet rather than block.
- The **graphics roadmap** planned a retro, handheld-RPG style flat overworld (`WP-V14` to `V16`). The owner has since
  asked for the Bannerlord-style 3-D map that now exists in `map/`. Decided (TAC-K-04): the 3-D map **is** the
  overworld, and V14 to V16 are retired into W3, W4 and W8. V17's island data format is already `map/island.js`.

## 4. The world map, in detail

### 4.1 Your band on the map

- **Click to move.** A path is found over land on a navigation grid baked from the heightfield. Roads are fast, open
  ground normal, forest and slopes slow, snow slower, and the sea is impassable. A dotted line previews the route.
- **Speed** depends on the band's size, its slowest troop tier and wounded fighters carried (Bannerlord's rule:
  small bands are fast).
- **The clock.** Time runs only while you move or press play (Space pauses, 1–3 set speed). Day and night tint the map,
  and night shrinks everyone's sight. Encounters and menus pause the clock.
- **Camp.** Oros Camp is your home: there you rest (wounds heal over days) and keep the stash. Your band always
  carries what it is wearing; the rest of the stash stays at camp.

### 4.2 The Invader moves too

| Party | Behaviour | What touching it means |
|---|---|---|
| **Supply convoy** | Spawns at Fort Orion or a town, drives a road route between settlements with a cargo manifest (ammo, weapons, fuel, radios) and an escort; arriving resupplies the garrison | You reach it → **Convoy Ambush** |
| **Patrol** | Walks a loop near Invader settlements; small | It sees you and closes → **defence** (hasty), or you attack it (a light convoy-style fight) |
| **Hunter column** | Spawned by **heat**; searches where you were last reported, follows tracks, gives up after a while | It touches you → **Rebel Base Defence** |
| **Garrison** | Stays in its settlement; strength from `SETTLEMENTS` (garrison, militia) | You march on it → **Compound Assault** |

- **Detection.** Every party has a sight radius on the map: smaller at night, in forest and in the mountains, larger
  for big bands. A party that sees you remembers where (a last-seen marker, Bannerlord's "spotted"). Hunters track the
  last-seen point, not your true position, so you can lose them.
- **Heat** rises with every attack, and faster for attacks near Invader towns. It cools while you stay hidden.
  Heat decides how many hunters are out and how strong they are. The camp is hidden until a hunter finds it or an
  informant sells it; then the army comes for the cave.

### 4.3 Encounters

When two parties meet, the clock stops and an **encounter panel** opens (Bannerlord's encounter menu, in the Nokia
UI): both sides' strength and troop tiers, the ground, the time of day, and the choices.

| Who started it | Choices |
|---|---|
| You reached a convoy | **Attack** (the convoy is moving: ambush on the road), **Prepare ambush** (spend an hour: you start in cover, they drive in) when you are ahead of it on its route, **Let it pass** |
| You marched on a settlement | **Assault** (loud), **Infiltrate** at night (the stealth start of the compound level), **Leave** |
| An army touched you | **Defend** (mission), **Withdraw** (leave a rearguard of fighters you choose, or drop supplies, and break contact), **Surrender** is not offered |
| A lopsided fight (you are 2.5 times stronger, or it is a lone patrol) | **Auto-resolve** (TAC-K-02): odds and expected wounds shown first; a little worse than playing it (more wounds, a quarter less loot); never for the camp, a capture or the finale |

## 5. The three missions, launched from the map

The levels exist; what is new is that the map **sets them up** and **receives the result**.

| Encounter | Level | What the map sets | What the result changes on the map |
|---|---|---|---|
| Convoy | `convoy` | Vehicles and escort from the convoy party; cargo manifest = the loot table; time of day; ambush preparation = start positions | Convoy destroyed (wreck on the road) or escaped with losses; cargo captured; garrison not resupplied |
| Settlement | `compound` | Defenders from garrison and militia; layout variant per settlement kind (village, town, the base); alarm state from heat; night if infiltrating | Settlement raided (armoury loot, garrison reduced) or **captured** (province turns green); survivors flee as a party |
| Caught at camp | `cave` | Wave sizes from the hunter column; your camp's defenders and stash are present | Hunters broken: they retreat and heat drops. Camp overrun (TAC-K-03): half of every camp stack is lost (rounded down), the fallen are wounded, the band falls back to the nearest friendly settlement and heat halves |
| Caught in the open | `defence` (new variant) | A hasty defence on the local ground type (forest, hill, coast) with the hunter's strength | As above, without the camp stakes |

**Deployment.** Before every mission a **deploy screen** picks up to four fighters from the band (you play them all,
switching between them as today). The rest of the band stays on the map. The fighters' classes decide their abilities
and kit; their weapons are the builds assigned in the Weapon Modder.

**The bridge.** The map and the missions stay separate pages (they are separate modules today, and that keeps each one
loadable and testable on its own). The save is the source of truth:

1. The map writes a **deployment** into the campaign save: encounter id, level, seed, enemy strength and kit, ground,
   time, the deployed fighters and their kit. The kit is **reserved**: it is on their bodies, not in the stash.
2. It opens `convoy/?campaign=<id>&encounter=<id>`. The mission reads the deployment instead of its own mission select.
3. The debrief's **Return to the map** writes one immutable **result** (outcome, survivors, wounds, experience, kills,
   loot, what was destroyed or captured) and goes back to `map/`.
4. The map **settles** the result exactly once (keyed on the encounter id), shows it as a toast and in the world (a
   wreck, smoke over a raided compound), and saves.
5. A refresh or closed tab mid-mission counts as **withdrawn** when the map next opens: the deployed fighters return
   wounded, their carried loot is lost. No free retries (the tactical roadmap's rule).

## 6. Loot and the upgrade loop

1. **Debrief loot** lands in the band's stash with its source ("from the Kastro convoy"). Convoy loot comes from the
   cargo manifest; compound loot from the armoury; defence loot from the attackers' bodies.
2. **The band screen** opens from the map (P). It is today's `band/` screen on the campaign save: promote a fighter
   when they have the experience and the stash has the kit the new class carries. Promotions use the gear, so choosing
   who gets the PKM is the decision.
3. **Weapons** in the stash open in the **Weapon Modder** with only owned attachments selectable (locked ones show where
   they drop). A finished build is assigned to a fighter and used in their next mission.
4. **Looks** follow the kit: a fighter's class and owned wearables set their Operator Customiser look and their figure
   on the map.
5. **Recruits** come from villages that like you: Village Infantry, tier 1 of the class tree. Liberated villages give
   more, and better.
6. **Trade** (TAC-K-01): **no shop at home.** Trade goods are bartered item for item at neutral and liberated villages,
   from a small seeded stock that refreshes weekly (liberated villages stock more and give better rates). Trade is a
   reason to move and to free villages, never a menu at camp. The camp trader stays in practice mode.

## 7. Territory and escalation

- **Capturing** a settlement turns its province green. It gives recruits, food and a safe place to rest, and the
  Invader will try to take it back (a garrison defence, the compound level in reverse).
- **The escalation director** reads the Resistance's strength (band size, tiers, territory) and raises the Invader's
  response in tiers: patrols → hunter columns → armoured columns with an MRAP → air reconnaissance that finds the camp.
  Mission difficulty and enemy kit follow the tier, so stolen gear stays relevant.
- **The end.** When Fort Orion is the last Invader seat, the final mission is its assault: a multi-stage compound
  level. **Defeat** comes only when the band is wiped out in a defence and no friendly settlement is left to fall back
  to; until then every loss, an overrun camp included, is a setback, not a game over (TAC-K-03).

## 8. How the code fits together

| Location | Responsibility | Notes |
|---|---|---|
| `shared/campaign/state.js` | One versioned campaign save: world (parties, settlements, heat, clock), band (fighters, classes, experience, wounds), stash, scrip, encounter log | Pure, no DOM. Migrates `parp-squad-v1` and the Rebel Band save |
| `shared/campaign/world.js` | The world simulation: party movement, goals, sight, pursuit, convoys, heat, escalation | Pure and seeded; steps headless at any speed; unit-tested |
| `shared/campaign/nav.js` | Navigation grid from `map/island.js` heights and roads; path search | Pure; shared by the band and the AI parties |
| `shared/campaign/encounter.js` | Contact rules, the encounter options, auto-resolve, deployment and result payloads, settlement of a result | Pure; the one place the map and the missions meet |
| `map/` | Renders the world state, input, the encounter panel, the clock, toasts | Today's demo becomes the campaign view |
| `convoy/` | Reads a deployment, sets up the level, writes the result | Without `?campaign` it stays the practice sandbox |
| `band/`, `workbench/`, `operator/` | Read and write the campaign's band and stash through `state.js` | Each keeps working on its own outside a campaign |
| `tools/campaign/bench.mjs` | Runs seeded campaigns headless with auto-resolve and reports pacing | Tuning, like the tactical AI harness |

Storage starts in `localStorage` (as every module does today) behind a small adapter, so the tactical roadmap's
IndexedDB and transaction work (`WP-S29`) can replace it without touching the rules.

## 9. Delivery: milestone W

Phases are in order; each ends in something playable. Sizes are the packet sizes of the agent-ops system (XS 3,
S 8, M 20 budget units). The full packet list with acceptance criteria is in [packets.json](agent-ops/packets.json).

### Phase 0 · The spine

| Packet | What | Size |
|---|---|---|
| `WP-W1` | Campaign save v1: one versioned state for world, band, stash and log; migrate the tactical squad and Rebel Band saves; storage adapter | S |
| `WP-W2` | Mission bridge: deployment and result payloads, reservation on launch, settle exactly once, refresh = withdrawn | M |

### Phase 1 · Moving on the map

| Packet | What | Size |
|---|---|---|
| `WP-W3` | The band on the map: navigation grid, click to move, route preview, terrain speeds, follow camera | M |
| `WP-W4` | Campaign clock: pause and speeds, day and night, pause on encounters and menus | S |
| `WP-W5` | World simulation core: seeded headless parties with goals, speeds and sight; save and restore; determinism tests | M |

### Phase 2 · The Invader moves

| Packet | What | Size |
|---|---|---|
| `WP-W6` | Convoys: spawn, road routes, cargo manifest and escort on the nameplate, resupply on arrival | S |
| `WP-W7` | Hunters and heat: patrols, hunter columns, map sight (night, forest, band size), last-seen tracking, losing them | M |
| `WP-W8` | Encounters: contact rules and the encounter panel (Attack, Prepare ambush, Withdraw with a rearguard) | S |

### Phase 3 · Missions from the map (**the first playable loop ends here**)

| Packet | What | Size |
|---|---|---|
| `WP-W12` | Deploy screen: pick up to four fighters from the band; one squad model for the band and the missions | S |
| `WP-W9` | Convoy encounter → Convoy Ambush, set up from the convoy party; result back to the map | M |
| `WP-W11` | Caught by an army → Rebel Base Defence (cave at camp, new hasty-defence variant in the open) | M |
| `WP-W13` | Return to the map: settle casualties, wounds, experience, kills and aftermath; autosave | S |
| `WP-W14` | Loot into the band: cargo manifest and level loot into the stash, with its source | S |
| `WP-W15` | The band screen on the campaign save, opened from the map; promotions with experience and stolen kit | M |

**Gate W-A (first loop):** start a campaign, march to a convoy, win the ambush, bring loot home, promote a fighter
with it, get caught by a hunter column, survive the cave defence, all in one save that survives a reload.

### Phase 4 · Settlements, guns and looks

| Packet | What | Size |
|---|---|---|
| `WP-W10` | Settlement → Compound Assault, defenders from garrison and militia, variants per settlement kind, infiltrate at night | M |
| `WP-W16` | Owned guns in the Weapon Modder; assign a build to a fighter for the next mission | M |
| `WP-W17` | Looks from owned kit and class, in the customiser and on the map figure | S |
| `WP-W18` | Recruits and barter at friendly villages | S |

### Phase 5 · Territory, escalation, the end

| Packet | What | Size |
|---|---|---|
| `WP-W19` | Territory: capture settlements, what they give, Invader counter-attacks | M |
| `WP-W20` | Escalation director: response tiers drive hunters, mission difficulty and enemy kit | M |
| `WP-W21` | Endgame and defeat: the Fort Orion assault, the camp-overrun defeat, campaign summary | M |

### Phase 6 · Quality

| Packet | What | Size |
|---|---|---|
| `WP-W22` | Auto-resolve for lopsided fights, odds shown first, never better than playing (TAC-K-02) | S |
| `WP-W23` | Campaign harness: fifty seeded headless campaigns, pacing report, tuning pass | S |
| `WP-W24` | Campaign end-to-end tests (map → mission → map), two-tab and refresh safety, map performance on a phone | M |
| `WP-W25` | First-campaign prompts, design doc campaign section, changelog, index entry | S |

**Decisions** (`WP-W26`, done 5 October 2026, delegated by the owner; reasoning in
[design-decisions/K-campaign.md](design-decisions/K-campaign.md)):

| Question | Decision |
|---|---|
| Trade | No shop at home; barter at neutral and liberated villages only (TAC-K-01) |
| Auto-resolve | Only for lopsided fights, never for the camp, a capture or the finale, and always a little worse than playing (TAC-K-02) |
| Camp overrun | Half of each camp stack lost, the fallen wounded, fall back to a friendly settlement, heat halved; game over only with no settlement left (TAC-K-03) |
| Overworld | The 3-D map in `map/` is the overworld; retro packets WP-V14 to V16 retired (TAC-K-04) |

## 10. Pacing targets

These are starting points for the harness to test, not measurements.

| Measure | Target |
|---|---|
| First encounter after starting a campaign | Under 2 minutes |
| A mission | 5–12 minutes (the tactical roadmap's session length) |
| Map time between missions | 1–3 minutes of marching, choosing, upgrading |
| First promotion | After the first or second mission |
| First hunter contact | Within the first three missions |
| A full campaign | 6–10 hours |

## 11. Acceptance

| Area | The campaign is right when |
|---|---|
| State | One save holds everything; reloading at any point (map, deploy, mid-mission, debrief) resumes or settles correctly and never duplicates loot |
| Determinism | The same seed and the same orders give the same world, in headless tests |
| Bridge | Every mission can be played on its own (practice) and from the map (campaign) |
| Fairness | Odds are shown before every fight; hunters are visible before they touch you, unless at night or in forest |
| Loop | Loot from a mission can be used for a promotion, a gun build or a look before the next mission |
| Performance | The map at 60 fps on a desktop and 30 fps on a mid-range phone with every party moving |
| Accessibility | The map, encounter panel and band screen work by keyboard and with reduced motion |

## 12. Risks

| Risk | Mitigation |
|---|---|
| Wiring four demos means changing four saves | One state module and migrations first (W1); each module keeps a standalone mode |
| The world sim becomes a second game to balance | Headless harness (W23) from the start; few party types until the loop is fun |
| Being hunted feels unfair | Visible sight radii, last-seen markers, withdraw with a rearguard, odds before every fight |
| Missions get repetitive | Parameters from the map (cargo, garrison, ground, time of day) before new levels |
| Overlap with the tactical extraction packets | The slice uses today's stash; S8 and S29 replace the internals later without changing the loop |
