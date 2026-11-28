/**
 * Food that rides the current: clumps of seaweed carried along a stretch of
 * water (doc 11, `food.seaweed`; T112). Each clump goes with the whole of the
 * water's speed where it is. One that leaves its run comes back in at the
 * upstream end, whole again, so the stretch always carries some. A shrimp
 * eats a clump whole by touching it on the move (doc 10, "Hunger"). Nothing
 * here knows about the engine.
 */

import type { FoodKind } from '../world/kinds';
import { inRect, type Rect } from '../world/zones';
import { currentAt, type Current } from '../movement/currents';

export interface DriftingTuning {
  /** Pixels: a clump fades in and out over this much of each end of its run. */
  fade: number;
  /** Radians per second: the most a clump turns as it rides. */
  spin: number;
}

export interface Clump {
  id: string;
  kind: FoodKind;
  x: number;
  y: number;
  /** Its turn, in radians. */
  rotation: number;
  /** Radians per second. */
  spin: number;
  /** Eaten on this pass: unseen until it comes in again. */
  eaten: boolean;
}

export interface DriftingRun {
  /** The clumps' ids are this, a dot and a number. */
  id: string;
  kind: FoodKind;
  /** Where the clumps ride. */
  run: Rect;
  count: number;
}

/** Which side of a run the water comes in by: the one it runs away from, on its stronger axis. */
export type Side = 'left' | 'right' | 'top' | 'bottom';

export function upstreamSide(water: { vx: number; vy: number }): Side {
  if (Math.abs(water.vx) >= Math.abs(water.vy)) return water.vx <= 0 ? 'right' : 'left';
  return water.vy <= 0 ? 'bottom' : 'top';
}

export class DriftingFood {
  readonly clumps: Clump[] = [];
  private readonly side: Side;

  constructor(
    readonly def: DriftingRun,
    private readonly currents: readonly Current[],
    private readonly random: () => number,
    private readonly tuning: DriftingTuning,
  ) {
    const { run } = def;
    this.side = upstreamSide(currentAt(currents, run.x + run.w / 2, run.y + run.h / 2));
    // Spread along the run from end to end, each at its own place across it.
    for (let index = 0; index < def.count; index++) {
      const along = (index + 0.5) / def.count;
      const clump: Clump = {
        id: `${def.id}.${index + 1}`,
        kind: def.kind,
        x: 0,
        y: 0,
        rotation: random() * Math.PI * 2,
        spin: (random() * 2 - 1) * tuning.spin,
        eaten: false,
      };
      this.place(clump, along);
      this.clumps.push(clump);
    }
  }

  /** The water carries each clump; one that leaves the run comes in again upstream. */
  step(dt: number): void {
    for (const clump of this.clumps) {
      const water = currentAt(this.currents, clump.x, clump.y);
      clump.x += water.vx * dt;
      clump.y += water.vy * dt;
      clump.rotation += clump.spin * dt;
      if (!inRect(clump.x, clump.y, this.def.run)) {
        this.place(clump, 0);
        clump.eaten = false;
      }
    }
  }

  /** The first clump not yet eaten whose centre is within `reach` of a point. */
  touching(x: number, y: number, reach: number): Clump | null {
    for (const clump of this.clumps) {
      if (clump.eaten) continue;
      if (Math.hypot(clump.x - x, clump.y - y) <= reach) return clump;
    }
    return null;
  }

  /** 0 to 1: how much of a clump shows, fading at both ends of the run and gone once eaten. */
  shown(clump: Clump): number {
    if (clump.eaten) return 0;
    const { run } = this.def;
    const across = this.side === 'left' || this.side === 'right';
    const from = across ? clump.x - run.x : clump.y - run.y;
    const length = across ? run.w : run.h;
    const edge = Math.min(from, length - from);
    return Math.max(0, Math.min(1, edge / this.tuning.fade));
  }

  /** Puts a clump `along` its run from the upstream end (0) to the downstream end (1). */
  private place(clump: Clump, along: number): void {
    const { run } = this.def;
    const across = this.random();
    // A clump coming in starts just inside, so it is not out again at once.
    const inset = Math.max(along, 0.001);
    if (this.side === 'right') {
      clump.x = run.x + run.w * (1 - inset);
      clump.y = run.y + run.h * across;
    } else if (this.side === 'left') {
      clump.x = run.x + run.w * inset;
      clump.y = run.y + run.h * across;
    } else if (this.side === 'bottom') {
      clump.x = run.x + run.w * across;
      clump.y = run.y + run.h * (1 - inset);
    } else {
      clump.x = run.x + run.w * across;
      clump.y = run.y + run.h * inset;
    }
  }
}
