import type Phaser from 'phaser';
import type { MenuKey } from '../core/input/menuKeys';
import { textStyle } from './text';

export interface MenuEntry {
  label: string;
  run: () => void;
}

export interface MenuLook {
  size: number;
  gap: number;
  color: string;
  /** Colour of the line under the chosen entry. */
  marker: number;
}

/** A column of choices. Arrows or the mouse choose, Enter or a click confirms. */
export class MenuList {
  private readonly texts: Phaser.GameObjects.Text[];
  private readonly marker: Phaser.GameObjects.Graphics;
  private index = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    y: number,
    private readonly entries: readonly MenuEntry[],
    private readonly look: MenuLook,
  ) {
    this.marker = scene.add.graphics();
    this.texts = entries.map((entry, index) => {
      const text = scene.add
        .text(x, y + index * look.gap, entry.label, textStyle(look.size, look.color))
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerover', () => this.select(index));
      text.on('pointerdown', () => {
        this.select(index);
        entry.run();
      });
      return text;
    });
    this.select(0);
  }

  get selected(): number {
    return this.index;
  }

  /** Returns true if the key meant something to the list. */
  handle(key: MenuKey): boolean {
    if (key === 'up') this.select((this.index + this.entries.length - 1) % this.entries.length);
    else if (key === 'down') this.select((this.index + 1) % this.entries.length);
    else if (key === 'accept') this.entries[this.index]?.run();
    else return false;
    return true;
  }

  select(index: number): void {
    this.index = index;
    this.texts.forEach((text, at) => text.setAlpha(at === index ? 1 : 0.62));
    const chosen = this.texts[index];
    if (!chosen) return;
    const width = chosen.width + 24;
    this.marker.clear();
    this.marker.fillStyle(this.look.marker, 1);
    this.marker.fillRoundedRect(
      this.x - width / 2,
      chosen.y + chosen.height / 2 + 2,
      width,
      5,
      2.5,
    );
  }
}
