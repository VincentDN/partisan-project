// The background crew in the Operator Customiser's warehouse: three other insurgents getting on with things while you
// dress yours. One sits on a crate and watches your operator; two stand at an open weapons crate with their backs to
// the camera, one turning a rifle over in his hands, the other reaching into the crate. Each is a full copy of the
// Insurgent (its own skeleton, kit and colours) posed with the rig (operator/rig.js) and breathing on its own idle;
// the rifle in hand is placed like the hero's and the hands are solved onto it (operator/grip.js). A rifle also lies
// on the workbench and two more in the crate. They load after the hero and never block it.
import * as T from 'three';
import {GRIPS} from './grip.js';

/** Poses for the crew, in the rig's character space (degrees; +z forward, +x the figure's left). */
export const CREW_POSES = {
  sit: {
    label: 'Sitting on a crate',
    detail: 'Elbows on the knees, watching.',
    lower: 0.47,
    bones: {
      thigh_r: [-84, 0, 8],
      calf_r: [86, 0, 0],
      thigh_l: [-80, 0, -12],
      calf_l: [78, 0, 0],
      spine_01: [6, 0, 0],
      spine_02: [8, 0, 0],
      upperarm_r: [-38, 0, 30],
      lowerarm_r: [-62, 0, 0],
      upperarm_l: [-34, 0, -30],
      lowerarm_l: [-66, 0, 0],
    },
    curl: {r: 0.55, l: 0.5},
  },
  inspect: {
    label: 'Inspecting a rifle',
    detail: 'Turning a rifle over to look along it.',
    bones: {spine_02: [6, 0, 0], head: [16, 8, 0], thigh_l: [-4, 0, -2], calf_l: [6, 0, 0]},
    curl: {r: 0.85, l: 0.7},
    weapon: {
      anchor: 'spine_03',
      hold: [-0.1, -0.06, 0.33],
      muzzle: [0.7, 0.32, 0.62],
      up: [0.35, 0.8, -0.3],
      hands: {r: 'grip', l: 'handguard'},
    },
  },
  rummage: {
    label: 'Going through a crate',
    detail: 'Bent over the open crate, reaching in.',
    lower: 0.04,
    bones: {
      thigh_r: [-16, 0, 4],
      calf_r: [22, 0, 0],
      thigh_l: [-10, 0, -4],
      calf_l: [16, 0, 0],
      spine_01: [24, 0, 0],
      spine_02: [26, 0, 0],
      spine_03: [14, 0, 0],
      head: [10, -6, 0],
      upperarm_r: [-66, 0, 24],
      lowerarm_r: [-16, 0, 0],
      upperarm_l: [-60, 0, -26],
      lowerarm_l: [-24, 0, 0],
    },
    curl: {r: 0.6, l: 0.4},
  },
};

/** Who stands where: base, kit (an Insurgent state), pose, idle, place (x, z) and facing (radians; 0 = toward camera). */
export const CREW = [
  {
    id: 'watcher',
    state: {'z.top': 'plaidBrown', 'z.pants': 'olive', 'z.shemagh': 'khaki', head: 'bare', face: 'shemagh'},
    pose: 'sit',
    idle: 'weary',
    at: [0.55, -2.45],
    facing: 0.35,
    watch: true, // keeps an eye on the hero
  },
  {
    id: 'inspector',
    state: {
      'z.top': 'tan',
      'z.pants': 'olive',
      'z.gear': 'olive',
      rig: 'full',
      armor: 'plates',
      'z.armor': 'olive',
      head: 'bare',
      face: 'shemagh',
    },
    pose: 'inspect',
    idle: 'calm',
    at: [-3.2, -2.5],
    facing: Math.PI + 0.3,
    rifle: 'ak74m',
  },
  {
    id: 'rummager',
    state: {},
    pose: 'rummage',
    idle: 'alert',
    at: [-2.4, -2.55],
    facing: Math.PI - 0.1,
  },
];

const POLES = {r: [-0.5, -1, -0.45], l: [0.6, -1, -0.3]};
const HERO_HEAD = new T.Vector3(0, 1.68, 0);

/**
 * Load and run the crew. figure(base, state, poses) -> {root, rig}; rifleProp(id) -> Object3D (+x muzzle, grip at 0).
 * Returns {figures, ready: Promise}.
 */
