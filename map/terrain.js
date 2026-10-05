// The island's ground: a heightfield mesh painted by height and slope with five CC0 aerial textures (Poly Haven:
// beach sand, grass and rock, dry Mediterranean ground, bare rock, snowfield), each mixed at two scales so the tiling
// does not show from the map's height. Over it: the provinces' colours with a bright line on each border (Bannerlord's
// political view, faint up close) and the shadows of the clouds drifting across.
import * as T from 'three';
import {SNOWLINE, FACTIONS, provinceAt} from './island.js';

const TEX = name => new URL(`../assets/textures/terrain/${name}.jpg`, import.meta.url).href;

/** The territory texture: rgb = owner's colour on land (black at sea), a = border (1 on a province edge). */
function territoryTexture(field) {
  const W = 480,
    H = Math.round((W * field.d) / field.w);
  const owner = new Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const x = (i / (W - 1) - 0.5) * field.w,
        z = (j / (H - 1) - 0.5) * field.d;
      owner[j * W + i] = provinceAt(x, z);
    }
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = j * W + i,
        p = owner[k];
      const c = new T.Color(FACTIONS[p.faction].color);
      data.set([c.r * 255, c.g * 255, c.b * 255, 0], k * 4);
      // a border wherever a neighbour within 2 texels belongs to another province (thicker between factions)
      let edge = 0;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [2, 0],
        [0, 2],
        [-2, 0],
        [0, -2],
      ]) {
        const q = owner[Math.min(H - 1, Math.max(0, j + dj)) * W + Math.min(W - 1, Math.max(0, i + di))];
        if (q !== p) edge = Math.max(edge, q.faction !== p.faction ? 1 : Math.abs(di) + Math.abs(dj) === 1 ? 0.55 : 0);
      }
      data[k * 4 + 3] = edge * 255;
    }
  const tex = new T.DataTexture(data, W, H, T.RGBAFormat);
  tex.colorSpace = T.SRGBColorSpace;
  tex.magFilter = tex.minFilter = T.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function buildTerrain(field, {anisotropy = 4} = {}) {
  const geo = new T.PlaneGeometry(field.w, field.d, field.cols - 1, field.rows - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let k = 0; k < pos.count; k++) pos.setY(k, field.h[k]);
  geo.computeVertexNormals();

  const loader = new T.TextureLoader();
  const load = name => {
    const t = loader.load(TEX(name));
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  };
  const uniforms = {
    tSand: {value: load('aerial_beach_01')},
    tGrass: {value: load('aerial_grass_rock')},
    tDry: {value: load('dry_ground_rocks')},
    tRock: {value: load('aerial_rocks_02')},
    tSnow: {value: load('snow_field_aerial')},
    tTerritory: {value: territoryTexture(field)},
    uSize: {value: new T.Vector2(field.w, field.d)},
    uSnow: {value: SNOWLINE},
    uTime: {value: 0},
    uPolitical: {value: 0.35}, // how strongly the provinces show (rises as the camera climbs)
  };
  const mat = new T.MeshStandardMaterial({roughness: 0.95, metalness: 0});
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld; varying vec3 vWNormal;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNormal = normalize(mat3(modelMatrix) * objectNormal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D tSand, tGrass, tDry, tRock, tSnow, tTerritory; uniform vec2 uSize; uniform float uSnow, uTime, uPolitical;
varying vec3 vWorld; varying vec3 vWNormal;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm2(vec2 p) { return vnoise(p) * 0.5 + vnoise(p * 2.1) * 0.25 + vnoise(p * 4.3) * 0.125; }
// one texture at two scales, so the repeats break up
vec3 tex2(sampler2D t, vec2 p) { return mix(texture2D(t, p / 26.0).rgb, texture2D(t, p / 97.0 + 0.37).rgb, 0.45); }`,
      )
      .replace(
        '#include <map_fragment>',
        `{
  vec2 p = vWorld.xz;
  float h = vWorld.y;
  float slope = 1.0 - clamp(vWNormal.y, 0.0, 1.0);
  float n = fbm2(p / 38.0), n2 = fbm2(p / 9.0 + 7.0);
  vec3 sand = tex2(tSand, p) * vec3(1.08, 1.04, 0.95);
  vec3 grass = tex2(tGrass, p) * vec3(0.82, 1.08, 0.62); // greener, the spring maquis
  vec3 dry = tex2(tDry, p) * vec3(1.0, 0.95, 0.85);
  vec3 rock = tex2(tRock, p) * vec3(0.95, 0.94, 0.9);
  vec3 snow = tex2(tSnow, p) * 1.12;
  // lowland: green in the hollows, dry Mediterranean scrub on the knolls and in patches
  float dryness = smoothstep(0.5, 0.7, n + h * 0.005) * 0.85;
  vec3 c = mix(grass, dry, dryness);
  // beaches along the water line
  c = mix(c, sand, smoothstep(2.6, 0.8, h + n2 * 1.2));
  // rock on the steep and the high ground
  float rocky = max(smoothstep(0.28, 0.45, slope + n2 * 0.08), smoothstep(30.0, 44.0, h + n * 8.0));
  c = mix(c, rock, rocky);
  // snow above the snowline, sliding off the steepest faces
  float snowy = smoothstep(uSnow - 4.0, uSnow + 3.0, h + (n - 0.5) * 12.0) * (1.0 - smoothstep(0.55, 0.75, slope));
  c = mix(c, snow, snowy);
  // the provinces: a faint wash of the owner's colour and a bright line on the borders
  vec4 terr = texture2D(tTerritory, vec2(p.x / uSize.x + 0.5, p.y / uSize.y + 0.5));
  float onLand = smoothstep(0.0, 1.5, h);
  c = mix(c, terr.rgb, (0.06 + 0.12 * uPolitical) * onLand);
  c = mix(c, terr.rgb * 1.35 + 0.1, terr.a * (0.35 + 0.5 * uPolitical) * onLand);
  // cloud shadows drifting west to east
  float cloud = smoothstep(0.55, 0.75, fbm2(p / 160.0 + vec2(uTime * 0.012, uTime * 0.004)));
  c *= 1.0 - cloud * 0.28;
  diffuseColor.rgb = c;
}`,
      );
  };
  const mesh = new T.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  return {mesh, uniforms};
}
