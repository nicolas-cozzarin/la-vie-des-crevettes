import { seededRandom } from '../../core/random';
import { mix, rgba, speckle, tracePath, type Painter, type Point, type Rgb } from '../paint';

const SAND: Rgb = [227, 213, 173];
const SAND_LIGHT: Rgb = [244, 234, 204];
const SAND_DARK: Rgb = [196, 178, 134];
const GRAIN_DARK: Rgb = [122, 102, 72];
const ALGAE: Rgb = [110, 139, 61];

/** Draw something at a point and again wherever it crosses the tile's edge, so the tile repeats cleanly. */
function wrapped(
  size: number,
  x: number,
  y: number,
  reach: number,
  draw: (x: number, y: number) => void,
): void {
  for (const offsetX of [-size, 0, size]) {
    for (const offsetY of [-size, 0, size]) {
      const px = x + offsetX;
      const py = y + offsetY;
      if (px < -reach || px > size + reach || py < -reach || py > size + reach) continue;
      draw(px, py);
    }
  }
}

/** Sand seen through shallow water. Repeats in both directions. */
const sand: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(5);
    ctx.fillStyle = rgba(SAND, 1);
    ctx.fillRect(0, 0, size, size);

    // Large soft patches of lighter and darker sand.
    for (let index = 0; index < 90; index++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 60 + random() * 150;
      const color = random() < 0.5 ? SAND_LIGHT : SAND_DARK;
      const strength = 0.08 + random() * 0.15;
      wrapped(size, x, y, radius, (px, py) => {
        const patch = ctx.createRadialGradient(px, py, 0, px, py, radius);
        patch.addColorStop(0, rgba(color, strength));
        patch.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = patch;
        ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
      });
    }

    // Ripple marks left by the water: short, gently bent, never quite in rows.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let index = 0; index < 120; index++) {
      const x = random() * size;
      const y = random() * size;
      const length = 130 + random() * 240;
      const angle = (random() - 0.5) * 0.36;
      const bend = (random() - 0.5) * 26;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const strength = 0.5 + random() * 0.5;
      wrapped(size, x, y, length, (px, py) => {
        for (const [shift, color, alpha, width] of [
          [0, SAND_DARK, 0.17, 8],
          [6, SAND_LIGHT, 0.24, 5],
        ] as const) {
          ctx.strokeStyle = rgba(color, alpha * strength);
          ctx.lineWidth = width;
          ctx.beginPath();
          for (let step = 0; step <= 12; step++) {
            const along = (step / 12 - 0.5) * length;
            const across = Math.sin((step / 12) * Math.PI) * bend + shift;
            const sx = px + cos * along - sin * across;
            const sy = py + sin * along + cos * across;
            if (step === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      });
    }

    // Grains.
    const whole = { x: 0, y: 0, w: size, h: size };
    speckle(ctx, random, 10000, whole, [0.5, 1.3], GRAIN_DARK, [0.1, 0.3]);
    speckle(ctx, random, 6000, whole, [0.5, 1.5], [255, 252, 240], [0.2, 0.5]);
    speckle(ctx, random, 900, whole, [1, 2.2], [84, 74, 62], [0.15, 0.35]);
  },
};

