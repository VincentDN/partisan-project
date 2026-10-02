// Art styles for a three.js stage (shared/stage.js): look tests for the operator and its rifle, switchable at runtime.
// A style is data: optional material swap (`material`), an extra fill light (`fill`), a plain background
// (`background`) and an optional screen-space pass (`pass`). Original materials are kept on the mesh and restored
// on switch, so colour zones and equipment keep working underneath; call refresh() after the scene changes.
import * as T from 'three';

const BAYER4 = `
float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int k = i.x + i.y * 4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  for (int n = 0; n < 16; n++) if (n == k) return (m[n] + 0.5) / 16.0;
  return 0.5;
}`;
// Tone-map and encode the scene colour like the screen would, so passes work on what the player sees.
const DISPLAY = `
vec3 display(vec3 c) {
#ifdef TONE_MAPPING
  c = toneMapping(c);
#endif
  return linearToOutputTexel(vec4(c, 1.0)).rgb;
}`;

// ---------- material factories (one new material per original, shared like the originals) ----------
const keep = o => ({
  name: o.name,
  color: o.color ? o.color.clone() : new T.Color(1, 1, 1),
  map: o.map || null,
  vertexColors: o.vertexColors,
  transparent: o.transparent,
  opacity: o.opacity,
  alphaTest: o.alphaTest,
  side: o.side,
});
function gradient(steps) {
  const data = new Uint8Array(steps.map(v => Math.round(v * 255)));
  const t = new T.DataTexture(data, steps.length, 1, T.RedFormat);
  t.minFilter = t.magFilter = T.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const TOON_RAMP = gradient([0.5, 0.78, 1]);
function clayMatcap() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'),
    r = g.createRadialGradient(46, 40, 6, 64, 64, 64);
  r.addColorStop(0, '#f4ead8');
  r.addColorStop(0.55, '#a89a86');
  r.addColorStop(1, '#3a3530');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
let CLAY = null;

/** Clone a material and snap its vertices to a coarse screen grid (PS1-style wobble). */
function snapped(o) {
  const m = o.clone();
  m.flatShading = true;
  m.onBeforeCompile = shader => {
    shader.uniforms.uSnap = {value: 120};
    shader.vertexShader =
      'uniform float uSnap;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;',
      );
  };
  m.customProgramCacheKey = () => 'snap';
  return m;
}

// ---------- screen-space passes ----------
const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
/**
 * A full-screen pass over the scene render.
 * @param {string} body  GLSL that sets `vec4 outColor` from tColor (scene), tNormal/tDepth (when normals), vUv, uTexel
 */
