import {BenchSession} from './bench-session.js';
// Persistent workbench: shared rifle state, timed part changes and optional full viewer.
// Scene space: operator's feet on y=0 facing +z, right side -x (see operator.js); meters.
import * as T from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {MODELS,DEFAULT_MODEL} from './ak15-weapon-customiser/models.js';
import {DEFAULT_OPERATOR,buildOperator} from './ak15-weapon-customiser/operator.js';
import {mountTopBar} from '../shared/topbar.js';

const TABLE={top:.86,x:[-.95,.95],z:[.24,1.04]};
// Camera behind and above the right shoulder, looking down at the rifle.
const SHOT={position:new T.Vector3(-.56,1.86,0),target:new T.Vector3(-.06,.84,.42)};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Sound ----------
// The top bar (shared/topbar.js) holds the music player and puts the sound layer in its bench mix: the music comes out of
// the old radio, with the camp around it. The layer belongs to the shell, so the music carries on from page to page.
const sound=mountTopBar({scene:'bench',overlay:true,current:'intro'});

const stage=document.querySelector('#stage'),status=document.querySelector('#status'),start=document.querySelector('#start'),fade=document.querySelector('#fade');
const renderer=new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<780?1.25:1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;stage.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x07090a);scene.fog=new T.Fog(0x07090a,2.2,5);
const camera=new T.PerspectiveCamera(42,1,.05,20);camera.position.copy(SHOT.position);camera.lookAt(SHOT.target);

// ---------- Lighting: one warm work lamp, a cold fill, a dim HDR for the metal ----------
scene.add(new T.HemisphereLight(0x4a5a66,0x120d08,.35));
const lamp=new T.SpotLight(0xffc98a,17,4,.62,.55,2);lamp.position.set(.42,1.62,.78);lamp.target.position.set(.02,TABLE.top,.6);
lamp.castShadow=true;lamp.shadow.mapSize.set(2048,2048);lamp.shadow.bias=-.0004;lamp.shadow.normalBias=.01;scene.add(lamp,lamp.target);
const fill=new T.DirectionalLight(0x6f8fb0,.35);fill.position.set(-1.5,2,-1);scene.add(fill);
new RGBELoader().load('../assets/lighting/studio.hdr',hdr=>{hdr.mapping=T.EquirectangularReflectionMapping;scene.environment=hdr;scene.environmentIntensity=.28;});

