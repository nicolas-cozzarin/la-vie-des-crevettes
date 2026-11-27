import Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { Volcano } from '../core/creatures/volcano';
import { seededRandom, seedOf } from '../core/random';
import type { AreaDef } from '../data/areas/types';
import { CREATURES } from '../data/tuning';

interface Mound {
  id: string;
  x: number;
  y: number;
  rule: Volcano;
  cloud: Phaser.GameObjects.Image;
  /** Which way each grain flies on this puff. */
  grains: { angle: number; reach: number }[];
  random: () => number;
}

/**
 * The puffs of the sand volcanoes (doc 11, `thing.sandVolcano`; T108). The
 * mounds themselves are landmarks, drawn with the bed. Now and then a puff
 * of pale sand comes out of the hole at the top, spreads and settles, with a
 * few grains thrown out and falling back.
 */
export class SandVolcanoes {
  private readonly mounds: Mound[] = [];
  private readonly grains: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    area: AreaDef,
    private readonly bl: number,
  ) {
    const key = ensureTexture(scene, 'fx.sandPuff');
    for (const landmark of area.landmarks ?? []) {
      if (landmark.image !== 'thing.sandVolcano') continue;
      const random = seededRandom(seedOf(`${area.id}:${landmark.id}:puff`));
      this.mounds.push({
        id: landmark.id,
        x: landmark.x,
        y: landmark.y,
        rule: new Volcano(CREATURES.sandVolcano, random),
        cloud: scene.add
          .image(landmark.x, landmark.y, key)
          .setDepth(DEPTH.groundObjects + 1)
          .setVisible(false),
        grains: [],
        random,
      });
    }
    this.grains = scene.add.graphics().setDepth(DEPTH.groundObjects + 1.1);
  }

  /** The mounds puffing now. For the browser test. */
  get puffing(): string[] {
    return this.mounds.filter((mound) => mound.rule.puffing !== null).map((mound) => mound.id);
  }

  update(dt: number): void {
    const t = CREATURES.sandVolcano;
    const bl = this.bl;
    const g = this.grains.clear();
    for (const mound of this.mounds) {
      if (mound.rule.step(dt)) {
        mound.grains = Array.from({ length: t.grains }, () => ({
          angle: mound.random() * Math.PI * 2,
          reach: 0.3 + 0.4 * mound.random(),
        }));
      }
      const through = mound.rule.through;
      if (through === null) {
        mound.cloud.setVisible(false);
        continue;
      }
      // The cloud swells fast and thins slowly as it settles.
      const swell = 1 - (1 - through) ** 3;
      const size = (t.size.from + (t.size.to - t.size.from) * swell) * bl;
      mound.cloud
        .setVisible(true)
        .setDisplaySize(size, size * 0.85)
        .setAlpha(0.85 * (1 - through * through));
      // The grains go up and out, and fall back near the mound.
      g.fillStyle(0xf2ead6, 0.9 * (1 - through));
      for (const grain of mound.grains) {
        const out = grain.reach * bl * Math.sin(Math.min(1, through * 1.4) * (Math.PI / 2));
        const lift = 0.25 * bl * Math.sin(through * Math.PI);
        g.fillCircle(
          mound.x + Math.cos(grain.angle) * out,
          mound.y + Math.sin(grain.angle) * out - lift,
          0.03 * bl,
        );
      }
    }
  }

  destroy(): void {
    for (const mound of this.mounds) mound.cloud.destroy();
    this.grains.destroy();
  }
}
