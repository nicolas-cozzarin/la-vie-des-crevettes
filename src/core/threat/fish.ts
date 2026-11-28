/**
 * The hunting fish of the lagoon and the channel, seen from above: a long
 * spindle in mid-water with its shadow on the bed. How it comes in, circles,
 * turns to face the shrimp, holds still, charges, overshoots and leaves, and
 * whether a charge lands. The stages it goes through are the director's.
 * See docs/10-feelings-and-states.md, "The hunting fish".
 * Nothing here knows about the engine.
 */

import { angleDiff, rotateToward } from '../movement/angles';
import type { Bounds, Point } from '../movement/collision';
import { isUnder, type CoverSpot } from '../world/cover';

export interface FishTuning {
  /** BL from tail tip to snout. */
  length: number;
  /** On patrol: BL per second, and BL out from the middle it circles. */
  patrol: { speed: number; radius: number };
  /** Coming in during the cue: BL beyond its circle it starts, and BL per second. */
  arrive: { from: number; speed: number };
  /** Radians a second it turns on patrol. */
  turn: number;
  /** BL it keeps from the shrimp before it turns to face it: it needs room to charge. */
  room: number;
  /**
   * BL further it swims, once too close, before it turns: turning to face
   * brings it a little nearer, and without this it would never finish.
   */
  roomMargin: number;
  /** Seconds to turn and point at the shrimp, then seconds held dead straight: the warning. */
  face: number;
  pause: number;
  /** The charge: BL per second, and BL at most. */
  charge: { speed: number; reach: number };
  /** BL from the line within which the head's passing lands. */
  hit: number;
  /** Seconds of the wide slow turn after a charge, and BL per second at its end. */
  recover: number;
  recoverSpeed: number;
  /** Charges in one chase. */
  charges: number;
  /** It gives up after the shrimp has hidden this long, is this far (BL) after a recovery, or this many seconds. */
  giveUp: { hidden: number; far: number; seconds: number };
  /** BL. Movement this close raises notice. Beyond half of it, gains are halved. */
  range: number;
  /** BL. A shrimp this close sees the fish: the predator is in sight. */
  sight: number;
  /** BL. Its shadow coming this close in the cue is felt. So is a charge that misses. */
  shadowReach: number;
  missReach: number;
  /** A charge that passes within `near` BL during a tail flip or `after` seconds after one is sidestepped. */
  sidestep: { near: number; after: number };
  /** Leaving: BL per second, and radians a second it bends away. */
  leave: { speed: number; bend: number };
}

export type FishPhase = 'arrive' | 'circle' | 'face' | 'pause' | 'charge' | 'recover' | 'leave';

/** What the fish needs to know about the shrimp it hunts. */
export interface FishPrey {
  x: number;
  y: number;
  /** Tucked in, dug in, or under a cover's spread: the fish cannot reach it there. */
  safe: boolean;
  /** Seconds since its last tail flip began. */
  sinceFlip: number;
}

export type FishEvent =
  | { type: 'faced'; x: number; y: number }
  | { type: 'charge'; x: number; y: number; heading: number }
  | { type: 'passed'; x: number; y: number; hit: boolean; near: boolean; sidestep: boolean }
  | { type: 'recovered' };

interface Line {
  from: Point;
  dx: number;
  dy: number;
  travelled: number;
  passed: boolean;
}

export class HuntingFish {
  x: number;
  y: number;
  heading: number;
  phase: FishPhase = 'arrive';
  /** Charges made in this chase. */
  charges = 0;
  /** BL per second it swims now. */
  speed: number;
  /** How hard the tail beats, 0 on patrol to 1 in the pause before a charge. */
  urgency = 0;
  /** Seconds into the current phase. */
  phaseTime = 0;
  private centre: Point;
  /** +1 circles one way, -1 the other. */
  private readonly way: number;
  private line: Line | null = null;
  /** The way it turns after a charge. */
  private recoverWay = 1;
  private leaveWay = 1;
  /** Too close to charge: swimming away until it has room and a little more. */
  private makingRoom = false;

  constructor(
    private readonly tuning: FishTuning,
    private readonly bl: number,
    centre: Point,
    /** The way it comes from, as an angle seen from the middle it will circle. */
    from: number,
    way: 1 | -1,
  ) {
    this.centre = { ...centre };
    this.way = way;
    const out = (tuning.patrol.radius + tuning.arrive.from) * bl;
    this.x = centre.x + Math.cos(from) * out;
    this.y = centre.y + Math.sin(from) * out;
    this.heading = from + Math.PI;
    this.speed = tuning.arrive.speed;
  }

