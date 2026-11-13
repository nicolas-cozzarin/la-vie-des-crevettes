import { angleDiff, approach, rotateToward, wrapAngle } from './angles';

/**
 * How a shrimp moves on the flat bed: it turns to face the held direction,
 * walks, breaks into a swim, and darts tail first. See docs/02-mechanics.md.
 * Distances and speeds are in body lengths (BL) unless a name says otherwise.
 */
export interface MotionTuning {
  /** One body length, in design pixels. */
  bodyLengthPx: number;
  /** Collision radius. */
  radius: number;
  /** Radians per second. */
  turnRate: number;
  walkSpeed: number;
  swimSpeed: number;
  /** Seconds of continuous movement before walking becomes swimming. */
  walkToSwim: number;
  /** Seconds the keys can be let go without breaking "continuous". */
  moveGrace: number;
  /** Seconds to coast to rest from swimming speed. */
  coastTime: number;
  /** Seconds from rest to walking speed. */
  walkAccelTime: number;
  /** Seconds from walking speed to swimming speed. */
  swimAccelTime: number;
  dartDistance: number;
  dartTime: number;
  glideDistance: number;
  glideTime: number;
  /** Radians per second. How fast the body whips round when a dart starts. */
  dartTurnRate: number;
  /** Seconds from the start of one dart to the next. */
  dartCooldown: number;
  dartsBeforeTiring: number;
  /** Seconds without a dart before the count starts again. */
  dartRowWindow: number;
  recoveryTime: number;
  /** Length of a dart while tired, as a share of a full one. */
  tiredDartFactor: number;
  /** Height off the bed at the peak of a dart, where swimming is 1. */
  dartHeight: number;
  /** Seconds to lift off the bed or settle back. */
  liftTime: number;
}

export type MotionMode = 'rest' | 'walk' | 'swim' | 'dart' | 'glide';

export interface MotionInput {
  /** Held direction, each axis from -1 to 1. */
  x: number;
  y: number;
  /** True on the frame the tail flip key goes down. */
  dart: boolean;
}

/** Moves a point by a step and returns where it ends up, after any collision. */
export type Mover = (x: number, y: number, dx: number, dy: number) => { x: number; y: number };

const freeMove: Mover = (x, y, dx, dy) => ({ x: x + dx, y: y + dy });

/** A frame longer than this is treated as this long, so a stalled tab does not teleport. */
const MAX_STEP = 0.1;

interface Dart {
  /** Seconds since the dart began. */
  time: number;
  /** Direction of travel. */
  direction: number;
  /** Where the head points during the dart: opposite to travel. */
  facing: number;
  /** 1 for a full dart, less when tired. */
  scale: number;
}

export class ShrimpMotion {
  x: number;
  y: number;
  /** Where the head points. */
  heading: number;
  /** Speed along the heading while walking or swimming, in pixels per second. */
  speed = 0;
  /** Velocity over the last step, in pixels per second. */
  vx = 0;
  vy = 0;
  /** Signed turning speed over the last step, in radians per second. */
  turnSpeed = 0;
  mode: MotionMode = 'rest';
  /** 0 on the bed, 1 when swimming, higher for a moment in a dart. Visual only. */
  height = 0;

  private moveTime = 0;
  private idleTime = 0;
  private cooldown = 0;
  private dartsInRow = 0;
  private sinceDart = 0;
  private tiredLeft = 0;
  private dart: Dart | null = null;

  constructor(
    private readonly tuning: MotionTuning,
    start: { x: number; y: number; heading?: number },
  ) {
    this.x = start.x;
    this.y = start.y;
    this.heading = wrapAngle(start.heading ?? 0);
  }

  /** True during the recovery that follows several darts in a row. */
  get tired(): boolean {
    return this.tiredLeft > 0;
  }

  /** From 0 at the start of a dart to 1 at the end of its glide. 0 when not darting. */
  get dartProgress(): number {
    if (!this.dart) return 0;
    return this.dart.time / (this.tuning.dartTime + this.tuning.glideTime);
  }

  get radiusPx(): number {
    return this.tuning.radius * this.tuning.bodyLengthPx;
  }

