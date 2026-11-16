import type { FoodValue } from '../core/food/FoodPatch';
import type { FoodKind } from '../core/world/kinds';

/**
 * What each food gives. The table is doc 10's "Hunger". Every food is algae
 * or plant matter (CLAUDE.md, rule 1). The picture of each is `food.<kind>`.
 */
export const FOODS: Readonly<Record<FoodKind, FoodValue>> = {
  microalgae: { removes: 0.08, seconds: 0, regrow: 90 },
  algaeFilm: { removes: 0.25, seconds: 4, regrow: 90 },
  mangroveLeaf: { removes: 0.45, seconds: 8, regrow: 90 },
  seagrassFuzz: { removes: 0.2, seconds: 3, regrow: 90 },
  sandFilm: { removes: 0.25, removesAtDusk: 0.35, seconds: 4, regrow: 90 },
  seaweed: { removes: 0.15, seconds: 0, regrow: 90 },
};
