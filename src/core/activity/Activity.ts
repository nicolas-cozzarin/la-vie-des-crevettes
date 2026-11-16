import { distanceToCover, nearestCover, tuckPoint, type CoverSpot } from '../world/cover';

/**
 * What the body is busy with, on top of how it moves. One at a time. This
 * step has `free` and `hiding`; the rest of doc 10's table joins later.
 * See docs/10-feelings-and-states.md, "Activities".
 */
export type ActivityName = 'free' | 'hiding';

export interface HideTuning {
  /** BL. Hide starts when a cover's edge is this close. */
  reach: number;
  /** Share of the radius from the centre at which the shrimp tucks in. */
  tuck: number;
  /** BL. Closer than this to the tuck point counts as tucked in. */
  settled: number;
  /** BL. Within this of the tuck point, the walk eases to a stop. */
  slowing: number;
}

export interface ActivityInput {
  /** Seconds since the last update. */
  dt: number;
  x: number;
  y: number;
  /** Hide, after hold or toggle is applied. */
  hide: boolean;
  /** True on the frame the tail flip key goes down. */
  tailFlip: boolean;
  /** The player's own direction, each axis from -1 to 1. */
  axis: { x: number; y: number };
}

export interface ActivityResult {
  /** The direction to feed the motion: the player's own, or the walk to cover. */
  axis: { x: number; y: number };
}

/** Seconds without progress after which a shrimp under cover stops walking in. */
const STALL_SECONDS = 0.3;

export class Activity<T extends CoverSpot = CoverSpot> {
  name: ActivityName = 'free';
  /** The cover being hidden under. */
  cover: T | null = null;
  /** Under the cover and settled: the `hidden` condition of doc 10. */
  tucked = false;
  private target = { x: 0, y: 0 };
  /** Seconds without getting closer: something solid is in the way. */
  private stalled = 0;
  private lastDistance = Infinity;

  constructor(
    private readonly tuning: HideTuning,
    private readonly bodyLengthPx: number,
  ) {}

  /** Whether Hide would start here: a cover is within reach. */
  canHide(x: number, y: number, covers: readonly T[]): boolean {
    return nearestCover(x, y, covers, this.tuning.reach * this.bodyLengthPx) !== null;
  }

  update(input: ActivityInput, covers: readonly T[]): ActivityResult {
    const bl = this.bodyLengthPx;

    // A tail flip always leaves cover. Fear must never lock the escape.
    if (this.name === 'hiding' && (input.tailFlip || !input.hide)) this.stop();

    if (this.name === 'free' && input.hide && !input.tailFlip) {
      const cover = nearestCover(input.x, input.y, covers, this.tuning.reach * bl);
      if (cover) {
        this.name = 'hiding';
        this.cover = cover;
        this.target = tuckPoint(input.x, input.y, cover, this.tuning.tuck);
        this.stalled = 0;
        this.lastDistance = Infinity;
      }
    }

    if (this.name !== 'hiding' || !this.cover) return { axis: input.axis };

    const dx = this.target.x - input.x;
    const dy = this.target.y - input.y;
    const distance = Math.hypot(dx, dy);
    const under = distanceToCover(input.x, input.y, this.cover) < 0;
    // Blocked by a root on the way in, it settles where it is if it is under.
    this.stalled = distance < this.lastDistance - 0.01 * bl ? 0 : this.stalled + input.dt;
    this.lastDistance = Math.min(this.lastDistance, distance);
    if (distance <= this.tuning.settled * bl || (under && this.stalled > STALL_SECONDS)) {
      this.tucked = under;
      return { axis: { x: 0, y: 0 } };
    }
    this.tucked = false;
    // Movement keys are ignored while hiding: the body walks itself in.
    const strength = Math.min(1, distance / (this.tuning.slowing * bl));
    return { axis: { x: (dx / distance) * strength, y: (dy / distance) * strength } };
  }

  private stop(): void {
    this.name = 'free';
    this.cover = null;
    this.tucked = false;
  }
}
