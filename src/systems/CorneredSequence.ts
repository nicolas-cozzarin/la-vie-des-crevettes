import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { CorneredTuning } from '../core/threat/cornered';

/** The blur at its strongest. */
const BLUR = 3;
/** How dark the picture is once the blur has come, before it goes fully dark. */
const DIM = 0.55;
/** The flip the shrimp makes by itself, in seconds from `flips`. The tail flip's cool-down leaves room for one before the dark. */
const FLIPS = [0];

/** What the play scene must do on this frame of the sequence. */
export interface CorneredStep {
  /** Flip the tail, away from the strike. */
  flip: boolean;
  /** The picture is dark: put the shrimp in its shelter now. */
  place: boolean;
  /** The sequence is over: control returns, with fear at 0.9. */
  done: boolean;
}

/**
 * Being cornered, the same for every threat (doc 10, "Cornered"). No contact
 * is ever drawn. The picture blurs and darkens, the shrimp darts by itself,
 * all goes dark, and the picture comes back with the shrimp tucked in a
 * shelter. With reduced motion, a plain fade and no blur.
 */
export class CorneredSequence {
  private time = -1;
  private flipsDone = 0;
  private placed = false;
  private blur: Phaser.Filters.Blur | null = null;
  private readonly dark: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly tuning: CorneredTuning,
    private readonly reducedMotion: () => boolean,
  ) {
    // Larger than the view at any zoom, fixed to the camera.
    const { width, height } = scene.scale;
    this.dark = scene.add
      .rectangle(width / 2, height / 2, width * 4, height * 4, 0x000000)
      .setScrollFactor(0)
      .setDepth(DEPTH.mood + 1)
      .setAlpha(0)
      .setVisible(false);
  }

  get running(): boolean {
    return this.time >= 0;
  }

  /** How dark the picture is now, from 0 to 1. */
  get darkness(): number {
    return this.dark.visible ? this.dark.alpha : 0;
  }

  /** The instant before contact. */
  start(): void {
    this.time = 0;
    this.flipsDone = 0;
    this.placed = false;
    this.dark.setVisible(true).setAlpha(0);
    if (!this.reducedMotion() && !this.blur) {
      this.blur = this.camera.filters.internal.addBlur(1, 1, 1, 0);
    }
  }

  update(dt: number): CorneredStep {
    const step: CorneredStep = { flip: false, place: false, done: false };
    if (this.time < 0) return step;
    this.time += dt;
    const t = this.time;
    const c = this.tuning;

    // Darkness: dim with the blur, fully dark, then the picture comes back.
    let dark: number;
    if (t < c.blurred) dark = DIM * (t / c.blurred);
    else if (t < c.dark) dark = DIM + (1 - DIM) * ((t - c.blurred) / (c.dark - c.blurred));
    else if (t < c.back) dark = 1;
    else dark = Math.max(0, 1 - (t - c.back) / (c.control - c.back));
    this.dark.setAlpha(dark);
    if (this.blur) {
      const up = Math.min(1, t / c.blurred);
      const down = t < c.back ? 1 : Math.max(0, 1 - (t - c.back) / (c.control - c.back));
      this.blur.strength = BLUR * Math.min(up, down);
    }

    const next = FLIPS[this.flipsDone];
    if (next !== undefined && t >= c.flips + next) {
      this.flipsDone += 1;
      step.flip = true;
    }
    if (!this.placed && t >= c.back) {
      this.placed = true;
      step.place = true;
    }
    if (t >= c.control) {
      step.done = true;
      this.stop();
    }
    return step;
  }

  destroy(): void {
    this.stop();
    this.dark.destroy();
  }

  private stop(): void {
    this.time = -1;
    this.dark.setVisible(false).setAlpha(0);
    if (this.blur) {
      this.camera.filters.internal.remove(this.blur);
      this.blur = null;
    }
  }
}
