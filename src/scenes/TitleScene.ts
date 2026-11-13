import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { LANGS } from '../core/i18n';
import { t } from '../i18n';
import { MenuList } from '../ui/MenuList';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

/** Title screen: the name of the game and a short menu. */
export class TitleScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.leaving = false;
    this.cameras.main.setBackgroundColor(COLORS.deepTeal);
    document.title = t('title.name');

    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 300, t('title.name'), textStyle(120, COLORS.paper, FONTS.title))
      .setOrigin(0.5);
    this.add.text(centerX, 420, t('title.tagline'), textStyle(40, COLORS.paleGreen)).setOrigin(0.5);

    const menu = new MenuList(
      this,
      centerX,
      610,
      [
        { label: t('title.menu.play'), run: () => this.leave('Play') },
        { label: t('title.menu.controls'), run: () => this.leave('Controls') },
        { label: t('title.menu.language'), run: () => this.nextLanguage() },
      ],
      { size: 44, gap: 84, color: COLORS.paper, marker: TINTS.paleGreen },
    );
    onMenuKey(this, (key) => menu.handle(key));

    this.add
      .text(centerX, GAME_HEIGHT - 110, t('title.keys'), textStyle(24, COLORS.paleGreen))
      .setOrigin(0.5)
      .setAlpha(0.7);
    this.add
      .text(
        centerX,
        GAME_HEIGHT - 64,
        app.persistent ? t('title.status') : t('notice.notKept'),
        textStyle(24, COLORS.paleGreen),
      )
      .setOrigin(0.5)
      .setAlpha(0.6);
  }

  private leave(to: 'Play' | 'Controls'): void {
    if (this.leaving) return;
    this.leaving = true;
    if (to === 'Play') {
      // The key that chose Play must not also act inside the game.
      app.actions.clearQueued();
      this.scene.start('Play');
    } else {
      this.scene.start('Controls', { returnTo: 'Title' });
    }
  }

  private nextLanguage(): void {
    if (this.leaving) return;
    this.leaving = true;
    const next = LANGS[(LANGS.indexOf(app.settings.lang) + 1) % LANGS.length] ?? 'en';
    app.update({ lang: next });
    this.scene.restart();
  }
}
