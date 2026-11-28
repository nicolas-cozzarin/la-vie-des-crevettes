import { seededRandom } from '../../core/random';
import {
  blob,
  glow,
  hex,
  mix,
  patches,
  rgba,
  sampleCurve,
  softFill,
  speckle,
  traceLeaf,
  tracePath,
  wrapped,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * Chapter 3, the channel: deep water between rock walls, at night, the tide
 * running from right to left. Looks are described in
 * docs/11-world-catalogue.md and docs/04-art-direction.md: slate `#2B3A55`,
 * rock `#454C59`, moonlight `#C9D6E8`. Light comes from the upper left.
 */

const TAU = Math.PI * 2;
const SLATE = hex('#2B3A55');
const STONE = hex('#454C59');
const MOON = hex('#C9D6E8');
const GRAVEL: Rgb = [92, 98, 110];
const GRAVEL_DARK: Rgb = [30, 36, 50];
const SHADE: Rgb = [14, 18, 28];
const WEED: Rgb = [58, 66, 42];
const WEED_DARK: Rgb = [30, 36, 24];

const WRACK = hex('#6E5C2C');
const WRACK_DARK: Rgb = [52, 42, 18];
const WRACK_PALE: Rgb = [156, 136, 76];
const FAN: Rgb = [150, 66, 44];
const FAN_DARK: Rgb = [88, 34, 22];
const FAN_PALE: Rgb = [210, 128, 88];

interface Branch {
  points: Point[];
  width: number;
}

/** The smallest convex outline around the points, in order round it. */
function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Point[]): Point[] => {
    const out: Point[] = [];
    for (const point of list) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2] as Point, out[out.length - 1] as Point, point) <= 0
      ) {
        out.pop();
      }
      out.push(point);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/**
 * A sea fan growing out from the rock wall: a flat net of thin rust-red
 * branches. Its foot is at the left middle, where it holds the rock. It sways
 * about that point.
 */
const seaFan: Painter = {
  width: 360,
  height: 300,
  paint(ctx, width, height) {
    const random = seededRandom(911);
    const foot = { x: 16, y: height / 2 };
    const branches: Branch[] = [];

    // Branches split as they go, spreading into a fan.
    const grow = (from: Point, angle: number, length: number, width: number, depth: number) => {
      const points: Point[] = [from];
      let x = from.x;
      let y = from.y;
      let heading = angle;
      const steps = 5;
      for (let step = 0; step < steps; step++) {
        heading += (random() - 0.5) * 0.25;
        x += (Math.cos(heading) * length) / steps;
        y += (Math.sin(heading) * length) / steps;
        points.push({ x, y });
      }
      branches.push({ points: sampleCurve(points, 16), width });
      if (depth === 0) return;
      const end = points[points.length - 1] as Point;
      const spread = 0.3 + random() * 0.15;
      grow(end, heading - spread, length * 0.78, width * 0.66, depth - 1);
      grow(end, heading + spread, length * 0.78, width * 0.66, depth - 1);
    };
    grow(foot, -0.42, 70, 9, 3);
    grow(foot, 0.04, 84, 10, 3);
    grow(foot, 0.46, 70, 9, 3);

    // The net: a mesh of fine strands over the whole fan, kept inside the
    // outline the branch tips make, thinning toward the rim.
    const points = branches.flatMap((branch) => branch.points);
    const hull = convexHull(points);
    ctx.save();
    ctx.beginPath();
    hull.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = rgba(FAN, 0.08);
    ctx.fill();
    ctx.clip();
    ctx.lineWidth = 0.9;
    // Strands running out from the foot, and strands crossing them in arcs.
    for (let index = 0; index < 70; index++) {
      const angle = -1.25 + (index / 69) * 2.5 + (random() - 0.5) * 0.02;
      ctx.strokeStyle = rgba(FAN, 0.22 + random() * 0.16);
      ctx.beginPath();
      ctx.moveTo(foot.x, foot.y);
      ctx.quadraticCurveTo(
        foot.x + Math.cos(angle + 0.06) * 160,
        foot.y + Math.sin(angle + 0.06) * 160,
        foot.x + Math.cos(angle) * 360,
        foot.y + Math.sin(angle) * 360,
      );
      ctx.stroke();
    }
    for (let radius = 50; radius < 360; radius += 7 + random() * 3) {
      ctx.strokeStyle = rgba(FAN, 0.18 + random() * 0.14);
      ctx.beginPath();
      ctx.arc(
        foot.x - 10 + (random() - 0.5) * 6,
        foot.y + (random() - 0.5) * 6,
        radius,
        -1.4 + random() * 0.1,
        1.4 - random() * 0.1,
      );
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // The branches, thicker toward the foot, each with a darker edge and a lit side.
    for (const branch of branches) {
      for (const [color, alpha, scale, dy] of [
        [FAN_DARK, 0.7, 1.35, 0.6],
        [FAN, 1, 1, 0],
        [FAN_PALE, 0.5, 0.45, -0.5],
      ] as const) {
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = Math.max(0.8, branch.width * scale * 0.5);
        ctx.beginPath();
        branch.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y + dy);
          else ctx.lineTo(point.x, point.y + dy);
        });
        ctx.stroke();
      }
    }
    // Small pale polyps along the outer twigs.
    for (const branch of branches.filter((b) => b.width < 3)) {
      for (const point of branch.points.filter((_, index) => index % 4 === 1)) {
        glow(ctx, point.x, point.y, 2.4, FAN_PALE, 0.45);
      }
    }
    // The holdfast on the rock.
    glow(ctx, foot.x, foot.y, 16, FAN_DARK, 0.8, 0.4);
    void width;
  },
};

