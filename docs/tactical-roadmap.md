# Partisan Tactical: roadmap

The top-down shooter (`convoy/`, today a single convoy ambush) grows into the demo of the whole game loop: three
scenarios, looting, a squad inventory, an AI that thinks in beliefs, and unlocks that carry into the Weapon Modder.
Milestone **S** in `docs/agent-ops/packets.json`; packets `WP-S1` to `WP-S26`. No packet is bigger than M (20 BU).

**Every decision and its reasoning is written down in [design-decisions/](design-decisions/README.md)**, one document per section, with stable IDs (for example `TAC-A-07`) you can quote when giving feedback. A packet is not done until its decisions are logged there.

## The loop

```
Briefing ──> Mission (fight, loot) ──> Extract ──> Debrief ──> Stash & loadouts ──> next Briefing
                    │                                   │
                    └── stolen weapons & parts ─────────┴──> unlocked in the Weapon Modder / Operator Customiser
```

You do not play one hero: **you play the whole squad.** One rebel is yours at a time; the others follow orders. When
yours falls you swap to another, and you can swap on purpose at any moment (a short slow-motion zoom-out, hover the rebel
you want, take control). You do not buy anything. Everything your squad carries was taken from the army, and everything
taken shows up in the Weapon Modder. Your rebels also level up, with Bannerlord-style upgrade paths that depend on the
gear they carry. The demo plays as a three-mission campaign: **1 Convoy ambush** (exists), **2 Compound assault**,
**3 Cave hideout defence**.

## Decisions (defaults; the owner can change them)

| Question | Default | Why |
|---|---|---|
| Real-time or turn-based | Real-time, top-down, with a tactical pause (Space) for orders | Keeps the current feel; pause makes squad orders readable |
| Squad size | You + 3 (Mila, Dragan, one recruit after mission 1) | Enough for orders and loadouts, few enough to read |
| Who you play | Every rebel, one at a time (swap by button or on death) | The story is a squad, not a hero; death costs position, not the mission |
| Losing a mission | Only when every rebel is down | Dying is a swap, not a game over |
| Teammate death | Wounded, not killed: misses the next mission | Loss without a dead save in a short demo |
| Progression | Per-rebel levels, equipment-gated upgrade tiers, perks and abilities | Gear decides what a rebel can become, so looting and levelling reinforce each other |
| What looting gives the shooter | Physical items in a finite stash (one PKM is one PKM) | Scarcity makes looting matter |
| What looting gives the Modder | A permanent unlock the first time the item is **extracted** | Risk: loot you die with is lost |
| Unlock all for demos | `?unlock=all` on any page | The Modder must still show everything to visitors |
| Persistence | `localStorage`, versioned (`parp-tactical-v1`), with a Reset button | Static site, no accounts |

## Sections and packets

Work in section order: each section ends playable and tested. Sizes: XS 3, S 8, M 20 BU.

### Section A: Foundations (turn the single level into a game)

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S1 | M | **Level framework.** Level data format (map, cover, spawns, vehicles, AI groups, objectives, loot tables, lighting); `Sim` takes a level; convoy becomes level 1 unchanged; module renamed *Partisan Tactical* (`convoy/` keeps working) with a mission select | Convoy plays as before and its seeded replay test still passes; a test level loads from data |
| WP-S2 | S | **Objectives and outcomes.** Objective types: eliminate, reach zone, destroy target, steal item, hold until timer, protect, extract; mission timer; debrief screen (kills, loot, wounded, time) | Each type has a unit test; the convoy ends on its objectives, not on a hard-coded rule |
| WP-S3 | M | **Squad orders.** Select teammates (1–4 / click), orders: follow, hold here, move to, attack target, cover sector; tactical pause with Space; order markers | Orders work under pause; unit test for each order |
| WP-S4 | S | **AI behaviours for new scenarios.** Guard posts, patrol routes, alarm propagation between groups, reinforcement call (needs a living radio operator), attacker waves that bound from cover to cover toward an objective | Unit tests for patrol, alarm, reinforcement-without-radio and bounding advance |

