# F · Quality, performance, touch, docs (WP-S17 to S19; planned)

Principles: [00-principles.md](00-principles.md).

### TAC-F-01 · Regression tests before more content
- Status: planned  ·  Packet: WP-S17
- Decision: The twelve-run convoy fingerprint becomes a committed test, with an explicit command to re-baseline when
  AI changes are intentional. Each level gets a smoke test; inventory, unlock and swap flows get end-to-end tests.
- Why: The convoy refactor proved the value of a fingerprint (TAC-A-03). Content growth will otherwise silently change
  earlier levels.
- Alternatives rejected: Relying on unit tests alone (they test parts, not behaviour).
- Cost / risk: A fingerprint is brittle by design; changing the AI changes it. A deliberate re-baseline step avoids
  cargo-culting.
- Cost to change: Low.
- Revisit if: It breaks too often to be useful.
- Owner feedback: —

### TAC-F-02 · A phone performance budget
- Status: planned  ·  Packet: WP-S17
- Decision: Record the entity and draw-call counts per level and the frame time on an emulated phone, and set a
  budget CI can check.
- Why: A top-down game with many units can fall over on phones. The site already has adaptive resolution and
  throttling for other pages.
- Alternatives rejected: Checking only on a desktop.
- Cost / risk: Software rendering in CI is slow and not representative; we measure counts, not milliseconds, in CI.
- Cost to change: Low.
- Revisit if: Real device tests are possible.
- Owner feedback: —

### TAC-F-03 · Touch: twin-stick, tap to loot, long-press for orders
- Status: planned  ·  Packet: WP-S18
- Decision: Left thumb moves, right thumb aims and fires, a button holds E for loot, long-press on the map gives an order,
  tap a rebel to swap.
- Why: The site is used on phones, and the Nokia index already treats touch as first-class.
- Alternatives rejected: Desktop only (excludes many visitors).
- Cost / risk: Orders on a small screen are hard; the pause helps.
- Cost to change: Medium.
- Revisit if: Orders feel too hard on touch; reduce to follow/hold.
- Owner feedback: —

### TAC-F-04 · Docs are a packet, not an afterthought
- Status: planned  ·  Packet: WP-S19
- Decision: Design document sections (scenarios, loot loop, unlock economy), the changelog and the index entry are updated
  as a packet, plus this decision log is kept current by every packet.
- Why: The design document is the product; stale documentation is a regression.
- Alternatives rejected: Doing docs at the end of the whole project.
- Cost / risk: Small overhead per packet.
- Cost to change: Low.
- Revisit if: —
- Owner feedback: —
