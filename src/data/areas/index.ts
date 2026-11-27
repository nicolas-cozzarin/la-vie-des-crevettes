import type { LifeStage } from '../../core/world/kinds';
import { WORLD } from '../tuning';
import { channel } from './channel';
import { lagoon } from './lagoon';
import { mangrove } from './mangrove';
import { mirrorArea } from './mirror';
import type { AreaDef } from './types';

/** Every area that can be played. More join as their data is written (doc 11). */
export const AREAS = { mangrove, lagoon, channel } as const;

export type PlayableArea = keyof typeof AREAS;

/** The stage the shrimp lives each area at (doc 11, "Scale"). */
export const STAGE_IN: Record<PlayableArea, LifeStage> = {
  mangrove: 'juvenile',
  lagoon: 'subAdult',
  channel: 'subAdult',
};

/**
 * The areas the story leads into. An area joins when its chapter's story is
 * built; until then it opens in explore mode only (T111).
 */
export const STORY_AREAS: ReadonlySet<PlayableArea> = new Set<PlayableArea>(['mangrove', 'lagoon']);

/** The area the story starts in, until the Drift is built (step 8). */
export const FIRST_AREA: PlayableArea = 'mangrove';

export function isPlayableArea(id: string): id is PlayableArea {
  return Object.hasOwn(AREAS, id);
}

/** An area as it is played: turned round if the coast is (`WORLD.mirror`). */
export function areaFor(id: PlayableArea): AreaDef {
  const area: AreaDef = AREAS[id];
  return WORLD.mirror ? mirrorArea(area) : area;
}

/**
 * A point given as the data file writes it, such as `?explore=…&at=x,y`,
 * where it is as played. The atelier's `?view=x,y` reads points the same way.
 */
export function pointFor(id: PlayableArea, x: number, y: number): { x: number; y: number } {
  return WORLD.mirror ? { x: AREAS[id].size.w - x, y } : { x, y };
}
