import Phaser from 'phaser';
import { app } from '../app';
import { ensureTexture } from '../art/TextureFactory';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { t } from '../i18n';
import { textStyle } from '../ui/text';

type Hint = 'move' | 'dart' | 'pause' | 'done';

const HINT_Y = GAME_HEIGHT - 90;
const WORD_Y = 96;
/** Seconds the mood's name takes to come and to go. */
const WORD_FADE = 0.5;
/** The colour fear's edges are drawn in: the deep water, almost black. */
const FEAR_EDGE = 0x0a1418;

/**
 * What lies over the play scene and stays with the screen: the colour of the
 * water, darker edges, paper grain, one line of prompt at the bottom, and,
 * with "Name feelings on screen", the mood's name at the top. The mood sets
 * how dark the edges are (`MoodPresenter`).
 */
export class HudScene extends Phaser.Scene {
  private ready = false;
  private hint: Hint = 'move';
  private hintText!: Phaser.GameObjects.Text;
  private hintPlate!: Phaser.GameObjects.Graphics;
  private movedFor = 0;
  private hintClock = 0;
  private edges!: Phaser.GameObjects.Image;
  private fearEdges: Phaser.GameObjects.Image[] = [];
  private word!: Phaser.GameObjects.Text;
  private wordPlate!: Phaser.GameObjects.Graphics;
  /** Seconds since the word came, or -1 when none shows. */
  private wordAge = -1;
  private wordHold = 0;

  constructor() {
    super('Hud');
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, TINTS.water, 0.14);
    this.edges = this.add
      .image(centerX, centerY, ensureTexture(this, 'fx.vignette'))
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    // Fear darkens the edges: the same picture twice more, in near black.
    // Both cover the whole screen, since a smaller one would show its border.
    this.fearEdges = [0, 1].map(() =>
      this.add
        .image(centerX, centerY, ensureTexture(this, 'fx.vignette'))
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setTint(FEAR_EDGE)
        .setAlpha(0),
    );
    this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, ensureTexture(this, 'fx.grain'))
      .setOrigin(0)
      .setTileScale(2)
      .setAlpha(0.07);

    this.hint = 'move';
    this.movedFor = 0;
    this.hintClock = 0;
    this.hintPlate = this.add.graphics();
    this.hintText = this.add
      .text(centerX, HINT_Y, '', textStyle(30, COLORS.deepTeal))
      .setOrigin(0.5);
    this.showHint();

    this.wordPlate = this.add.graphics().setAlpha(0);
    this.word = this.add.text(centerX, WORD_Y, '', textStyle(30, COLORS.deepTeal)).setOrigin(0.5);
    this.word.setAlpha(0);
    this.wordAge = -1;

    this.ready = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.ready = false;
    });
  }

  /** Told by the play scene what the player did on this frame. */
  track(dt: number, moving: boolean, darted: boolean): void {
    if (!this.ready) return;
    this.hintClock += dt;
    if (this.hint === 'move') {
      if (moving) this.movedFor += dt;
      if (this.movedFor > 2.5) this.nextHint('dart');
    } else if (this.hint === 'dart') {
      if (darted && this.hintClock > 1) this.nextHint('pause');
    } else if (this.hint === 'pause') {
      if (this.hintClock > 6) this.nextHint('done');
    }
  }

  /**
   * How dark the edges are. `dark` 0 is the area's own edges and 1 is fear's,
   * reaching about a third into the picture. `lighter` takes some of the
   * usual edges away.
   */
  setEdges(dark: number, lighter: number): void {
    if (!this.ready) return;
    this.edges.setAlpha(1 - lighter);
    for (const image of this.fearEdges) image.setAlpha(dark);
  }

  /** The mood's name, for a while, with "Name feelings on screen". */
  showWord(text: string, seconds: number): void {
    if (!this.ready) return;
    this.word.setText(text);
    const width = this.word.width + 56;
    this.wordPlate.clear();
    this.wordPlate.fillStyle(TINTS.paper, 0.72);
    this.wordPlate.fillRoundedRect(GAME_WIDTH / 2 - width / 2, WORD_Y - 28, width, 56, 28);
    // A word already showing is replaced where it stands, without going dark first.
    this.wordAge = this.wordAge >= 0 ? this.word.alpha * WORD_FADE : 0;
    this.wordHold = seconds;
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.ready || this.wordAge < 0) return;
    // The word comes in over half a second, stays, and goes in half a second.
    this.wordAge += deltaMs / 1000;
    const out = this.wordAge - WORD_FADE - this.wordHold;
    const alpha = Math.max(0, Math.min(1, this.wordAge / WORD_FADE, 1 - out / WORD_FADE));
    this.word.setAlpha(alpha);
    this.wordPlate.setAlpha(alpha);
    if (out >= WORD_FADE) this.wordAge = -1;
  }

  /** Prompts always name the player's own keys. */
  private hintLine(): string {
    if (this.hint === 'move') {
      return t('play.hint.move', {
        up: app.actionKey('moveUp'),
        left: app.actionKey('moveLeft'),
        down: app.actionKey('moveDown'),
        right: app.actionKey('moveRight'),
      });
    }
    if (this.hint === 'dart') return t('play.hint.dart', { key: app.actionKey('tailFlip') });
    if (this.hint === 'pause') return t('play.hint.pause', { key: app.actionKey('pause') });
    return '';
  }

  private showHint(): void {
    const line = this.hintLine();
    this.hintText.setText(line);
    this.hintPlate.clear();
    if (line !== '') {
      const width = this.hintText.width + 56;
      this.hintPlate.fillStyle(TINTS.paper, 0.72);
      this.hintPlate.fillRoundedRect(GAME_WIDTH / 2 - width / 2, HINT_Y - 28, width, 56, 28);
    }
    this.hintText.setAlpha(0);
    this.hintPlate.setAlpha(0);
    this.tweens.add({ targets: [this.hintText, this.hintPlate], alpha: 1, duration: 600 });
  }

  private nextHint(next: Hint): void {
    this.hint = next;
    this.hintClock = 0;
    this.tweens.add({
      targets: [this.hintText, this.hintPlate],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        if (next !== 'done') this.showHint();
      },
    });
  }
}
