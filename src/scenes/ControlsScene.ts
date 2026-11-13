import Phaser from 'phaser';
import { app } from '../app';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH, TINTS } from '../config';
import { ACTIONS, type Action } from '../core/input/actions';
import {
  DEFAULT_BINDINGS,
  PRESETS,
  PRESET_IDS,
  clearSlot,
  isLocked,
  rebind,
  type PresetId,
  type Slot,
} from '../core/input/bindings';
import { fixedMenuKey, type MenuKey } from '../core/input/menuKeys';
import { t } from '../i18n';
import { Button } from '../ui/Button';
import { onMenuKey } from '../ui/menuKeys';
import { textStyle } from '../ui/text';

type Cell =
  | { kind: 'slot'; button: Button; action: Action; slot: Slot }
  | { kind: 'preset'; button: Button; preset: PresetId }
  | { kind: 'reset'; button: Button }
  | { kind: 'back'; button: Button };

type ReturnTo = 'Title' | 'Pause';

const PANEL = { x: 250, y: 34, w: 1420, h: 1012 };
const LABEL_X = 330;
const SLOT_X = [1080, 1400] as const;
const ROW_TOP = 222;
const ROW_GAP = 50;

/**
 * The Controls screen: every action with its two keys. Choose a slot, press
 * Enter, then press the new key. See docs/03-controls.md.
 */
export class ControlsScene extends Phaser.Scene {
  private returnTo: ReturnTo = 'Title';
  private rows: Cell[][] = [];
  private row = 0;
  private col = 0;
  private message!: Phaser.GameObjects.Text;
  private waiting: { action: Action; slot: Slot } | null = null;
  private stopWaiting: (() => void) | null = null;
  private resetArmed = false;
  private leaving = false;

  constructor() {
    super('Controls');
  }

  init(data: { returnTo?: ReturnTo }): void {
    this.returnTo = data.returnTo ?? 'Title';
  }

  create(): void {
    this.rows = [];
    this.row = 0;
    this.col = 0;
    this.waiting = null;
    this.stopWaiting = null;
    this.resetArmed = false;
    this.leaving = false;

    const centerX = GAME_WIDTH / 2;
    if (this.returnTo === 'Pause') {
      // The paused game stays visible behind.
      this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, TINTS.deepTeal, 0.5);
    } else {
      this.cameras.main.setBackgroundColor(COLORS.deepTeal);
    }

