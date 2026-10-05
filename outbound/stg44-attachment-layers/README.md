# StG 44: attachment placement layers

The StG 44 in the Weapon Modder's 3/4 view (3000×2000), with every attachment it can take drawn on its own transparent layer at its **default** mount position (rail offset 0), for marking up where each should really sit.

| File | What it is |
|---|---|
| `stg44-attachments.tif` | Layered TIFF (Photoshop layers, deflate). Photoshop, GIMP 2.10+ and Affinity open the layers; other viewers show the flattened image. |
| `stg44-attachments.psd` | The same layers as a PSD, in case a tool reads only one of the two. |
| `preview.png` | Everything flattened on grey, half size. |
| `layers.json` | Layer names, the camera, and each mount point's pixel position. |

**Layers, bottom to top:** `00 Rifle (factory build)`; then one per attachment: muzzle (suppressor, compensator, AK-74 brake), optic (4× scope, micro dot, holographic), flip-up back-up sight, foregrip (vertical, angled, hand stop, bipod, GP-25), side rail (light, laser, light + laser), translucent magazine, CNC M-LOK handguard, pistol grips (classic, machined), CNC folding stock, match trigger, extended charging handle, slings (swivel, two-point); and on top `25 Mount points`, a crosshair and the slot name where each slot sits.

Attachments are drawn over the rifle, not hidden behind it, so each one shows whole. Replaced parts (stock, grip, handguard, magazine) show only the new part; the rifle layer still has the original.

**Feedback that helps most:** move or rotate a layer to where the part belongs (or draw an arrow), and say whether the mount point itself is wrong (every attachment in that slot moves together) or only that one part.

Made with `node tools/assets/render-attachment-layers.mjs stg44` and `python3 tools/assets/layered-tiff.py build/layers-stg44 outbound/stg44-attachment-layers stg44-attachments`; any rifle id works.