// ---------- Room and bench (original low-poly geometry) ----------
const std=(color,roughness=.85,extra={})=>new T.MeshStandardMaterial({color,roughness,...extra});
function woodTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=256;const g=c.getContext('2d');
 g.fillStyle='#6b5238';g.fillRect(0,0,512,256);
 for(let i=0;i<150;i++){const y=Math.random()*256;g.strokeStyle=`rgba(${Math.random()<.5?'40,26,14':'150,118,82'},${.08+Math.random()*.18})`;g.lineWidth=.5+Math.random()*2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=512;x+=32)g.lineTo(x,y+Math.sin(x/70+i)*3);g.stroke();}
 for(let i=0;i<40;i++){g.fillStyle=`rgba(20,14,8,${Math.random()*.25})`;g.beginPath();g.ellipse(Math.random()*512,Math.random()*256,4+Math.random()*30,2+Math.random()*10,0,0,Math.PI*2);g.fill();}// stains
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;
}
const mesh=(geo,material,[x,y,z],shadow=true)=>{const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;};
const W=TABLE.x[1]-TABLE.x[0],D=TABLE.z[1]-TABLE.z[0],CX=(TABLE.x[0]+TABLE.x[1])/2,CZ=(TABLE.z[0]+TABLE.z[1])/2;
mesh(new T.BoxGeometry(W,.05,D),std(0xffffff,.78,{map:woodTexture()}),[CX,TABLE.top-.025,CZ]);
for(const x of [TABLE.x[0]+.06,TABLE.x[1]-.06])for(const z of [TABLE.z[0]+.06,TABLE.z[1]-.06])mesh(new T.BoxGeometry(.07,TABLE.top-.05,.07),std(0x3b2c1f),[x,(TABLE.top-.05)/2,z]);
mesh(new T.PlaneGeometry(8,8).rotateX(-Math.PI/2),std(0x1b1d1e,.95),[0,0,0],false);
mesh(new T.PlaneGeometry(6,3),std(0x2b2f2c,.95),[0,1.5,TABLE.z[1]+.05],false);// back wall
mesh(new T.BoxGeometry(1.4,.8,.015),std(0x4a3f30,.9),[.1,1.42,TABLE.z[1]+.035],false);// pegboard
// Props: screwdriver, file, rag, ammo tin, power strip with a lit switch.
const tools=std(0x3a3f44,.45,{metalness:.7});
const driver=new T.Group();driver.add(new T.Mesh(new T.CylinderGeometry(.014,.016,.11,8).rotateZ(Math.PI/2),std(0x3f4b3a,.6)),new T.Mesh(new T.CylinderGeometry(.004,.004,.12,6).rotateZ(Math.PI/2).translate(.115,0,0),tools));
driver.position.set(.18,TABLE.top+.016,.96);driver.rotation.y=.25;driver.traverse(m=>{if(m.isMesh)m.castShadow=true;});scene.add(driver);
mesh(new T.BoxGeometry(.2,.008,.025),tools,[.32,TABLE.top+.004,.72]).rotation.y=-.4;
const rag=mesh(new T.IcosahedronGeometry(.1,1).scale(1.3,.28,1),std(0x6d6a60,.98,{flatShading:true}),[.6,TABLE.top+.012,.95]);rag.rotation.y=.6;
mesh(new T.BoxGeometry(.18,.1,.1),std(0x3e4a32,.7),[-.68,TABLE.top+.05,.62]).rotation.y=.3;
const strip=mesh(new T.BoxGeometry(.06,.035,.3),std(0x8e9092,.6),[.8,TABLE.top+.018,.5]);strip.rotation.y=-.15;
mesh(new T.BoxGeometry(.03,.012,.03),std(0xff2a1a,.4,{emissive:0xff2a1a,emissiveIntensity:2.5}),[.8,TABLE.top+.04,.4],false);
// The lamp itself: a shade and a glowing bulb above the bench.
mesh(new T.ConeGeometry(.12,.14,10,1,true),std(0x3c4a3f,.6,{side:T.DoubleSide}),[lamp.position.x,lamp.position.y+.05,lamp.position.z],false);
mesh(new T.SphereGeometry(.03,8,6),new T.MeshBasicMaterial({color:0xfff0d0}),[lamp.position.x,lamp.position.y,lamp.position.z],false);

// The old radio at the back of the bench: wooden case, cloth grille, lit tuning dial, two knobs
// and a carry handle. The music comes out of it (bench-audio.js pans the sound to its position).
const RADIO_AT=new T.Vector3(-.26,TABLE.top,.92);
const radio=new T.Group();radio.position.copy(RADIO_AT);radio.rotation.y=.25;scene.add(radio);
{
 const part=(geo,material,[x,y,z])=>{const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;radio.add(m);return m;};
 const W=.34,H=.21,D=.13,wood=std(0x4a2e1a,.6,{flatShading:true});
 part(new T.BoxGeometry(W,H,D),wood,[0,H/2,0]);
 part(new T.BoxGeometry(W+.012,.014,D+.012),std(0x2e1c10,.6),[0,H-.004,0]);// lid lip
 part(new T.BoxGeometry(W*.52,H*.72,.004),std(0x8a7a5c,.95),[-W*.2,H*.47,-D/2-.001]);// grille cloth
 for(let i=0;i<5;i++)part(new T.BoxGeometry(W*.52,.008,.006),wood,[-W*.2,H*.18+i*H*.14,-D/2-.004]);// grille slats
 part(new T.BoxGeometry(W*.3,H*.26,.006),std(0x1a1410,.5),[W*.29,H*.68,-D/2-.002]);// dial bezel
 radio.userData.dial=part(new T.PlaneGeometry(W*.26,H*.2).rotateY(Math.PI),std(0xffd9a0,.5,{emissive:0xffa447,emissiveIntensity:1.4}),[W*.29,H*.68,-D/2-.0055]);
 part(new T.BoxGeometry(.003,H*.18,.002),std(0x9a2a1a,.5),[W*.25,H*.68,-D/2-.007]);// needle
 for(const x of [.2,.38])part(new T.CylinderGeometry(.017,.019,.018,10).rotateX(Math.PI/2),std(0x201a15,.4),[W*x+W*.03,H*.26,-D/2-.009]);// knobs
 part(new T.TorusGeometry(.07,.008,5,10,Math.PI),std(0x2a2522,.5,{metalness:.4}),[0,H+.002,0]);// handle
}

