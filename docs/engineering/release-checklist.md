# Release checklist: 2026 demo

Run before any release. The v1.0.0 tag is the owner's call; do not create it from an agent session.
Credits and licences are out of scope (see ADR 0012).

## Automated
- [ ] `npx prettier --check .`, `npx eslint .`, `npm run typecheck`
- [ ] `npm test` (unit, plan, site build)
- [ ] `tests/e2e/smoke.mjs`, `tests/e2e/a11y.mjs`, `npm run test:audio`
- [ ] Pages deploy green on `main`

## Manual
- [ ] Every page loads under `/partisan-project/` with relative URLs only
- [ ] Every page keeps `noindex, nofollow` and `seo_hidden`
- [ ] Music continues across pages; chiptune crossfade on the Nokia index
- [ ] Workbench: three rifles, share code round trip, reset
- [ ] Operator customiser: poses, idles, share link
- [ ] Phone check: touch, orientation, idle frame rate
- [ ] Keyboard-only pass and screen-reader labels on the top bar

## Sign-offs
- [ ] Owner has played the intro, workbench, operator and index
- [ ] CHANGELOG updated; version bumped
- [ ] Owner decides on the v1.0.0 tag
