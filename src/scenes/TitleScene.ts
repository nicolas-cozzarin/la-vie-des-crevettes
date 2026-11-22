import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { LANGS } from '../core/i18n';
import { newLife, type Life } from '../core/progress/life';
import { lifeOf, loadSave, type SaveV1 } from '../core/save/save';
import { isPlayableArea } from '../data/areas/index';
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
        { label: t('title.menu.controls'), run: () => this.toControls() },
        { label: t('title.menu.language'), run: () => this.nextLanguage() },
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
    let life: Life = newLife();
    if (save) {
      const kept = lifeOf(save);
      life = {
        ...newLife(),
        discoveries: kept.discoveries,
        challenges: kept.challenges,
        achievements: kept.achievements,
        cards: kept.cards,
        stats: kept.stats,
        generation: kept.generation,
        promptsShown: kept.promptsShown,
        playSeconds: kept.playSeconds,
        journalSeen: kept.journalSeen,
      };
      // Counted for one life only.
      life.stats.cornered = 0;
    }
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

  private toControls(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Controls', { returnTo: 'Title' });
  }

  private nextLanguage(): void {
    if (this.leaving) return;
    this.leaving = true;
    const next = LANGS[(LANGS.indexOf(app.settings.lang) + 1) % LANGS.length] ?? 'en';
    app.update({ lang: next });
    this.scene.restart();
  }
}
