# Agent-ops: building Partisan Project on two $20 subscriptions

This is the working agreement for every AI agent (Claude, ChatGPT/Codex, or any other) that touches this
repository. Its job is to turn a large hobby project into small pieces that **each fit inside one usage
window**, and to make **handing work back and forth** between a Claude Pro plan and a ChatGPT Plus plan cheap
and lossless.

Everything an agent needs to continue lives **in the repository**, never in a chat. If it is not committed,
it does not exist for the next agent.

> **EXPRESS INSTRUCTION: do not spend tokens on credits or licences.** This is a hidden, SEO-excluded test project. Do not
> research, write, check, audit or update credits, attributions, licence tables, provenance notes or asset-rights
> registers, and do not add tests or CI steps for them. If a task touches them, skip that part and say so in one line.
> Credits and licences are handled in the GitHub documentation or by contacting the owner; the pages only carry a note saying so.

---

## 1. The model in one page

| Concept | What it is |
|---|---|
| **Window** | One 5-hour rolling usage window on a subscription. Both vendors also apply weekly caps. |
| **BU (budget unit)** | 1 BU = 1 % of one 5-hour window on the *weaker* of the two plans. Windows are always 100 BU. |
| **Packet** | A unit of work sized XS / S / M that fits in one window with room to spare. Defined in `packets.json`. |
| **Handoff** | The 10-line block in `STATE.md` that lets the *other* agent resume in under 2,000 tokens of reading. |
| **Burn-down queue** | Small packets (XS/S) kept ready so a nearly spent window is never wasted. |

The five rules:

1. **Nothing bigger than M.** An L-sized idea is an *epic*: split it before anyone starts it.
2. **Read the map, not the code.** Start from `docs/CODEMAP.md` and the packet's `inputs`; open nothing else without a reason.
3. **Stop at 80 %.** Finish the atomic step, commit, push, write the handoff, stop. A half-finished step costs the next agent more than it saved.
4. **Every packet ends green and committed.** Acceptance criteria are commands or checkable facts, not opinions.
5. **Measure, then trust the numbers.** Log what each packet really cost; recalibrate (section 3).

---

## 2. Sizes

| Size | Budget | Typical shape | Token intuition* |
|---|---|---|---|
| **XS** | 3 BU | One decision, one file edit, one data change, a docs fix, an owner action | tens of thousands |
| **S** | 8 BU | One module or one asset import, with tests | about a hundred thousand |
| **M** | 20 BU | One feature across 3–6 files with tests and a visual check | a few hundred thousand |
| ~~L~~ | — | **Not allowed.** Split into S/M packets with explicit dependencies. | — |

\* "Tokens" here means everything the agent consumes in a packet: files it reads, tool output, its own writing,
and re-reads of the growing conversation. Long sessions are dominated by the last term, which is why packets are
small and sessions are restarted per packet.

**The two vendors do not publish fixed token limits for the $20 plans, and the limits change.** Treat every
number in this document as a starting hypothesis. The calibration loop below is what makes the system true.

## 3. Calibration (do this for the first two weeks)

1. Before a packet, read the usage meter (Claude: `/usage` or the settings page; ChatGPT/Codex: the usage panel). Note the % used.
2. Do the packet. Read the meter again.
3. `node tools/agent/usage.mjs log --agent claude --plan claude-pro --packet WP-XX --pct <difference> --note "…"`
4. After 3 packets per size, `node tools/agent/usage.mjs report`. If measured means exceed nominal by 1.5×, change the nominal (`SIZES` in `tools/agent/packets-lib.mjs`, `bu` in `packets.json`) and re-split packets of that size.
5. Weekly: note how many windows the weekly cap actually allowed. Plan the week as `windows × 100 BU`, **minus 25 % reserve**.

Planning assumption until measured: **a normal week gives each plan 8–12 usable windows; plan for 8.**
Because one packet never needs a whole window, there is slack to run two packets per window and still stop at 80 %.

## 4. Session protocol

### 4.1 Opening a window (≤ 2,000 tokens of reading)

```
1. Read AGENTS.md (short) and docs/agent-ops/STATE.md (Latest handoff + Active).
2. Read the meter. Budget = 80 − (% already used). Run:
     node tools/agent/next-packet.mjs --budget <BU> --agent <claude|codex> [--can browser,bpy,net]
3. Continue the handoff's "Next step" if there is one; otherwise take the top packet.
4. Open only the packet's `inputs`. Use docs/CODEMAP.md to find anything else.
5. State the packet ID and the acceptance command in your first message. Work on a branch named claude/… or codex/…
```

### 4.2 During the packet

- Prefer `Grep`/`rg` for a symbol over reading a file; read line ranges, not whole files; never open `vendor/`, `assets/`, `node_modules/`, `docs/ai/` or any `.glb/.hdr/.mp3/.jpg`.
- No sub-agents and no parallel sessions on the $20 plans: they multiply cost for little gain at this scale.
- Visual work: render **one contact sheet** (several poses / angles in one image) instead of many screenshots.
- Commit at each green step (`wip(WP-XX): …` is fine, squash later). Push the branch at least every 20 BU.