  /** The tip of its snout. */
  get head(): Point {
    const half = (this.tuning.length / 2) * this.bl;
    return { x: this.x + Math.cos(this.heading) * half, y: this.y + Math.sin(this.heading) * half };
  }

  /** In the cue: swims in toward its circle round `centre`. */
  arrive(dt: number, centre: Point): void {
    this.patrol(dt, centre, this.tuning.arrive.speed);
  }

  /** In presence: circles round `centre`, which moves with the shoal. */
  circle(dt: number, centre: Point): void {
    if (this.phase === 'arrive') this.enter('circle');
    this.patrol(dt, centre, this.tuning.patrol.speed);
  }

  /** The chase begins: it turns to face the shrimp. */
  hunt(): void {
    this.makingRoom = false;
    this.enter('face');
  }

  /**
   * One step of the chase: face, pause, charge, recover, and again. A charge
   * cannot go into cover or out of the place.
   */
  chase(dt: number, prey: FishPrey, covers: readonly CoverSpot[], bounds: Bounds): FishEvent[] {
    const t = this.tuning;
    const events: FishEvent[] = [];
    this.phaseTime += dt;
    const toPrey = Math.atan2(prey.y - this.y, prey.x - this.x);
    switch (this.phase) {
      case 'arrive':
      case 'circle':
      case 'leave':
        this.enter('face');
        break;
      case 'face': {
        // Too close to charge: it swims away first, to have room.
        const gap = Math.hypot(prey.x - this.x, prey.y - this.y);
        if (gap < t.room * this.bl) this.makingRoom = true;
        else if (gap >= (t.room + t.roomMargin) * this.bl) this.makingRoom = false;
        if (this.makingRoom) {
          this.heading = rotateToward(this.heading, toPrey + Math.PI, t.turn * 3 * dt);
          this.speed = approach(this.speed, t.patrol.speed, dt, 0.4);
          this.glide(dt, bounds);
          this.phaseTime = 0;
          break;
        }
        // Turns to point at the shrimp, finishing as the time runs out. The tail speeds up.
        const left = Math.max(dt, t.face - (this.phaseTime - dt));
        const turn = Math.abs(angleDiff(toPrey, this.heading));
        this.heading = rotateToward(this.heading, toPrey, (turn * dt) / left);
        this.speed = approach(this.speed, 0.5 * t.patrol.speed, dt, 0.4);
        this.urgency = Math.min(1, this.phaseTime / t.face);
        this.glide(dt);
        if (this.phaseTime >= t.face) {
          this.enter('pause');
          events.push({ type: 'faced', x: this.x, y: this.y });
        }
        break;
      }
      case 'pause':
        // Dead straight, and nearly still. This is the warning.
        this.speed = approach(this.speed, 0, dt, 0.2);
        this.urgency = 1;
        this.glide(dt);
        if (this.phaseTime >= t.pause) {
          // A straight line through where the shrimp is now.
          this.heading = toPrey;
          const dx = Math.cos(toPrey);
          const dy = Math.sin(toPrey);
          this.line = { from: { x: this.x, y: this.y }, dx, dy, travelled: 0, passed: false };
          this.charges += 1;
          this.speed = t.charge.speed;
          this.enter('charge');
          events.push({ type: 'charge', x: this.x, y: this.y, heading: this.heading });
        }
        break;
      case 'charge':
        this.stepCharge(dt, prey, covers, bounds, events);
        break;
      case 'recover': {
        // Overshoots, and turns back in a wide slow arc.
        this.heading += (this.recoverWay * Math.PI * dt) / t.recover;
        this.speed = approach(this.speed, t.recoverSpeed, dt, 0.15);
        this.urgency = Math.max(0, this.urgency - dt / t.recover);
        this.glide(dt, bounds);
        if (this.phaseTime >= t.recover) {
          this.enter('face');
          events.push({ type: 'recovered' });
        }
        break;
      }
    }
    return events;
  }

  /** It gives up: it swims on, bending away from the shrimp, and out of the view. */
  goAway(from: Point): void {
    const away = Math.atan2(this.y - from.y, this.x - from.x);
    this.leaveWay = angleDiff(away, this.heading) >= 0 ? 1 : -1;
    this.line = null;
    this.enter('leave');
  }

