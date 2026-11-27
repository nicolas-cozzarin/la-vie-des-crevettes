import { seededRandom } from '../../core/random';
import {
  blob,
  glow,
  hex,
  rgba,
  sampleCurve,
  softFill,
  traceLine,
  tracePath,
  traceRibbon,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * Effects used in every area, and the scent ribbons seen with Sense.
 * See docs/11-world-catalogue.md. Each ribbon has its own shape as well as its
 * own colour, so the cue works without colour vision.
 */
const TAU = Math.PI * 2;

const SCENT_FOOD = hex('#7BC47F');
const SCENT_SHRIMP = hex('#E8B04A');
const SCENT_DANGER = hex('#8E6BBF');
const SCENT_UNKNOWN = hex('#F4F1E6');
const GOLD = hex('#C9A24B');
const GOLD_LIGHT: Rgb = [232, 204, 124];
const GOLD_DARK: Rgb = [140, 106, 44];

/** A speck drifting in the water. The game scatters many, in three layers. */
const speck: Painter = {
  width: 16,
  height: 16,
  paint(ctx, size) {
    glow(ctx, size / 2, size / 2, size / 2, [232, 226, 204], 0.9, 0.15);
  },
};

/**
 * A speck drawn out by fast water (`fx.streak`): a short pale line, soft at
 * both ends. The game stretches it with the water's speed and turns it the
 * way the water runs.
 */
const streak: Painter = {
  width: 64,
  height: 8,
  paint(ctx, width, height) {
    const line = ctx.createLinearGradient(0, 0, width, 0);
    line.addColorStop(0, 'rgba(220, 228, 236, 0)');
    line.addColorStop(0.7, 'rgba(220, 228, 236, 0.9)');
    line.addColorStop(1, 'rgba(220, 228, 236, 0)');
    ctx.fillStyle = line;
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  },
};

/** A ring on the surface. The game widens and fades it. */
const ripple: Painter = {
  width: 256,
  height: 256,
  paint(ctx, size) {
    const centre = size / 2;
    for (const [radius, width, alpha] of [
      [112, 5, 0.6],
      [84, 3, 0.4],
    ] as const) {
      // A pale line with a darker one inside it: the crest and the trough.
      ctx.strokeStyle = rgba([238, 240, 228], alpha);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(centre, centre, radius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba([30, 36, 40], alpha * 0.35);
      ctx.lineWidth = width * 0.8;
      ctx.beginPath();
      ctx.arc(centre, centre, radius - width, 0, TAU);
      ctx.stroke();
    }
  },
};

/** Both ends of a ribbon fade into the water. */
function fadeEnds(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, 0, width, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.2, 'rgba(0,0,0,0)');
  fade.addColorStop(0.8, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Food: one smooth, wide band with soft edges. */
const scentFood: Painter = {
  width: 512,
  height: 64,
  paint(ctx, width, height) {
    const mid = height / 2;
    const line: Point[] = [];
    for (let index = 0; index <= 40; index++) {
      const t = index / 40;
      line.push({ x: t * width, y: mid + 7 * Math.sin(t * TAU * 1.5) });
    }
    ctx.save();
    traceRibbon(ctx, line, (t) => 20 + 6 * Math.sin(t * TAU * 2 + 1));
    softFill(ctx, rgba(SCENT_FOOD, 0.55), SCENT_FOOD, 10, 0.7);
    ctx.restore();
    // A paler heart, as where the brush was wettest.
    traceRibbon(ctx, line, (t) => 7 + 3 * Math.sin(t * TAU * 2 + 1));
    ctx.fillStyle = rgba([214, 240, 208], 0.5);
    ctx.fill();
    fadeEnds(ctx, width, height);
  },
};

/** Danger: a jagged line with sharp corners. It marks a place, not a direction. */
const scentDanger: Painter = {
  width: 512,
  height: 64,
  paint(ctx, width, height) {
    const random = seededRandom(701);
    const mid = height / 2;
    const line: Point[] = [];
    let up = true;
    for (let x = 0; x <= width; x += 20 + random() * 16) {
      line.push({ x, y: mid + (up ? -1 : 1) * (9 + random() * 11) });
      up = !up;
    }
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    for (const [lineWidth, alpha, blur] of [
      [9, 0.35, 8],
      [4, 0.9, 0],
    ] as const) {
      ctx.save();
      ctx.shadowColor = rgba(SCENT_DANGER, 0.8);
      ctx.shadowBlur = blur;
      ctx.strokeStyle = rgba(SCENT_DANGER, alpha);
      ctx.lineWidth = lineWidth;
      traceLine(ctx, line);
      ctx.stroke();
      ctx.restore();
    }
    fadeEnds(ctx, width, height);
  },
};

/** Unknown: a thin line that coils in loose spirals. */
const scentUnknown: Painter = {
  width: 512,
  height: 64,
  paint(ctx, width, height) {
    const mid = height / 2;
    const line: Point[] = [];
    const loops = 6;
    for (let index = 0; index <= 360; index++) {
      const t = index / 360;
      const angle = t * TAU * loops;
      // A line that moves forward while it turns: loops that overlap a little.
      line.push({
        x: t * width + 17 * Math.sin(angle),
        y: mid - 17 * Math.cos(angle) * 0.95,
      });
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [lineWidth, alpha, blur] of [
      [6, 0.25, 6],
      [2.4, 0.9, 0],
    ] as const) {
      ctx.save();
      ctx.shadowColor = rgba(SCENT_UNKNOWN, 0.8);
      ctx.shadowBlur = blur;
      ctx.strokeStyle = rgba(SCENT_UNKNOWN, alpha);
      ctx.lineWidth = lineWidth;
      traceLine(ctx, line);
      ctx.stroke();
      ctx.restore();
    }
    fadeEnds(ctx, width, height);
  },
};

/** Shrimp: one round dot. The game lays a line of them and makes them pulse in turn. */
const scentDot: Painter = {
  width: 48,
  height: 48,
  paint(ctx, size) {
    const centre = size / 2;
    glow(ctx, centre, centre, 23, SCENT_SHRIMP, 0.5);
    ctx.fillStyle = rgba(SCENT_SHRIMP, 0.92);
    ctx.beginPath();
    ctx.arc(centre, centre, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba([250, 232, 180], 0.7);
    ctx.beginPath();
    ctx.arc(centre - 2.5, centre - 3, 3.4, 0, TAU);
    ctx.fill();
  },
};

/** Golden film on sand: a thin uneven sheen with pin-sized bright bubbles. */
const sandFilm: Painter = {
  width: 380,
  height: 380,
  paint(ctx, size) {
    const random = seededRandom(719);
    const centre = size / 2;
    const pools: { x: number; y: number; r: number }[] = [{ x: centre, y: centre, r: 100 }];
    for (let index = 0; index < 9; index++) {
      const angle = random() * TAU;
      const distance = 40 + random() * 80;
      pools.push({
        x: centre + Math.cos(angle) * distance,
        y: centre + Math.sin(angle) * distance,
        r: 36 + random() * 46,
      });
    }
    for (const pool of pools) {
      ctx.save();
      tracePath(ctx, blob(random, pool.x, pool.y, pool.r, 0.2, 13));
      softFill(ctx, rgba(GOLD, 0.22), GOLD_DARK, 20, 0.25);
      ctx.restore();
    }
    for (const pool of pools) glow(ctx, pool.x, pool.y, pool.r * 0.85, GOLD_LIGHT, 0.26);
    // The sheen is finely grained.
    for (let index = 0; index < 520; index++) {
      const pool = pools[Math.floor(random() * pools.length)] as {
        x: number;
        y: number;
        r: number;
      };
      const angle = random() * TAU;
      const distance = pool.r * Math.sqrt(random()) * 0.95;
      ctx.fillStyle = rgba(random() < 0.6 ? GOLD_LIGHT : GOLD_DARK, 0.2 + random() * 0.4);
      ctx.beginPath();
      ctx.arc(
        pool.x + Math.cos(angle) * distance,
        pool.y + Math.sin(angle) * distance,
        0.6 + random() * 1.5,
        0,
        TAU,
      );
      ctx.fill();
    }
    // Bubbles.
    for (let index = 0; index < 26; index++) {
      const pool = pools[Math.floor(random() * pools.length)] as {
        x: number;
        y: number;
        r: number;
      };
      const angle = random() * TAU;
      const distance = pool.r * Math.sqrt(random()) * 0.75;
      ctx.fillStyle = 'rgba(255,250,226,0.85)';
      ctx.beginPath();
      ctx.arc(
        pool.x + Math.cos(angle) * distance,
        pool.y + Math.sin(angle) * distance,
        0.9 + random() * 1.3,
        0,
        TAU,
      );
      ctx.fill();
    }
  },
};

export const effectPainters: Record<string, Painter> = {
  'fx.speck': speck,
  'fx.ripple': ripple,
  'fx.streak': streak,
  'scent.food': scentFood,
  'scent.dot': scentDot,
  'scent.danger': scentDanger,
  'scent.unknown': scentUnknown,
  'food.sandFilm': sandFilm,
};

void sampleCurve;
