import Phaser from 'phaser';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { t } from '../i18n';

/** Title screen. For now it only shows the name of the game. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.deepTeal);
    document.title = t('title.name');

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 60, t('title.name'), {
        fontFamily: FONTS.title,
        fontSize: '120px',
        color: COLORS.paper,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 70, t('title.tagline'), {
        fontFamily: FONTS.text,
        fontSize: '40px',
        color: COLORS.paleGreen,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, GAME_HEIGHT - 80, t('title.status'), {
        fontFamily: FONTS.text,
        fontSize: '28px',
        color: COLORS.paleGreen,
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
  }
}