### Section B: The two new levels

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S5 | M | **Level 2: Compound assault.** Walled farm compound: gate, two guard towers, barracks, armoury, radio mast. Starts quiet (patrols, suspicion, bodies can be found); alarm brings a reinforcement truck if the radio still works. Objectives: steal the armoury cache, destroy the mast (optional), extract | Winnable stealthy and loud in the headless harness (WP-S16); smoke test |
| WP-S6 | M | **Level 3: Cave hideout defence.** Your camp in a cave: entrance, two tunnels, fallback chamber. Night; the army attacks in three waves (rifle squads, MG team, MRAP with searchlight). Before the fight you place your squad and spend the stash. Objective: hold until dawn (timer) or break the attack | Three waves run from data; winnable with a sensible loadout; smoke test |
| WP-S7 | S | **Level visuals** (retired: delivered by the 2-D renderer, [graphics-roadmap.md](graphics-roadmap.md) WP-V9 and V12). Roof cut-away when inside buildings, cave darkness with lamp light and muzzle flashes, night lighting and searchlight cone | Screenshots of each level in the contact sheet; still 60 fps on a mid laptop |

### Section G: Play as the whole squad (new; built right after A, before the new levels)

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S20 | M | **Active rebel.** `sim.player` becomes "the rebel you control". All rebels have their own loadout, health, ammo and stats. When yours dies you swap to another; the mission is lost only when every rebel is down. The rebel you leave becomes AI-controlled and keeps its order (or holds) | Unit tests for swap, death-swap, all-down loss, per-rebel state; convoy replays still pass |
| WP-S21 | S | **Swap UX.** Switch button (Q): time slows to about 15%, the camera zooms out to show the squad, rebels highlight as you hover, click (or press 1–4) to take control and the camera glides in. Death triggers it automatically. Reduced motion: instant cut with a highlight | Smoke test swaps by hover and by death; axe passes |

### Section H: Progression (after the campaign exists)

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S22 | M | **Progression core.** XP from kills, objectives, looting and surviving; levels 1–10 per rebel; a perk point per level; saved with the campaign | Unit tests for awards, thresholds and persistence |
| WP-S23 | M | **Upgrade trees (Bannerlord model).** Tiers per rebel, two branches per tier; a branch needs XP **and** the right equipment (an SVD for Marksman, a PKM for Gunner, a launcher for Demolitionist, a radio for Signaller). The tree is data | A rebel with an SVD can take Marksman and one without cannot |
| WP-S24 | M | **Perks and abilities.** Passive perks, and active abilities with cooldowns unlocked by branch | Each perk/ability tested; none changes enemy health or aim |
| WP-S25 | S | **Teammate AI uses abilities;** balance pass with the tuning harness | Levelled squads win more but never trivialise a level |
| WP-S26 | S | **Rebel sheet UI.** Level, XP, the tree with locked branches and the gear they need, perk picks | Keyboard operable; axe passes; smoke test picks a perk |

