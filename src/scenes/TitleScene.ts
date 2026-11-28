import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { lifeAfter, newLife, type Life } from '../core/progress/life';
import { lifeOf, loadSave, type SaveV1 } from '../core/save/save';
import { isPlayableArea } from '../data/areas/index';
import { t } from '../i18n';
import { touchOnly } from '../platform/device';
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

    // A device with no keyboard sees the title and one line (doc 03).
    if (touchOnly()) {
      this.add.text(centerX, 640, t('notice.keyboard'), textStyle(36, COLORS.paper)).setOrigin(0.5);
      return;
    }

    // With a life kept, it goes on from there, or a new one begins.
    const save = loadSave(app.store);
    const life = save
      ? [
          { label: t('title.menu.continue'), run: () => this.carryOn(save) },
          { label: t('title.menu.newLife'), run: () => this.begin(save) },
        ]
      : [{ label: t('title.menu.play'), run: () => this.begin(null) }];
    const menu = new MenuList(
      this,
      centerX,
      save ? 580 : 610,
      [
        ...life,
        { label: t('title.menu.settings'), run: () => this.toScene('Settings') },
        { label: t('title.menu.about'), run: () => this.toScene('About') },
      ],
      { size: 44, gap: save ? 76 : 84, color: COLORS.paper, marker: TINTS.paleGreen },
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

  /**
   * A life begins in the Drift. A new life keeps the carnet: what was found,
   * the challenges, achievements and cards. Nothing is ever taken away (doc 12).
   */
  private begin(save: SaveV1 | null): void {
    if (this.leaving) return;
    this.leaving = true;
    // What one life counted toward its own story starts again (T123).
    const life: Life = save ? lifeAfter(lifeOf(save)) : newLife();
    // The key that chose must not also act inside the game.
    app.actions.clearQueued();
    this.scene.start('Drift', { life });
  }

  /** Back to the life where it was kept: the Drift from its start, or a place at the last rest. */
  private carryOn(save: SaveV1): void {
    if (this.leaving) return;
    this.leaving = true;
    app.actions.clearQueued();
    const life = lifeOf(save);
    if (save.area !== 'drift' && isPlayableArea(save.area)) {
      this.scene.start('Play', {
        area: save.area,
        life,
        resume: true,
        at: save.at ?? undefined,
      });
    } else {
      this.scene.start('Drift', { life });
    }
  }

  private toScene(key: 'Settings' | 'About'): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(key, { from: 'Title' });
  }
}
