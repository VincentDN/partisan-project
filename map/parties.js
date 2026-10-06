// Parties on the map, Bannerlord-style: each stands on the ground as a figure (or rolls along a road as vehicles) with a
// nameplate floating over it: the faction's banner, the party's name and its strength. The player's party is the
// hooded Recon in the hero pose, rifle raised (the Operator Customiser's rig, pose data and hand IK); Invader patrols
// stand off in the distance; convoys drive the roads back and forth. Figures are drawn at "token" scale, larger than
// the towns, as on Bannerlord's campaign map.
import * as T from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {loadTemplate, loadModel} from '../shared/model-cache.js';
import {Rig} from '../operator/rig.js';
import {Grip, GRIPS} from '../operator/grip.js';
import {posesForProfile} from '../operator/pose-profile.js';
import {BASES} from '../operator/config.js';
import {loadRifle} from '../workbench/rifle-instance.js';
import {applyLoadout, emptyLoadout} from '../workbench/apply-loadout.js';
import {FACTIONS, PARTY_SPOTS, sample} from './island.js';

const FIGURE_SCALE = 3.2; // map units per metre for people (token scale: a party reads at a glance)
const VEHICLE_SCALE = 1.3; // and for vehicles (a little under the people, so a column is not larger than a village)
const POLES = {r: [-0.5, -1, -0.45], l: [0.6, -1, -0.3]};
const recon = BASES['generated-recon'];
let poseData = null;

/** A posed figure holding a rifle: {root, update(dt, t)}. `paint` recolours the uniform (enemies). */
async function figure({pose, idle, rifle = 'ak74m', paint = null}) {
  poseData ??= await (await fetch(new URL('../operator/poses.json', import.meta.url))).json();
  const root = new T.Group();
  const body = SkeletonUtils.clone(await loadTemplate(new URL(recon.model, new URL('../operator/', import.meta.url)).href));
  body.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.frustumCulled = false;
    if (paint && /^M_GR_/.test(o.material.name) && !/skin|face|eye|hair|lash|brow/i.test(o.material.name)) {
      o.material = o.material.clone();
      o.material.color.multiply(new T.Color(paint));
    }
  });
  root.add(body);
  const rig = new Rig(body, posesForProfile(poseData, recon.poseProfile));
  rig.grip = new Grip(rig.bones, rig.rest, recon.grip);
  rig.setPose(pose, 0);
  // the rifle, as the Operator Customiser carries it: grip socket at the pivot, hands solved onto it
  const r = await loadRifle(rifle);
  applyLoadout(r, emptyLoadout(rifle), {value: 0});
  const grip = r.sockets.find(s => s.userData.id === 'grip');
  const gp = grip ? r.model.worldToLocal(grip.getWorldPosition(new T.Vector3())) : new T.Vector3();
  const pivot = new T.Group();
  r.model.position.sub(gp);
  pivot.add(r.model);
  r.model.traverse(o => o.isMesh && (o.castShadow = true));
  root.add(pivot);
  const w = rig.data.poses[pose].weapon;
  const anchor = new T.Vector3(),
    mx = new T.Vector3(),
    my = new T.Vector3(),
    mz = new T.Vector3(),
    basis = new T.Matrix4(),
    pole = new T.Vector3();
  root.scale.setScalar(FIGURE_SCALE);
  return {
    root,
    rig,
    update(dt, t) {
      rig.update(dt, t, idle, 1);
      body.position.y = -rig.lower;
      if (!w) return;
      root.updateMatrixWorld(true);
      root.worldToLocal(rig.bones.get(w.anchor || 'spine_03').getWorldPosition(anchor));
      mx.fromArray(w.muzzle).normalize();
      my.fromArray(w.up);
      my.addScaledVector(mx, -my.dot(mx)).normalize();
      mz.crossVectors(mx, my);
      pivot.quaternion.setFromRotationMatrix(basis.makeBasis(mx, my, mz));
      pivot.position.fromArray(w.hold).add(anchor).sub(mx.fromArray(GRIPS.grip.at).applyQuaternion(pivot.quaternion));
      pivot.updateMatrixWorld(true);
      for (const [side, gripId] of Object.entries(w.hands || {r: 'grip'})) {
        pole.fromArray(w.pole?.[side] || POLES[side]).transformDirection(root.matrixWorld);
        const at = r.config.handguardAt;
        rig.grip.solve(side, gripId === 'handguard' && at ? {...GRIPS.handguard, at} : gripId, pivot.matrixWorld, pole, 1);
      }
    },
  };
}

