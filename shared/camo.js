// Shared camo patterns: generated blob textures used for weapon finishes (workbench) and, later,
// operator fabrics, so weapon and clothing camo always match. Original, generated in code.
import * as T from 'three';

// Solid fabric colours and generated camo patterns (base + three blob colours).
export const FABRIC={
 olive:'#4b5a3a',khaki:'#a08c62',tan:'#8c7350',black:'#23262b',grey:'#63676b',navy:'#2a3348',
 woodland:{base:'#5a6b3f',blobs:['#394829','#6e5a3c','#1f241c']},
 desert:{base:'#b9a27a',blobs:['#8d7550','#d2c19a','#6e5a3c']},
 urban:{base:'#8a8d90',blobs:['#5c6064','#b8bbbe','#2f3236']},
 flora:{base:'#6b7a4e',blobs:['#4a5a34','#8c9a64','#2e3a22']}
};

function seeded(seed){return()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};}
// Blob camo on a canvas: tiles because blobs wrap across the edges.
function camoTexture(spec,seed){
 const size=256,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),rand=seeded(seed);
 g.fillStyle=spec.base;g.fillRect(0,0,size,size);
 spec.blobs.forEach((color,layer)=>{
  g.fillStyle=color;
  for(let i=0;i<14-layer*3;i++){
   const x=rand()*size,y=rand()*size,r=14+rand()*26,points=7;
   for(const [ox,oy] of [[0,0],[-size,0],[size,0],[0,-size],[0,size]]){
    g.beginPath();
    for(let k=0;k<points;k++){const a=k/points*Math.PI*2,rr=r*(.6+rand()*.6);g.lineTo(x+ox+Math.cos(a)*rr*1.4,y+oy+Math.sin(a)*rr);}
    g.closePath();g.fill();
   }
  }
 });
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1.5,1.5);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;return t;
}

const camoCache=new Map();
export const CAMO_PATTERNS=Object.keys(FABRIC).filter(k=>typeof FABRIC[k]!=='string');
export function camoFor(name){
 if(!camoCache.has(name))camoCache.set(name,camoTexture(FABRIC[name],name.length*977+FABRIC[name].base.charCodeAt(1)));
 return camoCache.get(name);
}
