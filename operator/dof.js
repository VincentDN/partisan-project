// Depth of field for the Operator Customiser's warehouse: the operator stays sharp and the room behind falls out of
// focus, as a camera would at a wide aperture. The scene renders to a target with its depth; a full-screen pass then
// blurs each pixel by its circle of confusion (how far it sits from the focal plane, beyond a sharp zone round the
// subject) with a golden-angle disk of taps, weighting each tap by its own blur so a sharp subject does not smear onto
// the background. Tone mapping and colour space are applied on the way to the screen.
//
// The same pass carries a dirty lens (Battlefield, Dishonored 2): `flares()` lists the room's lights; each frame those
// facing the camera are projected to the screen and, where the depth buffer shows nothing in front of them, add a
// soft halo, a faint horizontal streak, three ghost discs mirrored through the centre of the frame, and the grime on
// the glass lit up around them. Kept subtle: it shows when a lamp or the rim light looks into the lens.
import * as T from 'three';

const TAPS = 20,
  FLARES = 8;

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

export function createDof(stage, {focus = () => 3.5, flares = () => []} = {}) {
  const size = new T.Vector2();
  // 4× MSAA: the scene draws here, not to the canvas, so the canvas's own antialiasing never applies
  const target = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType, depthTexture: new T.DepthTexture(1, 1), samples: 4});
  const material = new T.ShaderMaterial({
    uniforms: {
      tColor: {value: target.texture},
      tDepth: {value: target.depthTexture},
      uTexel: {value: new T.Vector2()},
      uNear: {value: 0.01},
      uFar: {value: 60},
      uFocus: {value: 3.5},
      uSharp: {value: 0.55}, // metres either side of the focus that stay sharp
      uFalloff: {value: 2.2}, // metres over which the blur builds to full
      uMaxBlur: {value: 9}, // pixels at full blur (scaled with the resolution)
      tDirt: {value: lensDirt()},
      uAspect: {value: 1},
      uFlareCount: {value: 0},
      uFlarePos: {value: Array.from({length: FLARES}, () => new T.Vector3())}, // screen uv, linear depth
      uFlareCol: {value: Array.from({length: FLARES}, () => new T.Vector3())}, // colour × strength
      uLens: {value: 1}, // overall strength of the lens effects
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
uniform sampler2D tColor, tDepth, tDirt; uniform vec2 uTexel; uniform float uNear, uFar, uFocus, uSharp, uFalloff, uMaxBlur;
uniform float uAspect, uLens; uniform int uFlareCount; uniform vec3 uFlarePos[${FLARES}]; uniform vec3 uFlareCol[${FLARES}];
varying vec2 vUv;
float depthAt(vec2 uv) { float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
vec3 lens(vec2 uv) {
  vec3 acc = vec3(0.0);
  vec2 ar = vec2(uAspect, 1.0);
  float dirt = texture2D(tDirt, uv * vec2(uAspect, 1.0) * 0.9).r;
  for (int i = 0; i < ${FLARES}; i++) {
    if (i >= uFlareCount) break;
    vec2 lp = uFlarePos[i].xy;
    // hidden behind something? five depth taps round the light (off-screen lights count as seen)
    float seen = 0.0;
    for (int k = 0; k < 5; k++) {
      vec2 o = vec2(float(k == 1) - float(k == 2), float(k == 3) - float(k == 4)) * 0.007;
      vec2 q = lp + o;
      bool inside = q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0;
      seen += inside ? step(uFlarePos[i].z - 0.25, depthAt(q)) : 1.0;
    }
    vec3 c = uFlareCol[i] * (seen / 5.0);
    if (dot(c, c) < 1e-6) continue;
    vec2 d = (uv - lp) * ar;
    float r = length(d);
    acc += c * 0.0035 / (r * r * 45.0 + 0.0035) * 0.55;                                  // halo round the source
    acc += c * exp(-abs(d.y) * 320.0) * exp(-abs(d.x) * 3.2) * 0.07;              // a thin horizontal streak
    vec2 axis = vec2(0.5) - lp;
    for (int g = 0; g < 3; g++) {                                                 // ghosts through the centre
      float t = 1.25 + float(g) * 0.42, size = 0.035 + float(g) * 0.03;
      float gr = length((uv - (lp + axis * t * 1.6)) * ar);
      vec3 tint = g == 0 ? vec3(0.6, 0.8, 1.0) : g == 1 ? vec3(1.0, 0.75, 0.45) : vec3(0.7, 1.0, 0.8);
      acc += c * tint * smoothstep(size, size * 0.6, gr) * 0.012;
    }
    acc += c * dirt * exp(-r * 3.5) * 0.45;                                       // the grime lights up
  }
  return acc * uLens;
}
float coc(float d) { return smoothstep(uSharp, uSharp + uFalloff, abs(d - uFocus)) * uMaxBlur; }
void main() {
  float c = coc(depthAt(vUv));
  vec4 sum = texture2D(tColor, vUv);
  float total = 1.0;
  if (c > 0.5) {
    for (int i = 1; i < ${TAPS}; i++) {
      float fi = float(i);
      float r = sqrt(fi / ${TAPS}.0) * c;
      float a = fi * 2.39996323;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
      float sc = coc(depthAt(uv));
      float w = clamp(sc - r + 1.0, 0.0, 1.0); // a tap only spreads as far as its own blur reaches
      sum += texture2D(tColor, uv) * w;
      total += w;
    }
  }
  gl_FragColor = vec4((sum / total).rgb + lens(vUv), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const quadScene = new T.Scene(),
    quadCam = new T.Camera();
  quadScene.add(quad);
  // which lights look into the lens this frame, and how hard
  const p = new T.Vector3(),
    toCam = new T.Vector3(),
    dir = new T.Vector3(),
    view = new T.Vector3();
  function aimFlares(camera) {
    const u = material.uniforms;
    const list = [];
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
      p.project(camera);
      const edge = Math.max(Math.abs(p.x), Math.abs(p.y));
      const onScreen = 1 - T.MathUtils.smoothstep(edge, 1.0, 1.35); // fades just past the frame's edge
      const k = f.strength * facing * onScreen * (1 / (1 + dist * 0.12));
      if (k < 0.01) continue;
      list.push({x: (p.x + 1) / 2, y: (p.y + 1) / 2, z: -view.z, k, color: f.light.color});
    }
    list.sort((a, b) => b.k - a.k);
    u.uFlareCount.value = Math.min(FLARES, list.length);
    list.slice(0, FLARES).forEach((l, i) => {
      u.uFlarePos.value[i].set(l.x, l.y, l.z);
      u.uFlareCol.value[i].set(l.color.r * l.k, l.color.g * l.k, l.color.b * l.k);
    });
  }
  let on = false;
  function render(r, scene, camera) {
    r.getDrawingBufferSize(size);
    if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
    const u = material.uniforms;
    u.uTexel.value.set(1 / size.x, 1 / size.y);
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uFocus.value = focus(camera);
    u.uMaxBlur.value = 9 * (size.y / 900);
    u.uAspect.value = size.x / size.y;
    aimFlares(camera);
    r.setRenderTarget(target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(quadScene, quadCam);
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
