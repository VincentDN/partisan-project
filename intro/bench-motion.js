import {phase} from './bench-actions.js';

// Stylised presentation offsets in rifle space, not mechanical instructions.
export const MOTION={
 optic:{clear:[0,.09,0],arc:.045,pinch:1},
 side:{clear:[0,0,.09],arc:.045,pinch:1},
 foregrip:{clear:[0,-.10,0],arc:.055,pinch:.3},
 magazine:{clear:[-.025,-.13,0],arc:.04,pinch:0},
 muzzle:{clear:[.055,0,0],arc:.035,pinch:.5,shift:-.08},
 grip:{clear:[0,-.09,0],arc:.05,pinch:.2},
 stock:{clear:[-.10,0,0],arc:.045,pinch:0}
};

// Continuous extraction / table transfer / seating segments. Consumers map these
// scalars to scene coordinates; pure timing stays independently testable.
export function motionAt(u,{inPlace=false,hasOld=true,hasNext=true}={}){
 return {
  extract:phase(u,.34,.40),deposit:phase(u,.40,.50),
  pickup:phase(u,.56,.66),seat:phase(u,.66,.74),
  oldVisible:hasOld&&!inPlace&&u>=.34&&u<.82,
  nextVisible:hasNext&&!inPlace&&u>=.50&&u<.74,
  mountedVisible:inPlace||u<.34||u>=.74,
  contact:u>=.30&&u<.78
 };
}
