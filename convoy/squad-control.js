// Whole-squad control: switch the active rebel without copying kit, health, reloads or standing orders.
export const SWAP_COOLDOWN = 3; // simulation seconds; forced death selection always bypasses this
export const livingRebels = sim => sim.units.filter(u => u.side === 'partisan' && u.alive && !u.escaped);
export const controlCandidates = sim => livingRebels(sim).filter(u => u !== sim.active);

/** Explicit command; timeouts are advanced by the host so the simulation never reads a wall clock. */
export function requestControl(sim) {
  if (sim.outcome || sim.control.pending || !controlCandidates(sim).length) return false;
  const forced = !sim.active.alive;
  if (!forced && sim.time < sim.control.readyAt) return false;
  sim.control.pending = {forced, remaining: forced ? 3 : 2.5};
  return true;
}

export function selectControl(sim, id) {
  const next = controlCandidates(sim).find(u => u.id === id);
  if (!next || sim.outcome || (!sim.control.pending && sim.active.alive && sim.time < sim.control.readyAt)) return false;
  const previous = sim.active;
  // A carried-out move order remains an AI order when control returns; a manually driven rebel holds here by default.
  if (!previous.order) previous.order = {type: 'hold', x: previous.x, z: previous.z, angle: previous.facing};
  previous.moveTo = null;
  previous.moving = false;
  previous.thinkAt = sim.time;
  // Scripted hold-E searches do not transfer progress between characters (physical looting follows in S9).
  if (previous.searching) previous.searching.progress = 0;
  previous.searching = null;
  next.moveTo = null;
  next.moving = false;
  sim.active = next;
  sim.control.pending = null;
  sim.control.readyAt = sim.time + SWAP_COOLDOWN;
  sim.control.revision++;
  return true;
}

export function cancelControl(sim) {
  if (!sim.control.pending || sim.control.pending.forced || !sim.active.alive) return false;
  sim.control.pending = null;
  return true;
}

export function ensureControl(sim) {
  if (sim.outcome || !livingRebels(sim).length) {
    sim.control.pending = null;
    return;
  }
  if (!sim.active.alive) {
    if (sim.control.pending?.forced) return;
    sim.control.pending = null;
    requestControl(sim);
  }
}

/** Host time, normally real seconds. Headless clients advance it explicitly for deterministic replay. */
export function advanceControl(sim, elapsed) {
  const choice = sim.control.pending;
  if (!choice || !Number.isFinite(elapsed) || elapsed < 0) return false;
  choice.remaining -= elapsed;
  if (choice.remaining > 0) return false;
  const nearest = controlCandidates(sim).sort(
    (a, b) => Math.hypot(a.x - sim.active.x, a.z - sim.active.z) - Math.hypot(b.x - sim.active.x, b.z - sim.active.z),
  )[0];
  if (nearest) return selectControl(sim, nearest.id);
  sim.control.pending = null;
  return false;
}
