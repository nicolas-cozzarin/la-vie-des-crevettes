import type { AreaId, FoodKind } from '../world/kinds';

/**
 * What one life carries from place to place: the story steps done, the
 * lines already narrated, what has been found, the places seen, the molts,
 * and the feelings that carry over. Saving it comes in step 9 (doc 06,
 * `SaveV1`).
 */
export interface Life {
  stepsDone: Set<string>;
  narrated: Set<string>;
  discoveries: Set<string>;
  placesSeen: Set<AreaId>;
  molts: number;
  /** The hunger to start the next place with, or null for the place's own. */
  hunger: number | null;
  /** The food this shrimp likes best, chosen once in a life (T35). */
  favourite: FoodKind | null;
}

export function newLife(): Life {
  return {
    stepsDone: new Set(),
    narrated: new Set(),
    discoveries: new Set(),
    placesSeen: new Set(),
    molts: 0,
    hunger: null,
    favourite: null,
  };
}
