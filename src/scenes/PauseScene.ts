import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { t } from '../i18n';
import { MenuList } from '../ui/MenuList';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

/** The scenes the pause menu can be laid over. */
const GAMES = ['Drift', 'Play'] as const;

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
      centerY - 75,
      [
        { label: t('pause.resume'), run: () => this.resume() },
        { label: t('pause.journal'), run: () => this.leave('Journal') },
        { label: t('pause.settings'), run: () => this.leave('Settings') },
        { label: t('pause.quit'), run: () => this.leave('Title') },
      ],
      { size: 40, gap: 80, color: COLORS.ink, marker: TINTS.deepTeal },
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
    this.scene.resume(this.paused());
    this.scene.stop();
  }

  private leave(to: 'Journal' | 'Settings' | 'Title'): void {
    if (this.leaving) return;
    this.leaving = true;
    if (to === 'Journal') {
      this.scene.start('Journal', { game: this.paused(), from: 'pause' });
    } else if (to === 'Settings') {
      this.scene.start('Settings', { from: 'Pause' });
    } else {
      this.scene.stop(this.paused());
      this.scene.start('Title');
    }
  }

  /** The game under the menu: the Drift or Play. */
  private paused(): (typeof GAMES)[number] {
    return GAMES.find((key) => this.scene.isPaused(key)) ?? 'Play';
  }
}
