/** When to save at rest (doc 02, "Saving"). */
export interface RestTuning {
  /** Seconds still under cover before it counts as a rest. */
  rest: number;
  /** Seconds at least between two saves at rest. */
  gap: number;
}

/**
 * Says when a rest under cover has lasted long enough to save. Each rest
 * saves once; a new rest must begin, and the gap must have passed, before
 * the next.
 */
export class RestSaver {
  private still = 0;
  private saved = false;
  private since = Infinity;

  constructor(private readonly tuning: RestTuning) {}

  /** True on the step a save is due. */
  step(dt: number, resting: boolean): boolean {
    this.since += dt;
    if (!resting) {
      this.still = 0;
      this.saved = false;
      return false;
    }
    this.still += dt;
    if (this.saved || this.still < this.tuning.rest || this.since < this.tuning.gap) return false;
    this.saved = true;
    this.since = 0;
    return true;
  }

  /** A save was made another way, such as at a chapter's start. */
  savedNow(): void {
    this.since = 0;
  }
}
