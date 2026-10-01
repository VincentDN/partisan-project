# 0002 · three.js is vendored

**Status** accepted · 2026-10-01

**Context.** Pages loaded three.js from jsDelivr. A CDN outage, policy change or blocked network breaks every demo, and CI/agent sandboxes often cannot reach CDNs.

**Decision.** `vendor/three` holds three.js r169 (`build/three.module.min.js` plus the few addons used). Import maps point at `../vendor/three/...`. Upgrade by replacing the folder and re-running the e2e smoke test.

**Consequences.** +~1 MB per first visit (cached). Fully offline-capable and reproducible. Upgrades are deliberate.
