import Phaser from 'phaser';
import { app } from '../app';
import { ensureTexture } from '../art/TextureFactory';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { t } from '../i18n';
import { textStyle } from '../ui/text';

type Hint = 'move' | 'dart' | 'pause' | 'done';

const HINT_Y = GAME_HEIGHT - 90;
const WORD_Y = 96;
/** An activity's prompt sits above the line of hints. */
const PROMPT_Y = HINT_Y - 72;
/** The narration sits above the prompt (T82). */
const NARRATION_Y = PROMPT_Y - 100;
/** A place's name, alone, high in the view. */
const PLACE_Y = 300;
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
  private promptText!: Phaser.GameObjects.Text;
  private promptPlate!: Phaser.GameObjects.Graphics;
  private narration!: Phaser.GameObjects.Text;
  private place!: Phaser.GameObjects.Text;
  /** The hints and the prompt, together, so the dark of being cornered can take them away. */
  private lines!: Phaser.GameObjects.Container;
  /** The prompt's alpha, eased toward 1 while one is asked for. */
  private promptShown = 0;
  private promptWanted = false;
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

    this.promptPlate = this.add.graphics().setAlpha(0);
    this.promptText = this.add
      .text(centerX, PROMPT_Y, '', textStyle(30, COLORS.deepTeal))
      .setOrigin(0.5)
      .setAlpha(0);
    this.promptShown = 0;
    this.promptWanted = false;
    this.narration = this.add
      .text(centerX, NARRATION_Y, '', {
        ...textStyle(36, COLORS.paper, FONTS.title),
        align: 'center',
        wordWrap: { width: 1400 },
      })
      .setOrigin(0.5)
      .setShadow(0, 2, '#000000', 10, false, true)
      .setAlpha(0);
    this.place = this.add
      .text(centerX, PLACE_Y, '', textStyle(56, COLORS.paper, FONTS.title))
      .setOrigin(0.5)
      .setShadow(0, 2, '#000000', 12, false, true)
      .setAlpha(0);

    this.lines = this.add.container(0, 0, [
      this.hintPlate,
      this.hintText,
      this.promptPlate,
      this.promptText,
    ]);

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

  /** The line of narration, or null, and how visible it is. The narrator decides when. */
  narrate(text: string | null, alpha: number): void {
    if (!this.ready) return;
    if (text !== null && text !== this.narration.text) this.narration.setText(text);
    this.narration.setAlpha(text === null ? 0 : alpha);
  }

  /** A place's name, or null, and how visible it is. */
  placeName(text: string | null, alpha: number): void {
    if (!this.ready) return;
    if (text !== null && text !== this.place.text) this.place.setText(text);
    this.place.setAlpha(text === null ? 0 : alpha);
  }

  /** How dark the picture is, from 0 to 1: the hints and the prompt go with it. */
  hush(dark: number): void {
    if (!this.ready) return;
    this.lines.setAlpha(1 - dark);
  }

  /**
   * An activity's prompt, such as "Hold E to graze", or null to let it go.
   * The play scene decides when, and counts the first three times (doc 03).
   */
  prompt(text: string | null): void {
    if (!this.ready) return;
    this.promptWanted = text !== null;
    if (text === null || text === this.promptText.text) return;
    this.promptText.setText(text);
    const width = this.promptText.width + 56;
    this.promptPlate.clear();
    this.promptPlate.fillStyle(TINTS.paper, 0.72);
    this.promptPlate.fillRoundedRect(GAME_WIDTH / 2 - width / 2, PROMPT_Y - 28, width, 56, 28);
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.ready) return;
    const dt = deltaMs / 1000;
    const prompt = this.promptWanted ? 1 : 0;
    if (this.promptShown !== prompt) {
      const step = dt / 0.3;
      this.promptShown =
        prompt > this.promptShown
          ? Math.min(1, this.promptShown + step)
          : Math.max(0, this.promptShown - step);
      this.promptText.setAlpha(this.promptShown);
      this.promptPlate.setAlpha(this.promptShown);
    }
    if (this.wordAge < 0) return;
    // The word comes in over half a second, stays, and goes in half a second.
    this.wordAge += dt;
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
