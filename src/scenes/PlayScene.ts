import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Activity } from '../core/activity/Activity';
import { approach } from '../core/movement/angles';
import { moveCircle, type Bounds } from '../core/movement/collision';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import { ZoneTracker } from '../core/world/zones';
import { areaFor, FIRST_AREA, isPlayableArea, pointFor, type PlayableArea } from '../data/areas';
import type { AreaDef } from '../data/areas/types';
import { CAMERA, FRAME, HIDE, MOTION } from '../data/tuning';
import { debugState } from '../debug';
import { ShrimpRig } from '../entities/ShrimpRig';
import { loadArea, type CoverHandle, type LoadedArea } from '../systems/AreaLoader';
import { WaterLight } from '../systems/WaterLight';
import type { HudScene } from './HudScene';

export interface PlayData {
  area?: string;
  /** Opened by `?explore=`: one place, no story. */
  explore?: boolean;
  /** Explore mode only: where to start instead of the area's spawn. */
  at?: { x: number; y: number };
}

/**
 * Play. Loads one area and lets the shrimp live in it. The story, which
 * chooses the area, comes in step 8. Until then Play opens the mangrove, and
 * `?explore=<area>` opens any area that has data.
 */
export class PlayScene extends Phaser.Scene {
  private areaId: PlayableArea = FIRST_AREA;
  private explore = false;
  private start: { x: number; y: number } | null = null;
  private area!: AreaDef;
  private loaded!: LoadedArea;
  private light!: WaterLight;
  private activity!: Activity<CoverHandle>;
  private zones!: ZoneTracker;
  private bodyLengthPx = 110;
  private motion!: ShrimpMotion;
  private rig!: ShrimpRig;
  private mover!: Mover;
  private view = { x: 0, y: 0 };
  private lead = { x: 0, y: 0 };

  private hud: HudScene | null = null;

  constructor() {
    super('Play');
  }

  init(data: PlayData): void {
    this.areaId = data.area !== undefined && isPlayableArea(data.area) ? data.area : FIRST_AREA;
    this.explore = data.explore === true;
    this.start = this.explore && data.at ? pointFor(this.areaId, data.at.x, data.at.y) : null;
  }

  create(): void {
    const area = areaFor(this.areaId);
    this.area = area;
    const bounds: Bounds = { x: 0, y: 0, w: area.size.w, h: area.size.h };

    this.loaded = loadArea(this, area);
    this.bodyLengthPx = this.loaded.bodyLengthPx;
    const obstacles = this.loaded.obstacles;

    const spawn = this.start ? { ...area.spawn, ...this.start } : area.spawn;
    this.motion = new ShrimpMotion({ ...MOTION, bodyLengthPx: this.bodyLengthPx }, spawn);
    this.mover = (x, y, dx, dy) =>
      moveCircle(x, y, dx, dy, this.motion.radiusPx, obstacles, bounds);
    this.rig = new ShrimpRig(this, this.bodyLengthPx, DEPTH.bedAnimals);
    this.rig.update(0, this.motion);
    this.activity = new Activity<CoverHandle>(HIDE, this.bodyLengthPx);
    this.zones = new ZoneTracker(this.loaded.zones);
    this.zones.update(this.motion.x, this.motion.y);
    this.light = new WaterLight(this, area.light);

    const camera = this.cameras.main;
    camera.setBackgroundColor(COLORS.deepTeal);
    camera.setZoom(CAMERA.zoom);
    this.view = { x: spawn.x, y: spawn.y };
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
      area: this.area.id,
      explore: this.explore,
      activity: this.activity.name,
      tucked: this.activity.tucked,
      zones: [...this.zones.current],
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
    const own = actions.axis();
    const tailFlip = actions.justPressed('tailFlip');
    let dart = tailFlip;
    let darted = false;
    let remaining = frame;
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, FRAME.step);
      // Hiding walks the body in by itself; otherwise the player's own direction.
      const { axis } = this.activity.update(
        {
          dt,
          x: this.motion.x,
          y: this.motion.y,
          hide: actions.isDown('hide'),
          tailFlip: dart,
          axis: own,
        },
        this.loaded.covers,
      );
      const result = this.motion.step(dt, { x: axis.x, y: axis.y, dart }, this.mover);
      darted = darted || result.darted;
      dart = false;
      remaining -= dt;
    }

    this.zones.update(this.motion.x, this.motion.y);
    this.loaded.update(frame, this.motion.x, this.motion.y);
    this.rig.update(frame, this.motion);
    this.follow(frame);
    this.hud?.track(frame, own.x !== 0 || own.y !== 0, darted);
  }

  private openPause(): void {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause');
  }

  /** The view trails the shrimp a little and looks slightly ahead of it. */
  private follow(dt: number): void {
    const motion = this.motion;
    const max = CAMERA.lookAheadMax * this.bodyLengthPx;
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
    this.loaded.placeGround(left, top);
    this.light.update(this.game.loop.delta / 1000, left, top, this.motion.x, this.motion.y);
  }
}
