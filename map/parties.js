// Overworld party tokens, vehicles and nameplates; character creation is supplied explicitly by the page entry.
import * as T from 'three';
import {vehicle3d} from './vehicles.js';
import {FACTIONS, PARTY_SPOTS, sample} from './island.js';
import {SOURCES} from '../shared/campaign/contacts.js';
import {MANIFESTS, describeManifest} from '../shared/campaign/cargo.js';
import {CONVOY_ROADS, convoyRoad, freshMotion, driveConvoy, vehicleAt} from '../shared/campaign/world.js';
const FIGURE_SCALE = 3.2;

// ---------- nameplates (HTML over the canvas) ----------
function nameplate(layer, {name, count, faction, kind, cargo = ''}) {
  const f = FACTIONS[faction];
  const el = document.createElement('div');
  el.className = `plate-party ${faction}${kind === 'player' ? ' player' : ''}`;
  el.innerHTML = `<span class="shield" style="--c:${f.banner}">${f.emblem}</span><span class="pname"></span><span class="pcount"></span>`;
  el.querySelector('.pname').textContent = name;
  el.querySelector('.pcount').textContent = count;
  el.title = `${name}: ${count} (${f.name}).${cargo ? ` Cargo: ${cargo}.` : ''}`;
  // a convoy carries its cargo on the plate (WP-W6): what an ambush would bring home
  if (cargo) el.append(Object.assign(document.createElement('span'), {className: 'pcargo', textContent: cargo}));
  layer.append(el);
  return el;
}

/**
 * Build the parties. `makers` swaps how they look: {figure(opts), vehicle(id)} (map/sprite-parties.js draws them as
 * sprites for people in the 2.5-D overworld); both map styles use the original 3-D convoy vehicles.
 */
export async function buildParties(field, layer, {figure, vehicle = vehicle3d}) {
  if (typeof figure !== 'function') throw new TypeError('A party character renderer is required');
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
    // where each man stands relative to the first, so the group can be moved as one (hunters on the march, WP-W11)
    const offsets = men.map(m => [m.root.position.x - men[0].root.position.x, m.root.position.z - men[0].root.position.z]);
    parties.push({
      id: p.id,
      root: men[0].root,
      update: (dt, t) => men.forEach((m, i) => m.update(dt, t + i * 1.3)),
      hide: () => men.forEach(m => (m.root.visible = false)),
      /** Stand the group at (x, z), facing `heading` (radians, as the map's figures turn). */
      place(x, z, heading = null) {
        men.forEach((m, i) => {
          const mx = x + offsets[i][0],
            mz = z + offsets[i][1];
          m.root.position.set(mx, ground(mx, mz), mz);
          if (heading !== null) m.root.rotation.y = heading + (i - 1) * 0.15;
        });
      },
      home: [...p.at],
      kind: 'enemy',
      head: 2.2,
      plate: nameplate(layer, {name: p.name, count: String(p.count), faction: 'invader'}),
    });
  }

  // convoys: a column of vehicles that drives a road to its end, waits, turns round and drives back; what it is (name,
  // escort, vehicles) comes from the campaign's contacts, so the ambush fields the same column (WP-W9). The road and
  // the motion are the world simulation's (shared/campaign/world.js): in a campaign it drives them (p.driven) and
  // this only draws; on the practice map the column drives itself by the same rules.
  for (const id of Object.keys(CONVOY_ROADS)) {
    const src = SOURCES[id],
      road = convoyRoad(id);
    const cars = [];
    for (const vid of src.vehicles) {
      const v = await vehicle(vid);
      group.add(v);
      cars.push(v);
    }
    let placed = false;
    const party = {
      id,
      state: freshMotion(road),
      driven: false,
      root: cars[0],
      hide: () => cars.forEach(v => (v.visible = false)),
      show: () => cars.forEach(v => (v.visible = true)), // a new convoy has set out (WP-W6)
      kind: 'convoy',
      head: 3.2,
      plate: nameplate(layer, {
        name: src.name,
        count: String(src.strength),
        faction: 'invader',
        kind: 'convoy',
        cargo: describeManifest(MANIFESTS[id]),
      }),
      update(dt) {
        if (!party.driven && dt) driveConvoy(road, party.state, cars.length, dt);
        cars.forEach((v, i) => {
          const p = vehicleAt(road, party.state, i);
          v.position.set(p.x, ground(p.x, p.z), p.z);
          let da = p.heading - v.rotation.y;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          v.rotation.y += da * (placed && dt ? Math.min(1, dt * 4) : 1); // turn smoothly, also at the turn-round
        });
        placed = true;
      },
    };
    party.update(0);
    parties.push(party);
  }

  const v = new T.Vector3();
  /** seen(p): is the party within the band's sight (WP-W4: at night, far parties show no nameplate)? */
  function update(dt, t, camera, w, h, seen = () => true) {
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
      const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && (p.kind === 'player' || seen(p));
      p.plate.style.display = on ? '' : 'none';
      if (on) p.plate.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }
  return {group, parties, hero, update};
}
