// Decide when the campaign needs a new frame; paused, settled maps only refresh twice per second.
export function createRenderBudget() {
  let last = -Infinity;
  return (now, {active, cameraMoving, dirty = false}) => {
    const interval = active || cameraMoving ? 0 : 500;
    if (!dirty && now - last < interval) return false;
    last = now;
    return true;
  };
}
