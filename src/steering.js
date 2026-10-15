const RAD = Math.PI / 180;

// W3C Z-X'-Y'' orientation: project world-up into the device's screen.
// This remains continuous across beta/gamma's equivalent Euler representations.
// It does not depend on screen.orientation, so screen rotation lock is supported.
export function wheelAngle(beta, gamma) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  const b = beta * RAD, g = gamma * RAD;
  const x = -Math.cos(b) * Math.sin(g);
  const y = Math.sin(b);
  // A screen lying almost flat has no reliable gravity-based wheel angle.
  if (Math.hypot(x, y) < 0.18) return null;
  return Math.atan2(-x, y) / RAD;
}

export function wheelInput(angle, neutral, sensitivity = 1.2) {
  const delta = ((angle - neutral + 540) % 360) - 180;
  const deadzone = 1.5;
  const magnitude = Math.max(0, Math.abs(delta) - deadzone);
  return Math.sign(delta) * Math.min(1, magnitude / (35 / sensitivity));
}
