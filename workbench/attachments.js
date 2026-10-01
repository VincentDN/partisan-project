// Shared attachment library. Each slot sits on a mount point from a rifle's `sockets` in
// models.js and owns that rifle's part with the same id. Each rifle lists its factory options
// per slot and picks which library options it accepts. Units are meters in the slot's frame:
// +x toward the muzzle, +y up, +z the rifle's right side, origin at the mount point.
//
// Option kinds:
//  - original: shows the rifle's own part, optionally posed ({rotationY, position, nodes:{name:[dx,dy,dz]}}).
//  - build(ctx): returns an Object3D that replaces the source part. ctx.original is the
//    source part's group (for clones) and ctx.materials holds the model's materials by name.
//  - neither: the slot is left empty (or shows what the rifle has built in, like the AK-15K brake).
// Each slot's camera is the snappy angle the viewer cuts to when that slot changes: the
// direction from the part to the camera (model space), the distance in meters, and an
// optional aim offset from the mount point toward the part's middle.
// Built attachments are illustrative low-poly shapes, not measured replicas.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Real (downloaded, CC0 / CC BY) attachment parts. Replace a code-built `build` with
//   build: glb('red-dot.glb', {position:[0,0,0], rotation:[0,0,0], scale:1})
// where the file lives in assets/models/attachments/ (import it with tools/assets/import-asset.py,
// register it with tools/assets/register.mjs). Geometry arrives asynchronously into an empty group,
// so the slot works immediately and the part pops in when loaded. Units: metres in slot space
// (+x toward the muzzle, +y up, +z right side, origin at the mount point).
const partLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const glb = (file, {position = [0, 0, 0], rotation = [0, 0, 0], scale = 1} = {}) => () => {
  const group = new T.Group();
  partLoader.load(new URL(`../assets/models/attachments/${file}`, import.meta.url).href, gltf => {
    const model = gltf.scene;
    model.position.set(...position); model.rotation.set(...rotation); model.scale.setScalar(scale);
    model.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.material = m.material.clone(); } });
    group.add(model);
  }, undefined, err => console.error(`attachment ${file} failed to load`, err));
  return group;
};

const merge=geos=>mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g));
const box=(w,h,d,[x,y,z]=[0,0,0])=>new T.BoxGeometry(w,h,d).translate(x,y,z);
// Cylinder along x from x0 to x1.
const tube=(r,x0,x1,[y,z]=[0,0],seg=10,r1=r)=>new T.CylinderGeometry(r1,r,x1-x0,seg).rotateZ(-Math.PI/2).translate((x0+x1)/2,y,z);
// Side profile (x,y) extruded to a thickness centered on z.
const profile=(points,depth,bevel=0)=>{const g=new T.ExtrudeGeometry(new T.Shape(points.map(p=>new T.Vector2(...p))),{depth:depth-bevel*2,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});return g.translate(0,0,-depth/2+bevel);};
function group(...meshes){const g=new T.Group();for(const [geos,material] of meshes){g.add(new T.Mesh(Array.isArray(geos)?merge(geos):geos,material));}return g;}
const plum=new T.MeshStandardMaterial({name:'polymer',color:'#3e1f22',roughness:.6});

