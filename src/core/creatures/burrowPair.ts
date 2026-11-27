/**
 * The pistol shrimp and the goby that share one burrow (doc 11, "Pistol
 * shrimp and goby"; T107). The goby lies in the mouth, head out, and
 * watches. The shrimp digs, pushes a load of sand out like a bulldozer,
 * dumps it and backs in, one antenna on the goby's tail. A slow walk is
 * accepted; swimming or darting close by, or coming right up to the mouth,
 * and the goby flicks its tail and both are gone. They come out after a
 * calm. Nothing here knows about the engine.
 */

import type { Point } from '../movement/collision';

export interface BurrowPairTuning {
  /**
   * BL. Swimming or darting this close sends them in. A slow walk is
   * accepted down to `near`.
   */
  alarm: number;
  /** BL. Closer than this, even walking, and they go in. */
  near: number;
  /** Seconds of calm before they come out again. */
  calm: number;
  /** Seconds to go in, a flick, and to come out again. */
  goIn: number;
  comeOut: number;
  /** The shrimp's round, in seconds: digging inside, pushing out, dumping, backing in. */
  round: { dig: { min: number; max: number }; push: number; dump: number; back: number };
  /** Seconds a dumped load lies before it is smoothed away. */
  pile: number;
}

export type BurrowPhase = 'dig' | 'push' | 'dump' | 'back';

/** A dumped load of sand: how old it is, and which way it slid off the heap. */
export interface Pile {
  age: number;
  spread: number;
}

export interface BurrowPasser extends Point {
  /** Swimming or darting, not walking. */
  fast: boolean;
}

export class BurrowPair {
  /** How far out the goby is: 0 down the burrow, 1 lying in its mouth. */
  goby = 1;
  /** How far out the shrimp is: 0 in the burrow, 1 at the end of its push. */
  shrimp = 0;
  /** It has a load of sand ahead of its claws. */
  loaded = false;
  phase: BurrowPhase = 'dig';
  /** Both went in after a fright, and wait for calm. */
  inside = false;
  readonly piles: Pile[] = [];
  private phaseTime = 0;
  private digFor: number;
  private calmFor = 0;

  constructor(
    private readonly mouth: Point,
    private readonly bl: number,
    private readonly tuning: BurrowPairTuning,
    private readonly random: () => number,
  ) {
    this.digFor = this.digTime();
  }

  /** Both can be seen: the goby is out in the mouth. */
  get seen(): boolean {
    return !this.inside && this.goby >= 0.5;
  }

  /** A threat's cue: in at once. */
  hide(): void {
    this.inside = true;
    this.calmFor = 0;
  }

  /** One step. Returns true on the step the goby flicks its tail and they go. */
  step(dt: number, passer: BurrowPasser): boolean {
    const t = this.tuning;
    const distance = Math.hypot(passer.x - this.mouth.x, passer.y - this.mouth.y) / this.bl;
    const fright = (passer.fast && distance <= t.alarm) || distance < t.near;
    let flicked = false;
    if (fright) {
      if (!this.inside && this.goby > 0) flicked = true;
      this.inside = true;
      this.calmFor = 0;
    } else if (this.inside) {
      this.calmFor += dt;
      if (this.calmFor >= t.calm) this.inside = false;
    }
    for (const pile of this.piles) pile.age += dt;
    while (this.piles.length > 0 && (this.piles[0]?.age ?? 0) >= t.pile) this.piles.shift();
    if (this.inside) {
      // The goby first, in a flick; the shrimp drops its load and is gone after it.
      this.goby = Math.max(0, this.goby - dt / t.goIn);
      this.shrimp = Math.max(0, this.shrimp - dt / t.goIn);
      this.loaded = false;
      this.phase = 'dig';
      this.phaseTime = 0;
      return flicked;
    }
    this.goby = Math.min(1, this.goby + dt / t.comeOut);
    // The shrimp works only while the goby keeps watch in the mouth.
    if (this.goby < 1) return flicked;
    this.phaseTime += dt;
    switch (this.phase) {
      case 'dig':
        this.shrimp = 0;
        if (this.phaseTime >= this.digFor) this.enter('push');
        break;
      case 'push':
        this.loaded = true;
        this.shrimp = Math.min(1, this.phaseTime / t.round.push);
        if (this.phaseTime >= t.round.push) this.enter('dump');
        break;
      case 'dump':
        if (this.loaded) {
          this.loaded = false;
          this.piles.push({ age: 0, spread: this.random() * 2 - 1 });
        }
        if (this.phaseTime >= t.round.dump) this.enter('back');
        break;
      case 'back':
        this.shrimp = Math.max(0, 1 - this.phaseTime / t.round.back);
        if (this.phaseTime >= t.round.back) {
          this.digFor = this.digTime();
          this.enter('dig');
        }
        break;
    }
    return flicked;
  }

  private enter(phase: BurrowPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }

  private digTime(): number {
    const { min, max } = this.tuning.round.dig;
    return min + (max - min) * this.random();
  }
}
