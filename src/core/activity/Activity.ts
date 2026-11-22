import type { FoodSpot } from '../food/FoodPatch';
import { distanceToCover, nearestCover, tuckPoint, type CoverSpot } from '../world/cover';
import type { FoodKind } from '../world/kinds';

/**
 * What the body is busy with, on top of how it moves. One at a time. Every
 * name of doc 10's table is listed so that the feelings can read it, but the
 * state machine below runs only `free`, `hiding`, `grazing`, `sensing`,
 * `greeting` and `calling` so far; the rest join in later steps. See docs/10-feelings-and-states.md, "Activities".
 */
export type ActivityName =
  | 'free'
  | 'sensing'
  | 'grazing'
  | 'examining'
  | 'hiding'
  | 'burrowing'
  | 'greeting'
  | 'calling'
  | 'resting'
  | 'molting'
  | 'cornered'
  | 'drifting';

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

/** Grazing. BL are from the shrimp's centre. */
export interface GrazeTuning {
  /** BL. Grazing starts when the head is this close to a patch's edge. */
  reach: number;
  /** BL. Where the mouth is, ahead of the centre. */
  head: number;
  /** Below this hunger the shrimp is full and stops. */
  full: number;
  /** Seconds a full shrimp may still try a food it has not tasted. */
  taste: number;
  /** At this fear or more, grazing and sensing end at once. */
  fearEnds: number;
}

/** Greeting and calling. */
export interface GreetTuning {
  /** BL. Greet starts when another shrimp is this close. */
  reach: number;
  /** Seconds the antennae reach and tap. */
  seconds: number;
  /** Seconds Greet is held, with nobody within reach, before calling starts. */
  callHold: number;
}

/** Another shrimp, as the greeting needs it. */
export interface OtherShrimp {
  id: string;
  x: number;
  y: number;
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
  /** Interact, held. */
  interact?: boolean;
  /** Sense, after hold or toggle is applied. */
  sense?: boolean;
  heading?: number;
  hunger?: number;
  fear?: number;
  /** Whether a food has been tasted before. */
  tasted?: (kind: FoodKind) => boolean;
  /** Greet, held. */
  greet?: boolean;
  /** The other shrimp that could be greeted. */
  others?: readonly OtherShrimp[];
}

export interface ActivityResult {
  /** The direction to feed the motion: the player's own, or the walk to cover or food. */
  axis: { x: number; y: number };
  /** Grazing with the mouth on the patch: eat on this step. */
  eating: boolean;
  /** Where the head should turn, while greeting. */
  face?: number;
  /** A greeting finished on this step, with this shrimp. */
  greeted?: string;
  /** Calling started on this step. */
  called?: boolean;
}

/** Seconds without progress after which a shrimp under cover stops walking in. */
const STALL_SECONDS = 0.3;

export class Activity<T extends CoverSpot = CoverSpot, F extends FoodSpot = FoodSpot> {
  name: ActivityName = 'free';
  /** The cover being hidden under. */
  cover: T | null = null;
  /** The patch being grazed. */
  food: F | null = null;
  /** Seconds of this graze. */
  private grazeTime = 0;
  /** This graze is a full shrimp's taste, which ends after `taste` seconds. */
  private tasting = false;
  /** A graze ended with Interact still held: another starts only after a new press. */
  private interactSpent = false;
  /** The shrimp being greeted, and for how long. */
  with: string | null = null;
  private greetTime = 0;
  /** Seconds Greet has been held with nobody to greet. */
  private greetHeld = 0;
  /** Greet must be let go before it starts anything again. */
  private greetSpent = false;
  /** The shrimp whose greeting finished on this update. */
  private finished: string | undefined;
  /** Under the cover and settled: the `hidden` condition of doc 10. */
  tucked = false;
  /**
   * Put there by the game, not by a held Hide: after being cornered, the
   * shrimp wakes tucked in. It stays until it moves or flips, or until Hide
   * is pressed, which makes it an ordinary hide.
   */
  private placed = false;
  private target = { x: 0, y: 0 };
  /** Seconds without getting closer: something solid is in the way. */
  private stalled = 0;
  private lastDistance = Infinity;

