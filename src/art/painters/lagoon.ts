import { seededRandom } from '../../core/random';
import {
  blob,
  glow,
  hex,
  litWash,
  mix,
  patches,
  rgba,
  sampleCurve,
  softFill,
  speckle,
  tracePath,
  traceRibbon,
  wrapped,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * The lagoon: bright sand under clear water, seagrass, rounded rocks.
 * Looks are described in docs/11-world-catalogue.md, colours in docs/04-art-direction.md.
 */
const TAU = Math.PI * 2;

const SAND: Rgb = [227, 213, 173];
const SAND_LIGHT: Rgb = [246, 238, 210];
const SAND_DARK: Rgb = [188, 168, 124];
const SAND_WET: Rgb = [198, 178, 138];
const GRASS = hex('#2F7D5B');
const GRASS_DARK: Rgb = [24, 78, 62];
const GRASS_LIGHT: Rgb = [96, 164, 112];
const GRASS_TIP: Rgb = [170, 206, 150];
const FUZZ: Rgb = [186, 178, 116];
const ROCK: Rgb = [136, 132, 120];
const ROCK_WARM: Rgb = [150, 136, 116];
const ROCK_COOL: Rgb = [124, 126, 124];
const ROCK_SHADE: Rgb = [40, 44, 52];
const ALGAE: Rgb = [110, 139, 61];
const GLOW = hex('#7DF9FF');
const FOAM: Rgb = [250, 250, 242];
const SHELL: Rgb = [238, 230, 212];

interface Blade {
  line: Point[];
  width: number;
  /** 0 at the back of the clump, 1 at the front. */
  depth: number;
}

/** The middle of the patch a clump's blades leave the sand from, as shares of the image. */
const CLUMP_ROOT = { x: 0.34, y: 0.5 };

/** The share of the image's half-width that the clump covers. */
export const SEAGRASS_FILL = 0.8;

/**
 * The blades of one clump. They fan from a patch of sand at the left and all
 * bend toward the right, as the water pushes them.
 */
function bladesOf(seed: number, count: number, size: number): Blade[] {
  const random = seededRandom(seed);
  const rootX = size * CLUMP_ROOT.x;
  const rootY = size * CLUMP_ROOT.y;
  const blades: Blade[] = [];
  for (let index = 0; index < count; index++) {
    // Roots are spread over a round patch, thicker toward its middle.
    const around = random() * TAU;
    const out = Math.sqrt(random()) * size * 0.17;
    const x = rootX + Math.cos(around) * out * 0.9;
    const y = rootY + Math.sin(around) * out * 1.25;
    const side = (y - rootY) / (size * 0.21);
    const angle = side * 0.3 + (random() - 0.5) * 0.3;
    const length = size * (0.27 + random() * 0.2);
    const sway = (random() - 0.5) * 0.5;
    blades.push({
      line: sampleCurve(
        [
          { x, y },
          { x: x + Math.cos(angle) * length * 0.5, y: y + Math.sin(angle) * length * 0.5 },
          {
            x: x + Math.cos(angle) * length * 0.5 + Math.cos(angle * 0.3 + sway) * length * 0.5,
            y: y + Math.sin(angle) * length * 0.5 + Math.sin(angle * 0.3 + sway) * length * 0.5,
          },
        ],
        18,
      ),
      width: 8 + random() * 5,
      // Blades rooted further along the current lie over the others.
      depth: (x - rootX) / (size * 0.34) + 0.5 + (random() - 0.5) * 0.3,
    });
  }
  return blades.sort((a, b) => a.depth - b.depth);
}

/** A ribbon blade: even for most of its length, rounded off at the tip. */
function bladeWidth(width: number): (t: number) => number {
  return (t) => width * (t < 0.08 ? 0.5 + t / 0.16 : t > 0.82 ? Math.sqrt((1 - t) / 0.18) : 1);
}

/** A clump of seagrass. Cover: it must still read at 40%. */
function seagrass(seed: number, count: number): Painter {
  return {
    width: 600,
    height: 600,
    paint(ctx, size) {
      const random = seededRandom(seed + 1);
      const rootX = size * CLUMP_ROOT.x;
      const rootY = size * CLUMP_ROOT.y;
      // The mat of roots: darker sand where the clump stands.
      ctx.save();
      ctx.translate(rootX, rootY);
      ctx.scale(1, 1.3);
      glow(ctx, 0, 0, size * 0.25, mix(SAND_DARK, GRASS_DARK, 0.45), 0.6, 0.35);
      ctx.restore();

      for (const blade of bladesOf(seed, count, size)) {
        const first = blade.line[0] as Point;
        const last = blade.line[blade.line.length - 1] as Point;
        const shade = Math.max(0, Math.min(1, blade.depth));
        const tone = mix(GRASS_DARK, GRASS_LIGHT, 0.15 + shade * 0.65);
        const fill = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
        fill.addColorStop(0, rgba(mix(tone, GRASS_DARK, 0.5), 0.96));
        fill.addColorStop(0.55, rgba(mix(tone, GRASS, 0.5), 0.96));
        fill.addColorStop(1, rgba(mix(tone, GRASS_TIP, 0.7), 0.94));
        ctx.save();
        traceRibbon(ctx, blade.line, bladeWidth(blade.width));
        softFill(ctx, fill, GRASS_DARK, 4, 0.55);
        ctx.restore();
        ctx.strokeStyle = rgba(GRASS_DARK, 0.4);
        ctx.lineWidth = 1;
        ctx.stroke();
        // The midrib catches the light.
        ctx.strokeStyle = rgba(GRASS_TIP, 0.2 + shade * 0.22);
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        blade.line.slice(1, -2).forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
      // Grains of sand caught at the foot.
      speckle(
        ctx,
        random,
        60,
        { x: rootX - size * 0.2, y: rootY - size * 0.24, w: size * 0.36, h: size * 0.48 },
        [0.8, 2],
        SAND_LIGHT,
        [0.25, 0.6],
      );
    },
  };
}

/** Seeds and counts of the three clumps. The fuzz is laid on the first. */
const CLUMPS = { a: [311, 46], b: [313, 58], c: [317, 34] } as const;

/** Soft tan-green fuzz along some blades: what grows on the older ones. Laid over a clump. */
const seagrassFuzz: Painter = {
  width: 600,
  height: 600,
  paint(ctx, size) {
    const random = seededRandom(331);
    const blades = bladesOf(CLUMPS.a[0], CLUMPS.a[1], size);
    blades.forEach((blade, index) => {
      if (index % 3 !== 1) return;
      const from = 0.3 + random() * 0.15;
      for (let step = 0; step < 46; step++) {
        const t = from + random() * (0.97 - from);
        const point = blade.line[Math.round(t * (blade.line.length - 1))] as Point;
        const x = point.x + (random() - 0.5) * blade.width * 1.5;
        const y = point.y + (random() - 0.5) * blade.width * 1.5;
        glow(ctx, x, y, 4 + random() * 6, FUZZ, 0.3 + random() * 0.3);
      }
      for (let step = 0; step < 26; step++) {
        const t = from + random() * (0.97 - from);
        const point = blade.line[Math.round(t * (blade.line.length - 1))] as Point;
        ctx.fillStyle = rgba(mix(FUZZ, [240, 234, 190], random()), 0.6 + random() * 0.35);
        ctx.beginPath();
        ctx.arc(
          point.x + (random() - 0.5) * blade.width,
          point.y + (random() - 0.5) * blade.width,
          0.8 + random() * 1.5,
          0,
          TAU,
        );
        ctx.fill();
      }
    });
  },
};

/** One worn rock, lit from the upper left, with algae on the side away from the light. */
function boulder(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  x: number,
  y: number,
  radius: number,
  base: Rgb,
): void {
  const turn = random() * Math.PI;
  const squash = 0.68 + random() * 0.3;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const shape = blob(random, 0, 0, radius, 0.13, 13).map((point) => ({
    x: x + point.x * cos - point.y * squash * sin,
    y: y + point.x * sin + point.y * squash * cos,
  }));
  const light = mix(base, [255, 250, 235], 0.32);
  const dark = mix(base, ROCK_SHADE, 0.5);
  // A flat top: the light holds over most of the rock and falls off at the rim.
  const fill = ctx.createRadialGradient(
    x - radius * 0.25,
    y - radius * 0.28,
    radius * 0.1,
    x,
    y,
    radius * 1.08,
  );
  fill.addColorStop(0, rgba(light, 1));
  fill.addColorStop(0.45, rgba(mix(light, base, 0.7), 1));
  fill.addColorStop(0.8, rgba(base, 1));
  fill.addColorStop(1, rgba(dark, 1));
  const box = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
  ctx.save();
  tracePath(ctx, shape);
  softFill(ctx, fill, ROCK_SHADE, 9, 0.7);
  ctx.clip();
  patches(ctx, random, 9, box, [radius * 0.2, radius * 0.6], [light, dark], [0.08, 0.2]);
  glow(ctx, x + radius * 0.45, y + radius * 0.45, radius * 0.9, ALGAE, 0.34);
  speckle(ctx, random, Math.round(radius * 1.2), box, [0.5, 1.6], dark, [0.15, 0.4]);
  speckle(ctx, random, Math.round(radius * 0.5), box, [0.5, 1.4], light, [0.15, 0.4]);
  // A crack or two.
  ctx.strokeStyle = rgba(dark, 0.4);
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  for (let index = 0; index < 2; index++) {
    let px = x + (random() - 0.5) * radius;
    let py = y + (random() - 0.5) * radius;
    let angle = random() * TAU;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let step = 0; step < 5; step++) {
      angle += (random() - 0.5) * 0.9;
      px += Math.cos(angle) * radius * 0.16;
      py += Math.sin(angle) * radius * 0.16;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  tracePath(ctx, shape);
  ctx.strokeStyle = rgba(dark, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/**
 * A flat rock that stands clear of the sand along one side. The dark gap
 * beneath it runs along its lower right. Cover: the shrimp goes under.
 */
const overhang: Painter = {
  width: 560,
  height: 400,
  paint(ctx, width, height) {
    const random = seededRandom(347);
    const cx = width / 2 - 14;
    const cy = height / 2 - 14;
    const shape = blob(random, cx, cy, 150, 0.07, 22, 1).map((point) => ({
      x: cx + (point.x - cx) * 1.52,
      y: cy + (point.y - cy) * 0.98,
    }));
    // The gap beneath: the same outline, pushed down and right, and dark.
    ctx.save();
    ctx.translate(24, 26);
    tracePath(ctx, shape);
    softFill(ctx, rgba([30, 36, 46], 0.72), [20, 24, 30], 22, 0.6);
    ctx.restore();

    const light = mix(ROCK_WARM, [255, 250, 235], 0.4);
    const dark = mix(ROCK_WARM, ROCK_SHADE, 0.5);
    const fill = ctx.createLinearGradient(cx - 200, cy - 130, cx + 190, cy + 130);
    fill.addColorStop(0, rgba(light, 1));
    fill.addColorStop(0.55, rgba(ROCK_WARM, 1));
    fill.addColorStop(1, rgba(mix(ROCK_WARM, dark, 0.6), 1));
    ctx.save();
    tracePath(ctx, shape);
    softFill(ctx, fill, dark, 7, 0.6);
    ctx.clip();
    patches(
      ctx,
      random,
      22,
      { x: cx - 240, y: cy - 160, w: 480, h: 320 },
      [30, 90],
      [light, dark],
      [0.07, 0.17],
    );
    // Layers of the stone, as faint curved lines.
    ctx.lineCap = 'round';
    for (let index = 0; index < 9; index++) {
      const y = cy - 120 + index * 30 + random() * 12;
      ctx.strokeStyle = rgba(index % 2 ? dark : light, 0.16 + random() * 0.12);
      ctx.lineWidth = 1.2 + random() * 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 250, y + 10);
      ctx.bezierCurveTo(cx - 90, y - 16, cx + 70, y + 22, cx + 250, y - 6);
      ctx.stroke();
    }
    glow(ctx, cx + 150, cy + 90, 170, ALGAE, 0.26);
    speckle(
      ctx,
      random,
      420,
      { x: cx - 240, y: cy - 160, w: 480, h: 320 },
      [0.6, 1.8],
      dark,
      [0.12, 0.36],
    );
    // The lip above the gap is in shade.
    const lip = ctx.createLinearGradient(cx + 60, cy + 30, cx + 220, cy + 150);
    lip.addColorStop(0, rgba(dark, 0));
    lip.addColorStop(1, rgba(dark, 0.55));
    ctx.fillStyle = lip;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    tracePath(ctx, shape);
    ctx.strokeStyle = rgba(dark, 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  },
};

/**
 * The rocky edge of the lagoon: boulders packed with no way between. The mass
 * is at the top of the image and the open sand below. Repeats sideways.
 */
const reef: Painter = {
  width: 1024,
  height: 420,
  paint(ctx, width, height) {
    const random = seededRandom(353);
    const phaseA = random() * TAU;
    const phaseB = random() * TAU;
    const edge = (x: number): number =>
      226 +
      20 * Math.sin((x / width) * TAU * 3 + phaseA) +
      11 * Math.sin((x / width) * TAU * 7 + phaseB);

    for (let x = 0; x < width; x += 32) {
      glow(ctx, x + 16, edge(x + 16) + 14, 120, SAND_DARK, 0.22);
    }
    // Deep shade between the rocks.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    for (let x = width; x >= 0; x -= 8) ctx.lineTo(x, edge(x) - 16);
    ctx.closePath();
    ctx.fillStyle = rgba(mix(ROCK_SHADE, ROCK, 0.25), 1);
    ctx.fill();

    // Rocks from the back row to the front, so that the nearer ones lie over the others.
    const rocks: { x: number; y: number; r: number; base: Rgb; seed: number }[] = [];
    for (let row = 0; row < 4; row++) {
      const front = row === 3;
      for (let x = random() * 60; x < width;) {
        const r = front ? 34 + random() * 34 : 40 + random() * 56;
        rocks.push({
          x,
          y: front ? edge(x) - r * 0.55 + random() * 14 : 10 + row * 60 + random() * 34,
          r,
          base: mix(mix(ROCK, ROCK_WARM, random()), ROCK_COOL, random() * 0.6),
          seed: Math.floor(random() * 100000),
        });
        x += r * (1.1 + random() * 0.5);
      }
    }
    // A few small stones that rolled out onto the sand.
    for (let index = 0; index < 9; index++) {
      const x = random() * width;
      rocks.push({
        x,
        y: edge(x) + 14 + random() * 40,
        r: 9 + random() * 13,
        base: mix(ROCK, ROCK_WARM, random()),
        seed: Math.floor(random() * 100000),
      });
    }
    for (const rock of rocks) {
      wrapped(
        width,
        rock.x,
        rock.y,
        rock.r * 1.3,
        (px, py) => boulder(ctx, seededRandom(rock.seed), px, py, rock.r, rock.base),
        true,
      );
    }
    // The outside is lost in shade.
    const shade = ctx.createLinearGradient(0, 0, 0, 170);
    shade.addColorStop(0, rgba(ROCK_SHADE, 0.7));
    shade.addColorStop(1, rgba(ROCK_SHADE, 0));
    ctx.fillStyle = shade;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(0, 0, width, 170);
    ctx.globalCompositeOperation = 'source-over';
    void height;
  },
};

/**
 * The beach: dry sand at the top of the image, a line of dried weed, wet
 * sand, then the edge of the water with its foam. Repeats sideways.
 */
const shore: Painter = {
  width: 1024,
  height: 420,
  paint(ctx, width, height) {
    const random = seededRandom(359);
    const phaseA = random() * TAU;
    const phaseB = random() * TAU;
    const edge = (x: number): number =>
      246 +
      13 * Math.sin((x / width) * TAU * 2 + phaseA) +
      6 * Math.sin((x / width) * TAU * 5 + phaseB);

    // Thin water over pale sand, just below the foam.
    for (let x = 0; x < width; x += 28) {
      glow(ctx, x + 14, edge(x + 14) + 22, 120, SAND_LIGHT, 0.2);
    }

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    for (let x = width; x >= 0; x -= 8) ctx.lineTo(x, edge(x));
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, 262);
    fill.addColorStop(0, rgba([247, 240, 216], 1));
    fill.addColorStop(0.52, rgba([240, 230, 200], 1));
    fill.addColorStop(0.7, rgba(SAND_WET, 1));
    fill.addColorStop(1, rgba(mix(SAND_WET, SAND_DARK, 0.5), 1));
    softFill(ctx, fill, SAND_DARK, 8, 0.4);

    ctx.save();
    ctx.clip();
    for (let index = 0; index < 50; index++) {
      const x = random() * width;
      const y = random() * 150;
      const radius = 30 + random() * 80;
      const color = random() < 0.5 ? SAND_LIGHT : SAND_DARK;
      const strength = 0.08 + random() * 0.12;
      wrapped(width, x, y, radius, (px, py) => glow(ctx, px, py, radius, color, strength), true);
    }
    speckle(
      ctx,
      random,
      2600,
      { x: 0, y: 0, w: width, h: 250 },
      [0.5, 1.4],
      SAND_DARK,
      [0.12, 0.35],
    );
    // The line the last high water left: dried weed and small things, in a broken row.
    for (let x = 0; x < width; x += 5) {
      if (Math.sin(x * 0.021 + 1) + Math.sin(x * 0.057) < -0.9) continue;
      const y = 96 + 10 * Math.sin((x / width) * TAU * 3 + phaseB) + (random() - 0.5) * 12;
      ctx.fillStyle = rgba(random() < 0.7 ? [92, 84, 54] : [140, 128, 88], 0.35 + random() * 0.4);
      ctx.beginPath();
      ctx.ellipse(x, y, 1.5 + random() * 4, 0.8 + random() * 1.6, random() * Math.PI, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Foam where the water meets the sand: a pale broken band and bubbles.
    ctx.lineCap = 'round';
    for (const [shift, lineWidth, alpha] of [
      [2, 9, 0.35],
      [0, 3.5, 0.85],
    ] as const) {
      ctx.strokeStyle = rgba(FOAM, alpha);
      ctx.lineWidth = lineWidth;
      let drawing = false;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const gap = Math.sin(x * 0.045 + 2) + Math.sin(x * 0.013) > 1.25;
        if (gap) {
          drawing = false;
          continue;
        }
        if (drawing) ctx.lineTo(x, edge(x) + shift);
        else ctx.moveTo(x, edge(x) + shift);
        drawing = true;
      }
      ctx.stroke();
    }
    for (let index = 0; index < 150; index++) {
      const x = random() * width;
      ctx.fillStyle = rgba(FOAM, 0.4 + random() * 0.5);
      ctx.beginPath();
      ctx.arc(x, edge(x) + 4 + random() * 16, 0.8 + random() * 2, 0, TAU);
      ctx.fill();
    }
    void height;
  },
};

/**
 * Light on the bed in shallow water: a net of bright curved lines. For a
 * blend that only lightens. Repeats in both directions.
 */
const caustics: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(367);
    const cells = 6;
    const cell = size / cells;
    const seeds: Point[] = [];
    for (let cy = 0; cy < cells; cy++) {
      for (let cx = 0; cx < cells; cx++) {
        seeds.push({
          x: (cx + 0.15 + random() * 0.7) * cell,
          y: (cy + 0.15 + random() * 0.7) * cell,
        });
      }
    }
    const image = ctx.createImageData(size, size);
    const data = image.data;
    const wave = TAU / size;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Bend the net a little, with waves that also repeat.
        const px =
          x + 26 * Math.sin(y * wave * 3 + 1.3) + 12 * Math.sin(y * wave * 7 + x * wave * 2);
        const py =
          y + 26 * Math.sin(x * wave * 2 + 0.4) + 12 * Math.sin(x * wave * 5 + y * wave * 3);
        const gx = Math.floor(px / cell);
        const gy = Math.floor(py / cell);
        let nearest = Infinity;
        let second = Infinity;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ix = (((gx + ox) % cells) + cells) % cells;
            const iy = (((gy + oy) % cells) + cells) % cells;
            const seed = seeds[iy * cells + ix] as Point;
            const dx = seed.x + (gx + ox - ix) * cell - px;
            const dy = seed.y + (gy + oy - iy) * cell - py;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < nearest) {
              second = nearest;
              nearest = distance;
            } else if (distance < second) {
              second = distance;
            }
          }
        }
        // Bright where two cells meet, with a soft fall to either side.
        const border = second - nearest;
        const line = Math.max(0, 1 - border / 17);
        const halo = Math.max(0, 1 - border / 58);
        // The net is uneven: bright knots, and stretches where it almost fades.
        const uneven =
          0.5 +
          0.28 * Math.sin(x * wave * 2 + 0.7 + 1.9 * Math.sin(y * wave + 0.3)) +
          0.22 * Math.sin(y * wave * 3 + 2.1 + 1.6 * Math.sin(x * wave * 2 + 1.1));
        const strength = (line * line * 0.7 + halo * halo * 0.22) * (0.25 + uneven);
        const at = (y * size + x) * 4;
        data[at] = 255;
        data[at + 1] = 249;
        data[at + 2] = 224;
        data[at + 3] = Math.round(255 * Math.min(1, strength));
      }
    }
    ctx.putImageData(image, 0, 0);
  },
};

