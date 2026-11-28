/**
 * The plume of a farm pond's water, spreading into the channel from its
 * outlet (doc 18, "Level 3"; D39). Inside it Sense finds only the unknown,
 * and the shrimp will not eat. It is a band from the gate, downstream, with
 * round ends. Nothing here knows about the engine.
 */

import type { Point } from '../movement/collision';

export interface Plume {
  /** At the gate. */
  from: Point;
  /** Its far end, where the current has bent it. */
  to: Point;
  /** Across, in pixels. */
  width: number;
}

/** Whether a point lies inside the plume. */
export function inPlume(plume: Plume, x: number, y: number): boolean {
  const { from, to } = plume;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / length2));
  return Math.hypot(from.x + dx * t - x, from.y + dy * t - y) <= plume.width / 2;
}