    const panel = this.add.graphics();
    panel.fillStyle(TINTS.paper, 0.98);
    panel.fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 28);

    this.add
      .text(centerX, 96, t('controls.title'), textStyle(60, COLORS.ink, FONTS.title))
      .setOrigin(0.5);

    const heading = textStyle(22, COLORS.inkSoft);
    this.add.text(LABEL_X, 168, t('controls.column.action'), heading).setOrigin(0, 0.5);
    this.add.text(SLOT_X[0], 168, t('controls.column.key1'), heading).setOrigin(0.5);
    this.add.text(SLOT_X[1], 168, t('controls.column.key2'), heading).setOrigin(0.5);

    ACTIONS.forEach((action, index) => {
      const y = ROW_TOP + index * ROW_GAP;
      this.add.text(LABEL_X, y, t(`action.${action}`), textStyle(28, COLORS.ink)).setOrigin(0, 0.5);
      const cells: Cell[] = ([0, 1] as const).map((slot) => {
        const button = new Button(this, SLOT_X[slot], y, 280, 42, '', {
          onHover: () => this.hover(index, slot),
          onPress: () => this.press(index, slot),
        });
        button.setMuted(isLocked(action, slot));
        return { kind: 'slot', button, action, slot };
      });
      this.rows.push(cells);
    });

    const presetsY = ROW_TOP + ACTIONS.length * ROW_GAP + 34;
    this.add
      .text(LABEL_X, presetsY, t('controls.presets'), textStyle(28, COLORS.ink))
      .setOrigin(0, 0.5);
    const presetRow = this.rows.length;
    this.rows.push(
      PRESET_IDS.map((preset, index): Cell => {
        const button = new Button(
          this,
          660 + index * 262,
          presetsY,
          248,
          46,
          this.presetName(preset),
          {
            size: 24,
            onHover: () => this.hover(presetRow, index),
            onPress: () => this.press(presetRow, index),
          },
        );
        return { kind: 'preset', button, preset };
      }),
    );

    const lastY = presetsY + 70;
    const lastRow = this.rows.length;
    this.rows.push([
      {
        kind: 'reset',
        button: new Button(this, LABEL_X + 200, lastY, 400, 46, t('controls.reset'), {
          size: 24,
          onHover: () => this.hover(lastRow, 0),
          onPress: () => this.press(lastRow, 0),
        }),
      },
      {
        kind: 'back',
        button: new Button(this, 1440, lastY, 240, 46, t('controls.back'), {
          size: 24,
          onHover: () => this.hover(lastRow, 1),
          onPress: () => this.press(lastRow, 1),
        }),
      },
    ]);

    this.message = this.add.text(centerX, lastY + 66, '', textStyle(26, COLORS.ink)).setOrigin(0.5);
    this.add
      .text(
        centerX,
        lastY + 112,
        app.persistent ? t('controls.help') : t('notice.notKept'),
        textStyle(22, COLORS.inkSoft),
      )
      .setOrigin(0.5);

    onMenuKey(this, (key) => this.onKey(key));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopWaiting?.());
    this.refresh();
  }

  /** The letters preset is named by the letters on the player's own keyboard. */
  private presetName(preset: PresetId): string {
    const letters = PRESETS.wasd;
    return t(`controls.preset.${preset}`, {
      up: app.keyName(letters.moveUp[0]),
      left: app.keyName(letters.moveLeft[0]),
      down: app.keyName(letters.moveDown[0]),
      right: app.keyName(letters.moveRight[0]),
    });
  }

  private get cell(): Cell | undefined {
    return this.rows[this.row]?.[this.col];
  }

  /** Bring every box up to date with the bindings and the cursor. */
  private refresh(): void {
    const bindings = app.settings.bindings;
    this.rows.forEach((cells, row) => {
      cells.forEach((cell, col) => {
        const chosen = row === this.row && col === this.col;
        const waiting =
          cell.kind === 'slot' &&
          this.waiting?.action === cell.action &&
          this.waiting.slot === cell.slot;
        if (cell.kind === 'slot') {
          cell.button.setText(
            waiting ? t('controls.pressKey') : app.keyName(bindings[cell.action][cell.slot]),
          );
        }
        cell.button.setLook(waiting ? 'waiting' : chosen ? 'selected' : 'idle');
      });
    });
  }

  private say(text: string): void {
    this.message.setText(text);
  }

  private onKey(key: MenuKey): void {
    if (this.leaving) return;
    if (key !== 'accept') this.resetArmed = false;

    if (key === 'back') {
      this.back();
    } else if (key === 'accept') {
      this.activate();
    } else if (key === 'clear') {
      const cell = this.cell;
      if (cell?.kind === 'slot') this.clear(cell.action, cell.slot);
    } else {
      this.move(key);
    }
  }

  private move(key: 'up' | 'down' | 'left' | 'right'): void {
    const rows = this.rows.length;
    if (key === 'up') this.row = (this.row + rows - 1) % rows;
    if (key === 'down') this.row = (this.row + 1) % rows;
    const cols = this.rows[this.row]?.length ?? 1;
    if (key === 'left') this.col = (this.col + cols - 1) % cols;
    if (key === 'right') this.col = (this.col + 1) % cols;
    this.col = Math.min(this.col, cols - 1);
    this.say('');
    this.refresh();
  }

  private hover(row: number, col: number): void {
    if (this.waiting || this.leaving) return;
    if (row === this.row && col === this.col) return;
    this.row = row;
    this.col = col;
    this.resetArmed = false;
    this.refresh();
  }

  private press(row: number, col: number): void {
    if (this.leaving) return;
    if (this.waiting) this.cancelWaiting();
    if (row !== this.row || col !== this.col) this.resetArmed = false;
    this.row = row;
    this.col = col;
    this.activate();
  }

  private activate(): void {
    const cell = this.cell;
    if (!cell) return;

    if (cell.kind === 'slot') {
      if (isLocked(cell.action, cell.slot)) {
        this.say(t('controls.msg.locked'));
        return;
      }
      this.waitForKey(cell.action, cell.slot);
    } else if (cell.kind === 'preset') {
      app.update({ bindings: PRESETS[cell.preset] });
      this.say(t('controls.msg.preset', { name: this.presetName(cell.preset) }));
    } else if (cell.kind === 'reset') {
      if (this.resetArmed) {
        this.resetArmed = false;
        app.update({ bindings: DEFAULT_BINDINGS });
        this.say(t('controls.msg.resetDone'));
      } else {
        this.resetArmed = true;
        this.say(t('controls.msg.resetConfirm'));
      }
    } else {
      this.back();
      return;
    }
    this.refresh();
  }

  private waitForKey(action: Action, slot: Slot): void {
    this.waiting = { action, slot };
    this.say('');
    this.stopWaiting = app.keyboard.captureNext((code) => {
      this.waiting = null;
      this.stopWaiting = null;
      const meaning = fixedMenuKey(code);
      if (meaning === 'back') {
        this.say('');
      } else if (meaning === 'clear') {
        this.clear(action, slot);
      } else {
        this.assign(action, slot, code);
      }
      this.refresh();
    });
  }

  private cancelWaiting(): void {
    this.stopWaiting?.();
    this.stopWaiting = null;
    this.waiting = null;
  }

  private assign(action: Action, slot: Slot, code: string): void {
    const result = rebind(app.settings.bindings, action, slot, code);
    if (!result.ok) {
      if (result.reason === 'wouldUnbind' && result.action) {
        this.say(t('controls.msg.wouldUnbind', { other: t(`action.${result.action}`) }));
      } else {
        this.say(t(`controls.msg.${result.reason}`));
      }
      return;
    }

    app.update({ bindings: result.bindings });
    const moved = result.displaced;
    if (!moved) {
      this.say('');
      return;
    }
    const params = { key: app.keyName(code), other: t(`action.${moved.action}`) };
    this.say(
      moved.now === null
        ? t('controls.msg.unbound', { ...params, slot: moved.slot + 1 })
        : t('controls.msg.swapped', { ...params, now: app.keyName(moved.now) }),
    );
  }

  private clear(action: Action, slot: Slot): void {
    const result = clearSlot(app.settings.bindings, action, slot);
    if (result.ok) {
      app.update({ bindings: result.bindings });
      this.say('');
    } else {
      this.say(t(`controls.msg.${result.reason}`));
    }
    this.refresh();
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(this.returnTo);
  }
}
