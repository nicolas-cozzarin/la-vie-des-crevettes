import type Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { DriftingFood, type Clump } from '../core/food/drifting';
import { seededRandom, seedOf } from '../core/random';
import type { AreaDef } from '../data/areas/types';
import { DRIFTING } from '../data/tuning';

interface Drawn {
  clump: Clump;
  food: DriftingFood;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

/**
 * The area's food that rides the current, as drawn (doc 11, `food.seaweed`;
 * T112): each clump just over the bed, under the shrimp, with its soft
 * shadow below. The rules are `DriftingFood` in `src/core/food/drifting.ts`.
 */
export class DriftingFoods {
  private readonly runs: DriftingFood[] = [];
  private readonly drawn: Drawn[] = [];

  constructor(
    scene: Phaser.Scene,
    area: AreaDef,
    private readonly bl: number,
  ) {
    const tuning = { fade: DRIFTING.fade * bl, spin: DRIFTING.spin };
    for (const def of area.drifting ?? []) {
      const food = new DriftingFood(
        def,
        area.currents ?? [],
        seededRandom(seedOf(`${area.id}.${def.id}`)),
        tuning,
      );
      this.runs.push(food);
      const key = ensureTexture(scene, `food.${def.kind}`);
      for (const clump of food.clumps) {
        const shadow = scene.add
          .image(clump.x, clump.y, ensureTexture(scene, 'shadow.soft'))
          .setDisplaySize(def.size * 0.8, def.size * 0.8)
          .setDepth(DEPTH.groundObjects + 1);
        const frame = scene.textures.getFrame(key);
        const image = scene.add
          .image(clump.x, clump.y, key)
          .setDisplaySize(def.size, (def.size * frame.height) / frame.width)
          .setDepth(DEPTH.bedAnimals - 1);
        this.drawn.push({ clump, food, image, shadow });
      }
    }
    this.update(0);
  }

  /** Whether the area has any. */
  get any(): boolean {
    return this.drawn.length > 0;
  }

  /** The water carries every clump on. */
  update(dt: number): void {
    for (const run of this.runs) run.step(dt);
    const drop = DRIFTING.shadow * this.bl;
    for (const { clump, food, image, shadow } of this.drawn) {
      const shown = food.shown(clump);
      image.setPosition(clump.x, clump.y).setRotation(clump.rotation).setAlpha(shown);
      shadow.setPosition(clump.x + drop * 0.4, clump.y + drop).setAlpha(shown * 0.35);
    }
  }

  /** The clump the mouth is on, if any, not yet eaten and showing. */
  touching(x: number, y: number): Clump | null {
    const reach = DRIFTING.reach * this.bl;
    for (const run of this.runs) {
      const clump = run.touching(x, y, reach);
      if (clump && run.shown(clump) > 0.5) return clump;
    }
    return null;
  }

  /** A clump showing, not eaten, within `reach` px of a point. */
  near(x: number, y: number, reach: number): boolean {
    return this.drawn.some(
      ({ clump, food }) =>
        !clump.eaten && food.shown(clump) > 0.5 && Math.hypot(clump.x - x, clump.y - y) <= reach,
    );
  }

  /** Where each clump is, for the journal and the test. */
  get places(): { id: string; x: number; y: number; eaten: boolean }[] {
    return this.drawn.map(({ clump }) => ({
      id: clump.id,
      x: clump.x,
      y: clump.y,
      eaten: clump.eaten,
    }));
  }

  destroy(): void {
    for (const { image, shadow } of this.drawn) {
      image.destroy();
      shadow.destroy();
    }
    this.drawn.length = 0;
    this.runs.length = 0;
  }
}