// ---------- nameplates (HTML over the canvas) ----------
function nameplate(layer, {name, count, faction, kind}) {
  const f = FACTIONS[faction];
  const el = document.createElement('div');
  el.className = `plate-party ${faction}${kind === 'player' ? ' player' : ''}`;
  el.innerHTML = `<span class="shield" style="--c:${f.banner}">${f.emblem}</span><span class="pname"></span><span class="pcount"></span>`;
  el.querySelector('.pname').textContent = name;
  el.querySelector('.pcount').textContent = count;
  el.title = `${name}: ${count} (${f.name}). Placeholder party.`;
  layer.append(el);
  return el;
}

// ---------- vehicles ----------
const VEHICLES = {
  matv: {file: 'matv.glb', length: 6.3},
  truck: {file: 'army-truck.glb', length: 8},
  humvee: {file: 'humvee.glb', length: 4.9},
};
/** A vehicle laid along +x (its front), wheels on y = 0, at token scale. */
async function vehicle(id) {
  const v = VEHICLES[id];
  const model = await loadModel(new URL(`../assets/models/vehicles/${v.file}`, import.meta.url).href);
  const holder = new T.Group();
  holder.add(model);
  model.updateMatrixWorld(true);
  let box = new T.Box3().setFromObject(model);
  const size = box.getSize(new T.Vector3());
  if (size.z > size.x) model.rotation.y = Math.PI / 2; // the long side along x
  model.updateMatrixWorld(true);
  box = new T.Box3().setFromObject(model);
  const s = (v.length * VEHICLE_SCALE) / box.getSize(new T.Vector3()).x;
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  box = new T.Box3().setFromObject(model);
  const c = box.getCenter(new T.Vector3());
  model.position.sub(new T.Vector3(c.x, box.min.y, c.z));
  holder.traverse(o => o.isMesh && (o.castShadow = true));
  return holder;
}

