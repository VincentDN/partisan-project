// The band on the campaign map (WP-W3): click land and the player's party marches there along the quickest route
// (shared/campaign/nav.js: never through sea, quick on roads, slow in forest and snow), shown as a trail of dots to a
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

  // ---------- the route on the ground (a trail of dots, as Bannerlord draws one) and the marker at its end ----------
  // drawn over the terrain and sized with the camera's distance, so it reads at every zoom
  const MAX_DOTS = 900,
    DOT_GAP = 3;
  const dotMat = new T.MeshBasicMaterial({color: '#f6e7b0', transparent: true, opacity: 0.95, depthTest: false});
  const dots = new T.InstancedMesh(new T.CircleGeometry(0.55, 12).rotateX(-Math.PI / 2), dotMat, MAX_DOTS);
  dots.name = 'route';
  dots.count = 0;
  dots.renderOrder = 5;
  dots.frustumCulled = false;
  const marker = new T.Mesh(
    new T.RingGeometry(1.5, 2.3, 32).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({color: '#f6e7b0', transparent: true, opacity: 0.95, depthTest: false}),
  );
  marker.name = 'route-end';
  marker.renderOrder = 5;
  marker.visible = false;
  scene.add(dots, marker);
  let trail = []; // the dots' ground positions
  const m4 = new T.Matrix4(),
    q = new T.Quaternion(),
    sc = new T.Vector3(),
    at = new T.Vector3();
  function drawRoute() {
    trail = [];
    if (!party.route) {
      dots.count = 0;
      marker.visible = false;
      return;
    }
    const pts = [{x: party.x, z: party.z}, ...party.route.points.slice(party.route.leg)];
    let carry = DOT_GAP * 0.6; // the first dot a little ahead of the band
    for (let k = 1; k < pts.length && trail.length < MAX_DOTS; k++) {
      const a = pts[k - 1],
        b = pts[k],
        len = Math.hypot(b.x - a.x, b.z - a.z);
      for (let d = carry; d < len && trail.length < MAX_DOTS; d += DOT_GAP) {
        const x = a.x + ((b.x - a.x) * d) / len,
          z = a.z + ((b.z - a.z) * d) / len;
        trail.push(new T.Vector3(x, Math.max(0.3, sample(field, x, z)) + 0.5, z));
      }
      carry = (((carry - len) % DOT_GAP) + DOT_GAP) % DOT_GAP;
    }
    const end = pts.at(-1);
    marker.position.set(end.x, Math.max(0.3, sample(field, end.x, end.z)) + 0.5, end.z);
    marker.visible = true;
  }
  /** Size the dots and the marker for the camera's distance: a few pixels across whatever the zoom. */
  function sizeRoute() {
    const k = T.MathUtils.clamp(cam.d / 95, 0.6, 5);
    dots.count = trail.length;
    for (let i = 0; i < trail.length; i++) dots.setMatrixAt(i, m4.compose(at.copy(trail[i]), q, sc.setScalar(k)));
    dots.instanceMatrix.needsUpdate = true;
    marker.scale.setScalar(k * (1 + 0.08 * Math.sin(performance.now() / 260)));
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
    sizeRoute();
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
