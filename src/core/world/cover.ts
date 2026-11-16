/**
 * Shelter. A cover is a circle the shrimp can go under: a root tangle, a
 * floating leaf, a clump of seagrass. Nothing here knows about the engine.
 * See docs/10-feelings-and-states.md, "Activities".
 */

export interface CoverSpot {
  x: number;
  y: number;
  /** How far from the centre the shrimp is sheltered. */
  r: number;
}

/** Whether a point is under a cover. */
export function isUnder(x: number, y: number, cover: CoverSpot): boolean {
  return Math.hypot(x - cover.x, y - cover.y) < cover.r;
}

/** How far a point is from the edge of a cover. Negative when under it. */
export function distanceToCover(x: number, y: number, cover: CoverSpot): number {
  return Math.hypot(x - cover.x, y - cover.y) - cover.r;
}

/**
 * The cover whose edge is nearest, if that edge is within `maxDistance`.
 * Being under a cover counts as distance zero or less, so the cover the
 * shrimp is in always wins over one it is beside.
 */
export function nearestCover<T extends CoverSpot>(
  x: number,
  y: number,
  covers: readonly T[],
  maxDistance: number,
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const cover of covers) {
    const distance = distanceToCover(x, y, cover);
    if (distance <= maxDistance && distance < bestDistance) {
      best = cover;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Where the shrimp tucks in: on the line from the cover's centre toward the
 * shrimp, `tuck` of the radius out. Already that deep, it stays where it is.
 */
export function tuckPoint(
  x: number,
  y: number,
  cover: CoverSpot,
  tuck: number,
): { x: number; y: number } {
  const dx = x - cover.x;
  const dy = y - cover.y;
  const distance = Math.hypot(dx, dy);
  const depth = cover.r * tuck;
  if (distance <= depth) return { x, y };
  return { x: cover.x + (dx / distance) * depth, y: cover.y + (dy / distance) * depth };
}
