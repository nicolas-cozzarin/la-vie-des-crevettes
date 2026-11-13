import Phaser from 'phaser';
import { app } from '../app';
import { ROCK_FILL, SLAB_MARGIN } from '../art/painters/world';
import { ensureTexture } from '../art/TextureFactory';
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { approach } from '../core/movement/angles';
import { moveCircle, type Bounds, type Obstacle } from '../core/movement/collision';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import { seededRandom } from '../core/random';
import { sandFlat } from '../data/areas/sandFlat';
import type { AreaDef } from '../data/areas/types';
import { BODY_LENGTH_PX, CAMERA, FRAME, MOTION } from '../data/tuning';
import { debugState } from '../debug';
import { ShrimpRig } from '../entities/ShrimpRig';
import type { HudScene } from './HudScene';

/**
 * Play. For now it holds one small sandy area in which to try the shrimp's
 * movement. Later it loads whichever area the story asks for.
 */
export class PlayScene extends Phaser.Scene {
  private area: AreaDef = sandFlat;
  private motion!: ShrimpMotion;
  private rig!: ShrimpRig;
  private mover!: Mover;
  private ground!: Phaser.GameObjects.TileSprite;
  private view = { x: 0, y: 0 };
  private lead = { x: 0, y: 0 };

  private hud: HudScene | null = null;

  constructor() {
    super('Play');
  }

