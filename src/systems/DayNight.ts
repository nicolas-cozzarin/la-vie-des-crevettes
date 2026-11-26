import Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { seededRandom } from '../core/random';
import type { DayLight } from '../core/world/dayCycle';
import { inRect } from '../core/world/zones';
import type { AreaDef } from '../data/areas/types';
import { DAY } from '../data/tuning';
import type { WaterLight } from './WaterLight';

/** Colours of doc 04: the gold of dusk, the indigo of night. */
const DUSK = 0xf0b27a;
const NIGHT = 0x1b2350;
/** The zone where the plankton is thickest at night (doc 11, zone F). */
const SHALLOWS = 'F';
/** Seconds between two points of a wake. */
const WAKE_EVERY = 0.12;
/** BL a mover must have gone since its last point to leave another. */
const WAKE_MOVE = 0.15;

interface Glow {
  x: number;
  y: number;
  /** BL across, before it lights up. */
  width: number;
  /** 0 to 1: how lit it is now. Falls over `DAY.plankton.lit` seconds. */
  lit: number;
}

interface WakePoint {
  x: number;
  y: number;
  age: number;
}

/**
 * The time of day on screen (doc 14, "From data to picture"): the gold of
 * dusk and the indigo of night laid over everything with a multiply blend,
 * the murk too; the caustics weaker at dusk and gone at night; and the
 * glowing plankton, faint points that light up in the wake of anything that
 * moves (doc 11, `thing.glowingPlankton`).
 */
export class DayNight {
  private readonly dusk: Phaser.GameObjects.Rectangle;
  private readonly night: Phaser.GameObjects.Rectangle;
  /** The points by cell, so only those in view are looked at. */
  private readonly cells = new Map<number, Glow[]>();
  private readonly cellPx: number;
  private readonly columns: number;
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly wake: WakePoint[] = [];
  private readonly last = new Map<string, { x: number; y: number; at: number }>();
  private clock = 0;
  private drawn = 0;
  private litNow = 0;
  private litNearPlayer = false;

  constructor(
    scene: Phaser.Scene,
    area: AreaDef,
    private readonly bl: number,
    private readonly water: WaterLight,
  ) {
    const veil = (color: number) =>
      scene.add
        .rectangle(0, 0, 10, 10, color)
        .setOrigin(0)
        .setBlendMode(Phaser.BlendModes.MULTIPLY)
        .setDepth(DEPTH.mood + 1)
        .setAlpha(0)
        .setVisible(false);
    this.dusk = veil(DUSK);
    this.night = veil(NIGHT);

    // The points are scattered once, the same for every visit.
    const tuning = DAY.plankton;
    const shallows = (area.zones ?? []).find((zone) => zone.id === SHALLOWS)?.zone;
    const random = seededRandom(area.size.w + area.size.h);
    const count = Math.round((area.size.w * area.size.h * tuning.perBl2) / (bl * bl));
    this.cellPx = 4 * bl;
    this.columns = Math.ceil(area.size.w / this.cellPx);
    for (let index = 0; index < count; index++) {
      const x = random() * area.size.w;
      const y = random() * area.size.h;
      const keep = random();
      const width = tuning.width.min + random() * (tuning.width.max - tuning.width.min);
      const thick = shallows !== undefined && inRect(x, y, shallows);
      if (keep > (thick ? 1 : tuning.elsewhere)) continue;
      const glow: Glow = { x, y, width, lit: 0 };
      const cell = this.cellOf(x, y);
      const list = this.cells.get(cell);
      if (list) list.push(glow);
      else this.cells.set(cell, [glow]);
    }
    const texture = ensureTexture(scene, 'fx.glow');
    for (let index = 0; index < tuning.pool; index++) {
      this.pool.push(
        scene.add
          .image(0, 0, texture)
          .setBlendMode(Phaser.BlendModes.SCREEN)
          .setDepth(DEPTH.mood + 2)
          .setVisible(false),
      );
    }
  }

  /**
   * Draws the light of this moment over the view. `movers` are whatever
   * moves now, the player first: each leaves a wake the plankton lights up in.
   */
  update(
    dt: number,
    light: Readonly<DayLight>,
    view: Phaser.Geom.Rectangle,
    movers: readonly { id: string; x: number; y: number }[],
  ): void {
    this.clock += dt;
    const margin = this.bl;
    for (const [veil, strength] of [
      [this.dusk, light.dusk],
      [this.night, light.night],
    ] as const) {
      veil
        .setPosition(view.x - margin, view.y - margin)
        .setSize(view.width + 2 * margin, view.height + 2 * margin)
        .setAlpha(strength)
        .setVisible(strength > 0.005);
    }
    this.water.setDappleLevel(light.caustics);
    this.stepWake(dt, movers);
    this.drawPlankton(dt, light.plankton, view, movers[0]);
  }

