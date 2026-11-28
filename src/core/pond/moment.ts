/**
 * The shoal passing the pond's gate (doc 18, "Level 3"; D39). When the
 * player enters the pond's water, or comes up to the gate: Nacre stops short
 * of the water, Brise goes to the mesh. Then the tide pulls, and they go on with
 * the shoal. Once a visit. Nothing here knows about the engine.
 */

import type { Point } from '../movement/collision';
import type { Plume } from './plume';
import { inPlume } from './plume';

export interface GateMomentTuning {
  /** Pixels from the gate's mouth that count as being at the gate, in its water or not. */
  start: number;
  /** Pixels: a companion farther than this from the gate keeps to the journey. */
  reach: number;
  /** Pixels in front of the mesh, and to the upstream side of its middle, that Brise makes for. */
  atMesh: { out: number; aside: number };
  /** Pixels beyond the plume's edge that Nacre stops. */
  short: number;
  /** Seconds out of the pond's water, or after the greeting at the mesh, before the tide pulls. */
  pull: number;
}

export type GateMomentStage = 'before' | 'at' | 'after';

export class GateMoment {
  stage: GateMomentStage = 'before';
  private waited = 0;
  private greeted = false;
  /** Where Brise makes for: in front of the mesh, a little upstream of the player there. */
  readonly mesh: Point;
  /** Where Nacre stops: beyond the plume's edge, on the side away from the bank. */
  readonly short: Point;

  constructor(
    private readonly plume: Plume,
    private readonly gate: Point,
    private readonly tuning: GateMomentTuning,
  ) {
    const dx = plume.to.x - plume.from.x;
    const dy = plume.to.y - plume.from.y;
    const length = Math.hypot(dx, dy) || 1;
    // The way the water came from: against the plume's lean along the bank.
    const upstream = dx === 0 ? 1 : -Math.sign(dx);
    this.mesh = { x: gate.x + upstream * tuning.atMesh.aside, y: gate.y + tuning.atMesh.out };
    // Out from the plume's start, square to it, away from the bank.
    let nx = -dy / length;
    let ny = dx / length;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const away = plume.width / 2 + tuning.short;
    this.short = { x: plume.from.x + nx * away, y: plume.from.y + ny * away };
  }

  /** The player's antennae touched the one at the mesh: the tide pulls a little later. */
  greetedAtMesh(): void {
    if (this.stage === 'at') this.greeted = true;
  }

  step(dt: number, player: Point): void {
    const inside =
      inPlume(this.plume, player.x, player.y) ||
      Math.hypot(player.x - this.gate.x, player.y - this.gate.y) <= this.tuning.start;
    if (this.stage === 'before') {
      if (inside) this.stage = 'at';
      return;
    }
    if (this.stage !== 'at') return;
    if (inside && !this.greeted) {
      this.waited = 0;
      return;
    }
    this.waited += dt;
    if (this.waited >= this.tuning.pull) this.stage = 'after';
  }

  /**
   * Where a companion makes for while the moment lasts, instead of the
   * shoal's way on: Brise to the mesh, Nacre short of the water. Null for
   * anyone else, any other time, or a companion too far from the gate.
   */
  goalFor(id: string, here: Point): Point | null {
    if (this.stage !== 'at') return null;
    const goal = id === 'brise' ? this.mesh : id === 'nacre' ? this.short : null;
    if (!goal) return null;
    return Math.hypot(here.x - goal.x, here.y - goal.y) <= this.tuning.reach ? goal : null;
  }
}
