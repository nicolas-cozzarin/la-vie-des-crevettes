import type { FoodKind } from '../world/kinds';

/**
 * A patch of food on the bed, and how it is eaten and grows back. Nothing
 * here knows about the engine. See docs/10-feelings-and-states.md, "Hunger".
 */

/** What one food gives, from `src/data/foods.ts`. */
export interface FoodValue {
  /** Hunger a whole patch removes. */
  removes: number;
  /** At dusk, if the food is better then. */
  removesAtDusk?: number;
  /** Seconds to eat a whole patch. 0: eaten whole on touch. */
  seconds: number;
  /** Seconds for an empty patch to grow back in full. */
  regrow: number;
}

/** A patch as the activity and the scent see it. */
export interface FoodSpot {
  id: string;
  kind: FoodKind;
  x: number;
  y: number;
  /** How far from the centre there is food, in design pixels. */
  r: number;
  /** 0 empty to 1 full. */
  amount: number;
}

export class FoodPatch implements FoodSpot {
  amount = 1;
  /** Grazed on this step: a patch does not grow while it is being eaten. */
  private grazed = false;

  constructor(
    readonly id: string,
    readonly kind: FoodKind,
    readonly x: number,
    readonly y: number,
    readonly r: number,
    private readonly value: FoodValue,
  ) {}

  /** Eat for `dt` seconds. Returns the hunger removed: part of a patch gives part of the meal. */
  graze(dt: number, dusk = false): number {
    if (this.amount <= 0) return 0;
    const eaten =
      this.value.seconds > 0 ? Math.min(this.amount, dt / this.value.seconds) : this.amount;
    // Steps that add up to the whole patch leave nothing, not a rounding crumb.
    this.amount = this.amount - eaten < 1e-9 ? 0 : this.amount - eaten;
    this.grazed = true;
    const removes = dusk ? (this.value.removesAtDusk ?? this.value.removes) : this.value.removes;
    return eaten * removes;
  }

  /** Grow back steadily while nobody eats: an empty patch is full again after `regrow` seconds. */
  step(dt: number): void {
    if (!this.grazed && this.amount < 1) {
      const grown = this.amount + dt / this.value.regrow;
      this.amount = grown > 1 - 1e-9 ? 1 : grown;
    }
    this.grazed = false;
  }
}