  /** What the browser test reads. */
  get snapshot() {
    return {
      dusk: this.dusk.alpha,
      night: this.night.visible ? this.night.alpha : 0,
      plankton: this.drawn,
      lit: this.litNow,
      litNearPlayer: this.litNearPlayer,
    };
  }

  /** The plankton lit up near the player on this frame: the first time is a discovery. */
  get glowingByPlayer(): boolean {
    return this.litNearPlayer;
  }

  destroy(): void {
    this.dusk.destroy();
    this.night.destroy();
    for (const image of this.pool) image.destroy();
    this.pool.length = 0;
  }

  private cellOf(x: number, y: number): number {
    return Math.floor(y / this.cellPx) * this.columns + Math.floor(x / this.cellPx);
  }

  private stepWake(dt: number, movers: readonly { id: string; x: number; y: number }[]): void {
    for (const point of this.wake) point.age += dt;
    while (this.wake.length > 0 && (this.wake[0]?.age ?? 0) > DAY.plankton.lit) this.wake.shift();
    for (const mover of movers) {
      const before = this.last.get(mover.id);
      const moved = before ? Math.hypot(mover.x - before.x, mover.y - before.y) : Infinity;
      if (before && (this.clock - before.at < WAKE_EVERY || moved < WAKE_MOVE * this.bl)) continue;
      // The first sight of a mover only marks where it is; a wake needs it to move.
      if (before) this.wake.push({ x: mover.x, y: mover.y, age: 0 });
      this.last.set(mover.id, { x: mover.x, y: mover.y, at: this.clock });
    }
  }

  private drawPlankton(
    dt: number,
    level: number,
    view: Phaser.Geom.Rectangle,
    player: { x: number; y: number } | undefined,
  ): void {
    const tuning = DAY.plankton;
    const bl = this.bl;
    const reach = tuning.wake * bl;
    let used = 0;
    let lit = 0;
    let nearPlayer = false;
    // Only the points of a wake near the view can light anything in it.
    const wake = this.wake.filter(
      (point) =>
        point.x > view.x - 2 * reach &&
        point.x < view.right + 2 * reach &&
        point.y > view.y - 2 * reach &&
        point.y < view.bottom + 2 * reach,
    );
    if (level > 0.01) {
      const x0 = Math.floor((view.x - bl) / this.cellPx);
      const x1 = Math.floor((view.right + bl) / this.cellPx);
      const y0 = Math.floor((view.y - bl) / this.cellPx);
      const y1 = Math.floor((view.bottom + bl) / this.cellPx);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          if (cx < 0 || cx >= this.columns) continue;
          for (const glow of this.cells.get(cy * this.columns + cx) ?? []) {
            if (used >= this.pool.length) break;
            // Lit by the nearest fresh point of a wake, fading as that point ages.
            let want = 0;
            for (const point of wake) {
              const near = Math.hypot(glow.x - point.x, glow.y - point.y);
              if (near >= reach) continue;
              want = Math.max(want, (1 - near / reach) * (1 - point.age / tuning.lit));
            }
            glow.lit = want > glow.lit ? want : Math.max(0, glow.lit - dt / tuning.lit);
            if (glow.lit > 0.3) {
              lit += 1;
              if (player && Math.hypot(glow.x - player.x, glow.y - player.y) < reach) {
                nearPlayer = true;
              }
            }
            const image = this.pool[used];
            if (!image) break;
            const width = glow.width * bl * (1 + tuning.grow * glow.lit);
            image
              .setPosition(glow.x, glow.y)
              .setDisplaySize(width, width)
              .setAlpha(level * (tuning.alpha + (1 - tuning.alpha) * glow.lit))
              .setVisible(true);
            used += 1;
          }
        }
      }
    }
    for (let index = used; index < this.drawn; index++) this.pool[index]?.setVisible(false);
    this.drawn = used;
    this.litNow = lit;
    this.litNearPlayer = nearPlayer && level > 0.5;
  }
}
