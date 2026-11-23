import Phaser from 'phaser';
import { COLORS, FONTS, GAME_WIDTH, TINTS } from '../config';
import { CREDITS_SHOWN } from '../data/credits';
import { SOURCES } from '../data/journal';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

const PANEL = { x: 360, y: 34, w: 1200, h: 1012 };
const LIST_X = 460;
const LINE_GAP = 40;

/**
 * About, from the title (doc 07, "About page"): a personal project, the
 * sources of the carnet, and the credits. It names no organisation (D5).
 * The line on counting visits comes with the counter.
 */
export class AboutScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('About');
  }

  create(): void {
    this.leaving = false;
    this.cameras.main.setBackgroundColor(COLORS.deepTeal);
    const centerX = GAME_WIDTH / 2;
    const panel = this.add.graphics();
    panel.fillStyle(TINTS.paper, 0.98);
    panel.fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28);

    this.add
      .text(centerX, 110, t('about.title'), textStyle(60, COLORS.ink, FONTS.title))
      .setOrigin(0.5);
    this.add
      .text(centerX, 205, t('about.personal'), textStyle(32, COLORS.ink, FONTS.title))
      .setOrigin(0.5);

    let y = 300;
    const heading = (key: string) => {
      this.add.text(LIST_X, y, t(key), textStyle(26, COLORS.inkSoft)).setOrigin(0, 0.5);
      y += 52;
    };
    const line = (text: string) => {
      this.add
        .text(LIST_X, y, text, { ...textStyle(24, COLORS.ink), wordWrap: { width: PANEL.w - 200 } })
        .setOrigin(0, 0.5);
      y += LINE_GAP;
    };

    // Only the sources that were read: a card is shown only once its sources are (doc 07).
    heading('about.sources');
    for (const [key, standing] of Object.entries(SOURCES)) {
      if (standing === 'read') line(t(`source.${key}`));
    }

    if (CREDITS_SHOWN.length > 0) {
      y += 24;
      heading('about.credits');
      for (const credit of CREDITS_SHOWN) {
        line(`${credit.title}, ${credit.author}. ${credit.licence}`);
      }
    }

    const back = new Button(this, centerX, 980, 240, 50, t('controls.back'), {
      onPress: () => this.back(),
    });
    back.setLook('selected');
    onMenuKey(this, (key) => {
      if (key === 'back' || key === 'accept') this.back();
    });
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Title');
  }
}
