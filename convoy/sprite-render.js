// Partisan Tactical, 2.5-D sprite view: draws the simulation (convoy/sim.js) on a Canvas 2-D in the RimWorld style.
// Layers: baked ground (terrain textures, feathered patches and roads, grass and scatter, scorch marks), then shadows,
// then every object sorted by its south edge (cover, vehicles, pawns, trees), then effects and labels on top.
// x runs east and z south in metres; the camera looks straight down, objects show their front faces (2.5-D).
import {loadArt, buildPawn, lookFor, tinted, atlasCell} from './sprite-art.js';

const PPM = 32; // pixels per metre at zoom 1 (art bible: 1 m = 32 px)

/** Small deterministic generator: the scatter is the same every visit. */
function lcg(seed) {
  let a = seed >>> 0;
  return () => (a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const canvas = (w, h) => Object.assign(document.createElement('canvas'), {width: w, height: h});
const hex = n => '#' + n.toString(16).padStart(6, '0');

export async function createSpriteRenderer(view) {
  const art = await loadArt();
  const ctx = view.getContext('2d');
  const pawns = new Map(); // unit id -> {south, east, north} or a pending promise
  const camera = {x: 0, z: 0, zoom: 0.85};
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
  const sx = x => (x - camera.x) * ppm + W / 2,
    sy = z => (z - camera.z) * ppm + Hh / 2;
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
  const WEAPON_LEN = {ak: 1.05, svd: 1.3, pkm: 1.25, rpg: 1.25, gp: 1.05, hmg: 1.3};
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
    const weapon = art[u.weapon] || art.ak;
    const wl = WEAPON_LEN[u.weapon] || 1,
      left = cx < 0;
    const drawWeapon = () => sprite(weapon, u.x + cx * 0.32, u.z + cz * 0.32 + 0.12, wl, wl, {rot: a, flipY: left, oy: -0.15 - bob});
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
  const TRACER = {partisan: '255,236,170', army: '255,196,140', rpg: '255,170,90', hmg: '255,210,150'};
  function effects(sim) {
    for (const t of sim.tracers) {
      const age = sim.time - t.t;
      if (age > 0.08) continue;
      const c = TRACER[t.weapon] || TRACER[t.side];
      const grad = ctx.createLinearGradient(sx(t.x0), sy(t.z0), sx(t.x1), sy(t.z1));
      grad.addColorStop(0, `rgba(${c},0)`);
      grad.addColorStop(1, `rgba(${c},${0.95 - age * 8})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = t.weapon === 'rpg' ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(sx(t.x0), sy(t.z0) - 0.4 * ppm);
      ctx.lineTo(sx(t.x1), sy(t.z1) - 0.4 * ppm);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      if (age < 0.05) sprite(art.shotFlash, t.x0, t.z0, 1.4, 1.4, {oy: -0.4, alpha: 0.9});
      sprite(art.hitDirt, t.x1, t.z1, 0.9, 0.9, {alpha: 0.7 - age * 6});
      ctx.globalCompositeOperation = 'source-over';
    }
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

  function draw(sim, {aim, selected = [], orders = true} = {}) {
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
    W = view.width / dpr;
    Hh = view.height / dpr;
    ppm = PPM * camera.zoom;
    // the camera eases toward the active rebel
    // the camera eases toward the active rebel, leaning a third of the way toward where you aim
    const p = sim.player;
    const lean = aim
      ? {x: Math.max(-16, Math.min(16, (aim.x - p.x) * 0.45)), z: Math.max(-14, Math.min(14, (aim.z - p.z) * 0.45))}
      : {x: 0, z: 0};
    camera.x += (p.x + lean.x - camera.x) * 0.08;
    camera.z += (p.z + lean.z - camera.z) * 0.08;
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
    drawSmoke(now);
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
    },
    files: art,
  };
}
export {hex};
