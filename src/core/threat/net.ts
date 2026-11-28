/**
 * The net (doc 10, "The net"). It is never drawn as an object: a long hull's
 * shadow crosses, then a band of grid shadow sweeps along the bed behind it,
 * slower than a swimming shrimp. The way out is past its side edge, or down
 * into a crevice until it has gone. Its back edge is the net closing: a
 * shrimp under it cannot get out that way, and is carried along (T120).
 * Nothing here knows about the engine.
 */

import type { Point } from '../movement/collision';

export interface NetTuning {
  /** Seconds the engine's throb grows before the hull comes: the cue. */
  cue: number;
  /** BL long and wide, and the seconds it takes to cross the view. */
  hull: { long: number; wide: number; cross: number };
  /**
   * The band: BL across the way it goes and deep along it, its speed in BL
   * per second, and the seconds it comes in after the hull.
   */
  grid: { across: number; deep: number; speed: number; follow: number };
  /** BL from the player, the way it comes from, where the hull's bow and the grid's front come in. */
  enter: number;
  /** Seconds under the grid in one stretch, not in a crevice, before the player is caught up. */
  caught: number;
  /** BL of open bed the band leaves beyond each side edge, inside the place. */
  room: number;
  /** BL beyond the player that the grid's back edge goes before it has gone. */
  past: number;
  /** BL from the band within which a shrimp sees it, for the feelings' holds. */
  sight: number;
  /** BL from the hull's shadow within which it is felt crossing. */
  shadowReach: number;
  /** Fear per second the engine adds while it grows, after its first jump (doc 10, "Fear"). */
  engineGrow: number;
}

/** What the net needs to know of the player on each step. */
export interface NetPrey {
  x: number;
  y: number;
  /** Tucked into a crevice. */
  inCrevice: boolean;
}

/**
 * How the player last came out from under the grid: past a side edge, left
 * behind in a crevice as it passed over, out ahead of it, or behind it in the
 * open, which only gentle mode allows.
 */
export type NetWayOut = 'side' | 'crevice' | 'front' | 'back';

export type NetEvent =
  /** Under the grid too long: the player is caught up (cornered). */
  | { type: 'caught' }
  /** The grid has gone past the player and on. */
  | { type: 'gone' }
  /** The back edge carries the player: it is put here. */
  | { type: 'held'; x: number; y: number };

export class Net {
  /** Seconds since the hull came in. */
  time = 0;
  /** The hull's shadow: its middle, and the way its bow points. */
  readonly hull: { x: number; y: number; heading: number };
  /** The grid's front edge, as an x, once it has come in. */
  front: number | null = null;
  /** Seconds the player has been under the grid in this stretch, not in a crevice. */
  under = 0;
  /** The player has been under the grid on this pass. */
  wasUnder = false;
  /** How the player last came out from under it. */
  wayOut: NetWayOut | null = null;
  gone = false;
  private inside = false;
  private readonly hullSpeed: number;

  /**
   * `way` is the way it goes along x: 1 toward larger x, -1 toward smaller.
   * `lane` is the y of the line the hull and the grid follow.
   */
  constructor(
    private readonly tuning: NetTuning,
    private readonly bl: number,
    readonly way: 1 | -1,
    readonly lane: number,
    player: Point,
    private readonly bounds: { w: number },
  ) {
    const long = tuning.hull.long * bl;
    const start = player.x - way * (tuning.enter * bl + long / 2);
    this.hull = { x: start, y: lane, heading: way > 0 ? 0 : Math.PI };
    this.hullSpeed = (2 * tuning.enter * bl + long) / tuning.hull.cross;
  }

  /**
   * The lane for a net coming at a player at `y`: the player's own, kept far
   * enough from the top and bottom for the band to leave room past both its
   * side edges.
   */
  static laneFor(tuning: NetTuning, bl: number, y: number, height: number): number {
    const reach = (tuning.grid.across / 2 + tuning.room) * bl;
    if (height <= 2 * reach) return height / 2;
    return Math.max(reach, Math.min(height - reach, y));
  }

  /** The grid's back edge, as an x, once it has come in. */
  get back(): number | null {
    return this.front === null ? null : this.front - this.way * this.tuning.grid.deep * this.bl;
  }

