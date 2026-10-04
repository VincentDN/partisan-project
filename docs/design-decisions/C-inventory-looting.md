# C · Inventory and looting (WP-S8 to S11; planned)

You steal from vehicles and soldiers, then use what you stole to equip your rebels. Principles: [00-principles.md](00-principles.md).

## Items (WP-S8)

### TAC-C-01 · An item is an id plus modifications; weapons carry their attachments
- Status: planned  ·  Packet: WP-S8
- Decision: `{id, kind, mods: [...]}` where kind is weapon, attachment, magazine, grenade, rocket, armour or gear. A weapon's
  `mods` are the attachments installed on it.
- Why: One item model for the shooter and the Weapon Modder. A looted AK with an optic is one item the Modder can open
  and edit.
- Alternatives rejected: Separate shooter and Modder item types (a translation layer that would drift).
- Cost / risk: The item schema becomes the save format; changing it needs migration (TAC-X-07).
- Cost to change: High after saves exist.
- Revisit if: A new kind (a medkit, a map) does not fit.
- Owner feedback: —

### TAC-C-02 · Item ids come from the Workbench; combat stats are reconciled in one place
- Status: planned  ·  Packet: WP-S8
- Decision: Weapon and attachment ids are the Workbench's (`workbench/models.js`, `attachments.js`); the shooter's
  `weapons.js` gains a mapping from Workbench weapons to combat stats, and attachments carry modifiers (optic: sight
  range, suppressor: quieter shots, extended magazine: bigger magazine, foregrip: less spread).
- Why: The promise is "steal it, then use it in the Modder". That is only coherent if both modules mean the same
  object. A mapping avoids rewriting either system.
- Alternatives rejected: Stats derived directly from the Workbench's illustrative numbers (they are on a 0 to 100
  scale and not combat-ready).
- Cost / risk: The Workbench has three rifles and the shooter six weapons; the roadmap adds more (G3, M16, Mk14, SIG Spear,
  StG 44, PPSh-41, Bren, Chauchat). Items without a Modder model show a placeholder.
- Cost to change: Medium.
- Revisit if: The real models arrive and weapon stats should come from them.
- Owner feedback: —

### TAC-C-03 · Slots, not kilograms
- Status: planned  ·  Packet: WP-S8
- Decision: Each rebel has a fixed set of slots: primary, launcher, sidearm, four attachment mounts, two utility, one
  armour. The squad stash has a number of slots.
- Why: Readable, fast to equip, easy to test and to show on a small screen. Weight is realism that costs UI and
  balance work.
- Alternatives rejected: A weight system (more tuning, no clear benefit at demo scale).
- Cost / risk: Less "one more thing" tension in what you carry.
- Cost to change: Medium.
- Revisit if: Looting feels unconstrained; add a carry limit per rebel before weights.
- Owner feedback: —

### TAC-C-04 · Everything is physical and finite
- Status: planned  ·  Packet: WP-S8, S9
- Decision: One PKM is one PKM. If you equip it to Dragan it is not in the stash. Dropped gear lies on the ground
  where it fell, and soldiers who flee take theirs with them.
- Why: Scarcity makes looting matter and decisions about who gets the machine gun meaningful.
- Alternatives rejected: Infinite stash (no choices); automatic duplication.
- Cost / risk: A frustrating state is possible (no RPG when the MRAP appears); levels must guarantee the key items.
- Cost to change: Low.
- Revisit if: Players get stuck.
- Owner feedback: —

## Looting (WP-S9)

### TAC-C-05 · Soldiers drop their kit; vehicles have cargo; searching takes time and exposes you
- Status: planned  ·  Packet: WP-S9
- Decision: A dead soldier drops his weapon with its attachments, spare magazines and grenades, by role (the MG's PKM,
  the marksman's SVD with scope, the grenadier's launcher). Vehicles hold crates and, for the MRAP, its DShK.
  Searching a body or crate means holding E for a few seconds (TAC-A-10).