/**
 * A slate rock seen from above: rounded, darker at the rim, the moon catching
 * its upper left, silt on its top and dark turf low on its far side.
 */
function slate(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  x: number,
  y: number,
  radius: number,
  base: Rgb,
  squash = 0.75,
  /** Its long side's turn; random when not given. */
  fixed?: number,
): void {
  const turn = fixed ?? random() * Math.PI;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const shape = blob(random, 0, 0, radius, fixed === undefined ? 0.16 : 0.06, 17).map((point) => ({
    x: x + point.x * cos - point.y * squash * sin,
    y: y + point.x * sin + point.y * squash * cos,
  }));
  const dark = mix(base, SHADE, 0.55);
  const fill = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.32,
    radius * 0.05,
    x,
    y,
    radius * 1.05,
  );
  fill.addColorStop(0, rgba(mix(base, MOON, 0.42), 1));
  fill.addColorStop(0.35, rgba(mix(base, MOON, 0.16), 1));
  fill.addColorStop(0.75, rgba(base, 1));
  fill.addColorStop(1, rgba(dark, 1));
  const box = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
  ctx.save();
  tracePath(ctx, shape);
  softFill(ctx, fill, SHADE, 10, 0.8);
  ctx.clip();
  patches(
    ctx,
    random,
    10,
    box,
    [radius * 0.2, radius * 0.55],
    [mix(base, MOON, 0.3), dark],
    [0.06, 0.16],
  );
  // Layers in the slate: faint parallel lines across the rock. Not on a pebble,
  // where they would read as the ribs of a shell.
  ctx.lineCap = 'round';
  const layer = random() * Math.PI;
  const layers = radius < 60 ? 0 : 4;
  for (let index = -layers; layers > 0 && index <= layers; index++) {
    const offset = index * radius * 0.2 + (random() - 0.5) * radius * 0.06;
    const ox = Math.cos(layer + Math.PI / 2) * offset;
    const oy = Math.sin(layer + Math.PI / 2) * offset;
    ctx.strokeStyle = rgba(dark, 0.18 + random() * 0.14);
    ctx.lineWidth = 1 + random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x + ox - Math.cos(layer) * radius, y + oy - Math.sin(layer) * radius);
    ctx.quadraticCurveTo(
      x + ox + (random() - 0.5) * radius * 0.2,
      y + oy + (random() - 0.5) * radius * 0.2,
      x + ox + Math.cos(layer) * radius,
      y + oy + Math.sin(layer) * radius,
    );
    ctx.stroke();
  }
  // Turf low on the side away from the moon, and specks of grit.
  glow(ctx, x + radius * 0.5, y + radius * 0.5, radius * 0.8, WEED_DARK, 0.4);
  speckle(ctx, random, Math.round(radius), box, [0.6, 1.8], dark, [0.15, 0.4]);
  speckle(ctx, random, Math.round(radius * 0.4), box, [0.6, 1.5], MOON, [0.08, 0.22]);
  ctx.restore();
}