  create(): void {
    const area = this.area;
    const bounds: Bounds = { x: 0, y: 0, w: area.size.w, h: area.size.h };
    const obstacles: Obstacle[] = area.obstacles;

    this.buildWorld(area);

    this.motion = new ShrimpMotion(MOTION, area.spawn);
    this.mover = (x, y, dx, dy) =>
      moveCircle(x, y, dx, dy, this.motion.radiusPx, obstacles, bounds);
    this.rig = new ShrimpRig(this, BODY_LENGTH_PX, DEPTH.bedAnimals);
    this.rig.update(0, this.motion);

    const camera = this.cameras.main;
    camera.setBackgroundColor(COLORS.deepTeal);
    camera.setZoom(CAMERA.zoom);
    this.view = { x: area.spawn.x, y: area.spawn.y };
    this.lead = { x: 0, y: 0 };
    this.aim();

    this.scene.launch('Hud');
    this.hud = this.scene.get('Hud') as HudScene;

    debugState.player = () => ({
      x: this.motion.x,
      y: this.motion.y,
      heading: this.motion.heading,
      mode: this.motion.mode,
      height: this.motion.height,
    });

    // If the tab loses focus, the game pauses.
    const stopBlur = app.keyboard.onBlur(() => this.openPause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopBlur();
      debugState.player = null;
      this.rig.destroy();
      this.hud = null;
      this.scene.stop('Hud');
    });
  }

  override update(_time: number, deltaMs: number): void {
    const actions = app.actions;

    if (actions.justPressed('pause')) {
      this.openPause();
      return;
    }

    // A slow frame is played as several short steps, so the shrimp covers the
    // same ground whatever the frame rate.
    const frame = Math.min(deltaMs / 1000, FRAME.longest);
    const axis = actions.axis();
    let dart = actions.justPressed('tailFlip');
    let darted = false;
    let remaining = frame;
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, FRAME.step);
      const result = this.motion.step(dt, { x: axis.x, y: axis.y, dart }, this.mover);
      darted = darted || result.darted;
      dart = false;
      remaining -= dt;
    }

    this.rig.update(frame, this.motion);
    this.follow(frame);
    this.hud?.track(frame, axis.x !== 0 || axis.y !== 0, darted);
  }

  private openPause(): void {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause');
  }

  /** The view trails the shrimp a little and looks slightly ahead of it. */
  private follow(dt: number): void {
    const motion = this.motion;
    const max = CAMERA.lookAheadMax * BODY_LENGTH_PX;
    let leadX = motion.vx * CAMERA.lookAheadTime;
    let leadY = motion.vy * CAMERA.lookAheadTime;
    const length = Math.hypot(leadX, leadY);
    if (length > max) {
      leadX *= max / length;
      leadY *= max / length;
    }
    // The lead itself moves slowly, so a dart does not jerk the view.
    const ease = approach(dt, 0.45);
    this.lead.x += (leadX - this.lead.x) * ease;
    this.lead.y += (leadY - this.lead.y) * ease;

    const follow = approach(dt, CAMERA.followTime);
    this.view.x += (motion.x + this.lead.x - this.view.x) * follow;
    this.view.y += (motion.y + this.lead.y - this.view.y) * follow;

    this.aim();
  }

  /** Point the camera at the view, kept inside the area, and lay the bed under it. */
  private aim(): void {
    const halfW = GAME_WIDTH / CAMERA.zoom / 2;
    const halfH = GAME_HEIGHT / CAMERA.zoom / 2;
    const { w, h } = this.area.size;
    this.view.x = Phaser.Math.Clamp(this.view.x, halfW, Math.max(halfW, w - halfW));
    this.view.y = Phaser.Math.Clamp(this.view.y, halfH, Math.max(halfH, h - halfH));
    this.cameras.main.centerOn(this.view.x, this.view.y);

    // The bed is one repeating image the size of the view. It moves with the
    // view and its pattern is slid the other way, so the sand stays put.
    const left = this.view.x - halfW - 2;
    const top = this.view.y - halfH - 2;
    this.ground.setPosition(left, top).setTilePosition(left, top);
  }

  private buildWorld(area: AreaDef): void {
    this.ground = this.add
      .tileSprite(
        0,
        0,
        GAME_WIDTH / CAMERA.zoom + 4,
        GAME_HEIGHT / CAMERA.zoom + 4,
        ensureTexture(this, area.ground),
      )
      .setOrigin(0)
      .setDepth(DEPTH.bed);

    const shadow = ensureTexture(this, 'shadow.soft');

    for (const scatter of area.scatter) {
      const random = seededRandom(scatter.seed);
      const texture = ensureTexture(this, scatter.image);
      for (let index = 0; index < scatter.count; index++) {
        const x = scatter.zone.x + random() * scatter.zone.w;
        const y = scatter.zone.y + random() * scatter.zone.h;
        const size = scatter.size[0] + random() * (scatter.size[1] - scatter.size[0]);
        const squash = 0.7 + random() * 0.3;
        const turn = random() * Math.PI * 2;
        const shade = 0.82 + random() * 0.18;
        this.add
          .image(x, y, texture)
          .setDisplaySize(size, size * squash)
          .setRotation(turn)
          .setTint(Phaser.Display.Color.GetColor(255 * shade, 250 * shade, 238 * shade))
          .setDepth(DEPTH.bed + 1);
      }
    }

    for (const obstacle of area.obstacles) {
      const texture = ensureTexture(this, obstacle.image);
      if (obstacle.shape === 'circle') {
        const size = (obstacle.r * 2) / ROCK_FILL;
        this.add
          .image(obstacle.x + obstacle.r * 0.14, obstacle.y + obstacle.r * 0.18, shadow)
          .setDisplaySize(size * 1.12, size * 1.12)
          .setAlpha(0.42)
          .setDepth(DEPTH.groundObjects);
        this.add
          .image(obstacle.x, obstacle.y, texture)
          .setDisplaySize(size, size)
          .setDepth(DEPTH.groundObjects + 1);
      } else {
        const centerX = obstacle.x + obstacle.w / 2;
        const centerY = obstacle.y + obstacle.h / 2;
        const upright = obstacle.h > obstacle.w;
        const long = Math.max(obstacle.w, obstacle.h);
        const short = Math.min(obstacle.w, obstacle.h);
        const frame = this.textures.getFrame(texture);
        // The stone fills its image except for a margin left for its soft edge.
        const scaleX = long / (frame.width - SLAB_MARGIN * 2);
        const scaleY = short / (frame.height - SLAB_MARGIN * 2);
        this.add
          .image(centerX + 10, centerY + 14, shadow)
          .setDisplaySize(obstacle.w * 1.25, obstacle.h * 1.25)
          .setAlpha(0.38)
          .setDepth(DEPTH.groundObjects);
        this.add
          .image(centerX, centerY, texture)
          .setScale(scaleX, scaleY)
          .setRotation(upright ? Math.PI / 2 : 0)
          .setDepth(DEPTH.groundObjects + 1);
      }
    }
  }
}
