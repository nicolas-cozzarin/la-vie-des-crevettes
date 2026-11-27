/**
 * Water that runs: the creek mouth breathing in, the gutter, the pass, the
 * channel's tide (doc 02, "Current"; doc 11). It carries whatever is in it.
 * A shrimp off the bed goes with all of it; one on the bed holds on with its
 * legs and goes with a share of it; one under cover or dug in does not go at
 * all (T110). Nothing here knows about the engine.
 */

import { inRect, type Rect } from '../world/zones';
import type { MotionMode } from './ShrimpMotion';

export interface Current {
  zone: Rect;
  /** Pixels per second. */
  vx: number;
  vy: number;
}

export interface CurrentTuning {
  /** Share of the current that carries a shrimp walking or resting on the bed. */
  onBed: number;
}

/** The water's speed at a point: every current that holds it, added up. Zero where none runs. */
export function currentAt(
  currents: readonly Current[],
  x: number,
  y: number,
): { vx: number; vy: number } {
  let vx = 0;
  let vy = 0;
  for (const current of currents) {
    if (!inRect(x, y, current.zone)) continue;
    vx += current.vx;
    vy += current.vy;
  }
  return { vx, vy };
}

/** Whether any current runs at a point. */
export function inCurrent(currents: readonly Current[], x: number, y: number): boolean {
  return currents.some((current) => inRect(x, y, current.zone));
}

/** How far the water carries a shrimp in `dt` seconds. */
export function carried(
  water: { vx: number; vy: number },
  body: { mode: MotionMode; tucked: boolean },
  dt: number,
  tuning: CurrentTuning,
): { dx: number; dy: number } {
  if (body.tucked) return { dx: 0, dy: 0 };
  const offTheBed = body.mode === 'swim' || body.mode === 'dart' || body.mode === 'glide';
  const share = offTheBed ? 1 : tuning.onBed;
  return { dx: water.vx * share * dt, dy: water.vy * share * dt };
}
