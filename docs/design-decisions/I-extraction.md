# I · Extraction delivery (WP-S27 to S42)

Reconciles the 3 October extraction request with Claude's `8f30cf1` whole-squad and progression plan.
The detailed contract is in [the tactical roadmap](../tactical-roadmap.md). Earlier entries remain for history;
where defaults differ, this section is the current proposed extraction plan. WP-S20–S26 keep their existing IDs.

### TAC-I-01 · Prove one extraction loop before additional maps
- Status: planned  ·  Packet: WP-S27, WP-S28, WP-S35
- Decision: Preserve S20/S21 squad control, then prove finite kit, looting, timed extraction, durable return and a second deployment on the convoy before compound/cave work.
- Why: The owner requested an extraction loop from the current shooter; more maps cannot establish meaningful stakes.
- Alternatives rejected: Implementing all three maps before the economy; replacing the shooter with a new engine.
- Cost / risk: Existing content packets move later; architectural seams need staged work.
- Cost to change: Low before implementation.
- Revisit if: The convoy cannot present an interesting retreat decision.
- Owner feedback: 3 October: fetch Claude's latest main, then begin building.

### TAC-I-02 · Loss belongs to the squad; objective success is separate from extraction
- Status: planned  ·  Packet: WP-S30
- Decision: Active-rebel death triggers the S20/S21 switch. All-down, deadline or abandonment loses unsecured kit. Early extraction keeps carried gear without granting incomplete objective rewards. Home stash is safe.
- Why: Preserves the owner's whole-squad fantasy and gives retreat a meaningful outcome.
- Alternatives rejected: Ending the raid when the original player dies; automatically banking on enemy elimination.
- Cost / risk: Requires distinct raid and objective states, and explicit stranded-rebel rules.
- Cost to change: Medium once saves ship.
- Revisit if: Playtests show unclear squad-loss accounting.
- Owner feedback: —

### TAC-I-03 · Gear must have one owner and one durable settlement
- Status: planned  ·  Packet: WP-S8, WP-S29, WP-S34
- Decision: Unique item instances, finite magazines, transaction-based local profile behind an adapter, deploy reservation and idempotent settlement. Recommend IndexedDB rather than the earlier localStorage-only default. Refresh abandons a reserved first-release raid; hidden tabs pause local play.
- Why: Without these rules, reload/retry or two tabs can duplicate loot or restore lost equipment.
- Alternatives rejected: Trusting the UI to award loot; storing unrelated profile fields independently; claiming local saves provide anti-cheat.
- Cost / risk: Storage errors and migrations require explicit recovery; first-release refresh loses kit.
- Cost to change: Medium. Record final storage choice in S29 before implementation.
- Revisit if: Browser interruption loss proves unacceptable; implement deterministic checkpoints separately.
- Owner feedback: —

### TAC-I-04 · Scavenging and discovery are separate from infinite ownership
- Status: planned  ·  Packet: WP-S31, WP-S32, WP-S33
- Decision: No shopping economy. A restricted non-bankable recovery kit prevents deadlock. Catalogue discovery persists after physical gear is lost. Add limited medicine/armour and navigable, readable raids before survival micromanagement.
- Why: Keeps the insurgent equipment fantasy and ensures campaign scarcity survives gallery unlocks.
- Alternatives rejected: Copying a trader market, minting gear from loadout URLs, making the DShK a free carryable primary.
- Cost / risk: Recovery loadouts and supply sinks need multi-raid balancing.
- Cost to change: Low for tuning, medium for ownership rules.
- Revisit if: Players cannot recover or accumulate supplies without interesting decisions.
- Owner feedback: —

### TAC-I-05 · Live multiplayer is a funded, gated follow-on
- Status: planned  ·  Packet: WP-S36, WP-S37, WP-S38, WP-S39, WP-S40, WP-S41, WP-S42
- Decision: Finish local browser PvE first. Owner gates precede authoritative co-op research and a separate closed PvPvE experiment; online profiles cannot trust local saves or debug hooks.
- Why: The current deployment is static; network authority, persistence, costs and fair populations are separate engineering problems.
- Alternatives rejected: Presenting a browser page as multiplayer; retrofitting competitive trust around client-owned inventory.
- Cost / risk: Requires operating budget and incident ownership; proposed packets are feasibility work, not a commercial release estimate.
- Cost to change: Low before the gate, high after online inventory launches.
- Revisit if: Owner explicitly prioritizes multiplayer and accepts its costs.
- Owner feedback: —
