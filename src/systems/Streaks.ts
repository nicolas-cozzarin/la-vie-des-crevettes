import type Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { currentAt, type Current } from '../core/movement/currents';
import { seededRandom, seedOf } from '../core/random';
import type { AreaDef } from '../data/areas/types';
import { CURRENT } from '../data/tuning';

interface Streak {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  age: number;
  life: number;
}

/**
 * Specks in fast water, drawn out into short lines (doc 11, `fx.streak`):
 * they show how fast the water runs and which way. A few dozen live in view
 * at a time, each carried by the water for a second or two, then placed
 * again somewhere in view. Slow water shows none.
 */
export class Streaks {
  private readonly streaks: Streak[] = [];
  private readonly currents: readonly Current[];
  private readonly random: () => number;

  constructor(
    scene: Phaser.Scene,
    area: AreaDef,
    private readonly bl: number,
  ) {
    this.currents = area.currents ?? [];
    this.random = seededRandom(seedOf(`${area.id}.streaks`));
    const t = CURRENT.streaks;
    const fast = this.currents.some((one) => Math.hypot(one.vx, one.vy) >= t.from * bl);
    if (!fast) return;
    const key = ensureTexture(scene, 'fx.streak');
    for (let index = 0; index < t.count; index++) {
      const image = scene.add.image(0, 0, key).setDepth(DEPTH.midWater).setAlpha(0);
      // Each starts part way through its life, so they do not all appear at once.
      const life = this.lifetime();
      this.streaks.push({ image, x: 0, y: 0, age: this.random() * life, life });
    }
  }

  /** Carries each streak with the water, inside the view. */
  update(dt: number, view: { x: number; y: number; width: number; height: number }): void {
    const t = CURRENT.streaks;
    for (const streak of this.streaks) {
      streak.age += dt;
      const outside =
        streak.x < view.x ||
        streak.y < view.y ||
        streak.x > view.x + view.width ||
        streak.y > view.y + view.height;
      if (streak.age >= streak.life || outside) {
        streak.x = view.x + this.random() * view.width;
        streak.y = view.y + this.random() * view.height;
        streak.age = streak.age >= streak.life ? 0 : streak.age;
        streak.life = this.lifetime();
      }
      const water = currentAt(this.currents, streak.x, streak.y);
      streak.x += water.vx * dt;
      streak.y += water.vy * dt;
      const speed = Math.hypot(water.vx, water.vy) / this.bl;
      if (speed < t.from) {
        streak.image.setAlpha(0);
        continue;
      }
      const length = Math.min(t.longest, t.length * speed) * this.bl;
      const fade = Math.sin((Math.PI * streak.age) / streak.life);
      streak.image
        .setPosition(streak.x, streak.y)
        .setRotation(Math.atan2(water.vy, water.vx))
        .setDisplaySize(length, 4)
        .setAlpha(t.alpha * Math.min(1, speed / 2) * fade);
    }
  }

  destroy(): void {
    for (const streak of this.streaks) streak.image.destroy();
    this.streaks.length = 0;
  }

  private lifetime(): number {
    const [from, to] = CURRENT.streaks.life;
    return from + this.random() * (to - from);
  }
}
