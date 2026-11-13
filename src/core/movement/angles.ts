/** Angles are in radians. 0 points right and they grow clockwise, as on screen. */
export const TAU = Math.PI * 2;

/** Bring an angle into the range -PI (excluded) to PI (included). */
export function wrapAngle(angle: number): number {
  let wrapped = angle % TAU;
  if (wrapped > Math.PI) wrapped -= TAU;
  else if (wrapped <= -Math.PI) wrapped += TAU;
  return wrapped;
}

/** The shortest signed turn that takes `from` to `to`. */
export function angleDiff(to: number, from: number): number {
  return wrapAngle(to - from);
}

/** Turn `from` toward `to` by at most `maxStep`. */
export function rotateToward(from: number, to: number, maxStep: number): number {
  const diff = angleDiff(to, from);
  if (Math.abs(diff) <= maxStep) return wrapAngle(to);
  return wrapAngle(from + Math.sign(diff) * maxStep);
}

/** How far a smoothed value moves toward its target in `dt`, for a time constant `tau`. */
export function approach(dt: number, tau: number): number {
  return tau <= 0 ? 1 : 1 - Math.exp(-dt / tau);
}
