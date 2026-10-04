// Partisan Tactical, 2.5-D sprite view: draws the simulation (convoy/sim.js) on a Canvas 2-D in the RimWorld style.
// Layers: baked ground (terrain textures, feathered patches and roads, grass and scatter, scorch marks), then shadows,
// then every object sorted by its south edge (cover, vehicles, pawns, trees), then effects and labels on top.
// x runs east and z south in metres; the camera looks straight down, objects show their front faces (2.5-D).
import {loadArt, loadGuns, buildPawn, lookFor, savedLook, DEFAULT_GUN, tinted, atlasCell} from './sprite-art.js';
import {WEAPONS} from './weapons.js';

const PPM = 32; // pixels per metre at zoom 1 (art bible: 1 m = 32 px)

/** Small deterministic generator: the scatter is the same every visit. */
function lcg(seed) {
  let a = seed >>> 0;
  return () => (a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const canvas = (w, h) => Object.assign(document.createElement('canvas'), {width: w, height: h});
const hex = n => '#' + n.toString(16).padStart(6, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Error function (Abramowitz-Stegun 7.1.26), for the hit chance. */
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
}
/**
 * The chance a round from u hits o: the simulation's aim error is about normal with a standard deviation
 * of 0.575 x the shooter's spread (sim.shoot); a hit is an error smaller than the target's half-width seen from the muzzle.
 */
export function hitChance(u, o, W) {
  const d = Math.max(0.5, Math.hypot(o.x - u.x, o.z - u.z));
  if (d > W.range) return 0;
  const sigma = (W.spread * 0.9 + (u.supp || 0) * 0.1 * (u.armour ?? 1) + (u.moving ? 0.045 : 0)) * 0.575;
  return erf(Math.atan((o.r || 0.4) / d) / (sigma * Math.SQRT2));
}

export async function createSpriteRenderer(view) {
  const [art, guns] = await Promise.all([loadArt(), loadGuns()]);
  // The set's flash and glow motes keep their shape in a very faint alpha (a shader brightens them in the original):
  // scale the alpha once so they read on a canvas. ShotHit_Dirt and ShotHit_Spark have no alpha at all and are not used.
  const brighten = (img, peak) => {
    if (!img) return img;
    const c = canvas(img.width, img.height),
      g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height),
      px = d.data;
    let max = 1;
    for (let i = 3; i < px.length; i += 4) max = Math.max(max, px[i]);
    for (let i = 3; i < px.length; i += 4) px[i] = Math.min(255, (px[i] * peak) / max);
    g.putImageData(d, 0, 0);
    return c;
  };
  const fx = {shotFlash: brighten(art.shotFlash, 255), fireGlow: brighten(art.fireGlow, 210), dustPuff: brighten(art.dustPuff, 170)};
  const ctx = view.getContext('2d');
  const pawns = new Map(); // unit id -> {south, east, north} or a pending promise
  const camera = {x: 0, z: 0, zoom: 0.85, aimK: 0};
  let ground = null; // {canvas, scale, minX, minZ}
  let level = null;
  const scorch = []; // explosions already burnt into the ground
  const smoke = []; // drifting puffs {x, z, t, life, r}
  let lastSim = null,
    dpr = 1;

  function pawnFor(u) {
    const p = pawns.get(u.id);
    if (p && !p.then) return p;
    if (!p)
      pawns.set(
        u.id,
        buildPawn(lookFor(u)).then(s => (pawns.set(u.id, s), s)),
      );
    return null;
  }

  // ---------- ground ----------
  function textureFor(color) {
    const r = (color >> 16) & 255,
      g = (color >> 8) & 255,
      b = color & 255,
      lum = (r + g + b) / 765;
    if (lum < 0.2) return 'rockFloor';
    if (g > r + 6 && g > b) return lum < 0.28 ? 'soilRich' : 'mossy';
    return 'dirt';
  }
  function pattern(g, img, metres, scale) {
    const p = g.createPattern(img, 'repeat');
    const k = (metres * scale) / img.width;
    p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    return p;
  }
  /** A textured rectangle with soft edges, painted onto the ground canvas. */
  function featherRect(g, img, rect, scale, origin, feather = 1.6, alpha = 1, metres = 12) {
    const W = g.canvas.width,
      Hh = g.canvas.height;
    const layer = canvas(W, Hh),
      lg = layer.getContext('2d');
    lg.filter = `blur(${feather * scale}px)`;
    lg.fillStyle = '#fff';
    lg.fillRect((rect.x - rect.w / 2 - origin.x) * scale, (rect.z - rect.d / 2 - origin.z) * scale, rect.w * scale, rect.d * scale);
    lg.filter = 'none';
    lg.globalCompositeOperation = 'source-in';
    lg.fillStyle = pattern(lg, img, metres, scale);
    lg.fillRect(0, 0, W, Hh);
    g.globalAlpha = alpha;
    g.drawImage(layer, 0, 0);
    g.globalAlpha = 1;
  }
  function bakeGround(L) {
    const B = L.bounds,
      margin = 24;
    const area = (B.maxX - B.minX + margin * 2) * (B.maxZ - B.minZ + margin * 2);
    const scale = area > 12000 ? 16 : PPM; // big maps bake at half resolution
    const origin = {x: B.minX - margin, z: B.minZ - margin};
    const W = Math.ceil((B.maxX - B.minX + margin * 2) * scale),
      Hh = Math.ceil((B.maxZ - B.minZ + margin * 2) * scale);
    const c = canvas(W, Hh),
      g = c.getContext('2d');
    const base = L.night ? art.rockFloor : art.soil;
    g.fillStyle = pattern(g, base, 12, scale);
    g.fillRect(0, 0, W, Hh);
    if (L.night) {
      g.fillStyle = 'rgba(40,52,40,.35)';
      g.fillRect(0, 0, W, Hh);
    }
    for (const p of L.ground.patches || []) featherRect(g, art[textureFor(p.color)], p, scale, origin, 2.2, 0.9);
    for (const r of L.ground.roads || []) featherRect(g, art.gravel, r, scale, origin, 0.9, 1, 8);
    // scatter: smears and stones everywhere, grass and bushes off the roads and out of cover
    const rnd = lcg(L.id.length * 977 + 13);
    const onRoad = (x, z) => (L.ground.roads || []).some(r => Math.abs(x - r.x) < r.w / 2 + 0.6 && Math.abs(z - r.z) < r.d / 2 + 0.6);
    const inCover = (x, z) => L.cover.some(b => Math.abs(x - b.x) < b.w / 2 + 0.8 && Math.abs(z - b.z) < b.d / 2 + 0.8);
    const stamp = (img, x, z, size, rot = 0, alpha = 1, color = null) => {
      if (!img) return;
      g.save();
      g.globalAlpha = alpha;
      g.translate((x - origin.x) * scale, (z - origin.z) * scale);
      g.rotate(rot);
      const s = size * scale;
      g.drawImage(tinted(img, color), -s / 2, -s / 2, s, s);
      g.restore();
    };
    const n = Math.round(area / (L.night ? 30 : 9));
    for (let i = 0; i < n; i++) {
      const x = origin.x + rnd() * (W / scale),
        z = origin.z + rnd() * (Hh / scale);
      const k = rnd();
      if (onRoad(x, z) || inCover(x, z)) continue;
      else if (L.night) stamp(art.rockB, x, z, 0.4 + rnd() * 0.4, rnd() * 6, 1, '#6b675e');
      else if (k < 0.75) stamp(rnd() < 0.5 ? art.grassA : art.grassB, x, z, 0.8 + rnd() * 0.6, 0, 0.95);
      else if (k < 0.85) stamp(rnd() < 0.5 ? art.bushA : art.bushB, x, z, 1.2 + rnd() * 0.8, 0, 1);
      else if (k < 0.92) stamp([art.rockA, art.rockB, art.rockC][Math.floor(rnd() * 3)], x, z, 0.5 + rnd() * 0.4, rnd() * 6, 1, '#9b9688');
      else stamp([art.rockA, art.rockB][Math.floor(rnd() * 2)], x, z, 0.35 + rnd() * 0.3, rnd() * 6, 1, '#8a8478');
    }
    // a darker vignette outside the playable area
    g.fillStyle = 'rgba(10,14,8,.45)';
    g.fillRect(0, 0, W, (B.minZ - origin.z) * scale);
    g.fillRect(0, (B.maxZ - origin.z) * scale, W, Hh);
    g.fillRect(0, 0, (B.minX - origin.x) * scale, Hh);
    g.fillRect((B.maxX - origin.x) * scale, 0, W, Hh);
    return {canvas: c, scale, origin};
  }
  function burn(e) {
    const g = ground.canvas.getContext('2d'),
      s = ground.scale;
    const gx = (e.x - ground.origin.x) * s,
      gz = (e.z - ground.origin.z) * s,
      r = e.r * s * 0.9;
    const grad = g.createRadialGradient(gx, gz, 0, gx, gz, r);
    grad.addColorStop(0, 'rgba(20,16,12,.75)');
    grad.addColorStop(0.6, 'rgba(30,24,18,.4)');
    grad.addColorStop(1, 'rgba(30,24,18,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(gx, gz, r, r * 0.85, 0, 0, Math.PI * 2);
    g.fill();
  }

  // ---------- helpers in screen space ----------
  let W = 0,
    Hh = 0,
    ppm = PPM;
  const shake = {trauma: 0, x: 0, y: 0};
  const sx = x => (x - camera.x) * ppm + W / 2 + shake.x,
    sy = z => (z - camera.z) * ppm + Hh / 2 + shake.y;
  function shadow(x, z, rx, rz, alpha = 0.28) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(sx(x) + rx * 0.15 * ppm, sy(z) + rz * 0.2 * ppm, rx * ppm, rz * ppm, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  /** Draw an image centred on (x, z), size in metres, optional rotation and flip. */
  function sprite(img, x, z, w, h, {rot = 0, flipX = false, flipY = false, alpha = 1, oy = 0, filter = null} = {}) {
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (filter) ctx.filter = filter;
    ctx.translate(sx(x), sy(z) + oy * ppm);
    ctx.rotate(rot);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, (-w / 2) * ppm, (-h / 2) * ppm, w * ppm, h * ppm);
    ctx.restore();
  }

  // ---------- cover ----------
  /** A linked wall run (sandbags, field stones, bricks): one atlas cell per metre along its long side. */
  function linked(img, b, color) {
    const t = tinted(img, color);
    const horizontal = b.w >= b.d,
      n = Math.max(1, Math.round(horizontal ? b.w : b.d)),
      step = (horizontal ? b.w : b.d) / n,
      thick = Math.max(1, horizontal ? b.d : b.w);
    for (let i = 0; i < n; i++) {
      const mask = n === 1 ? 0 : horizontal ? (i > 0 ? 8 : 0) | (i < n - 1 ? 2 : 0) : (i > 0 ? 1 : 0) | (i < n - 1 ? 4 : 0);
      const {sx: cx, sy: cy, s} = atlasCell(img, mask);
      const x = horizontal ? b.x - b.w / 2 + step * (i + 0.5) : b.x,
        z = horizontal ? b.z : b.z - b.d / 2 + step * (i + 0.5);
      const w = horizontal ? step : thick,
        h = horizontal ? thick : step;
      ctx.drawImage(t, cx, cy, s, s, sx(x - w / 2) - 0.5, sy(z - h / 2) - 0.5, w * ppm + 1, h * ppm + 1);
    }
  }
  function box25(b, top, front, outline = '#1d1b17') {
    // a plain 2.5-D block: the top face, a front face below it, a dark outline
    const lift = Math.min(b.h, 2.5) * 0.45;
    const x0 = sx(b.x - b.w / 2),
      y0 = sy(b.z - b.d / 2) - lift * ppm,
      w = b.w * ppm,
      d = b.d * ppm;
    ctx.fillStyle = front;
    ctx.fillRect(x0, y0 + d, w, lift * ppm);
    ctx.fillStyle = top;
    ctx.fillRect(x0, y0, w, d);
    ctx.lineWidth = Math.max(1.5, ppm * 0.06);
    ctx.strokeStyle = outline;
    ctx.strokeRect(x0, y0, w, d + lift * ppm);
  }
  function drawCover(b, sim) {
    const k = b.kind;
    if (k === 'rock' || k === 'cave') {
      if (k === 'cave') return box25(b, '#4d4a42', '#2e2c27');
      shadow(b.x, b.z, b.w * 0.6, b.d * 0.45);
      const img = [art.rockA, art.rockB, art.rockC][Math.abs(Math.round(b.x * 3 + b.z)) % 3];
      sprite(tinted(img, '#928d80'), b.x, b.z, b.w * 1.25, b.d * 1.25 + b.h * 0.4, {oy: -b.h * 0.2});
    } else if (k === 'wall') linked(art.sandbags, b, '#aaa597');
    else if (k === 'sandbag') linked(art.sandbags, b, '#c2ad7e');
    else if (k === 'log') {
      shadow(b.x, b.z, b.w * 0.7, b.d * 0.5);
      const vertical = b.d > b.w,
        len = Math.max(b.w, b.d),
        n = Math.max(1, Math.round(len / 2.4));
      for (let i = 0; i < n; i++) {
        const t = -len / 2 + (len / n) * (i + 0.5);
        sprite(art.log, b.x + (vertical ? 0 : t), b.z + (vertical ? t : 0), len / n + 0.6, len / n + 0.6, {
          rot: vertical ? Math.PI / 4 : -Math.PI / 4,
        });
      }
    } else if (k === 'wreck') {
      shadow(b.x, b.z, b.w * 0.55, b.d * 0.5);
      sprite(art.carWreck, b.x, b.z, b.w * 1.1, b.d * 1.45, {oy: -0.3});
    } else if (k === 'barn' || k === 'building') {
      shadow(b.x + 0.6, b.z + 0.4, b.w * 0.55, b.d * 0.55, 0.35);
      linked(art.planks, {...b, z: b.z + b.d / 2 - 0.5, d: 1}, '#9a7650'); // front wall
      ctx.save();
      const lift = 1.2;
      const x0 = sx(b.x - b.w / 2),
        y0 = sy(b.z - b.d / 2) - lift * ppm;
      ctx.fillStyle = pattern(ctx, tinted(art.woodFloor, k === 'barn' ? '#8a4a32' : '#7a6a58'), 3, ppm);
      ctx.translate(x0, y0);
      ctx.fillRect(0, 0, b.w * ppm, (b.d - 0.4) * ppm);
      ctx.strokeStyle = '#1d1b17';
      ctx.lineWidth = Math.max(1.5, ppm * 0.06);
      ctx.strokeRect(0, 0, b.w * ppm, (b.d - 0.4) * ppm);
      ctx.beginPath(); // the ridge
      ctx.moveTo(0, ((b.d - 0.4) / 2) * ppm);
      ctx.lineTo(b.w * ppm, ((b.d - 0.4) / 2) * ppm);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.stroke();
      ctx.restore();
    } else if (k === 'tree') {
      shadow(b.x + 1, b.z + 0.4, 1.8, 0.9, 0.3);
      sprite(Math.abs(Math.round(b.x + b.z)) % 3 ? art.treeOakA : art.treePine, b.x, b.z, 4.2, 4.2, {oy: -1.6});
    } else if (k === 'crate') {
      shadow(b.x, b.z, b.w * 0.6, b.d * 0.5);
      sprite(art.crate, b.x, b.z, b.w * 1.1, b.d * 1.1 + 0.3, {oy: -0.2});
    } else if (k === 'truck' || k === 'tank') {
      shadow(b.x, b.z, b.w * 0.55, b.d * 0.5);
      sprite(art.truck, b.x, b.z, b.w * 1.05, b.d * 1.5, {oy: -0.3, filter: 'brightness(.8) saturate(.6)'});
    } else if (k === 'tower') box25(b, '#6b6658', '#4c483e');
    else if (k === 'target' || k === 'mast') {
      shadow(b.x + 2, b.z + 0.3, 2.5, 0.4, 0.25);
      box25({...b, h: 1.5}, '#5a5d55', '#3d3f39');
      ctx.strokeStyle = '#2a2b27';
      ctx.lineWidth = ppm * 0.18;
      ctx.beginPath();
      ctx.moveTo(sx(b.x), sy(b.z) - ppm);
      ctx.lineTo(sx(b.x), sy(b.z) - (b.h || 8) * 0.6 * ppm);
      ctx.stroke();
    } else box25(b, '#8c846f', '#5e5848');
  }

  // ---------- vehicles ----------
  const vehicleArt = v => (v.kind === 'mrap' ? art.apc : v.kind === 'truck' ? art.truck : art.jeep);
  function drawVehicle(v, sim, now) {
    shadow(v.x + 0.4, v.z + 0.3, v.w * 0.55, v.d * 0.55, 0.35);
    const filter = v.destroyed ? 'grayscale(.7) brightness(.42)' : 'sepia(.35) saturate(.55) hue-rotate(28deg) brightness(.95)';
    sprite(vehicleArt(v), v.x, v.z, v.w * 1.15, v.d * 1.6, {oy: -0.35, filter});
    const gunner = v.crew.find(c => c.role === 'turret');
    if (gunner) {
      const rot = gunner.alive ? gunner.facing : 0.4;
      sprite(art.turret, v.x - 0.2, v.z - 0.5, 2.6, 2.6, {rot, filter: v.destroyed ? 'brightness(.35)' : null});
      if (gunner.alive && !v.destroyed) {
        const p = pawnFor(gunner);
        if (p) sprite(p.south, v.x - 0.2, v.z - 0.9, 1.3, 1.3);
      }
    }
    if (v.destroyed && now - (v._puff || 0) > 0.35) {
      v._puff = now;
      smoke.push({x: v.x + (Math.random() - 0.5) * v.w * 0.5, z: v.z - 0.5, t: now, life: 3.5, r: 1.6});
    }
  }

  // ---------- pawns ----------
  /** The gun a unit shows: a rebel's chosen cosmetic gun replaces its first weapon; otherwise the side's default. */
  function gunFor(u) {
    const chosen = u.side === 'partisan' && u.weapon === u.weapons[0] ? savedLook(u.id).gun : null;
    return guns[chosen] || guns[DEFAULT_GUN[u.side]?.[u.weapon]] || Object.values(guns)[0];
  }
  function drawPawn(u, sim, opts) {
    if (u.escaped || u.state === 'mounted' || u.state === 'turret' || (u.role === 'turret' && !u.alive)) return;
    const p = pawnFor(u);
    const size = 2.4;
    shadow(u.x, u.z + 0.1, 0.45, 0.22, 0.3);
    if (!p) return;
    const a = u.facing,
      cx = Math.cos(a),
      cz = Math.sin(a);
    // four facings: east/west from the side, north/south from the front or back
    const dir = Math.abs(cx) > Math.abs(cz) ? (cx > 0 ? 'east' : 'west') : cz > 0 ? 'south' : 'north';
    const img = dir === 'west' ? p.east : p[dir];
    const bob = u.moving && u.alive ? Math.abs(Math.sin(sim.time * 9 + u.x)) * 0.06 : 0;
    if (!u.alive) {
      sprite(img, u.x, u.z, size, size, {rot: Math.PI / 2, filter: 'grayscale(.4) brightness(.6)', flipX: dir === 'west'});
      return;
    }
    const gun = gunFor(u),
      left = cx < 0;
    // drawn a little larger than life, as the set does, with the grip near the body
    const len = gun ? gun.length * 1.4 : 1,
      gh = gun ? (len * gun.img.height) / gun.img.width : 0.5,
      off = len * 0.28;
    const drawWeapon = () => gun && sprite(gun.img, u.x + cx * off, u.z + cz * off + 0.12, len, gh, {rot: a, flipY: left, oy: -0.2 - bob});
    if (dir === 'north') drawWeapon(); // held in front: behind the body from this side
    sprite(img, u.x, u.z, size, size, {flipX: dir === 'west', oy: -0.5 - bob});
    if (dir !== 'north') drawWeapon();
    if (u.searching) ring(u.x, u.z, 0.9, '#e9d27a', u.searching.progress / (u.searching.search ?? 3));
    if (opts.labels) label(u, opts);
  }
  function ring(x, z, r, color, frac = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx(x), sy(z), r * ppm, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
  }
  /** RimWorld-style name label under the pawn, with a small health bar when hurt. */
  function label(u, {selected, active}) {
    const x = sx(u.x),
      y = sy(u.z) + 0.45 * ppm;
    const name = u.side === 'partisan' ? u.name : u.role === 'leader' || u.role === 'rto' ? u.name : '';
    ctx.font = `${Math.round(Math.max(10, 11 * Math.min(1.4, camera.zoom)))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (name) {
      const w = ctx.measureText(name).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(x - w / 2, y, w, 14);
      ctx.fillStyle = u.side === 'partisan' ? '#f2f2e6' : '#f2c9a0';
      ctx.fillText(name, x, y + 1);
    }
    if (u.hp < 100) {
      const w = 0.9 * ppm;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(x - w / 2, y + (name ? 15 : 0), w, 3);
      ctx.fillStyle = u.hp > 50 ? '#8fc35a' : '#d9673c';
      ctx.fillRect(x - w / 2, y + (name ? 15 : 0), (w * Math.max(0, u.hp)) / 100, 3);
    }
    if (active || selected) brackets(u.x, u.z - 0.45, 0.85, active ? '#ffffff' : '#ffd36b');
  }
  function brackets(x, z, r, color) {
    const X = sx(x),
      Y = sy(z),
      R = r * ppm,
      L = R * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ctx.moveTo(X + dx * R, Y + dy * R - dy * L);
      ctx.lineTo(X + dx * R, Y + dy * R);
      ctx.lineTo(X + dx * R - dx * L, Y + dy * R);
    }
    ctx.stroke();
  }

  // ---------- effects ----------
  // RimWorld-style combat: rounds are sprites in flight (sim.projectiles), every shot flashes at the muzzle and lights
  // the ground, and what a round hits throws up its own motes: dirt and dust, sparks off metal, chips off walls, blood
  // that stays on the ground. The camera kicks with your own shots, near misses and blasts (not under reduced motion).
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = new WeakSet();
  const flashes = []; // {x, z, a, t, life, size}
  const motes = []; // {img, x, z, y, vx, vz, vy, gravity, t, life, size, grow, alpha, rot, vr, add}
  const screen = {a: 0, color: '255,226,180'};
  const pauseMax = new Map(); // unit id -> the pause it started (for the aim pie)
  const BIG = new Set(['pkm', 'hmg', 'svd']);
  const KICK = {ak: 0.17, pkm: 0.19, svd: 0.45, hmg: 0.22, rpg: 0.6, gp: 0.32};
  const FLASH = {ak: 1.5, pkm: 1.7, svd: 2.1, hmg: 2.3, rpg: 2.8, gp: 1.2};
  const FIRING = new Set(['engage', 'flank', 'search', 'cover', 'retreat', 'turret', 'bound', 'overwatch']);
  const kick = k => {
    if (!reduceMotion) shake.trauma = Math.min(1, shake.trauma + k);
  };
  const mote = o =>
    motes.push({y: 0, vx: 0, vz: 0, vy: 0, gravity: 0, grow: 0, alpha: 1, rot: Math.random() * 6.28, vr: 0, add: false, ...o});
  const rnd = (a, b) => a + Math.random() * (b - a);
  /** Filth on the ground canvas: blood stays where it fell, as in RimWorld. */
  function decal(img, x, z, size, color, alpha = 0.85) {
    if (!img || !ground) return;
    const g = ground.canvas.getContext('2d'),
      s = ground.scale;
    g.save();
    g.globalAlpha = alpha;
    g.translate((x - ground.origin.x) * s, (z - ground.origin.z) * s);
    g.rotate(Math.random() * 6.28);
    const w = size * s;
    g.drawImage(tinted(img, color), -w / 2, -w / 2, w, w);
    g.restore();
  }
  function debris(x, z, n, speed, img = art.debris, size = 0.22, color = null) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28,
        v = rnd(0.4, 1) * speed;
      mote({
        img: color ? tinted(img, color) : img,
        x,
        z,
        y: 0.2,
        vx: Math.cos(a) * v,
        vz: Math.sin(a) * v * 0.7,
        vy: rnd(2, 5),
        gravity: 14,
        t: lastSimT,
        life: rnd(0.5, 0.9),
        size,
        vr: rnd(-12, 12),
      });
    }
  }
  function impactFx(im) {
    const t = lastSimT,
      back = Math.atan2(-im.dz, -im.dx);
    if (im.surface === 'flesh') {
      mote({img: art.bloodSplash, x: im.x, z: im.z, y: 0.5, t, life: 0.35, size: 0.95, grow: 0.7});
      mote({img: art.bodyImpact, x: im.x, z: im.z, y: 0.5, t, life: 0.14, size: 0.8, add: true});
      const a = Math.atan2(im.dz, im.dx);
      decal(
        [art.spatterA, art.spatterB, art.spatterC][Math.floor(Math.random() * 3)],
        im.x + Math.cos(a) * rnd(0.3, 0.9),
        im.z + Math.sin(a) * rnd(0.3, 0.9),
        rnd(0.7, 1.3),
        '#7d1712',
        0.75,
      );
    } else if (im.surface === 'metal') {
      mote({img: art.sparkFlash, x: im.x, z: im.z, y: 0.5, t, life: 0.1, size: 1, add: true, rot: back});
      for (let i = 0; i < 4; i++) {
        const a = back + rnd(-1, 1),
          v = rnd(4, 8);
        mote({
          img: art.sparkThrown,
          x: im.x,
          z: im.z,
          y: 0.5,
          vx: Math.cos(a) * v,
          vz: Math.sin(a) * v,
          vy: rnd(1, 3),
          gravity: 10,
          t,
          life: rnd(0.2, 0.4),
          size: 0.35,
          add: true,
          rot: a + Math.PI / 2,
        });
      }
    } else if (im.surface === 'wall') {
      mote({img: art.sparkFlash, x: im.x, z: im.z, y: 0.5, t, life: 0.07, size: 0.6, add: true, rot: back});
      mote({img: tinted(fx.dustPuff, '#b9ad94'), x: im.x, z: im.z, y: 0.5, vz: -0.4, t, life: 0.8, size: 0.6, grow: 1.2, alpha: 0.6});
      debris(im.x, im.z, 3, 2.5, art.debris, 0.18, '#a29a86');
    } else {
      mote({
        img: tinted(fx.dustPuff, '#b4a383'),
        x: im.x,
        z: im.z,
        vx: rnd(-0.3, 0.3),
        vz: -0.35,
        t,
        life: rnd(0.7, 1.1),
        size: 0.65,
        grow: 1.2,
        alpha: 0.55,
      });
      debris(im.x, im.z, 2, 2, art.debris, 0.16, '#7b6a50');
    }
  }
  function blastFx(e, listener) {
    const t = lastSimT,
      d = Math.hypot(e.x - listener.x, e.z - listener.z);
    debris(e.x, e.z, 14, 7, art.debris, 0.3, '#6b5d48');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.28;
      mote({
        img: tinted(fx.dustPuff, '#a69777'),
        x: e.x + Math.cos(a) * e.r * 0.4,
        z: e.z + Math.sin(a) * e.r * 0.4,
        vx: Math.cos(a) * 3,
        vz: Math.sin(a) * 2.2,
        t,
        life: rnd(0.9, 1.6),
        size: e.r * 0.5,
        grow: 1.5,
        alpha: 0.6,
      });
    }
    mote({img: fx.fireGlow, x: e.x, z: e.z, y: 0.5, t, life: 0.35, size: e.r * 3, add: true, alpha: 0.9});
    kick(clamp(1 - d / 32, 0, 1) * 0.95 * clamp(e.r / 3.6, 0.6, 1.2));
    const a = clamp(1 - d / 26, 0, 1) * 0.42;
    if (a > screen.a) Object.assign(screen, {a, color: '255,226,180'});
  }
  /** New shots, landings and blasts since the last frame become flashes, motes and camera kicks. */
  function spawn(sim) {
    const p = sim.player;
    for (const t of sim.tracers) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (sim.time - t.t > 0.3) continue;
      const a = Math.atan2(t.z1 - t.z0, t.x1 - t.x0);
      flashes.push({x: t.x0, z: t.z0, a, t: t.t, life: t.weapon === 'rpg' ? 0.12 : 0.065, size: FLASH[t.weapon] || 1.5});
      if (t.weapon === 'rpg')
        for (let i = 0; i < 6; i++)
          mote({
            img: art.smoke,
            x: t.x0 - Math.cos(a),
            z: t.z0 - Math.sin(a),
            vx: -Math.cos(a) * rnd(2, 4) + rnd(-1, 1),
            vz: -Math.sin(a) * rnd(2, 4) + rnd(-1, 1),
            t: t.t,
            life: rnd(1, 1.8),
            size: 1.1,
            grow: 1.4,
            alpha: 0.5,
          });
      if (t.unit === p.id) kick(KICK[t.weapon] || 0.15);
      else if (p.alive && t.side !== p.side) {
        // a round going past close by
        const vx = t.x1 - t.x0,
          vz = t.z1 - t.z0,
          len2 = vx * vx + vz * vz || 1,
          k = clamp(((p.x - t.x0) * vx + (p.z - t.z0) * vz) / len2, 0, 1);
        if (Math.hypot(t.x0 + vx * k - p.x, t.z0 + vz * k - p.z) < 2.2 && k > 0.1) kick(0.09);
      }
    }
    for (const im of sim.impacts) {
      if (seen.has(im)) continue;
      seen.add(im);
      if (sim.time - im.t < 0.3) impactFx(im);
    }
    for (const e of sim.explosions) {
      if (seen.has(e)) continue;
      seen.add(e);
      if (sim.time - e.t < 0.3) blastFx(e, p);
    }
    // the player hit: a kick and a red edge
    if (p.alive && lastHp !== null && p.hp < lastHp) {
      kick(0.35);
      Object.assign(screen, {a: 0.3, color: '170,20,10'});
    }
    lastHp = p.hp;
  }
  let lastHp = null;
  function drawProjectiles(sim) {
    for (const q of sim.projectiles) {
      const k = clamp((sim.time - q.t0) / (q.t1 - q.t0), 0, 1);
      const ex = q.hit ? q.hit.x : q.x1,
        ez = q.hit ? q.hit.z : q.z1;
      const x = q.x0 + (ex - q.x0) * k,
        z = q.z0 + (ez - q.z0) * k,
        a = Math.atan2(ez - q.z0, ex - q.x0);
      if (q.lob) {
        // a grenade arcs: its shadow runs along the ground under it
        const H = Math.min(5, Math.hypot(ex - q.x0, ez - q.z0) * 0.3),
          h = 4 * H * k * (1 - k) + 0.4 * (1 - k);
        shadow(x, z, 0.16, 0.09, 0.35);
        sprite(art.grenade, x, z, 0.7, 0.7, {oy: -h, rot: sim.time * 14});
      } else if (q.weapon === 'rpg') {
        if (sim.time - (q.puff ?? -1) > 0.025) {
          q.puff = sim.time;
          mote({
            img: art.smoke,
            x,
            z,
            y: 0.45,
            vx: rnd(-0.3, 0.3),
            vz: rnd(-0.3, 0.3),
            t: sim.time,
            life: rnd(0.8, 1.3),
            size: 0.6,
            grow: 1.6,
            alpha: 0.45,
          });
        }
        ctx.globalCompositeOperation = 'lighter';
        sprite(fx.fireGlow, x - Math.cos(a) * 0.6, z - Math.sin(a) * 0.6, 1.2, 1.2, {oy: -0.45, alpha: 0.8});
        ctx.globalCompositeOperation = 'source-over';
        sprite(art.rocket, x, z, 1.4, 1.4, {oy: -0.45, rot: a + Math.PI / 2});
      } else {
        if (level.night) {
          ctx.globalCompositeOperation = 'lighter';
          sprite(fx.fireGlow, x, z, 0.7, 0.7, {oy: -0.42, alpha: 0.5});
          ctx.globalCompositeOperation = 'source-over';
        }
        sprite(BIG.has(q.weapon) ? art.bulletBig : art.bulletSmall, x, z, 1.1, 1.1, {oy: -0.42, rot: a + Math.PI / 2});
      }
    }
  }
  function drawFlashes(sim) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i],
        k = (sim.time - f.t) / f.life;
      if (k >= 1 || k < 0) {
        if (k >= 1 || sim.time < f.t - 1) flashes.splice(i, 1);
        continue;
      }
      const mx = f.x + Math.cos(f.a) * 0.6,
        mz = f.z + Math.sin(f.a) * 0.6;
      // the flash lights the ground round the muzzle
      const R = f.size * (level.night ? 2.6 : 1.6) * ppm,
        X = sx(mx),
        Y = sy(mz);
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
      g.addColorStop(0, `rgba(255,205,130,${(level.night ? 0.5 : 0.32) * (1 - k)})`);
      g.addColorStop(1, 'rgba(255,205,130,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X - R, Y - R, R * 2, R * 2);
      sprite(fx.shotFlash, mx, mz, f.size * (1 - k * 0.3), f.size * (1 - k * 0.3), {oy: -0.42, rot: f.a, alpha: 1 - k});
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawMotes(sim, dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i],
        k = (sim.time - m.t) / m.life;
      if (k >= 1 || sim.time < m.t - 1) {
        motes.splice(i, 1);
        continue;
      }
      m.x += m.vx * dt;
      m.z += m.vz * dt;
      m.y += m.vy * dt;
      m.vy -= m.gravity * dt;
      m.rot += m.vr * dt;
      if (m.y < 0) {
        m.y = 0;
        m.vy = 0;
        m.vx *= 0.5;
        m.vz *= 0.5;
        m.vr *= 0.5;
      }
      if (m.add) ctx.globalCompositeOperation = 'lighter';
      const size = m.size * (1 + m.grow * k);
      sprite(m.img, m.x, m.z, size, size, {oy: -m.y, rot: m.rot, alpha: m.alpha * (1 - k)});
      if (m.add) ctx.globalCompositeOperation = 'source-over';
    }
    if (motes.length > 400) motes.splice(0, motes.length - 400);
  }
  /** RimWorld's aim pie over an enemy shooter: a wedge that fills while it aims before its next burst. */
  function aimPie(u, frac) {
    const X = sx(u.x),
      Y = sy(u.z) - 1.55 * ppm,
      R = Math.max(5, 0.28 * ppm);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.arc(X, Y, R + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.arc(X, Y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(frac, 0, 1));
    ctx.closePath();
    ctx.fill();
  }
  function pies(sim) {
    const p = sim.player;
    for (const u of sim.units) {
      if (u === p || !u.alive || !(u.pause > 0) || !FIRING.has(u.state) || !u.alert || !u.visible?.some(e => e.alive)) {
        pauseMax.delete(u.id);
        continue;
      }
      const max = Math.max(pauseMax.get(u.id) || 0, u.pause);
      pauseMax.set(u.id, max);
      if (u.state === 'mounted' || u.escaped) continue;
      aimPie(u, 1 - u.pause / max);
    }
  }
  /** Ammo and reload, on the map: rounds in the magazine and in reserve bottom left, a reload ring round the cursor. */
  function ammoHud(sim, aim) {
    const p = sim.player;
    if (!p.alive) return;
    const W = WEAPONS[p.weapon],
      mag = p.mags[p.weapon],
      reserve = p.reserve[p.weapon],
      reloading = p.reload > 0 && p.reloading === p.weapon,
      low = !reloading && mag <= Math.max(1, Math.floor(W.mag * 0.2));
    const X = 16,
      Y = Hh - 100; // above the controls line
    ctx.fillStyle = 'rgba(12,14,10,.72)';
    ctx.beginPath();
    ctx.roundRect(X, Y, 168, 48, 6);
    ctx.fill();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9c6b4';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(W.label.toUpperCase(), X + 10, Y + 16);
    ctx.font = '700 22px ui-monospace, monospace';
    ctx.fillStyle = low ? (Math.sin(performance.now() / 120) > 0 ? '#ff7a5c' : '#f2c9a0') : '#f2f2e6';
    const count = reloading ? '--' : String(mag);
    ctx.fillText(count, X + 10, Y + 40);
    const cw = ctx.measureText(count).width;
    ctx.font = '600 13px ui-monospace, monospace';
    ctx.fillStyle = '#9b988a';
    ctx.fillText(`/ ${W.mag}   ${reserve === Infinity ? '+∞' : '+' + reserve}`, X + 16 + cw, Y + 40);
    if (reloading) {
      const k = 1 - p.reload / W.reload;
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      ctx.fillRect(X + 10, Y + 43, 148, 3);
      ctx.fillStyle = '#ffd36b';
      ctx.fillRect(X + 10, Y + 43, 148 * k, 3);
      if (aim) {
        // and round the cursor, so the eyes need not leave the fight
        ctx.strokeStyle = 'rgba(0,0,0,.5)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx(aim.x), sy(aim.z), 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffd36b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx(aim.x), sy(aim.z), 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        ctx.stroke();
        ctx.font = '600 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd36b';
        ctx.fillText('RELOADING', sx(aim.x), sy(aim.z) + 32);
      }
    } else if (mag === 0 && aim) {
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff7a5c';
      ctx.fillText(reserve > 0 ? 'R RELOAD' : 'EMPTY', sx(aim.x), sy(aim.z) + 32);
    }
  }
  /** Hovering an enemy: the chance your next round hits it, RimWorld's targeting readout. */
  function hitReadout(sim, aim) {
    const p = sim.player;
    if (!p.alive || !aim) return;
    const o = sim.units
      .filter(u => u.side !== p.side && u.alive && !u.escaped && u.state !== 'mounted' && Math.hypot(u.x - aim.x, u.z - aim.z) < 1.2)
      .sort((a, b) => Math.hypot(a.x - aim.x, a.z - aim.z) - Math.hypot(b.x - aim.x, b.z - aim.z))[0];
    if (!o) return;
    const W = WEAPONS[p.weapon];
    const d = Math.hypot(o.x - p.x, o.z - p.z);
    const text = d > W.range ? 'Out of range' : !sim.los(p.x, p.z, o.x, o.z) ? 'No clear shot' : `${Math.round(hitChance(p, o, W) * 100)}%`;
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const X = sx(aim.x) + 16,
      Y = sy(aim.z) + 16,
      w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(X, Y - 9, w, 18);
    ctx.fillStyle = '#f2f2e6';
    ctx.fillText(text, X + 5, Y + 1);
  }
  function effects(sim) {
    for (const e of sim.explosions) {
      const age = sim.time - e.t;
      if (!e._burnt) {
        e._burnt = true;
        burn(e);
        for (let i = 0; i < 5; i++)
          smoke.push({
            x: e.x + (Math.random() - 0.5) * e.r,
            z: e.z + (Math.random() - 0.5) * e.r,
            t: performance.now() / 1000,
            life: 2.5 + Math.random() * 2,
            r: e.r * 0.8,
          });
      }
      if (age > 0.7) continue;
      ctx.globalCompositeOperation = 'lighter';
      sprite(art.explosion, e.x, e.z, e.r * 2.6 * (0.6 + age), e.r * 2.6 * (0.6 + age), {alpha: 1 - age / 0.7, oy: -0.5});
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function drawSmoke(now) {
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i],
        k = (now - s.t) / s.life;
      if (k >= 1) {
        smoke.splice(i, 1);
        continue;
      }
      sprite(art.smoke, s.x + k * 1.5, s.z - k * 2.5, s.r * (1 + k * 1.5), s.r * (1 + k * 1.5), {alpha: 0.55 * (1 - k)});
    }
    if (smoke.length > 120) smoke.splice(0, smoke.length - 120);
  }
  /** Speech bubbles: white, rounded, over the speaker for two seconds (the comms log keeps the rest). */
  function bubbles(sim) {
    const recent = new Map();
    for (const c of sim.callouts) if (sim.time - c.t < 2.2) recent.set(c.id, c);
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of recent.values()) {
      const u = sim.units.find(x => x.id === c.id);
      if (!u) continue;
      const x = sx(u.x),
        y = sy(u.z) - 1.6 * ppm;
      const w = ctx.measureText(c.text).width + 14,
        h = 20;
      ctx.globalAlpha = Math.min(1, (2.2 - (sim.time - c.t)) * 2);
      ctx.fillStyle = c.side === 'army' ? '#fff3e6' : '#f6f8ee';
      ctx.strokeStyle = '#2a2a24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - h, w, h, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1e1e1a';
      ctx.fillText(c.text, x, y - h / 2 + 1);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- frame ----------
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = view.getBoundingClientRect();
    view.width = Math.max(1, Math.round(r.width * dpr));
    view.height = Math.max(1, Math.round(r.height * dpr));
  }

  let lastSimT = 0,
    lastReal = 0;
  function draw(sim, {aim, selected = [], orders = true, pointer = null, aimZoom = false} = {}) {
    if (sim.level !== level) {
      level = sim.level;
      ground = bakeGround(level);
      scorch.length = 0;
      smoke.length = 0;
      pawns.clear();
    }
    if (sim !== lastSim) {
      lastSim = sim;
      if (ground) ground = bakeGround(level); // a fresh map for a new game (scorch marks cleared)
      smoke.length = 0;
    }
    const now = performance.now() / 1000;
    const rdt = clamp(now - (lastReal || now), 0, 0.1),
      simDt = clamp(sim.time - lastSimT, 0, 0.1);
    lastReal = now;
    lastSimT = sim.time;
    W = view.width / dpr;
    Hh = view.height / dpr;
    // Right mouse held: a subtle zoom in and a longer lean toward the cursor (aiming down the sights).
    camera.aimK += ((aimZoom ? 1 : 0) - camera.aimK) * (1 - Math.exp(-rdt * 9));
    ppm = PPM * camera.zoom * (1 + 0.14 * camera.aimK);
    // The camera follows the active rebel and moves with the mouse: it leans toward the cursor's side of the screen.
    const p = sim.player;
    let lx = 0,
      lz = 0;
    if (pointer) {
      const reach = 0.24 + 0.2 * camera.aimK;
      lx = clamp((pointer.x - W / 2) / (W / 2), -1, 1) * (W / 2 / ppm) * reach;
      lz = clamp((pointer.y - Hh / 2) / (Hh / 2), -1, 1) * (Hh / 2 / ppm) * reach;
    }
    const follow = 1 - Math.exp(-rdt * 6);
    camera.x += (p.x + lx - camera.x) * follow;
    camera.z += (p.z + lz - camera.z) * follow;
    // camera shake: trauma squared, decaying
    shake.trauma = Math.max(0, shake.trauma - rdt * 1.9);
    const amp = shake.trauma * shake.trauma * 11;
    shake.x = amp * (Math.random() * 2 - 1);
    shake.y = amp * (Math.random() * 2 - 1);
    if (ground) spawn(sim);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#1b2016';
    ctx.fillRect(0, 0, W, Hh);
    const k = ppm / ground.scale;
    ctx.drawImage(ground.canvas, sx(ground.origin.x), sy(ground.origin.z), ground.canvas.width * k, ground.canvas.height * k);
    // order markers (on the ground)
    if (orders)
      for (const u of sim.units) {
        if (u.side !== 'partisan' || !u.alive || u === p || !u.order) continue;
        const o = u.order;
        if ((o.type === 'move' || o.type === 'hold') && o.x !== undefined && Math.hypot(o.x - u.x, o.z - u.z) > 0.8) {
          ctx.strokeStyle = 'rgba(255,211,107,.6)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx(u.x), sy(u.z));
          ctx.lineTo(sx(o.x), sy(o.z));
          ctx.stroke();
          ctx.setLineDash([]);
          ring(o.x, o.z, 0.5, 'rgba(255,211,107,.8)');
        }
      }
    // everything that stands, sorted by its south edge
    const things = [];
    for (const b of sim.boxes()) if (b.kind !== 'vehicle') things.push({z: b.z + b.d / 2, draw: () => drawCover(b, sim)});
    for (const v of sim.vehicles) things.push({z: v.z + v.d / 2, draw: () => drawVehicle(v, sim, now)});
    for (const it of sim.items)
      if (!it.taken) things.push({z: it.z, draw: () => (shadow(it.x, it.z, 0.5, 0.25), sprite(art.cache, it.x, it.z, 1, 1, {oy: -0.2}))});
    for (const u of sim.units) {
      const opts = {labels: true, active: u === p, selected: selected.includes(u.id)};
      things.push({z: u.z + (u.alive ? 0.2 : -0.5), draw: () => drawPawn(u, sim, opts)});
    }
    things.sort((a, b) => a.z - b.z);
    for (const t of things) t.draw();
    effects(sim);
    drawMotes(sim, simDt);
    drawProjectiles(sim);
    drawFlashes(sim);
    drawSmoke(now);
    pies(sim);
    if (level.night) {
      // darkness with a pool of light round each lamp and the player
      ctx.fillStyle = 'rgba(8,12,24,.45)';
      ctx.fillRect(0, 0, W, Hh);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of [...(level.lights || []), {x: p.x, z: p.z, r: 7}]) {
        const g = ctx.createRadialGradient(sx(l.x), sy(l.z), 0, sx(l.x), sy(l.z), (l.r || 12) * ppm);
        g.addColorStop(0, 'rgba(255,196,120,.25)');
        g.addColorStop(1, 'rgba(255,196,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, Hh);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    bubbles(sim);
    if (screen.a > 0.01) {
      ctx.fillStyle = `rgba(${screen.color},${screen.a})`;
      if (screen.color.startsWith('170')) {
        // hurt: a red edge, clear in the middle
        const g = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.42, W / 2, Hh / 2, Math.max(W, Hh) * 0.72);
        g.addColorStop(0, 'rgba(170,20,10,0)');
        g.addColorStop(1, `rgba(170,20,10,${screen.a * 1.3})`);
        ctx.fillStyle = g;
      } else ctx.globalCompositeOperation = 'lighter';
      ctx.fillRect(0, 0, W, Hh);
      ctx.globalCompositeOperation = 'source-over';
      screen.a *= Math.exp(-rdt * 7);
    }
    hitReadout(sim, aim);
    if (aim) ammoHud(sim, aim);
    if (aim && p.alive) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx(aim.x), sy(aim.z), 9, 0, Math.PI * 2);
      ctx.moveTo(sx(aim.x) - 14, sy(aim.z));
      ctx.lineTo(sx(aim.x) - 5, sy(aim.z));
      ctx.moveTo(sx(aim.x) + 5, sy(aim.z));
      ctx.lineTo(sx(aim.x) + 14, sy(aim.z));
      ctx.stroke();
    }
  }

  return {
    draw,
    resize,
    camera,
    /** World point under a screen point (CSS pixels relative to the canvas). */
    toWorld: (px, py) => ({x: (px - W / 2) / ppm + camera.x, z: (py - Hh / 2) / ppm + camera.z}),
    /** Screen point for a world point (y = metres above the ground). */
    project: (x, y, z) => [sx(x), sy(z) - y * ppm, true],
    snap(sim) {
      camera.x = sim.player.x;
      camera.z = sim.player.z + 6;
      flashes.length = motes.length = 0;
      shake.trauma = screen.a = 0;
      lastHp = null;
      lastSimT = sim.time;
    },
    shake,
    files: art,
    guns,
    /** A rebel's look changed: rebuild its sprite on the next frame. */
    refreshLook: id => pawns.delete(id),
  };
}
export {hex};
