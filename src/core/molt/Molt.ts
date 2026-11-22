import type { MoltPhase } from '../gameEvents';

/** Where a molt is: not at all, one of the phases of doc 10, or hardening. */
export type MoltStage = 'none' | MoltPhase | 'hardened';

export interface MoltTuning {
  /** Seconds of Hide in cover before the molt begins. */
  shelter: number;
  /** Seconds of the molt itself, without input. */
  molt: number;
  /** Seconds soft afterwards. */
  soft: number;
  /** Seconds the body takes to harden and grow. */
  hardened: number;
  /** Seconds of one premolt scratch, and the gap before the next, from and to. */
  scratch: number;
  scratchGap: [number, number];
  /** Speed while soft, as a share. */
  softSpeed: number;
}

export type MoltEvent = { type: 'phase'; phase: MoltStage } | { type: 'done' };

/**
 * One molt (doc 10, "Molting"). The signal waits until the shrimp shelters.
 * Two seconds of Hide in any cover begin the molt: six seconds without input
 * while the body arches and backs out of its old shell. Then thirty seconds
 * soft and slow, and three seconds to harden and grow.
 */
export class Molt {
  stage: MoltStage = 'none';
  /** Seconds in the stage. */
  time = 0;
  private sheltered = 0;
  private nextScratch = 0;

  constructor(
    private readonly tuning: MoltTuning,
    private readonly random: () => number,
  ) {}

  /** The shell has become too small. */
  signal(): MoltEvent[] {
    if (this.stage !== 'none') return [];
    this.nextScratch = this.gap();
    return this.enter('signal');
  }

  /** `tucked`: the shrimp is hidden under cover on this step. */
  step(dt: number, tucked: boolean): MoltEvent[] {
    if (this.stage === 'none') return [];
    this.time += dt;
    const t = this.tuning;
    switch (this.stage) {
      case 'signal':
        if (tucked) return this.enter('shelter');
        return [];
      case 'shelter':
        if (!tucked) return this.enter('signal');
        this.sheltered += dt;
        if (this.sheltered >= t.shelter) return this.enter('molt');
        return [];
      case 'molt':
        return this.time >= t.molt ? this.enter('soft') : [];
      case 'soft':
        return this.time >= t.soft ? this.enter('hardened') : [];
      case 'hardened':
        if (this.time < t.hardened) return [];
        this.stage = 'none';
        this.time = 0;
        return [{ type: 'phase', phase: 'none' }, { type: 'done' }];
    }
  }

  /** The keys do nothing: the molt itself. */
  get locked(): boolean {
    return this.stage === 'molt';
  }

  /** No threat may start, from the shelter until the shell is hard. */
  get guarded(): boolean {
    return this.stage === 'shelter' || this.stage === 'molt' || this.stage === 'soft';
  }

  /** Waiting to molt: the `premolt` condition. */
  get premolt(): boolean {
    return this.stage === 'signal' || this.stage === 'shelter';
  }

  /** Share of the player's speed. */
  get speed(): number {
    return this.stage === 'soft' ? this.tuning.softSpeed : 1;
  }

  /** 0 to 1 through the molt itself, or 0. */
  get through(): number {
    return this.stage === 'molt' ? Math.min(1, this.time / this.tuning.molt) : 0;
  }

  /** How far the body arches: up over the first third of the molt, held, then down. */
  get arch(): number {
    const through = this.through;
    if (through === 0) return 0;
    return Math.min(1, through * 3, (1 - through) * 4);
  }

  /** 0 to 1 through the hardening, when the body takes its colour and grows. 0 otherwise. */
  get hardening(): number {
    return this.stage === 'hardened' ? Math.min(1, this.time / this.tuning.hardened) : 0;
  }

  /** A rear leg scratches the shell now, while waiting to molt. */
  get scratching(): boolean {
    if (!this.premolt) return false;
    while (this.time >= this.nextScratch + this.tuning.scratch) {
      this.nextScratch += this.tuning.scratch + this.gap();
    }
    return this.time >= this.nextScratch;
  }

  private gap(): number {
    const [from, to] = this.tuning.scratchGap;
    return from + (to - from) * this.random();
  }

  private enter(stage: MoltStage): MoltEvent[] {
    // Waiting and sheltering are one stretch of time for the scratches.
    const keepTime =
      (stage === 'shelter' && this.stage === 'signal') ||
      (stage === 'signal' && this.stage === 'shelter');
    if (stage === 'signal' && this.stage === 'shelter') this.sheltered = 0;
    if (stage === 'shelter') this.sheltered = 0;
    if (!keepTime) this.time = 0;
    this.stage = stage;
    return [{ type: 'phase', phase: stage }];
  }
}