  /** The band, as a rectangle, once it has come in. */
  get band(): { x: number; y: number; w: number; h: number } | null {
    const back = this.back;
    if (this.front === null || back === null) return null;
    const across = this.tuning.grid.across * this.bl;
    return {
      x: Math.min(this.front, back),
      y: this.lane - across / 2,
      w: Math.abs(this.front - back),
      h: across,
    };
  }

  /** Whether (x, y) lies under the grid. */
  isUnder(x: number, y: number): boolean {
    const band = this.band;
    return (
      band !== null && x >= band.x && x <= band.x + band.w && y >= band.y && y <= band.y + band.h
    );
  }

  /** Pixels from (x, y) to the band, 0 under it. Infinity before it comes. */
  gapToBand(x: number, y: number): number {
    const band = this.band;
    if (!band) return Infinity;
    const dx = Math.max(band.x - x, 0, x - (band.x + band.w));
    const dy = Math.max(band.y - y, 0, y - (band.y + band.h));
    return Math.hypot(dx, dy);
  }

  /** Pixels from (x, y) to the hull's shadow, 0 under it. */
  gapToHull(x: number, y: number): number {
    const halfLong = (this.tuning.hull.long * this.bl) / 2;
    const halfWide = (this.tuning.hull.wide * this.bl) / 2;
    const dx = Math.max(Math.abs(x - this.hull.x) - halfLong, 0);
    const dy = Math.max(Math.abs(y - this.hull.y) - halfWide, 0);
    return Math.hypot(dx, dy);
  }

  /** The middle of what is coming: the band once it is on, else the hull. */
  get middle(): Point {
    const band = this.band;
    return band ? { x: band.x + band.w / 2, y: this.lane } : { x: this.hull.x, y: this.hull.y };
  }

  /**
   * The point a shrimp at (x, y) flees from: straight across the lane from
   * it, so that it goes out past the nearer side edge, the way out.
   */
  fleeFrom(x: number, y: number): Point {
    return { x, y: y === this.lane ? this.lane - 1 : this.lane };
  }

  /**
   * One step. `catching` is false once the player has been caught up, and
   * in gentle mode: the grid passes and holds nobody.
   */
  step(dt: number, prey: NetPrey, catching: boolean): NetEvent[] {
    const t = this.tuning;
    const bl = this.bl;
    const events: NetEvent[] = [];
    this.time += dt;
    this.hull.x += this.way * this.hullSpeed * dt;
    if (this.front === null) {
      if (this.time < t.grid.follow) return events;
      this.front = prey.x - this.way * t.enter * bl;
    } else {
      this.front += this.way * t.grid.speed * bl * dt;
    }
    if (this.gone) return events;

    const { y } = prey;
    let { x } = prey;
    const half = (t.grid.across * bl) / 2;
    const across = Math.abs(y - this.lane) <= half;
    const along = x * this.way;
    const front = this.front * this.way;
    const back = front - t.grid.deep * bl;
    // Under it, the back edge is the net closing: the shrimp is carried along.
    if (catching && this.inside && across && along < back && !prey.inCrevice) {
      x = back * this.way;
      events.push({ type: 'held', x, y });
    }
    const inside = across && x * this.way >= back && x * this.way <= front;
    if (inside) {
      this.wasUnder = true;
      this.under = prey.inCrevice ? 0 : this.under + dt;
    } else {
      this.under = 0;
      if (this.inside) {
        if (!across) this.wayOut = 'side';
        else if (x * this.way < back) this.wayOut = prey.inCrevice ? 'crevice' : 'back';
        else this.wayOut = 'front';
      }
    }
    this.inside = inside;
    if (catching && this.under >= t.caught) {
      this.under = 0;
      events.push({ type: 'caught' });
    }
    // Gone: well past the player, or past the end of the place.
    const end = this.way > 0 ? this.bounds.w : 0;
    if (back >= x * this.way + t.past * bl || back >= end * this.way) {
      this.gone = true;
      events.push({ type: 'gone' });
    }
    return events;
  }

  /** The player came through: out by the side, or in a crevice as it passed over. */
  get outcome(): { edge: boolean; crevice: boolean } {
    return {
      edge: this.wasUnder && this.wayOut === 'side',
      crevice: this.wasUnder && this.wayOut === 'crevice',
    };
  }
}
