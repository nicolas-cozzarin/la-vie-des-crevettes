/**
 * Open water (doc 11, "Chapter 5"): where no bed lies under the water. Over
 * the bed a shrimp walks and its shadow falls on the sand; beyond it the
 * shrimp only swims, and its shadow fades out with the bed (T122). Nothing
 * here knows about the engine.
 */

/** Where the bed lies under a place's water, and how far its edge fades. */
export interface BedDef {
  zone: { x: number; y: number; w: number; h: number };
  /** Pixels beyond the zone over which the bed fades into the blue. */
  fade: number;
}

/**
 * How much bed lies under (x, y): 1 over it, 0 in open water, fading in
 * between. A place with no `bed` is bed everywhere.
 */
export function overBed(bed: BedDef | undefined, x: number, y: number): number {
  if (!bed) return 1;
  const { zone } = bed;
  const dx = Math.max(zone.x - x, 0, x - (zone.x + zone.w));
  const dy = Math.max(zone.y - y, 0, y - (zone.y + zone.h));
  const gap = Math.hypot(dx, dy);
  if (gap === 0) return 1;
  if (bed.fade <= 0) return 0;
  return Math.max(0, 1 - gap / bed.fade);
}

/** Below this much bed, the shrimp is afloat: it cannot walk and does not settle. */
export const AFLOAT_BELOW = 0.5;
