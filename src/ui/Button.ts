import type Phaser from 'phaser';
import { COLORS, TINTS } from '../config';
import { textStyle } from './text';

export type ButtonLook = 'idle' | 'selected' | 'waiting';

export interface ButtonOptions {
  size?: number;
  onPress?: () => void;
  onHover?: () => void;
}

/** A rounded box with a word or a key name in it. Used on the Controls screen. */
export class Button {
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private look: ButtonLook = 'idle';

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    text: string,
    options: ButtonOptions = {},
  ) {
    this.box = scene.add.graphics();
    this.label = scene.add
      .text(x, y, text, textStyle(options.size ?? 26, COLORS.ink))
      .setOrigin(0.5);
    const zone = scene.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    if (options.onHover) zone.on('pointerover', options.onHover);
    if (options.onPress) zone.on('pointerdown', options.onPress);
    this.setText(text);
    this.draw();
  }

  setText(text: string): void {
    this.label.setScale(1).setText(text);
    // Long words shrink a little to stay inside the box.
    const room = this.width - 28;
    if (this.label.width > room) this.label.setScale(room / this.label.width);
  }

  /** Greyed, for something that cannot be changed. */
  setMuted(muted: boolean): void {
    this.label.setAlpha(muted ? 0.55 : 1);
  }

  setLook(look: ButtonLook): void {
    if (look === this.look) return;
    this.look = look;
    this.draw();
  }

  private draw(): void {
    const left = this.x - this.width / 2;
    const top = this.y - this.height / 2;
    const box = this.box;
    box.clear();
    if (this.look === 'idle') {
      box.fillStyle(0xffffff, 0.5);
      box.lineStyle(2, TINTS.ink, 0.28);
    } else {
      box.fillStyle(this.look === 'waiting' ? TINTS.warm : TINTS.paleGreen, 1);
      box.lineStyle(3, TINTS.ink, 0.9);
    }
    box.fillRoundedRect(left, top, this.width, this.height, 10);
    box.strokeRoundedRect(left, top, this.width, this.height, 10);
  }
}
