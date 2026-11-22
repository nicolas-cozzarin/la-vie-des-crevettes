import type { CloudField } from '../core/drift/plankton';
import type { Rect } from '../core/world/zones';
import { WORLD } from './tuning';

/**
 * The Drift, chapter 0 (doc 11, "Chapter 0. Drift"). It is not an area like
 * the others: no bed, no cover, no shrimp, only open water carrying the larva
 * from left to right, so it has its own shape of data (T83).
 *
 * Things that drift are written where the larva meets them, not where they
 * are at the start: they drift too, slower than the larva.
 */
export interface DriftDef {
  id: 'drift';
  size: { w: number; h: number };
  /** The five zones, A to E, in the order the water runs through them. */
  zones: { id: 'A' | 'B' | 'C' | 'D' | 'E'; zone: Rect }[];
  /** Where the larva starts. */
  start: { x: number; y: number };
  /** The colour of the water along the Drift, by x. */
  water: { x: number; color: string }[];
  /** Where the clouds of motes lie. */
  clouds: CloudField[];
  copepods: { x: number; y: number }[];
  bells: { x: number; y: number; size: number }[];
  /** Bars of light from above, in the shafts. `lean` is in radians. */
  shafts: { x: number; width: number; lean: number }[];
  /** Shadows of leaves and roots far above, in the haze and at landfall. */
  rootShadows: { x: number; y: number; length: number; turn: number }[];
  /** Where the brown haze begins to rise, and where it is thickest. */
  haze: { from: number; to: number };
  /** Where the larva settles: chapter 1 begins. */
  landfall: number;
  /** 1 when the water runs to the right, -1 when the coast is turned round. */
  direction: 1 | -1;
}

const H = 1800;

export const DRIFT_AREA: DriftDef = {
  id: 'drift',
  size: { w: 9000, h: H },
  zones: [
    { id: 'A', zone: { x: 0, y: 0, w: 1500, h: H } },
    { id: 'B', zone: { x: 1500, y: 0, w: 3500, h: H } },
    { id: 'C', zone: { x: 5000, y: 0, w: 2000, h: H } },
    { id: 'D', zone: { x: 7000, y: 0, w: 1600, h: H } },
    { id: 'E', zone: { x: 8600, y: 0, w: 400, h: H } },
  ],
  // About ten seconds of the dark before the green.
  start: { x: 700, y: 900 },
  water: [
    { x: 0, color: '#04121A' },
    { x: 1500, color: '#0B2A3A' },
    { x: 5000, color: '#1E5A5C' },
    { x: 6600, color: '#3C8478' },
    { x: 7400, color: '#4C7466' },
    { x: 8600, color: '#7A6440' },
    { x: 9000, color: '#6E5A3A' },
  ],
  // The first motes come after the yolk, a little into the green.
  clouds: [
    { zone: { x: 2000, y: 0, w: 3000, h: H }, clouds: 12 },
    { zone: { x: 5000, y: 0, w: 2000, h: H }, clouds: 9 },
    { zone: { x: 7000, y: 0, w: 1200, h: H }, clouds: 2 },
  ],
  copepods: [
    { x: 2400, y: 640 },
    { x: 2900, y: 1150 },
    { x: 3350, y: 820 },
    { x: 3800, y: 1320 },
    { x: 4300, y: 560 },
    { x: 4700, y: 1000 },
    { x: 5300, y: 1240 },
    { x: 5800, y: 700 },
    { x: 6300, y: 1050 },
    { x: 6800, y: 600 },
  ],
  bells: [
    { x: 4200, y: 1060, size: 150 },
    { x: 5450, y: 700, size: 170 },
    { x: 5950, y: 1260, size: 140 },
    { x: 6400, y: 560, size: 200 },
    { x: 6850, y: 1120, size: 120 },
  ],
  shafts: [
    { x: 5100, width: 280, lean: 0.08 },
    { x: 5450, width: 320, lean: 0.12 },
    { x: 5800, width: 260, lean: 0.06 },
    { x: 6150, width: 340, lean: 0.1 },
    { x: 6500, width: 300, lean: 0.14 },
    { x: 6850, width: 260, lean: 0.08 },
  ],
  rootShadows: [
    { x: 7300, y: 620, length: 260, turn: 1.3 },
    { x: 7650, y: 1180, length: 320, turn: 1.6 },
    { x: 7950, y: 760, length: 420, turn: 1.2 },
    { x: 8250, y: 1300, length: 480, turn: 1.5 },
    { x: 8450, y: 500, length: 520, turn: 1.8 },
    { x: 8650, y: 980, length: 600, turn: 1.4 },
    { x: 8800, y: 400, length: 600, turn: 1.7 },
    { x: 8900, y: 1400, length: 580, turn: 1.25 },
  ],
  haze: { from: 7000, to: 8900 },
  landfall: 8600,
  direction: 1,
};

/** The Drift turned round: the water runs from right to left (T24). */
export function mirrorDrift(drift: DriftDef): DriftDef {
  const w = drift.size.w;
  const x = (value: number) => w - value;
  const rect = (zone: Rect): Rect => ({ ...zone, x: w - zone.x - zone.w });
  return {
    ...drift,
    zones: drift.zones.map((zone) => ({ ...zone, zone: rect(zone.zone) })),
    start: { ...drift.start, x: x(drift.start.x) },
    water: drift.water.map((stop) => ({ ...stop, x: x(stop.x) })).reverse(),
    clouds: drift.clouds.map((field) => ({ ...field, zone: rect(field.zone) })),
    copepods: drift.copepods.map((one) => ({ ...one, x: x(one.x) })),
    bells: drift.bells.map((one) => ({ ...one, x: x(one.x) })),
    shafts: drift.shafts.map((one) => ({ ...one, x: x(one.x), lean: -one.lean })),
    rootShadows: drift.rootShadows.map((one) => ({ ...one, x: x(one.x), turn: -one.turn })),
    haze: { from: x(drift.haze.from), to: x(drift.haze.to) },
    landfall: x(drift.landfall),
    direction: drift.direction === 1 ? -1 : 1,
  };
}

/** The Drift as it is played: turned round if the coast is (`WORLD.mirror`). */
export function driftFor(): DriftDef {
  return WORLD.mirror ? mirrorDrift(DRIFT_AREA) : DRIFT_AREA;
}

/** A point given as the data file writes it, such as `?explore=drift&at=x,y`, where it is as played. */
export function driftPoint(x: number, y: number): { x: number; y: number } {
  return WORLD.mirror ? { x: DRIFT_AREA.size.w - x, y } : { x, y };
}