  /** One step of leaving. */
  leave(dt: number): void {
    this.phaseTime += dt;
    const t = this.tuning;
    this.heading += this.leaveWay * t.leave.bend * dt;
    this.speed = approach(this.speed, t.leave.speed, dt, 0.6);
    this.urgency = Math.max(0, this.urgency - dt);
    this.glide(dt);
  }

  private stepCharge(
    dt: number,
    prey: FishPrey,
    covers: readonly CoverSpot[],
    bounds: Bounds,
    events: FishEvent[],
  ): void {
    const line = this.line;
    if (!line) {
      this.enter('recover');
      return;
    }
    const t = this.tuning;
    const bl = this.bl;
    const reach = t.charge.reach * bl;
    const step = Math.min(t.charge.speed * bl * dt, reach - line.travelled);
    // The head ahead, after this step: it may not go into cover or out of the place.
    const half = (t.length / 2) * bl;
    const next = line.travelled + step;
    const headX = line.from.x + line.dx * (next + half);
    const headY = line.from.y + line.dy * (next + half);
    const blocked =
      headX < bounds.x ||
      headY < bounds.y ||
      headX > bounds.x + bounds.w ||
      headY > bounds.y + bounds.h ||
      covers.some((cover) => isUnder(headX, headY, cover));
    if (!blocked) {
      line.travelled = next;
      this.x = line.from.x + line.dx * next;
      this.y = line.from.y + line.dy * next;
    }
    // The head comes level with the shrimp, or the charge ends short of it.
    const ended = blocked || line.travelled >= reach - 1e-6;
    const along = (prey.x - line.from.x) * line.dx + (prey.y - line.from.y) * line.dy;
    const reached = line.travelled + half >= along;
    if (!line.passed && (reached || ended)) {
      line.passed = true;
      // It lands only on a shrimp close to the line as the head passes, and out of cover.
      const across = Math.abs((prey.x - line.from.x) * -line.dy + (prey.y - line.from.y) * line.dx);
      const close = reached ? across : Math.hypot(this.head.x - prey.x, this.head.y - prey.y);
      const hit = reached && !prey.safe && across <= t.hit * bl;
      const near = !hit && close <= t.sidestep.near * bl;
      const sidestep = near && prey.sinceFlip <= t.sidestep.after;
      const head = this.head;
      events.push({ type: 'passed', x: head.x, y: head.y, hit, near, sidestep });
      // Which side the shrimp is on: it turns back that way.
      const side = (prey.x - this.x) * -line.dy + (prey.y - this.y) * line.dx;
      this.recoverWay = side >= 0 ? 1 : -1;
    }
    if (ended) {
      this.line = null;
      this.enter('recover');
    }
  }

  /** Swims toward a point on its circle a little ahead of where it is. */
  private patrol(dt: number, centre: Point, speed: number): void {
    // The middle moves with the shoal, gently.
    const ease = 1 - Math.exp(-dt / 1.5);
    this.centre.x += (centre.x - this.centre.x) * ease;
    this.centre.y += (centre.y - this.centre.y) * ease;
    const radius = this.tuning.patrol.radius * this.bl;
    const around = Math.atan2(this.y - this.centre.y, this.x - this.centre.x);
    const ahead = around + this.way * 0.6;
    const target = {
      x: this.centre.x + Math.cos(ahead) * radius,
      y: this.centre.y + Math.sin(ahead) * radius,
    };
    const toward = Math.atan2(target.y - this.y, target.x - this.x);
    this.heading = rotateToward(this.heading, toward, this.tuning.turn * dt);
    this.speed = approach(this.speed, speed, dt, 0.8);
    this.urgency = Math.max(0, this.urgency - dt);
    this.glide(dt);
  }

  /** Moves along its heading at its speed, held inside the place when it is given. */
  private glide(dt: number, bounds?: Bounds): void {
    const distance = this.speed * this.bl * dt;
    let x = this.x + Math.cos(this.heading) * distance;
    let y = this.y + Math.sin(this.heading) * distance;
    if (bounds) {
      x = Math.max(bounds.x, Math.min(bounds.x + bounds.w, x));
      y = Math.max(bounds.y, Math.min(bounds.y + bounds.h, y));
    }
    this.x = x;
    this.y = y;
  }

  private enter(phase: FishPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}

/** Moves `value` toward `goal` with a time constant of `tau` seconds. */
function approach(value: number, goal: number, dt: number, tau: number): number {
  return value + (goal - value) * (1 - Math.exp(-dt / tau));
}
