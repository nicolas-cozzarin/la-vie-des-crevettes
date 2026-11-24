import Phaser from 'phaser';
import { app } from '../app';
import { isPlayableArea } from '../data/areas';
import { exploreRequest, exploreStart } from '../platform/address';
import { loadFonts } from '../platform/fonts';

/** The longest the first screen waits for the fonts. */
const FONT_WAIT_MS = 3000;

/** First scene. Sets up what every later scene relies on, then hands over. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    document.documentElement.lang = app.settings.lang;
    void loadFonts(FONT_WAIT_MS).then(() => this.next());
  }

  private next(): void {
    // Explore mode goes straight to the place asked for. See src/platform/address.ts.
    const explore = exploreRequest();
    if (explore === 'drift') {
      this.scene.start('Drift', { explore: true, at: exploreStart() ?? undefined });
      return;
    }
    if (explore !== null && isPlayableArea(explore)) {
      this.scene.start('Play', { area: explore, explore: true, at: exploreStart() ?? undefined });
      return;
    }
    this.scene.start('Title');
  }
}