// FIA flag (Altis) draped over the near edge of the bench: most of it lies flat on the table
// top under the rifle and the rest hangs down towards the operator's knees, swaying a little. The cloth is a grid
// bent over the edge on the CPU each frame; texture: fia-flag.png (supplied by the site owner).
const FLAG={x:[-.95,-.25],flat:.3,height:.40,bend:.012,cols:36,rows:26};
const flagGeo=new T.PlaneGeometry(1,1,FLAG.cols,FLAG.rows);
// flipY off turns the image 180° together with the +x mapping in drapeFlag (not a mirror image):
// the crest ends up in view and reads the right way round from above.
const flagTexture=new T.TextureLoader().load('./fia-flag.png');flagTexture.flipY=false;flagTexture.colorSpace=T.SRGBColorSpace;flagTexture.anisotropy=8;
const flagMat=new T.MeshStandardMaterial({map:flagTexture,roughness:.95,side:T.DoubleSide});
const flag=new T.Mesh(flagGeo,flagMat);flag.castShadow=flag.receiveShadow=true;flag.frustumCulled=false;scene.add(flag);
function drapeFlag(time){
 const p=flagGeo.attributes.position,uv=flagGeo.attributes.uv,width=FLAG.x[1]-FLAG.x[0],edge=TABLE.z[0],arc=FLAG.bend*Math.PI/2;
 for(let i=0;i<p.count;i++){
  const u=uv.getX(i),v=uv.getY(i),s=(1-v)*FLAG.height;// s: distance down the cloth from the top edge
  // Hoist (the black triangle) at the operator's end (+x), so the crest lies in the open patch of
  // table right of the stock where the bench shot sees it.
  let x=FLAG.x[0]+u*width,y,z;
  if(s<FLAG.flat){y=TABLE.top+.002;z=edge+FLAG.flat-s;}
  else if(s<FLAG.flat+arc){const a=(s-FLAG.flat)/FLAG.bend;y=TABLE.top+.002-FLAG.bend*(1-Math.cos(a));z=edge-FLAG.bend*Math.sin(a);}
  else{
   const h=s-FLAG.flat-arc,k=h/(FLAG.height-FLAG.flat);// 0 at the edge, 1 at the bottom hem
   y=TABLE.top+.002-FLAG.bend-h;
   // Folds from the weight of the cloth, plus a slow sway (off under reduced motion).
   const sway=reduceMotion?0:Math.sin(time*1.1+u*5)*.008*k+Math.sin(time*.7+u*11)*.003*k;
   z=edge-FLAG.bend-Math.sin(u*Math.PI*5)*.012*k-.01*k*k-sway;
   x+=reduceMotion?0:Math.sin(time*.9+v*4)*.004*k;
  }
  p.setXYZ(i,x,y,z);
 }
 p.needsUpdate=true;flagGeo.computeVertexNormals();
}
drapeFlag(0);

// ---------- Operator, leaning over the bench ----------
const op=buildOperator({...DEFAULT_OPERATOR,headgear:'none',gloves:'none',pack:'none'});
op.root.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true;});scene.add(op.root);
const LEAN={hips:.1,spine:.16,chest:.18,neck:.08,head:.42};
function pose(time){
 const breath=reduceMotion||session.actions.busy?0:Math.sin(time*1.4)*.012;
 const effort=session.open?1-session.lift:0;
 for(const [joint,x] of Object.entries(LEAN))op.joints[joint].rotation.x=x+(joint==='chest'?breath:0)+(['hips','spine','chest'].includes(joint)?effort*.065:0);
 op.joints.head.rotation.y=-.1+look.x*.12;
 for(const side of ['R','L']){op.joints['upperLeg'+side].rotation.x=-.08;op.joints['lowerLeg'+side].rotation.x=.14;}
 op.root.updateMatrixWorld(true);
}

