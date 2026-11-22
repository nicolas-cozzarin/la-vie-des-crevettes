import type { Condition } from '../core/feelings/types';
import type { Mood } from '../core/feelings/mood';
import type { LifeStage } from '../core/world/kinds';

/**
 * How a shrimp holds its body. The rig eases toward these numbers.
 * The table and its reasons are in docs/14-art-production.md.
 * No feeling is ever shown with a face: posture, antennae and tail fan carry it.
 */
export interface RigExpression {
  /** Radians from straight ahead, at the base of each antenna. */
  antennaAngle: number;
  /** Radians added at each link toward the tip. */
  antennaCurl: number;
  /** Radians. The size of the slow sweep. */
  antennaSweep: number;
  /** Radians per second. */
  antennaSweepRate: number;
  /** 0 loose and trailing, 1 held rigid. */
  antennaStiff: number;
  /** 0 to 1. How far the antennae turn toward the target point. */
  aim: number;
  /** Radians per second of the antennules' flick. */
  antennuleRate: number;
  /** Radians. The size of the flick. */
  antennuleFlick: number;
  /** Tail fan spread, 0 shut to 1 wide. null: movement decides. */
  fan: number | null;
  /** Radians, side to side. */
  fanSway: number;
  /** 0 to 1. Abdomen drawn in: the body is up to 8% shorter. */
  tuck: number;
  /** 0 to 1. Pressed to the bed: shadow tight, legs in. */
  flat: number;
  /** BL. The carapace leans toward the target point. */
  lean: number;
  /** Pixels. A fine fast shake. */
  tremble: number;
  /** Multiplier on how far the legs reach. */
  legReach: number;
  /** Radians. A slow rocking of the body. */
  rock: number;
}

/** What does not change from moment to moment. */
export interface RigLook {
  bodyLengthPx: number;
  /** BL. Juvenile 1.0, sub-adult 1.25, adult 1.5. */
  antennaLength: number;
  /** 1, or 0.67 for Brise. */
  leftAntennaFactor: number;
  /** 0 to 1. How pale the tail fan is. 0.8 for Nacre. */
  fanPale: number;
  /** 1, or more for Écume's darker gut line. */
  gutAlpha: number;
  /** 1.15 for a juvenile, else 1. */
  eyeScale: number;
  /** 1, or 0.85 while the new shell is soft. */
  alpha: number;
  /** Multiplies the body's colour: white for none. Unnamed shrimp differ a little (doc 11). */
  tint: number;
}

export const DEFAULT_LOOK: RigLook = {
  bodyLengthPx: 110,
  antennaLength: 1.0,
  leftAntennaFactor: 1,
  fanPale: 0,
  gutAlpha: 1,
  eyeScale: 1.15,
  alpha: 1,
  tint: 0xffffff,
};

/** What changes in the look as the shrimp grows. Larva is drawn by its own rig. */
export const STAGE_LOOKS: Readonly<Record<LifeStage, Partial<RigLook>>> = {
  larva: {},
  juvenile: { antennaLength: 1.0, eyeScale: 1.15 },
  subAdult: { antennaLength: 1.25, eyeScale: 1 },
  adult: { antennaLength: 1.5, eyeScale: 1 },
};