function makePass(body, {scale = 1, normals = false, nearest = false, uniforms = {}} = {}) {
  const size = new T.Vector2();
  const opts = {
    type: T.HalfFloatType,
    minFilter: nearest ? T.NearestFilter : T.LinearFilter,
    magFilter: nearest ? T.NearestFilter : T.LinearFilter,
  };
  const color = new T.WebGLRenderTarget(1, 1, opts);
  const normal = normals
    ? new T.WebGLRenderTarget(1, 1, {...opts, type: T.UnsignedByteType, depthTexture: new T.DepthTexture(1, 1)})
    : null;
  const normalMat = new T.MeshNormalMaterial();
  const material = new T.ShaderMaterial({
    uniforms: {
      tColor: {value: color.texture},
      tNormal: {value: normal?.texture || null},
      tDepth: {value: normal?.depthTexture || null},
      uTexel: {value: new T.Vector2()},
      uTime: {value: 0},
      uNear: {value: 0.01},
      uFar: {value: 60},
      ...uniforms,
    },
    vertexShader: QUAD_VERT,
    fragmentShader: `
uniform sampler2D tColor, tNormal, tDepth; uniform vec2 uTexel; uniform float uTime, uNear, uFar;
varying vec2 vUv;
${BAYER4}
${DISPLAY}
float linearDepth(vec2 uv) { float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float edge(float width, float crease) {
  vec2 o = uTexel * width;
  vec3 n = texture2D(tNormal, vUv).rgb * 2.0 - 1.0;
  float d = linearDepth(vUv), e = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 s = i == 0 ? vec2(o.x, 0.0) : i == 1 ? vec2(-o.x, 0.0) : i == 2 ? vec2(0.0, o.y) : vec2(0.0, -o.y);
    vec4 nn = texture2D(tNormal, vUv + s);
    float dd = linearDepth(vUv + s);
    e = max(e, step(crease, 1.0 - dot(n, nn.rgb * 2.0 - 1.0)) * nn.a);           // crease inside the model
    e = max(e, step(0.04 * d, abs(dd - d)));                                     // depth step
    e = max(e, abs(nn.a - texture2D(tNormal, vUv).a));                           // silhouette against the background
  }
  return e;
}
void main() { vec4 outColor = vec4(0.0); ${body} gl_FragColor = outColor; }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
    transparent: true,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const quadScene = new T.Scene(),
    quadCam = new T.Camera();
  quadScene.add(quad);
  const clock = new T.Clock();
  return {
    render(renderer, scene, camera, floor) {
      renderer.getDrawingBufferSize(size);
      const w = Math.max(1, Math.floor(size.x * scale)),
        h = Math.max(1, Math.floor(size.y * scale));
      if (color.width !== w || color.height !== h) {
        color.setSize(w, h);
        normal?.setSize(w, h);
      }
      material.uniforms.uTexel.value.set(1 / w, 1 / h);
      material.uniforms.uTime.value = clock.getElapsedTime();
      material.uniforms.uNear.value = camera.near;
      material.uniforms.uFar.value = camera.far;
      renderer.setRenderTarget(color);
      renderer.render(scene, camera);
      if (normal) {
        const bg = scene.background,
          floorVisible = floor?.visible;
        scene.background = null;
        if (floor) floor.visible = false;
        scene.overrideMaterial = normalMat;
        renderer.setRenderTarget(normal);
        renderer.render(scene, camera);
        scene.overrideMaterial = null;
        scene.background = bg;
        if (floor) floor.visible = floorVisible;
      }
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    },
    dispose() {
      color.dispose();
      normal?.dispose();
      material.dispose();
      normalMat.dispose();
    },
  };
}

const INK = (width, crease, ink = 'vec3(0.06, 0.07, 0.05)') => `
  vec4 c = texture2D(tColor, vUv);
  float e = edge(${width.toFixed(1)}, ${crease.toFixed(2)});
  outColor = vec4(mix(display(c.rgb), ${ink}, e), max(c.a, e));`;

// ---------- the styles ----------
export const STYLES = [
  {id: 'pbr', label: 'Lit low-poly', detail: 'The current look: flat-shaded facets lit by the HDR sky, soft shadow.'},
  {
    id: 'toon',
    label: 'Toon cel',
    detail: 'Three hard light bands per facet, no environment reflections. Reads clean at distance.',
    fill: 1.8,
    material: o => new T.MeshToonMaterial({...keep(o), gradientMap: TOON_RAMP, flatShading: true}),
  },
  {
    id: 'ink',
    label: 'Toon + ink',
    detail: 'Cel bands plus inked silhouettes and creases, comic-book style. Strongest gear readability.',
    fill: 1.8,
    material: o => new T.MeshToonMaterial({...keep(o), gradientMap: TOON_RAMP, flatShading: true}),
    pass: () => makePass(INK(2, 0.5), {normals: true}),
  },
  {
    id: 'clay',
    label: 'Clay study',
    detail: 'One neutral clay matcap with light ink: judges shape, silhouette and proportion without colour.',
    material: o => new T.MeshMatcapMaterial({name: o.name, matcap: (CLAY ||= clayMatcap()), flatShading: true, side: o.side}),
    pass: () => makePass(INK(1, 0.75, 'vec3(0.18, 0.16, 0.14)'), {normals: true}),
  },
  {
    id: 'silhouette',
    label: 'Silhouette test',
    detail: 'Pillar 2 check: a solid black shape on a pale ground. Who is it, and what are they carrying?',
    background: 0xd9dccb,
    material: o => new T.MeshBasicMaterial({name: o.name, color: 0x101309, side: o.side}),
  },
  {
    id: 'nokia',
    label: 'Nokia LCD',
    detail: 'The index phone screen: four greens, ordered dither, chunky pixels.',
    background: 0xe4ecd0,
    pass: () =>
      makePass(
        `vec3 c = display(texture2D(tColor, vUv).rgb);
  float l = clamp((dot(c, vec3(0.299, 0.587, 0.114)) - 0.08) * 1.45, 0.0, 1.0);
  float q = clamp(floor(l * 3.0 + bayer4(gl_FragCoord.xy / 3.0)) / 3.0, 0.0, 1.0);
  vec3 ink = vec3(0.086, 0.125, 0.059), paper = vec3(0.71, 0.78, 0.60);
  outColor = vec4(mix(ink, paper, q), 1.0);`,
        {scale: 1 / 3, nearest: true},
      ),
  },
  {
    id: 'ps1',
    label: 'PS1 retro',
    detail: 'Low resolution, wobbling snapped vertices and 15-bit dithered colour.',
    material: snapped,
    pass: () =>
      makePass(
        `vec4 c = texture2D(tColor, vUv);
  vec3 d = display(c.rgb) * 31.0 + (bayer4(gl_FragCoord.xy / 3.0) - 0.5);
  outColor = vec4(floor(d + 0.5) / 31.0, c.a);`,
        {scale: 1 / 3, nearest: true},
      ),
  },
  {
    id: 'nvg',
    label: 'Night vision',
    detail: 'Phosphor green through tubes: noise, scanlines and the round eyepiece.',
    pass: () =>
      makePass(
        `vec3 c = display(texture2D(tColor, vUv).rgb);
  float l = dot(c, vec3(0.299, 0.587, 0.114)) * 1.6;
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 61.0, vec2(12.9898, 78.233))) * 43758.5453);
  l = l * (0.86 + 0.28 * n) * (0.92 + 0.08 * sin(gl_FragCoord.y * 1.6));
  vec2 p = (vUv - 0.5) * vec2(uTexel.y / uTexel.x, 1.0);
  float v = smoothstep(0.52, 0.42, length(p));
  outColor = vec4(vec3(0.25, 1.0, 0.35) * l * v, 1.0);`,
      ),
  },
];

/**
 * Bind the styles to a stage and the subtree they restyle.
 * @param {{scene: T.Scene, floor?: T.Object3D, setRender: (fn: any) => void, wake?: () => void}} stage
 * @param {T.Object3D} root
 */
export function createStyler(stage, root) {
  let current = STYLES[0],
    pass = null,
    made = [];
  const swapped = new Set();
  const fill = new T.HemisphereLight(0xe8eed8, 0x2c3326, 0);
  stage.scene.add(fill);
  let savedBackground;

  function clear() {
    for (const o of swapped) {
      o.material = o.userData.styleOrig;
      delete o.userData.styleOrig;
    }
    swapped.clear();
    made.forEach(m => m.dispose());
    made = [];
    pass?.dispose();
    pass = null;
    stage.setRender(null);
    fill.intensity = 0;
    if (savedBackground !== undefined) {
      stage.scene.background = savedBackground;
      savedBackground = undefined;
    }
  }

  function apply() {
    const s = current;
    if (s.material) {
      const cache = new Map();
      root.traverse(o => {
        if (!o.isMesh || Array.isArray(o.material) || o.material.isShadowMaterial) return;
        const orig = o.material;
        let m = cache.get(orig);
        if (!m) cache.set(orig, (m = s.material(orig)));
        o.userData.styleOrig = orig;
        o.material = m;
        swapped.add(o);
      });
      made = [...cache.values()];
    }
    fill.intensity = s.fill || 0;
    if (s.background !== undefined) {
      savedBackground = stage.scene.background;
      stage.scene.background = new T.Color(s.background);
    }
    if (s.pass) {
      pass = s.pass();
      stage.setRender((renderer, scene, camera) => pass.render(renderer, scene, camera, stage.floor));
    }
    stage.wake?.();
  }

  return {
    get current() {
      return current.id;
    },
    /** Switch to style `id` (unknown ids fall back to the current look). */
    use(id) {
      clear();
      current = STYLES.find(s => s.id === id) || STYLES[0];
      apply();
    },
    /** Re-apply after meshes or materials changed underneath (new kit, weapon, base, colours). */
    refresh() {
      clear();
      apply();
    },
  };
}
