# Operator Modder: default scene

The Operator Modder's default view as one file, for feedback and paint-overs.

| File | What it is |
|---|---|
| `operator-modder-default.glb` | Everything in the scene: the operator in his default pose (Hero, rifle up) with his AK-74M, the three crew members (seated watcher, rifle inspector, crate rummager) at their idles, the warehouse (walls, floor, crates, barrels, shelving, banner, workbench with its rifle, lamps), every light, and the camera. |
| `scene-settings.json` | What glTF cannot hold: tone mapping and exposure, the background colour and fog, the depth-of-field focus, the hemisphere fill light, each light's values (cone, penumbra, decay), the camera's target and lens, and the operator's kit state. |
| `reference-screenshot.png` | The page as it looks in the browser, to compare against. |

## Opening it

- **Blender** (4.x): File > Import > glTF 2.0. The characters come in as armatures posed as on the page (skins and bone rotations are kept, no animation). Lights arrive as Blender lights: glTF intensities are in candela (spot and point) and lux (directional), so Blender may need its "Lighting Mode: Standard" import option, or scale them to taste.
- **Camera**: the node `OperatorModderCamera` is the page's camera; `CameraTarget` is the point it orbits. Set it active (Ctrl+Numpad 0) for the page's framing; the page renders at whatever aspect the window has.
- **Look**: for the page's look, set the view transform to ACES (Filmic is close), exposure from `scene-settings.json`, world colour to the background colour, and add the fog as volume scatter or mist. The page's depth of field is a screen pass: focus distance and the sharp zone are in the settings file.

## Making it again

`node tools/assets/export-operator-scene.mjs` (needs Chromium; see `tests/e2e/browser.mjs`). It loads the live Operator Modder, waits for the crew, freezes a frame and writes these three files.
