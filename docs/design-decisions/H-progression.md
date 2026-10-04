# H · Progression (WP-S22 to S26; planned)

Your rebels level up. Upgrade paths follow the Mount & Blade: Bannerlord model: a rebel climbs tiers, each tier offers
two branches, and what a rebel can become depends on the equipment it carries. Principles: [00-principles.md](00-principles.md).
Depends on the campaign and the inventory ([D](D-campaign-unlocks.md), [C](C-inventory-looting.md)).

## The model

```
Tier 1  Recruit        any weapon
Tier 2  Fighter        any rifle
Tier 3  pick one       Assault ─ needs an assault rifle     Marksman ─ needs a scoped or DM rifle
                       Gunner ─ needs a machine gun         Demolitionist ─ needs a launcher
                       Signaller ─ needs a radio
Tier 4  two per Tier 3 e.g. Marksman → Sniper (needs a 4x scope) | Spotter (needs a radio or binoculars)
Tier 5  one capstone   e.g. Sniper → Ghost (needs a suppressor)
```

Each node is data: id, requirements (XP and equipment tags), perks, abilities, and the roles it leads to. The branch
list above is a starting point and is expected to change after feedback.

### TAC-H-01 · Each rebel is a hero with a tree, not a unit in a pool
- Status: planned  ·  Packet: WP-S22
- Decision: Mila, Dragan and each recruit have their own level, XP, perks and branch. There is no generic "troop"
  pool.
- Why: The squad is five or six people you care about (TAC-G-01). In Bannerlord the trees belong to troop types; here
  they belong to individuals because individuals are what you swap between.
- Alternatives rejected: A troop-type pool with numbers (loses the identity; contradicts swapping).
- Cost / risk: Smaller scale means every rebel must matter; recruits need names and a visible difference.
- Cost to change: Medium.
- Revisit if: The squad grows beyond about six.
- Owner feedback: —

### TAC-H-02 · XP comes from doing things, awarded to whoever did them
- Status: planned  ·  Packet: WP-S22
- Decision: Kills (more for harder roles: radio operator, marksman, MRAP gunner), objectives (more for required, some for
  optional), looting, surviving the mission. Credit goes to the rebel that did it (TAC-G-13).
- Why: It rewards the behaviours the game wants (kill the radio operator, take the cache, use the squad) and ties
  progression to play, not time.
- Alternatives rejected: Flat XP per mission; XP only for kills (rewards body count over tactics).
- Cost / risk: Needs tuning; the harness (WP-S16, S25) measures it.
- Cost to change: Low.
- Revisit if: Players grind low-value enemies.
- Owner feedback: —

### TAC-H-03 · Levels 1 to 10, one perk point per level
- Status: planned  ·  Packet: WP-S22
- Decision: Ten levels; a perk point per level; thresholds grow roughly quadratically so a three-mission campaign takes
  a rebel to about level 5 to 6.
- Why: A short campaign should feel like a visible climb, not a grind. Ten gives room for a longer game later.
- Alternatives rejected: 99 levels (meaningless numbers); few levels (too coarse).
- Cost / risk: Cap and curve are guesses.
- Cost to change: Trivial (a table).
- Revisit if: The demo ends before anyone reaches a branch.
- Owner feedback: —

### TAC-H-04 · The upgrade path depends on equipment, not only XP (the Bannerlord idea)
- Status: planned  ·  Packet: WP-S23
- Decision: A branch needs enough XP and an item of a required tag equipped or in the squad stash at the moment of the
  upgrade. A rebel with no SVD cannot become a Marksman; one who carries a PKM can become a Gunner.
- Why: This is the link between looting, the inventory and progression: stealing a PKM does not just give you a gun,
  it opens a future for the rebel who carries it. It also gives a reason to equip people differently.
- Alternatives rejected: Free choice of branch (equipment would not matter); branch locked at creation (no
  consequence for loot).
- Cost / risk: A player might be stuck if they never find the item; the stash and the unlock system must guarantee each
  tag is lootable in the first two missions.
- Cost to change: Medium.
- Revisit if: Players feel railroaded.
- Owner feedback: —

