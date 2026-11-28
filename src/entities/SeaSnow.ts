import type Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { seededRandom } from '../core/random';
import { SEA } from '../data/tuning';

interface Speck {
  image: Phaser.GameObjects.Image;
  layer: number;
  /** Where it is in the layer's sheet, from 0 to 1 across the view. */
  u: number;
  v: number;
  size: number;
  /** Seconds since it came into the light. */
  age: number;
}

/** Below the shrimp, among the shrimp, above the shrimp. */
const LAYER_DEPTH = [DEPTH.bed + 3, DEPTH.midWater + 0.5, DEPTH.surfaceLight - 2];

/** A little more than the view, so that a speck leaves before it wraps. */
const MARGIN = 60;

/**
 * Marine snow (doc 11, `fx.snow`): pale specks in three layers that give the
 * open sea its depth. Each layer slides with the view at its own rate, the far
 * one slower than the bed, the near one faster. Seen from above, a speck that
 * sinks grows smaller and dimmer until it is gone, and another comes into the
 * light somewhere else.
 */
export class SeaSnow {
  private readonly specks: Speck[] = [];
  private readonly random = seededRandom(2107);
  private time = 0;

  constructor(scene: Phaser.Scene) {
    const texture = ensureTexture(scene, 'fx.snow');
    SEA.snow.count.forEach((count, layer) => {
      for (let index = 0; index < count; index++) {
        const [small, large] = SEA.snow.size[layer] ?? [4, 6];
        const speck: Speck = {
          image: scene.add.image(0, 0, texture).setDepth(LAYER_DEPTH[layer] ?? DEPTH.midWater),
          layer,
          u: this.random(),
          v: this.random(),
          size: small + this.random() * (large - small),
          age: this.random() * (SEA.snow.sink[layer] ?? 20),
        };
        this.specks.push(speck);
      }
    });
  }

  update(dt: number, view: Phaser.Geom.Rectangle): void {
    this.time += dt;
    const w = view.width + 2 * MARGIN;
    const h = view.height + 2 * MARGIN;
    const wrap = (value: number, size: number): number => ((value % size) + size) % size;
    for (const speck of this.specks) {
      const sink = SEA.snow.sink[speck.layer] ?? 20;
      speck.age += dt;
      if (speck.age >= sink) {
        speck.age -= sink;
        speck.u = this.random();
        speck.v = this.random();
      }
      const through = speck.age / sink;
      // Into the light quickly, out of it slowly as it sinks away.
      const shown = Math.min(1, through / 0.15) * Math.min(1, (1 - through) / 0.45);
      const parallax = SEA.snow.parallax[speck.layer] ?? 1;
      const sway = Math.sin(this.time * 0.4 + speck.u * 20) * 3;
      speck.image
        .setPosition(
          view.x - MARGIN + wrap(speck.u * w - view.x * parallax, w) + sway,
          view.y - MARGIN + wrap(speck.v * h - view.y * parallax, h),
        )
        .setDisplaySize(speck.size * (1 - 0.45 * through), speck.size * (1 - 0.45 * through))
        .setAlpha((SEA.snow.alpha[speck.layer] ?? 0.25) * shown);
    }
  }

  destroy(): void {
    for (const speck of this.specks) speck.image.destroy();
    this.specks.length = 0;
  }
}
