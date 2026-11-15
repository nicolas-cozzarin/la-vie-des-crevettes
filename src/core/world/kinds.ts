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
