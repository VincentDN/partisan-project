# 0003 · GitHub Pages from an allowlist build

**Status** accepted · 2026-10-01 · owner action pending (enable Pages)

**Context.** The owner wants the project usable on the internet via GitHub Pages. The repository also holds internal planning material (agent-ops, ADRs, archive) and tooling that should not be served.

**Decision.** `.github/workflows/pages.yml` runs tests, builds `_site/` with `tools/build-site.mjs` from an **explicit allowlist**, checks links with `tools/check-site.mjs`, and deploys with the official `upload-pages-artifact` / `deploy-pages` actions on pushes to `main`. Pull requests build and test but do not deploy. Pages is served at `https://vincentdn.github.io/partisan-project/`.

**Consequences.**
- One-time owner step: *Settings → Pages → Build and deployment → Source: GitHub Actions*. A Pages environment rule may need `main` as an allowed branch.
- The repository is public, so allowlisting limits what is **served**, not what is **readable on GitHub**. Anything that must not be public (raw purchased assets, licences the owner is unsure about) must not be committed at all.
- `noindex` meta tags are set on every page, following the portfolio's link-only convention; remove them from `index.html` when the project should be discoverable.
