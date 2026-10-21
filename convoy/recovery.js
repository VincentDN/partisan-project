// After victory, let survivors walk and loot without running enemy AI, hazards, objectives or combat clocks.
export function recoveryStep(sim, dt, input = {}) {
  if (sim.outcome !== 'won') return;
  let p = sim.player;
  if (!p?.alive) {
    p = sim.units.find(u => u.side === 'partisan' && u.alive);
    if (!p) return;
    sim.active = p;
    sim.control.pending = null;
    sim.control.revision++;
  }
  p.searching = null;
  const length = Math.hypot(input.mx || 0, input.mz || 0);
  p.moving = length > 0;
  if (length) {
    const speed = input.sprint ? 6 : 3.5;
    sim.slide(p, (input.mx / length) * speed * dt, (input.mz / length) * speed * dt);
    p.facing = Math.atan2(input.mz, input.mx);
  }
}

export function recoverySwitch(sim) {
  if (sim.outcome !== 'won') return false;
  const alive = sim.units.filter(u => u.side === 'partisan' && u.alive && !u.escaped);
  if (alive.length < 2) return false;
  sim.active.moving = false;
  sim.active = alive[(alive.indexOf(sim.active) + 1) % alive.length];
  sim.control.pending = null;
  sim.control.revision++;
  return true;
}
