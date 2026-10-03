# D · Campaign and unlocks (WP-S12 to S14; planned)

Principles: [00-principles.md](00-principles.md). Inventory model: [C-inventory-looting.md](C-inventory-looting.md).

### TAC-D-01 · A linear three-mission campaign
- Status: planned  ·  Packet: WP-S12
- Decision: Convoy, then compound, then cave, in order. Squad, stash and wounds persist between them. A debrief and a
  briefing frame each mission. A Reset button clears the save.
- Why: A demo needs a path. Linear is the least to build and the clearest to test; each mission also teaches something the
  next one needs (the RPG for the MRAP in the cave).
- Alternatives rejected: A map with free mission choice (content we do not have).
- Cost / risk: No replayability beyond replaying missions.
- Cost to change: Low.
- Revisit if: Testers want to replay missions with the same save (allow replays that do not overwrite).
- Owner feedback: —

### TAC-D-02 · Wounded, not dead
- Status: planned  ·  Packet: WP-S12
- Decision: A rebel who goes down in a mission is wounded and misses the next one, but is not lost for good.
- Why: A short demo with permanent death would end saves quickly, and a three-mission arc cannot afford it. Missing
  a mission still hurts (a missing specialist).
- Alternatives rejected: Permadeath (too punishing for the length); no consequence (death means nothing).
- Cost / risk: With swapping, going down is common, so the consequence must stay modest.
- Cost to change: Low.
- Revisit if: Wounded rebels make the cave too hard; they could recover in the fallback chamber.
- Owner feedback: —

### TAC-D-03 · A recruit joins after mission 1
- Status: planned  ·  Packet: WP-S12
- Decision: After the convoy a new rebel (a survivor or a defector) joins, with a name and a role.
- Why: The squad grows with the story, which gives something to equip and level with the new loot.
- Alternatives rejected: A fixed squad.
- Cost / risk: Needs a name, a silhouette and a short intro.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-D-04 · Loot unlocks only when you extract with it
- Status: planned  ·  Packet: WP-S13
- Decision: An item unlocks in the Weapon Modder the first time it is carried out of a mission (a successful extraction or a
  mission ending with you holding it). Loot you die with, or never extract, does not unlock.
- Why: It makes looting risky; stealing something and losing it must cost you. It also makes extraction in the
  compound meaningful.
- Alternatives rejected: Unlock on pickup (no risk); unlock on mission completion only (misses partial victories).
- Cost / risk: With swapping, "die with it" is rare; the rule is about leaving with it, so a mission lost while
  holding loot loses the loot.
- Cost to change: Low.
- Revisit if: Players lose too much loot; add "recover after a failed mission".
- Owner feedback: —

### TAC-D-05 · The Modder shows everything, but locked items are greyed with where to steal them
- Status: planned  ·  Packet: WP-S13
- Decision: Locked rifles and parts appear greyed with a short hint ("Steal it in Compound Assault"). `?unlock=all`
  unlocks everything for demos and screenshots.
- Why: Discoverability: a hidden item is invisible and no reward. A hint is a promise. `?unlock=all` means a visitor to
  the portfolio can still see the whole Modder.
- Alternatives rejected: Hiding locked items; no way to unlock everything.
- Cost / risk: The Modder must handle locked state in its slots and presets.
- Cost to change: Low.
- Revisit if: The greyed list feels cluttered.
- Owner feedback: —

### TAC-D-06 · Looted gear and cosmetics unlock in the Operator Customiser the same way
- Status: planned  ·  Packet: WP-S14
- Decision: Helmets, vests, night vision and patches taken from soldiers unlock in the Customiser by extraction.
- Why: One rule for all unlocks; it reuses the same save and UI.
- Alternatives rejected: Only weapons unlock.
- Cost / risk: Needs the Customiser's items to have ids shared with loot.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —
