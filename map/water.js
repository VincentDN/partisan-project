// The sea: bright azure over the shelf and turquoise in the shallows, deep blue offshore (from a depth map baked off
// the heightfield), with moving ripples catching the sun, a sky-coloured sheen at a glance, and foam where it laps
// the shore. Fog applies, so the far sea hazes into the sky like the land.
import * as T from 'three';

function depthTexture(field) {
  const {cols, rows, h} = field;
  const data = new Uint8Array(cols * rows * 4);
  for (let k = 0; k < cols * rows; k++) {
    const d = Math.min(1, Math.max(0, -h[k] / 22)); // 0 at the shore, 1 at 22 units deep
    data[k * 4] = d * 255;
    data[k * 4 + 3] = 255;
  }
  const t = new T.DataTexture(data, cols, rows, T.RGBAFormat);
  t.magFilter = t.minFilter = T.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export function buildWater(field, sunDir) {
  const uniforms = T.UniformsUtils.merge([
    T.UniformsLib.fog,
    {
      tDepth: {value: depthTexture(field)},
      uSize: {value: new T.Vector2(field.w, field.d)},
      uTime: {value: 0},
      uSun: {value: sunDir.clone().normalize()},
    },
  ]);
  const mat = new T.ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
    fragmentShader: `
uniform sampler2D tDepth; uniform vec2 uSize; uniform float uTime; uniform vec3 uSun;
varying vec3 vWorld;
#include <common>
#include <fog_pars_fragment>
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vWorld.xz;
  vec2 uv = vec2(p.x / uSize.x + 0.5, p.y / uSize.y + 0.5);
  bool inside = uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0;
  float depth = inside ? texture2D(tDepth, uv).r : 1.0;
  // ripples: two scrolling noise layers make a normal
  float t = uTime;
  float a = vnoise(p * 0.22 + vec2(t * 0.35, t * 0.2)) + vnoise(p * 0.5 - vec2(t * 0.25, -t * 0.3)) * 0.5;
  float bx = vnoise(p * 0.22 + vec2(0.7, 0.0) + vec2(t * 0.35, t * 0.2)) + vnoise(p * 0.5 + vec2(0.3, 0.0) - vec2(t * 0.25, -t * 0.3)) * 0.5;
  float bz = vnoise(p * 0.22 + vec2(0.0, 0.7) + vec2(t * 0.35, t * 0.2)) + vnoise(p * 0.5 + vec2(0.0, 0.3) - vec2(t * 0.25, -t * 0.3)) * 0.5;
  vec3 n = normalize(vec3((a - bx) * 0.9, 1.0, (a - bz) * 0.9));
  vec3 shallow = vec3(0.22, 0.86, 0.84), azure = vec3(0.07, 0.55, 0.86), deep = vec3(0.03, 0.2, 0.45);
  vec3 c = mix(shallow, azure, smoothstep(0.0, 0.35, depth));
  c = mix(c, deep, smoothstep(0.35, 1.0, depth));
  vec3 view = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(view, n), 0.0), 3.0);
  c = mix(c, vec3(0.7, 0.85, 0.97), fres * 0.5);
  float spec = pow(max(dot(reflect(-uSun, n), view), 0.0), 120.0);
  c += vec3(1.0, 0.95, 0.85) * spec * 1.4;
  // foam on the beach line, breaking with the swell
  float swell = 0.5 + 0.5 * sin(t * 1.3 + p.x * 0.05 + p.y * 0.04);
  float foam = smoothstep(0.06, 0.0, depth - 0.015 * swell) * smoothstep(0.35, 0.75, vnoise(p * 0.9 + t * 0.4));
  c = mix(c, vec3(0.95, 0.98, 1.0), foam * 0.8);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(4000, 4000, 1, 1).rotateX(-Math.PI / 2), mat);
  mesh.position.y = 0;
  mesh.name = 'sea';
  return {mesh, uniforms};
}