/**
 * The bed: grey-blue sand and gravel. Ripple marks lie across the run of the
 * water, so they run up and down the picture, in short bowed runs: a lit
 * crest with a dark trough beside it. Gravel gathers in the troughs.
 */
const bed: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(1301);
    ctx.fillStyle = rgba(mix(SLATE, STONE, 0.4), 1);
    ctx.fillRect(0, 0, size, size);
    const pool = (x: number, y: number, radius: number, color: Rgb, alpha: number): void =>
      wrapped(size, x, y, radius, (px, py) => glow(ctx, px, py, radius, color, alpha));
    for (let index = 0; index < 60; index++) {
      const pick = random();
      const color = pick < 0.4 ? SLATE : pick < 0.75 ? STONE : GRAVEL_DARK;
      pool(random() * size, random() * size, 90 + random() * 200, color, 0.12 + random() * 0.16);
    }
    // Crests in short bowed runs, one under the next, each bulging downstream
    // (left). A run that crosses the tile's foot is drawn again at its head.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const troughs: Point[] = [];
    let column = random() * 30;
    while (column < size) {
      let t = random();
      const end = t + 1;
      const lean = (random() - 0.5) * 16;
      while (t < end - 0.06) {
        const run = Math.min(0.1 + random() * 0.22, end - t);
        const from = t;
        const bow = 5 + random() * 12;
        const x0 = column + (random() - 0.5) * 10;
        const at = (u: number): Point => ({
          x: x0 + lean * (from + u * run) - Math.sin(u * Math.PI) * bow,
          y: (from + u * run) * size,
        });
        for (const [shift, color, alpha, lineWidth] of [
          [8, GRAVEL_DARK, 0.12, 18],
          [5, GRAVEL_DARK, 0.15, 7],
          [-2, mix(STONE, MOON, 0.3), 0.1, 4],
        ] as const) {
          ctx.strokeStyle = rgba(color, alpha);
          ctx.lineWidth = lineWidth;
          for (const ox of [-size, 0, size]) {
            for (const oy of [-size, 0]) {
              ctx.beginPath();
              for (let step = 0; step <= 16; step++) {
                const point = at(step / 16);
                if (step === 0) ctx.moveTo(point.x + shift + ox, point.y + oy);
                else ctx.lineTo(point.x + shift + ox, point.y + oy);
              }
              ctx.stroke();
            }
          }
        }
        for (let index = 0; index < 4; index++) {
          const point = at(random());
          troughs.push({ x: point.x + 10 + (random() - 0.5) * 8, y: point.y % size });
        }
        t += run + 0.02 + random() * 0.06;
      }
      column += 50 + random() * 40;
    }
    // Gravel: small stones in the troughs, and grit everywhere.
    for (const at of troughs) {
      const r = 1.6 + random() * 4.2;
      const color = mix(GRAVEL, random() < 0.5 ? MOON : GRAVEL_DARK, random() * 0.4);
      wrapped(size, at.x, at.y, r + 2, (px, py) => {
        ctx.fillStyle = rgba(GRAVEL_DARK, 0.5);
        ctx.beginPath();
        ctx.ellipse(px + 1, py + 1.3, r, r * 0.75, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(color, 0.85);
        ctx.beginPath();
        ctx.ellipse(px, py, r, r * 0.75, 0, 0, TAU);
        ctx.fill();
      });
    }
    const all = { x: 0, y: 0, w: size, h: size };
    speckle(ctx, random, 2200, all, [0.5, 1.3], GRAVEL, [0.12, 0.35]);
    speckle(ctx, random, 1200, all, [0.5, 1.2], GRAVEL_DARK, [0.2, 0.45]);
  },
};

/**
 * The channel's rock wall, as an edge strip: the outside (top of the
 * picture) lost in shade, rock in layers stepping down toward the water,
 * each ledge's lip caught by the moon, and weed and fallen stones at the
 * foot. Repeats sideways.
 */
