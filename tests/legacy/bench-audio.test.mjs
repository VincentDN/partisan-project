import test from 'node:test';
import assert from 'node:assert/strict';

const sources=[],order=[];
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){}});
const node=()=>({connect(){return this;},disconnect(){this.disconnected=true;}});
class AudioContextStub {
 constructor(){this.currentTime=5;this.sampleRate=100;this.state='running';this.destination=node();}
 resume(){order.push('resume');return Promise.resolve();}
 createDynamicsCompressor(){return {...node(),threshold:param(),ratio:param()};}
 createGain(){return {...node(),gain:param()};}
 createBuffer(){return {duration:2,getChannelData:()=>new Float32Array(200)};}
 createBiquadFilter(){return {...node(),frequency:param(),Q:param()};}
 createStereoPanner(){return {...node(),pan:param()};}
 createBufferSource(){const s={...node(),stops:[],start(at){this.started=at;},stop(at){this.stops.push(at);}};sources.push(s);return s;}
 async decodeAudioData(bytes){if(bytes==='bad')throw Error('bad sample');return {duration:.4};}
}
globalThis.AudioContext=AudioContextStub;
globalThis.document={hidden:false};
const {BenchCues}=await import('../../intro/bench-audio-cues.js');

test('first gesture resumes before network; failed bank still plays a cancellable synth',async()=>{
 globalThis.fetch=async()=>{order.push('fetch');throw Error('offline');};
 const cues=new BenchCues();await cues.prepare();assert.deepEqual(order.slice(0,2),['resume','fetch']);
 const voice=cues.play('click');assert.ok(voice);assert.ok(voice.source.started>=5);
 cues.stop();assert.equal(cues.voices.size,0);assert.equal(voice.source.stops.at(-1),undefined);
 voice.source.onended();assert.equal(voice.source.disconnected,true);
});

test('muting stops active voices and hidden/zero-volume actions stay silent',()=>{
 const cues=new BenchCues(),voice=cues.play('hit');assert.ok(voice);
 cues.setMuted(true);assert.equal(cues.voices.size,0);
 const count=sources.length;assert.equal(cues.play('hit'),undefined);
 cues.setMuted(false);document.hidden=true;assert.equal(cues.play('hit'),undefined);
 document.hidden=false;cues.level=0;assert.equal(cues.play('hit'),undefined);assert.equal(sources.length,count);
});

test('partial sample failures preserve the usable takes and loading is bounded',async()=>{
 const requests=[];
 globalThis.fetch=async url=>{
  requests.push(String(url));
  if(String(url).endsWith('manifest.json'))return {ok:true,json:async()=>({click:['one.wav','bad.wav','two.wav','unused.wav']})};
  return {ok:true,arrayBuffer:async()=>String(url).includes('bad.wav')?'bad':'good'};
 };
 const cues=new BenchCues();await cues.prepare();assert.equal(cues.buffers.click.length,2);
 assert.equal(requests.some(url=>url.includes('unused.wav')),false);
 const first=cues.play('click'),second=cues.play('click');assert.notEqual(first.source.buffer,second.source.buffer);
 cues.stop();
});
