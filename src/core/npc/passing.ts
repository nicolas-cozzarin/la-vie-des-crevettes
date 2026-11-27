/**
 * Strangers passing through (doc 11, `shrimp.traveller`; T114): small groups
 * of other shrimp that come down the area's journey from beyond its start
 * and go on past its end, all heading for the sea. This keeps the time
 * between groups and says how many come. Where they come in, and when they
 * have gone, needs the view, and is the system's. Nothing here knows about
 * the engine.
 */

export interface PassingTuning {
  /** Seconds before the first group, from arriving. */
  first: readonly [number, number];
  /** Seconds from one group coming in to the next, counted only once the last has gone. */
  every: readonly [number, number];
  /** How many in a group, at least and at most. */
  group: readonly [number, number];
  /** Seconds to wait when there is no place out of view for a group to come in. */
  retry: number;
}

export class Passing {
  private wait: number;
  private forced = false;

  constructor(
    private readonly tuning: PassingTuning,
    private readonly random: () => number,
  ) {
    this.wait = this.between(tuning.first);
  }

  /** Seconds before the next group may come. */
  get due(): number {
    return Math.max(0, this.wait);
  }

  /**
   * `dt` seconds pass. While a group is still here (`passing`), the next one
   * waits. Returns how many come now, or 0.
   */
  step(dt: number, passing: boolean): number {
    if (!this.forced) {
      if (passing) return 0;
      this.wait -= dt;
      if (this.wait > 0) return 0;
    }
    this.forced = false;
    this.wait = this.between(this.tuning.every);
    const [least, most] = this.tuning.group;
    return least + Math.min(most - least, Math.floor(this.random() * (most - least + 1)));
  }

  /** The group could not come in unseen: it tries again soon. */
  later(): void {
    this.wait = this.tuning.retry;
  }

  /** With `?debug`: a group comes on the next step, even while another passes. */
  now(): void {
    this.forced = true;
  }

  private between([from, to]: readonly [number, number]): number {
    return from + this.random() * (to - from);
  }
}

/**
 * How far along the journey a group comes in: `reach` pixels upstream of
 * the player, so out of view, and at most `before` pixels before the
 * journey's start, where it comes from beyond the area's edge.
 */
export function entryAlong(playerAlong: number, reach: number, before: number): number {
  return Math.max(-before, playerAlong - reach);
}