export function mountCrew({scene, warehouse, figure, rifleProp, stage, reduceMotion}) {
  const group = new T.Group();
  group.name = 'crew';
  warehouse.group.add(group); // hidden with the warehouse
  const figures = [];

  // props: a rifle on the workbench and two in the open crate
  const props = (async () => {
    await new Promise(r => setTimeout(r, 1200));
    const B = warehouse.bench;
    const onBench = await rifleProp('ak74m');
    onBench.position.set(B.x + 0.05, B.top + 0.035, B.z + 0.05);
    onBench.rotation.set(Math.PI / 2, 0, 0.06); // lying on its side, muzzle along the bench
    warehouse.group.add(onBench);
    for (const [i, id] of ['ak15k', 'ak74m'].entries()) {
      const r = await rifleProp(id).catch(() => rifleProp('ak74m'));
      r.position.set(-0.2 + i * 0.3, 0.1 + i * 0.05, -0.05 + i * 0.1);
      r.rotation.set(Math.PI / 2, 0.15 - i * 0.3, 0);
      warehouse.crate.add(r);
    }
  })();

  // after the hero has settled, so the crew never slows the first view
  const settled = new Promise(r => setTimeout(r, 1200));
  const ready = settled
    .then(() =>
      Promise.all(
        CREW.map(async def => {
          const {root, rig} = await figure('insurgent', def.state, CREW_POSES);
          root.position.set(def.at[0], 0, def.at[1]);
          root.rotation.y = def.facing;
          rig.setPose(def.pose, 0);
          const f = {def, root, rig, phase: figures.length * 1.7};
          if (def.rifle) {
            f.holder = await rifleProp(def.rifle);
            root.add(f.holder);
          }
          group.add(root);
          figures.push(f);
        }),
      ),
    )
    .then(() => props);

  // placing a held rifle in the figure's own space, then solving the hands onto it (as the hero's carry does)
  const anchor = new T.Vector3(),
    mx = new T.Vector3(),
    my = new T.Vector3(),
    mz = new T.Vector3(),
    basis = new T.Matrix4(),
    q = new T.Quaternion(),
    pole = new T.Vector3(),
    head = new T.Vector3(),
    toHero = new T.Vector3();
  function hold(f) {
    const w = CREW_POSES[f.def.pose].weapon;
    f.root.updateMatrixWorld(true);
    f.root.worldToLocal(f.rig.bones.get(w.anchor).getWorldPosition(anchor));
    mx.fromArray(w.muzzle).normalize();
    my.fromArray(w.up);
    my.addScaledVector(mx, -my.dot(mx)).normalize();
    mz.crossVectors(mx, my);
    q.setFromRotationMatrix(basis.makeBasis(mx, my, mz));
    f.holder.position.fromArray(w.hold).add(anchor);
    f.holder.quaternion.copy(q);
    f.holder.updateMatrixWorld(true);
    for (const [side, gripId] of Object.entries(w.hands)) {
      pole.fromArray(POLES[side]).transformDirection(f.root.matrixWorld);
      f.rig.grip.solve(side, gripId === 'handguard' ? {...GRIPS.handguard} : gripId, f.holder.matrixWorld, pole, 1);
    }
  }

  stage.onFrame((dt, t) => {
    if (!group.parent?.visible) return;
    for (const f of figures) {
      if (f.def.watch) {
        // turn the head toward the hero, with now and then a glance away at the floor
        f.rig.bones.get('head').getWorldPosition(head);
        toHero.copy(HERO_HEAD).sub(head);
        const facing = f.root.rotation.y,
          yaw = (Math.atan2(toHero.x, toHero.z) - facing) * (180 / Math.PI),
          pitch = Math.atan2(toHero.y, Math.hypot(toHero.x, toHero.z)) * (180 / Math.PI);
        const away = reduceMotion ? 0 : Math.max(0, Math.sin(t * 0.21 + 1.3)) ** 6; // a few seconds in every half minute
        const k = 1 - Math.exp(-dt * 3);
        f.rig.look.yaw += (yaw * (1 - away) + -18 * away - f.rig.look.yaw) * k;
        f.rig.look.pitch += (pitch * (1 - away) - 14 * away - f.rig.look.pitch) * k;
      }
      f.rig.update(dt, t + f.phase, f.def.idle, reduceMotion ? 0 : 1);
      f.root.position.y = -f.rig.lower;
      if (f.holder) hold(f);
    }
  });
  ready.then(() => stage.wake(1500)).catch(err => console.warn('crew', err));
  return {figures, ready, group};
}
