// Depth of field for the Operator Customiser's warehouse: the operator stays sharp and the room behind falls out of
// focus, as a camera would at a wide aperture. The scene renders to a target with its depth; a full-screen pass then
// blurs each pixel by its circle of confusion (how far it sits from the focal plane, beyond a sharp zone round the
// subject) with a golden-angle disk of taps, weighting each tap by its own blur so a sharp subject does not smear onto
// the background. Tone mapping and colour space are applied on the way to the screen.
import * as T from 'three';

const TAPS = 20;
export function createDof(stage, {focus = () => 3.5} = {}) {
  const size = new T.Vector2();
  const target = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType, depthTexture: new T.DepthTexture(1, 1)});
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
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
uniform sampler2D tColor, tDepth; uniform vec2 uTexel; uniform float uNear, uFar, uFocus, uSharp, uFalloff, uMaxBlur;
varying vec2 vUv;
float depthAt(vec2 uv) { float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
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
  gl_FragColor = vec4((sum / total).rgb, 1.0);
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
