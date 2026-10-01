# Skeleton contract

Every PARP operator base shares one skeleton so that poses, idles, weapon props and the customiser UI work on any of
them the day they exist. The contract is what a new base (Recon, Insurgent, Enforcer, …) must provide.

## Required

| Item | Rule |
|---|---|
| Bones | The 83 bones of the Base Operator (UE5-mannequin naming): `root`, `pelvis`, `spine_01..04`, `neck_01..03`, `head`, `clavicle_l/r`, `upperarm_*` (+2 twists), `lowerarm_*` (+2 twists), `hand_*`, five fingers × 3 joints + metacarpals, `thigh_*` (+2 twists), `calf_*`, `foot_*`, `ball_*`, plus the IK helper roots. The authoritative list is `assets/models/operators/base-operator.manifest.json` → `bones`. |
| Rest pose | The same A-pose. Poses are deltas over the rest pose, so a different rest pose shifts every pose. |
| Orientation | Character faces +Z, up is +Y, its left is +X. Armature node carries the cm→m scale (0.01) and the Y-up rotation; meshes are skinned to it. |
| Height | ≈ 1.85 m after scale (bases may differ ±8 %; poses still apply). |
| Meshes | `SK_*` nodes, one mesh per equipment part, skinned to the shared skeleton (max 4 influences). |
| Materials | `M_*` names; **never merged** (they are the colour zones). Textured fabrics keep UVs. |
| Budget | ≤ 15,000 triangles total, ≤ 60 draw calls, ≤ 1.5 MB GLB (meshopt). |

## Pose data (`operator/poses.json`)

Rotations are **character-space degrees `[x, y, z]`** applied over the rest pose:

```
local = restLocal · W⁻¹ · R · W        (W = the bone's rest world orientation, R = the delta)
```

- `x` pitches about the left–right axis: for a hanging limb, **negative swings forward**; for a spine bone (pointing up), positive leans forward.
- `y` turns about the vertical axis: positive turns toward the character's left.
- `z` rolls about the front–back axis: on the right arm positive moves the arm toward the body; on the left arm negative does.
- `curl: {r, l}` (0–1) expands to finger/thumb rotations (`Rig.expand`).
- `weapon: {hand, rotation, offset}` places a prop at the hand's position with an orientation in character space (no IK).
- Idle layers: `{bone, axis, amp, hz, phase?, offset?}`; frequencies are well below 1 Hz and amplitudes ≤ 30°.

Authoring aid: `node tools/pose-fit.mjs <pose> <r|l> x,y,z [weapon=ak74m]` solves arm angles to reach a hand target.

## Verification

`tests/rig.test.mjs` checks the maths and that every bone named in `poses.json` exists in the manifest;
`tests/skeleton-contract.test.mjs` applies every pose and idle to a skeleton rebuilt from the manifest's bone names
(any base that passes the manifest check passes this) and rejects non-finite output; `tests/operator-config.test.mjs`
checks parts and zones against the model.

## Adding a base (checklist)

1. Build or retarget meshes to the contract skeleton (Blender, `tools/assets/export-operator.py` as the model).
2. `node tools/assets/optimize-operator.mjs <in> <out>` (writes the manifest).
3. Add the base to the roster config (`WP-C4`), register the asset (`register.mjs add`).
4. `npm test`, then `node tests/e2e/contact-sheet.mjs` and review every pose for clipping.
