import type { Mood } from '../feelings/mood';
import { approach } from '../movement/angles';

/**
 * The music follows the shrimp by mixing, not by rearranging (doc 05, "Music
 * that follows the shrimp", and doc 10, "Sound"). This turns the mood and a
 * few conditions into levels that ease over time. Nothing here knows about
 * the engine: the levels are numbers for it to apply.
 */

export interface MixTuning {
  /** Seconds to reach most of a change: the least, for any change (doc 10: never under 0.5). */
  ease: number;
  /** Into fear: the area track dulls and the uneasy track comes up. */
  fear: number;
  /** After a threat: the uneasy track goes down to its wary level and the area track opens. */
  relief: number;
  /** The chime and the shimmer joining or leaving. */
  layers: number;
  /** Going under cover, or coming out. */
  muffle: number;
  /** Sound coming back after being cornered. */
  back: number;
  /** Level of the area track by mood, 1 as recorded. */
  area: { normal: number; content: number; hungry: number; afraid: number };
  /** Low-pass on the area track by mood, in Hz. */
  bright: { normal: number; content: number; afraid: number };
  /** Level of the uneasy track: afraid, and at the start of the wary time. */
  uneasy: { afraid: number; wary: number };
  chime: number;
  shimmer: number;
  /** Low-pass on music and ambience, in Hz: open, and hidden under cover. */
  open: number;
  hidden: number;
  /** The shrimp's own sounds while soft after a molt. */
  soft: { level: number; bright: number };
  /** The ambience comes forward while frozen. */
  frozenAmbience: number;
}

/** What the mix needs to know on each step. */
export interface MixInput {
  mood: Mood;
  hidden: boolean;
  wary: boolean;
  /** Seconds of wariness left. */
  waryLeft: number;
  frozen: boolean;
  soft: boolean;
  /** How dark being cornered has made the picture, 0 to 1. */
  dark: number;
}

/** Levels for the engine. Gains are 1 as recorded; filters are in Hz. */
export interface MixLevels {
  area: number;
  areaBright: number;
  uneasy: number;
  chime: number;
  shimmer: number;
  ambience: number;
  /** Low-pass on music and ambience. */
  muffle: number;
  /** The shrimp's own sounds. */
  own: number;
  ownBright: number;
  /** 1 is all sound, 0 none: being cornered takes it away. */
  heard: number;
}

/** A quiet moment: calm, in the open, nothing remembered. */
export const QUIET_INPUT: MixInput = {
  mood: 'calm',
  hidden: false,
  wary: false,
  waryLeft: 0,
  frozen: false,
  soft: false,
  dark: 0,
};

/** Exponential easing reaches about 95% after three time constants. */
const TO_MOST = 3;

function ease(value: number, target: number, dt: number, seconds: number): number {
  return value + (target - value) * approach(dt, seconds / TO_MOST);
}

/** Filters ease by octaves, so a fall from 9000 Hz to 500 Hz sounds even. */
function easeHz(value: number, target: number, dt: number, seconds: number): number {
  return 2 ** ease(Math.log2(value), Math.log2(target), dt, seconds);
}

export class SoundMix {
  private now: MixLevels;
  /** The wary seconds there were when the wary time began, to fade the uneasy track over them. */
  private waryFrom = 0;

  constructor(
    private readonly tuning: MixTuning,
    start: MixInput = QUIET_INPUT,
  ) {
    this.now = this.target(start);
  }

  get levels(): Readonly<MixLevels> {
    return this.now;
  }

  /** Where the levels are heading for this input, before easing. */
  target(input: MixInput): MixLevels {
    const t = this.tuning;
    const afraid = input.mood === 'afraid';
    const area =
      input.mood === 'afraid'
        ? t.area.afraid
        : input.mood === 'content'
          ? t.area.content
          : input.mood === 'hungry'
            ? t.area.hungry
            : t.area.normal;
    const areaBright = afraid
      ? t.bright.afraid
      : input.mood === 'content'
        ? t.bright.content
        : t.bright.normal;
    let uneasy = 0;
    if (afraid) uneasy = t.uneasy.afraid;
    else if (input.wary && this.waryFrom > 0) {
      uneasy = t.uneasy.wary * Math.min(1, input.waryLeft / this.waryFrom);
    }
    return {
      area,
      areaBright,
      uneasy,
      chime: input.mood === 'social' ? t.chime : 0,
      shimmer: input.mood === 'curious' ? t.shimmer : 0,
      ambience: input.frozen ? t.frozenAmbience : 1,
      muffle: input.hidden ? t.hidden : t.open,
      own: input.frozen ? 0 : input.soft ? t.soft.level : 1,
      ownBright: input.soft ? t.soft.bright : t.open,
      heard: 1 - input.dark,
    };
  }

  step(dt: number, input: MixInput): Readonly<MixLevels> {
    const t = this.tuning;
    if (!input.wary) this.waryFrom = 0;
    else if (input.mood !== 'afraid') this.waryFrom = Math.max(this.waryFrom, input.waryLeft);
    const target = this.target(input);
    const afraid = input.mood === 'afraid';
    // Into fear over 1.5 s; out of it, while wary, over 4 s; anything else over the least.
    const main = afraid ? t.fear : input.wary ? t.relief : t.ease;
    const now = this.now;
    // Being cornered takes the sound as fast as the picture goes dark, and gives it back slowly.
    const heard =
      target.heard < now.heard ? target.heard : ease(now.heard, target.heard, dt, t.back);
    this.now = {
      area: ease(now.area, target.area, dt, main),
      areaBright: easeHz(now.areaBright, target.areaBright, dt, main),
      uneasy: ease(now.uneasy, target.uneasy, dt, main),
      chime: ease(now.chime, target.chime, dt, t.layers),
      shimmer: ease(now.shimmer, target.shimmer, dt, t.layers),
      ambience: ease(now.ambience, target.ambience, dt, t.ease),
      muffle: easeHz(now.muffle, target.muffle, dt, t.muffle),
      own: ease(now.own, target.own, dt, t.ease),
      ownBright: easeHz(now.ownBright, target.ownBright, dt, t.ease),
      heard,
    };
    return this.now;
  }
}
