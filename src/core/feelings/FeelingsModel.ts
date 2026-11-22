import { approach } from '../movement/angles';
import { MoodPicker, type Mood, type MoodTuning } from './mood';
import {
  CONDITIONS,
  type Condition,
  type Feelings,
  type FeelingsContext,
  type FeelingsTuning,
  type StimulusKind,
} from './types';

export interface ConditionChange {
  condition: Condition;
  on: boolean;
}

/** What changed on one step. */
export interface FeelingsChange {
  mood: { from: Mood; to: Mood } | null;
  conditions: ConditionChange[];
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

/** Moves `value` toward `target`, with one time when rising and another when falling. */
function follow(value: number, target: number, dt: number, rise: number, fall: number): number {
  return value + (target - value) * approach(dt, target > value ? rise : fall);
}

/**
 * The five feelings of one shrimp, its conditions and its mood, for the
 * player and later for every other shrimp. Stepped on the game clock with a
 * context the scene gathers. See docs/10-feelings-and-states.md.
 */
export class FeelingsModel {
  private readonly feelings: Feelings;
  private readonly picker: MoodPicker;
  private readonly conditions = new Set<Condition>();
  private forced: Mood | null = null;

  /** Seconds left of each timed condition. */
  private startledLeft = 0;
  private waryLeft = 0;
  private hiddenFor = 0;
  private stillFor = 0;
  /** Seconds fear is held where cornering put it. */
  private holdLeft = 0;
  /** The fright that is happening now ended in a cornering. */
  private corneredThisFright = false;
  private softLeft = 0;

  constructor(
    private readonly tuning: FeelingsTuning,
    moodTuning: MoodTuning,
    start: Partial<Feelings> = {},
  ) {
    this.feelings = {
      hunger: clamp(start.hunger ?? 0),
      fear: clamp(start.fear ?? 0),
      comfort: clamp(start.comfort ?? 0.5),
      curiosity: clamp(start.curiosity ?? 0),
      company: clamp(start.company ?? 0),
    };
    this.picker = new MoodPicker(moodTuning);
  }

  get values(): Readonly<Feelings> {
    return this.feelings;
  }

  /** The mood shown: the one picked, unless a debug key forces another. */
  get mood(): Mood {
    return this.forced ?? this.picker.mood;
  }

  get forcedMood(): Mood | null {
    return this.forced;
  }

  /** For the debug key only (doc 15). `null` lets the feelings decide again. */
  force(mood: Mood | null): void {
    this.forced = mood;
  }

  has(condition: Condition): boolean {
    return this.conditions.has(condition);
  }

  /** Every condition that holds, in the order of doc 10's table. */
  get conditionList(): Condition[] {
    return CONDITIONS.filter((condition) => this.conditions.has(condition));
  }

  /** For the molt: soft for this many seconds. */
  setSoft(seconds: number): void {
    this.softLeft = seconds;
  }

  /** For the molt: waiting to molt, from the signal until the molt begins. */
  setPremolt(on: boolean): void {
    if (on) this.conditions.add('premolt');
    else this.conditions.delete('premolt');
  }

  /** A new shell costs food: hunger rises by this much. */
  hungerUp(amount: number): void {
    this.feelings.hunger = clamp(this.feelings.hunger + amount);
  }

  /** How much more a fright bites right now. */
  get sensitivity(): number {
    const t = this.tuning.fear;
    return (this.softLeft > 0 ? t.softFactor : 1) * (this.waryLeft > 0 ? t.waryFactor : 1);
  }

  /**
   * Something happened to the shrimp. `amount` scales the gain, except for a
   * startle or the engine, where it is the gain itself, and the net's grid,
   * where it is the seconds spent under it.
   */
  stimulus(kind: StimulusKind, amount?: number): void {
    const t = this.tuning;
    switch (kind) {
      case 'tailFlip':
        this.feelings.hunger = clamp(this.feelings.hunger + t.hunger.tailFlip * (amount ?? 1));
        return;
      case 'discovery':
        this.feelings.comfort = clamp(this.feelings.comfort + t.comfort.discovery * (amount ?? 1));
        return;
      case 'cornered':
        this.feelings.fear = Math.max(this.feelings.fear, t.fear.cornered);
        this.holdLeft = t.fear.corneredHold;
        this.corneredThisFright = true;
        this.startledLeft = t.fear.startleTime;
        return;
      case 'startle':
        this.gain(amount ?? t.fear.gains.startle);
        this.waryLeft = Math.max(this.waryLeft, t.wary.afterStartle);
        return;
      case 'engine':
        this.gain(amount ?? t.fear.gains.engine);
        return;
      default:
        this.gain(t.fear.gains[kind] * (amount ?? 1));
    }
  }

  /** Eating takes hunger away, a little on every step of a graze. */
  eat(hungerRemoved: number): void {
    this.feelings.hunger = clamp(this.feelings.hunger - hungerRemoved);
  }

  private gain(raw: number): void {
    const t = this.tuning.fear;
    const added = Math.min(t.cap, raw * this.sensitivity);
    if (added <= 0) return;
    this.feelings.fear = clamp(this.feelings.fear + added);
    if (added >= t.startleGain) this.startledLeft = t.startleTime;
  }

