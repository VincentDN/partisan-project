// Weapon Workbench: the StG bench's canted showroom view — the rifle rolls about its bore in the hero, 3/4 and muzzle views.
// Cant per camera view, in radians: level for the flat left, right and top views.
const CANT = {hero: 0.2, three: 0.2, muzzle: 0.1, left: 0, right: 0, top: 0};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createCant() {
  let cant = CANT.hero,
    to = CANT.hero;
  return {
    /** Ease toward the cant of a camera view (instant under reduced motion). */
    view(name) {
      to = CANT[name] ?? 0;
      if (reduceMotion) cant = to;
    },
    /** Per frame: roll the rifle and anything that turns with it (yaw for the turntable first, then the roll). */
    apply(dt, objects) {
      cant += (to - cant) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 6));
      for (const o of objects) {
        if (!o) continue;
        o.rotation.order = 'YXZ';
        o.rotation.x = cant;
      }
    },
    get moving() {
      return Math.abs(to - cant) > 1e-4;
    },
  };
}
