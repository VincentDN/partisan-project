// Roadblock completion keeps a looting window and offers an explicit departure after every guard is defeated.
export function securedRoadblock(sim) {
  return (
    sim.level.id === 'roadblock' &&
    !sim.outcome &&
    sim.units.some(u => u.side === 'partisan' && u.alive) &&
    sim.objectives.some(o => o.id === 'guards' && o.state === 'done') &&
    !sim.units.some(u => u.side === 'army' && u.alive && !u.escaped)
  );
}
export function finishRoadblock(sim) {
  if (!securedRoadblock(sim)) return false;
  const exit = sim.objectives.find(o => o.id === 'exit');
  if (!exit) return false;
  exit.state = 'done';
  exit.doneAt = sim.time;
  sim.checkOutcome();
  return sim.outcome === 'won';
}
export function raidCompletion() {
  const panel = document.createElement('section');
  panel.id = 'raid-complete';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Roadblock secured');
  const text = document.createElement('p');
  text.setAttribute('role', 'status');
  text.textContent = 'Roadblock secured. Search bodies for equipment, then finish the raid.';
  const button = document.createElement('button');
  button.textContent = 'Finish raid · return with loot';
  panel.append(text, button);
  document.body.append(panel);
  let current;
  button.onclick = () => finishRoadblock(current);
  return sim => {
    current = sim;
    panel.hidden = !securedRoadblock(sim);
  };
}
