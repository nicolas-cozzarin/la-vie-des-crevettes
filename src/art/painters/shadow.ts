import { seededRandom } from '../../core/random';
import { glow, hex, mix, rgba, type Painter, type Point } from '../paint';

/**
 * The net (doc 10, "The net"; doc 11, "Chapter 4"). It is never drawn as an
 * object: a long hull's shadow, then a band of grid shadow sweeping the bed,
 * and the silt it stirs. The shadows have no light painted in, so they may
 * be turned any way.
 */

const TAU = Math.PI * 2;
/** Grid shadow `#0E1420` (doc 04). */
const SHADE = hex('#0E1420');
/** Stirred silt: pale grey-brown, a little cooler than the lagoon's sand. */
const SILT = mix(hex('#B4A88E'), hex('#9AA3AE'), 0.3);
const SILT_DARK = mix(SILT, SHADE, 0.25);

/** Half the hull's width, along its length from the stern (0) to the bow (1). */
function hullHalf(t: number): number {
  if (t < 0.08) return 0.78 + (t / 0.08) * 0.17;
  if (t < 0.55) return 0.95 + 0.05 * Math.sin(((t - 0.08) / 0.47) * Math.PI);
  // The bow: a long curve to a point.
  const bow = (t - 0.55) / 0.45;
  return 0.95 * Math.pow(Math.max(0, 1 - Math.pow(bow, 1.8)), 0.85);
}

/**
 * One long dark shape, pointed at the bow, which is on the right, and wide
 * and blunt at the stern. Its edges are soft: it is far above. Shown four
 * times larger than painted, 30 by 8 BL.
 */
const hull: Painter = {
  width: 1024,
  height: 280,
  paint(ctx, width, height) {
    const mid = height / 2;
    const left = 40;
    const right = width - 30;
    const half = height / 2 - 34;
    const outline: Point[] = [];
    const steps = 80;
    for (let index = 0; index <= steps; index++) {
      const t = index / steps;
      outline.push({ x: left + t * (right - left), y: mid - hullHalf(t) * half });
    }
    for (let index = steps; index >= 0; index--) {
      const t = index / steps;
      outline.push({ x: left + t * (right - left), y: mid + hullHalf(t) * half });
    }

    ctx.save();
    ctx.filter = 'blur(14px)';
    ctx.beginPath();
    outline.forEach((point, index) =>
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.closePath();
    // Darkest along the keel, a little lighter toward the sides.
    const fill = ctx.createLinearGradient(0, mid - half, 0, mid + half);
    fill.addColorStop(0, rgba(SHADE, 0.62));
    fill.addColorStop(0.5, rgba(SHADE, 0.8));
    fill.addColorStop(1, rgba(SHADE, 0.62));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    // A softer halo round it: the light scattered in the water above.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    for (let index = 0; index <= 10; index++) {
      const t = index / 10;
      const r = hullHalf(Math.min(0.97, t)) * half * 1.35 + 8;
      glow(ctx, left + t * (right - left), mid, r, SHADE, 0.12);
    }
    ctx.restore();
  },
};

/** Knot spacing of the mesh in the picture: a diamond is this wide and this tall. */
const MESH = { long: 44, short: 30 };

/**
 * The band of grid shadow, 14 BL across and 6 deep, moving toward the
 * picture's right. The mesh is drawn out a little along the way it is
 * pulled, its lines dark and blurred, at half strength. Its edges are a
 * little ragged. Shown at 1960 by 840, so a cell is about half a BL.
 */
const grid: Painter = {
  width: 440,
  height: 1024,
  paint(ctx, width, height) {
    const random = seededRandom(1801);
    // The mesh, as two families of slanting lines through the knots.
    ctx.save();
    ctx.filter = 'blur(2.4px)';
    ctx.strokeStyle = rgba(SHADE, 1);
    ctx.lineCap = 'round';
    // Through the knots of diamonds `long` wide and `short` tall.
    const slope = MESH.short / MESH.long;
    for (const side of [1, -1]) {
      for (let start = -width * slope; start < height + width * slope; start += MESH.short) {
        // Each line sags a little, as a towed net does, and the strands are not all alike.
        ctx.lineWidth = 2.6 + random() * 1.4;
        ctx.globalAlpha = 0.85 + random() * 0.15;
        ctx.beginPath();
        for (let x = -10; x <= width + 10; x += 20) {
          const y = start + side * x * slope + Math.sin((x / width) * Math.PI) * 6;
          if (x === -10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // The mass of the net itself dims the bed a little.
    ctx.fillStyle = rgba(SHADE, 0.16);
    ctx.fillRect(0, 0, width, height);

    // Ragged soft edges: keep only what lies inside an uneven outline.
    const inset = 26;
    const wobble = (step: number): number => (random() - 0.5) * step;
    const outline: Point[] = [];
    for (let y = inset; y <= height - inset; y += 32) outline.push({ x: inset + wobble(26), y });
    for (let x = inset; x <= width - inset; x += 32)
      outline.push({ x, y: height - inset + wobble(26) });
    for (let y = height - inset; y >= inset; y -= 32)
      outline.push({ x: width - inset + wobble(18), y });
    for (let x = width - inset; x >= inset; x -= 32) outline.push({ x, y: inset + wobble(26) });
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.filter = 'blur(10px)';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    outline.forEach((point, index) =>
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Half strength (doc 04).
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

/** A pale soft puff of stirred silt, lumpy, thinning to nothing at its rim. */
const silt: Painter = {
  width: 256,
  height: 256,
  paint(ctx, size) {
    const random = seededRandom(1802);
    const mid = size / 2;
    for (let index = 0; index < 14; index++) {
      const angle = random() * TAU;
      const out = random() * size * 0.18;
      const r = size * (0.16 + random() * 0.16);
      glow(
        ctx,
        mid + Math.cos(angle) * out,
        mid + Math.sin(angle) * out,
        r,
        random() < 0.3 ? SILT_DARK : SILT,
        0.16 + random() * 0.1,
      );
    }
    glow(ctx, mid, mid, size * 0.42, SILT, 0.22, 0.1);
  },
};

export const shadowPainters: Record<string, Painter> = {
  'shadow.hull': hull,
  'shadow.grid': grid,
  'fx.silt': silt,
};