  constructor(
    private readonly tuning: HideTuning,
    private readonly bodyLengthPx: number,
    private readonly graze: GrazeTuning,
    private readonly greeting: GreetTuning,
  ) {}

  /** Wakes the shrimp tucked in under a cover, as after being cornered (doc 10). */
  tuckInto(cover: T, at: { x: number; y: number }): void {
    this.stop();
    this.name = 'hiding';
    this.cover = cover;
    this.target = { x: at.x, y: at.y };
    this.tucked = true;
    this.placed = true;
    this.stalled = 0;
    this.lastDistance = 0;
  }

  /** The nearest other shrimp that Greet would greet here, or null. */
  greetable(x: number, y: number, others: readonly OtherShrimp[]): OtherShrimp | null {
    let best: OtherShrimp | null = null;
    let bestDistance = this.greeting.reach * this.bodyLengthPx;
    for (const other of others) {
      const distance = Math.hypot(other.x - x, other.y - y);
      if (distance <= bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Whether Hide would start here: a cover is within reach. */
  canHide(x: number, y: number, covers: readonly T[]): boolean {
    return nearestCover(x, y, covers, this.tuning.reach * this.bodyLengthPx) !== null;
  }

  /** A patch that Interact would start grazing here, or null. */
  grazeable(input: ActivityInput, foods: readonly F[]): F | null {
    const bl = this.bodyLengthPx;
    const full = (input.hunger ?? 1) < this.graze.full;
    const mouth = this.mouth(input);
    let best: F | null = null;
    let bestGap = this.graze.reach * bl;
    for (const food of foods) {
      if (food.amount <= 0) continue;
      if (full && (input.tasted?.(food.kind) ?? true)) continue;
      const gap = Math.hypot(food.x - mouth.x, food.y - mouth.y) - food.r;
      if (gap <= bestGap) {
        best = food;
        bestGap = gap;
      }
    }
    return best;
  }

  update(input: ActivityInput, covers: readonly T[], foods: readonly F[] = []): ActivityResult {
    this.finished = undefined;
    const result = this.advance(input, covers, foods);
    return this.finished === undefined ? result : { ...result, greeted: this.finished };
  }

  private advance(input: ActivityInput, covers: readonly T[], foods: readonly F[]): ActivityResult {
    const bl = this.bodyLengthPx;
    const scared = (input.fear ?? 0) >= this.graze.fearEnds;
    const moving = input.axis.x !== 0 || input.axis.y !== 0;
    if (!input.interact) this.interactSpent = false;
    if (!input.greet) {
      this.greetSpent = false;
      this.greetHeld = 0;
    }

    // A tail flip always ends what the body is doing. Fear must never lock the escape.
    if (this.name === 'hiding' && this.placed) {
      if (input.hide) this.placed = false;
      else if (input.tailFlip || moving) this.stop();
    } else if (this.name === 'hiding' && (input.tailFlip || !input.hide)) this.stop();
    if (this.name === 'grazing' && this.food) {
      const full = (input.hunger ?? 1) < this.graze.full;
      const tasteOver = this.tasting && this.grazeTime >= this.graze.taste;
      if (
        input.tailFlip ||
        !input.interact ||
        moving ||
        scared ||
        this.food.amount <= 0 ||
        (full && !this.tasting) ||
        tasteOver
      ) {
        this.stop();
        this.interactSpent = input.interact === true;
      }
    }
    if (this.name === 'sensing' && (input.tailFlip || !input.sense || scared)) this.stop();
    if (this.name === 'greeting') {
      this.greetTime += input.dt;
      const gone = !(input.others ?? []).some((other) => other.id === this.with);
      if (input.tailFlip || scared || gone) this.stop();
      else if (this.greetTime >= this.greeting.seconds) {
        this.finished = this.with ?? undefined;
        this.stop();
      }
    }
    if (this.name === 'calling' && (input.tailFlip || !input.greet || scared)) this.stop();

    if (this.name === 'free' && !input.tailFlip) {
      const cover = input.hide
        ? nearestCover(input.x, input.y, covers, this.tuning.reach * bl)
        : null;
      const wantsFood = input.interact === true && !this.interactSpent && !scared;
      const food = !cover && wantsFood ? this.grazeable(input, foods) : null;
      const wantsGreet = input.greet === true && !this.greetSpent && !scared;
      const other = wantsGreet ? this.greetable(input.x, input.y, input.others ?? []) : null;
      if (wantsGreet && !other) this.greetHeld += input.dt;
      if (cover) {
        this.name = 'hiding';
        this.cover = cover;
        this.target = tuckPoint(input.x, input.y, cover, this.tuning.tuck);
        this.stalled = 0;
        this.lastDistance = Infinity;
      } else if (food && !moving) {
        this.name = 'grazing';
        this.food = food;
        this.grazeTime = 0;
        this.tasting = (input.hunger ?? 1) < this.graze.full;
      } else if (other && !food) {
        this.name = 'greeting';
        this.with = other.id;
        this.greetTime = 0;
        this.greetSpent = true;
      } else if (wantsGreet && !food && this.greetHeld >= this.greeting.callHold) {
        this.name = 'calling';
        this.greetSpent = true;
        return { axis: { x: 0, y: 0 }, eating: false, called: true };
      } else if (input.sense && !scared && !input.hide) {
        this.name = 'sensing';
      }
    }

    if (this.name === 'greeting') {
      const other = (input.others ?? []).find((one) => one.id === this.with);
      const face = other ? Math.atan2(other.y - input.y, other.x - input.x) : undefined;
      return { axis: { x: 0, y: 0 }, eating: false, face };
    }
    if (this.name === 'calling') return { axis: { x: 0, y: 0 }, eating: false };

    if (this.name === 'sensing') return { axis: { x: 0, y: 0 }, eating: false };
    if (this.name === 'grazing' && this.food) return this.stepGraze(input, this.food);
    if (this.name !== 'hiding' || !this.cover) return { axis: input.axis, eating: false };
    if (this.placed) return { axis: { x: 0, y: 0 }, eating: false };

    const dx = this.target.x - input.x;
    const dy = this.target.y - input.y;
    const distance = Math.hypot(dx, dy);
    const under = distanceToCover(input.x, input.y, this.cover) < 0;
    // Blocked by a root on the way in, it settles where it is if it is under.
    this.stalled = distance < this.lastDistance - 0.01 * bl ? 0 : this.stalled + input.dt;
    this.lastDistance = Math.min(this.lastDistance, distance);
    if (distance <= this.tuning.settled * bl || (under && this.stalled > STALL_SECONDS)) {
      this.tucked = under;
      return { axis: { x: 0, y: 0 }, eating: false };
    }
    this.tucked = false;
    // Movement keys are ignored while hiding: the body walks itself in.
    const strength = Math.min(1, distance / (this.tuning.slowing * bl));
    return {
      axis: { x: (dx / distance) * strength, y: (dy / distance) * strength },
      eating: false,
    };
  }

  /** Steps to the patch's edge, then eats while the mouth is on it. */
  private stepGraze(input: ActivityInput, food: F): ActivityResult {
    this.grazeTime += input.dt;
    const mouth = this.mouth(input);
    const dx = food.x - mouth.x;
    const dy = food.y - mouth.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= food.r || distance < 1e-6) return { axis: { x: 0, y: 0 }, eating: true };
    return { axis: { x: dx / distance, y: dy / distance }, eating: false };
  }

  private mouth(input: ActivityInput): { x: number; y: number } {
    const heading = input.heading ?? 0;
    const ahead = this.graze.head * this.bodyLengthPx;
    return { x: input.x + Math.cos(heading) * ahead, y: input.y + Math.sin(heading) * ahead };
  }

  private stop(): void {
    this.name = 'free';
    this.placed = false;
    this.cover = null;
    this.food = null;
    this.tucked = false;
    this.tasting = false;
    this.with = null;
  }
}
