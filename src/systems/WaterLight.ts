import Phaser from 'phaser';
import { IMAGE_SCALE } from '../art/fit';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import type { LightDef } from '../data/areas/types';
import { WATER_LIGHT } from '../data/tuning';
import { VIEW_H, VIEW_W } from './AreaLoader';

/**
 * Light from above and how far the eye reaches. The dapple is a tile of
 * light patches, the size of the view, that slides slowly and only
 * lightens. The murk follows the shrimp, not the world: centred on it and
 * twice the size of the view, so it still covers the screen when the camera
 * is held at the area's edge and the shrimp is off centre.
 */
export class WaterLight {
  private readonly dapple: Phaser.GameObjects.TileSprite | null;
  private readonly murk: Phaser.GameObjects.Image | null;
  private slide = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, light: LightDef | undefined) {
    this.dapple = light?.dapple
      ? scene.add
          .tileSprite(0, 0, VIEW_W + 4, VIEW_H + 4, ensureTexture(scene, light.dapple))
          .setOrigin(0)
          .setTileScale(1 / IMAGE_SCALE)
          .setBlendMode(Phaser.BlendModes.SCREEN)
          .setAlpha(light.dappleStrength ?? 1)
          .setDepth(DEPTH.surfaceLight)
      : null;
    this.murk = light?.murk
      ? scene.add
          .image(0, 0, ensureTexture(scene, light.murk))
          .setDisplaySize(VIEW_W * 2, VIEW_H * 2)
          .setDepth(DEPTH.mood)
      : null;
  }

  /** Lay the dapple over the view and centre the murk on the shrimp. */
  update(dt: number, viewLeft: number, viewTop: number, shrimpX: number, shrimpY: number): void {
    this.slide.x += WATER_LIGHT.dappleDrift.x * dt;
    this.slide.y += WATER_LIGHT.dappleDrift.y * dt;
    if (this.dapple) {
      const scale = 1 / IMAGE_SCALE;
      this.dapple
        .setPosition(viewLeft, viewTop)
        .setTilePosition((viewLeft - this.slide.x) / scale, (viewTop - this.slide.y) / scale);
    }
    this.murk?.setPosition(shrimpX, shrimpY);
  }
}
