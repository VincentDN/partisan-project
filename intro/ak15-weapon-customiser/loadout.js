import {blockedBy} from './stats.js';
export const defaultOption=(rifle,slot)=>{
 const id=rifle.config.defaults?.build?.[slot.spec.id];return slot.options.some(o=>o.id===id)?id:slot.options[0].id;
};
export function resolveLoadout(rifle,hash=''){
 const params=new URLSearchParams(hash.replace(/^#/,'')),build={},offsets={};
 for(const [id,slot] of Object.entries(rifle.slots)){
  const [choice,mm]=String(params.get(id)||'').split('@');
  build[id]=slot.options.some(o=>o.id===choice)?choice:defaultOption(rifle,slot);
  const n=Number(mm)/1000;
  offsets[id]=slot.rail&&Number.isFinite(n)?Math.min(slot.rail.max,Math.max(slot.rail.min,Math.round(n/slot.rail.step)*slot.rail.step)):0;
 }
 for(const [id,slot] of Object.entries(rifle.slots))if(blockedBy(build,id,build[id])){
  build[id]=[defaultOption(rifle,slot),...slot.options.map(o=>o.id)].find(o=>!blockedBy(build,id,o))||slot.options[0].id;
 }
 return {build,offsets};
}
export function serializeLoadout(rifle,baseHash=''){
 const p=new URLSearchParams(baseHash.replace(/^#/,''));p.set('rifle',rifle.id);
 for(const [id,slot] of Object.entries(rifle.slots)){
  if(rifle.build[id]===defaultOption(rifle,slot)&&!slot.offset)p.delete(id);
  else p.set(id,rifle.build[id]+(slot.offset?'@'+Math.round(slot.offset*1000):''));
 }
 return '#'+p.toString().replace(/%40/g,'@');
}
