// The dirty lens for the Operator Customiser's warehouse (Battlefield, Dishonored 2). The scene itself draws straight
// to the canvas, so the browser's own antialiasing applies and nothing is blurred; this pass only adds light on top.
// `flares()` lists the room's lights. Each frame those facing the camera are projected to the screen, checked for
// anything in front of them with a ray against the people in the room (`occluders()`), and drawn additively: a soft
// halo, a faint horizontal streak, three ghost discs mirrored through the centre of the frame, and the grime on the
// glass lit up around them. Kept subtle: it shows when a lamp or the rim light looks into the lens.
import * as T from 'three';

const FLARES = 8;

// Grime on the front element: soft smudges and specks of dust. Red channel only, mostly dark.
function lensDirt() {
  const size = 512,
    c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * size,
      y = rnd() * size,
      r = 12 + rnd() ** 2 * 90,
      grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,255,255,${0.04 + rnd() * 0.1})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.22})`;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 0.6 + rnd() ** 3 * 3.5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

export function createLens(stage, {flares = () => [], occluders = () => []} = {}) {
  const size = new T.Vector2();
  const material = new T.ShaderMaterial({
    uniforms: {
      tDirt: {value: lensDirt()},
      uAspect: {value: 1},
      uFlareCount: {value: 0},
      uFlarePos: {value: Array.from({length: FLARES}, () => new T.Vector2())}, // screen uv
      uFlareCol: {value: Array.from({length: FLARES}, () => new T.Vector3())}, // colour × strength × visibility
      uLens: {value: 1}, // overall strength of the lens effects
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
uniform sampler2D tDirt; uniform float uAspect, uLens; uniform int uFlareCount;
uniform vec2 uFlarePos[${FLARES}]; uniform vec3 uFlareCol[${FLARES}];
varying vec2 vUv;
void main() {
  vec3 acc = vec3(0.0);
  vec2 ar = vec2(uAspect, 1.0);
  float dirt = texture2D(tDirt, vUv * ar * 0.9).r;
  for (int i = 0; i < ${FLARES}; i++) {
    if (i >= uFlareCount) break;
    vec3 c = uFlareCol[i];
    vec2 lp = uFlarePos[i];
    vec2 d = (vUv - lp) * ar;
    float r = length(d);
    acc += c * 0.0035 / (r * r * 45.0 + 0.0035) * 0.55;                       // halo round the source
    acc += c * exp(-abs(d.y) * 320.0) * exp(-abs(d.x) * 3.2) * 0.07;          // a thin horizontal streak
    vec2 axis = vec2(0.5) - lp;
    for (int g = 0; g < 3; g++) {                                             // ghosts through the centre
      float t = 1.25 + float(g) * 0.42, size = 0.035 + float(g) * 0.03;
      float gr = length((vUv - (lp + axis * t * 1.6)) * ar);
      vec3 tint = g == 0 ? vec3(0.6, 0.8, 1.0) : g == 1 ? vec3(1.0, 0.75, 0.45) : vec3(0.7, 1.0, 0.8);
      acc += c * tint * smoothstep(size, size * 0.6, gr) * 0.012;
    }
    acc += c * dirt * exp(-r * 3.5) * 0.45;                                   // the grime lights up
  }
  // light only adds; the scene underneath is already tone-mapped, so roll the flare off gently instead of clipping
  acc *= uLens;
  gl_FragColor = vec4(acc / (1.0 + acc), 1.0);
}`,
    blending: T.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const quadScene = new T.Scene(),
    quadCam = new T.Camera();
  quadScene.add(quad);

  // which lights look into the lens this frame, how hard, and whether someone stands in front of them
  const p = new T.Vector3(),
    toCam = new T.Vector3(),
    dir = new T.Vector3(),
    view = new T.Vector3(),
    ray = new T.Raycaster();
  const seen = new Map(); // light -> visibility 0..1, eased so a flare fades as a shoulder crosses it
  let frame = 0;
  function aimFlares(camera, dt) {
    const u = material.uniforms;
    const list = [];
    const check = frame++ % 3 === 0; // rays every third frame are plenty; visibility eases in between
    const blockers = check ? occluders().filter(o => o?.visible !== false) : null;
    for (const f of flares()) {
      if (!f.light.visible || !f.light.parent?.visible) continue;
      f.light.getWorldPosition(p);
      toCam.subVectors(camera.position, p);
      const dist = toCam.length();
      toCam.divideScalar(dist);
      let facing = 1;
      if (f.light.isSpotLight) {
        dir.subVectors(f.light.target.getWorldPosition(dir), p).normalize();
        const cos = dir.dot(toCam);
        facing = T.MathUtils.smoothstep(cos, Math.cos(Math.min(1.4, f.light.angle * 1.8)), Math.cos(f.light.angle * 0.4));
      }
      view.copy(p).applyMatrix4(camera.matrixWorldInverse);
      if (view.z > -0.2) continue; // behind the camera
      if (check) {
        // a ray from the lens to the light: anyone in between hides it
        ray.set(camera.position, toCam.clone().negate());
        ray.far = dist - 0.1;
        const hit = blockers.length > 0 && ray.intersectObjects(blockers, true).length > 0;
        f.visibleGoal = hit ? 0 : 1;
      }
      const was = seen.get(f.light) ?? f.visibleGoal ?? 1;
      const now = was + ((f.visibleGoal ?? 1) - was) * (1 - Math.exp(-dt * 18));
      seen.set(f.light, now);
      p.project(camera);
      const edge = Math.max(Math.abs(p.x), Math.abs(p.y));
      const onScreen = 1 - T.MathUtils.smoothstep(edge, 1.0, 1.35); // fades just past the frame's edge
      const k = f.strength * facing * onScreen * now * (1 / (1 + dist * 0.12));
      if (k < 0.01) continue;
      list.push({x: (p.x + 1) / 2, y: (p.y + 1) / 2, k, color: f.light.color});
    }
    list.sort((a, b) => b.k - a.k);
    u.uFlareCount.value = Math.min(FLARES, list.length);
    list.slice(0, FLARES).forEach((l, i) => {
      u.uFlarePos.value[i].set(l.x, l.y);
      u.uFlareCol.value[i].set(l.color.r * l.k, l.color.g * l.k, l.color.b * l.k);
    });
  }

  let on = false,
    last = performance.now();
  function render(r, scene, camera) {
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    r.getDrawingBufferSize(size);
    material.uniforms.uAspect.value = size.x / size.y;
    r.render(scene, camera); // straight to the canvas: its antialiasing, no intermediate buffer
    aimFlares(camera, dt);
    if (!material.uniforms.uFlareCount.value) return;
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.render(quadScene, quadCam);
    r.autoClear = autoClear;
  }
  return {
    get on() {
      return on;
    },
    set(enabled) {
      on = enabled;
      stage.setRender(enabled ? render : null);
    },
    uniforms: material.uniforms,
  };
}
