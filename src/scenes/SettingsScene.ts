import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import type { MenuKey } from '../core/input/menuKeys';
import { clearSave } from '../core/save/save';
import {
  SETTING_ROWS,
  changeSetting,
  levelShown,
  type SettingGroup,
  type SettingRow,
} from '../core/save/settingsMenu';
import { t } from '../i18n';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

export type SettingsFrom = 'Title' | 'Pause';

const PANEL = { x: 440, y: 34, w: 1040, h: 1012 };
const GROUP_X = 500;
const LABEL_X = 760;
const VALUE_X = 1310;
const ROW_TOP = 196;
const ROW_GAP = 50;
/** Space before each group after the first. */
const GROUP_GAP = 22;
const MESSAGE_Y = 990;

interface Line {
  row: SettingRow;
  y: number;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
}

/**
 * The settings screen (doc 03, "Settings"): language, controls, sound,
 * comfort and data, one row each. Up and Down choose a row; Left and Right,
 * or Enter, change it; Escape goes back. Every change is kept at once. Over
 * the paused game, Start over is not offered: it belongs to the title.
 */
export class SettingsScene extends Phaser.Scene {
  private from: SettingsFrom = 'Title';
  private lines: Line[] = [];
  private index = 0;
  private band!: Phaser.GameObjects.Graphics;
  private message!: Phaser.GameObjects.Text;
  private startOverArmed = false;
  private leaving = false;

  constructor() {
    super('Settings');
  }

  private startAt = 0;

  init(data: { from?: SettingsFrom; at?: number }): void {
    this.from = data.from ?? 'Title';
    this.startAt = data.at ?? 0;
  }

