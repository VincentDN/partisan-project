// Handling stats and compatibility rules. Pure data and functions: no Three.js, no DOM.
// All values are illustrative game-design numbers on a 0–100 scale, not real-world data.

// `better` says which direction is good, so deltas can be coloured correctly.
export const STATS=[
 {id:'ergo',label:'Ergonomics',better:'high',hint:'How comfortably it handles and points.'},
 {id:'recoil',label:'Recoil',better:'low',hint:'Muzzle climb and kick per shot.'},
 {id:'handling',label:'Handling',better:'high',hint:'Speed to raise, turn and aim.'},
 {id:'loud',label:'Loudness',better:'low',hint:'How far the shot carries.'},
 {id:'sighting',label:'Sighting range',better:'high',hint:'Distance you can aim precisely with the sight fitted.'}
];

// Modifiers per slot and option id, added to the rifle's base stats. `rounds` sets capacity.
// Option ids are shared across rifles; a rifle's option can override `rounds` (models.js).
export const MODIFIERS={
 muzzle:{
  dtk1:{recoil:-12,loud:8},brake:{recoil:-8},ak74:{recoil:-8},comp:{recoil:-10,loud:5},
  can:{recoil:-6,loud:-45,handling:-10,ergo:-3},bare:{recoil:6,loud:4}
 },
 optic:{
  reddot:{sighting:22,handling:-2},micro:{sighting:18,handling:-1},holo:{sighting:26,handling:-4},
  scope:{sighting:55,handling:-12,ergo:-4},none:{}
 },
 foregrip:{
  rk1:{ergo:6,recoil:-4},vertical:{ergo:5,recoil:-5},angled:{ergo:7,recoil:-3,handling:2},stop:{ergo:3,handling:2},none:{}
 },
 side:{light:{handling:-2,ergo:-1},laser:{ergo:3,handling:-1},combo:{ergo:2,handling:-4},none:{}},
 magazine:{
  '30':{rounds:30},'45':{rounds:45,handling:-3,ergo:-2},'60':{rounds:60,handling:-6,ergo:-4},
  drum:{rounds:95,handling:-12,ergo:-8},none:{rounds:0,handling:2}
 },
 grip:{rk9:{ergo:6},factory:{ergo:4},classic:{}},
 stock:{
  extended:{},collapsed:{recoil:3,handling:6},folded:{recoil:18,handling:14,ergo:-6},none:{recoil:25,handling:16,ergo:-10}
 }
};

// Compatibility rules: while `when` is fitted, the listed options are blocked (and vice versa).
// Blocked options stay visible in the Build panel with the reason.
export const RULES=[
 {when:{magazine:'drum'},block:{stock:['folded']},reason:'The folded stock would lie against the drum.'},
 {when:{magazine:'60'},block:{stock:['folded']},reason:'The quad-stack is too wide for the stock to fold past it.'},
 {when:{optic:'scope'},block:{stock:['folded','none']},reason:'A 4× scope needs a shouldered stock to hold eye relief.'},
 {when:{foregrip:'angled'},block:{magazine:['drum']},reason:'The drum sits where the support hand wraps the angled grip.'}
];

const clamp=v=>Math.max(0,Math.min(100,v));
// options: {slotId: option object (merged, may carry rounds/stats overrides)}.
export function computeStats(base,options){
 const out={...base,rounds:0};
 for(const [slot,option] of Object.entries(options)){
  if(!option)continue;
  const mods={...MODIFIERS[slot]?.[option.id],...(option.rounds!==undefined?{rounds:option.rounds}:{})};
  for(const [k,v] of Object.entries(mods))out[k]=k==='rounds'?v:(out[k]??0)+v;
 }
 for(const s of STATS)out[s.id]=clamp(Math.round(out[s.id]??0));
 return out;
}

// The rule (if any) that stops `optionId` going into `slotId` alongside the rest of `build`.
export function blockedBy(build,slotId,optionId){
 for(const rule of RULES){
  const [[whenSlot,whenId]]=Object.entries(rule.when);
  // Forward: something fitted blocks this option.
  if(whenSlot!==slotId&&build[whenSlot]===whenId&&rule.block[slotId]?.includes(optionId))return rule;
  // Reverse: this option is the trigger and something fitted is on its block list.
  if(whenSlot===slotId&&whenId===optionId&&Object.entries(rule.block).some(([s,ids])=>s!==slotId&&ids.includes(build[s])))return rule;
 }
 return null;
}
