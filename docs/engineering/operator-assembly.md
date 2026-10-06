# Equipment assembly contract

WP-CM4, 6 October 2026. [assembly.js](../../operator/assembly.js) and [assembly-schema.js](../../operator/assembly-schema.js) implement the renderer-independent equipment rules for CM5–CM8. CM4 does not add visible equipment or replace the existing slot-based Modder. The first asset-backed catalogue and carrier fit arrive in CM5; the interactive assembly editor and save migration arrive in CM8.

## API

```js
import {resolveAssembly, detachAssembly} from '../../operator/assembly.js';

const candidate = resolveAssembly(catalogue, outfit);
if (candidate.ok) {
  // Commit the edit, then build candidate.active in its parent-first order.
  // candidate.coverage names fully covered body regions.
} else {
  // Keep the last valid rendered outfit and show candidate.errors.
  // Preserve the submitted outfit, including unknown items, for recovery.
}
const {outfit: stripped, draft} = detachAssembly(outfit, 'carrier-1');
// A future undo operation restores draft.instances, then resolves the whole outfit again.
```

`resolveAssembly(catalogue, outfit, {triangleLimit = 15000})` returns `{ok, errors, active, coverage, budget}`. Inputs are JSON data and are never mutated. Valid results contain cloned instances in deterministic parent-first order, each with a `transform` in its parent's local coordinate frame. The root's transform is `null`. A rejected result has empty `active` and `coverage`; it must not partially replace a working assembly.

Diagnostics contain a stable `code`, `instanceId`, a plain-language `message`, and, where relevant, `relatedId` or `itemId`. Codes distinguish malformed definitions/outfits, unknown items, duplicate IDs, missing parents, ownership cycles, parent families, mount types, footprints, overlap, skeleton/fit versions, depth, numeric placement overflow, exclusions, coverage and budgets. Render messages as text. Unknown definitions are never silently deleted or substituted.

`budget` contains `triangles`, `limit` and `complete`. The count includes every instance, including repeated pouches, hidden accessories and covered body geometry. Unknown definitions make the known subtotal incomplete; invalid input shape prevents counting. Coverage and visibility never discount cost. The operator cap defaults to 15,000; weapon geometry remains subject to its separate 30,000 cap. Any future visible contents must be child instances with their own measured cost.

`detachAssembly(outfit, instanceId)` returns a new outfit and a recoverable draft containing the item and every descendant, preserving instance IDs, finishes and attachment locations. It rejects a missing item, malformed instance data or removal of the root body. The draft retains its former parent link; it is not a standalone outfit. CM8 must retain the prior outfit for undo, restore the subtree into a compatible parent, and re-run resolution before committing. This is not a gameplay inventory transaction.

## Authored item definitions

A catalogue is a list of definitions with unique IDs. Unknown extra metadata is retained by the caller; the resolver only interprets the fields below. Geometry loading and material application remain renderer responsibilities.

| Field | Meaning |
|---|---|
| `id`, `family` | Stable definition ID and family such as `carrier`, `pouch` or `body` |
| `skeletonId`, `fitProfile` | Required skeleton contract and exact body-fit name |
| `owner` | Allowed parent families; an empty list for the body |
| `mountType` | Required attachment type, such as `webbing`; `null` for the body |
| `footprint` | Positive integer `[columns, rows]`; no runtime rotation or free scaling |
| `depth` | Equipment's fixed authored offset along the mount's outward local +Z, in metres |
| `excludes` | Families that cannot coexist anywhere in this outfit; a declaration on either item rejects the pair |
| `coverage` | Names of fully covered body regions; these request optional hiding, not geometry repair |
| `materialRegions` | Unique named regions reserved for finishes; this resolver does not repaint materials |
| `triangleCount` | Non-negative measured integer cost of all loaded geometry for one instance |
| `mounts` | Named sockets and grids exposed to children; may be empty |

The single root definition has family `body`, `complete: true`, `coverageRegions` and `compatibleSkeletons`. Equipment must match its `fitProfile`. Its `skeletonId` must match the body or appear in the body's explicit compatibility list. For the foundation, a `recon-v2` body can explicitly accept `recon-v1` equipment because CM3 preserved every v1 rest frame. Version strings are not inferred to be compatible.

Coverage regions must exist on a complete, independently validated body. The result is the sorted union from attached items. Removing one covering item does not restore a region while another still covers it. CM5 should begin with empty coverage arrays until covered patches are independently authored and checked; never use masks to conceal incomplete clothing or visible intersections.

Each mount has a unique `id` within its parent, attachment `type`, `kind: 'socket' | 'grid'`, `position: [x,y,z]`, unit `quaternion: [x,y,z,w]`, `scale: 1` and inclusive `depthRange: [min,max]`. Units are metres in the parent item's local frame. Mount IDs can repeat on different parent instances.

A grid also has positive integer `columns` and `rows`, and positive metre `spacing: [column,row]`. Cell `[0,0]` is the authored surface origin. The resolver rotates `[column * spacing[0], row * spacing[1], depth]` through the mount quaternion and adds its position. Local +X advances columns, +Y advances rows, +Z points outward. Authored geometry must place its attachment origin at the footprint's first cell. A named socket uses cell `[0,0]` and a `[1,1]` footprint. Other attachment variants need distinct fitted definitions.

Overlapping rectangles on the same parent instance and mount are rejected; touching edges are allowed. A six-column panel accepts a two-column pouch starting at column four, but not five. Different mounts have independent occupancy. Cross-surface geometric intersections and animation clearance still require asset fitting and visual tests; this resolver does not infer them from cells.

## Placed items

An outfit has `version: 1`, `rootId` and at most 256 `instances`. Each instance contains:

```json
{
  "id": "mag-left",
  "itemId": "pouch.rifle",
  "parentId": "carrier-1",
  "mount": "front",
  "cell": [0, 0],
  "finish": {"fabric": "olive"}
}
```

The root instance uses `parentId: null`, `mount: null`, `cell: [0,0]`. Instance IDs, unlike definition IDs, distinguish repeated copies. Children may appear before parents in input. Ownership must form one tree rooted at the body. Extra JSON metadata such as finish choices is cloned intact; it does not create geometry, override authored transforms, or alter budget accounting. This internal schema does not redefine weapon `P1` codes or replace existing URL saves.

## Verification and next milestone

Run `node --test tests/operator-assembly.test.mjs`. The fixtures include a body, carrier, two repeated pouches and a nested radio/pouch, exercising rotated grid placement, exact edges, overlap, parent removal/restoration, coverage restoration, exclusions, version mismatch, malformed imports, overflow and conservative budgets. Fixtures describe the contract; their carrier/pouch dimensions and costs are not measured shipping assets. Both runtime modules are included in configured JS type checking.

CM5 must author the lightweight carrier's separate front/rear plate bags, shoulders, cummerbund and placard, then provide asset-backed definitions and measured parent-local mounts. Bind those mounts to the authored torso/mesh frames in the renderer, validate empty and loaded poses, and register measured geometry. Keep the legacy slot interface until the assembly editor is ready.
