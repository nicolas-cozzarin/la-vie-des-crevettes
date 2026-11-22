import type { RigLook } from '../art/expressions';
import type { Temperament } from '../core/npc/behaviours';
import type { FoodKind } from '../core/world/kinds';
import type { ShrimpSpawnDef } from './areas/types';

/**
 * The other shrimp: the three companions as doc 10's "Temperament" table and
 * doc 11's "The player's shrimp, the companions, the shoal" give them, and
 * the ranges an unnamed shrimp is drawn from.
 */
export interface ShrimpKind {
  temperament: Temperament;
  favourite: FoodKind;
  /** Length, as a share of the player's. */
  size: number;
  look: Partial<RigLook>;
}

export type CompanionId = Exclude<ShrimpSpawnDef['who'], 'young'>;

export const COMPANIONS: Readonly<Record<CompanionId, ShrimpKind>> = {
  brise: {
    temperament: { boldness: 0.85, sociability: 0.6, activity: 0.8 },
    favourite: 'mangroveLeaf',
    size: 1.05,
    // Left antenna a third shorter, with a blunt tip.
    look: { leftAntennaFactor: 0.67 },
  },
  nacre: {
    temperament: { boldness: 0.2, sociability: 0.5, activity: 0.4 },
    favourite: 'seagrassFuzz',
    size: 1,
    // Tail fan almost white.
    look: { fanPale: 0.8 },
  },
  ecume: {
    temperament: { boldness: 0.5, sociability: 0.8, activity: 0.9 },
    favourite: 'sandFilm',
    size: 0.85,
    // A darker gut line, until her two dots are drawn (T55).
    look: { gutAlpha: 1.4 },
  },
};

/** An unnamed shrimp: each value is drawn between these, from its own seed. */
export const UNNAMED = {
  temperament: { min: 0.3, max: 0.7 },
  size: { min: 0.9, max: 1.05 },
  /** Antenna length, as a share of the usual. */
  antenna: { min: 0.9, max: 1.08 },
  /** How much darker or warmer the body may be: 0 none. */
  tint: 0.08,
  favourites: ['algaeFilm', 'mangroveLeaf', 'seagrassFuzz', 'sandFilm'] as FoodKind[],
};
