<!--
  ══════════════════════════════════════════════════════════════════════
  PARTISAN  ·  Audience & Playtest Strategy
  Kaiser Cat Collective / Atelier Vincent De Nil BV
  ──────────────────────────────────────────────────────────────────────
  VERSION : 0.2.0
  BUILD   : 2026-09-13
  STATUS  : INTERNAL, draft for review. Repo document, not deployed.

  CHANGELOG
    0.2.0  Filed into the repo. Added §8 cross-references to the AI
           Compendium, §9 on how the audience constrains the design.
    0.1.0  Drafted. Target player, PII constraint, sentiment mining,
           density map, funnel, positioning, next actions.
  ══════════════════════════════════════════════════════════════════════
-->

# PARTISAN — Audience & Playtest Strategy

**Status: draft, for later review. Last updated 13 September 2026.**

Companion to `docs/ai/` (the AI Compendium) and `docs/ai-design.md`. Those describe what to
build. This describes who it is for and how to find out whether they want it.

---

## 1. The target player

**The aged-out casual shooter player.**

- Roughly 35. Has kids. Plays in short bursts.
- Played CoD, Counter-Strike, Battlefield casually for years.
- Did not stop enjoying shooters. **Stopped being able to compete in them.**
- Cannot sustain a ladder, a battle pass, or a 400-hour progression curve.
- Still wants a real fight, unlocks that feel earned, and a reason to care.

PARTISAN's answer: strong PvE AI as the defining feature, fun unlocks, wrapped narratively and
mechanically in the Yantis campaign.

> **Why this framing is the useful one.** "Casual shooter player" is a demographic and cannot
> be marketed to. "Someone who used to be good at this and no longer has the hours" is a
> *grievance*, and grievances are findable, addressable, and loud in public.

---

## 2. Constraint: no personal data harvesting

**Decided. Do not revisit.**

Scraping commenter emails or contact details from YouTube, Reddit or Steam and cold-mailing
them is not viable:

- **No GDPR lawful basis** for an EU entity (AVDN BV). Profiling by age and life stage on top
  of it makes it worse, not better.
- Breaks platform terms of service on every platform involved.
- Domain reputation risk, and a terrible first impression for a project whose entire pitch
  depends on goodwill.

We do not need their contact details. **We need them to hand them over.**

---

## 3. Sentiment mining — aggregate only

Pull public comment and review **text**, strip usernames, cluster. No PII stored.

**Sources:**
- Reddit API — public post and comment bodies
- YouTube Data API — comment text on relevant videos
- Steam review API — reviews for adjacent titles

**Two outputs we actually want:**

1. **Density map.** Which communities produce the highest concentration of "aged out"
   language. Tells us where to show up.
2. **Vocabulary.** The exact phrasing they use for the problem. This becomes Steam page copy,
   ad copy and trailer framing, close to verbatim.

**Search patterns to cluster on:** "don't have time", "can't keep up", "as a dad",
"30 minutes", "too old for", "quit CoD", "kids are asleep", "sweaty lobbies".

The vocabulary output is the more valuable of the two. Marketing copy written in the
audience's own words outperforms copy written about them, and this is the cheapest possible
way to acquire it.

---

## 4. Where the density is

| Community | Why |
|---|---|
| r/DadGamers | Literally the tribe, self-selected |
| r/patientgamers, r/truegaming | Older, reflective, anti-grind |
| Battlefield community | Huge aged-out population |
| Hell Let Loose, Squad, Ground Branch, Ready or Not | Tactical shooters skew 30s–40s hard |
| Steam reviews on the above | Search "as a dad", "30 minutes", "can't keep up" |
| YouTube: "why I quit CoD" / "old man gaming" | Comment sections are a goldmine |
| Facebook groups (35+ gamers) | Still active in this demographic |

---

## 5. Funnel

For games, **wishlists are the email list.** Build the owned, consented list. Do not try to
shortcut it.

1. **Steam page up early** → wishlists. Valve handles the notification.
2. **Steam Playtest** (free, built in) for the vertical slice. This is the primary test
   mechanism.
3. **Discord** for the ones who want in deeper — the future testers and evangelists.
4. Optional landing page for anyone arriving from outside Steam.

All opt-in, all GDPR-clean, all ours.

---

## 6. Positioning hypothesis

The wedge is **the constraint, not the genre.** Draft framings to test:

- "Designed for 40 minutes, not 400 hours."
- No ladder to fall off. Nothing to fall behind on.
- AI that gives you a real fight without a teenager's reflexes.
- A campaign with a reason to care — Yantis, GREF vs REDFOR.

**"Tactical shooter" is not the pitch.** The pitch is that we respect the time they actually
have.

---

## 7. Next actions

- [ ] Write one honest post for r/DadGamers laying out the design pillars and asking whether it
      resonates. **The comments are the sentiment analysis, and they cost nothing.**
- [ ] If the post lands: Reddit ads, targeted by subreddit. This is the "highly targeted reach"
      mechanism, with no inbox touched.