// Copy the source part with its transforms baked into slot-space geometry, then warp each vertex.
function reshape(original,warp){
 original.updateMatrixWorld(true);
 const g=new T.Group(),inverse=original.matrixWorld.clone().invert(),v=new T.Vector3();
 original.traverse(o=>{
  if(!o.isMesh)return;
  // The model files store quantized (normalized Int16) positions: expand to floats before
  // transforming and stretching, or values outside [-1, 1] would clamp.
  const geometry=o.geometry.clone();
  for(const name of ['position','normal']){const at=geometry.attributes[name];if(at&&!(at.array instanceof Float32Array)){const f=new Float32Array(at.count*3);for(let i=0;i<at.count;i++){f[i*3]=at.getX(i);f[i*3+1]=at.getY(i);f[i*3+2]=at.getZ(i);}geometry.setAttribute(name,new T.BufferAttribute(f,3));}}
  geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){warp(v.fromBufferAttribute(p,i));p.setXYZ(i,v.x,v.y,v.z);}
  g.add(new T.Mesh(geometry,o.material));// applyMatrix4 carried the source normals; the warps are gentle enough to keep them.
 });
 return g;
}
const smoothstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
// Illustrative masses in grams; each rifle adds its own base mass. Magazines are empty.
// Finish colours for the furniture. Original keeps the source colour; only polymer and black-finish
// surfaces are recoloured, so steel stays steel.
export const FINISHES=[
 {id:'original',label:'Original'},
 {id:'plum',label:'Plum',color:'#4a2427'},
 {id:'fde',label:'FDE',color:'#76603f'},
 {id:'od',label:'OD green',color:'#3c4332'},
 // Camo finishes use the shared generated patterns (shared/camo.js), projected triplanar (the rifles have no UVs).
 {id:'woodland',label:'Woodland camo',color:'#5a6b3f',pattern:'woodland'},
 {id:'desert',label:'Desert camo',color:'#b9a27a',pattern:'desert'},
 {id:'urban',label:'Urban camo',color:'#8a8d90',pattern:'urban'}
];
// Finish rows. A row with an option only shows (and only recolours) while that option is fitted.
export const FINISH_TARGETS=[
 {id:'handguard'},{id:'foregrip'},{id:'grip'},{id:'stock'},{id:'magazine'},
 {id:'suppressor',label:'Suppressor',part:'muzzle',option:'can',finishes:[
  {id:'original',label:'Black'},
  {id:'fde',label:'FDE',color:'#76603f'},
  {id:'od',label:'OD green',color:'#3c4332'},
  {id:'tungsten',label:'Tungsten grey',color:'#5b5f63'},
  {id:'bronze',label:'Burnt bronze',color:'#4e3d2b'}
 ]}
];
// Optics carry sightHeight: the sight line's height above the optic mount point (m). Kept as data
// for aligning operator hero poses (cheek weld / eye line) when poses carry a weapon prop.
// Slot order is the Build panel order. Rails (10 mm steps) are set per rifle in models.js.
export const SLOTS=[
 {id:'muzzle',camera:{direction:[.55,.22,.8],distance:.42},label:'Muzzle',library:[
  {id:'ak74',grams:70,label:'AK-74 brake',detail:'Classic two-chamber AK-74 brake with its wide front port.',build:({materials})=>group(
   [[tube(.0105,-.004,.03,[0,0],10),tube(.012,.03,.07,[0,0],10),tube(.0105,.07,.082,[0,0],10)],materials['h-190']],
   [[box(.018,.004,.026,[.05,0,0]),box(.012,.022,.004,[.05,0,.011]),box(.012,.022,.004,[.05,0,-.011])],materials.stell])},
  {id:'comp',grams:95,label:'Compensator',detail:'Short three-port compensator; ports vent upward to hold the muzzle down.',build:({materials})=>group(
   [[tube(.0135,-.004,.052,[0,0],8)],materials.stell],
   [[box(.008,.005,.012,[.012,.012,0]),box(.008,.005,.012,[.026,.012,0]),box(.008,.005,.012,[.04,.012,0])],materials['h-190']])},
  {id:'can',grams:540,label:'Suppressor',detail:'Full-length sound suppressor, 190 mm, on a quick-detach collar.',build:({materials})=>group(
   [[tube(.016,-.004,.024,[0,0],12)],materials.stell],
   [[tube(.0195,.024,.19,[0,0],12),tube(.017,.19,.198,[0,0],12,.0195)],materials['h-190']])},
  {id:'bare',grams:0,label:'Bare',detail:'Bare 24×1.5 mm threaded muzzle.'}
 ]},
 {id:'optic',camera:{direction:[-.45,.4,1],distance:.5},label:'Optic',library:[
  {id:'micro',grams:180,sightHeight:.034,label:'Micro dot',detail:'Compact tube red dot on a low mount.',build:({materials})=>{
   const g=group(
    [[box(.042,.01,.03,[0,.005,0]),box(.03,.012,.018,[0,.016,0]),tube(.0155,-.024,.024,[.034,0],12),tube(.0175,.018,.026,[.034,0],12),tube(.0175,-.026,-.018,[.034,0],12),new T.CylinderGeometry(.006,.006,.012,8).translate(0,.054,0)],materials['h-190']],
    [tube(.0145,.0245,.0255,[.034,0],12),materials.glass]);
   const dot=new T.Mesh(new T.SphereGeometry(.001,6,4),materials.red_emission);dot.position.set(0,.034,0);g.add(dot);return g;}},
  {id:'holo',grams:320,sightHeight:.04,label:'Holographic',detail:'Box-hooded holographic sight with a wide window.',build:({materials})=>{
   const g=group(
    [[box(.08,.012,.032,[0,.006,0]),box(.028,.026,.036,[-.02,.025,0]),box(.05,.004,.036,[.012,.058,0]),box(.05,.046,.004,[.012,.035,.017]),box(.05,.046,.004,[.012,.035,-.017]),box(.012,.012,.012,[-.02,.044,.02])],materials['h-190']],
    [box(.002,.034,.03,[.03,.037,0]),materials.glass]);
   const dot=new T.Mesh(new T.SphereGeometry(.0012,6,4),materials.red_emission);dot.position.set(.03,.04,0);g.add(dot);return g;}},
  {id:'scope',grams:460,sightHeight:.046,label:'4× scope',detail:'4× fixed-power scope in two rings, 280 mm long.',build:({materials})=>group(
   [[tube(.0127,-.07,.07,[.046,0],12),tube(.021,.07,.12,[.046,0],12,.0127),tube(.021,.12,.15,[.046,0],12),tube(.0127,-.12,-.07,[.046,0],12,.019),tube(.019,-.155,-.12,[.046,0],12),
     new T.CylinderGeometry(.009,.009,.018,8).translate(0,.066,0),new T.CylinderGeometry(.009,.009,.018,8).rotateX(Math.PI/2).translate(0,.046,.02),
     box(.016,.03,.028,[-.05,.021,0]),box(.016,.03,.028,[.05,.021,0]),box(.026,.008,.03,[-.05,.004,0]),box(.026,.008,.03,[.05,.004,0])],materials['h-190']],
   [[tube(.019,.1495,.151,[.046,0],12),tube(.0165,-.1555,-.1545,[.046,0],12)],materials.glass])},
  {id:'none',sightHeight:.012,label:'Irons',detail:'No optic: the rifle falls back to its iron sights.'}
 ]},
 {id:'foregrip',camera:{direction:[.1,-.28,1],distance:.46,aim:[0,-.03,0]},label:'Foregrip',library:[
  {id:'vertical',grams:90,label:'Vertical',detail:'Plain vertical foregrip on a rail clamp.',build:({materials})=>group(
   [[box(.046,.01,.028,[0,-.005,0]),new T.CylinderGeometry(.0145,.013,.085,8).translate(0,-.052,0),new T.CylinderGeometry(.015,.015,.006,8).translate(0,-.096,0)],materials.polymer])},
  {id:'angled',grams:60,label:'Angled',detail:'Angled foregrip: a thumb ramp for a high, straight-arm hold.',build:({materials})=>group(
   [profile([[-.048,0],[.042,0],[.038,-.012],[-.028,-.046],[-.046,-.042]],.028,.003),materials.polymer])},
  {id:'stop',grams:30,label:'Hand stop',detail:'Low hand stop at the front of the lower rail.',build:({materials})=>group(
   [profile([[-.016,0],[.02,0],[.02,-.016],[.008,-.021],[-.016,-.008]],.024,.002),materials.polymer])},
  {id:'none',label:'None',detail:'Clean handguard, no foregrip.'}
 ]},
 {id:'side',camera:{direction:[.25,.2,1],distance:.42},label:'Side rail',library:[
  // Mounted on the right-hand rail: +z points away from the rifle.
  {id:'light',grams:110,label:'Weapon light',detail:'Compact weapon light on a rail clamp; its beam lights the scene.',build:({materials})=>{
   const g=group(
    [[box(.03,.012,.016,[0,0,.008]),tube(.013,-.045,.035,[0,.03],10),tube(.016,.035,.05,[0,.03],10,.013)],materials['h-190']],
    [tube(.0145,.0505,.0515,[0,.03],10),new T.MeshStandardMaterial({color:'#fff6de',emissive:'#fff1c4',emissiveIntensity:2})]);
   // Beam: a soft spotlight along the barrel.
   const beam=new T.SpotLight(0xfff1d6,6,6,.28,.6,1.5);beam.position.set(.052,0,.03);beam.target.position.set(2,0,.03);g.add(beam,beam.target);
   return g;}},
  {id:'laser',grams:80,label:'Laser',detail:'Visible laser aiming module; the dot helps from the hip.',build:({materials})=>{
   const g=group([[box(.03,.012,.016,[0,0,.008]),box(.06,.028,.026,[.005,.02,.025])],materials['h-190']],[box(.002,.008,.008,[.036,.02,.025]),materials.red_emission]);
   const ray=new T.Mesh(new T.CylinderGeometry(.0006,.0006,1.4,4).rotateZ(-Math.PI/2).translate(.037+.7,.02,.025),new T.MeshBasicMaterial({color:'#ff2a2a',transparent:true,opacity:.55,depthWrite:false}));ray.userData.visualEffect=true;g.add(ray);return g;}},
  {id:'combo',grams:190,label:'Light + laser',detail:'Combined light and laser unit.',build:({materials})=>{
   const g=group([[box(.03,.012,.016,[0,0,.008]),box(.065,.028,.028,[0,.022,.026])],materials['h-190']],
    [tube(.0105,.0325,.0335,[.026,.026],10),new T.MeshStandardMaterial({color:'#fff6de',emissive:'#fff1c4',emissiveIntensity:2})],[box(.002,.006,.006,[.0335,.012,.026]),materials.red_emission]);
   const beam=new T.SpotLight(0xfff1d6,6,6,.28,.6,1.5);beam.position.set(.034,.026,.026);beam.target.position.set(2,.026,.026);g.add(beam,beam.target);return g;}},
  {id:'none',label:'None',detail:'Bare side rail.'}
 ]},
 {id:'magazine',camera:{direction:[.3,-.05,1],distance:.55,aim:[.03,-.1,0]},label:'Magazine',library:[
  // Stretched copies of the source magazine; the part inside the mag well keeps its shape.
  {id:'45',grams:310,label:'Extended',detail:'Extended RPK-style magazine: the 30-rounder lengthened by a third.',build:({original})=>reshape(original,v=>{if(v.y<0)v.y*=1.36;})},
  {id:'60',grams:450,label:'Quad-stack',detail:'Quad-stack magazine: single-stack at the feed lips, twice as wide below the mag well.',build:({original})=>reshape(original,v=>{if(v.y<0)v.y*=1.18;v.z*=1+.85*smoothstep(.02,.06,-v.y);})},
  // Drum: a short feed tower out of the mag well into a 136 mm drum, axis across the rifle.
  {id:'drum',grams:900,label:'Drum',detail:'Drum magazine: a short feed tower into a 136 mm drum with a winding key on the right face.',build:({materials})=>group(
   [[profile([[-.062,.03],[.014,.03],[.02,-.02],[.03,-.07],[-.042,-.07],[-.056,-.02]],.026,.002),
     new T.CylinderGeometry(.068,.068,.05,16).rotateX(Math.PI/2).translate(-.008,-.118,0)],materials.polymer],
   [[new T.CylinderGeometry(.064,.064,.058,16).rotateX(Math.PI/2).translate(-.008,-.118,0),
     new T.CylinderGeometry(.018,.018,.066,10).rotateX(Math.PI/2).translate(-.008,-.118,0),
     box(.03,.006,.006,[-.008,-.118,.035])],materials['h-190']])},
  {id:'none',label:'None',detail:'Magazine removed.'}
 ]},
 {id:'grip',camera:{direction:[-.35,.05,1],distance:.42,aim:[-.02,-.05,0]},label:'Pistol grip',library:[
  {id:'classic',grams:70,label:'Classic plum',detail:'Classic plum polymer AK grip, slimmer and more steeply raked.',build:()=>group(
   [profile([[.016,.004],[-.02,.004],[-.062,-.112],[-.058,-.122],[-.03,-.124],[-.004,-.07],[.012,-.03]],.028,.003),plum])}
 ]},
 {id:'stock',camera:{direction:[-.7,.25,.7],distance:.55},label:'Stock',library:[
  {id:'none',label:'Removed',detail:'Stock removed: bare trunnion.'}
 ]}
];
