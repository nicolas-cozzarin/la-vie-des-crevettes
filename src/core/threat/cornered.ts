/**
 * Where the shrimp wakes after being cornered: tucked in the nearest shelter
 * that the predator is not within 6 BL of. With none, the place's start. See
 * docs/10-feelings-and-states.md, "Cornered". Nothing here knows about the engine.
 */

import type { Point } from '../movement/collision';
import { distanceToCover, tuckPoint, type CoverSpot } from '../world/cover';

export interface CorneredTuning {
  /** Seconds from the instant before contact: blurred, dark, the picture back, control back. */
  blurred: number;
  flips: number;
  dark: number;
  back: number;
  control: number;
  /** BL. The shelter's edge is at least this far from the predator. */
  away: number;
}

export interface Shelter<T extends CoverSpot> {
  cover: T | null;
  x: number;
  y: number;
}

/**
 * The shelter nearest the shrimp whose edge is `away` or more from the
 * predator, and the point tucked in under it. Falls back to `start`.
 */
export function shelterFor<T extends CoverSpot>(
  shrimp: Point,
  predator: Point,
  covers: readonly T[],
  awayPx: number,
  tuck: number,
  start: Point,
): Shelter<T> {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const cover of covers) {
    if (distanceToCover(predator.x, predator.y, cover) < awayPx) continue;
    const distance = distanceToCover(shrimp.x, shrimp.y, cover);
    if (distance < bestDistance) {
      best = cover;
      bestDistance = distance;
    }
  }
  if (!best) return { cover: null, x: start.x, y: start.y };
  const point = tuckPoint(shrimp.x, shrimp.y, best, tuck);
  return { cover: best, x: point.x, y: point.y };
}
