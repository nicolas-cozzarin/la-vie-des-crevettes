import Phaser from 'phaser';
import { app } from '../app';
import { ensureTexture } from '../art/TextureFactory';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { t } from '../i18n';
import { textStyle } from '../ui/text';

type Hint = 'move' | 'dart' | 'pause' | 'done';

const HINT_Y = GAME_HEIGHT - 90;

/**
 * What lies over the play scene and stays with the screen: the colour of the
 * water, darker edges, paper grain, and one line of prompt at the bottom.
 */
export class HudScene extends Phaser.Scene {
  private ready = false;
  private hint: Hint = 'move';
  private hintText!: Phaser.GameObjects.Text;
  private hintPlate!: Phaser.GameObjects.Graphics;
  private movedFor = 0;
  private hintClock = 0;

  constructor() {
    super('Hud');
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, TINTS.water, 0.14);
    this.add
      .image(centerX, centerY, ensureTexture(this, 'fx.vignette'))
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
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
