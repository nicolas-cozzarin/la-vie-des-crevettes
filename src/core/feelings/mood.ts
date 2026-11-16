import type { Feelings } from './types';

/** The feeling that leads at a given moment. Rules are in docs/10-feelings-and-states.md. */
export const MOODS = ['calm', 'hungry', 'content', 'curious', 'social', 'afraid'] as const;
export type Mood = (typeof MOODS)[number];

/** The order in which moods are checked. The first that is true wins. */
const ORDER: readonly Mood[] = ['afraid', 'content', 'hungry', 'curious', 'social', 'calm'];

export interface MoodTuning {
  /** Each mood driven by one feeling starts at `enter` and stops below `leave`. */
  afraid: { enter: number; leave: number };
  hungry: { enter: number; leave: number };
  curious: { enter: number; leave: number };
  social: { enter: number; leave: number };
  /** Seconds content lasts after a graze ends. */
  contentAfter: number;
  /** Seconds a new mood must stay true before it shows. Not for afraid. */
  newHolds: number;
  /** Seconds the old mood must have lasted before another replaces it. Not for afraid. */
  oldHolds: number;
}

/** What the picker needs besides the five feelings. */
export interface MoodInput {
  feelings: Readonly<Feelings>;
  /** Grazing, or in a first-taste wiggle. */
  eating: boolean;
}

/**
 * Picks the mood with enter and leave levels, so that a feeling resting on a
 * threshold does not make the mood flicker, and with two timers, so that
 * moods do not change faster than the eye can follow. Afraid always comes at
 * once: fear must never wait.
 */
export class MoodPicker {
  private current: Mood = 'calm';
  private held = Infinity;
  private pending: Mood | null = null;
  private pendingFor = 0;
  private readonly on = new Set<Mood>();
  private sinceEating = Infinity;

  constructor(private readonly tuning: MoodTuning) {}

  get mood(): Mood {
    return this.current;
  }

  /** Returns the change, if one happened on this step. */
  step(dt: number, input: MoodInput): { from: Mood; to: Mood } | null {
    this.held += dt;
    this.sinceEating = input.eating ? 0 : this.sinceEating + dt;
    const wanted = this.wanted(input.feelings);

    if (wanted === this.current) {
      this.pending = null;
      this.pendingFor = 0;
      return null;
    }
    if (wanted === 'afraid') return this.change('afraid');

    if (this.pending !== wanted) {
      this.pending = wanted;
      this.pendingFor = 0;
    }
    this.pendingFor += dt;
    if (this.pendingFor >= this.tuning.newHolds && this.held >= this.tuning.oldHolds) {
      return this.change(wanted);
    }
    return null;
  }

  private change(to: Mood): { from: Mood; to: Mood } {
    const from = this.current;
    this.current = to;
    this.held = 0;
    this.pending = null;
    this.pendingFor = 0;
    return { from, to };
  }

  /** The first mood in the order that is true now, with each one's own levels. */
  private wanted(feelings: Readonly<Feelings>): Mood {
    const t = this.tuning;
    this.level('afraid', feelings.fear, t.afraid);
    this.level('hungry', feelings.hunger, t.hungry);
    this.level('curious', feelings.curiosity, t.curious);
    this.level('social', feelings.company, t.social);
    if (this.sinceEating <= t.contentAfter) this.on.add('content');
    else this.on.delete('content');
    return ORDER.find((mood) => mood === 'calm' || this.on.has(mood)) ?? 'calm';
  }

  private level(mood: Mood, value: number, levels: { enter: number; leave: number }): void {
    if (value >= levels.enter) this.on.add(mood);
    else if (value < levels.leave) this.on.delete(mood);
  }
}
