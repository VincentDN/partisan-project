// Deterministic action lifetime; no renderer or audio dependency.
export class BenchActions {
 constructor({now=()=>performance.now()/1000,onState=()=>{}}={}){this.now=now;this.onState=onState;this.current=null;this.serial=0;}
 get busy(){return !!this.current;}
 start(spec){
  if(this.busy)return false;
  if(!(spec.duration>0))throw new Error('An action needs a positive duration');
  this.current={...spec,id:++this.serial,start:this.now(),elapsed:0,committed:false,seen:new Set()};
  this.onState(true);this.tick();return true;
 }
 tick(){
  const a=this.current;if(!a)return;
  if(a.paused)return;
  let t=Math.max(a.elapsed,Math.min(a.duration,this.now()-a.start));
  const pause=Number.isFinite(a.pauseAt)&&t>=a.pauseAt;
  if(pause)t=Math.max(a.elapsed,Math.min(a.duration,a.pauseAt));a.elapsed=t;
  a.update?.(t/a.duration,a);
  for(const [i,event] of (a.events||[]).entries())if(t>=event.at&&!a.seen.has(i)){
   a.seen.add(i);
   // Never replay a pile of obsolete sound cues after a stalled/hidden frame.
   if(!event.transient||t-event.at<.16)event.run(a);
  }
  if(!a.committed&&t>=a.commitAt){a.commit?.();a.committed=true;}
  if(t>=a.duration)this.finish('complete');
  else if(pause){a.paused=true;this.onState(true);}
 }
 resume(){const a=this.current;if(!a?.paused)return;a.start=this.now()-a.elapsed;a.pauseAt=undefined;a.paused=false;this.onState(true);}
 finish(reason){const a=this.current;if(!a)return;this.current=null;a.cleanup?.(reason,a.committed);this.onState(false);}
 skip(){const a=this.current;if(!a)return;if(!a.committed){a.commit?.();a.committed=true;}a.update?.(1,a);this.finish('skip');}
 cancel(){this.finish('cancel');}
}
export const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const phase=(t,a,b)=>smooth((t-a)/(b-a));

// Families express presentation, not real maintenance procedures.
export const FAMILIES={
 optic:{label:'Fitting optic',duration:4.2,lift:.10},side:{label:'Fitting side attachment',duration:4.0,lift:.10},
 foregrip:{label:'Fitting foregrip',duration:4.4,lift:.14},magazine:{label:'Changing magazine',duration:3.8,lift:.14},
 muzzle:{label:'Fitting muzzle attachment',duration:4.6,lift:.08},grip:{label:'Changing grip',duration:4.5,lift:.12},
 stock:{label:'Adjusting stock',duration:3.8,lift:.08}
};
