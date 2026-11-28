/**
 * Behind the outlet's mesh, the pond's shrimp (doc 18, "Level 3"; D39):
 * pale shapes close together, moving along the inside of the wall, seen
 * only through the opening. When the player comes near the mesh, one of
 * them comes to it and stays there, facing out. Nothing here knows about
 * the engine.
 */

import type { Point } from '../movement/collision';

export interface CrowdTuning {
  /** Pixels per second along the wall, at most and at least. */
  speed: readonly [number, number];
  /** Pixels per second for the one coming to the mesh. */
  come: number;
  /** Pixels from the mesh within which the player brings one. */
  near: number;
}

export interface CrowdShape {
  x: number;
  y: number;
  heading: number;
  /** The one that came to the mesh. */
  atMesh: boolean;
}

/** Where the shapes pass: along the wall's inside, from one end of the loop to the other. */
export interface CrowdBand {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class Crowd {
  readonly shapes: CrowdShape[] = [];
  private readonly speeds: number[] = [];
  private one: CrowdShape | null = null;

  constructor(
    private readonly band: CrowdBand,
    /** Just behind the mesh, at the middle of the opening. */
    private readonly mesh: Point,
    count: number,
    private readonly tuning: CrowdTuning,
    random: () => number,
  ) {
    const span = band.right - band.left;
    for (let index = 0; index < count; index++) {
      // Close together, evenly along the loop, each a little off its place.
      const x = band.left + ((index + random() * 0.6) / count) * span;
      const y = band.top + random() * (band.bottom - band.top);
      this.shapes.push({ x, y, heading: 0, atMesh: false });
      const [slow, fast] = tuning.speed;
      this.speeds.push(slow + random() * (fast - slow));
    }
  }

  /** The one at the mesh, or null before the player has come. */
  get atMesh(): CrowdShape | null {
    return this.one;
  }

  step(dt: number, player: Point): void {
    const { band, mesh, tuning } = this;
    const near = Math.hypot(player.x - mesh.x, player.y - mesh.y) <= tuning.near;
    if (near && !this.one) {
      // The one nearest the mesh comes.
      let best: CrowdShape | null = null;
      for (const shape of this.shapes) {
        if (!best || Math.abs(shape.x - mesh.x) < Math.abs(best.x - mesh.x)) best = shape;
      }
      if (best) {
        best.atMesh = true;
        this.one = best;
      }
    }
    this.shapes.forEach((shape, index) => {
      if (shape.atMesh) {
        const dx = mesh.x - shape.x;
        const dy = mesh.y - shape.y;
        const gap = Math.hypot(dx, dy);
        const move = Math.min(gap, tuning.come * dt);
        if (gap > 1e-6) {
          shape.x += (dx / gap) * move;
          shape.y += (dy / gap) * move;
        }
        // Once there it faces out, toward the player.
        shape.heading =
          gap > 1 ? Math.atan2(dy, dx) : Math.atan2(player.y - shape.y, player.x - shape.x);
        return;
      }
      shape.x += (this.speeds[index] ?? 0) * dt;
      shape.heading = 0;
      if (shape.x > band.right) shape.x -= band.right - band.left;
    });
  }
}
