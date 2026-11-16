import Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { approach } from '../core/movement/angles';
import type { Ribbon, RibbonKind } from '../core/scent/ribbons';
import { SENSE } from '../data/tuning';

/** Points along each ribbon. */
const POINTS = 24;
/** Height of the stroke pictures, in pixels. */
const STROKE_PX = 64;

/** The picture each kind is drawn with, and how its sway moves (doc 11, "Scent ribbons"). */
const LOOK: Record<RibbonKind, { image: string; flow: number }> = {
  /** Flows slowly toward the source. */
  food: { image: 'scent.food', flow: 1.1 },
  /** Dots that pulse in turn. */
  shrimp: { image: 'scent.dot', flow: 0.8 },
  /** Still: it marks a place, not a direction. */
  danger: { image: 'scent.danger', flow: 0 },
  /** The coils turn slowly. */
  unknown: { image: 'scent.unknown', flow: 0.4 },
};

/** One ribbon on screen. */
interface Drawn {
  kind: RibbonKind;
  rope: Phaser.GameObjects.Rope | null;
  dots: Phaser.GameObjects.Image[];
  alpha: number;
  phase: number;
  /** Where it last pointed, kept while it fades out. */
  ribbon: Ribbon;
}

export interface ScentSnapshot {
  kind: RibbonKind;
  id: string;
  alpha: number;
}

/**
 * Draws the scent ribbons: a painted stroke bent along a curve from the
 * shrimp to what it smells, swaying with the water and fading at both ends.
 * Each ribbon fades in and out over `SENSE.fadeTime`.
 */
export class ScentField {
  private readonly drawn = new Map<string, Drawn>();
  private readonly scale: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bodyLengthPx: number,
    private readonly depth: number,
  ) {
    this.scale = (SENSE.width * bodyLengthPx) / STROKE_PX;
  }

  /**
   * `shown` are the ribbons wanted now, each with the alpha it should reach.
   * Ribbons no longer wanted fade out where they were.
   */
  update(dt: number, x: number, y: number, shown: readonly { ribbon: Ribbon; alpha: number }[]) {
    const wanted = new Map(shown.map((entry) => [key(entry.ribbon), entry]));
    for (const entry of shown) {
      const id = key(entry.ribbon);
      if (!this.drawn.has(id)) this.drawn.set(id, this.make(entry.ribbon));
    }
    const ease = approach(dt, SENSE.fadeTime / 3);
    for (const [id, drawn] of this.drawn) {
      const entry = wanted.get(id);
      if (entry) drawn.ribbon = entry.ribbon;
      drawn.alpha += ((entry?.alpha ?? 0) - drawn.alpha) * ease;
      if (!entry && drawn.alpha < 0.01) {
        drawn.rope?.destroy();
        for (const dot of drawn.dots) dot.destroy();
        this.drawn.delete(id);
        continue;
      }
      drawn.phase += LOOK[drawn.kind].flow * dt;
      this.place(drawn, x, y);
    }
  }

  /** What is drawn now, for the browser test. */
  get snapshot(): ScentSnapshot[] {
    return [...this.drawn.values()].map((drawn) => ({
      kind: drawn.kind,
      id: drawn.ribbon.id,
      alpha: drawn.alpha,
    }));
  }

  destroy(): void {
    for (const drawn of this.drawn.values()) {
      drawn.rope?.destroy();
      for (const dot of drawn.dots) dot.destroy();
    }
    this.drawn.clear();
  }

  private make(ribbon: Ribbon): Drawn {
    const texture = ensureTexture(this.scene, LOOK[ribbon.kind].image);
    if (ribbon.kind === 'shrimp') {
      const dots = Array.from({ length: 9 }, () =>
        this.scene.add.image(0, 0, texture).setDepth(this.depth).setAlpha(0),
      );
      return { kind: ribbon.kind, rope: null, dots, alpha: 0, phase: 0, ribbon };
    }
    const points = Array.from({ length: POINTS }, (_, index) => ({ x: index, y: 0 }));
    const rope = this.scene.add
      .rope(0, 0, texture, undefined, points, true)
      .setDepth(this.depth)
      .setScale(this.scale);
    return { kind: ribbon.kind, rope, dots: [], alpha: 0, phase: 0, ribbon };
  }

  /** The curve from the shrimp to the source, swaying sideways, thin at both ends. */
  private place(drawn: Drawn, x: number, y: number): void {
    const { ribbon } = drawn;
    const bl = this.bodyLengthPx;
    const dx = ribbon.x - x;
    const dy = ribbon.y - y;
    const length = Math.max(1, Math.hypot(dx, dy));
    // Start a little ahead of the shrimp, where its antennae are.
    const startShare = Math.min(0.45, (0.5 * bl) / length);
    const nx = -dy / length;
    const ny = dx / length;
    const sway = SENSE.sway * bl;
    // A source right by the shrimp needs no ribbon: it fades as it gets short.
    const shortFade = Math.min(1, Math.max(0, (length - 0.8 * bl) / (0.8 * bl)));
    const alpha = drawn.alpha * shortFade;

    const point = (t: number): { x: number; y: number; fade: number } => {
      const along = startShare + (1 - startShare) * t;
      const side = sway * Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * 1.2 * t - drawn.phase);
      return {
        x: x + dx * along + nx * side,
        y: y + dy * along + ny * side,
        fade: Math.pow(Math.sin(Math.PI * t), 0.7),
      };
    };

    if (drawn.rope) {
      const s = this.scale;
      const points: { x: number; y: number }[] = [];
      const alphas: number[] = [];
      for (let index = 0; index < POINTS; index++) {
        const p = point(index / (POINTS - 1));
        points.push({ x: p.x / s, y: p.y / s });
        alphas.push(alpha * p.fade);
      }
      drawn.rope.setPoints(points, undefined, alphas);
      return;
    }

    // Shrimp: round dots evenly spaced, pulsing in turn.
    const count = drawn.dots.length;
    drawn.dots.forEach((dot, index) => {
      const t = (index + 1) / (count + 1);
      const p = point(t);
      const pulse = 0.75 + 0.25 * Math.sin(drawn.phase * 6 - index * 0.9);
      const size = (ribbon.companion ? 0.24 : 0.18) * bl * pulse;
      dot
        .setPosition(p.x, p.y)
        .setDisplaySize(size, size)
        .setAlpha(alpha * p.fade * (ribbon.companion ? 1 : 0.8));
    });
  }
}

function key(ribbon: Ribbon): string {
  return `${ribbon.kind}:${ribbon.id}`;
}
