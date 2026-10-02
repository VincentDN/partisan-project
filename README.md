# Partisan Project

An **interactive game design document**: a set of playable low-poly demos and an in-universe design doc for a
casual-friendly resistance shooter. Live site (after the one-time Pages setup in
[`docs/adr/0003-pages-deploy.md`](docs/adr/0003-pages-deploy.md)): **https://vincentdn.github.io/partisan-project/**

| Module | What | Path |
|---|---|---|
| Index browser | Nokia-style 1-bit LCD menu with dither | [`index.html`](index.html) |
| **Operator Modder** | Base Operator: equipment slots, colour zones, 10 poses (hero, ready, crouch, kneel, salute…), 3 idles, shareable looks | [`operator/`](operator/) |
| **Weapon Workbench** | AK-74M / AK-15K, 12 attachment slots (rail-aware), stats, rules, finishes, wear, photo | [`workbench/`](workbench/) |
| Asset Viewer | Inspect registered GLBs against triangle and licence budgets | [`viewer/`](viewer/) |
| Design document | In-universe one-pager: pillars, dispatches, operators, moodboard, specs, credits | [`docs/game-design-master-doc.html`](docs/game-design-master-doc.html) |
| Master roadmap | Milestones and ~60 work packets sized for $20 AI plans | [`docs/master-roadmap.md`](docs/master-roadmap.md) |
| Bench Lab | Opt-in animation experiment: staged part changes with hands | [`bench/`](bench/) |
| Vincent to-do | What only you can do (Pages, licences, decisions) | [`docs/vincent-todo.md`](docs/vincent-todo.md) |

## Run it

```sh
npm ci                 # dev tools only; the site has no runtime dependencies
npm run serve          # http://localhost:8123/   (ES modules need http, not file://)
npm test               # unit, plan, register and site-build tests
npm run build && npm run check     # build _site/ and verify every link
npm run test:e2e       # headless-browser smoke test (CHROMIUM=/path/to/chrome if needed)
```

## Layout

```
index.html  assets/{css,js,img,audio,lighting,models,register.json}  shared/  vendor/three/
workbench/  operator/  viewer/        the demos
docs/       master-roadmap.md · game-design-master-doc.html · art-direction.md · moodboard/ · agent-ops/ · adr/ · engineering/
tools/      assets/ (import pipeline) · agent/ (budget system) · build-site.mjs · check-site.mjs · serve.mjs · pose-fit.mjs
tests/      node --test unit tests · e2e/ Playwright smoke + contact sheet
```

## How the work is organised

Development is done by AI agents on two $20 subscriptions (Claude Pro and ChatGPT Plus), passing work back and
forth when a usage window runs out. The method, the packet list and the handoff protocol are in
[`docs/agent-ops/`](docs/agent-ops/README.md). Agents start from [`AGENTS.md`](AGENTS.md).

## Adding an asset

```sh
python tools/assets/import-asset.py --in assets-incoming/thing.obj --out build/thing.raw.glb --length 0.99 --auto-axis
node   tools/assets/optimize-glb.mjs build/thing.raw.glb assets/models/weapons/thing.glb
node   tools/assets/register.mjs add --id … --label … --path assets/models/weapons/thing.glb --kind weapon \
       --license CC0 --author … --source https://… --fulfils wpn-m16
```
Only CC0 / CC BY 4.0 are accepted by the tool. The register feeds the credits and the build audit.

## Licence

All rights reserved (see [`LICENSE`](LICENSE)); third-party assets keep their own licences, listed in
[`assets/REGISTER.md`](assets/REGISTER.md). three.js is MIT (`vendor/three/LICENSE`).
