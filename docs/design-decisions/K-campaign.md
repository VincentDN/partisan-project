# K · Campaign (WP-W1 to W26; planned)

The Bannerlord loop that joins the world map, the three missions, loot and upgrades into one game. The plan:
[../campaign-roadmap.md](../campaign-roadmap.md). Principles: [00-principles.md](00-principles.md). These four were the
owner decisions of WP-W26; the owner delegated them on 5 October 2026.

### TAC-K-01 · No shop at home: barter at neutral and liberated villages only
- Status: planned  ·  Packet: WP-W18, WP-W26
- Decision: In a campaign there is no trader at the camp. Trade goods are bartered item for item at neutral and liberated villages, valued with today's price table (`convoy/loot.js` `priceOf`, `scripFor`), so scrip becomes a hidden barter value rather than a currency you hold. Each village has a small seeded stock (food, ammunition, medical supplies, common gear, rarely a weapon) that refreshes weekly; liberated villages stock more and give better rates. Invader settlements never trade. The camp trader stays in practice mode.
- Why: Stealing is the game: the tactical roadmap's rule is finite equipment recovered by scavenging, not bought. Barter in villages turns trade into a reason to move and to free villages (Bannerlord's village markets), and gives the trade goods that loot already rolls somewhere to go.
- Alternatives rejected: Keeping the camp trader (a safe menu at home removes risk and movement); no trade at all (trade goods become dead weight, and a bad loot roll can stall promotions).
- Cost / risk: Barter values need tuning so a village cannot be farmed; stock limits and the weekly refresh cap it.
- Cost to change: Low. The price table already exists.
- Revisit if: The campaign harness (WP-W23) shows promotions stalling for lack of a specific item.
- Owner feedback: delegated to the agent, 5 October 2026.

### TAC-K-02 · Auto-resolve for lopsided fights only, and always a little worse than playing
- Status: planned  ·  Packet: WP-W22, WP-W26
- Decision: Auto-resolve is offered when your strength (fighters weighted by tier) is at least 2.5 times the enemy's, or the enemy is a lone patrol. Never for the camp defence, a settlement capture or the Fort Orion assault. The panel shows the odds and the expected wounds first. The result is slightly worse than an average played fight: more wounds, a quarter less loot, and no rare cargo roll. The campaign harness uses the same resolver.
- Why: As the band grows, small fights become chores (Bannerlord's lesson), but the missions are the game, so auto-resolve must never be the better choice and never decide anything that matters.
- Alternatives rejected: Every fight played (grind once the band is strong); auto-resolve everywhere (skips the game and hides the missions); a mid-mission "finish for me" (complex, and it cheapens losing).
- Cost / risk: The strength formula needs tuning against played results.
- Cost to change: Low. It is one function and a threshold.
- Revisit if: Playtests show players auto-resolving fights they would enjoy, or never using it.
- Owner feedback: delegated to the agent, 5 October 2026.

### TAC-K-03 · An overrun camp is a heavy setback, never a game over by itself
- Status: planned  ·  Packet: WP-W11, WP-W21, WP-W26
- Decision: If the Rebel Base Defence is lost at Oros Camp: half of every stack kept at camp is lost, rounded down (so a single item survives in the hidden cache), and a deterministic seeded roll chooses which pieces of assembled builds go. Fighters who fell are wounded, not dead, and miss the next completed mission (the tactical roadmap's rule). The band falls back to the nearest friendly settlement, which becomes the camp; the old camp is burnt, and the new one is "rebuilding" for three in-game days (no faster healing, no stash access beyond what the band carries). Heat halves: the Invader thinks it has won. The campaign is lost only when the band is wiped out in a defence and no friendly settlement is left to fall back to.
- Why: Losing the camp must hurt enough that being hunted matters, but a single bad fight hours into a campaign should not erase it. Bannerlord loses you your party, not your save. Falling back to a village also makes territory matter.
- Alternatives rejected: Lose the whole stash (one defeat ends the campaign in practice); lose nothing but time (being hunted stops mattering); permanent death of fallen fighters (the tactical roadmap rejects mandatory permadeath).
- Cost / risk: Players may reload old saves; the single versioned save with one settlement per encounter (WP-W2) prevents save-scumming inside the game.
- Cost to change: Low. It is numbers in the settlement step.
- Revisit if: The harness shows campaigns ending or stalling after one overrun.
- Owner feedback: delegated to the agent, 5 October 2026.

### TAC-K-04 · The 3-D world map is the overworld; the retro region map is retired
- Status: planned  ·  Packet: WP-W3, WP-W4, WP-W8, WP-W26 (retires WP-V14, V15, V16)
- Decision: The Bannerlord-style 3-D map in `map/` (three.js, CC0 aerial terrain textures, provinces, parties with nameplates) is the campaign's overworld. The planned retro handheld-RPG region map is retired: WP-V14 (renderer), V15 (icons and routes) and V16 (UI and transitions) move into WP-W3, W4 and W8. WP-V17 stays as the island data format and reachability test, on `map/island.js`. Moving from the map into a mission is a page change with a short fade, not a zoom into the tactical map. The shooter stays 2-D (TAC-J-01); the map joins the Workbench and Operator Customiser as a 3-D page. Supersedes TAC-J-20 and TAC-J-22 and amends TAC-J-25.
- Why: The owner asked for a Bannerlord-style map after the retro plan was written, and the 3-D map now exists, runs and reads well. Building both would be wasted work.
- Alternatives rejected: Building the retro map as well (two overworlds); a retro shader on the 3-D map (no gain).
- Cost / risk: A 3-D page on phones costs more than a flat map; WP-W24 measures it (30 fps on a mid phone).
- Cost to change: Medium. The world simulation (WP-W5) is renderer-free, so another renderer stays possible.
- Revisit if: The map cannot hold 30 fps on a mid phone with every party moving.
- Owner feedback: delegated to the agent, 5 October 2026; the 3-D map follows the owner's Bannerlord brief of 4 October.
