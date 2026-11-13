# StG 44 (2044) rebuild tests C, D, E: brief for the next agent

Copy everything below the rule into a new agent session opened on `VincentDN/partisan-project`.

---

You are continuing a modelling bake-off for the **StG 44 (2044)**, a modernised Sturmgewehr for the Partisan Project
(a static three.js site; read `AGENTS.md`, then `docs/agent-ops/STATE.md`, before anything else). Two rebuilds already
exist and ship on the gunsmith bench at `workbench/stg44/`, behind a Rebuild switch:

- **A · LLM-Rebuild** (`tools/assets/build-stg44-2044-a.py`): every part rebuilt in Blender Python from the base model's
  landmarks. Real-rifle detail (bolt, ejection port, charging handle, selector, pins, sights, M-LOK, Picatinny) placed
  from side-by-side reference views, then chamfered. About 46,700 triangles fitted. Clean, but over the 30,000 budget.
- **B · Neuro-Bash** (`tools/assets/build-stg44-2044-b.py`): the base hull kept, blobby regions cut out and replaced by
  parts from free CC BY donor rifles (`inbound/sketchfab/ak-47-4k-many-pieces`, `inbound/sketchfab/low-poly-akb-15`).
  About 22,900 triangles. Fast, but the hull stays soft and the donors read as an AK.

Your job: make three more rebuilds, **C, D and E**, from **the same base model**, each with a different AI modelling
technique, so the owner can compare all five on the bench.

## The base model (start every test from it)

- `inbound/magnific/stg44-2044-base/model.glb`: a Magnific (Tripo) image-to-3D StG. Good silhouette and proportions,
  but a blobby blockout: no hard edges, fused details, uneven triangles.
- Normalise it as A and B do (see `normalize()` in `build-stg44-2044-b.py`): drop the floating island, +X to the muzzle,
  +Z up, 94 cm long, butt at X = 0.
- Keep its overall shape and the placement of every major part. Do not redesign the rifle.
- Shared helpers: `tools/assets/stg44_kit.py` (authoring frame in cm, `export()` to the bench frame: metres, trigger at
  x = 0, bore at y = 0.05, +x muzzle, +y up, +z the rifle's right side).

Landmarks measured off the base (cm, authoring frame): bore z −4.2; trigger X 36.75; receiver X 24–54.75; ejection port
right side X 44–52.5; charging knob left X 44; magazine well X 41–50.5; grip X 26–34.5, down to z −17.2; selector X
31.25; stock X 0–18.25; handguard X 56.5–86.9; gas housing X 54.75–72.5; top rail z ≈ 3.25, X 41.5–72.5; rear sight X
45.5–52; front sight X 89.25–92.25; muzzle device X 92–94.

## The three tests

Use a different technique for each. These are suggestions; if a better technique fits a letter, swap it in, and say why.

- **C · Retopo + bake.** Make a clean, low-poly game mesh over the base: automatic retopology (Instant Meshes,
  QuadriFlow in Blender, or Magnific `models3d_remesh`), hard-surface edits where the base is mushy, UV unwrap, and bake
  normal and AO maps from a high-poly version (the base, or A's geometry used as a high-poly). Test whether baked detail
  beats modelled detail at a lower triangle cost.
- **D · AI regeneration from references.** Run Magnific image-to-3D or multiview generation again, fed with ortho renders
  of the base plus a cleaned-up concept: paint over the renders to add the real-rifle details A placed. Then segment the
  result into parts (`models3d_segment`, or by hand in Blender) so stocks, magazines and the muzzle can swap. Test how
  far a better input gets a generator.
- **E · Procedural / parametric (SDF or CSG).** Build the rifle as a parameter-driven node graph: Blender Geometry Nodes
  or an SDF modeller, booleans with bevel modifiers, every dimension in a parameter table measured off the base. Test
  whether a parametric rifle is easier to vary (barrel length, stock, magazine) than A's hand-coded parts.

For each test: a generator under `tools/assets/build-stg44-2044-<c|d|e>.py` (or a written procedure plus its inputs,
when a step is manual or uses a hosted service), output at `assets/models/weapons/stg44-2044-<c|d|e>.glb`.

## Contract with the bench (each GLB must meet it)

- **Frame:** the bench frame given above, so attachments seat without new numbers. Rails: top rail at y ≈ 0.126–0.131 m,
  x 0.047–0.356; bottom rail at y ≈ 0.030–0.033 m, x 0.2045–0.2745; muzzle face at x ≈ 0.554–0.556 m.
- **Node names** (the bench toggles and seats these): `stock_fixed*`, optional `stock_adj_body` and `stock_adj_tube`;
  `mag_25*`, `mag_40*`; `muzzle_*` (the rifle's own muzzle device); everything else free-form.
- **Material names**, one of `body`, `furniture`, `steel`, `black`, `red`. The bench swaps in its painted, edge-worn
  finishes by name.
- **Wear mask:** a float vertex attribute `_EDGE` (1 on chamfers and sharp edges) exported with
  `export_attributes=True`. The finish shader reads it as `aEdge` to chip paint first there. C may bake it into a
  texture instead; if so, tell the owner which bench change that needs.
- **Budget:** the AGENTS.md weapon budget is 30,000 triangles. Record each result's count honestly and note any overrun
  in `assets/register.json`.

## Wiring into the bench

- `workbench/stg44/rifle.js`: add each test to `RIFLES` (file, label such as `C · Retopo-Bake`, a one-sentence note,
  mounts). The panel builds a button for every entry.
- `loadRifles()` loads every rebuild up front. With five rifles, switch it to load on demand (cache the first load) so
  the page stays quick.
- Keep each module under 300 lines, with its one-line purpose comment.

## Comparison the owner wants

For every test (A and B included), give one contact sheet in the same lighting with views from the left, right, top and
canted three-quarter, plus a close-up of the receiver. Report the triangle count, file size, wall-clock time and any
service credits used, and say what each technique does well and badly. End with a recommendation for the hero
pipeline. Save every image you show to `outbound/wip-images/YYYY-MM-DD_HHMMSS.png` (UTC) and commit it.

## Rules (from AGENTS.md; they apply here)

- Relative URLs only; no CDN; three.js is vendored.
- Never commit `*.blend`, `*.fbx` or `assets-incoming/`.
- Credits and licences: do not spend tokens on them (hidden test project). Store donors under `inbound/<site>/<name>/`
  with their `source.json`, as B's donors are.
- Before committing, run `npm test`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`,
  `npm run check` and a headless check of the bench (every rebuild loads, no console errors). Also update the
  `CHANGELOG.md` entry, `node tools/agent/codemap.mjs` and the register budgets.
- Branch `claude/stg44-rebuild-cde` (or `codex/…`). Commit style `feat(stg44): …` with a body that says what was
  verified. Open a pull request and merge it only if the owner asks.