### TAC-H-05 · Two branches per tier, three tiers deep
- Status: planned  ·  Packet: WP-S23
- Decision: At tiers 3 to 5 there are two choices (tier 3 has five role families). Choices are permanent for the
  campaign, with a reset option on the sheet.
- Why: Few, meaningful choices read better than many; a reset option keeps experimentation safe.
- Alternatives rejected: A full skill tree (hard to read, hard to balance); no resets (punishing).
- Cost / risk: Needs a clear sheet UI (WP-S26) showing what each locked branch needs.
- Cost to change: Low (data).
- Revisit if: The tree feels shallow.
- Owner feedback: —

### TAC-H-06 · Perks are passive and about handling or information
- Status: planned  ·  Packet: WP-S24
- Decision: Perks change how a rebel operates (steadier aim while sneaking, faster search, quieter shots with a
  suppressor, quicker reloads, a larger loot carry), never the enemy's health or aim.
- Why: TAC-X-04 applied to progression: difficulty is knowledge, and our own growth should be tactical.
- Alternatives rejected: Raw stat increases (the squad snowballs; the enemy would need more health to compensate,
  which TAC-X-04 forbids).
- Cost / risk: Perks must be interesting without being numbers. Each needs a test.
- Cost to change: Low.
- Revisit if: Perks feel boring.
- Owner feedback: —

### TAC-H-07 · Abilities are active, short, on a cooldown, and tied to a branch
- Status: planned  ·  Packet: WP-S24
- Decision: Examples: Gunner "Suppressing fire" (a wide burst that pins), Marksman "Steady shot" (a held breath: a
  tight, slow shot), Demolitionist "Breach" (opens a wall or arms the mast charge), Signaller "Call the squad"
  (brings followers to you instantly), Assault "Rally" (nearby rebels recover suppression faster). Each rebel can
  have at most two.
- Why: Abilities give each rebel a signature reason to swap to them, in addition to their weapon.
- Alternatives rejected: Many abilities per rebel (unreadable); consumable-only abilities (inventory spam).
- Cost / risk: Abilities must be animated and readable; the swap UX shows them above the rebel.
- Cost to change: Low.
- Revisit if: A branch has no good ability idea; make it perk-only.
- Owner feedback: —

### TAC-H-08 · Teammate AI uses abilities; enemies do not (yet)
- Status: planned  ·  Packet: WP-S25
- Decision: Teammates use their abilities on simple triggers (a gunner uses Suppressing fire when a belief is strong and
  they are not pinned). Enemies have no abilities for now.
- Why: When you are not driving a rebel its abilities should still matter, otherwise swapping away wastes them.
  Enemy abilities would need more tuning than the demo has room for.
- Alternatives rejected: Player-only abilities (wasted when you swap away).
- Cost / risk: AI timing must not be spammy.
- Cost to change: Low.
- Revisit if: Late missions need enemy specials.
- Owner feedback: —

### TAC-H-09 · Progression is stored with the campaign and is per rebel
- Status: planned  ·  Packet: WP-S22
- Decision: XP, level, perk picks, branch and ability cooldown state (cooldown not saved) are part of the campaign save.
  Wounded rebels keep their XP.
- Why: Persistence is how it feels like progress. See TAC-X-07.
- Alternatives rejected: Per-mission resets.
- Cost / risk: Save format needs migration when trees change (data ids must be stable).
- Cost to change: Medium.
- Revisit if: Trees change between builds a lot (then keep a compatibility map).
- Owner feedback: —

### TAC-H-10 · A balance pass with the harness, not by feel
- Status: planned  ·  Packet: WP-S25
- Decision: After abilities exist, the AI harness (WP-S16) runs levelled squads and reports win rates; the target is
  more wins than an unlevelled squad but never above 90%.
- Why: Progression is where games get trivial; measurement is the safeguard.
- Alternatives rejected: Playtest-only tuning.
- Cost / risk: Needs a scripted levelled player, which is rougher than a human.
- Cost to change: Low.
- Revisit if: The scripted player is unrepresentative.
- Owner feedback: —