  step(dt: number, context: FeelingsContext): FeelingsChange {
    const before = new Set(this.conditions);
    this.stepHunger(dt, context);
    this.stepFear(dt, context);
    this.stepCuriosity(dt, context);
    this.stepCompany(dt, context);
    this.stepComfort(dt, context);
    this.softLeft = Math.max(0, this.softLeft - dt);

    const moodBefore = this.picker.mood;
    const picked = this.picker.step(dt, {
      feelings: this.feelings,
      eating: context.activity === 'grazing',
    });
    // Wary starts when the afraid mood ends.
    if (moodBefore === 'afraid' && picked && picked.to !== 'afraid') {
      const t = this.tuning.wary;
      this.waryLeft = Math.max(
        this.waryLeft,
        this.corneredThisFright ? t.afterCornered : t.afterFright,
      );
      this.corneredThisFright = false;
    }
    this.stepConditions(dt, context);

    const conditions: ConditionChange[] = [];
    for (const condition of CONDITIONS) {
      const on = this.conditions.has(condition);
      if (on !== before.has(condition)) conditions.push({ condition, on });
    }
    return { mood: this.forced ? null : picked, conditions };
  }

  private stepHunger(dt: number, context: FeelingsContext): void {
    const t = this.tuning.hunger;
    let rate = t.walkRate;
    if (context.activity === 'drifting') rate = t.larvaRate;
    else if (context.hidden || context.activity === 'resting') rate *= t.stillFactor;
    else if (context.motion === 'rest') rate *= t.restFactor;
    else if (context.motion !== 'walk') rate *= t.swimFactor;
    this.feelings.hunger = clamp(this.feelings.hunger + rate * dt);
  }

  private stepFear(dt: number, context: FeelingsContext): void {
    const t = this.tuning.fear;
    const threat = context.threat;
    const present = threat !== null && threat.stage !== 'idle' && threat.stage !== 'release';

    if (this.holdLeft > 0) {
      this.holdLeft = Math.max(0, this.holdLeft - dt);
    } else {
      const watched =
        present &&
        threat.inSight &&
        (threat.stage === 'presence' || threat.stage === 'chase') &&
        !context.hidden;
      if (!watched) {
        const f = t.falls;
        let fall = f.open;
        if (context.companionWithin2) fall = Math.max(fall, f.companion);
        if (context.restingAgainstClose) fall = Math.max(fall, f.restingClose);
        if (context.hidden) fall = Math.max(fall, present ? f.hiddenNearThreat : f.hidden);
        this.feelings.fear = clamp(this.feelings.fear - fall * dt);
      }
    }
    if (present && threat.stage === 'chase' && threat.afterMe) {
      this.feelings.fear = Math.max(this.feelings.fear, t.chase);
    }
    if (present && threat.within8) this.feelings.fear = Math.max(this.feelings.fear, t.near);
  }

  private stepCuriosity(dt: number, context: FeelingsContext): void {
    const t = this.tuning.curiosity;
    const target = this.feelings.fear >= t.fearBlocks ? 0 : clamp(context.curiosityPull);
    this.feelings.curiosity = follow(this.feelings.curiosity, target, dt, t.rise, t.fall);
  }

  private stepCompany(dt: number, context: FeelingsContext): void {
    const t = this.tuning.company;
    const sum = context.neighbours.reduce((total, stage) => total + t.weights[stage], 0);
    this.feelings.company = follow(this.feelings.company, Math.min(1, sum), dt, t.rise, t.fall);
  }

  private stepComfort(dt: number, context: FeelingsContext): void {
    const t = this.tuning.comfort;
    const f = this.feelings;
    const sheltered = context.hidden || context.nearCover ? 1 : 0;
    const settled = context.activity === 'resting' ? 1 : 0;
    const target = clamp(
      t.base +
        t.fed * (1 - f.hunger) +
        t.sheltered * sheltered +
        t.company * f.company +
        t.settled * settled -
        t.fear * f.fear,
    );
    f.comfort = clamp(follow(f.comfort, target, dt, t.rise, t.fall));
  }

  private stepConditions(dt: number, context: FeelingsContext): void {
    const t = this.tuning;
    const f = this.feelings;

    this.startledLeft = Math.max(0, this.startledLeft - dt);
    this.hiddenFor = context.hidden ? this.hiddenFor + dt : 0;
    this.stillFor = context.moving ? 0 : this.stillFor + dt;
    if (this.waryLeft > 0) {
      this.waryLeft = Math.max(0, this.waryLeft - dt);
      if (this.hiddenFor >= t.wary.restEnds) this.waryLeft = 0;
    }

    const set = (condition: Condition, on: boolean): void => {
      if (on) this.conditions.add(condition);
      else this.conditions.delete(condition);
    };
    set('tired', context.tired);
    set('peckish', f.hunger >= t.hunger.peckish);
    set('veryHungry', f.hunger >= t.hunger.veryHungry);
    set('sheltered', context.hidden || context.nearCover);
    set('hidden', context.hidden && context.activity === 'hiding');
    set('burrowed', context.hidden && context.activity === 'burrowing');
    set('frozen', f.fear >= t.fear.freezeFear && this.stillFor >= t.fear.freezeAfter);
    set('startled', this.startledLeft > 0);
    set('wary', this.waryLeft > 0);
    set('soft', this.softLeft > 0);
    set('inCurrent', context.inCurrent);
  }

  /** Seconds of wariness left. For the screen, which fades the afraid edges over it. */
  get waryRemaining(): number {
    return this.waryLeft;
  }
}
