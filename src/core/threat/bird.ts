/**
 * The wading bird of the mangrove, seen from above: a shadow, two feet and a
 * ring of ripples where the beak will strike. Where it stands, how its legs
 * step, where it aims and whether a strike lands. The stages it goes through
 * are the director's. See docs/10-feelings-and-states.md, "The wading bird".
 * Nothing here knows about the engine.
 */

import type { Bounds, Obstacle, Point } from '../movement/collision';
import { isClear } from '../npc/steer';
import { distanceToCover, type CoverSpot } from '../world/cover';

export interface BirdTuning {
  /** BL per second the shadow slides at. */
  shadowSpeed: number;
  /** BL. The shadow's middle passes at most this far from the shrimp. */
  pass: number;
  /** Seconds before the cue ends that the shadow crosses the shrimp. */
  crossBeforeEnd: number;
  /** BL one step moves a leg, and the seconds it takes. */
  step: number;
  stepSeconds: number;
  /** BL between the two feet. */
  stance: number;
  /** BL from the shrimp it stands, and how far from any cover's edge. */
  stand: { min: number; max: number; clear: number };
  /** BL from its feet that it can strike. Further, it steps closer first. */
  reach: number;
  /** The strike ring: radius in BL, and its warning in seconds. The first one ever warns longer. */
  ring: { radius: number; warn: number; firstWarn: number };
  /** Seconds ahead along the shrimp's path that later strikes aim. */
  lead: number;
  /** BL from the ring's middle within which a strike lands. */
  hit: number;
  /** Strikes in one chase, and the seconds between two. */
  strikes: number;
  strikeGap: number;
  /** It gives up after the shrimp has hidden this long, is this far (BL), or this many seconds. */
  giveUp: { hidden: number; far: number; seconds: number };
  /** Seconds between lifting one leg and the other when it leaves. */
  liftGap: number;
  /** BL. Movement this close raises notice. Beyond half of it, gains are halved. */
  range: number;
  /** BL. A shrimp this close can see the legs: the predator is in sight. */
  sight: number;
  /** BL. A shadow passing this close is felt. So is a miss. */
  shadowReach: number;
  missReach: number;
  /** Radians a second the head's shadow turns. */
  headTurn: number;
}

/** What the bird needs to know about the place. */
export interface BirdWorld {
  covers: readonly CoverSpot[];
  obstacles: readonly Obstacle[];
  bounds: Bounds;
  /** Pixels in one BL. */
  bl: number;
}

/**
 * Where to stand: 4 to 6 BL from the shrimp, in the open, never within 2 BL
 * of cover, inside the place and not in a root. It tries the side it came
 * from first. With nowhere that fits, the spot furthest from cover.
 */
export function standPoint(
  shrimp: Point,
  prefer: number,
  world: BirdWorld,
  tuning: BirdTuning,
): Point {
  const { bl } = world;
  const distances = [0.5, 0.25, 0.75, 0, 1].map(
    (share) => (tuning.stand.min + share * (tuning.stand.max - tuning.stand.min)) * bl,
  );
  const tries = 24;
  let best: Point | null = null;
  let bestRoom = -Infinity;
  for (let index = 0; index < tries; index++) {
    // Alternate either side of the preferred way: 0, +1, -1, +2, -2...
    const turn = Math.ceil(index / 2) * (index % 2 === 0 ? -1 : 1);
    const angle = prefer + (turn * Math.PI * 2) / tries;
    for (const distance of distances) {
      const point = {
        x: shrimp.x + Math.cos(angle) * distance,
        y: shrimp.y + Math.sin(angle) * distance,
      };
      if (!isClear(point.x, point.y, 0.5 * bl, world.obstacles, world.bounds)) continue;
      const room = roomFromCover(point, world.covers);
      if (room >= tuning.stand.clear * bl) return point;
      if (room > bestRoom) {
        best = point;
        bestRoom = room;
      }
    }
  }
  const middle = distances[0] ?? tuning.stand.min * bl;
  return (
    best ?? { x: shrimp.x + Math.cos(prefer) * middle, y: shrimp.y + Math.sin(prefer) * middle }
  );
}

/** How far a point is from the nearest cover's edge. Infinity with no cover. */
function roomFromCover(point: Point, covers: readonly CoverSpot[]): number {
  let room = Infinity;
  for (const cover of covers) room = Math.min(room, distanceToCover(point.x, point.y, cover));
  return room;
}

/**
 * Where a strike aims. The first of a chase aims at the shrimp. Later ones
 * aim `lead` seconds ahead along its path, unless that point is in a root or
 * outside the place: then at the shrimp.
 */
export function aimPoint(
  shrimp: Point,
  velocity: Point,
  first: boolean,
  world: BirdWorld,
  tuning: BirdTuning,
): Point {
  if (first) return { x: shrimp.x, y: shrimp.y };
  const ahead = {
    x: shrimp.x + velocity.x * tuning.lead,
    y: shrimp.y + velocity.y * tuning.lead,
  };
  return isClear(ahead.x, ahead.y, 0.2 * world.bl, world.obstacles, world.bounds)
    ? ahead
    : { x: shrimp.x, y: shrimp.y };
}

