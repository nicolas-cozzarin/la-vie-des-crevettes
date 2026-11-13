import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { t } from '../i18n';
import { MenuList } from '../ui/MenuList';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

/** The pause menu, laid over the paused game. Escape always brings it up. */
export class PauseScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Pause');
  }

  create(): void {
    this.leaving = false;
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const veil = this.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, TINTS.deepTeal, 0.5)
      .setAlpha(0);
    // Nothing changes brightness faster than half a second.
    this.tweens.add({ targets: veil, alpha: 1, duration: 500 });

    const panel = this.add.graphics();
    panel.fillStyle(TINTS.paper, 0.97);
    panel.fillRoundedRect(centerX - 330, centerY - 290, 660, 580, 28);

    this.add
      .text(centerX, centerY - 200, t('pause.title'), textStyle(72, COLORS.ink, FONTS.title))
      .setOrigin(0.5);

    const menu = new MenuList(
      this,
      centerX,
      centerY - 50,
      [
        { label: t('pause.resume'), run: () => this.resume() },
        { label: t('pause.controls'), run: () => this.leave('Controls') },
        { label: t('pause.quit'), run: () => this.leave('Title') },
      ],
      { size: 40, gap: 84, color: COLORS.ink, marker: TINTS.deepTeal },
    );
    onMenuKey(this, (key) => {
      if (key === 'back') this.resume();
      else menu.handle(key);
    });
  }

  override update(): void {
    // The player's own pause key closes the menu too.
    if (app.actions.justPressed('pause')) this.resume();
  }

  private resume(): void {
    if (this.leaving) return;
    this.leaving = true;
    // Keys pressed in the menu must not act inside the game.
    app.actions.clearQueued();
    this.scene.resume('Play');
    this.scene.stop();
  }

  private leave(to: 'Controls' | 'Title'): void {
    if (this.leaving) return;
    this.leaving = true;
    if (to === 'Controls') {
      this.scene.start('Controls', { returnTo: 'Pause' });
    } else {
      this.scene.stop('Play');
      this.scene.start('Title');
    }
  }
}
