/**
 * What a companion does for the player once the bond is deep (doc 10,
 * "Toward the player"; T105): at Close she leads the player to her
 * favourite food once a chapter and rests touching, and any companion
 * that is with the player sidesteps a fish's charge a beat before it
 * passes, which shows the move. Nothing here knows about the engine.
 */

import type { FoodSpot } from '../food/FoodPatch';
import type { FoodKind } from '../world/kinds';
import type { Point } from '../movement/collision';
import type { Axis } from './steer';

export interface CloseTuning {
  lead: {
    /** The player's hunger and hers at or above these. */
    playerHunger: number;
    ownHunger: number;
    /** BL: she starts within this of the player. */
    near: number;
    /** BL: a patch of her favourite within this of her. */
    reach: number;
    /** Share of a full patch it must still hold. */
    amount: number;
    /** BL: she waits while the player is farther behind than this. */
    wait: number;
    /** Seconds before she gives up. */
    giveUp: number;
  };
  rest: {
    /** Seconds the player keeps still before she comes. */
    after: number;
    /** BL: she comes from within this. */
    near: number;
    /** BL between them as they rest touching. */
    touch: number;
  };
  sidestep: {
    /** BL: with the player, within this of it. */
    with: number;
    /** BL: she goes when the fish's head is this far short of her along its line. */
    ahead: number;
    /** BL: and she is this close to its line. */
    line: number;
  };
}

/** The patch of her favourite to lead the player to: the nearest with enough left, or null. */
export function leadTo(
  self: Point,
  favourite: FoodKind,
  foods: readonly FoodSpot[],
  bl: number,
  tuning: CloseTuning['lead'],
): FoodSpot | null {
  let best: FoodSpot | null = null;
  let bestDistance = tuning.reach * bl;
  for (const food of foods) {
    if (food.kind !== favourite || food.amount < tuning.amount) continue;
    const distance = Math.hypot(food.x - self.x, food.y - self.y);
    if (distance <= bestDistance) {
      best = food;
      bestDistance = distance;
    }
  }
  return best;
}

/** A fish charging: where its head is and where it is going. */
export interface Charge {
  head: Point;
  heading: number;
}

/**
 * Whether to sidestep now, and which way: when the charge's head is a beat
 * short of her along its line, she darts square to it, on the side she is
 * already on. Null when the charge is not coming at her, or is past.
 */
export function sidestepNow(
  charge: Charge,
  self: Point,
  bl: number,
  tuning: CloseTuning['sidestep'],
): Axis | null {
  const ux = Math.cos(charge.heading);
  const uy = Math.sin(charge.heading);
  const dx = self.x - charge.head.x;
  const dy = self.y - charge.head.y;
  const along = dx * ux + dy * uy;
  const across = ux * dy - uy * dx;
  if (along <= 0 || along > tuning.ahead * bl || Math.abs(across) > tuning.line * bl) return null;
  const side = across >= 0 ? 1 : -1;
  return { x: -uy * side, y: ux * side };
}
