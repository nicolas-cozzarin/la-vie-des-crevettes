import Phaser from 'phaser';
import { app } from '../app';
import type { MenuKey } from '../core/input/menuKeys';

/**
 * Let a scene hear menu keys for as long as it runs. Each key gives a soft
 * tap, and Left and Right, which turn the carnet's pages, the sound of paper
 * (doc 05, "Menus").
 */
export function onMenuKey(scene: Phaser.Scene, handler: (key: MenuKey) => void): void {
  const stop = app.keyboard.onMenuKey((key) => {
    app.sound.play(key === 'left' || key === 'right' ? 'menuPage' : 'menuTap');
    handler(key);
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
}