function blob(
  random: () => number,
  cx: number,
  cy: number,
  radius: number,
  wobble: number,
): Point[] {
  const points: Point[] = [];
  const count = 13;
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const r = radius * (1 - wobble + random() * wobble * 2);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

/** How much of a rock image's half-width the rock itself fills. */
export const ROCK_FILL = 0.84;

function rock(seed: number, base: Rgb): Painter {
  return {
    width: 256,
    height: 256,
    paint(ctx, size) {
      const random = seededRandom(seed);
      const centre = size / 2;
      const radius = centre * ROCK_FILL;
      const shape = blob(random, centre, centre, radius * 0.97, 0.07);
      const light = mix(base, [255, 250, 235], 0.35);
      const dark = mix(base, [40, 44, 52], 0.45);

      ctx.save();
      ctx.shadowColor = rgba(dark, 0.6);
      ctx.shadowBlur = 8;
      const fill = ctx.createRadialGradient(
        centre - radius * 0.3,
        centre - radius * 0.35,
        radius * 0.1,
        centre,
        centre,
        radius * 1.05,
      );
      fill.addColorStop(0, rgba(light, 1));
      fill.addColorStop(0.6, rgba(base, 1));
      fill.addColorStop(1, rgba(dark, 1));
      ctx.fillStyle = fill;
      tracePath(ctx, shape);
      ctx.fill();
      ctx.restore();

      ctx.save();
      tracePath(ctx, shape);
      ctx.clip();

      // Uneven washes, as on wet paper.
      for (let index = 0; index < 16; index++) {
        const x = centre + (random() - 0.5) * radius * 2;
        const y = centre + (random() - 0.5) * radius * 2;
        const r = 18 + random() * 46;
        const color = random() < 0.5 ? dark : light;
        const patch = ctx.createRadialGradient(x, y, 0, x, y, r);
        patch.addColorStop(0, rgba(color, 0.08 + random() * 0.14));
        patch.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = patch;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // A thin film of algae on the side away from the light.
      const film = ctx.createRadialGradient(
        centre + radius * 0.45,
        centre + radius * 0.4,
        0,
        centre + radius * 0.45,
        centre + radius * 0.4,
        radius * 0.8,
      );
      film.addColorStop(0, rgba(ALGAE, 0.3));
      film.addColorStop(1, rgba(ALGAE, 0));
      ctx.fillStyle = film;
      ctx.fillRect(0, 0, size, size);

      const whole = { x: 0, y: 0, w: size, h: size };
      speckle(ctx, random, 380, whole, [0.6, 1.8], dark, [0.1, 0.3]);
      speckle(ctx, random, 200, whole, [0.6, 1.6], light, [0.12, 0.35]);

      // A few cracks.
      ctx.strokeStyle = rgba(dark, 0.4);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let index = 0; index < 3; index++) {
        let x = centre + (random() - 0.5) * radius;
        let y = centre + (random() - 0.5) * radius;
        let angle = random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let step = 0; step < 6; step++) {
          angle += (random() - 0.5) * 0.9;
          x += Math.cos(angle) * 14;
          y += Math.sin(angle) * 14;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  };
}

/** Clear space around the slab in its image, in pixels. */
export const SLAB_MARGIN = 12;

/** A long flat stone. */
const slab: Painter = {
  width: 420,
  height: 130,
  paint(ctx, width, height) {
    const random = seededRandom(88);
    const base: Rgb = [128, 126, 118];
    const light = mix(base, [255, 250, 235], 0.32);
    const dark = mix(base, [40, 44, 52], 0.45);
    const m = SLAB_MARGIN;

    const shape: Point[] = [];
    const jitter = () => (random() - 0.5) * 8;
    for (let x = m + 30; x <= width - m - 30; x += 60) shape.push({ x, y: m + 4 + jitter() });
    shape.push({ x: width - m - 4, y: height / 2 + jitter() });
    for (let x = width - m - 30; x >= m + 30; x -= 60)
      shape.push({ x, y: height - m - 4 + jitter() });
    shape.push({ x: m + 4, y: height / 2 + jitter() });

    ctx.save();
    ctx.shadowColor = rgba(dark, 0.6);
    ctx.shadowBlur = 8;
    const fill = ctx.createLinearGradient(0, m, 0, height - m);
    fill.addColorStop(0, rgba(light, 1));
    fill.addColorStop(0.5, rgba(base, 1));
    fill.addColorStop(1, rgba(dark, 1));
    ctx.fillStyle = fill;
    tracePath(ctx, shape);
    ctx.fill();
    ctx.restore();

    ctx.save();
    tracePath(ctx, shape);
    ctx.clip();
    const whole = { x: 0, y: 0, w: width, h: height };
    speckle(ctx, random, 420, whole, [0.6, 1.8], dark, [0.1, 0.3]);
    speckle(ctx, random, 220, whole, [0.6, 1.6], light, [0.12, 0.35]);
    const film = ctx.createLinearGradient(0, height * 0.45, 0, height);
    film.addColorStop(0, rgba(ALGAE, 0));
    film.addColorStop(1, rgba(ALGAE, 0.28));
    ctx.fillStyle = film;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

const pebble: Painter = {
  width: 48,
  height: 48,
  paint(ctx, size) {
    const random = seededRandom(3);
    const centre = size / 2;
    const shape = blob(random, centre, centre, 17, 0.1);
    ctx.save();
    ctx.shadowColor = 'rgba(70,62,50,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1.5;
    ctx.shadowOffsetY = 2;
    const fill = ctx.createRadialGradient(centre - 5, centre - 6, 2, centre, centre, 19);
    fill.addColorStop(0, 'rgb(236,232,222)');
    fill.addColorStop(1, 'rgb(168,162,150)');
    ctx.fillStyle = fill;
    tracePath(ctx, shape);
    ctx.fill();
    ctx.restore();
  },
};

/** A soft round shadow. Stretched and faded by whatever casts it. */
const softShadow: Painter = {
  width: 128,
  height: 128,
  paint(ctx, size) {
    const centre = size / 2;
    const fill = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre);
    fill.addColorStop(0, 'rgba(20,30,40,1)');
    fill.addColorStop(0.45, 'rgba(20,30,40,0.7)');
    fill.addColorStop(1, 'rgba(20,30,40,0)');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, size, size);
  },
};

/** Darker water toward the edges of the view. */
const vignette: Painter = {
  width: 480,
  height: 270,
  paint(ctx, width, height) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(width / height, 1);
    const reach = height * 0.62;
    const fill = ctx.createRadialGradient(0, 0, reach * 0.45, 0, 0, reach);
    fill.addColorStop(0, 'rgba(11,42,58,0)');
    fill.addColorStop(1, 'rgba(11,42,58,0.5)');
    ctx.fillStyle = fill;
    ctx.fillRect(-height, -height, height * 2, height * 2);
    ctx.restore();
  },
};

/** Paper grain, laid over the whole picture. */
const grain: Painter = {
  width: 256,
  height: 256,
  paint(ctx, size) {
    const random = seededRandom(19);
    const image = ctx.createImageData(size, size);
    for (let index = 0; index < image.data.length; index += 4) {
      const value = random() < 0.5 ? 0 : 255;
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = Math.floor(random() * 110);
    }
    ctx.putImageData(image, 0, 0);
  },
};

export const worldPainters: Record<string, Painter> = {
  'ground.sand': sand,
  'rock.a': rock(11, [140, 135, 120]),
  'rock.b': rock(23, [118, 124, 130]),
  'rock.c': rock(37, [150, 136, 116]),
  'rock.slab': slab,
  pebble,
  'shadow.soft': softShadow,
  'fx.vignette': vignette,
  'fx.grain': grain,
};