### Section C: Inventory and looting

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S8 | M | **Item model and inventory core** (pure data, no DOM). Items: weapons (with installed attachments), attachments, magazines and ammo, grenades and rockets, gear (helmet, vest, radio). Per-character loadout slots (primary, launcher, sidearm, 4 attachment mounts, 2 utility, armour) + squad stash with capacity. IDs shared with `workbench/attachments.js` and `convoy/weapons.js`. Versioned save format | Unit tests: equip, unequip, install/remove attachment (Workbench compatibility rules), stash capacity, save/load round trip, migration |
| WP-S9 | M | **Looting in levels.** Soldiers drop their kit (weapon with its attachments, spare mags, grenades); vehicles have cargo (crates, the MRAP's DShK, ammo); hold **E** to search: takes seconds and you can be shot; carry limit per character; a teammate can be ordered to loot | Loot tables per role and vehicle; unit tests; smoke test loots a body |
| WP-S10 | M | **Inventory UI.** Loot panel in the field; squad screen between missions (click to equip, drag on desktop), attachment install with the Workbench's compatibility reasons, stat deltas on hover; Nokia-green panel style | Keyboard operable; axe passes; smoke test equips a looted PKM on Dragan |
| WP-S11 | S | **Loadouts drive the fight.** Teammate AI uses the equipped weapon and attachments (optic: range, suppressor: quieter, so less hearing; extended mag: longer bursts); ammo is consumed from what they carry; empty means switching to the sidearm | Unit tests: a suppressor shrinks the army's hearing radius; ammo runs out |

### Section D: Campaign and unlocks

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S12 | S | **Campaign flow.** Three missions in order; squad, stash and wounds persist; briefing and debrief screens; a recruit joins after mission 1; Reset campaign | Save survives a reload; unit test of the campaign state machine |
| WP-S13 | M | **Unlocks into the Weapon Modder.** `shared/unlocks.js`: first extraction of an item unlocks it. The Modder shows locked rifles and parts greyed with "Steal it in Compound Assault"; `?unlock=all` unlocks everything | Steal a part in the shooter, see it unlocked in the Modder (smoke test); locked items cannot be equipped |
| WP-S14 | S | **Unlocks into the Operator Customiser.** Looted helmets, vests, NVGs and patches unlock kit in the Customiser the same way | Smoke test: a looted helmet unlocks there |

### Section E: AI depth

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S15 | M | **AI v2.** Investigate noises and bodies; search patterns around the last known position; per-squad morale (casualties, leader down, flanked) leading to fall back or surrender; callouts for each; AI view shows the timeline of what each soldier believed | Unit tests per behaviour; the AI view replays the last 30 s |
| WP-S16 | S | **AI tuning harness.** `tools/ai/bench.mjs`: headless runs over seeds × awareness × scripted player styles per level: win rate, time, casualties, loot taken | Report table in the PR; each level winnable 40–70% by the scripted player at 50% awareness |

### Section F: Quality and docs

| Packet | Size | What | Done when |
|---|---|---|---|
| WP-S17 | S | **Tests and performance.** Smoke per level, inventory and unlock e2e, phone performance budget (entities, draw calls), CI stays under 10 minutes | Green CI; perf numbers recorded |
| WP-S18 | S | **Touch controls.** Twin-stick on phones, tap to loot, long-press for orders | Playable on a phone in the emulator test |
| WP-S19 | XS | **Docs.** Game design doc sections (scenarios, loot loop, unlock economy), changelog, index entry renamed *Partisan Tactical* | Doc renders; links work |

## Order of work

1. **A** (S1 → S2, S3, S4): everything else stands on the level framework. *Done.*
2. **G** (S20 → S21): play as the squad, before the new levels so they are designed around swapping.
3. **C core** (S8) in parallel with **B** (S5, S6): the levels need loot tables, the inventory needs nothing visual.
4. **C rest** (S9 → S10 → S11), then **D** (S12 → S13 → S14).
5. **H** (S22 → S23 → S24 → S25, S26): progression needs the campaign (S12) and the inventory (S8).
6. **E** and **F** close it out; S16 starts as soon as S1 lands and is re-run after every level and AI change.

About 360 BU in total (13 × M, 11 × S, 2 × XS), roughly three and a half usage windows. Section A (45 BU) is built.

## Graphics

The shooter is moving from 3-D to RimWorld-style 2.5-D sprites, and the campaign map gets a retro island look. See [graphics-roadmap.md](graphics-roadmap.md); it runs in parallel with everything above.

## Risks

- **Scope creep in levels.** Each level is data on one framework; new mechanics go to their own packet, never inside a level packet.
- **Inventory UI on phones.** Click-to-equip first, drag only on desktop; touch gets its own packet (S18).
- **Balancing three levels by hand.** The headless harness (S16) makes balance measurable instead of felt.
- **Swapping must feel good, not fiddly.** Slow-motion and zoom are the whole feature; S21 gets its own packet and a reduced-motion path instead of being folded into S20.
- **Progression inflating the squad.** Perks never touch enemy health or aim, abilities have cooldowns, and S25 measures win rates so levelling cannot trivialise a level.
- **Real models.** The shooter uses simple shapes until the Sketchfab sources land (`inbound/sketchfab/`); swapping them in is a renderer change only.
