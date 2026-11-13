import Phaser from 'phaser';
import { app } from '../app';
import type { MenuKey } from '../core/input/menuKeys';

/** Let a scene hear menu keys for as long as it runs. */
export function onMenuKey(scene: Phaser.Scene, handler: (key: MenuKey) => void): void {
  const stop = app.keyboard.onMenuKey(handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
}
