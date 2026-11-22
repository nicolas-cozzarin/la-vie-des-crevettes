import type { AreaId, FoodKind } from '../world/kinds';
import { newRecord, type ProgressRecord } from './Progress';

/**
 * What one life carries from place to place and keeps in the save: the
 * story steps done, the lines already narrated, what has been found, the
 * places seen, the molts, the feelings that carry over, and everything the
 * journal counts (doc 06, `SaveV1`; doc 12, "What the save must hold").
 */
export interface Life extends ProgressRecord {
  narrated: Set<string>;
  placesSeen: Set<AreaId>;
  molts: number;
  /** The hunger to start the next place with, or null for the place's own. */
  hunger: number | null;
  /** The food this shrimp likes best, chosen once in a life (T35). */
  favourite: FoodKind | null;
  /** Which life this is: 1 for the first. */
  generation: number;
  /** The challenge pinned in the journal. */
  pinned: string | null;
  /** How many times each prompt has shown, for the first three times (doc 03). */
  promptsShown: Record<string, number>;
  playSeconds: number;
}

export function newLife(): Life {
  return {
    ...newRecord(),
    narrated: new Set(),
    placesSeen: new Set(),
    molts: 0,
    hunger: null,
    favourite: null,
    generation: 1,
    pinned: null,
    promptsShown: {},
    playSeconds: 0,
  };
}
