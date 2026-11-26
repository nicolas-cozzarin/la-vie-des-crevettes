import type { DayPhase } from '../feelings/types';

/**
 * Day and night (doc 02, "Day and night"; doc 10, "Day and night"): from
 * chapter 2 the light turns through day, dusk, night and dawn, in one cycle
 * of a few minutes. The cycle knows only time. The scene asks it for the
 * light to draw and the feelings ask it for the phase.
 */

export const DAY_PHASES: readonly DayPhase[] = ['day', 'dusk', 'night', 'dawn'];

export interface DayTuning {
  /** Seconds each phase lasts. Together, one full cycle. */
  length: Record<DayPhase, number>;
  /** Seconds for the light to ease from one phase's look to the next. */
  ease: number;
  /** How strongly the gold of dusk and the indigo of night lie over everything, 0 to 1. */
  dusk: number;
  night: number;
  /** The share of the caustics left at dusk. None at night. */
  duskCaustics: number;
}

/** What the light looks like at one moment. Each part is 0 to 1. */
export interface DayLight {
  /** The gold of dusk. */
  dusk: number;
  /** The indigo of night. */
  night: number;
  /** How much of the caustics shows. */
  caustics: number;
  /** How much of the glowing plankton shows. */
  plankton: number;
}

/** The light a phase asks for, `along` its length from 0 to 1. */
export function phaseLight(phase: DayPhase, along: number, tuning: DayTuning): DayLight {
  switch (phase) {
    case 'day':
      return { dusk: 0, night: 0, caustics: 1, plankton: 0 };
    case 'dusk':
      return { dusk: tuning.dusk, night: 0, caustics: tuning.duskCaustics, plankton: 0 };
    case 'night':
      return { dusk: 0, night: tuning.night, caustics: 0, plankton: 1 };
    case 'dawn': {
      // Dawn is the night lifting: the indigo thins from half to nothing, the caustics come back.
      const left = 1 - Math.min(1, Math.max(0, along));
      return { dusk: 0, night: tuning.night * 0.5 * left, caustics: 1 - left, plankton: left };
    }
  }
}

export interface DayCycleState {
  phase: DayPhase;
  /** Seconds into the phase. */
  into: number;
}

export class DayCycle {
  private phaseNow: DayPhase;
  private into: number;
  private lightNow: DayLight;

  constructor(
    private readonly tuning: DayTuning,
    start: DayCycleState = { phase: 'day', into: 0 },
  ) {
    this.phaseNow = start.phase;
    this.into = Math.max(0, start.into);
    this.lightNow = phaseLight(this.phaseNow, this.along, tuning);
  }

  get phase(): DayPhase {
    return this.phaseNow;
  }

  /** How far through its phase the cycle is, 0 to 1. */
  get along(): number {
    return Math.min(1, this.into / this.tuning.length[this.phaseNow]);
  }

  /** Seconds left in this phase. */
  get left(): number {
    return Math.max(0, this.tuning.length[this.phaseNow] - this.into);
  }

  /** The light as it is now, eased between phases. */
  get light(): Readonly<DayLight> {
    return this.lightNow;
  }

  get state(): DayCycleState {
    return { phase: this.phaseNow, into: this.into };
  }

  /** Moves the cycle on. Returns the phases begun on this step, in order. */
  step(dt: number): DayPhase[] {
    const begun: DayPhase[] = [];
    this.into += dt;
    while (this.into >= this.tuning.length[this.phaseNow]) {
      this.into -= this.tuning.length[this.phaseNow];
      this.phaseNow = next(this.phaseNow);
      begun.push(this.phaseNow);
    }
    this.easeLight(dt);
    return begun;
  }

  /**
   * Goes straight to the start of a phase, as "Rest until dusk" does. The
   * light eases there like any change. Returns the phase if it began now.
   */
  skipTo(phase: DayPhase): DayPhase | null {
    if (this.phaseNow === phase) return null;
    this.phaseNow = phase;
    this.into = 0;
    return phase;
  }

  private easeLight(dt: number): void {
    const want = phaseLight(this.phaseNow, this.along, this.tuning);
    // Nearly all the way in `ease` seconds, as the other screen changes do.
    const k = this.tuning.ease > 0 ? 1 - Math.exp((-3 * dt) / this.tuning.ease) : 1;
    const now = this.lightNow;
    this.lightNow = {
      dusk: now.dusk + (want.dusk - now.dusk) * k,
      night: now.night + (want.night - now.night) * k,
      caustics: now.caustics + (want.caustics - now.caustics) * k,
      plankton: now.plankton + (want.plankton - now.plankton) * k,
    };
  }
}

/** The phase after this one. */
export function next(phase: DayPhase): DayPhase {
  const at = DAY_PHASES.indexOf(phase);
  return DAY_PHASES[(at + 1) % DAY_PHASES.length] ?? 'day';
}