  create(): void {
    this.lines = [];
    this.index = 0;
    this.startOverArmed = false;
    this.leaving = false;
    const centerX = GAME_WIDTH / 2;
    if (this.from === 'Pause') {
      // The paused game stays visible behind.
      this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TINTS.deepTeal, 0.5);
    } else {
      this.cameras.main.setBackgroundColor(COLORS.deepTeal);
    }
    const panel = this.add.graphics();
    panel.fillStyle(TINTS.paper, 0.98);
    panel.fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28);
    this.add
      .text(centerX, 100, t('settings.title'), textStyle(60, COLORS.ink, FONTS.title))
      .setOrigin(0.5);

    this.band = this.add.graphics();
    const rows = SETTING_ROWS.filter((row) => this.from === 'Title' || row.id !== 'startOver');
    let y = ROW_TOP;
    let group: SettingGroup | null = null;
    rows.forEach((row, index) => {
      if (row.group !== group) {
        if (group !== null) y += GROUP_GAP;
        group = row.group;
        this.add
          .text(GROUP_X, y, t(`settings.group.${row.group}`), textStyle(24, COLORS.inkSoft))
          .setOrigin(0, 0.5);
      }
      const label = this.add
        .text(LABEL_X, y, this.labelOf(row), textStyle(30, COLORS.ink))
        .setOrigin(0, 0.5);
      const value = this.add.text(VALUE_X, y, '', textStyle(30, COLORS.ink)).setOrigin(0.5);
      const zone = this.add
        .zone(PANEL.x + PANEL.w / 2, y, PANEL.w - 80, ROW_GAP)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.choose(index));
      zone.on('pointerdown', () => {
        this.choose(index);
        this.onKey('accept');
      });
      this.lines.push({ row, y, label, value });
      y += ROW_GAP;
    });

    this.message = this.add
      .text(centerX, MESSAGE_Y, '', {
        ...textStyle(22, COLORS.ink),
        align: 'center',
        wordWrap: { width: PANEL.w - 120 },
      })
      .setOrigin(0.5);

    onMenuKey(this, (key) => this.onKey(key));
    this.refresh();
    this.choose(Math.min(this.startAt, this.lines.length - 1));
  }

  private onKey(key: MenuKey): void {
    if (this.leaving) return;
    const line = this.lines[this.index];
    if (key === 'back') {
      this.back();
      return;
    }
    if (key === 'up' || key === 'down') {
      const step = key === 'up' ? -1 : 1;
      this.choose((this.index + step + this.lines.length) % this.lines.length);
      return;
    }
    if (!line || key === 'clear') return;
    const { row } = line;
    if (key === 'accept' && row.kind === 'open') {
      this.openControls();
      return;
    }
    if (key === 'accept' && row.kind === 'action') {
      this.startOver();
      return;
    }
    if (key !== 'left' && key !== 'right' && key !== 'accept') return;
    const patch = changeSetting(app.settings, row.id, key === 'left' ? -1 : 1);
    if (!patch) return;
    app.update(patch);
    // A new language rewrites every word on the screen.
    if (patch.lang) {
      this.leaving = true;
      this.scene.restart({ from: this.from, at: this.index });
      return;
    }
    this.refresh();
  }

  private choose(index: number): void {
    this.index = index;
    this.startOverArmed = false;
    const line = this.lines[index];
    if (!line) return;
    this.band.clear();
    this.band.fillStyle(TINTS.deepTeal, 0.1);
    this.band.fillRoundedRect(
      PANEL.x + 30,
      line.y - ROW_GAP / 2 + 3,
      PANEL.w - 60,
      ROW_GAP - 6,
      12,
    );
    this.say(line.row.id === 'gentleMode' ? t('settings.gentle.help') : '');
  }

  private refresh(): void {
    for (const line of this.lines) line.value.setText(this.valueText(line.row));
  }

  private labelOf(row: SettingRow): string {
    switch (row.id) {
      case 'lang':
      case 'controls':
        // The group's name says it.
        return '';
      case 'senseMode':
        return t('settings.sense');
      case 'hideMode':
        return t('settings.hide');
      case 'master':
      case 'music':
      case 'ambience':
      case 'effects':
        return t(`settings.volume.${row.id}`);
      case 'captions':
        return t('settings.captions');
      case 'gentleMode':
        return t('settings.gentle');
      case 'reducedMotion':
        return t('settings.reducedMotion');
      case 'textScale':
        return t('settings.textScale');
      case 'nameFeelings':
        return t('settings.nameFeelings');
      case 'startOver':
        return t('settings.startOver');
    }
  }

  private valueText(row: SettingRow): string {
    const s = app.settings;
    const between = (text: string) => `‹  ${text}  ›`;
    switch (row.id) {
      case 'lang':
        return between(languageName(s.lang));
      case 'controls':
        return '›';
      case 'senseMode':
      case 'hideMode':
        return between(t(`settings.${s[row.id]}`));
      case 'master':
      case 'music':
      case 'ambience':
      case 'effects':
        return between(String(levelShown(s.volume[row.id])));
      case 'captions':
      case 'gentleMode':
      case 'reducedMotion':
      case 'nameFeelings':
        return between(t(s[row.id] ? 'settings.on' : 'settings.off'));
      case 'textScale':
        return between(`${Math.round(s.textScale * 100)} %`);
      case 'startOver':
        return '';
    }
  }

  /** Enter once asks, Enter again erases the life, the carnet and the companions. */
  private startOver(): void {
    if (!this.startOverArmed) {
      this.startOverArmed = true;
      this.say(t('settings.startOver.confirm'));
      return;
    }
    this.startOverArmed = false;
    clearSave(app.store);
    this.say(t('settings.startOver.done'));
  }

  private say(text: string): void {
    this.message.setText(text || (app.persistent ? '' : t('notice.notKept')));
  }

  private openControls(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Controls', { returnTo: 'Settings', settingsFrom: this.from });
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    // The Escape that goes back must not also close the pause menu it goes back to.
    app.actions.clearQueued();
    this.scene.start(this.from);
  }
}

/** A language's own name for itself, as the browser writes it: "français", "English". */
function languageName(lang: string): string {
  try {
    const name = new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang;
    return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch {
    return lang;
  }
}
