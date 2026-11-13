import type Phaser from 'phaser';
import { FONTS } from '../config';

/** Text is never smaller than 20 px at the design size. See docs/04-art-direction.md. */
export function textStyle(
  size: number,
  color: string,
  family: string = FONTS.text,
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: family, fontSize: `${Math.max(20, size)}px`, color };
}
