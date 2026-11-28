/**
 * A sand volcano (doc 11, `thing.sandVolcano`; T108): a small cone of sand
 * with a hole at the top. Now and then a puff of sand comes out. Something
 * lives below and is never seen. Nothing here knows about the engine.
 */

export interface VolcanoTuning {
  /** Seconds between puffs, at random in this range. */
  every: { min: number; max: number };
  /** Seconds a puff lasts. */
  puff: number;
}

export class Volcano {
  /** Seconds into the puff now, or null between puffs. */
  puffing: number | null = null;
  private wait: number;

  constructor(
    private readonly tuning: VolcanoTuning,
    private readonly random: () => number,
  ) {
    // Not all at once when the place opens.
    this.wait = this.between() * this.random();
  }

  /** How far through its puff it is, 0 to 1, or null. */
  get through(): number | null {
    return this.puffing === null ? null : Math.min(1, this.puffing / this.tuning.puff);
  }

  /** One step. Returns true on the step a puff begins. */
  step(dt: number): boolean {
    if (this.puffing !== null) {
      this.puffing += dt;
      if (this.puffing >= this.tuning.puff) this.puffing = null;
      return false;
    }
    this.wait -= dt;
    if (this.wait > 0) return false;
    this.wait = this.between();
    this.puffing = 0;
    return true;
  }

  private between(): number {
    const { min, max } = this.tuning.every;
    return min + (max - min) * this.random();
  }
}