export async function buildParties(field, roads, layer) {
  const group = new T.Group();
  group.name = 'parties';
  const parties = [];
  const ground = (x, z) => sample(field, x, z);

  // the player: the hooded Recon on a knoll in the Resistance's hills, rifle raised, looking out toward Fort Orion
  const hero = await figure({pose: 'hero', idle: 'calm'});
  hero.root.position.set(PARTY_SPOTS.player[0], ground(...PARTY_SPOTS.player), PARTY_SPOTS.player[1]);
  hero.root.rotation.y = 1.15; // looking east toward the raiders on the ridge, three-quarters to the opening camera
  group.add(hero.root);
  parties.push({
    ...hero,
    kind: 'player',
    head: 2.2,
    plate: nameplate(layer, {name: "Lead rebel's band", count: '9', faction: 'resistance', kind: 'player'}),
  });

  // Invader patrols in the distance, in a slate-grey uniform
  const PATROLS = [
    {
      id: 'orion-patrol',
      name: 'Orion garrison patrol',
      count: 24,
      at: PARTY_SPOTS.orion,
      facing: 2.6,
      men: [
        ['ready', 'alert'],
        ['relaxed', 'calm'],
        ['ready', 'alert'],
      ],
    },
    {
      id: 'korfos-checkpoint',
      name: 'Checkpoint Korfos',
      count: 12,
      at: PARTY_SPOTS.korfos,
      facing: 2.2,
      men: [
        ['relaxed', 'calm'],
        ['ready', 'alert'],
      ],
    },
    {
      id: 'raiders',
      name: 'Raiding party',
      count: 31,
      at: PARTY_SPOTS.raiders,
      facing: -1.4, // toward the player
      men: [
        ['ready', 'alert'],
        ['ready', 'alert'],
        ['relaxed', 'weary'],
      ],
    },
  ];
  for (const p of PATROLS) {
    const men = [];
    for (const [i, [pose, idle]] of p.men.entries()) {
      const f = await figure({pose, idle, paint: '#8d97a3', rifle: i === 2 ? 'rpk' : 'ak74m'});
      const ox = (i - (p.men.length - 1) / 2) * 2.2,
        oz = (i % 2) * 1.6;
      const x = p.at[0] + Math.cos(p.facing) * ox,
        z = p.at[1] + Math.sin(p.facing) * ox + oz;
      f.root.position.set(x, ground(x, z), z);
      f.root.rotation.y = p.facing + (Math.random() - 0.5) * 0.5;
      group.add(f.root);
      men.push(f);
    }
    parties.push({
      id: p.id,
      root: men[0].root,
      update: (dt, t) => men.forEach((m, i) => m.update(dt, t + i * 1.3)),
      hide: () => men.forEach(m => (m.root.visible = false)),
      kind: 'enemy',
      head: 2.2,
      plate: nameplate(layer, {name: p.name, count: String(p.count), faction: 'invader'}),
    });
  }

  // convoys: a column of vehicles that drives a road to its end, waits, turns round and drives back
  const COLUMNS = [
    {id: 'supply-convoy', road: 'fort-orion>agia-marina', name: 'Supply convoy', count: 14, vehicles: ['matv', 'truck', 'truck']},
    {id: 'armoured-column', road: 'kastro>fort-orion', name: 'Armoured column', count: 18, vehicles: ['humvee', 'matv', 'truck', 'humvee']},
    {id: 'fuel-convoy', road: 'fort-orion>myrtia', name: 'Fuel convoy', count: 9, vehicles: ['matv', 'truck']},
  ];
  for (const c of COLUMNS) {
    const [a, b] = c.road.split('>');
    const road = roads.find(r => (r.from === a && r.to === b) || (r.from === b && r.to === a));
    if (!road) continue;
    const pts = road.points;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1];
    const at = s => {
      s = Math.max(0, Math.min(total, s));
      let i = cum.findIndex(d => d >= s);
      i = Math.max(1, i);
      const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return {
        p: pts[i - 1].clone().lerp(pts[i], k),
        d: pts[i]
          .clone()
          .sub(pts[i - 1])
          .normalize(),
      };
    };
    const cars = [];
    for (const id of c.vehicles) {
      const v = await vehicle(id);
      group.add(v);
      cars.push(v);
    }
    const gap = 10;
    const state = {s: Math.random() * (total - gap * cars.length), dir: 1, wait: 0, speed: 9};
    const update = dt => {
      if (state.wait > 0) state.wait -= dt;
      else {
        state.s += state.dir * state.speed * dt;
        const end = state.dir > 0 ? total - 2 : gap * (cars.length - 1) + 2;
        if ((state.dir > 0 && state.s >= end) || (state.dir < 0 && state.s <= end)) {
          state.s = end;
          state.wait = 2.5;
          state.dir *= -1;
          state.s += state.dir * gap * (cars.length - 1); // the column turns round: the last vehicle leads back
        }
      }
      cars.forEach((v, i) => {
        const {p, d} = at(state.s - state.dir * i * gap);
        v.position.copy(p);
        const want = Math.atan2(-d.z * state.dir, d.x * state.dir);
        let da = want - v.rotation.y;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        v.rotation.y += da * Math.min(1, dt * 4); // turn smoothly, also at the turn-round
      });
    };
    update(0);
    parties.push({
      id: c.id,
      root: cars[0],
      update,
      hide: () => cars.forEach(v => (v.visible = false)),
      kind: 'convoy',
      head: 3.2,
      plate: nameplate(layer, {name: c.name, count: String(c.count), faction: 'invader', kind: 'convoy'}),
    });
  }

  const v = new T.Vector3();
  function update(dt, t, camera, w, h) {
    for (const p of parties) {
      if (p.root.visible === false) {
        p.plate.style.display = 'none'; // gone from the map (destroyed in the campaign)
        continue;
      }
      p.update(dt, t);
      // the nameplate rides above the party's head, smaller as the camera climbs
      v.copy(p.root.position);
      v.y += p.head * (p.kind === 'convoy' ? 1 : FIGURE_SCALE) + 1;
      v.project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      p.plate.style.display = on ? '' : 'none';
      if (on) p.plate.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }
  return {group, parties, hero, update};
}
