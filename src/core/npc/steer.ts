import type { Bounds, Obstacle } from '../movement/collision';

/**
 * From a point a shrimp wants to reach to the direction it holds, as a
 * player would hold it. The motion then walks, swims and darts exactly as the
 * player's own does. Nothing here knows about the engine.
 */

export interface SteerTuning {
  /** BL. How far ahead the way is checked for roots and stones. */
  look: number;
  /** Radians between the directions tried round something in the way. */
  tryStep: number;
  /** BL. Closer than this to the target counts as arrived. */
  arrive: number;
}

export interface Axis {
  x: number;
  y: number;
}

const STILL: Axis = { x: 0, y: 0 };

function clear(
  x: number,
  y: number,
  radius: number,
  obstacles: readonly Obstacle[],
  bounds: Bounds | null,
): boolean {
  if (bounds) {
    if (x - radius < bounds.x || y - radius < bounds.y) return false;
    if (x + radius > bounds.x + bounds.w || y + radius > bounds.y + bounds.h) return false;
  }
  for (const obstacle of obstacles) {
    if (obstacle.shape === 'circle') {
      const reach = obstacle.r + radius;
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      if (dx * dx + dy * dy < reach * reach) return false;
    } else if (
      x > obstacle.x - radius &&
      x < obstacle.x + obstacle.w + radius &&
      y > obstacle.y - radius &&
      y < obstacle.y + obstacle.h + radius
    ) {
      return false;
    }
  }
  return true;
}

/** The obstacles that come within `reach` pixels of a point: the only ones worth checking. */
export function obstaclesNear(
  x: number,
  y: number,
  reach: number,
  obstacles: readonly Obstacle[],
): Obstacle[] {
  return obstacles.filter((obstacle) => {
    if (obstacle.shape === 'circle') {
      return Math.hypot(obstacle.x - x, obstacle.y - y) < reach + obstacle.r;
    }
    const nx = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.w));
    const ny = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.h));
    return Math.hypot(nx - x, ny - y) < reach;
  });
}

/**
 * The direction to hold toward a target: straight at it when the way is
 * clear, otherwise the nearest direction to either side that is. `strength`
 * scales the result, so a calm shrimp walks slower than a frightened one.
 * Returns no direction once the target is within `arrive`.
 */
export function steer(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bodyLengthPx: number,
  radiusPx: number,
  obstacles: readonly Obstacle[],
  bounds: Bounds | null,
  tuning: SteerTuning,
  strength = 1,
): Axis {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= tuning.arrive * bodyLengthPx) return STILL;
  const want = Math.atan2(dy, dx);
  const look = Math.min(distance, tuning.look * bodyLengthPx);
  const near = obstaclesNear(from.x, from.y, look + radiusPx, obstacles);
  const tries = Math.floor(Math.PI / tuning.tryStep);
  for (let index = 0; index <= tries; index++) {
    for (const side of index === 0 ? [0] : [1, -1]) {
      const angle = want + side * index * tuning.tryStep;
      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      // Two points along the way: half the look and the whole of it.
      const ok =
        clear(from.x + cx * look * 0.5, from.y + cy * look * 0.5, radiusPx, near, bounds) &&
        clear(from.x + cx * look, from.y + cy * look, radiusPx, near, bounds);
      if (ok) return { x: cx * strength, y: cy * strength };
    }
  }
  // Boxed in: push straight at the target and let the collision slide it.
  return { x: (dx / distance) * strength, y: (dy / distance) * strength };
}

/**
 * Whether a point is free for a shrimp of this radius: not inside a root,
 * a stone or the edge of the area.
 */
export function isClear(
  x: number,
  y: number,
  radiusPx: number,
  obstacles: readonly Obstacle[],
  bounds: Bounds | null,
): boolean {
  return clear(x, y, radiusPx, obstacles, bounds);
}