### TAC-H-11 · The rebel sheet shows what each locked branch needs
- Status: planned  ·  Packet: WP-S26
- Decision: The UI shows the tree, the XP and the gear requirement for each locked node ("Needs an SVD in the stash").
- Why: The Bannerlord idea only works if the player can see what to loot and why.
- Alternatives rejected: Hidden requirements.
- Cost / risk: Needs layout for small screens.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-H-12 · Rebel Band: a levelling and equipment demo on set paths
- Status: built (demo)  ·  Packet: WP-P (early)
- Decision: `band/` shows Bannerlord's party screen in the RimWorld + Nokia style. The stash is on the left, the leader or selected troop is a large paper-doll pawn in the middle, and the band is on the right by class (riflemen, heavy weapons, marksmen, support) with tier, count, experience and upgrade-ready counts. Troops climb set paths from the Village Volunteer, for example Partisan, then Rifleman, then Shock Trooper; or Hunter, Sharpshooter, Ghost Sniper; or Runner, then Medic, Signaller or Sapper. Each step spends the soldier's experience and the equipment the new troop carries, taken from the stash. The demo starts after a depot raid, with a generous stash and soldiers ready to upgrade. "Raid a patrol" gives experience, loot and volunteers, and levels the leader, whose Leadership raises the band limit. State lives in the browser (`parp-band`). The rules are pure and tested (`band/troops.js`).
- Why: Owner request: a demo of levelling along set paths where every path needs specific equipment, with plenty of stolen weapons to play with.
- Alternatives rejected: Free-form skill points (no equipment pressure); per-soldier inventories (too fine for a band screen).
- Cost / risk: Numbers are placeholders; raids are a button, not missions.
- Cost to change: Low (data in `band/troops.js`).
- Revisit if: Missions should feed the band (convoy loot into the stash, casualties out of it).
- Owner feedback: —

### TAC-H-13 · A deep class tree with abilities: Village Infantry to seven tiers of heavy, medium and light builds
- Status: built (demo)  ·  Packet: WP-P (early)
- Decision: The Rebel Band's troop list is replaced by a class tree of 44 classes over seven tiers. Every fighter goes Village Infantry, then Fighter, then Insurgent, then picks a build at tier 4: Heavy Fighter (firepower and armour), Guerrilla (the line and its specialists) or Skirmisher (eyes, range and stealth). From there the paths go to tier 7:
  - **Heavy:** Machine Gunner, Heavy Gunner, Gun Team Leader; Grenadier, Breacher, Demolitionist; Anti-Armour Gunner, Tank Hunter, ATGM Team Leader.
  - **Medium:** Rifleman, Veteran Rifleman, then Squad Leader or Shock Trooper; Combat Engineer, then Sapper (Master Sapper) or Fortifier; Medic, Field Surgeon, Combat Doctor; Drone Operator, then FPV Pilot (Swarm Commander) or Overwatch Operator; Signaller, Radio Operator, EW Specialist.
  - **Light:** Scout, Recon, then Pathfinder or Ghost; Marksman, Sharpshooter, then Ghost Sniper or Counter-Sniper; Saboteur, Infiltrator, Shadow.

  Every class brings two abilities, active or passive, written with the numbers the simulation will use (for example "Recon drone: shows every enemy within 40 m of a point for 20 s"). A soldier keeps the abilities of every class it came through. Each step costs experience (40 at tier 1, rising to 360 at tier 6) and the class's equipment from the stash: new gear includes drones, mines, jammers, night vision, engineer tools, surgical kits, a laser rangefinder and an ATGM. A full-screen Class Tree view lays out every path by tier, coloured by build, with the classes you have drawn thicker; a card per class shows its abilities, path, equipment and what it leads to. Saves use a new key (`parp-band-v2`), because the old troop list is retired.
- Why: Owner request: a character levelling tree with special abilities by class, going deep from village infantry through fighter and insurgent into heavy, medium and light builds.
- Alternatives rejected: Skill points per soldier (a band of dozens is managed by class, as in Bannerlord); abilities only at the top tiers (every step should feel like a gain).
- Cost / risk: The abilities are design data: the convoy simulation does not use them yet. Numbers are first guesses.
- Cost to change: Low (data in `band/troops.js`).
- Revisit if: Abilities move into the simulation (start with Recon drone, Patch up, Deploy bipod and Dig in, which map onto existing systems).
- Owner feedback: —