/** A strike lands only on a shrimp within `hit` BL of the ring's middle, and not under cover. */
export function strikeLands(
  ring: Point,
  shrimp: Point,
  underCover: boolean,
  bl: number,
  tuning: BirdTuning,
): boolean {
  if (underCover) return false;
  return Math.hypot(shrimp.x - ring.x, shrimp.y - ring.y) <= tuning.hit * bl;
}

export interface Foot {
  x: number;
  y: number;
  /** On the mud. A foot in the air is moving to `to`. */
  down: boolean;
  /** 0 to 1 through a step, when in the air. */
  through: number;
  from: Point;
  to: Point;
}

export type LegEvent = { type: 'landed' | 'lifted'; x: number; y: number };

/**
 * The two legs. One moves at a time: up, 2 BL along, down, with a ring of
 * ripples where it lands. Seen from above, a leg is a dark dot in a yellow foot.
 */
export class Legs {
  readonly feet: [Foot, Foot];
  heading: number;

  constructor(
    private readonly tuning: BirdTuning,
    private readonly bl: number,
    at: Point,
    heading: number,
  ) {
    this.heading = heading;
    const [a, b] = this.placesAround(at, heading);
    // Arriving: both in the air above where they will land.
    this.feet = [foot(a, false), foot(b, false)];
  }

  /** The middle between the feet: where the bird stands. */
  get middle(): Point {
    const [a, b] = this.feet;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  get moving(): boolean {
    return this.feet.some((one) => !one.down && one.through < 1);
  }

  get anyDown(): boolean {
    return this.feet.some((one) => one.down);
  }

  /** The first foot comes down now, the second one step later. */
  arrive(): LegEvent[] {
    const [first, second] = this.feet;
    first.down = true;
    first.through = 1;
    second.through = 0;
    second.from = { x: second.x, y: second.y };
    second.to = { x: second.x, y: second.y };
    return [{ type: 'landed', x: first.x, y: first.y }];
  }

  /** Steps the rear foot toward a point, keeping the stance. Does nothing while a foot moves. */
  stepToward(target: Point): void {
    if (this.moving) return;
    const middle = this.middle;
    this.heading = Math.atan2(target.y - middle.y, target.x - middle.x);
    const ahead = { x: Math.cos(this.heading), y: Math.sin(this.heading) };
    // The foot further back goes.
    const along = (one: Foot) => (one.x - middle.x) * ahead.x + (one.y - middle.y) * ahead.y;
    const [a, b] = this.feet;
    const rear = along(a) <= along(b) ? a : b;
    const other = rear === a ? b : a;
    const goal = {
      x: middle.x + ahead.x * this.tuning.step * this.bl,
      y: middle.y + ahead.y * this.tuning.step * this.bl,
    };
    // Where the rear foot belongs beside the other, once the bird stands at `goal`.
    const [left, right] = this.placesAround(goal, this.heading);
    const side = (point: Point) => (point.x - goal.x) * -ahead.y + (point.y - goal.y) * ahead.x;
    const otherSide = side(other);
    const to = Math.sign(side(left)) === Math.sign(otherSide) ? right : left;
    rear.down = false;
    rear.through = 0;
    rear.from = { x: rear.x, y: rear.y };
    rear.to = to;
  }

  /** Both feet lift, one after the other. */
  lift(): LegEvent[] {
    const events: LegEvent[] = [];
    for (const one of this.feet) {
      if (one.down) {
        one.down = false;
        one.through = 1;
        events.push({ type: 'lifted', x: one.x, y: one.y });
        return events;
      }
    }
    return events;
  }

  step(dt: number): LegEvent[] {
    const events: LegEvent[] = [];
    for (const one of this.feet) {
      if (one.down || one.through >= 1) continue;
      one.through = Math.min(1, one.through + dt / this.tuning.stepSeconds);
      one.x = one.from.x + (one.to.x - one.from.x) * one.through;
      one.y = one.from.y + (one.to.y - one.from.y) * one.through;
      if (one.through >= 1) {
        one.down = true;
        events.push({ type: 'landed', x: one.x, y: one.y });
      }
    }
    return events;
  }

  private placesAround(at: Point, heading: number): [Point, Point] {
    const half = (this.tuning.stance / 2) * this.bl;
    const across = { x: -Math.sin(heading), y: Math.cos(heading) };
    return [
      { x: at.x + across.x * half, y: at.y + across.y * half },
      { x: at.x - across.x * half, y: at.y - across.y * half },
    ];
  }
}

function foot(at: Point, down: boolean): Foot {
  return { x: at.x, y: at.y, down, through: down ? 1 : 0, from: { ...at }, to: { ...at } };
}
