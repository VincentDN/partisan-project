# 0005 · Scope removals, and the operator on the purchased skeleton

**Status** accepted · 2026-10-01

**Context.** The previous demo had test firing, recoil, a range drill, a code-built procedural operator with IK "Field" poses, an animated workbench scene with articulated hands, and an "Advanced animations" experiment. The art direction now calls for a low-poly operator customiser with hero poses; the owner bought a modular low-poly soldier (21 skinned meshes, 83-bone skeleton, 8,646 triangles).

**Decision.**
1. Remove weapon firing (sound, flash, recoil kick, reload, drill), the bench scene with hands and its tests, the advanced-animation modules, and the code-built operator + IK field.
2. The **Operator Customiser** replaces them: Base Operator loaded from the purchased asset, equipment slots from the modular meshes, colour zones from its materials, poses and idles as **data**.
3. Pose data model: per-bone rotations in **character space** (degrees) applied on top of the rest pose: `local = restLocal · W⁻¹ · R · W`. This makes poses independent of internal bone axes and portable to any base on the same skeleton.
4. Weapons appear only as **props** placed at a hand position in character space; there are no hand-IK animations. Contact fitting is an authoring tool (`tools/pose-fit.mjs`) that outputs numbers into `poses.json`.

**Consequences.** Stats such as recoil and loudness remain as illustrative handling stats on the Workbench; they are design values, not a firing simulation. The roadmap's retired X0–X6 track is not carried forward (see `docs/archive/`).
