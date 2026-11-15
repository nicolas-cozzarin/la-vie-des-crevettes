import { PAINTERS } from '../art/painters';

const cache = new Map<string, HTMLCanvasElement>();

/** Paint a picture once and keep it. */
export function paintImage(name: string): HTMLCanvasElement {
  const kept = cache.get(name);
  if (kept) return kept;
  const painter = PAINTERS[name];
  if (!painter) throw new Error(`No painter for "${name}"`);
  const canvas = document.createElement('canvas');
  canvas.width = painter.width;
  canvas.height = painter.height;
  painter.paint(canvas.getContext('2d') as CanvasRenderingContext2D, painter.width, painter.height);
  cache.set(name, canvas);
  return canvas;
}
