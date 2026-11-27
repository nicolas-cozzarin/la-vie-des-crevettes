/**
 * The shoal's journey with the tide (doc 11, chapter 3; T113): a line drawn
 * through an area from where the shoal gathers to where it leaves. The shoal
 * keeps a little ahead of the player along it, so it goes when the player
 * goes and waits when the player stops. Nothing here knows about the engine.
 */

export interface Point {
  x: number;
  y: number;
}

/** How far along the route the point on it nearest to (x, y) lies, in pixels. */
export function along(route: readonly Point[], x: number, y: number): number {
  let best = Infinity;
  let at = 0;
  let walked = 0;
  for (let index = 1; index < route.length; index++) {
    const a = route[index - 1] as Point;
    const b = route[index] as Point;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (length * length)));
    const gap = Math.hypot(a.x + dx * t - x, a.y + dy * t - y);
    if (gap < best) {
      best = gap;
      at = walked + t * length;
    }
    walked += length;
  }
  return at;
}

/** The whole route's length, in pixels. */
export function routeLength(route: readonly Point[]): number {
  let length = 0;
  for (let index = 1; index < route.length; index++) {
    const a = route[index - 1] as Point;
    const b = route[index] as Point;
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return length;
}

/** The point `distance` pixels along the route, held to its ends. */
export function pointAlong(route: readonly Point[], distance: number): Point {
  const first = route[0];
  if (!first) return { x: 0, y: 0 };
  let left = Math.max(0, distance);
  for (let index = 1; index < route.length; index++) {
    const a = route[index - 1] as Point;
    const b = route[index] as Point;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= length && length > 0) {
      const t = left / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= length;
  }
  const last = route[route.length - 1] as Point;
  return { x: last.x, y: last.y };
}

/** Where the shoal makes for: `ahead` pixels along the route beyond the player, at most its end. */
export function shoalGoal(route: readonly Point[], player: Point, ahead: number): Point {
  return pointAlong(route, along(route, player.x, player.y) + ahead);
}
