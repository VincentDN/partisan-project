// The 2.5-D overworld's look (map25/): an HD-2D frame in the manner of Octopath Traveler. The scene draws into a
// multisampled buffer; one full-screen pass then blurs the top and bottom of the frame (tilt-shift: the island reads
// as a miniature diorama), lets the highlights bloom a little, warms and lifts the colour, darkens the corners and
// adds a faint grain, before tone mapping to the screen. The blur depends only on where a pixel is on screen, not on
// depth, so sprite and model edges stay clean.
import * as T from 'three';

export function createHD2D(renderer, {focus = 0.46, band = 0.15, blur = 7} = {}) {
  const size = new T.Vector2();
  const target = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType, samples: 4});
  const material = new T.ShaderMaterial({
    uniforms: {
      tColor: {value: target.texture},
      uTexel: {value: new T.Vector2()},
      uFocus: {value: focus}, // screen height (0 bottom, 1 top) that stays sharp
      uBand: {value: band}, // half-height of the sharp band
      uBlur: {value: blur}, // pixels of blur at the frame's edges (scaled with the resolution)
      uAspect: {value: 1},
      uTime: {value: 0},
      uAmount: {value: 1}, // 0 turns the whole look off (for comparison)
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
uniform sampler2D tColor; uniform vec2 uTexel; uniform float uFocus, uBand, uBlur, uAspect, uTime, uAmount;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  // tilt-shift: blur grows with the distance from the sharp band
  float k = smoothstep(0.0, 0.3, abs(vUv.y - uFocus) - uBand) * uAmount;
  float r = k * uBlur;
  vec3 sum = texture2D(tColor, vUv).rgb;
  vec3 glow = vec3(0.0);
  float total = 1.0;
  for (int i = 1; i < 20; i++) {
    float fi = float(i);
    float a = fi * 2.39996323;
    vec2 dir = vec2(cos(a), sin(a));
    vec3 c = texture2D(tColor, vUv + dir * sqrt(fi / 20.0) * r * uTexel).rgb;
    sum += c;
    total += 1.0;
    // bloom: the bright parts of a wider ring, everywhere
    vec3 g = texture2D(tColor, vUv + dir * (4.0 + fi * 0.9) * uTexel).rgb;
    glow += max(g - vec3(0.9), 0.0);
  }
  vec3 col = sum / total + glow / 19.0 * 0.6 * uAmount;
  // grade: warm light, a touch more colour, shadows nudged toward teal (the HD-2D palette)
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 graded = mix(vec3(luma), col, 1.18) * vec3(1.05, 1.0, 0.9);
  graded += vec3(-0.004, 0.006, 0.012) * (1.0 - smoothstep(0.0, 0.25, luma));
  col = mix(col, graded, uAmount);
  // vignette and grain
  float v = length((vUv - 0.5) * vec2(uAspect, 1.0));
  col *= mix(1.0, smoothstep(1.05, 0.35, v) * 0.35 + 0.65, uAmount);
  col += (hash(vUv * 1000.0 + uTime) - 0.5) * 0.012 * uAmount;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
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
  return {
    uniforms: material.uniforms,
    render(scene, camera, t = 0) {
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
      const u = material.uniforms;
      u.uTexel.value.set(1 / size.x, 1 / size.y);
      u.uBlur.value = blur * (size.y / 900);
      u.uAspect.value = size.x / size.y;
      u.uTime.value = t % 100;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    },
  };
}
