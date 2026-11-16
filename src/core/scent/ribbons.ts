import type { FoodSpot } from '../food/FoodPatch';
import type { FoodKind } from '../world/kinds';

/**
 * What Sense shows: which ribbons, toward what, and how strong. Nothing here
 * knows about the engine. See docs/02-mechanics.md, "Sense", and doc 15,
 * step 5.
 */

export const RIBBON_KINDS = ['food', 'shrimp', 'danger', 'unknown'] as const;
export type RibbonKind = (typeof RIBBON_KINDS)[number];

/** Something a ribbon can lead to. */
export interface ScentSource {
  id: string;
  x: number;
  y: number;
}

export interface ShrimpSource extends ScentSource {
  /** A companion: the dots are brighter and larger. */
  companion: boolean;
}

/** Everything that gives off scent around the shrimp. */
export interface ScentWorld {
  foods: readonly FoodSpot[];
  shrimp: readonly ShrimpSource[];
  /** Where a predator passed in the last 30 s. */
  dangers: readonly ScentSource[];
  /** Things not yet in the journal, and the pinned challenge's target. */
  unknown: readonly ScentSource[];
}

export interface Ribbon {
  kind: RibbonKind;
  /** The patch, shrimp or thing it leads to. */
  id: string;
  x: number;
  y: number;
  distance: number;
  /** 0 to 1. */
  strength: number;
  food?: FoodKind;
  companion?: boolean;
}

export interface ScentTuning {
  /** At most this many unknown ribbons, nearest first. */
  maxUnknown: number;
  /** Share of strength lost at the edge of the range. */
  fade: number;
}

export const EMPTY_WORLD: ScentWorld = { foods: [], shrimp: [], dangers: [], unknown: [] };

/**
 * The ribbons to show from (x, y), with a range in design pixels. One per
 * food kind, to its nearest patch that has food. One per shrimp. One per
 * danger mark. One per unknown thing, at most `maxUnknown`. All within range.
 */
export function ribbons(
  x: number,
  y: number,
  world: ScentWorld,
  range: number,
  tuning: ScentTuning,
): Ribbon[] {
  const strength = (distance: number): number => 1 - (tuning.fade * distance) / range;
  const away = (source: ScentSource): number => Math.hypot(source.x - x, source.y - y);
  const found: Ribbon[] = [];

  const nearestFood = new Map<FoodKind, { food: FoodSpot; distance: number }>();
  for (const food of world.foods) {
    if (food.amount <= 0) continue;
    const distance = away(food);
    if (distance > range) continue;
    const best = nearestFood.get(food.kind);
    if (!best || distance < best.distance) nearestFood.set(food.kind, { food, distance });
  }
  for (const { food, distance } of nearestFood.values()) {
    found.push({
      kind: 'food',
      id: food.id,
      x: food.x,
      y: food.y,
      distance,
      strength: strength(distance),
      food: food.kind,
    });
  }

  for (const shrimp of world.shrimp) {
    const distance = away(shrimp);
    if (distance > range) continue;
    found.push({
      kind: 'shrimp',
      id: shrimp.id,
      x: shrimp.x,
      y: shrimp.y,
      distance,
      strength: strength(distance),
      companion: shrimp.companion,
    });
  }

  for (const mark of world.dangers) {
    const distance = away(mark);
    if (distance > range) continue;
    found.push({ kind: 'danger', ...pick(mark), distance, strength: strength(distance) });
  }

  const unknown = world.unknown
    .map((source) => ({ source, distance: away(source) }))
    .filter((entry) => entry.distance <= range)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, tuning.maxUnknown);
  for (const { source, distance } of unknown) {
    found.push({ kind: 'unknown', ...pick(source), distance, strength: strength(distance) });
  }
  return found;
}

function pick(source: ScentSource): ScentSource {
  return { id: source.id, x: source.x, y: source.y };
}

/**
 * Which patches had a food ribbon shown lately, so that grazing one counts
 * as following its ribbon (`ribbon:followed`, doc 12, "nose").
 */
export class RibbonMemory {
  private readonly seen = new Map<string, number>();

  constructor(private readonly window: number) {}

  /** Food ribbons shown at `time`, in seconds. */
  shown(shown: readonly Ribbon[], time: number): void {
    for (const ribbon of shown) if (ribbon.kind === 'food') this.seen.set(ribbon.id, time);
  }

  /** Whether grazing this patch at `time` follows a ribbon. Counts once per showing. */
  followed(patchId: string, time: number): boolean {
    const at = this.seen.get(patchId);
    if (at === undefined || time - at > this.window) return false;
    this.seen.delete(patchId);
    return true;
  }
}
