// Parties on the map, Bannerlord-style: each stands on the ground as a figure (or rolls along a road as vehicles) with a
// nameplate floating over it: the faction's banner, the party's name and its strength. The player's party is the
// hooded Recon in the hero pose, rifle raised (the Operator Customiser's rig, pose data and hand IK); Invader patrols
// stand off in the distance; convoys drive the roads back and forth. Figures are drawn at "token" scale, larger than
// the towns, as on Bannerlord's campaign map.
import * as T from 'three';
import {vehicle3d} from './vehicles.js';
import {FACTIONS, PARTY_SPOTS, sample} from './island.js';
const FIGURE_SCALE = 3.2;

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

/**
 * Build the parties. `makers` swaps how they look: {figure(opts), vehicle(id)} (map/sprite-parties.js draws them as
 * sprites for people in the 2.5-D overworld); both map styles use the original 3-D convoy vehicles.
 */
export async function buildParties(field, roads, layer, makers = {}) {
  const models = makers.figure ? null : await import('./models.js');
  const figure = makers.figure || models.figure3d,
    vehicle = makers.vehicle || vehicle3d;
  const group = new T.Group();
  group.name = 'parties';
  const parties = [];
  const ground = (x, z) => sample(field, x, z);

  // the player: the hooded Recon on a knoll in the Resistance's hills, rifle raised, looking out toward Fort Orion
  const hero = await figure({pose: 'hero', idle: 'calm', side: 'partisan', crowd: 3});
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
      const f = await figure({pose, idle, paint: '#8d97a3', rifle: i === 2 ? 'rpk' : 'ak74m', side: 'army'});
      const ox = (i - (p.men.length - 1) / 2) * 2.2,
        oz = (i % 2) * 1.6;
      const x = p.at[0] + Math.cos(p.facing) * ox,
        z = p.at[1] + Math.sin(p.facing) * ox + oz;
      f.root.position.set(x, ground(x, z), z);
      f.root.rotation.y = p.facing + (i - 1) * 0.15;
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
    const sampledPosition = new T.Vector3(),
      sampledDirection = new T.Vector3();
    const at = s => {
      s = Math.max(0, Math.min(total, s));
      let i = cum.findIndex(d => d >= s);
      i = Math.max(1, i);
      const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return {
        p: sampledPosition.copy(pts[i - 1]).lerp(pts[i], k),
        d: sampledDirection
          .copy(pts[i])
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
    const state = {s: total * 0.35, dir: 1, wait: 0, speed: 9};
    let placed = false,
      lastS = NaN,
      lastDir = 0;
    const update = dt => {
      if (!dt && placed && state.s === lastS && state.dir === lastDir) return;
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
        v.rotation.y += da * (placed && dt ? Math.min(1, dt * 4) : 1); // turn smoothly, also at the turn-round
      });
      placed = true;
      lastS = state.s;
      lastDir = state.dir;
    };
    update(0);
    parties.push({
      id: c.id,
      state,
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