// Shared, editable rifle and transactional bench actions.
const rifle=new T.Group();scene.add(rifle);
const session=new BenchSession({scene,holder:rifle,op,table:TABLE,sound,reduceMotion,onChange:()=>resize()});
// ---------- Look (mouse, touch, gamepad) and the working camera ----------
const look={x:0,y:0},want={x:0,y:0};
addEventListener('pointermove',e=>{want.x=e.clientX/innerWidth*2-1;want.y=e.clientY/innerHeight*2-1;});
function pollPad(){
 for(const pad of navigator.getGamepads?.()||[]){
  if(!pad)continue;
  const [x,y]=pad.axes;if(Math.hypot(x,y)>.15){want.x=x;want.y=y;}
  if(pad.buttons[0]?.pressed||pad.buttons[9]?.pressed)begin();
 }
}
function begin(){if(start.disabled||session.open)return;document.querySelector('.prompt').hidden=true;session.enter();resize();}
start.addEventListener('click',begin);
addEventListener('keydown',e=>{if(e.key==='Escape'){session.cancel();return;}if(e.target.matches('input,button,select,textarea'))return;if(e.key.toLowerCase()==='e')begin();});
addEventListener('pageshow',e=>{if(e.persisted){unsubscribe=sound.subscribe(showMusic);sound.scene('bench');showMusic();}});

const currentTarget=SHOT.target.clone();
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<780?1.25:1.75));renderer.setSize(w,h,false);camera.aspect=w/h;
 camera.fov=w/h<1?(session.open?65:60):42;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

const clock=new T.Clock();
const frameSamples=[];let nextMetric=0;
const performanceNote=new URLSearchParams(location.search).has('review')?document.createElement('output'):null;
if(performanceNote){performanceNote.id='bench-performance';performanceNote.className='bench-note';session.panel.querySelector('.bench-review').append(performanceNote);}
function frame(){
 const elapsed=clock.getDelta(),dt=Math.min(elapsed,.05),time=clock.elapsedTime;
 pollPad();
 const k=1-Math.exp(-dt*4);look.x+=(want.x-look.x)*k;look.y+=(want.y-look.y)*k;
 pose(time);session.update(time,look);
 drapeFlag(time);
 radio.userData.dial.material.emissiveIntensity=1.3+Math.random()*.15;// valve glow flicker
 if(sound.bench){const at=radio.getWorldPosition(new T.Vector3()).project(camera);sound.bench.setPan(at.x*.8);}
 const sway=reduceMotion||session.actions.busy?0:Math.sin(time*.6)*.003;
 const desired=session.open?new T.Vector3(-.28,2.14,.70).lerp(new T.Vector3(.04,2.1,.95),1-session.lift):SHOT.position.clone();
 desired.x+=look.x*.025;desired.y+=sway;
 const transition=session.open?Math.min(1,(performance.now()-session.enteredAt)/850):0;
 const blend=reduceMotion?1:transition*transition*(3-2*transition);
 camera.position.copy(session.open?SHOT.position.clone().lerp(desired,blend):desired);
 const focus=session.open?new T.Vector3(.04,.97,.49):SHOT.target;
 currentTarget.copy(session.open?SHOT.target.clone().lerp(focus,blend):focus);
 camera.lookAt(currentTarget);
 renderer.render(scene,camera);
 if(performanceNote){
  if(elapsed>0&&!document.hidden){frameSamples.push(elapsed*1000);if(frameSamples.length>180)frameSamples.shift();}
  if(time>=nextMetric&&frameSamples.length){const sorted=[...frameSamples].sort((a,b)=>a-b);performanceNote.textContent=`Recent frames · median ${sorted[Math.floor(sorted.length*.5)].toFixed(1)} ms · p95 ${sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))].toFixed(1)} ms · ${renderer.info.memory.geometries} geometries · ${renderer.info.memory.textures} textures`;nextMetric=time+.5;}
 }
 requestAnimationFrame(frame);
}

const requestedRifle=new URLSearchParams(location.hash.slice(1)).get('rifle');
session.load(MODELS[requestedRifle]?requestedRifle:DEFAULT_MODEL).then(()=>{
 status.hidden=true;start.disabled=false;begin();
 requestAnimationFrame(frame);requestAnimationFrame(()=>fade.classList.add('clear'));
}).catch(err=>{status.textContent='Could not load the rifle: '+err.message;fade.classList.add('clear');});