const wall: Painter = {
  width: 1024,
  height: 420,
  paint(ctx, width) {
    const random = seededRandom(1307);
    /** A line along the strip that meets itself at the ends: whole waves only. */
    const edge = (base: number, amp: number) => {
      const waves = [2, 3, 5, 9, 14].map((count) => ({
        count,
        phase: random() * TAU,
        amp: amp * (0.4 + random() * 0.6) * (3 / count),
      }));
      return (x: number): number =>
        base +
        waves.reduce((sum, w) => sum + w.amp * Math.sin((x / width) * TAU * w.count + w.phase), 0);
    };
    const foot = edge(304, 14);
    ctx.fillStyle = rgba(SHADE, 1);
    ctx.fillRect(0, 0, width, foot(0));

    // Silt and algae on the bed along the foot.
    for (let x = 0; x < width; x += 24) glow(ctx, x + 12, foot(x + 12) + 22, 64, WEED_DARK, 0.45);

    // Ledges from the outside in: each lies over the last and reaches nearer the water.
    const ledges = 5;
    for (let ledge = 0; ledge < ledges; ledge++) {
      const near = ledge / (ledges - 1);
      const lip = ledge === ledges - 1 ? foot : edge(foot(0) - (ledges - 1 - ledge) * 56, 16);
      const color = mix(mix(STONE, SHADE, 0.7 - near * 0.62), SLATE, 0.18);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      for (let x = width; x >= 0; x -= 6) ctx.lineTo(x, lip(x));
      ctx.closePath();
      ctx.fillStyle = rgba(color, 1);
      ctx.fill();
      ctx.clip();
      // The face of the ledge: blotches and the strata running along it.
      const band = { x: 0, y: lip(0) - 80, w: width, h: 90 };
      for (let index = 0; index < 26; index++) {
        const x = random() * width;
        const y = lip(x) - 10 - random() * 50;
        const r = 20 + random() * 50;
        const tone = random() < 0.5 ? mix(color, MOON, 0.18) : mix(color, SHADE, 0.4);
        const alpha = 0.1 + random() * 0.14;
        wrapped(width, x, y, r, (px, py) => glow(ctx, px, py, r, tone, alpha), true);
      }
      ctx.lineCap = 'round';
      for (let line = 0; line < 3; line++) {
        const down = 10 + line * 14 + random() * 6;
        ctx.strokeStyle = rgba(mix(color, SHADE, 0.5), 0.35);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const y = lip(x) - down;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Cracks down the face, from the lip.
      ctx.strokeStyle = rgba(SHADE, 0.55);
      ctx.lineWidth = 1.8;
      for (let index = 0; index < 12; index++) {
        const x = random() * width;
        const lean = (random() - 0.5) * 12;
        const reach = 16 + random() * 34;
        wrapped(
          width,
          x,
          0,
          20,
          (px) => {
            ctx.beginPath();
            ctx.moveTo(px, lip(px) + 2);
            ctx.lineTo(px + lean, lip(px) - reach);
            ctx.stroke();
          },
          true,
        );
      }
      speckle(ctx, random, 260, band, [0.6, 1.6], mix(color, SHADE, 0.5), [0.2, 0.5]);
      ctx.restore();
      // The lip: a dark shadow line below it, the moon along its edge.
      ctx.lineCap = 'round';
      for (const [dy, tone, alpha, lineWidth] of [
        [4, SHADE, 0.55, 6],
        [-2, MOON, 0.1 + near * 0.22, 2.5],
      ] as const) {
        ctx.strokeStyle = rgba(tone, alpha);
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          if (x === 0) ctx.moveTo(x, lip(x) + dy);
          else ctx.lineTo(x, lip(x) + dy);
        }
        ctx.stroke();
      }
      void band;
    }
    // Weed fringing the foot: short dark strands, combed to the left by the water.
    for (let index = 0; index < 300; index++) {
      const x = random() * width;
      const y = foot(x) - 2 + random() * 12;
      const length = 10 + random() * 28;
      const color = random() < 0.5 ? WEED : WEED_DARK;
      const alpha = 0.55 + random() * 0.35;
      const lineWidth = 1.5 + random() * 2;
      wrapped(
        width,
        x,
        y,
        length,
        (px, py) => {
          ctx.strokeStyle = rgba(color, alpha);
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(
            px - length * 0.5,
            py + length * 0.3,
            px - length,
            py + length * 0.25,
          );
          ctx.stroke();
        },
        true,
      );
    }
    // Stones fallen from the wall, out on the bed.
    for (let index = 0; index < 10; index++) {
      const x = random() * width;
      const r = 10 + random() * 20;
      const y = foot(x) + 18 + random() * 50;
      const seed = Math.floor(random() * 100000);
      wrapped(
        width,
        x,
        y,
        r * 1.4,
        (px, py) => slate(ctx, seededRandom(seed), px, py, r, STONE),
        true,
      );
    }
    // The outside lost in shade.
    const shade = ctx.createLinearGradient(0, 0, 0, 150);
    shade.addColorStop(0, rgba(SHADE, 0.9));
    shade.addColorStop(1, rgba(SHADE, 0));
    ctx.fillStyle = shade;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(0, 0, width, 150);
    ctx.globalCompositeOperation = 'source-over';
  },
};

