import Phaser from 'phaser';
import { app } from './app';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { debugState } from './debug';
import { i18n } from './i18n';
import { BootScene } from './scenes/BootScene';
import { ControlsScene } from './scenes/ControlsScene';
import { DriftScene } from './scenes/DriftScene';
import { HudScene } from './scenes/HudScene';
import { JournalScene } from './scenes/JournalScene';
import { PauseScene } from './scenes/PauseScene';
import { PlayScene } from './scenes/PlayScene';
import { SettingsScene } from './scenes/SettingsScene';
import { AboutScene } from './scenes/AboutScene';
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
  // Use the true time between frames. Phaser's smoothing caps it at one sixtieth of a
  // second for a while after every start and focus change, which plays the game in
  // slow motion on a slow machine. The play scene cuts long frames into short steps.
  fps: { smoothStep: false },
  // The game reads the keyboard itself, by key position. See src/platform/KeyboardSource.ts.
  input: { keyboard: false },
  scene: [
    BootScene,
    TitleScene,
    DriftScene,
    PlayScene,
    HudScene,
    PauseScene,
    JournalScene,
    ControlsScene,
    SettingsScene,
    AboutScene,
  ],
});

// Once per frame, before any scene runs, so every scene sees the same presses.
game.events.on(Phaser.Core.Events.PRE_STEP, () => app.actions.update());

window.__lvdc = {
  scenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),
  lang: () => i18n.lang,
  bindings: () => app.settings.bindings,
  settings: () => app.settings,
  player: () => debugState.player?.() ?? null,
  feelings: () => debugState.feelings?.() ?? null,
  scent: () => debugState.scent?.() ?? null,
  shrimp: () => debugState.shrimp?.() ?? null,
  creatures: () => debugState.creatures?.() ?? null,
  threat: () => debugState.threat?.() ?? null,
  drift: () => debugState.drift?.() ?? null,
  journal: () => debugState.journal?.() ?? null,
  progress: () => debugState.progress?.() ?? null,
  audio: () => debugState.audio?.() ?? null,
};
