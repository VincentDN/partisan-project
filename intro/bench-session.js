import {installCamo,applyFinishState} from './ak15-weapon-customiser/rifle-finishes.js';
import * as T from 'three';
import {loadRifle,applySlotState} from './ak15-weapon-customiser/rifle-instance.js';
import {MODELS,DEFAULT_MODEL} from './ak15-weapon-customiser/models.js';
import {resolveLoadout,serializeLoadout} from './ak15-weapon-customiser/loadout.js';
import {blockedBy,computeStats} from './ak15-weapon-customiser/stats.js';
import {BenchActions,FAMILIES,phase,smooth} from './bench-actions.js';
import {BenchCues} from './bench-audio-cues.js';
import {installHands,solveContact} from './bench-hands.js';
import {MOTION,motionAt} from './bench-motion.js';

const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const lerp=(a,b,t)=>a.clone().lerp(b,t);
const path=(a,b,t,height=.07)=>{const p=lerp(a,b,smooth(t));p.y+=Math.sin(Math.PI*Math.max(0,Math.min(1,t)))*height;return p;};
function visibleBox(root){root.updateMatrixWorld(true);const b=new T.Box3();root.traverseVisible(o=>{if(o.isMesh){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return b;}
function dispose(rifle){if(!rifle)return;const geometries=new Set(),materials=new Set();rifle.model.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}

export class BenchSession {
 constructor({scene,holder,op,table,sound,reduceMotion=false,onChange=()=>{}}){
  Object.assign(this,{scene,holder,op,table,sound,reduceMotion,onChange});this.open=false;this.lift=0;this.height=.93;this.loading=false;this.fast=false;this.handPose=installHands(op);this.cues=new BenchCues();this.serial=0;
  this.actions=new BenchActions({onState:busy=>{document.body.dataset.benchAction=busy?'working':'idle';this.render();if(!busy)this.sound.duck?.(false);}});
  this.panel=document.querySelector('#bench-panel');
  this.panel.innerHTML='<h2>Advanced animations test</h2><p class="bench-note">Inspect the rifle, then choose a part to fit.</p><div id="bench-rifles" class="bench-buttons"></div><div class="bench-buttons"><button id="bench-inspect">Lift to inspect</button><button id="bench-viewer">Open full customiser</button></div><label class="bench-check"><input id="bench-fast" type="checkbox"> Quick changes</label><label class="bench-check"><input id="bench-sound" type="checkbox" checked> Handling sounds</label><label>Handling level <input id="bench-level" aria-label="Handling volume" type="range" min="0" max="100" value="55"></label><div id="bench-summary"></div><p id="bench-message" role="status" aria-live="polite">Ready.</p><div id="bench-action-controls" class="bench-buttons" hidden><button id="bench-skip">Skip animation</button><button id="bench-cancel">Cancel</button></div><div id="bench-slots"></div><div class="bench-buttons"><button id="bench-copy">Copy build link</button><button id="bench-reset">Reset build</button></div><p class="bench-note">Illustrative game models by D_U, CC BY 4.0. <a href="./ak15-weapon-customiser/" target="_self">Full customiser &amp; credits</a></p>';
  this.$=id=>this.panel.querySelector('#'+id);
  // Optional authoring controls: deterministic stills without changing saved builds.
  if(new URLSearchParams(location.search).has('review')){
   const review=document.createElement('div');review.className='bench-review';
   review.innerHTML='<label>Animation checkpoint <select id="bench-checkpoint"><option value="">Play through</option><option value=".30">Reach · 30%</option><option value=".38">Release · 38%</option><option value=".50">On table · 50%</option><option value=".70">Seat · 70%</option><option value=".82">Recover · 82%</option></select></label><button id="bench-resume" disabled>Resume animation</button>';
   this.$('bench-action-controls').before(review);
   const metrics=document.createElement('output');metrics.id='bench-contact';metrics.className='bench-note';review.append(metrics);
   this.$('bench-checkpoint').onchange=e=>this.checkpoint=e.target.value===''?undefined:Number(e.target.value);
   this.$('bench-resume').onclick=()=>this.actions.resume();
  }
  this.$('bench-inspect').onclick=()=>this.inspect();
  this.$('bench-fast').onchange=e=>this.fast=e.target.checked;
  this.$('bench-sound').onchange=e=>this.cues.setMuted(!e.target.checked);
  this.$('bench-level').oninput=e=>{this.cues.level=Number(e.target.value)/100;if(!this.cues.level)this.cues.stop();};
  this.$('bench-skip').onclick=()=>{this.actions.skip();this.message('Change completed.');};
  this.$('bench-cancel').onclick=()=>this.cancel();
  this.$('bench-viewer').onclick=()=>{this.actions.cancel();location.href='../workbench/'+location.hash;};
  this.$('bench-reset').onclick=()=>{this.actions.cancel();const p=new URLSearchParams(location.hash.slice(1));for(const id of Object.keys(this.rifle.slots))p.delete(id);for(const key of [...p.keys()])if(key.endsWith('-finish')||key==='wear')p.delete(key);this.load(this.rifle.id,'#'+p.toString());};
  this.$('bench-copy').onclick=async()=>{const url=new URL(location.href);url.pathname=url.pathname.replace(/(?:bench|advanced)\.html$/,'');url.search='?view=advanced';try{await navigator.clipboard.writeText(url.href);this.message('Build link copied.');}catch{this.message('Copy the page address to share this build.');}};
  addEventListener('pagehide',()=>{this.actions.cancel();this.cues.stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.actions.cancel();this.cues.stop();}});
  addEventListener('hashchange',()=>{this.actions.cancel();const id=new URLSearchParams(location.hash.slice(1)).get('rifle');this.load(MODELS[id]?id:DEFAULT_MODEL,location.hash);});
 }
 message(text){this.$('bench-message').textContent=text;}
 cancel(){const committed=this.actions.current?.committed;if(!this.actions.busy)return;this.actions.cancel();this.message(committed?'Change kept; returned to inspection.':'Change cancelled.');}
 settleHeight(){
  const position=this.holder.position.clone(),rotation=this.holder.quaternion.clone();
  this.holder.position.set(0,0,0);this.holder.quaternion.identity();this.holder.updateMatrixWorld(true);
  this.height=this.table.top-visibleBox(this.mount).min.y+.007;
  this.holder.position.copy(position);this.holder.quaternion.copy(rotation);this.holder.updateMatrixWorld(true);
 }
 async load(id=DEFAULT_MODEL,hash=location.hash){
  this.actions.cancel();this.loading=true;this.render();const token=++this.serial;
  try{
   const params=new URLSearchParams(hash.slice(1)),wear={value:Math.max(0,Math.min(100,Number(params.get('wear'))||0))/100};
   const next=await loadRifle(id,{decorate:model=>installCamo(model,wear)});if(token!==this.serial){dispose(next);return;}
   const state=resolveLoadout(next,hash);for(const key of Object.keys(next.slots))applySlotState(next,key,state.build[key],state.offsets[key]);
   // Bench attachments are unpowered. Beam geometry must never recenter the rifle.
   next.model.traverse(o=>{if(o.isLight||o.userData.visualEffect)o.visible=false;});
   for(const target of next.finishTargets)applyFinishState(next,target.id,params.get(target.id+'-finish')??next.config.defaults?.finish?.[target.id]??'original');
   const old=this.rifle;this.holder.clear();this.rifle=next;this.mount=new T.Group();this.mount.add(next.model);this.mount.rotation.x=Math.PI/2;
   const box=visibleBox(this.mount),center=box.getCenter(v());this.mount.position.sub(center);this.height=this.table.top+(box.max.y-box.min.y)/2+.007;this.holder.add(this.mount);dispose(old);
   this.loading=false;this.baseHash=hash;this.persist();this.render();this.message('Ready — '+next.config.label+'.');this.onChange();
  }catch(error){if(token!==this.serial)return;this.loading=false;this.render();this.message('Could not load that rifle. Your previous build is preserved.');if(!this.rifle)throw error;}
 }
 persist(){const hash=serializeLoadout(this.rifle,this.baseHash||location.hash);this.baseHash=hash;history.replaceState(null,'',location.pathname+location.search+hash);document.body.dataset.benchBuild=JSON.stringify(this.rifle.build);this.panel.querySelector('a').href='./ak15-weapon-customiser/'+hash;}
 enter(){this.open=true;this.enteredAt=performance.now();document.body.classList.add('bench-open');this.panel.hidden=false;this.cues.prepare();this.inspect();this.onChange();}
 inspect(){
  if(this.actions.busy||this.loading||!this.rifle)return;
  const from=this.lift,to=from>.5?0:1,duration=this.reduceMotion?.01:.85;
  this.actions.start({duration,commitAt:duration,update:u=>this.lift=from+(to-from)*smooth(u),commit:()=>{},events:[{at:duration*.75,transient:true,run:()=>this.cues.play(to?'handle':'hit',{gain:.5})}],cleanup:(reason)=>{this.lift=reason==='cancel'?from:to;this.cues.stop();this.render();}});
 }
 render(){
  if(!this.$)return;const busy=this.actions.busy||this.loading;
  this.$('bench-action-controls').hidden=!this.actions.busy;
  if(this.$('bench-resume'))this.$('bench-resume').disabled=!this.actions.current?.paused;
  this.$('bench-inspect').textContent=this.lift>.5?'Set down':'Lift to inspect';
  for(const id of ['bench-inspect','bench-viewer','bench-reset','bench-copy'])this.$(id).disabled=busy;
  this.$('bench-rifles').replaceChildren(...Object.entries(MODELS).map(([id,c])=>{const b=document.createElement('button');b.textContent=c.label;b.dataset.rifle=id;b.disabled=busy;b.setAttribute('aria-pressed',String(id===this.rifle?.id));b.onclick=()=>this.load(id,this.baseHash);return b;}));
  if(!this.rifle)return;
  const options=Object.fromEntries(Object.entries(this.rifle.slots).map(([id,s])=>[id,s.options.find(o=>o.id===this.rifle.build[id])])),grams=this.rifle.config.baseGrams+Object.values(options).reduce((n,o)=>n+(o.grams||0),0),stats=computeStats(this.rifle.config.stats,options);
  this.$('bench-summary').textContent=`${(grams/1000).toFixed(2)} kg · ${stats.rounds} rounds · Handling ${stats.handling}`;
  this.$('bench-slots').replaceChildren(...Object.entries(this.rifle.slots).map(([id,slot])=>{
   const row=document.createElement('section'),h=document.createElement('h3');h.textContent=slot.spec.label;row.append(h);const choices=document.createElement('div');choices.className='bench-buttons';
   for(const option of slot.options){const b=document.createElement('button');b.textContent=option.label;b.dataset.slot=id;b.dataset.option=option.id;const rule=blockedBy(this.rifle.build,id,option.id);b.disabled=busy||!!rule;b.title=rule?.reason||option.detail||option.label;b.setAttribute('aria-pressed',String(this.rifle.build[id]===option.id));b.onclick=()=>this.change(id,option.id);choices.append(b);}
   row.append(choices);
   if(slot.rail){const stepper=document.createElement('div');stepper.className='bench-buttons';for(const sign of [-1,1]){const b=document.createElement('button');b.textContent=sign<0?'− 10 mm':'+ 10 mm';b.setAttribute('aria-label',`${slot.spec.label}: ${sign<0?'back':'forward'} one rail slot`);b.disabled=busy||(sign<0?slot.offset<=slot.rail.min:slot.offset>=slot.rail.max);b.onclick=()=>this.change(id,this.rifle.build[id],slot.offset+sign*slot.rail.step);stepper.append(b);}const label=document.createElement('span');label.textContent=Math.round(slot.offset*1000)+' mm';stepper.append(label);row.append(stepper);}
   return row;
  }));
  if(!busy&&this.returnFocus){const key=this.returnFocus;this.returnFocus=null;this.$('bench-slots').querySelector(`[data-slot="${key.slot}"][data-option="${key.option}"]`)?.focus({preventScroll:true});}

 }
 change(id,optionId,offset){
  if(this.loading||this.actions.busy)return;const slot=this.rifle.slots[id],old=slot.options.find(o=>o.id===this.rifle.build[id]),next=slot.options.find(o=>o.id===optionId);
  if(!next||blockedBy(this.rifle.build,id,optionId)||(old===next&&(offset===undefined||offset===slot.offset)))return;
  const family=FAMILIES[id]||FAMILIES.optic,duration=this.fast?1.25:family.duration;
  this.cues.prepare();this.sound.duck?.(true);this.message(family.label+'…');
  this.returnFocus={slot:id,option:optionId};
  const oldOffset=slot.offset,fromLift=this.lift;
  // Snapshot each presentation before any permanent mutation. Clones share immutable resources.
  const snapshot=()=>{this.holder.updateMatrixWorld(true);const c=slot.container.clone(true);slot.container.matrixWorld.decompose(c.position,c.quaternion,c.scale);return c;};
  const outgoing=snapshot();applySlotState(this.rifle,id,optionId,offset);const incoming=snapshot();
  const finalOriginal={position:slot.original.position.clone(),rotationY:slot.original.rotation.y,nodes:[...slot.home.keys()].map(n=>n.position.clone()),container:slot.container.position.clone()};
  applySlotState(this.rifle,id,old.id,oldOffset);
  const initialOriginal={position:slot.original.position.clone(),rotationY:slot.original.rotation.y,nodes:[...slot.home.keys()].map(n=>n.position.clone()),container:slot.container.position.clone()};
  const inPlace=old.original&&next.original||offset!==undefined;
  outgoing.visible=incoming.visible=false;this.scene.add(outgoing,incoming);
  const context={id,slot,outgoing,incoming,inPlace,u:0,fromLift,old,next,workSide:['muzzle','foregrip','side'].includes(id)?'L':'R',hasOld:!!(old.original||old.object),hasNext:!!(next.original||next.object)};this.active=context;
  const cue=(at,kind,gain=.6)=>({at:at*duration,transient:true,run:()=>this.cues.play(kind,{gain})});
  this.actions.start({duration,commitAt:duration*.74,pauseAt:this.checkpoint===undefined?undefined:duration*this.checkpoint,
   update:u=>{context.u=u;this.lift=fromLift*(1-phase(u,0,.2))+phase(u,.82,1);
    if(inPlace){const t=phase(u,.32,.74);slot.original.position.lerpVectors(initialOriginal.position,finalOriginal.position,t);slot.original.rotation.y=initialOriginal.rotationY+(finalOriginal.rotationY-initialOriginal.rotationY)*t;slot.container.position.lerpVectors(initialOriginal.container,finalOriginal.container,t);[...slot.home.keys()].forEach((n,i)=>n.position.lerpVectors(initialOriginal.nodes[i],finalOriginal.nodes[i],t));}
   },
   commit:()=>{applySlotState(this.rifle,id,optionId,offset);this.persist();},
   events:[cue(.18,'hit',fromLift?.45:.15),cue(.34,'click'),...(!inPlace&&context.hasOld?[cue(.5,'hit',.4)]:[]),cue(.64,inPlace?'slide':'handle'),cue(.74,'clunk')],
   cleanup:(reason,committed)=>{if(!committed)applySlotState(this.rifle,id,old.id,oldOffset);slot.container.visible=true;outgoing.removeFromParent();incoming.removeFromParent();this.active=null;this.settleHeight();this.lift=1;this.cues.stop();this.persist();if(reason==='complete')this.message(next.label+' fitted.');}
  });
  if(this.reduceMotion)this.actions.skip();
 }
 update(time,look){
  this.actions.tick();if(!this.rifle)return;
  const a=this.active;
  const tilt=(this.open?this.lift*.17:look.y*.04);
  this.holder.position.set(.04,this.height+this.lift*.11,.47-this.lift*.025);
  if(a)this.holder.position.x+=(MOTION[a.id]?.shift||0)*phase(a.u,0,.2)*(1-phase(a.u,.82,1));
  this.holder.rotation.set(tilt,-.22+(a?0:look.x*.055),this.lift*-.025,'YXZ');this.holder.updateMatrixWorld(true);
  const contact=id=>this.rifle.slots[id].container.getWorldPosition(v());
  const grip=contact('grip').add(v(0,.026,0)),support=contact('foregrip').add(v(0,.027,0));
  const workSide=a?.workSide||'R',rest=workSide==='R'?grip:support;
  let working=rest.clone();
  if(a){
   const u=a.u,at=a.slot.container.getWorldPosition(v()),profile=MOTION[a.id]||MOTION.optic,m=motionAt(u,a);
   const clearance=v(...profile.clear).transformDirection(this.rifle.model.matrixWorld).multiplyScalar(v(...profile.clear).length());
   // Lift clear of the tabletop even when the authored local direction points down.
   clearance.y=Math.max(.055,clearance.y);const clear=at.clone().add(clearance);
   const side=workSide==='R'?-1:1,tray=v(side*.22,this.table.top,.30),incomingTray=v(side*.42,this.table.top,.34);
   a.slot.container.getWorldQuaternion(a.outgoing.quaternion);a.incoming.quaternion.copy(a.outgoing.quaternion);
   // Rest each part on its own visible bounds, including folded/oversized options.
   const ground=(object,present,anchor)=>{if(!present)return;object.visible=true;object.position.set(0,0,0);const box=visibleBox(object);if(!box.isEmpty())anchor.y+=.004-box.min.y;};
   ground(a.outgoing,a.hasOld,tray);ground(a.incoming,a.hasNext,incomingTray);
   a.outgoing.position.copy(u<.40?lerp(at,clear,m.extract):path(clear,tray,m.deposit,profile.arc));
   a.incoming.position.copy(u<.66?path(incomingTray,clear,m.pickup,profile.arc):lerp(clear,at,m.seat));
   a.outgoing.visible=m.oldVisible;a.incoming.visible=m.nextVisible;
   a.slot.container.visible=m.mountedVisible;
   const touch=at.clone().add(v(0,.04,0));
   if(u<.34)working.copy(path(rest,touch,phase(u,.2,.34),.035));
   else if(u<.5)working.copy(a.inPlace||!a.hasOld?touch:a.outgoing.position.clone().add(v(0,.04,0)));
   else if(u<.56)working.copy(path(a.hasOld&&!a.inPlace?tray:touch,a.hasNext&&!a.inPlace?incomingTray:touch,phase(u,.5,.56),.04)).y+=.04;
   else if(u<.74)working.copy(a.inPlace||!a.hasNext?touch:a.incoming.position.clone().add(v(0,.04,0)));
   else working.copy(path(touch,rest,phase(u,.76,.90),.035));
  }
  const orientation=this.rifle.model.getWorldQuaternion(new T.Quaternion());
  const right=orientation.clone().multiply(new T.Quaternion().setFromAxisAngle(v(0,0,1),-Math.PI/2));
  const left=orientation.clone().multiply(new T.Quaternion().setFromAxisAngle(v(0,0,1),Math.PI/2));
  const rightError=solveContact(this.op,'R',workSide==='R'?working:grip,right,v(-1,-.3,-.5)),leftError=solveContact(this.op,'L',workSide==='L'?working:support,left,v(1,-.4,-.4));
  if(this.$('bench-contact'))this.$('bench-contact').textContent=`Palm target error · R ${Math.round(rightError*1000)} mm · L ${Math.round(leftError*1000)} mm`;
  for(const side of ['R','L']){const active=a&&side===workSide;this.handPose(side,active&&a.u>.22&&a.u<.8?.45:.65,active?(MOTION[a.id]?.pinch??0):0);}
  document.body.dataset.benchProgress=a?a.u.toFixed(3):'0';
 }
}
