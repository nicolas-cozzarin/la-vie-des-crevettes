import type Phaser from 'phaser';
import type { Bounds, Obstacle, Point } from '../core/movement/collision';
import { along, pointBeyond } from '../core/npc/journey';
import { entryAlong, Passing } from '../core/npc/passing';
import { isClear } from '../core/npc/steer';
import { seededRandom, seedOf } from '../core/random';
import type { AreaDef } from '../data/areas/types';
import { MOTION, PASSING } from '../data/tuning';
import type { Shoal } from './Shoal';

/** Tries at a place for each one of a group before it waits and tries again. */
const TRIES = 6;

/**
 * Strangers passing through (doc 11, `shrimp.traveller`; T114). Now and
 * then a small group comes down the area's journey from upstream, out of
 * sight, swims past the player on its own way to the sea and goes on out
 * of sight. They are shrimp of the `Shoal`, marked as travellers; this says
 * when they come, where, and when they have gone.
 */
export class Travellers {
  private readonly passing: Passing;
  private readonly random: () => number;
  private group = 0;
  /** Those who have come into the area. Out of it again, they have left it. */
  private readonly entered = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly shoal: Shoal,
    private readonly area: AreaDef,
    private readonly bl: number,
    private readonly obstacles: readonly Obstacle[],
    private readonly bounds: Bounds,
  ) {
    this.random = seededRandom(seedOf(`${area.id}:passing`));
    this.passing = new Passing(PASSING, this.random);
  }

  /** Seconds before the next group may come. */
  get due(): number {
    return this.passing.due;
  }

  /** With `?debug`: a group comes now. */
  now(): void {
    this.passing.now();
  }

  update(dt: number, view: Phaser.Geom.Rectangle, player: Point): void {
    const route = this.area.journey;
    if (!route || route.length < 2) return;
    // Out of sight, those who came in and are past the area's edge again, or far
    // from the player, have gone on.
    const gone: string[] = [];
    for (const one of this.shoal.travellers) {
      const inside = this.insideArea(one.x, one.y);
      if (inside) this.entered.add(one.id);
      if (this.seen(view, one.x, one.y)) continue;
      const far = Math.hypot(one.x - player.x, one.y - player.y) > PASSING.gone * this.bl;
      if (far || (!inside && this.entered.has(one.id))) gone.push(one.id);
    }
    if (gone.length > 0) {
      this.shoal.remove(gone);
      for (const id of gone) this.entered.delete(id);
    }

    const count = this.passing.step(dt, this.shoal.travellers.length > 0);
    if (count === 0) return;
    const come = this.places(route, view, player, count);
    if (!come) {
      this.passing.later();
      return;
    }
    this.group += 1;
    this.shoal.addTravellers(this.scene, this.group, come.places, come.heading);
  }

  /**
   * Where a group of `count` comes in: upstream of the player along the
   * journey, beyond the view, the first in front and the rest trailing
   * behind it. Null when no such place is out of sight and clear.
   */
  private places(
    route: readonly Point[],
    view: Phaser.Geom.Rectangle,
    player: Point,
    count: number,
  ): { places: Point[]; heading: number } | null {
    const bl = this.bl;
    const reach = Math.hypot(view.width, view.height) / 2 + PASSING.beyond * bl;
    const at = entryAlong(along(route, player.x, player.y), reach, PASSING.beyond * bl);
    const front = pointBeyond(route, at);
    const next = pointBeyond(route, at + bl);
    const heading = Math.atan2(next.y - front.y, next.x - front.x);
    const back = { x: -Math.cos(heading), y: -Math.sin(heading) };
    const side = { x: -back.y, y: back.x };
    const radius = MOTION.radius * bl;
    const places: Point[] = [];
    for (let index = 0; index < count; index++) {
      let found: Point | null = null;
      for (let attempt = 0; attempt < TRIES && !found; attempt++) {
        const behind = index === 0 ? 0 : this.random() * PASSING.spread * 2 * bl;
        const across = (this.random() * 2 - 1) * PASSING.spread * bl;
        const x = front.x + back.x * behind + side.x * across;
        const y = front.y + back.y * behind + side.y * across;
        const crowded = places.some((one) => Math.hypot(one.x - x, one.y - y) < bl);
        if (!crowded && !this.seen(view, x, y) && isClear(x, y, radius, this.obstacles, null)) {
          found = { x, y };
        }
      }
      if (!found) return null;
      places.push(found);
    }
    return { places, heading };
  }

  /** Whether any of a body there might show: a body length beyond the view's edge counts. */
  private seen(view: Phaser.Geom.Rectangle, x: number, y: number): boolean {
    const margin = this.bl;
    return (
      x > view.x - margin &&
      x < view.right + margin &&
      y > view.y - margin &&
      y < view.bottom + margin
    );
  }

  private insideArea(x: number, y: number): boolean {
    const { bounds } = this;
    return x >= bounds.x && y >= bounds.y && x <= bounds.x + bounds.w && y <= bounds.y + bounds.h;
  }
}
