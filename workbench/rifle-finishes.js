import * as T from 'three';
import {camoFor} from '../shared/camo.js';
// Shared material appearance for both presentations.
const CAMO_SCALE = 4; // texture repeats per meter
// Wear (0–1) is one shared uniform for the whole rifle: scuffs expose bare metal, low spots gather dust.

export function installCamo(model, wearUniform = {value: 0}) {
  model.updateMatrixWorld(true);
  const inverse = model.matrixWorld.clone().invert();
  model.traverse(o => {
    if (!o.isMesh || !RECOLOURED.has(o.material.name)) return;
    const uniforms = {
      camoMap: {value: null},
      camoOn: {value: 0},
      camoMatrix: {value: inverse.clone().multiply(o.matrixWorld)},
      wear: wearUniform,
    };
    o.material.userData.camo = uniforms;
    o.material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader =
        'uniform mat4 camoMatrix;\nvarying vec3 vCamoPos;\nvarying vec3 vCamoNormal;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vCamoPos=(camoMatrix*vec4(position,1.)).xyz;vCamoNormal=normalize(mat3(camoMatrix)*normal);',
        );
      shader.fragmentShader =
        `uniform sampler2D camoMap;
uniform float camoOn;
uniform float wear;
varying vec3 vCamoPos;
varying vec3 vCamoNormal;
float wHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float wNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(wHash(i),wHash(i+vec3(1,0,0)),f.x),mix(wHash(i+vec3(0,1,0)),wHash(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(wHash(i+vec3(0,0,1)),wHash(i+vec3(1,0,1)),f.x),mix(wHash(i+vec3(0,1,1)),wHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
 if(camoOn>.5){vec3 n=pow(abs(normalize(vCamoNormal)),vec3(4.));n/=n.x+n.y+n.z;vec3 p=vCamoPos*${CAMO_SCALE.toFixed(1)};
  diffuseColor.rgb=texture2D(camoMap,p.yz).rgb*n.x+texture2D(camoMap,p.xz).rgb*n.y+texture2D(camoMap,p.xy).rgb*n.z;}
 if(wear>0.){
  // Scuffs: fine, stretched noise along the rifle (handling marks run lengthwise).
  float scuff=wNoise(vCamoPos*vec3(60.,320.,320.))*.65+wNoise(vCamoPos*vec3(18.,70.,70.))*.35;
  // At full wear about a fifth of the paint is gone; colours are linear (bare steel ≈ #6d7074).
  float bare=smoothstep(1.-wear*.2,1.-wear*.2+.04,scuff);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.15,.16,.17),bare*.8);
  // Dust: broad, soft patches that settle on upward faces.
  float dust=smoothstep(.45,.9,wNoise(vCamoPos*14.))*wear*(.35+.65*max(vCamoNormal.y,0.));
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.33,.27,.19),dust*.4);
 }`,
        );
    };
    o.material.customProgramCacheKey = () => 'rifle-camo-wear-v2';
    o.material.needsUpdate = true;
  });
}
// Finishes recolour only black-finish and polymer surfaces.
const RECOLOURED = new Set(['h-190', 'polymer']);
export function targetMeshes(rifle, target) {
  if (!target.option) return target.part.objects;
  const meshes = [];
  rifle.slots[target.part.id].options
    .find(o => o.id === target.option)
    .object.traverse(m => {
      if (m.isMesh) meshes.push(m);
    });
  return meshes;
}
export function applyFinishState(rifle, targetId, finishId) {
  const target = rifle.finishTargets.find(t => t.id === targetId),
    choice = target.finishes.find(f => f.id === finishId) || target.finishes[0];
  rifle.finish[targetId] = choice.id;
  for (const mesh of targetMeshes(rifle, target)) {
    const m = mesh.material;
    if (!RECOLOURED.has(m.name)) continue;
    m.userData.baseColor ??= m.color.clone();
    m.color.copy(choice.color ? new T.Color(choice.color) : m.userData.baseColor);
    if (m.userData.camo) {
      m.userData.camo.camoOn.value = choice.pattern ? 1 : 0;
      m.userData.camo.camoMap.value = choice.pattern ? camoFor(choice.pattern) : null;
    }
  }
  return choice;
}
