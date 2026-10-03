# E · AI depth (WP-S15, S16; planned)

Principles: [00-principles.md](00-principles.md) (TAC-X-04, TAC-X-05). Built behaviours: [A-foundations.md](A-foundations.md), [01-convoy-prototype.md](01-convoy-prototype.md).

### TAC-E-01 · Morale: casualties, a dead leader and being flanked lead to falling back or surrendering
- Status: planned  ·  Packet: WP-S15
- Decision: Each squad has a morale value that drops with casualties, a dead leader, heavy suppression and being
  flanked. Low morale means falling back; very low means surrendering (and can be exploited for loot).
- Why: Today the army retreats only at 40% strength. Morale makes the enemy feel human and gives the player
  non-lethal ways to win.
- Alternatives rejected: Fight to the last man; a pure strength threshold.
- Cost / risk: Surrender needs a rule for what to do with prisoners (they simply stop and drop weapons).
- Cost to change: Medium.
- Revisit if: Surrender breaks missions (the eliminate objective must count it).
- Owner feedback: —

### TAC-E-02 · Soldiers investigate noises and bodies and search methodically
- Status: planned  ·  Packet: WP-S15
- Decision: A heard sound makes a soldier go and look; finding a body raises an alert; when the trail goes cold the
  search follows a pattern around the last known position instead of standing still.
- Why: Stealth in the compound needs consequences for leaving a mess, and searching gives the player a way to exploit
  AI (lure a guard).
- Alternatives rejected: Alert only on sight.
- Cost / risk: More states to test.
- Cost to change: Medium.
- Revisit if: The AI looks too clever or too silly in the AI view.
- Owner feedback: —

### TAC-E-03 · The AI view replays the last thirty seconds of what each soldier believed
- Status: planned  ·  Packet: WP-S15
- Decision: A timeline control shows beliefs, states and callouts over the last 30 s.
- Why: This is the tool for the owner's stated goal: "use this to build out AI ideas". You can see why a soldier did
  something.
- Alternatives rejected: Live view only.
- Cost / risk: Needs a small ring buffer of snapshots (cheap at this scale).
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —

### TAC-E-04 · A headless tuning harness measures balance
- Status: planned  ·  Packet: WP-S16
- Decision: `tools/ai/bench.mjs` runs thousands of games per level over seeds, awareness levels and scripted player
  styles, and prints win rates, times, casualties and loot taken. Target: each level winnable 40 to 70% by the
  scripted player at 50% awareness.
- Why: Feel-based tuning does not scale to three levels, perks and loot. The pure simulation makes this cheap
  (TAC-X-02).
- Alternatives rejected: Manual playtests only.
- Cost / risk: Scripted players are not people; the harness catches gross errors, not nuance.
- Cost to change: Low.
- Revisit if: Scripted behaviour is unrepresentative; add recorded human runs as replays.
- Owner feedback: —

### TAC-E-05 · The enemy never cheats
- Status: built (principle), planned (enforced by tests)  ·  Packet: WP-S15
- Decision: AI decisions read beliefs, not truth. A test asserts the AI never uses a position it has not seen, heard or
  been told.
- Why: A smart enemy that cheats is unfair and teaches the wrong lessons. The belief system (TAC-P-05) makes this
  checkable.
- Alternatives rejected: Trusting the code review.
- Cost / risk: Some behaviours (like the grenadier lobbing) must be re-checked against the rule.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —
