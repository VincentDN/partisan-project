import * as T from 'three';
import {solveArm} from './ak15-weapon-customiser/field.js';
// Solve the wrist from a palm contact and then orient the palm in world space.
// Field poses keep their original extended-arm convention via solveArm's default.
export function solveContact(op,side,contact,orientation,pole){
 const center=new T.Vector3(0,-.024,0).applyQuaternion(orientation);
 solveArm(op,side,contact.clone().sub(center),pole,{handExtension:0});
 const joint=op.joints['hand'+side];
 joint.quaternion.copy(joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
 joint.updateWorldMatrix(true,false);
 return joint.localToWorld(new T.Vector3(0,-.024,0)).distanceTo(contact);
}
// Bench-only articulated low-poly hands; parked Operator/Field meshes remain unchanged.
export function installHands(op){
 const hands={};
 for(const side of ['R','L']){
  const joint=op.joints['hand'+side],original=joint.children.filter(o=>o.isMesh);
  const material=original[0]?.material||new T.MeshStandardMaterial({color:0xba8c69,roughness:.8});
  for(const m of original)m.visible=false;
  const group=new T.Group();joint.add(group);const fingers=[];
  const mesh=(w,h,d,y,parent)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.y=y;m.castShadow=m.receiveShadow=true;parent.add(m);};
  mesh(.067,.048,.027,-.024,group);
  for(let i=0;i<4;i++){
   const base=new T.Group();base.position.set((i-1.5)*.016,-.046,0);group.add(base);
   const length=i===3?.019:.024;mesh(.013,length,.014,-length/2,base);
   const tip=new T.Group();tip.position.y=-length;base.add(tip);mesh(.012,.021,.013,-.0105,tip);fingers.push({base,tip});
  }
  const thumb=new T.Group();thumb.position.set(side==='R'?.04:-.04,-.021,.006);group.add(thumb);mesh(.02,.034,.02,-.017,thumb);
  hands[side]={fingers,thumb};
 }
 return (side,curl=.6,pinch=0)=>{
  const h=hands[side];h.fingers.forEach(({base,tip},i)=>{base.rotation.x=-curl*(i===0&&pinch?.35:1)*1.15;tip.rotation.x=-curl*1.25;});
  h.thumb.rotation.set(-.45-curl*.35,0,(side==='R'?-1:1)*(.65+pinch*.25));
 };
}