### 4.3 Closing a window (when ~80 % is spent, or the packet is done)

```
1. Run the acceptance command. Run `npm test`.
2. Commit and push.
3. If the packet is finished: set its status to "done" in packets.json, then
     node tools/agent/roadmap-table.mjs         # regenerate the roadmap table
     node tools/agent/codemap.mjs               # if files were added/removed
     node tools/agent/usage.mjs log …           # calibration record
4. node tools/agent/handoff.mjs --agent <you> --packet WP-XX --status done|partial --note "…" --next "…"
5. Commit that, push, stop. Do not start "one more thing".
```

### 4.4 Stopping in the middle (the leftover-tokens case)

When a window is almost empty and a packet is half done, **do not rush**. Commit the working part on the branch,
mark the packet `partial` in the handoff, and write the exact next step: file, function, command. The other agent
(on its own fresh window) picks it up from there. If instead a window has leftover budget and nothing in the
queue fits, take a **burn-down** packet: `WP-T*` (tech debt), `WP-D*` (docs), or an XS from the next milestone.

## 5. Passing work between Claude and ChatGPT/Codex

| Aspect | Rule |
|---|---|
| Shared instructions | `AGENTS.md` is the single source. `CLAUDE.md` only points to it, so there is no drift. |
| Branches | `claude/<topic>` and `codex/<topic>`. One agent per branch; the other agent branches from it, never edits it concurrently. |
| State | `docs/agent-ops/STATE.md` (handoff, active packet, blockers). Nothing important lives only in a conversation. |
| Style differences | Both agents obey the same formatter/linter/tests. Do not "fix style" in unrelated files. |
| Routing hint (hypothesis, retest quarterly) | Whichever plan has more headroom this window takes the next packet. Use the agent that can *see* images for visual packets (screenshots), the one with the longer remaining budget for M packets. |
| Capabilities | Packets declare `needs`: `browser` (headless Chromium), `bpy` (Blender as a Python module), `net` (internet downloads), `human`. `next-packet --can` filters on what the current environment offers. |
| Conflicts | If both agents edited the same file, the later one rebases onto the earlier one's branch and resolves; it never overwrites. |

Copy-paste openers for each tool are in [`prompts/`](prompts/).

## 6. Writing a good packet

See [`PACKET-TEMPLATE.md`](PACKET-TEMPLATE.md). The essentials:

- **Goal in one sentence**, observable from outside the code.
- **Inputs**: the exact files/line ranges to read. (If you cannot list them, the packet is not ready.)
- **Acceptance**: commands and checkable facts. "Looks good" is not acceptance; "contact sheet committed and owner-approved" is.
- **Out of scope**: what tempting thing to leave alone.
- **Just-in-time refinement**: packets beyond the next milestone carry one line of acceptance. Before starting one, spend an XS refining it to the full template.

## 7. Token hygiene that is baked into the repo

- `AGENTS.md` ≤ 90 lines; `STATE.md` ≤ 80 lines; `CODEMAP.md` generated; module header comments state purpose in the first line.
- Source files stay small (aim < 300 lines). Large legacy files are tracked as tech-debt packets (`WP-T1`).
- Binary assets never need reading: `assets/register.json` and each model's `.manifest.json` describe them in text.
- Docs that agents rarely need (`docs/ai/` is not here, it moved to the portfolio site; `docs/archive/`) are fenced off in `AGENTS.md`.
- Tests print one line per file on success so a green run costs ~20 tokens of output.

## 8. Weekly planning ritual (10 minutes, any agent, XS)

1. `node tools/agent/usage.mjs report` and check the weekly meters of both plans.
2. `node tools/agent/next-packet.mjs --budget 100 --json` for the week's candidate list.
3. Put 2–3 M packets and 3–5 S/XS fillers on `STATE.md` → **Active this week**. Leave 25 % unplanned.
4. Anything needing the owner (`agent: human`) goes to the top of the owner's list, because those unblock the most work.

## 9. Files

| File | Purpose |
|---|---|
| `packets.json` | Source of truth for work: sizes, dependencies, status, acceptance. |
| `STATE.md` | Latest handoff + this week's plan. Small by design. |
| `usage-log.csv` | Calibration measurements. |
| `PACKET-TEMPLATE.md`, `HANDOFF-TEMPLATE.md` | Fill-in forms. |
| `prompts/` | Session openers for Claude and ChatGPT/Codex. |
| `../../tools/agent/` | `next-packet`, `handoff`, `usage`, `roadmap-table`, `codemap`. |
| `../../tests/agent.test.mjs` | Keeps the plan valid (no L packets, no cycles, table in sync). |
