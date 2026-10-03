# 0014: Workbench fit pass: mounts snapped to the guns, every option checked on a contact sheet

Status: accepted

## Context
Attachments floated off or sank into many of the new rifles: their mount points were set by eye from inspector bounds. The bipod spread its legs fore and aft, the drum did not follow its source, the GP-25 carried a loose grenade, and the StG 44 and PPSh-41 files turned out to face the other way (muzzle at -x), so their mounts were mirrored.

## Decision
- `tools/workbench/fit-audit.mjs` loads every rifle in a browser and ray-casts from outside the gun along each mount's direction onto the gun's own surface (the slot's own part excluded): optic and back-up-sight rails from above, foregrip rails and mag wells from below, side rails from the side, and the muzzle as the front-most run of the barrel (its middle height is the bore). It reports the gap per mount and writes `build/fit-audit.json`.
- `tools/workbench/apply-fit.mjs` writes the snapped positions back into `workbench/models.js` and `workbench/rifles-extra.js`. After the pass every audited mount is within 1 mm of its surface.
- `fit-audit.mjs --sheets` renders a contact sheet per rifle (`build/fit/<id>.png`) with a close-up of every slot option; every rifle was reviewed on it.
- Part fixes: the bipod is turned a quarter so its legs spread sideways; the AK drum keeps its source orientation (angled forward like a curved magazine); the GP-25 drops the loose VOG round and sits its clamp under the handguard; the hand stop sits on the rail; the G3 claw scope sits lower; the Spear's loose cartridge is stripped at import. The GP-25 is no longer offered on the RPK, and the AK pistol grip is no longer offered on the Spear and Bren (it did not fit their frames). StG 44 and PPSh-41 sling, grip and muzzle mounts were mirrored to the right end.

## Consequences
- Re-run the audit after changing a rifle, a default build or a part: `node tools/workbench/fit-audit.mjs`, then `apply-fit.mjs`, then the sheets. Re-render the gun sprites (`tools/sprites/render-weapons.mjs`) afterwards.
- The audit covers mounts with real add-ons; grips, triggers, charging handles, stocks and slings keep hand-set mounts.
