import {audio} from './ak15-weapon-customiser/sfx.js';
// Contact-sized, cancellable voices. Existing mech.js remains the viewer's compatibility API.
export class BenchCues {
 constructor(){this.voices=new Set();this.buffers={};this.level=.55;this.muted=false;this.last={};}
 async prepare(){
  // Resume synchronously inside the user's gesture, before the first fetch.
  const {ctx}=audio();
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   const base=new URL('../assets/audio/foley/',import.meta.url);
   const r=await fetch(new URL('manifest.json',base));if(!r.ok)throw Error('No cue manifest');
   const list=await r.json();
   // A small action bank; the viewer's complete manifest stays untouched.
   await Promise.all(['click','clunk','slide','hit','handle'].map(async key=>{
    const files=Array.isArray(list[key])?list[key].slice(0,3):[];
    this.buffers[key]=(await Promise.all(files.map(async f=>{try{const r=await fetch(new URL(key+'/'+f,base));if(!r.ok)return null;return await ctx.decodeAudioData(await r.arrayBuffer());}catch{return null;}}))).filter(Boolean);
   }));
  })().catch(()=>{});return this.loading;
 }
 play(kind,{gain=1,pan=0}={}){
  if(this.muted||this.level===0||document.hidden)return;
  const {ctx,out,noise}=audio();if(ctx.state!=='running')return;
  const t=ctx.currentTime+.008,list=this.buffers[kind]||[];
  let source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain(),panner=ctx.createStereoPanner();
  panner.pan.value=Math.max(-.75,Math.min(.75,pan));
  let duration;
  if(list.length){let pick=((this.last[kind]??-1)+1)%list.length;this.last[kind]=pick;source.buffer=list[pick];duration=Math.min(source.buffer.duration,kind==='slide'?.32:.22);filter.type='lowpass';filter.frequency.value=8500;}
  else{source.buffer=noise;duration=kind==='slide'?.2:.09;filter.type='bandpass';filter.frequency.value={hit:320,clunk:700,click:2400,handle:800,ratchet:1800,slide:1400}[kind]||1000;filter.Q.value=.8;}
  amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(this.level*gain*.65,t+.004);amp.gain.setValueAtTime(this.level*gain*.65,t+Math.max(.005,duration-.025));amp.gain.linearRampToValueAtTime(0,t+duration);
  source.connect(filter).connect(amp).connect(panner).connect(out);
  const voice={source,amp};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();filter.disconnect();amp.disconnect();panner.disconnect();};
  source.start(t);source.stop(t+duration+.01);return voice;
 }
 stop(){for(const v of this.voices){try{v.source.stop();}catch{}}this.voices.clear();}
 setMuted(value){this.muted=value;if(value)this.stop();}
}
