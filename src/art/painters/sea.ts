import { seededRandom } from '../../core/random';
import { slate } from './channel';
import { glow, hex, mix, rgba, softFill, speckle, wrapped, type Painter, type Rgb } from '../paint';

/**
 * The open sea (doc 11, "Chapter 5"; doc 04: ultramarine `#0A2E6E` at the
 * shelf to `#061A40` in the deep, specks `#DCE9FF`). Deep and quiet. Light
 * comes from above and the upper left, cool and pale.
 */

const BLUE = hex('#0A2E6E');
const DEEP = hex('#061A40');
const SNOW = hex('#DCE9FF');
/** The light from above, through a lot of water. */
const LIGHT = hex('#8FB0DC');
const STONE = hex('#3E4A60');
const SHADE: Rgb = [4, 10, 26];

/**
 * A tile of open water: one colour, with very large, very faint patches a
 * little lighter and a little darker, so the eye has something to slide
 * over without seeing a pattern.
 */
function water(base: Rgb, seed: number): Painter {
  return {
    width: 1024,
    height: 1024,
    paint(ctx, size) {
      const random = seededRandom(seed);
      ctx.fillStyle = rgba(base, 1);
      ctx.fillRect(0, 0, size, size);
      const light = mix(base, LIGHT, 0.12);
      const dark = mix(base, SHADE, 0.35);
      for (let index = 0; index < 26; index++) {
        const x = random() * size;
        const y = random() * size;
        const r = 160 + random() * 260;
        const color = random() < 0.5 ? light : dark;
        const alpha = 0.05 + random() * 0.07;
        wrapped(size, x, y, r, (px, py) => glow(ctx, px, py, r, color, alpha));
      }
    },
  };
}

/**
 * The last rock at the shelf's edge, seen from above: a long slab lit on its
 * upper left, its far edge overhanging a dark underside where a shrimp fits.
 * Its shadow falls on the sand below and to the right. Drawn as cover, over
 * the shrimp.
 */
const ledge: Painter = {
  width: 760,
  height: 420,
  paint(ctx, width, height) {
    const random = seededRandom(2101);
    const cx = width / 2;
    const cy = height / 2 - 14;
    // The shadow on the sand, kept inside the picture, and the dark hollow under the overhang.
    ctx.save();
    ctx.translate(cx + 30, cy + 70);
    ctx.scale(1, 0.48);
    glow(ctx, 0, 0, 330, SHADE, 0.6, 0.45);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy + 66, width * 0.39, 62, 0.02, 0, Math.PI * 2);
    softFill(ctx, rgba(SHADE, 0.92), SHADE, 22, 0.9);
    ctx.restore();
    // The slab: the channel's slate, long and flat, the last of the coast's rock.
    slate(ctx, random, cx, cy - 6, 318, mix(STONE, BLUE, 0.2), 0.5, 0.02);
    // Its lip darkens toward the overhang, and a little growth catches the light.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const lip = ctx.createLinearGradient(0, cy + 30, 0, cy + 160);
    lip.addColorStop(0, rgba(SHADE, 0));
    lip.addColorStop(1, rgba(SHADE, 0.6));
    ctx.fillStyle = lip;
    ctx.fillRect(0, cy + 30, width, 140);
    speckle(
      ctx,
      random,
      70,
      { x: cx - 260, y: cy - 90, w: 420, h: 110 },
      [1, 2.6],
      LIGHT,
      [0.1, 0.28],
    );
    ctx.restore();
  },
};

/**
 * The deep: one round wash of the deep's colour, full in the middle and
 * fading to nothing at its rim. Shown very large over the blue, so that the
 * water darkens toward the deepest point.
 */
const deep: Painter = {
  width: 256,
  height: 256,
  paint(ctx, size) {
    const mid = size / 2;
    const fill = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
    fill.addColorStop(0, rgba(DEEP, 1));
    fill.addColorStop(0.3, rgba(DEEP, 0.95));
    fill.addColorStop(0.65, rgba(DEEP, 0.55));
    fill.addColorStop(1, rgba(DEEP, 0));
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, size, size);
  },
};

/** One speck of marine snow: a pale soft point, a little brighter in the middle. */
const snow: Painter = {
  width: 32,
  height: 32,
  paint(ctx, size) {
    const mid = size / 2;
    glow(ctx, mid, mid, mid, SNOW, 0.55, 0.15);
    glow(ctx, mid, mid, mid * 0.4, SNOW, 0.9);
  },
};

export const seaPainters: Record<string, Painter> = {
  'sea.blue': water(BLUE, 2103),
  'sea.deep': deep,
  'sea.ledge': ledge,
  'fx.snow': snow,
};
