import type { ActivityName } from '../activity/Activity';
import type { MotionMode } from '../movement/ShrimpMotion';

/**
 * The words of docs/10-feelings-and-states.md as types. Nothing here knows
 * about the engine or the data files.
 */

/** Five numbers from 0 to 1: the inside of a shrimp. */
export interface Feelings {
  hunger: number;
  fear: number;
  comfort: number;
  curiosity: number;
  company: number;
}

/** Yes or no facts about a shrimp that change rules or posture. */
export const CONDITIONS = [
  'tired',
  'peckish',
  'veryHungry',
  'sheltered',
  'hidden',
  'burrowed',
  'frozen',
  'startled',
  'wary',
  'premolt',
  'soft',
  'inCurrent',
] as const;
export type Condition = (typeof CONDITIONS)[number];

/** Things that happen to a shrimp and move a feeling. */
export const STIMULUS_KINDS = [
  /** A large shadow crosses within 3 BL. */
  'shadow',
  /** A predator comes into sight. Once per visit. */
  'predatorSeen',
  /** A strike or charge misses nearby. */
  'missNearby',
  /** A companion or neighbour takes fright within 5 BL. */
  'alarm',
  /** A sudden harmless event. The amount, if given, is the gain: 0.15 to 0.25. */
  'startle',
  /** The engine. The amount, if given, is the gain on this step. */
  'engine',
  /** Under the net's grid. The amount is the seconds spent there on this step. */
  'netGrid',
  /** A strike or charge lands. */
  'cornered',
  /** Something new comes into the journal. */
  'discovery',
  /** The shrimp itself flips its tail. */
  'tailFlip',
] as const;
export type StimulusKind = (typeof STIMULUS_KINDS)[number];

export type BondStage = 'stranger' | 'familiar' | 'companion' | 'close';
export type ThreatStage = 'idle' | 'cue' | 'presence' | 'chase' | 'cornered' | 'release';
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** What the feelings need to know about a threat on this step. */
export interface ThreatView {
  stage: ThreatStage;
  /** The predator can be seen from where the shrimp is. */
  inSight: boolean;
  within8: boolean;
  /** The chase is after this shrimp. */
  afterMe: boolean;
}

/**
 * What the scene gathers about the world for one step. The model never looks
 * at the world itself.
 */
export interface FeelingsContext {
  motion: MotionMode;
  activity: ActivityName;
  /** Tucked in under cover, or dug into sand. */
  hidden: boolean;
  /** The edge of a cover is within 1.5 BL. */
  nearCover: boolean;
  /** The player steers, or the shrimp moves by its own choice. */
  moving: boolean;
  /** From `ShrimpMotion`: after three tail flips in a row. */
  tired: boolean;
  /** Bond stage of every shrimp within 4 BL. */
  neighbours: readonly BondStage[];
  /** A shrimp with a bond of 0.5 or more is within 2 BL. */
  companionWithin2: boolean;
  restingAgainstClose: boolean;
  /** 0 to 1, the pull of the nearest unknown thing. */
  curiosityPull: number;
  threat: ThreatView | null;
  inCurrent: boolean;
  dayPhase: DayPhase | null;
}

/** A context with nothing going on: a shrimp alone in the open, standing still. */
export const QUIET_CONTEXT: FeelingsContext = {
  motion: 'rest',
  activity: 'free',
  hidden: false,
  nearCover: false,
  moving: false,
  tired: false,
  neighbours: [],
  companionWithin2: false,
  restingAgainstClose: false,
  curiosityPull: 0,
  threat: null,
  inCurrent: false,
  dayPhase: null,
};

export interface HungerTuning {
  /** Per second while walking: 1/240 empties to full in 4 minutes. */
  walkRate: number;
  restFactor: number;
  /** Hidden, burrowed or resting. */
  stillFactor: number;
  swimFactor: number;
  /** A larva in the Drift, per second. */
  larvaRate: number;
  tailFlip: number;
  peckish: number;
  veryHungry: number;
}

export interface FearTuning {
  /**
   * Fear added by each stimulus. `startle` and `engine` are the gain when the
   * caller gives none. `netGrid` is per second.
   */
  gains: Record<
    'shadow' | 'predatorSeen' | 'missNearby' | 'alarm' | 'startle' | 'engine' | 'netGrid',
    number
  >;
  /** One stimulus never adds more than this. */
  cap: number;
  /** Fear is set to this when cornered, and held for `corneredHold` seconds. */
  cornered: number;
  corneredHold: number;
  softFactor: number;
  waryFactor: number;
  /** Falls per second. Only the largest that applies is used. */
  falls: {
    open: number;
    companion: number;
    restingClose: number;
    hidden: number;
    hiddenNearThreat: number;
  };
  /** Floors. */
  chase: number;
  near: number;
  /** A gain this large or more makes the body flinch. */
  startleGain: number;
  startleTime: number;
  /** Fear and quiet seconds before a still shrimp freezes. */
  freezeFear: number;
  freezeAfter: number;
}

export interface ComfortTuning {
  base: number;
  fed: number;
  sheltered: number;
  company: number;
  settled: number;
  fear: number;
  rise: number;
  fall: number;
  discovery: number;
}

export interface RiseFall {
  rise: number;
  fall: number;
}

export interface CompanyTuning extends RiseFall {
  weights: Record<BondStage, number>;
}

export interface WaryTuning {
  afterFright: number;
  afterCornered: number;
  afterStartle: number;
  /** Seconds hidden that end it early. */
  restEnds: number;
}

/** What the time of day does to the feelings, from chapter 2 (doc 10, "Day and night"). */
export interface DayFeelingsTuning {
  /** By day, in the open, fear falls at this share of its speed. */
  openFall: number;
  /** Added to comfort's target by day in the open. */
  openComfort: number;
  /** Added to comfort's target at dusk. */
  duskComfort: number;
}

export interface FeelingsTuning {
  hunger: HungerTuning;
  fear: FearTuning;
  comfort: ComfortTuning;
  curiosity: RiseFall & { fearBlocks: number };
  company: CompanyTuning;
  wary: WaryTuning;
  /** Without it, the time of day changes nothing. */
  day?: DayFeelingsTuning;
}
