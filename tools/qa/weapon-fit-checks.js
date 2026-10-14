// Cross-slot fit regressions against loaded meshes, including every magazine/underbarrel/handguard choice and rail extreme.
import {applySlotState} from '../../workbench/rifle-instance.js';
import {localBounds} from '../../workbench/attachment-fit.js';
import {frontInEnvelope} from '../../workbench/attachment-clearance.js';
import {blockedBy} from '../../workbench/stats.js';
import {resolve, clash} from '../../workbench/rails.js';

export function checkFits(rifle, reset) {
  const errors = [],
    counts = {underbarrel: 0, optics: 0, pairs: 0};
  const check = (ok, label) => {
    if (!ok) errors.push(`${rifle.id}: ${label}`);
  };
  const {foregrip: fg, magazine: mag, handguard: hg, optic, buis} = rifle.slots;
  const handguards = hg?.options || [null];
  for (const handguard of handguards)
    for (const m of mag.options)
      for (const f of fg.options) {
        if (!f.object) continue;
        for (const offset of [fg.rail.min, 0, fg.rail.max]) {
          reset();
          if (handguard) applySlotState(rifle, 'handguard', handguard.id, 0);
          applySlotState(rifle, 'foregrip', f.id, offset);
          applySlotState(rifle, 'magazine', m.id, 0); // changing magazine second must re-fit the already mounted part
          const magazine = m.original ? mag.original : m.object;
          const a = f.object.userData.fitBody.clone().translate(f.object.position).translate(fg.container.position);
          if (magazine) {
            const edge = frontInEnvelope(magazine, rifle.model, a);
            check(
              edge <= a.min.x - 0.006 || edge === -Infinity,
              `${f.id}/${m.id}/${handguard?.id || 'fixed'}@${offset}: magazine clearance`,
            );
          }
          const before = f.object.position.clone();
          applySlotState(rifle, 'foregrip', f.id, offset);
          check(before.distanceTo(f.object.position) < 1e-6, `${f.id}/${m.id}: fitting must be stable and order-independent`);
          check(
            f.object.userData.mountPosts.every(p => p.scale.y > 0 && p.scale.y < 0.09),
            `${f.id}: connected mount posts`,
          );
          counts.underbarrel++;
        }
      }
  for (const o of optic.options)
    for (const b of buis.options) {
      reset();
      applySlotState(rifle, 'optic', o.id, 0);
      applySlotState(rifle, 'buis', b.id, 0);
      const items = [optic, buis].map(s => ({
        slot: s.spec.id,
        rail: 'top',
        baseX: s.base.x,
        offset: 0,
        fp: s.options.find(x => x.id === rifle.build[s.spec.id]).fp || [0, 0],
        travel: s.rail,
      }));
      const result = resolve(items, 'optic', o.fp || [0, 0], 0);
      if (result.ok) {
        for (const item of items) item.offset = result.offsets[item.slot] ?? item.offset;
        check(!clash(...items), `${o.id}/${b.id}: resolved rail footprints overlap`);
      }
      counts.optics++;
    }
  const slots = Object.entries(rifle.slots);
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++) {
      const [a, sa] = slots[i],
        [b, sb] = slots[j];
      reset();
      for (const oa of sa.options) {
        applySlotState(rifle, a, oa.id, 0);
        for (const ob of sb.options) {
          if (blockedBy({[a]: oa.id}, b, ob.id)) continue;
          applySlotState(rifle, b, ob.id, 0);
          for (const o of [oa, ob])
            if (o.object) {
              check(o.object.visible, `${a}/${oa.id} + ${b}/${ob.id}: selected part stays visible`);
              check(o.object.position.toArray().every(Number.isFinite), `${a}/${oa.id} + ${b}/${ob.id}: finite placement`);
            }
          counts.pairs++;
        }
      }
    }
  reset();
  // The factory chassis must survive taking its stock and magazine off.
  if (rifle.id === 'mk14') {
    applySlotState(rifle, 'stock', 'none', 0);
    applySlotState(rifle, 'magazine', 'none', 0);
    const fixed = rifle.model.children.filter(o => o.name.endsWith(':fixed-chassis'));
    check(fixed.length >= 10 && fixed.every(o => o.visible), 'fixed chassis stays visible');
  }
  if (rifle.id === 'bren') {
    applySlotState(rifle, 'optic', 'scope', 0);
    const object = optic.options.find(o => o.id === 'scope').object;
    const a = object.userData.fitBody.clone().translate(object.position).translate(optic.container.position);
    const b = localBounds(mag.original, rifle.model);
    check(a.max.z < b.min.z, 'offset scope clears top-fed magazine');
  }
  reset();
  return {counts, errors};
}
