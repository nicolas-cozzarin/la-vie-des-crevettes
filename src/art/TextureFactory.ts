import type Phaser from 'phaser';
import type { Painter } from './paint';
import { shrimpPainters } from './painters/shrimp';
import { worldPainters } from './painters/world';

/**
 * Every image is asked for by name. If a file with that name was loaded, it
 * is used. If not, the image is painted by code the first time it is needed.
 * A painted file can therefore replace a generated one with no other change.
 */
const PAINTERS: Readonly<Record<string, Painter>> = { ...shrimpPainters, ...worldPainters };

export function ensureTexture(scene: Phaser.Scene, name: string): string {
  if (scene.textures.exists(name)) return name;
  const painter = PAINTERS[name];
  if (!painter) throw new Error(`No image file and no painter for "${name}"`);
  const texture = scene.textures.createCanvas(name, painter.width, painter.height);
  if (!texture) throw new Error(`Could not create the image "${name}"`);
  painter.paint(texture.context, painter.width, painter.height);
  texture.refresh();
  return name;
}

export function hasPainter(name: string): boolean {
  return name in PAINTERS;
}
