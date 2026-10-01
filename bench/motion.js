// Part choreography as pure scalars and arrays: consumers map these to scene coordinates.
import {phase} from './actions.js';

// Stylised clearance offsets in rifle space (metres), not maintenance instructions.
export const MOTION = {
  optic: {clear: [0, 0.09, 0], arc: 0.045, pinch: 1},
  side: {clear: [0, 0, 0.09], arc: 0.045, pinch: 1},
  foregrip: {clear: [0, -0.1, 0], arc: 0.055, pinch: 0.3},
  magazine: {clear: [-0.025, -0.13, 0], arc: 0.04, pinch: 0},
  muzzle: {clear: [0.055, 0, 0], arc: 0.035, pinch: 0.5},
  grip: {clear: [0, -0.09, 0], arc: 0.05, pinch: 0.2},
  stock: {clear: [-0.1, 0, 0], arc: 0.045, pinch: 0},
};
// Families that are adjusted where they sit (no part travels to the tray).
export const IN_PLACE = new Set(['stock']);

/** Segment scalars for progress u in 0..1, and which presentation objects are visible. */
export function motionAt(u, {inPlace = false, hasOld = true, hasNext = true} = {}) {
  return {
    extract: phase(u, 0.34, 0.4),
    deposit: phase(u, 0.4, 0.5),
    pickup: phase(u, 0.56, 0.66),
    seat: phase(u, 0.66, 0.74),
    oldVisible: hasOld && !inPlace && u >= 0.34 && u < 0.82,
    nextVisible: hasNext && !inPlace && u >= 0.5 && u < 0.74,
    mountedVisible: inPlace || u < 0.34 || u >= 0.74,
    contact: u >= 0.3 && u < 0.78,
  };
}

const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/**
 * Position of the outgoing part (mount -> clear -> tray) and the incoming part (tray -> clear -> mount).
 * All points share one frame; `arc` lifts the middle of each leg so parts never slide through the table.
 */
export function partPaths(u, {mount, clear, tray, arc}) {
  const m = motionAt(u);
  const up = [0, arc, 0];
  const cleared = add3(mount, clear);
  const old = m.deposit > 0 ? lerp3(add3(cleared, up), tray, m.deposit) : lerp3(mount, cleared, m.extract);
  const inClear = add3(cleared, up);
  const next = m.seat > 0 ? lerp3(inClear, mount, m.seat) : lerp3(tray, inClear, m.pickup);
  return {old, next};
}
