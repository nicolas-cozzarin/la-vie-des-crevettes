/**
 * Closed list. Every food is algae or plant matter. There is no animal food
 * and no way to add one without changing this type. See CLAUDE.md, rule 1.
 */
export const FOOD_KINDS = [
  'microalgae',
  'algaeFilm',
  'mangroveLeaf',
  'seagrassFuzz',
  'sandFilm',
  'seaweed',
] as const;
export type FoodKind = (typeof FOOD_KINDS)[number];

/** The six places of one life, in the order the shrimp lives them. */
export const AREA_IDS = ['drift', 'mangrove', 'lagoon', 'channel', 'shadow', 'openSea'] as const;
export type AreaId = (typeof AREA_IDS)[number];

/** How grown the shrimp is. Each area is lived at one stage (doc 11, "Scale"). */
export const LIFE_STAGES = ['larva', 'juvenile', 'subAdult', 'adult'] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];