/** One point of living light in the water at night. */
const glowPoint: Painter = {
  width: 32,
  height: 32,
  paint(ctx, size) {
    const centre = size / 2;
    glow(ctx, centre, centre, 15, GLOW, 0.6);
    glow(ctx, centre, centre, 5, [240, 255, 255], 0.95, 0.3);
  },
};

/** Small things on the sand: a drifted blade of seagrass, a bit of shell. */
function litter(kind: 'blade' | 'shell'): Painter {
  return {
    width: 128,
    height: 128,
    paint(ctx, size) {
      const random = seededRandom(kind === 'blade' ? 373 : 379);
      const centre = size / 2;
      if (kind === 'blade') {
        const line = sampleCurve(
          [
            { x: 14, y: centre + 16 },
            { x: 54, y: centre - 8 },
            { x: 114, y: centre + 6 },
          ],
          16,
        );
        const fill = ctx.createLinearGradient(14, 0, 114, 0);
        fill.addColorStop(0, rgba([104, 110, 66], 0.9));
        fill.addColorStop(1, rgba([156, 150, 96], 0.85));
        ctx.save();
        traceRibbon(ctx, line, bladeWidth(10));
        softFill(ctx, fill, [70, 74, 44], 4, 0.5);
        ctx.restore();
        ctx.strokeStyle = rgba([70, 74, 44], 0.4);
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // A curved scrap of an empty shell, worn smooth.
        ctx.save();
        ctx.translate(centre, centre);
        ctx.rotate(0.5);
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 20, 0, Math.PI * 1.05, Math.PI * 1.95);
        ctx.ellipse(0, 6, 28, 11, 0, Math.PI * 1.95, Math.PI * 1.05, true);
        ctx.closePath();
        softFill(ctx, rgba(SHELL, 0.95), [150, 140, 120], 4, 0.6);
        ctx.strokeStyle = rgba([150, 140, 120], 0.6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        for (let index = 0; index < 5; index++) {
          const angle = Math.PI * (1.15 + index * 0.17);
          ctx.strokeStyle = rgba([170, 160, 138], 0.5);
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 16, Math.sin(angle) * 10 + 2);
          ctx.lineTo(Math.cos(angle) * 28, Math.sin(angle) * 19);
          ctx.stroke();
        }
        ctx.restore();
        void random;
      }
    },
  };
}