- [ ] Build the density map from the aggregate pull before spending on ads.
- [ ] Stand up the Steam page once there is something to show.

---

## 8. How this connects to the AI work

*Added 13 September 2026 when the AI Compendium was filed.*

The two documents converge on the same object: **a vertical slice**.

| This document says | The AI Compendium says |
|---|---|
| Steam Playtest is the primary test mechanism | Phases 0–2 are the project (Vol XIII §6.3) |
| We need something to show before the Steam page | Phases 0–2 = 4–7 solo-months, AI only |
| The comments on the r/DadGamers post are free sentiment analysis | The after-action test is the primary quality signal (Vol 0) |
| Positioning: "a real fight without a teenager's reflexes" | Difficulty scales information and time, never health or reflex demand (Vol XII §1) |

**The sequencing question this raises, and it is a real one.** The r/DadGamers post costs
nothing and can go out this month. The vertical slice costs four to seven months. Running the
post first is obviously correct — but only if the post describes something honestly, which
means it should pitch **the design**, not a game that exists.

That is a legitimate thing to post. "Here is what I want to build and why, does this resonate"
is a normal and well-received post in that community. "Here is my game" when there is no game
is not.

---

## 9. How the audience constrains the design

*Added 13 September 2026. This section is the one that should feed back into the AI work.*

The target player description is not just marketing input. It is a **design constraint sheet**,
and it independently validates most of the casual invariants already in the Compendium (Vol 0,
C1–C7). Where it sharpens them, that is recorded here.

| Audience fact | Design consequence | Compendium ref |
|---|---|---|
| Plays in short bursts, 30–40 minutes | **A session must be a complete unit.** The director's intensity curve needs to resolve inside 40 minutes, not across a 3-hour arc | Vol VIII |
| Has kids; may be interrupted at any moment | **Pause and abandon must be free.** No penalty for walking away mid-engagement. This rules out hard extraction-loss mechanics as a core loop | new constraint |
| Aged out of *competing*, not of *enjoying* | **Reflex demand is the thing to remove; tactical demand is the thing to keep.** This is exactly why difficulty must scale the AI's information and time rather than its speed or lethality | Vol XII §1 — **this is now load-bearing, not just principled** |
| Cannot fall behind on a ladder | No seasonal content, no decaying progression, no FOMO | — |
| Wants unlocks that feel earned | Progression tied to the liberation campaign, not to hours logged | Vol VII |
| Wants "a reason to care" | The Yantis campaign and the second-act turn are not garnish. They are a **requested feature** | Vol XIII Phase 7 |
| Played CoD/CS casually — reads shooter language fluently | Telegraphs can be subtle. This audience has thousands of hours of pattern recognition and will read body language faster than a novice | Vol X |

**The most important row is the third one.** The audience research and the AI design arrived at
the same conclusion from opposite directions. The audience says *"I can't compete with
teenagers any more."* The AI design says *"never scale difficulty with health, damage or
reflex demand — scale it with what the enemy knows and how long it takes them to know it."*

Those are the same statement. An enemy that is harder because it **forgets more slowly** is an
enemy an aged-out player can beat with patience, terrain sense and planning — all of which
improve with age. An enemy that is harder because it **shoots faster** is an enemy they
already left behind.

> **That is the pitch, and it is a design claim rather than a marketing claim.** "Difficulty
> that rewards what you got better at, not what you got worse at." Test that line on
> r/DadGamers. If it lands, it is the Steam page headline and it is also, conveniently, true.

**One new constraint to add to C1–C7:**

> **C8. A session is 40 minutes and may be abandoned at any moment without cost.** The director
> must resolve an arc inside that window, and nothing in the game may punish walking away
> mid-fight.

C8 has real teeth. It constrains the director (Vol VIII), it rules out a certain class of
extraction-loss loop, and it means save/resume granularity is an AI problem as well as a
systems one — a squad's belief state, morale and current tactic all have to serialise cleanly.
Worth knowing in Phase 0 rather than discovering in Phase 6.

---

## 10. Open questions

1. Does the r/DadGamers post go out **before** or **after** there is a slice? §8 argues before,
   pitching the design honestly.
2. Is the vertical slice the AI slice (Vol XIII Phases 0–2) or a playable game slice? These are
   different artefacts with different costs. The AI slice is showable in video; a Steam Playtest
   needs the second.
3. How does this sit against the earlier PARTISAN strategic memo's gates (savings rebuilt, FMP
   at its cleanest) and its validate-don't-build path? **The two are compatible** — everything
   in this document is validation, and none of it requires the gates to be open. Worth
   reconciling the documents explicitly at some point.
4. Does the Antistasi lineage get acknowledged publicly? It is a trust signal to one audience
   and irrelevant to this one. May need two different pitches.

---

*PARTISAN Audience & Playtest Strategy v0.2.0 · internal · © 2026 Kaiser Cat Collective / Atelier Vincent De Nil BV*