- Why: Loot is connected to what the enemy was (kill the marksman, get an SVD), which gives targets meaning. The hold
  time creates risk.
- Alternatives rejected: Random loot (no link to what you did); instant pickup.
- Cost / risk: Loot tables need data and tests. A body search while under fire is deliberately dangerous.
- Cost to change: Low.
- Revisit if: Players leave loot because the risk is too high.
- Owner feedback: —

### TAC-C-06 · A teammate can be ordered to loot
- Status: planned  ·  Packet: WP-S9
- Decision: A new order, "loot", sends a rebel to a body or crate and searches it.
- Why: Looting should not stop the player's own fight; it makes the squad useful.
- Alternatives rejected: Only the active rebel loots.
- Cost / risk: AI rebels loot under fire if not careful; they must wait for cover.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## Inventory UI (WP-S10)

### TAC-C-07 · A field loot panel and a between-missions squad screen; click to equip first
- Status: planned  ·  Packet: WP-S10
- Decision: In the field, looting opens a small panel. Between missions there is a squad screen to equip rebels from the
  stash. Equipping is click-to-select-then-click-slot; drag only on desktop. Hover shows stat deltas; incompatible
  installs show the Workbench's reasons.
- Why: Click works on every device and with a keyboard; drag is optional polish. Showing why something does not fit
  teaches the Modder's rules.
- Alternatives rejected: Drag only (touch-hostile, inaccessible); a text-only list.
- Cost / risk: Needs the compatibility rules from `workbench/rails.js` and the attachment definitions.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

## Loadouts matter (WP-S11)

### TAC-C-08 · What a rebel carries changes how it fights
- Status: planned  ·  Packet: WP-S11
- Decision: Attachments change combat: optics extend sight range, a suppressor reduces the army's hearing radius, an
  extended magazine lengthens bursts, a foregrip tightens spread. Ammo is consumed from what the rebel carries; empty
  means the sidearm.
- Why: Without it, equipping is cosmetic. Hearing is the key: a suppressor must help stealth, which the compound is
  built around.
- Alternatives rejected: Numbers hidden in the Workbench only.
- Cost / risk: Each modifier needs a unit test and sensible limits.
- Cost to change: Low.
- Revisit if: One attachment dominates.
- Owner feedback: —

### TAC-C-09 · An Equipment Wiki of every lootable item, on placeholder data from tarkov.dev
- Status: built (placeholder data)  ·  Packet: WP-C (early)
- Decision: `wiki/` lists every lootable item the game will need: 4,227 items in 82 categories. It covers weapons, ammunition and ammo packs, weapon parts and mods, gear (armour, plates, helmets, rigs, backpacks, eyewear, headsets, night vision), medication, provisions, barter items, intel, money and containers. A category tree, search, rarity filter and sorting lead to an item card with a grid size, weight, value, loot rarity, stats, compatible ammunition (linked), mounts and description. The data is copied from tarkov.dev's public data cache by `tools/wiki/import-tarkov.mjs`, which can be re-run to refresh it, into `wiki/data/items.json`. Tarkov's keys, maps, quest and battle-pass items and weapon presets are left out. The icons are placeholders from the project's own art set, not tarkov.dev's images. Loot rarity (common to very rare) is derived from price within each top category, ready for loot tables. Filtering and icons live in `wiki/catalogue.js` and are tested.
- Why: Owner request: a detailed equipment wiki with all lootable equipment, using placeholders and tarkov.dev's data for now.
- Alternatives rejected: Hand-writing a catalogue now (slow, and the shape of the data is what matters first); hotlinking tarkov.dev's images (another site's assets in our pages).
- Cost / risk: The data is Tarkov's: names, prices and balance are placeholders until the game has its own catalogue. 2.1 MB of JSON (served compressed).
- Cost to change: Low: replace `wiki/data/items.json` with the game's catalogue in the same shape.
- Revisit if: The game's own item list exists, or the convoy's loot should draw from this catalogue.
- Owner feedback: —