/** A big slate boulder, 3 to 6 BL across in play, moonlit on its upper left. */
function boulder(seed: number, squash: number): Painter {
  return {
    width: 640,
    height: 640,
    paint(ctx, width, height) {
      const random = seededRandom(seed);
      // Its shadow on the bed, away from the light.
      glow(ctx, width / 2 + 34, height / 2 + 40, 300, SHADE, 0.55, 0.55);
      slate(ctx, random, width / 2, height / 2, 270, mix(STONE, SLATE, 0.3), squash);
    },
  };
}

/**
 * A crevice: a dark slot between two long slabs of rock, just wider than a
 * shrimp. Long side across the picture.
 */
const crevice: Painter = {
  width: 340,
  height: 150,
  paint(ctx, width, height) {
    const random = seededRandom(1319);
    const middle = height / 2;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(width / 2, middle, width * 0.47, 30, 0, 0, TAU);
    softFill(ctx, rgba(SHADE, 0.96), SHADE, 16, 0.9);
    ctx.restore();
    glow(ctx, width / 2, middle, width * 0.38, [4, 6, 10], 0.7);
    // The two lips, the upper one moonlit along its edge.
    slate(ctx, random, width / 2 - 6, middle - 44, 168, STONE, 0.24, 0.03);
    slate(ctx, random, width / 2 + 8, middle + 46, 160, mix(STONE, SHADE, 0.2), 0.22, -0.04);
    glow(ctx, width / 2, middle, width * 0.3, SHADE, 0.35);
  },
};

/**
 * Moonlight through moving water: a few long, soft, very faint bands of
 * pale blue-white, slid across the bed. Clear between the bands.
 */
const moon: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(1321);
    ctx.lineCap = 'round';
    for (let index = 0; index < 14; index++) {
      const x = random() * size;
      const y = random() * size;
      const length = 420 + random() * 480;
      const thick = 60 + random() * 90;
      const angle = -0.32 + (random() - 0.5) * 0.2;
      const alpha = 0.018 + random() * 0.02;
      const bend = (random() - 0.5) * 120;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      wrapped(size, x, y, length, (px, py) => {
        for (const scale of [1, 0.8, 0.6, 0.42, 0.26, 0.12]) {
          ctx.strokeStyle = rgba(MOON, alpha);
          ctx.lineWidth = thick * scale;
          ctx.beginPath();
          ctx.moveTo(px - (cos * length) / 2, py - (sin * length) / 2);
          ctx.quadraticCurveTo(
            px - sin * bend,
            py + cos * bend,
            px + (cos * length) / 2,
            py + (sin * length) / 2,
          );
          ctx.stroke();
        }
      });
    }
  },
};

