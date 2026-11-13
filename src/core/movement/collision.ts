/**
 * Collision on the flat bed. The shrimp is a circle. Obstacles are still
 * circles and rectangles. Nothing here knows about the engine.
 */
export type Obstacle =
  | { shape: 'circle'; x: number; y: number; r: number }
  /** `x` and `y` are the top-left corner. */
  | { shape: 'rect'; x: number; y: number; w: number; h: number };

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function pushOut(point: Point, radius: number, obstacle: Obstacle): void {
  if (obstacle.shape === 'circle') {
    const dx = point.x - obstacle.x;
    const dy = point.y - obstacle.y;
    const reach = radius + obstacle.r;
    const distance = Math.hypot(dx, dy);
    if (distance >= reach) return;
    if (distance === 0) {
      point.x = obstacle.x + reach;
      return;
    }
    point.x = obstacle.x + (dx / distance) * reach;
    point.y = obstacle.y + (dy / distance) * reach;
    return;
  }

  const left = obstacle.x;
  const right = obstacle.x + obstacle.w;
  const top = obstacle.y;
  const bottom = obstacle.y + obstacle.h;
  const nearX = clamp(point.x, left, right);
  const nearY = clamp(point.y, top, bottom);
  const dx = point.x - nearX;
  const dy = point.y - nearY;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return;

  if (distance > 0) {
    point.x = nearX + (dx / distance) * radius;
    point.y = nearY + (dy / distance) * radius;
    return;
  }

  // The centre is inside the rectangle: leave by the nearest side.
  const toLeft = point.x - left;
  const toRight = right - point.x;
  const toTop = point.y - top;
  const toBottom = bottom - point.y;
  const nearest = Math.min(toLeft, toRight, toTop, toBottom);
  if (nearest === toLeft) point.x = left - radius;
  else if (nearest === toRight) point.x = right + radius;
  else if (nearest === toTop) point.y = top - radius;
  else point.y = bottom + radius;
}

/** Move a circle out of every obstacle it overlaps and keep it inside the bounds. */
export function resolveCircle(
  x: number,
  y: number,
  radius: number,
  obstacles: readonly Obstacle[],
  bounds?: Bounds,
): Point {
  const point = { x, y };
  // A few passes settle the case where leaving one obstacle enters another.
  for (let pass = 0; pass < 3; pass++) {
    for (const obstacle of obstacles) pushOut(point, radius, obstacle);
    if (bounds) {
      point.x = clamp(point.x, bounds.x + radius, bounds.x + bounds.w - radius);
      point.y = clamp(point.y, bounds.y + radius, bounds.y + bounds.h - radius);
    }
  }
  return point;
}

/**
 * Move a circle by (dx, dy), sliding along whatever it meets. Long moves are
 * cut into short ones so a fast dart cannot jump through a rock.
 */
export function moveCircle(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
  obstacles: readonly Obstacle[],
  bounds?: Bounds,
): Point {
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));
  let point = { x, y };
  for (let step = 0; step < steps; step++) {
    point = resolveCircle(point.x + dx / steps, point.y + dy / steps, radius, obstacles, bounds);
  }
  return point;
}
