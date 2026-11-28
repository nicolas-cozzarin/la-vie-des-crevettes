import type Phaser from 'phaser';
import type { Mood } from '../core/feelings/mood';
import { approach } from '../core/movement/angles';
import { MOOD, MOOD_SCREEN, SENSE } from '../data/tuning';
import type { HudScene } from '../scenes/HudScene';

/** What the presenter needs to know on each frame. */
export interface MoodView {
  mood: Mood;
  /** Seconds of wariness left. */
  waryLeft: number;
  /** Where the shrimp is, and what it is curious about, if anything. */
  x: number;
  y: number;
  target: { x: number; y: number } | null;
  /** Sense is in use: the view dims slightly. */
  sensing: boolean;
}

export interface MoodPresenterOptions {
  hud: () => HudScene | null;
  reducedMotion: () => boolean;
  nameFeelings: () => boolean;
  /** The mood's name in the player's language. */
  word: (mood: Mood) => string;
  /** Share of colour the place's water takes away, under the mood's own (`LightDef.drain`). */
  drain?: number;
}

/** Everything the screen does for a mood, as numbers that ease. */
interface Screen {
  /** Share of colour taken away. */
  grey: number;
  warm: number;
  cool: number;
  /** Zoom added, as a share. */
  zoom: number;
  /** Fear's dark edges, 0 to 1. */
  dark: number;
  /** Share of the usual edges taken away. */
  lighter: number;
  leanX: number;
  leanY: number;
  /** Share of light taken away while sensing. */
  dim: number;
}

const QUIET: Screen = {
  grey: 0,
  warm: 0,
  cool: 0,
  zoom: 0,
  dark: 0,
  lighter: 0,
  leanX: 0,
  leanY: 0,
  dim: 0,
};
const KEYS = Object.keys(QUIET) as (keyof Screen)[];
/** Below this, a value counts as gone and the colour filter is switched off. */
const NOTHING = 0.002;

/** Luminance weights, for taking colour away without changing brightness. */
const LUMA = [0.2126, 0.7152, 0.0722] as const;

function channels(color: number): [number, number, number] {
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
}

/**
 * Shows the player's mood on the screen: the edges, the colour and the view,
 * as doc 10's table "Screen" says. Every change eases over at least half a
 * second, and nothing flashes. The colour is a filter on the play camera, so
 * the HUD above it is never tinted.
 */
export class MoodPresenter {
  private readonly grade: Phaser.Filters.ColorMatrix;
  private readonly now: Screen = { ...QUIET };
  private waryFrom = 0;
  private lastWary = 0;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    private readonly options: MoodPresenterOptions,
  ) {
    this.grade = camera.filters.internal.addColorMatrix();
    this.grade.active = false;
  }

  /** The view's zoom, as a factor of the usual one. */
  get zoom(): number {
    return 1 + this.now.zoom;
  }

  /** How far the view leans toward what the shrimp is curious about, in design pixels. */
  get lean(): { x: number; y: number } {
    return { x: this.now.leanX, y: this.now.leanY };
  }

  update(dt: number, view: MoodView): void {
    const want = this.wanted(view);
    const ease = approach(dt, MOOD.screen);
    for (const key of KEYS) this.now[key] += (want[key] - this.now[key]) * ease;
    this.applyColour();
    this.options.hud()?.setEdges(this.now.dark, this.now.lighter);
  }

  /** Called when the mood changes. With "Name feelings on screen", its name shows. */
  moodChanged(mood: Mood): void {
    if (!this.options.nameFeelings()) return;
    this.options.hud()?.showWord(this.options.word(mood), MOOD_SCREEN.nameSeconds);
  }

  private wanted(view: MoodView): Screen {
    const s = MOOD_SCREEN;
    const want = { ...QUIET };

    // Wariness fades the afraid edges from a third to nothing over its time.
    if (view.waryLeft > this.lastWary + 1e-3) this.waryFrom = view.waryLeft;
    this.lastWary = view.waryLeft;
    const wary = this.waryFrom > 0 ? Math.min(1, view.waryLeft / this.waryFrom) : 0;

    switch (view.mood) {
      case 'hungry':
        want.grey = s.desaturate.hungry;
        break;
      case 'content':
        want.warm = s.warm.amount;
        want.lighter = s.contentLighter;
        break;
      case 'curious':
        if (view.target) {
          want.leanX = (view.target.x - view.x) * s.curiousLean;
          want.leanY = (view.target.y - view.y) * s.curiousLean;
        }
        break;
      case 'afraid':
        want.grey = s.desaturate.afraid;
        want.cool = s.cool.amount;
        want.dark = s.afraidEdges;
        want.zoom = this.options.reducedMotion() ? 0 : s.afraidZoom;
        break;
      default:
        break;
    }
    if (view.mood !== 'afraid') want.dark = Math.max(want.dark, s.waryEdges * wary);
    if (view.sensing) want.dim = SENSE.dim;
    return want;
  }

  /**
   * One colour matrix: take some colour away (the place's and the mood's), wash toward the warm colour,
   * then multiply by the cool one, and by the dimming of Sense. A wash lifts the picture a little, which
   * suits content. A multiply darkens it a little, which suits fear.
   */
  private applyColour(): void {
    const { warm, cool, dim } = this.now;
    const grey = 1 - (1 - this.now.grey) * (1 - (this.options.drain ?? 0));
    if (grey < NOTHING && warm < NOTHING && cool < NOTHING && dim < NOTHING) {
      this.grade.active = false;
      return;
    }
    this.grade.active = true;

    const keep = 1 - grey;
    const washColour = channels(MOOD_SCREEN.warm.color);
    const coolColour = channels(MOOD_SCREEN.cool.color);
    const coolTop = Math.max(...coolColour);
    const matrix: number[] = [];
    for (let row = 0; row < 3; row++) {
      const multiply = (1 - cool + (cool * (coolColour[row] ?? 1)) / coolTop) * (1 - dim);
      for (let column = 0; column < 3; column++) {
        const own = row === column ? keep : 0;
        matrix.push(multiply * (1 - warm) * (own + grey * (LUMA[column] ?? 0)));
      }
      matrix.push(0, multiply * warm * (washColour[row] ?? 0) * 255);
    }
    matrix.push(0, 0, 0, 1, 0);
    this.grade.colorMatrix.set(matrix);
  }
}
