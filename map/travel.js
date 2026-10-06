// The band on the campaign map (WP-W3): click land and the player's party marches there along the quickest route
// (shared/campaign/nav.js: never through sea, quick on roads, slow in forest and snow), shown as a dashed line to a
// marker; the camera follows it until you pan away (F brings it back). It moves on the map clock, so pause stops it.
// In a campaign (?campaign) its position lives in the campaign save, and the map settles a mission left unfinished.
import * as T from 'three';
import {buildNav, findPath, advance, groundAt} from '../shared/campaign/nav.js';
import {createStore} from '../shared/campaign/state.js';
import {settleAbandoned} from '../shared/campaign/encounter.js';
import {sample, PARTY_SPOTS, provinceAt} from './island.js';

/** Map seconds to campaign hours: the map clock runs 0.6 hours a second (map/map.js). */
const HOURS_PER_SECOND = 0.6;
const GROUND_NAMES = {road: 'road', plain: 'open country', forest: 'forest', mountain: 'mountains', steep: 'steep ground', snow: 'snow'};

export function mountTravel({scene, camera, field, terrain, stageEl, hero, cam, toast, reduceMotion, params}) {
  const nav = buildNav();
  // ---------- the campaign save ----------
  let store = null,
    campaign = null,
    note = '';
  if (params.has('campaign')) {
    try {
      store = createStore(localStorage);
    } catch {
      store = createStore(null);
    }
    campaign = store.load().campaign;
    const left = settleAbandoned(campaign);
    if (left) note = left.outcome === 'withdrawn' ? 'The band fell back from an unfinished mission. The fighters are wounded.' : '';
  }
  const [sx, sz] = campaign?.world.party ? [campaign.world.party.x, campaign.world.party.z] : PARTY_SPOTS.player;
  const party = {x: sx, z: sz, heading: hero.root.rotation.y, route: null};
  const save = () => {
    if (!campaign) return;
    campaign.world.party = {x: Math.round(party.x * 10) / 10, z: Math.round(party.z * 10) / 10};
    store.save(campaign);
  };
  if (campaign && !campaign.world.party) save();
  if (note) toast(note);

  // ---------- the route on the ground and the marker at its end ----------
  const lineMat = new T.LineDashedMaterial({
    color: '#f3e3a8',
    dashSize: 2.2,
    gapSize: 1.4,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  let line = null;
  const marker = new T.Mesh(
    new T.RingGeometry(1.6, 2.3, 32).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({color: '#f3e3a8', transparent: true, opacity: 0.9, depthTest: false}),
  );
  marker.renderOrder = line?.renderOrder ?? 5;
  marker.visible = false;
  scene.add(marker);
  function drawRoute() {
    if (line) {
      scene.remove(line);
      line.geometry.dispose();
      line = null;
    }
    if (!party.route) return void (marker.visible = false);
    const pts = [new T.Vector3(party.x, 0, party.z), ...party.route.points.slice(party.route.leg).map(p => new T.Vector3(p.x, 0, p.z))];
    const draped = [];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1],
        b = pts[k],
        n = Math.max(1, Math.ceil(a.distanceTo(b) / 2));
      for (let s = k === 1 ? 0 : 1; s <= n; s++) {
        const p = a.clone().lerp(b, s / n);
        p.y = Math.max(0.3, sample(field, p.x, p.z)) + 0.6;
        draped.push(p);
      }
    }
    line = new T.Line(new T.BufferGeometry().setFromPoints(draped), lineMat);
    line.computeLineDistances();
    line.renderOrder = 5;
    scene.add(line);
    const end = draped.at(-1);
    marker.position.set(end.x, end.y, end.z);
    marker.visible = true;
  }

  // ---------- orders: a click (not a drag) on land ----------
  const ray = new T.Raycaster(),
    mouse = new T.Vector2();
  let down = null,
    follow = true;
  const hours = s => {
    const h = Math.round(s * HOURS_PER_SECOND);
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${Math.max(1, h)}h`;
  };
  /** Order the band to (x, z). Returns the route, or null (nowhere to go: open sea). */
  function moveTo(x, z) {
    const r = findPath(nav, party, {x, z});
    if (!r) {
      toast('There is no way there: open sea.');
      return null;
    }
    party.route = {points: r.points, leg: 1};
    follow = true;
    const end = r.points.at(-1),
      ground = GROUND_NAMES[groundAt(nav, end.x, end.z)] || 'open country';
    toast(`Marching to ${provinceAt(end.x, end.z).name} province (${ground}) · about ${hours(r.time)}`);
    drawRoute();
    save();
    return r;
  }
  stageEl.addEventListener('pointerdown', e => (down = {x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey}));
  stageEl.addEventListener('pointermove', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) follow = false; // the player is panning
  });
  stageEl.addEventListener('pointerup', e => {
    const d = down;
    down = null;
    if (!d || d.button !== 0 || d.shift || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    const r = stageEl.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(terrain.mesh, false)[0];
    if (hit) moveTo(hit.point.x, hit.point.z);
  });
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, select, textarea')) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(k)) follow = false;
    if (k === 'f') follow = true; // back to the band
  });
  addEventListener('pagehide', save);

  // ---------- each frame ----------
  let sinceSave = 0,
    walk = 0;
  function place() {
    hero.root.position.set(party.x, sample(field, party.x, party.z), party.z);
    hero.root.rotation.y = party.heading;
  }
  place();
  cam.tx = cam.x = party.x + 32;
  cam.tz = cam.z = party.z - 2;
  function update(dt) {
    if (party.route) {
      const arrived = advance(nav, party, dt);
      walk += dt;
      place();
      if (!reduceMotion) hero.root.position.y += Math.abs(Math.sin(walk * 9)) * 0.25; // the march
      drawRoute();
      sinceSave += dt;
      if (arrived || sinceSave > 5) {
        sinceSave = 0;
        save();
      }
      if (arrived) toast(`The band has arrived in ${provinceAt(party.x, party.z).name} province.`);
    }
    if (follow) {
      cam.tx = party.x;
      cam.tz = party.z;
    }
    lineMat.opacity = 0.7 + 0.25 * Math.sin(performance.now() / 300);
  }
  return {
    nav,
    party,
    moveTo,
    update,
    get campaign() {
      return campaign;
    },
    get following() {
      return follow;
    },
  };
}
