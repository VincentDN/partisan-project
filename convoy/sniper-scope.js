// Scoped precision aim: stable world target, directional extended sight and a canvas scope overlay.
export const SCOPE_RANGE = 90;
export const SCOPE_ZOOM = 2.4;
export const canScope = u =>
  !!u?.alive &&
  (['svd', 'mk14'].includes(u.weapon) ||
    (u.weapon === 'hunting' && ['marksman', 'sharpshooter', 'sniper', 'countersniper'].includes(u.cls)));

export function beginScope(u, aim) {
  if (!canScope(u) || !aim) return null;
  const dx = aim.x - u.x,
    dz = aim.z - u.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.1) return null;
  const range = Math.min(75, Math.max(45, d));
  return {id: u.id, weapon: u.weapon, x: u.x + (dx / d) * range, z: u.z + (dz / d) * range};
}
export const validScope = (s, u) => !!s && s.id === u?.id && s.weapon === u.weapon && canScope(u);
export function moveScope(s, u, dx, dz) {
  s.x += dx;
  s.z += dz;
  const d = Math.hypot(s.x - u.x, s.z - u.z);
  if (d > SCOPE_RANGE - 5) {
    s.x = u.x + ((s.x - u.x) / d) * (SCOPE_RANGE - 5);
    s.z = u.z + ((s.z - u.z) / d) * (SCOPE_RANGE - 5);
  }
}
/** Only the scoped fighter gets a longer view, within a 36-degree cone. Occlusion remains the caller's LOS test. */
export function sightRange(sim, eye, angle) {
  const normal = sim.vision ?? 30;
  if (!validScope(sim.scope, eye)) return normal;
  const a = Math.atan2(sim.scope.z - eye.z, sim.scope.x - eye.x);
  return Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) <= Math.PI / 10 ? Math.max(normal, SCOPE_RANGE) : normal;
}
export function drawScope(ctx, w, h, x, y) {
  const r = Math.min(w, h) * 0.43;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.88)';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(x, y, r, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#171b16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - 5, y);
  ctx.moveTo(x + 5, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y - 5);
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x, y + r);
  for (let i = -4; i <= 4; i++)
    if (i) {
      ctx.moveTo(x + i * 22, y - 4);
      ctx.lineTo(x + i * 22, y + 4);
      ctx.moveTo(x - 4, y + i * 22);
      ctx.lineTo(x + 4, y + i * 22);
    }
  ctx.stroke();
  ctx.fillStyle = '#e0ded2';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('2.4× · Move mouse / screen edge to aim · Left-click fires · Shift-right-click orders', w / 2, h - 24);
  ctx.restore();
}