/**
 * The mouth of a burrow in the sand: a dark hole, the sand that was pushed
 * out of it, and a ring of small stones and bits of shell.
 */
const burrowMouth: Painter = {
  width: 140,
  height: 140,
  paint(ctx, size) {
    const random = seededRandom(383);
    const centre = size / 2;
    // Sand pushed out, paler than the bed, fanning to the right.
    ctx.save();
    ctx.translate(centre + 12, centre);
    ctx.scale(1.25, 1);
    glow(ctx, 0, 0, 52, SAND_LIGHT, 0.75, 0.35);
    ctx.restore();
    for (let index = 0; index < 9; index++) {
      const angle = (random() - 0.5) * 1.5;
      ctx.strokeStyle = rgba(SAND_DARK, 0.3);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centre + Math.cos(angle) * 26, centre + Math.sin(angle) * 22);
      ctx.lineTo(centre + Math.cos(angle) * 56, centre + Math.sin(angle) * 44);
      ctx.stroke();
    }
    // The ring of small things.
    for (let index = 0; index < 13; index++) {
      const angle = (index / 13) * TAU + random() * 0.3;
      const distance = 30 + random() * 9;
      const x = centre + Math.cos(angle) * distance;
      const y = centre + Math.sin(angle) * distance * 0.9;
      const r = 4 + random() * 4.5;
      const stone = random() < 0.5;
      ctx.save();
      tracePath(ctx, blob(random, x, y, r, 0.2, 8));
      softFill(
        ctx,
        rgba(stone ? mix(ROCK, ROCK_WARM, random()) : SHELL, 1),
        stone ? ROCK_SHADE : [150, 140, 120],
        3,
        0.6,
      );
      ctx.restore();
      ctx.fillStyle = rgba([255, 252, 240], 0.4);
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU);
      ctx.fill();
    }
    // The hole.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centre, centre, 21, 18, 0, 0, TAU);
    softFill(ctx, rgba([30, 26, 22], 0.95), [60, 50, 38], 9, 0.8);
    ctx.restore();
    glow(ctx, centre - 6, centre - 6, 16, [70, 60, 46], 0.5);
  },
};

