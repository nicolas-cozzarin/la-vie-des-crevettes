import Phaser from 'phaser';
import { i18n } from '../i18n';

/** First scene. Sets up what every later scene relies on, then hands over. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    document.documentElement.lang = i18n.lang;
    this.scene.start('Title');
  }
}
