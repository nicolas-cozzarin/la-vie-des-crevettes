import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { i18n } from './i18n';
import { BootScene } from './scenes/BootScene';
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
  scene: [BootScene, TitleScene],
});

window.__lvdc = {
  scenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),
  lang: () => i18n.lang,
};
