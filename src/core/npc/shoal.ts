/**
 * The three pulls that keep a shoal loosely together, from chapter 2: toward
 * the middle of the group when far from it, away from anyone too close, and
 * along the group's heading. See docs/10-feelings-and-states.md, "The
 * shoal". They shape wandering and following, never fleeing, hiding or
 * freezing. Nothing here knows about the engine.
 */

export interface ShoalTuning {
  /** BL. Beyond this from the middle, the pull toward it starts. */
  middle: number;
  /** BL. Closer than this to another shrimp, the push away starts. */
  apart: number;
  /** How strong each pull is, against a held direction of 1. */
  toMiddle: number;
  away: number;
  along: number;
}

export interface ShoalMember {
  id: string;
  x: number;
  y: number;
  heading: number;
}

/** The middle of the group, without the shrimp asking. Null when it is alone. */
export function shoalMiddle(
  self: string,
  members: readonly ShoalMember[],
): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let count = 0;
  for (const member of members) {
    if (member.id === self) continue;
    x += member.x;
    y += member.y;
    count++;
  }
  return count === 0 ? null : { x: x / count, y: y / count };
}

/** The sum of the three pulls on one shrimp, as a direction to add to what it holds. */
export function shoalPull(
  self: ShoalMember,
  members: readonly ShoalMember[],
  bodyLengthPx: number,
  tuning: ShoalTuning,
): { x: number; y: number } {
  const middle = shoalMiddle(self.id, members);
  if (!middle) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;

  const dx = middle.x - self.x;
  const dy = middle.y - self.y;
  const distance = Math.hypot(dx, dy);
  const beyond = distance - tuning.middle * bodyLengthPx;
  if (beyond > 0 && distance > 0) {
    const share = Math.min(1, beyond / (tuning.middle * bodyLengthPx));
    x += (dx / distance) * tuning.toMiddle * share;
    y += (dy / distance) * tuning.toMiddle * share;
  }

  const apart = tuning.apart * bodyLengthPx;
  let headingX = 0;
  let headingY = 0;
  for (const member of members) {
    if (member.id === self.id) continue;
    headingX += Math.cos(member.heading);
    headingY += Math.sin(member.heading);
    const ax = self.x - member.x;
    const ay = self.y - member.y;
    const gap = Math.hypot(ax, ay);
    if (gap >= apart) continue;
    if (gap < 1e-6) {
      x += tuning.away;
      continue;
    }
    const push = (1 - gap / apart) * tuning.away;
    x += (ax / gap) * push;
    y += (ay / gap) * push;
  }
  const length = Math.hypot(headingX, headingY);
  if (length > 1e-6) {
    x += (headingX / length) * tuning.along;
    y += (headingY / length) * tuning.along;
  }
  return { x, y };
}