/**
 * A sand mound: a low cone with a dark hole at the top and paler, finer sand
 * thrown out around it. Something lives below and is never seen.
 */
const sandVolcano: Painter = {
  width: 110,
  height: 110,
  paint(ctx, size) {
    const random = seededRandom(721);
    const c = size / 2;
    glow(ctx, c + 6, c + 8, 48, SAND_DARK, 0.3, 0.4);
    ctx.save();
    tracePath(ctx, blob(random, c, c, 40, 0.08, 14));
    softFill(
      ctx,
      litWash(ctx, c, c, 40, mix(SAND, SAND_LIGHT, 0.25), mix(SAND, SAND_DARK, 0.12), SAND_WET),
      SAND_DARK,
      12,
      0.25,
    );
    ctx.clip();
    speckle(
      ctx,
      random,
      140,
      { x: c - 40, y: c - 40, w: 80, h: 80 },
      [0.4, 1.1],
      SAND_DARK,
      [0.2, 0.45],
    );
    // Fine sand thrown out of the hole, paler, and a few runnels down the sides.
    glow(ctx, c, c, 20, SAND_LIGHT, 0.35);
    ctx.strokeStyle = rgba(SAND_DARK, 0.18);
    ctx.lineWidth = 1.4;
    for (let index = 0; index < 7; index++) {
      const angle = (index / 7) * TAU + random() * 0.5;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(angle) * 12, c + Math.sin(angle) * 12);
      ctx.lineTo(
        c + Math.cos(angle) * (28 + random() * 10),
        c + Math.sin(angle) * (28 + random() * 10),
      );
      ctx.stroke();
    }
    ctx.restore();
    const hole = ctx.createRadialGradient(c + 1, c + 1, 0, c + 1, c + 1, 7.5);
    hole.addColorStop(0, rgba(ROCK_SHADE, 0.9));
    hole.addColorStop(0.6, rgba(mix(ROCK_SHADE, SAND_DARK, 0.5), 0.7));
    hole.addColorStop(1, rgba(SAND_DARK, 0));
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(c + 1, c + 1, 7.5, 0, TAU);
    ctx.fill();
  },
};

export const lagoonPainters: Record<string, Painter> = {
  'lagoon.seagrass.a': seagrass(CLUMPS.a[0], CLUMPS.a[1]),
  'lagoon.seagrass.b': seagrass(CLUMPS.b[0], CLUMPS.b[1]),
  'lagoon.seagrass.c': seagrass(CLUMPS.c[0], CLUMPS.c[1]),
  'food.seagrassFuzz': seagrassFuzz,
  'rock.overhang': overhang,
  'lagoon.reef': reef,
  'lagoon.shore': shore,
  'lagoon.litter.a': litter('blade'),
  'lagoon.litter.b': litter('shell'),
  'burrow.mouth': burrowMouth,
  'light.caustics': caustics,
  'fx.glow': glowPoint,
  'thing.sandVolcano': sandVolcano,
};

void SAND;
