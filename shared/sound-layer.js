// One sound layer for every PARP module: the music player (music.js) plus the shared on/off,
// volume and track preference. Modules share one preference key, so the choice carries between
// the index, the Workbench and the Operator Customiser.
//
//   const sound = soundLayer();       // same object for every caller on a page
//   sound.start(1.5); sound.stop(); sound.setVolume(0.4); sound.setTrack('duce');
//   sound.subscribe(fn)               // called when another control changes the preference
import {Music,TRACKS} from './music.js';

// v4: PARP v0.3. The v3 key is read once so existing volume/on-off choices carry over.
const KEY='parp-music-v4',OLD_KEY='ak-customiser-music-v3';
function loadPrefs(){
 const base={on:true,volume:.36,track:TRACKS[0].id};
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null')||JSON.parse(localStorage.getItem(OLD_KEY)||'null');
  return saved?{...base,...saved}:base;
 }catch{return base;}
}

function createLayer(){
 const prefs=loadPrefs();
 if(!TRACKS.some(t=>t.id===prefs.track))prefs.track=TRACKS[0].id;
 const music=new Music();
 music.setVolume(prefs.volume);music.setTrack(prefs.track);
 const listeners=new Set();
 return {
  music,prefs,TRACKS,
  save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch{}},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  changed(){for(const fn of listeners)try{fn();}catch{listeners.delete(fn);}},
  // Resolves true once sound is running; false while the browser still blocks autoplay.
  start(fade=1.5){return music.start(fade);},
  stop(){music.stop();},
  setVolume(v){prefs.volume=v;music.setVolume(v);},
  setTrack(id){prefs.track=id;music.setTrack(id);}
 };
}

export function soundLayer(){
 window.parpSound??=createLayer();
 return window.parpSound;
}
