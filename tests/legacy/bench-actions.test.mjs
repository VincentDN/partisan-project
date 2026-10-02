import test from 'node:test';
import assert from 'node:assert/strict';
import {BenchActions} from '../../intro/bench-actions.js';
import {resolveLoadout,serializeLoadout} from '../../intro/ak15-weapon-customiser/loadout.js';
import {motionAt} from '../../intro/bench-motion.js';
test('commit once on a late frame, suppress stale audio, preserve final state',()=>{
 let t=0,commits=0,sounds=0,cleanups=0;const controller=new BenchActions({now:()=>t});
 controller.start({duration:4,commitAt:3,commit:()=>commits++,events:[{at:1,transient:true,run:()=>sounds++}],cleanup:()=>cleanups++});
 t=4;controller.tick();controller.tick();assert.equal(commits,1);assert.equal(sounds,0);assert.equal(cleanups,1);assert.equal(controller.busy,false);
});
test('skip commits without sound; precommit cancellation rolls back; postcommit cancellation keeps result',()=>{
 let t=0,value='old',clean=[];const c=new BenchActions({now:()=>t});
 const spec=()=>({duration:4,commitAt:3,commit:()=>value='new',cleanup:(why,committed)=>{clean.push([why,committed]);if(!committed)value='old';}});
 c.start(spec());c.cancel();assert.equal(value,'old');assert.deepEqual(clean.at(-1),['cancel',false]);
 c.start(spec());c.skip();assert.equal(value,'new');assert.deepEqual(clean.at(-1),['skip',true]);
 value='old';c.start(spec());t=3.2;c.tick();c.cancel();assert.equal(value,'new');assert.deepEqual(clean.at(-1),['cancel',true]);
});
test('conflicting starts rejected; backwards clock never rewinds progress',()=>{
 let t=5,u=0;const c=new BenchActions({now:()=>t});c.start({duration:4,commitAt:3,update:p=>u=p});
 assert.equal(c.start({duration:1}),false);t=7;c.tick();assert.equal(u,.5);t=6;c.tick();assert.equal(u,.5);
});
const rifle={id:'ak74m',config:{defaults:{build:{optic:'none'}}},build:{optic:'scope'},slots:{optic:{spec:{id:'optic'},options:[{id:'none'},{id:'scope'}],rail:{min:-.06,max:.04,step:.01},offset:.02}}};
test('loadout clamps malformed offsets and round trips build without dropping unrelated settings',()=>{
 const hash=serializeLoadout(rifle,'#o.height=1.8&wear=70&stock-finish=fde');
 assert.match(hash,/o.height=1.8/);assert.match(hash,/wear=70/);assert.match(hash,/optic=scope@20/);
 assert.deepEqual(resolveLoadout(rifle,hash),{build:{optic:'scope'},offsets:{optic:.02}});
 assert.equal(resolveLoadout(rifle,'#optic=scope@NaN').offsets.optic,0);
 assert.equal(resolveLoadout(rifle,'#optic=scope@10000').offsets.optic,.04);
 assert.equal(resolveLoadout(rifle,'#optic=unknown').build.optic,'none');
});
test('part presentation exchanges mounted and carried geometry without a duplicate seating frame',()=>{
 for(const u of [.34,.4,.5,.56,.66,.739])assert.equal(motionAt(u).mountedVisible,false);
 const seated=motionAt(.74);assert.equal(seated.mountedVisible,true);assert.equal(seated.nextVisible,false);
 assert.equal(motionAt(.5,{hasOld:false}).oldVisible,false);
 assert.equal(motionAt(.6,{hasNext:false}).nextVisible,false);
 for(const u of [0,.34,.5,.7,1]){const m=motionAt(u,{inPlace:true});assert.equal(m.mountedVisible,true);assert.equal(m.oldVisible||m.nextVisible,false);}
});
test('transfer segment endpoints meet without jumping at the clearance waypoint',()=>{
 assert.equal(motionAt(.4).extract,1);assert.equal(motionAt(.4).deposit,0);
 assert.equal(motionAt(.66).pickup,1);assert.equal(motionAt(.66).seat,0);
 assert.equal(motionAt(.74).seat,1);
});
test('review checkpoints freeze at the requested beat and resume without counting paused time',()=>{
 let t=0,u=0,commits=0;const c=new BenchActions({now:()=>t});
 c.start({duration:4,commitAt:3,pauseAt:2,update:value=>u=value,commit:()=>commits++});
 t=2.8;c.tick();assert.equal(u,.5);assert.equal(c.current.paused,true);
 t=20;c.tick();assert.equal(u,.5);assert.equal(commits,0);
 c.resume();t=21;c.tick();assert.equal(u,.75);assert.equal(commits,1);
 t=22;c.tick();assert.equal(c.busy,false);assert.equal(commits,1);
});
