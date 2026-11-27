/**
 * The green turtle of the lagoon's meadow (doc 11, "Green turtle"; T106).
 * It glides from clump to clump on a slow loop, flippers in slow strokes.
 * At each clump it stops, lowers its head and crops the blades, then moves
 * on. It cannot be disturbed: nothing the shrimp does changes its way.
 * Nothing here knows about the engine.
 */

import { rotateToward } from '../movement/angles';
import type { Point } from '../movement/collision';

export interface TurtleTuning {
  /** BL per second, gliding. */
  speed: number;
  /** Radians per second it can turn. */
  turn: number;
  /** BL from its middle to the clump's when it stops: its head is then over the blades. */
  reach: number;
  /** Seconds it crops at a clump. */
  crop: number;
  /** Seconds the head takes to go down, and to come up again. */
  dip: number;
  /** Seconds of one flipper stroke, gliding. Cropping, it strokes this many times slower. */
  stroke: number;
  slowStroke: number;
  /** Seconds it takes to come up to speed, and to stop. */
  ease: number;
  /** The shell, from its middle: half its length and half its width, in BL. */
  shell: { half: number; side: number };
  /** Its shadow on the bed: the size in BL, how far off it lies, and how much of it is dark enough to feel. */
  shadow: { long: number; wide: number; dx: number; dy: number; felt: number };
}

export type TurtlePhase = 'glide' | 'crop';

export class Turtle {
  x: number;
  y: number;
  heading: number;
  phase: TurtlePhase = 'glide';
  /** BL per second now. */
  speed = 0;
  /** How far through its flipper stroke it is, 0 to 1, round and round. */
  stroke = 0;
  /** Which clump of the route it is going to. */
  target = 0;
  private phaseTime = 0;

  constructor(
    start: Point & { heading: number },
    private readonly route: readonly Point[],
    private readonly bl: number,
    private readonly tuning: TurtleTuning,
  ) {
    this.x = start.x;
    this.y = start.y;
    this.heading = start.heading;
  }

  /** The clump it is going to, or cropping. */
  get towards(): Point | null {
    return this.route[this.target] ?? null;
  }

  /** How far the head is lowered, 0 to 1. */
  get dip(): number {
    if (this.phase !== 'crop') return 0;
    const t = this.tuning;
    const down = Math.min(1, this.phaseTime / t.dip);
    const up = Math.min(1, Math.max(0, (t.crop - this.phaseTime) / t.dip));
    return Math.min(down, up);
  }

  /** Seconds into what it is doing now. */
  get time(): number {
    return this.phaseTime;
  }

  step(dt: number): void {
    const t = this.tuning;
    const bl = this.bl;
    this.phaseTime += dt;
    const towards = this.towards;
    if (!towards) return;
    const gap = Math.hypot(towards.x - this.x, towards.y - this.y);
    const bearing = Math.atan2(towards.y - this.y, towards.x - this.x);
    if (this.phase === 'crop') {
      // Still, the head down in the blades; it settles to face them.
      this.heading = rotateToward(this.heading, bearing, t.turn * 0.5 * dt);
      this.speed = Math.max(0, this.speed - (t.speed * dt) / t.ease);
      this.stroke = (this.stroke + dt / (t.stroke * t.slowStroke)) % 1;
      if (this.phaseTime >= t.crop) {
        this.target = (this.target + 1) % this.route.length;
        this.phase = 'glide';
        this.phaseTime = 0;
      }
    } else {
      this.heading = rotateToward(this.heading, bearing, t.turn * dt);
      // It slows as it comes to the clump, and stops with its head over it.
      const left = gap - t.reach * bl;
      const want = left <= 0 ? 0 : Math.min(t.speed, (left / bl / t.ease) * 1.5);
      const change = (t.speed * dt) / t.ease;
      this.speed =
        want > this.speed
          ? Math.min(want, this.speed + change)
          : Math.max(want, this.speed - change);
      this.stroke = (this.stroke + (dt / t.stroke) * (0.3 + (0.7 * this.speed) / t.speed)) % 1;
      if (left <= 0.05 * bl) {
        this.phase = 'crop';
        this.phaseTime = 0;
      }
    }
    this.x += Math.cos(this.heading) * this.speed * bl * dt;
    this.y += Math.sin(this.heading) * this.speed * bl * dt;
  }

  /** Whether a point lies in the dark of its shadow on the bed. */
  shades(point: Point): boolean {
    const s = this.tuning.shadow;
    const bl = this.bl;
    const dx = point.x - (this.x + s.dx * bl);
    const dy = point.y - (this.y + s.dy * bl);
    const along = dx * Math.cos(this.heading) + dy * Math.sin(this.heading);
    const across = -dx * Math.sin(this.heading) + dy * Math.cos(this.heading);
    const a = (s.long / 2) * s.felt * bl;
    const b = (s.wide / 2) * s.felt * bl;
    return (along / a) ** 2 + (across / b) ** 2 <= 1;
  }

  /** BL from a point to the edge of its shell, 0 on or over it. */
  gapTo(point: Point): number {
    const s = this.tuning.shell;
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    const along = dx * Math.cos(this.heading) + dy * Math.sin(this.heading);
    const across = -dx * Math.sin(this.heading) + dy * Math.cos(this.heading);
    const distance = Math.hypot(along, across);
    if (distance === 0) return 0;
    // The shell's edge in that direction, as an oval.
    const angle = Math.atan2(across, along);
    const edge = (s.half * s.side) / Math.hypot(s.side * Math.cos(angle), s.half * Math.sin(angle));
    return Math.max(0, distance / this.bl - edge);
  }
}
