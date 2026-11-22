import type Phaser from 'phaser';
import { approach } from '../core/movement/angles';
import { CREATURES, MOOD } from '../data/tuning';

interface Lit {
  glow: Phaser.Filters.Glow;
  /** 0 to 1, eased. */
  amount: number;
}

/**
 * The soft pale rim around what the shrimp is curious about (doc 10,
 * "Screen", and doc 11, `fx.rim`): a glow made from the target's own
 * pictures. It comes and goes over half a second, like every other change of
 * mood on the screen.
 */
export class Rim {
  private readonly lit = new Map<Phaser.GameObjects.Image, Lit>();
  private wanted = new Set<Phaser.GameObjects.Image>();

  /** The pictures that should have the rim now. An empty list lets it fade. */
  set(images: readonly Phaser.GameObjects.Image[]): void {
    this.wanted = new Set(images);
  }

  update(dt: number): void {
    const ease = approach(dt, MOOD.screen / 3);
    for (const image of this.wanted) {
      if (this.lit.has(image) || !image.active) continue;
      image.enableFilters();
      const rim = CREATURES.rim;
      const glow = image.filters?.internal.addGlow(rim.color, 0, 0, 1, false, 10, rim.width);
      if (glow) this.lit.set(image, { glow, amount: 0 });
    }
    for (const [image, lit] of this.lit) {
      const target = this.wanted.has(image) ? 1 : 0;
      lit.amount += (target - lit.amount) * ease;
      if (!image.active) {
        this.lit.delete(image);
        continue;
      }
      if (target === 0 && lit.amount < 0.02) {
        image.filters?.internal.remove(lit.glow);
        this.lit.delete(image);
        continue;
      }
      lit.glow.outerStrength = lit.amount * CREATURES.rim.strength * 4;
    }
  }

  /** What the browser test can see: how many pictures are rimmed, and how strongly. */
  get snapshot(): number {
    let sum = 0;
    for (const lit of this.lit.values()) sum += lit.amount;
    return this.lit.size === 0 ? 0 : sum / this.lit.size;
  }
}