  /** Advance by `dt` seconds. Returns whether a dart began on this step. */
  step(dt: number, input: MotionInput, move: Mover = freeMove): { darted: boolean } {
    const t = this.tuning;
    const elapsed = Math.min(Math.max(dt, 0), MAX_STEP);
    if (elapsed === 0) return { darted: false };

    const hasInput = input.x !== 0 || input.y !== 0;
    const inputAngle = hasInput ? Math.atan2(input.y, input.x) : this.heading;

    this.tickTimers(elapsed, hasInput);

    let darted = false;
    if (input.dart && this.cooldown === 0 && !this.dart) {
      this.startDart(hasInput ? inputAngle : wrapAngle(this.heading + Math.PI));
      darted = true;
    }

    const headingBefore = this.heading;
    let dx: number;
    let dy: number;

    if (this.dart) {
      const dart = this.dart;
      const total = t.dartTime + t.glideTime;
      const from = dart.time;
      const to = Math.min(total, from + elapsed);
      const travelled = (this.dartTravel(to) - this.dartTravel(from)) * dart.scale * t.bodyLengthPx;
      dx = Math.cos(dart.direction) * travelled;
      dy = Math.sin(dart.direction) * travelled;

      if (to <= t.dartTime) {
        this.heading = rotateToward(this.heading, dart.facing, t.dartTurnRate * elapsed);
        this.mode = 'dart';
      } else {
        // Gliding: the body starts to come round to where the player is heading.
        if (hasInput) {
          this.heading = rotateToward(this.heading, inputAngle, t.turnRate * elapsed);
        }
        this.mode = 'glide';
      }

      dart.time = to;
      this.speed = 0;
      if (to >= total) this.dart = null;
    } else {
      const maxSpeed = t.swimSpeed * t.bodyLengthPx;
      const walkSpeed = t.walkSpeed * t.bodyLengthPx;
      const coast = (maxSpeed / t.coastTime) * elapsed;
      const swimming = hasInput && this.moveTime >= t.walkToSwim;

      if (hasInput) {
        this.heading = rotateToward(this.heading, inputAngle, t.turnRate * elapsed);
        // Legs and swimmerets push along the body, so little happens until it faces the way.
        const facing = Math.max(0, Math.cos(angleDiff(inputAngle, this.heading)));
        const strength = Math.min(1, Math.hypot(input.x, input.y));
        const target = (swimming ? maxSpeed : walkSpeed) * strength * facing;
        if (this.speed < target) {
          const rate =
            this.speed < walkSpeed
              ? walkSpeed / t.walkAccelTime
              : (maxSpeed - walkSpeed) / t.swimAccelTime;
          this.speed = Math.min(target, this.speed + rate * elapsed);
        } else {
          this.speed = Math.max(target, this.speed - coast);
        }
      } else {
        this.speed = Math.max(0, this.speed - coast);
      }

      const distance = this.speed * elapsed;
      dx = Math.cos(this.heading) * distance;
      dy = Math.sin(this.heading) * distance;
      this.mode = swimming ? 'swim' : hasInput || this.speed > 0 ? 'walk' : 'rest';
    }

    const before = { x: this.x, y: this.y };
    const after = dx === 0 && dy === 0 ? before : move(this.x, this.y, dx, dy);
    this.x = after.x;
    this.y = after.y;
    this.vx = (after.x - before.x) / elapsed;
    this.vy = (after.y - before.y) / elapsed;
    this.turnSpeed = angleDiff(this.heading, headingBefore) / elapsed;

    this.updateHeight(elapsed);
    return { darted };
  }

  private tickTimers(dt: number, hasInput: boolean): void {
    const t = this.tuning;
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.tiredLeft > 0) {
      this.tiredLeft = Math.max(0, this.tiredLeft - dt);
      if (this.tiredLeft === 0) this.dartsInRow = 0;
    } else if (this.dartsInRow > 0) {
      this.sinceDart += dt;
      if (this.sinceDart >= t.dartRowWindow) this.dartsInRow = 0;
    }

    if (hasInput) {
      this.moveTime += dt;
      this.idleTime = 0;
    } else {
      this.idleTime += dt;
      if (this.idleTime > t.moveGrace) this.moveTime = 0;
    }
  }

  private startDart(direction: number): void {
    const t = this.tuning;
    const tired = this.tiredLeft > 0;
    this.dart = {
      time: 0,
      direction,
      facing: wrapAngle(direction + Math.PI),
      scale: tired ? t.tiredDartFactor : 1,
    };
    this.cooldown = t.dartCooldown;
    this.sinceDart = 0;
    if (!tired) {
      this.dartsInRow += 1;
      if (this.dartsInRow >= t.dartsBeforeTiring) this.tiredLeft = t.recoveryTime;
    }
  }

  /**
   * Body lengths covered `time` seconds into a full dart. Speed falls in a
   * straight line through the dart, then again through the glide, to zero.
   */
  private dartTravel(time: number): number {
    const t = this.tuning;
    const glideSpeed = (2 * t.glideDistance) / t.glideTime;
    const startSpeed = Math.max(glideSpeed, (2 * t.dartDistance) / t.dartTime - glideSpeed);
    if (time <= t.dartTime) {
      return startSpeed * time - ((startSpeed - glideSpeed) * time * time) / (2 * t.dartTime);
    }
    const into = Math.min(time - t.dartTime, t.glideTime);
    const dartPart = ((startSpeed + glideSpeed) * t.dartTime) / 2;
    return dartPart + glideSpeed * into - (glideSpeed * into * into) / (2 * t.glideTime);
  }

  private updateHeight(dt: number): void {
    const t = this.tuning;
    let target = 0;
    let time = t.liftTime;
    if (this.mode === 'dart') {
      target = t.dartHeight;
      time = t.dartTime * 0.3;
    } else if (this.mode === 'glide') {
      target = 0.5;
    } else if (this.mode === 'swim') {
      target = 1;
    }
    this.height += (target - this.height) * approach(dt, time);
    if (this.height < 0.001) this.height = 0;
  }
}