export const MOOD_EXPRESSIONS: Readonly<Record<Mood, RigExpression>> = {
  calm: {
    antennaAngle: 0.5,
    antennaCurl: 0.115,
    antennaSweep: 0.14,
    antennaSweepRate: 0.8,
    antennaStiff: 0.3,
    aim: 0,
    antennuleRate: 5.2,
    antennuleFlick: 0.05,
    fan: null,
    fanSway: 0,
    tuck: 0,
    flat: 0,
    lean: 0,
    tremble: 0,
    legReach: 1,
    rock: 0,
  },
  hungry: {
    antennaAngle: 0.34,
    antennaCurl: 0.1,
    antennaSweep: 0.1,
    antennaSweepRate: 3.2,
    antennaStiff: 0.5,
    aim: 0,
    antennuleRate: 16,
    antennuleFlick: 0.09,
    fan: 0.33,
    fanSway: 0,
    tuck: 0.5,
    flat: 0,
    lean: 0,
    tremble: 0,
    legReach: 1,
    rock: 0,
  },
  content: {
    antennaAngle: 0.62,
    antennaCurl: 0.14,
    antennaSweep: 0.08,
    antennaSweepRate: 0.5,
    antennaStiff: 0.15,
    aim: 0,
    antennuleRate: 3.5,
    antennuleFlick: 0.04,
    fan: 0.5,
    fanSway: 0.18,
    tuck: 0,
    flat: 0,
    lean: 0,
    tremble: 0,
    legReach: 1,
    rock: 0.03,
  },
  curious: {
    antennaAngle: 0.12,
    antennaCurl: 0.02,
    antennaSweep: 0.03,
    antennaSweepRate: 1.0,
    antennaStiff: 0.8,
    aim: 1,
    antennuleRate: 9,
    antennuleFlick: 0.06,
    fan: 0.5,
    fanSway: 0,
    tuck: 0,
    flat: 0,
    lean: 0.05,
    tremble: 0,
    legReach: 1.05,
    rock: 0,
  },
  social: {
    antennaAngle: 0.3,
    antennaCurl: 0.06,
    antennaSweep: 0.06,
    antennaSweepRate: 1.6,
    antennaStiff: 0.6,
    aim: 0.8,
    antennuleRate: 7,
    antennuleFlick: 0.06,
    fan: 0.5,
    fanSway: 0.06,
    tuck: 0,
    flat: 0,
    lean: 0.02,
    tremble: 0,
    legReach: 1,
    rock: 0,
  },
  afraid: {
    antennaAngle: 2.55,
    antennaCurl: 0.03,
    antennaSweep: 0,
    antennaSweepRate: 0,
    antennaStiff: 1,
    aim: 0,
    antennuleRate: 0,
    antennuleFlick: 0,
    fan: 0,
    fanSway: 0,
    tuck: 0.2,
    flat: 1,
    lean: 0,
    tremble: 0.7,
    legReach: 0.6,
    rock: 0,
  },
};

/**
 * The mood's expression with the conditions applied after it, as the table
 * "Conditions change the expression" in doc 14 says. `inCurrent` and
 * `startled` move the whole rig, so the rig applies them itself.
 */
export function withConditions(
  base: RigExpression,
  has: (condition: Condition) => boolean,
): RigExpression {
  const e = { ...base };
  if (has('wary')) {
    e.antennaAngle += 0.1;
    e.antennaStiff = Math.min(1, e.antennaStiff + 0.2);
    e.antennaSweepRate *= 1.5;
  }
  if (has('soft')) {
    e.antennaSweepRate *= 0.6;
    e.antennuleRate *= 0.6;
    e.antennaAngle += 0.15;
    e.antennaCurl += 0.04;
  }
  if (has('veryHungry')) e.aim = Math.max(e.aim, 0.5);
  if (has('tired')) e.fan = 0.1;
  if (has('frozen')) {
    e.antennaSweepRate = 0;
    e.antennuleRate = 0;
    e.fanSway = 0;
    e.rock = 0;
    e.flat = 1;
    e.tremble = 0;
  }
  return e;
}

/**
 * What the activity adds after the mood and conditions. Sensing: the antennae
 * sweep wide and slow (doc 10, "Activities"). Grazing is drawn by the rig's
 * own picking loop.
 */
export function withActivity(base: RigExpression, sensing: boolean): RigExpression {
  if (!sensing) return base;
  return {
    ...base,
    antennaAngle: base.antennaAngle + 0.12,
    antennaSweep: Math.max(base.antennaSweep, 0.42),
    antennaSweepRate: Math.min(base.antennaSweepRate, 0.6),
    antennaStiff: Math.max(base.antennaStiff, 0.35),
    aim: 0,
  };
}