/** The channel's murk: deep blue-black water at night, the eye reaching a little way. */
const murk: Painter = {
  width: 512,
  height: 288,
  paint(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const bl = width / 25;
    const water: Rgb = [12, 18, 34];
    const fill = ctx.createRadialGradient(cx, cy, bl * 1.5, cx, cy, bl * 11);
    fill.addColorStop(0, rgba(water, 0.1));
    fill.addColorStop(0.35, rgba(water, 0.28));
    fill.addColorStop(0.7, rgba(water, 0.6));
    fill.addColorStop(1, rgba(water, 0.86));
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  },
};

/**
 * Drifting seaweed (`food.seaweed`): a loose clump of olive-brown fronds
 * riding the current, seen from above. Stems branch out from the middle,
 * narrow toothless blades along them, and small round floats in clusters
 * near the stems, each catching the moon on its upper left.
 */
const seaweed: Painter = {
  width: 320,
  height: 320,
  paint(ctx, width, height) {
    const random = seededRandom(1323);
    const cx = width / 2;
    const cy = height / 2;
    glow(ctx, cx, cy, 120, WRACK_DARK, 0.35);
    const floats: Point[] = [];
    const stems = 8;
    for (let index = 0; index < stems; index++) {
      let angle = (index / stems) * TAU + (random() - 0.5) * 0.5;
      const length = 80 + random() * 50;
      const turn = (random() - 0.5) * 0.12;
      const stem: Point[] = [{ x: cx + (random() - 0.5) * 16, y: cy + (random() - 0.5) * 16 }];
      for (let step = 1; step <= 12; step++) {
        angle += turn + (random() - 0.5) * 0.08;
        const last = stem[stem.length - 1] as Point;
        stem.push({
          x: last.x + (Math.cos(angle) * length) / 12,
          y: last.y + (Math.sin(angle) * length) / 12,
        });
      }
      // Blades along the stem, on alternate sides, and floats between them.
      for (let step = 2; step < stem.length; step += 1) {
        const at = stem[step] as Point;
        const before = stem[step - 1] as Point;
        const heading = Math.atan2(at.y - before.y, at.x - before.x);
        const side = step % 2 === 0 ? 1 : -1;
        if (random() < 0.8) {
          const blade = heading + side * (0.5 + random() * 0.5);
          const bladeLength = 20 + random() * 16;
          ctx.save();
          ctx.translate(at.x, at.y);
          ctx.rotate(blade);
          traceLeaf(ctx, 0, 0, bladeLength, 3.5 + random() * 2.5, (random() - 0.5) * 4);
          const tone = mix(WRACK, random() < 0.5 ? WRACK_PALE : WRACK_DARK, random() * 0.35);
          ctx.fillStyle = rgba(tone, 0.95);
          ctx.fill();
          ctx.strokeStyle = rgba(WRACK_DARK, 0.5);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
        if (random() < 0.4) {
          const away = heading - side * (0.8 + random() * 0.6);
          const reach = 5 + random() * 5;
          floats.push({ x: at.x + Math.cos(away) * reach, y: at.y + Math.sin(away) * reach });
        }
      }
      ctx.strokeStyle = rgba(WRACK_DARK, 0.85);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      stem.forEach((point, step) => {
        if (step === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
    for (const at of floats) {
      const r = 3.6 + random() * 2.4;
      ctx.fillStyle = rgba(WRACK_DARK, 0.7);
      ctx.beginPath();
      ctx.arc(at.x + 0.8, at.y + 1, r + 0.8, 0, TAU);
      ctx.fill();
      const fill = ctx.createRadialGradient(at.x - r * 0.4, at.y - r * 0.4, r * 0.1, at.x, at.y, r);
      fill.addColorStop(0, rgba(mix(WRACK_PALE, MOON, 0.35), 1));
      fill.addColorStop(0.5, rgba(WRACK_PALE, 1));
      fill.addColorStop(1, rgba(WRACK, 1));
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, TAU);
      ctx.fill();
    }
  },
};

export const channelPainters: Record<string, Painter> = {
  'channel.murk': murk,
  'channel.seaFan': seaFan,
  'channel.bed': bed,
  'channel.wall': wall,
  'channel.boulder.a': boulder(1309, 0.78),
  'channel.boulder.b': boulder(1311, 0.62),
  'channel.crevice': crevice,
  'light.moon': moon,
  'food.seaweed': seaweed,
};
