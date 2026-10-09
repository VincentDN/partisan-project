# Campaign map performance review — 8 October 2026

The default campaign uses the HD2D renderer in `map/`; the original 3D figures are isolated behind a dynamic import
for `map/3d.html`. The review covers startup, picking, travel, rendering, DOM work and persistence. It does not
claim that a browser frame-rate target has passed without a hardware run.

## Measured CPU result

Run `node tools/perf/map-picking.mjs`. It builds the same 241 × 181 terrain mesh as the old picker, warms both
paths and times 400 deterministic oblique rays over the island. Cloud Node v24.19.0 measured:

| Picker | Median | p95 |
| --- | ---: | ---: |
| Previous Three.js raycast through 86,400 triangles | 3.6860 ms | 4.3075 ms |
| Baked-heightfield sampling and bisection | 0.0063 ms | 0.0388 ms |

That is about 585× less median CPU time for this operation on this host. It is **not** a 585× FPS improvement.
The new picker follows the bilinear sampled surface used by movement; the old mesh has planar triangles between
samples. Small differences within a terrain cell are expected. Tests cover vertical and angled rays, edges,
misses and rays pointing away. This is interactive ground picking, not collision geometry for bullets.

## Changes and tradeoffs

| Path | Previous work | Current work / tradeoff |
| --- | --- | --- |
| Party startup | Imported operator rig, models and weapon modules for both styles | 3D dependencies load only for the 3D demo |
| HDR post-processing | 4× MSAA, 39 texture samples per pixel | Single sample, nine texture reads; slightly softer fine edges and less dense blur |
| Drawing buffer | Device pixel ratio up to 2, no pixel-area cap | DPR at most 1.25 and approximately 1.2M pixels; lower sharpness on large/high-DPI displays |
| Sun shadows | 2048², every render frame | 1024², at most 10 updates/second; softer detail and possible stepping during rapid camera moves |
| Picking | Full terrain triangle intersection on hover/click | Baked heightfield march and bisection |
| Route dots | Up to 900 vectors and matrices rebuilt every frame, including pause | Rebuild after movement at bounded intervals; upload transforms only when route/scale changes |
| Terrain political texture | A new color object per texel | One cached color per faction |
| Labels and clock | Reproject town labels and rewrite the date every frame | Town projection at about 12.5 Hz; write date only when it changes |
| Sprite frame changes | Set material `needsUpdate` for each facing swap | Change the map texture without recompiling the material |
| Background tab | Continued map update requests | Skip simulation and rendering while hidden |
| Campaign state | Convoy positions randomized on load; idle clock not periodically saved | Deterministic initial convoy phase, restored motion records, active-clock autosave |

The GPU changes reduce requested work, but appearance and actual frame-time gains need browser measurement.
Terrain shaders still sample multiple textures, props can still dominate draw calls, and the main map still
renders while visible and paused. The navigation grid is baked synchronously at startup. These are the next
profiling targets, not completed optimizations. CPU `PARP_MAP.performance` measurements measure submission work;
they do not synchronously time the GPU.

## Verification and remaining gate

The seven mission roster tests, migration/recovery/operation tests and picking tests pass. Intentional health and
roster changes require updated deterministic replay fixtures; map-only optimizations do not alter combat rules.
Site build and link/import validation pass. Full test execution in the restricted sandbox reports subprocess
failures for CLI/asset/site harnesses; direct checks distinguish those from gameplay assertions.

Chromium launch is blocked by the cloud sandbox's socket restriction (`setsockopt: Operation not permitted`).
The requested elevated run was interrupted before results. Browser suite, screenshots, accessibility and actual
FPS are therefore pending; no successful browser run is claimed for this revision.

For release, run the map travel, campaign bridge/loop, full smoke and accessibility suites. Capture before/after
HD2D at 1280×800 and on the target phone, including initial load, standing, marching, zoomed-out view, rapid pan,
a visible encounter modal, and ten mission round trips. Report p50/p95 frame time, long tasks, draw calls,
triangles, texture allocation and memory after returning. Target 60 FPS laptop / 30 FPS midrange phone; retain
visual comparisons in the owner image log when shared. The earlier 3D demo is not the performance baseline for
HD2D; use pre-change `map25/` for a like-for-like comparison.


## 9 October follow-up

Hosted run [37818182112](https://github.com/VincentDN/partisan-project/actions/runs/37818182112) passed the full build,
unit checks and deployment, all general smoke checks, campaign bridge, map travel, campaign loop and inventory.
Its failure occurred later: generated-Recon reload exceeded the generic 30-second navigation timeout. That test
now waits for DOM readiness with a bounded 120-second navigation window and retains the existing operator/weapon
readiness assertions. The remaining character suites and accessibility still require a completed hosted run.

A settled paused map now submits a frame at most twice a second, waking immediately for camera movement, resize
or a ground click. Active travel remains frame-driven. Shadow-camera projection changes only when its extent
changes, and shadow camera movement is synchronized with shadow refresh. Convoy interpolation reuses two vectors
instead of allocating per vehicle/frame, paused convoys skip unchanged transforms, and unchanged party-card rows
are not rebuilt. Decorative motion freezes under reduced-motion preferences. These are work-count reductions;
reference-device FPS and visual acceptance are still pending. Render-budget tests cover pause and immediate wake.

Correctness fixes also restore the saved map speed, retain pause after leaving an encounter, snap restored convoy
orientation, and show the real number of fit named fighters on the map token. Trade/promotion updates immediately
refresh the summary even while paused.
