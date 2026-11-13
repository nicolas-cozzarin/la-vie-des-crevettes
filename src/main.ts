import Phaser from 'phaser';
import { app } from './app';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { debugState } from './debug';
import { i18n } from './i18n';
import { BootScene } from './scenes/BootScene';
import { ControlsScene } from './scenes/ControlsScene';
import { HudScene } from './scenes/HudScene';
import { PauseScene } from './scenes/PauseScene';
import { PlayScene } from './scenes/PlayScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  backgroundColor: COLORS.deepTeal,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // The game reads the keyboard itself, by key position. See src/platform/KeyboardSource.ts.
  input: { keyboard: false },
  scene: [BootScene, TitleScene, PlayScene, HudScene, PauseScene, ControlsScene],
});

// Once per frame, before any scene runs, so every scene sees the same presses.
game.events.on(Phaser.Core.Events.PRE_STEP, () => app.actions.update());

window.__lvdc = {
  scenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),
  lang: () => i18n.lang,
  bindings: () => app.settings.bindings,
  player: () => debugState.player?.() ?? null,
};
