import Phaser from 'phaser';
import { app } from '../app';

/** First scene. Sets up what every later scene relies on, then hands over. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    document.documentElement.lang = app.settings.lang;
    this.scene.start('Title');
  }
}
