# partisan-project

Internal design document for **PARTISAN**, a WW2044 setting project, published
as a one-page static site so it can be read on a phone, sent as a link, and
version-controlled like the rest of the KCC properties.

**This is not a public site.** It is a working document that happens to be
deployed. Treat the URL as private.

Current version: **0.2.0** (see `VERSION` and the header comment in
`index.html`, both of which must be bumped together).

---

## The password gate

`functions/_middleware.js` is Cloudflare Pages middleware, so it runs in front
of **every** request. Nothing is served until the passphrase is accepted, not
`index.html`, not `robots.txt`, not future assets.

- Unauthenticated requests get a styled passphrase page and a `401`.
- A correct passphrase sets `partisan_session`: an expiry timestamp plus an
  HMAC-SHA256 signature keyed on `SITE_PASSWORD`. `HttpOnly`, `Secure`,
  `SameSite=Lax`, 14 days.
- The cookie is signature-verified on every request, so a forged or edited one
  is rejected.
- Changing `SITE_PASSWORD` invalidates every outstanding session immediately.
- If `SITE_PASSWORD` is unset the site returns `500`. It fails closed rather
  than falling through to the content.
- A wrong passphrase costs ~900ms, which takes the wind out of an online
  guessing loop.

### Setting the passphrase

The passphrase is **not in this repo**, on purpose. Set it on the Pages
project: **Settings → Environment variables → Add variable**, name
`SITE_PASSWORD`, type **Secret**, and add it to both **Production** and
**Preview**. Redeploy for it to take effect.

For local work, copy `.dev.vars.example` to `.dev.vars` (gitignored) and run
`npx wrangler pages dev .`.

### What this is and is not

It is a real server-side gate. The content never reaches the browser
unauthenticated, so it is not the view-source theatre that client-side
password overlays amount to.

It is still one shared passphrase over one channel. If this ever holds
something you would genuinely mind leaking, move to **Cloudflare Zero Trust →
Access** with per-person email auth, which also gives you a log of who opened
it and when. The middleware and Access coexist fine.

---

## Deploy

Cloudflare Pages, no build command, output directory `/`. Functions are picked
up automatically from `functions/`, on both Git deploys and direct upload.

Leave it on the `*.pages.dev` subdomain. A custom domain on an internal
document only creates a guessable hostname.

## Why it also stays out of search

- `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">`
- `robots.txt` blanket disallow
- `_headers` sends `X-Robots-Tag` on every path, and the middleware repeats it
  on the login page
- **No JSON-LD.** The AK build carries a full entity graph wired to the
  canonical `#vincent` / KCC / FMP `@id`s. Deliberately absent here, because
  emitting structured data from a hidden page is how hidden pages stop being
  hidden. If PARTISAN goes public the graph lifts straight out of
  `americankingdoms-projectsite/index.html` and needs only a new
  `CreativeWorkSeries` node.
- No Open Graph either. Link previews in Discord and Slack would leak the
  premise and artwork to people who never open the URL.

## What was cloned from American Kingdoms, and what was not

**Cloned:** the file layout (self-contained `index.html`, embedded CSS), the
`:root` token block structure, the `.wrap` / `.plate` / `.sec-pad` rhythm, the
CSS-only grain overlay on dark plates, the header-comment changelog plus
`<meta name="version">` plus `VERSION` file discipline, the no-motion house
rule, the `functions/` + `.dev.vars.example` secrets pattern, and the footer
interlink pattern.

**Not cloned:** the visual system. AK is "illuminated proclamation", Cinzel and
EB Garamond on crimson, gold and parchment. PARTISAN is limewash and cobalt:
chalk-white Cycladic wall plates alternating with Aegean-night indigo, Ottoman
crimson and dust-olive as secondaries, Archivo and Source Serif 4. The two
projects should not be mistaken for each other at a glance.

## Assets

None. Every flag is inline SVG built from four rectangles, so the site is fully
self-contained and has no `assets/` folder.

The Yantis flag is a placeholder and is captioned as one. When the real designs
exist, swap the inline SVG in five places: the masthead mark, the hero, the
GREF faction chip, the footer mark, and the login page in
`functions/_middleware.js`.

## Content status

The premise, timeline placement, three-faction structure and constraint sheet
are settled. Everything under **Open questions** is genuinely open, including
the island's name. The island geography and anchor-location list are proposals,
not canon, and no place names have been committed on purpose.

---

## Companion documents

`docs/ai-design.md` — AI design document and roadmap (v0.1.0). The executive
summary. Read this first.

`docs/ai/` — the AI Compendium (v1.0.0). Thirteen volumes plus appendices,
~49,000 words. Start at `00-index.md`. Covers the historical and technical
corpus, the belief model, individual and squad AI, spatial reasoning, faction
brains, the director, Unreal implementation against UE 5.8, legibility,
companions, validation, and production.

Neither is deployed as a page. They do not affect the site `VERSION` and carry
their own versions in their header comments.
