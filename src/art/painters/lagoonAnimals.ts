import { seededRandom } from '../../core/random';
import {
  band,
  blob,
  glow,
  litWash,
  mix,
  patches,
  rgba,
  sampleCurve,
  sampleProfile,
  softFill,
  speckle,
  tracePath,
  traceRibbon,
  traceSymmetric,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * The animals of the lagoon, seen from above: the green turtle, the hunting
 * fish, the goby and the pistol shrimp. Each is described in
 * docs/11-world-catalogue.md. Anything with a front points right. Parts that
 * swing have their joint given below, so the game can pin them together.
 *
 * None of them has a face. The pistol shrimp keeps its living colours.
 */

const TAU = Math.PI * 2;

const TURTLE: Rgb = [94, 96, 72];
const TURTLE_DARK: Rgb = [42, 44, 33];
const TURTLE_LIGHT: Rgb = [150, 148, 112];
const TURTLE_STREAK: Rgb = [190, 168, 108];
const TURTLE_SEAM: Rgb = [34, 34, 26];
const SKIN: Rgb = [84, 86, 66];
const SKIN_DARK: Rgb = [40, 42, 32];
const SKIN_PALE: Rgb = [206, 194, 146];

const HUNTER: Rgb = [92, 100, 86];
const HUNTER_BACK: Rgb = [52, 60, 54];
const HUNTER_SIDE: Rgb = [158, 164, 144];
const HUNTER_LINE: Rgb = [30, 34, 32];
const FIN: Rgb = [170, 172, 150];

const GOBY: Rgb = [212, 198, 160];
const GOBY_PALE: Rgb = [232, 222, 192];
const GOBY_DASH: Rgb = [96, 82, 60];

const PISTOL: Rgb = [146, 128, 84];
const PISTOL_PALE: Rgb = [198, 182, 134];
const PISTOL_BAND: Rgb = [88, 76, 48];

/** A point along a sampled line, with the unit normal to its left. */
function along(
  line: readonly Point[],
  t: number,
): { x: number; y: number; nx: number; ny: number } {
  const last = line.length - 1;
  const index = Math.min(last, Math.max(0, Math.round(t * last)));
  const point = line[index] as Point;
  const before = line[Math.max(0, index - 1)] as Point;
  const after = line[Math.min(last, index + 1)] as Point;
  const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
  return {
    x: point.x,
    y: point.y,
    nx: -(after.y - before.y) / length,
    ny: (after.x - before.x) / length,
  };
}

/** A straight-edged shape, its corners nudged a little so no seam is ruled. */
function tracePolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  random?: () => number,
  wobble = 0,
): void {
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = point.x + (random ? (random() - 0.5) * wobble : 0);
    const y = point.y + (random ? (random() - 0.5) * wobble : 0);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

/**
 * Rows of small scales along a limb, laid from the tip toward the base so the
 * base scales lie over the tip ones. Each is a dark plate with a pale rim.
 */
function scaleRows(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  line: readonly Point[],
  width: (t: number) => number,
  steps: number,
  across: number,
  size: number,
  from = 0.04,
  to = 0.97,
): void {
  for (let step = steps - 1; step >= 0; step--) {
    const t = from + ((to - from) * step) / (steps - 1);
    const at = along(line, t);
    const w = width(t);
    const rows = Math.max(2, Math.round(across * Math.sqrt(w / width(0.3))));
    for (let row = 0; row < rows; row++) {
      const share = (row + 0.5) / rows - 0.5 + (random() - 0.5) * 0.08;
      const x = at.x + at.nx * share * w * 0.92;
      const y = at.y + at.ny * share * w * 0.92;
      const r = size * (0.55 + 0.45 * Math.sqrt(w / width(0.3))) * (0.85 + random() * 0.3);
      tracePath(ctx, blob(random, x, y, r, 0.18, 7, 0.85));
      ctx.fillStyle = rgba(mix(SKIN_DARK, SKIN, 0.3 + random() * 0.5), 0.9);
      ctx.fill();
      ctx.strokeStyle = rgba(SKIN_PALE, 0.32 + random() * 0.2);
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- the turtle

const SHELL_W = 860;
const SHELL_H = 720;
const SHELL_CX = 430;
const SHELL_CY = 360;
const SHELL_A = 392;
const SHELL_B = 300;
const MARGIN = 46;

/**
 * A point of the shell's rim at angle `angle` from the front (0 points right,
 * toward the head; positive angles run down the lower side). `inset` moves it
 * toward the centre: 0 is the outer rim, MARGIN the inner edge of the rim plates.
 */
function shellPoint(angle: number, inset = 0): Point {
  let x = Math.cos(angle) * SHELL_A;
  let y = Math.sin(angle) * SHELL_B;
  if (x < 0) {
    // Narrower and a little pointed toward the tail.
    const back = -x / SHELL_A;
    y *= 1 - 0.34 * Math.pow(back, 4) - 0.06 * back;
    x *= 1 + 0.03 * Math.pow(back, 3);
  } else {
    // Blunt at the front, where the neck comes out.
    const front = x / SHELL_A;
    x *= 1 - 0.05 * Math.pow(front, 4);
    y *= 1 - 0.04 * front;
  }
  const r = Math.hypot(x, y);
  const k = r === 0 ? 0 : Math.max(0, (r - inset) / r);
  return { x: SHELL_CX + x * k, y: SHELL_CY + y * k };
}

function shellRim(inset: number, count = 96): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < count; index++) points.push(shellPoint((index / count) * TAU, inset));
  return points;
}

function traceRim(ctx: CanvasRenderingContext2D, inset: number): void {
  const points = shellRim(inset, 160);
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

/**
 * One plate of the shell: its own tone, pale streaks fanning from the point
 * where it grew, and the seam around it.
 */
function paintPlate(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  plate: readonly Point[],
  areola: Point,
  reach: number,
): void {
  ctx.save();
  tracePolygon(ctx, plate);
  ctx.clip();
  const xs = plate.map((point) => point.x);
  const ys = plate.map((point) => point.y);
  const box = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
  ctx.fillStyle = rgba(mix(TURTLE, TURTLE_DARK, 0.1 + random() * 0.3), 0.55);
  ctx.fillRect(box.x, box.y, box.w, box.h);
  glow(ctx, areola.x, areola.y, reach * 0.5, TURTLE_DARK, 0.35);
  // The streaks: narrow wedges from the growth point, most pale, a few dark.
  const count = 13 + Math.floor(random() * 6);
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * TAU + (random() - 0.5) * 0.55;
    const spread = 0.04 + random() * 0.1;
    const length = reach * (0.55 + random() * 0.95);
    const start = reach * (0.06 + random() * 0.24);
    const bend = (random() - 0.5) * 0.3;
    ctx.beginPath();
    ctx.moveTo(areola.x + Math.cos(angle) * start, areola.y + Math.sin(angle) * start);
    ctx.lineTo(
      areola.x + Math.cos(angle - spread) * length,
      areola.y + Math.sin(angle - spread) * length,
    );
    ctx.quadraticCurveTo(
      areola.x + Math.cos(angle + bend) * length * 1.08,
      areola.y + Math.sin(angle + bend) * length * 1.08,
      areola.x + Math.cos(angle + spread) * length,
      areola.y + Math.sin(angle + spread) * length,
    );
    ctx.closePath();
    const dark = random() < 0.22;
    const tone = dark ? TURTLE_DARK : mix(TURTLE_STREAK, TURTLE_LIGHT, random() * 0.5);
    const fade = ctx.createRadialGradient(areola.x, areola.y, start, areola.x, areola.y, length);
    fade.addColorStop(0, rgba(tone, 0));
    fade.addColorStop(0.35, rgba(tone, dark ? 0.18 : 0.1 + random() * 0.16));
    fade.addColorStop(1, rgba(tone, dark ? 0.06 : 0.22 + random() * 0.18));
    ctx.fillStyle = fade;
    ctx.fill();
  }
  patches(ctx, random, 6, box, [10, 34], [TURTLE_DARK, TURTLE_LIGHT], [0.06, 0.16]);
  speckle(ctx, random, Math.round((box.w * box.h) / 260), box, [0.5, 1.6], TURTLE_DARK, [0.1, 0.3]);
  ctx.restore();
  // The seam: a dark groove with a faint lit lip on its upper left.
  tracePolygon(ctx, plate);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(TURTLE_SEAM, 0.62);
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.save();
  ctx.translate(-1.4, -1.6);
  tracePolygon(ctx, plate);
  ctx.strokeStyle = rgba(TURTLE_LIGHT, 0.16);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

/**
 * The green turtle's shell from above, head end to the right. Five plates
 * down the middle, four down each side, a rim of small ones. The head and
 * flippers are their own images, drawn under the shell's rim.
 */
const turtleShell: Painter = {
  width: SHELL_W,
  height: SHELL_H,
  paint(ctx) {
    const random = seededRandom(811);
    const cx = SHELL_CX;
    const cy = SHELL_CY;

    traceRim(ctx, 0);
    softFill(
      ctx,
      litWash(ctx, cx, cy, SHELL_A, TURTLE_LIGHT, TURTLE, TURTLE_DARK),
      TURTLE_DARK,
      9,
      0.7,
    );
    ctx.save();
    traceRim(ctx, 0);
    ctx.clip();

    // Rim plates: one over the neck, eleven down each side, two over the
    // tail, spaced evenly along the rim rather than by angle.
    const steps = 720;
    const lengths: number[] = [0];
    for (let index = 1; index <= steps; index++) {
      const a = shellPoint((Math.PI * (index - 1)) / steps);
      const b = shellPoint((Math.PI * index) / steps);
      lengths.push((lengths[index - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y));
    }
    const total = lengths[steps] as number;
    const angleAt = (share: number): number =>
      (Math.PI *
        Math.max(
          0,
          lengths.findIndex((length) => length >= share * total),
        )) /
      steps;
    const seams: number[] = [];
    for (let index = 0; index <= 11; index++) seams.push(angleAt(0.045 + (0.905 * index) / 11));
    const first = seams[0] as number;
    const lastAngle = seams[11] as number;
    const rims: [number, number][] = [[-first, first]];
    for (const side of [-1, 1]) {
      for (let index = 0; index < 11; index++) {
        rims.push([side * (seams[index] as number), side * (seams[index + 1] as number)]);
      }
      rims.push([side * lastAngle, side * Math.PI]);
    }
    for (const [a, b] of rims) {
      const plate: Point[] = [];
      for (let step = 0; step <= 6; step++) plate.push(shellPoint(a + ((b - a) * step) / 6, -6));
      for (let step = 6; step >= 0; step--)
        plate.push(shellPoint(a + ((b - a) * step) / 6, MARGIN));
      // Each rim plate grew from its outer rear corner.
      const rear = Math.abs(b) > Math.abs(a) ? b : a;
      const corner = shellPoint(rear * 0.97 + (a + b) * 0.015, 10);
      paintPlate(ctx, random, plate, corner, 70);
    }

    // The middle and side plates lie inside the rim.
    ctx.save();
    traceRim(ctx, MARGIN);
    ctx.clip();
    const seamX = [326, 200, 62, -78, -216, -352].map((x) => cx + x);
    const seamHalf = [36, 66, 72, 68, 52, 20];
    const midHalf = [92, 112, 118, 108, 80];
    const midX = seamX.slice(0, 5).map((x, index) => (x + (seamX[index + 1] as number)) / 2);
    const edge = (side: number): Point[] => {
      const points: Point[] = [];
      for (let index = 0; index < 5; index++) {
        points.push({ x: seamX[index] as number, y: cy + side * (seamHalf[index] as number) });
        points.push({ x: midX[index] as number, y: cy + side * (midHalf[index] as number) });
      }
      points.push({ x: seamX[5] as number, y: cy + side * (seamHalf[5] as number) });
      return points;
    };
    // Side plates: four on each side, split where the seams meet the middle
    // plates, each seam running out and a little back.
    for (const side of [-1, 1]) {
      const line = edge(side);
      const splits = [0, 3, 5, 7, 10];
      for (let index = 0; index < 4; index++) {
        const from = splits[index] as number;
        const to = splits[index + 1] as number;
        const inner = line.slice(from, to + 1);
        const out = (point: Point, back: number): Point => {
          const angle = Math.atan2(point.y - cy, point.x - cx) + side * back;
          return { x: point.x + Math.cos(angle) * 420, y: point.y + Math.sin(angle) * 420 };
        };
        const start = inner[0] as Point;
        const end = inner[inner.length - 1] as Point;
        const plate = [
          ...inner,
          out(end, index === 3 ? 0.5 : 0.2),
          out(start, index === 0 ? -0.6 : 0.2),
        ];
        const middle = inner[Math.floor(inner.length / 2)] as Point;
        const areola = { x: middle.x - 16, y: middle.y + side * 46 };
        paintPlate(ctx, random, plate, areola, 150);
      }
    }
    // Middle plates.
    const left = edge(-1);
    const right = edge(1);
    for (let index = 0; index < 5; index++) {
      const plate = [
        left[index * 2] as Point,
        left[index * 2 + 1] as Point,
        left[index * 2 + 2] as Point,
        right[index * 2 + 2] as Point,
        right[index * 2 + 1] as Point,
        right[index * 2] as Point,
      ];
      const areola = { x: (midX[index] as number) - 18, y: cy + (random() - 0.5) * 8 };
      paintPlate(ctx, random, plate, areola, 120);
    }
    ctx.restore();

    // The dome: lit from the upper left, falling away toward the rim.
    const dome = ctx.createRadialGradient(cx - 110, cy - 120, 10, cx - 40, cy - 30, 470);
    dome.addColorStop(0, rgba(TURTLE_LIGHT, 0.3));
    dome.addColorStop(0.42, rgba(TURTLE_LIGHT, 0));
    dome.addColorStop(0.78, rgba(TURTLE_DARK, 0.16));
    dome.addColorStop(1, rgba(TURTLE_DARK, 0.42));
    ctx.fillStyle = dome;
    ctx.fillRect(0, 0, SHELL_W, SHELL_H);
    ctx.restore();

    traceRim(ctx, 0);
    ctx.strokeStyle = rgba(TURTLE_DARK, 0.6);
    ctx.lineWidth = 2.2;
    ctx.stroke();
  },
};

/** The neck comes from the left edge of the head's image. */
const turtleHead: Painter = {
  width: 220,
  height: 180,
  paint(ctx, width, height) {
    const random = seededRandom(812);
    const mid = height / 2;
    const outline = sampleProfile(
      [
        [6, 38],
        [44, 42],
        [76, 50],
        [112, 57],
        [148, 54],
        [178, 44],
        [200, 30],
        [212, 4],
      ],
      48,
    );
    ctx.save();
    traceSymmetric(ctx, outline, (u) => u, mid, 1);
    softFill(ctx, litWash(ctx, 120, mid, 110, [128, 126, 96], SKIN, SKIN_DARK), SKIN_DARK, 6, 0.6);
    ctx.clip();
    // The neck: soft skin in loose folds.
    ctx.strokeStyle = rgba(SKIN_DARK, 0.35);
    ctx.lineWidth = 1.6;
    for (let index = 0; index < 5; index++) {
      const x = 14 + index * 12 + random() * 4;
      ctx.beginPath();
      ctx.moveTo(x, mid - 40);
      ctx.quadraticCurveTo(x + 7, mid, x, mid + 40);
      ctx.stroke();
    }
    speckle(ctx, random, 70, { x: 0, y: 0, w: 76, h: height }, [0.8, 2.2], SKIN_PALE, [0.08, 0.2]);
    // The head plates: large, dark, each with a pale edge. One long pair in
    // front, a five-sided plate behind them, and smaller ones around.
    const seams: Point[][] = [
      [
        { x: 204, y: mid },
        { x: 160, y: mid },
      ],
      [
        { x: 190, y: mid - 32 },
        { x: 160, y: mid - 20 },
        { x: 160, y: mid + 20 },
        { x: 190, y: mid + 32 },
      ],
      [
        { x: 160, y: mid - 20 },
        { x: 134, y: mid - 26 },
        { x: 118, y: mid },
        { x: 134, y: mid + 26 },
        { x: 160, y: mid + 20 },
      ],
      [
        { x: 182, y: mid - 40 },
        { x: 160, y: mid - 20 },
      ],
      [
        { x: 182, y: mid + 40 },
        { x: 160, y: mid + 20 },
      ],
      [
        { x: 134, y: mid - 26 },
        { x: 128, y: mid - 54 },
      ],
      [
        { x: 134, y: mid + 26 },
        { x: 128, y: mid + 54 },
      ],
      [
        { x: 118, y: mid },
        { x: 86, y: mid },
      ],
      [
        { x: 128, y: mid - 54 },
        { x: 104, y: mid - 30 },
        { x: 86, y: mid },
        { x: 104, y: mid + 30 },
        { x: 128, y: mid + 54 },
      ],
      [
        { x: 104, y: mid - 30 },
        { x: 82, y: mid - 46 },
      ],
      [
        { x: 104, y: mid + 30 },
        { x: 82, y: mid + 46 },
      ],
      [
        { x: 86, y: mid },
        { x: 70, y: mid - 22 },
        { x: 66, y: mid - 46 },
      ],
      [
        { x: 86, y: mid },
        { x: 70, y: mid + 22 },
        { x: 66, y: mid + 46 },
      ],
    ];
    patches(
      ctx,
      random,
      12,
      { x: 70, y: mid - 56, w: 140, h: 112 },
      [10, 22],
      [SKIN_DARK],
      [0.25, 0.45],
    );
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const seam of seams) {
      ctx.beginPath();
      seam.forEach((point, index) => {
        const x = point.x + (random() - 0.5) * 2;
        const y = point.y + (random() - 0.5) * 2;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = rgba(SKIN_PALE, 0.45);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = rgba(SKIN_DARK, 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // The beak is a little paler.
    glow(ctx, 206, mid, 22, SKIN_PALE, 0.25);
    ctx.restore();
    // Eyes at the sides of the head, seen from above as dark bulges.
    for (const side of [-1, 1]) {
      ctx.fillStyle = 'rgba(22,22,18,0.85)';
      ctx.beginPath();
      ctx.ellipse(150, mid + side * 53, 9, 5, side * -0.25, 0, TAU);
      ctx.fill();
    }
    traceSymmetric(ctx, outline, (u) => u, mid, 1);
    ctx.strokeStyle = rgba(SKIN_DARK, 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    void width;
  },
};

/** A flipper or a fin in scales, with a pale rim. The joint is at the line's start. */
function paintFlipper(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  line: readonly Point[],
  width: (t: number) => number,
  scales: { steps: number; across: number; size: number },
): void {
  ctx.save();
  traceRibbon(ctx, line, width);
  softFill(ctx, rgba(SKIN, 1), SKIN_DARK, 6, 0.6);
  ctx.clip();
  scaleRows(ctx, random, line, width, scales.steps, scales.across, scales.size);
  // Lit along the leading edge, shaded along the trailing one.
  traceRibbon(ctx, line, width, -0.32, 0.36);
  ctx.fillStyle = rgba(SKIN_PALE, 0.1);
  ctx.fill();
  traceRibbon(ctx, line, width, 0.36, 0.3);
  ctx.fillStyle = rgba(SKIN_DARK, 0.25);
  ctx.fill();
  // The pale rim.
  traceRibbon(ctx, line, width);
  ctx.strokeStyle = rgba(SKIN_PALE, 0.5);
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
  traceRibbon(ctx, line, width);
  ctx.strokeStyle = rgba(SKIN_DARK, 0.55);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A long front flipper, curving back toward its tip, which is to the right. */
const turtleFlipperFront: Painter = {
  width: 480,
  height: 210,
  paint(ctx) {
    const random = seededRandom(813);
    const line = sampleCurve(
      [
        { x: 22, y: 92 },
        { x: 150, y: 86 },
        { x: 300, y: 98 },
        { x: 410, y: 124 },
        { x: 464, y: 146 },
      ],
      80,
    );
    const width = (t: number): number =>
      t < 0.36
        ? 72 + 44 * Math.sin(((t / 0.36) * Math.PI) / 2)
        : 116 * Math.pow(Math.cos((((t - 0.36) / 0.64) * Math.PI) / 2), 0.7) + 2;
    paintFlipper(ctx, random, line, width, { steps: 20, across: 6, size: 12.5 });
    // One claw on the leading edge.
    const claw = along(line, 0.34);
    const w = width(0.34) / 2;
    ctx.fillStyle = rgba(SKIN_PALE, 0.85);
    ctx.beginPath();
    ctx.ellipse(claw.x + claw.nx * w, claw.y + claw.ny * w, 6, 3.2, 0.1, 0, TAU);
    ctx.fill();
  },
};

/** A short rounded rear flipper. */
const turtleFlipperRear: Painter = {
  width: 250,
  height: 170,
  paint(ctx) {
    const random = seededRandom(814);
    const line = sampleCurve(
      [
        { x: 18, y: 82 },
        { x: 100, y: 84 },
        { x: 170, y: 94 },
        { x: 232, y: 104 },
      ],
      48,
    );
    const width = (t: number): number =>
      t < 0.58
        ? 64 + 60 * Math.sin(((t / 0.58) * Math.PI) / 2)
        : 124 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.58) / 0.42, 2)));
    paintFlipper(ctx, random, line, width, { steps: 10, across: 5, size: 13.5 });
  },
};

/**
 * Where the turtle's parts are pinned, in the shell's image. The upper
 * flippers are given; the lower ones mirror them across the middle (y = 360).
 * Each part's own joint is in `TURTLE_PART_JOINTS`. The parts lie under the shell.
 */
export const TURTLE_JOINTS = {
  head: { x: 790, y: 360 },
  frontFlipper: { x: 612, y: 150 },
  rearFlipper: { x: 150, y: 210 },
};
export const TURTLE_PART_JOINTS = {
  head: { x: 30, y: 90 },
  frontFlipper: { x: 30, y: 92 },
  rearFlipper: { x: 24, y: 82 },
};

// ------------------------------------------------------------ the hunting fish

/** The hunting fish's body, from the root of the tail to the snout. */
const hunterBody: Painter = {
  width: 600,
  height: 170,
  paint(ctx, width, height) {
    const random = seededRandom(821);
    const mid = height / 2;
    const profile = sampleProfile(
      [
        [16, 12],
        [80, 21],
        [200, 41],
        [330, 50],
        [420, 47],
        [500, 36],
        [556, 21],
        [590, 6],
        [594, 0],
      ],
      90,
    );
    // Side fins, held out a little and swept back, under the body's edge.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(456, mid + side * 36);
      ctx.rotate(Math.PI - side * 0.62);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.quadraticCurveTo(34, -12, 64, side * 4);
      ctx.quadraticCurveTo(34, 12, 0, 9);
      ctx.closePath();
      const fin = ctx.createLinearGradient(0, 0, 62, 0);
      fin.addColorStop(0, rgba(HUNTER, 0.55));
      fin.addColorStop(1, rgba(FIN, 0.18));
      ctx.fillStyle = fin;
      ctx.fill();
      ctx.strokeStyle = rgba(HUNTER_BACK, 0.22);
      ctx.lineWidth = 1;
      for (let ray = 0; ray < 5; ray++) {
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(58, side * 4 + (ray - 2) * 3.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    traceSymmetric(ctx, profile, (u) => u, mid, 1);
    const fill = ctx.createLinearGradient(0, mid - 52, 0, mid + 52);
    fill.addColorStop(0, rgba(HUNTER_SIDE, 1));
    fill.addColorStop(0.3, rgba(HUNTER, 1));
    fill.addColorStop(0.5, rgba(HUNTER_BACK, 1));
    fill.addColorStop(0.72, rgba(HUNTER, 1));
    fill.addColorStop(1, rgba(mix(HUNTER_SIDE, HUNTER, 0.5), 1));
    softFill(ctx, fill, HUNTER_LINE, 5, 0.6);
    ctx.clip();
    // The dark back, narrowing toward both ends.
    traceSymmetric(ctx, profile, (u) => u, mid, 0.34);
    ctx.fillStyle = rgba(HUNTER_LINE, 0.3);
    ctx.fill();
    patches(
      ctx,
      random,
      16,
      { x: 20, y: mid - 50, w: 560, h: 100 },
      [14, 36],
      [HUNTER_BACK, HUNTER_SIDE],
      [0.06, 0.16],
    );
    // Faint rows of scales, each edge facing the tail.
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      for (let row = 0; row < 5; row++) {
        const share = 0.3 + row * 0.15;
        for (let x = 70 + row * 4; x < 480; x += 10) {
          const w = profile.find(([u]) => u >= x)?.[1] ?? 0;
          ctx.strokeStyle = rgba(row % 2 === 0 ? HUNTER_SIDE : HUNTER_LINE, 0.1);
          ctx.beginPath();
          ctx.arc(x, mid + side * w * share, 4.5, Math.PI / 2, (Math.PI * 3) / 2);
          ctx.stroke();
        }
      }
    }
    // The thin dark line along each side.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      profile.forEach(([u, w], index) => {
        if (u < 40 || u > 520) return;
        const y = mid + side * w * 0.66;
        if (index === 0 || u - 40 < 7) ctx.moveTo(u, y);
        else ctx.lineTo(u, y);
      });
      ctx.strokeStyle = rgba(HUNTER_LINE, 0.72);
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    // The gill covers' edges.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(498, mid + side * 37);
      ctx.quadraticCurveTo(484, mid + side * 22, 492, mid + side * 8);
      ctx.strokeStyle = rgba(HUNTER_LINE, 0.28);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    // The two back fins, folded, seen from above as a thin raised line.
    ctx.lineCap = 'round';
    for (const [from, to] of [
      [300, 432],
      [168, 286],
    ] as const) {
      ctx.strokeStyle = rgba(HUNTER_LINE, 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(from, mid);
      ctx.lineTo(to, mid);
      ctx.stroke();
      ctx.strokeStyle = rgba(HUNTER_SIDE, 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(from, mid - 2);
      ctx.lineTo(to, mid - 2);
      ctx.stroke();
    }
    speckle(
      ctx,
      random,
      260,
      { x: 20, y: mid - 50, w: 570, h: 100 },
      [0.5, 1.4],
      HUNTER_LINE,
      [0.08, 0.24],
    );
    // Light along the upper side.
    traceSymmetric(ctx, profile, (u) => u, mid - 18, 0.55);
    ctx.fillStyle = rgba(HUNTER_SIDE, 0.2);
    ctx.fill();
    ctx.restore();
    traceSymmetric(ctx, profile, (u) => u, mid, 1);
    ctx.strokeStyle = rgba(HUNTER_LINE, 0.5);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Eyes at the sides of the head.
    for (const side of [-1, 1]) {
      ctx.fillStyle = 'rgba(20,22,20,0.9)';
      ctx.beginPath();
      ctx.ellipse(546, mid + side * 15.5, 4.6, 3.6, 0, 0, TAU);
      ctx.fill();
    }
    void width;
  },
};

/** The forked tail. Its joint is at the right, where it meets the body. */
const hunterTail: Painter = {
  width: 170,
  height: 170,
  paint(ctx, width, height) {
    const mid = height / 2;
    const shape: Point[] = [
      { x: 164, y: mid - 9 },
      { x: 120, y: mid - 14 },
      { x: 60, y: mid - 40 },
      { x: 12, y: mid - 64 },
      { x: 34, y: mid - 34 },
      { x: 62, y: mid - 8 },
      { x: 66, y: mid },
      { x: 62, y: mid + 8 },
      { x: 34, y: mid + 34 },
      { x: 12, y: mid + 64 },
      { x: 60, y: mid + 40 },
      { x: 120, y: mid + 14 },
      { x: 164, y: mid + 9 },
    ];
    tracePath(ctx, shape);
    const fill = ctx.createLinearGradient(164, 0, 10, 0);
    fill.addColorStop(0, rgba(HUNTER_BACK, 0.95));
    fill.addColorStop(0.3, rgba(HUNTER, 0.7));
    fill.addColorStop(1, rgba(FIN, 0.3));
    softFill(ctx, fill, HUNTER_LINE, 4, 0.4);
    ctx.save();
    tracePath(ctx, shape);
    ctx.clip();
    ctx.strokeStyle = rgba(HUNTER_LINE, 0.22);
    ctx.lineWidth = 1.1;
    for (let ray = 0; ray <= 10; ray++) {
      const share = ray / 10 - 0.5;
      ctx.beginPath();
      ctx.moveTo(150, mid + share * 14);
      ctx.quadraticCurveTo(90, mid + share * 60, 14 + Math.abs(share) * 30, mid + share * 128);
      ctx.stroke();
    }
    ctx.restore();
    tracePath(ctx, shape);
    ctx.strokeStyle = rgba(HUNTER_LINE, 0.35);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    void width;
  },
};

/** Where the tail is pinned on the body's image, and the tail's own joint. */
export const HUNTER_TAIL_JOINT = { x: 22, y: 85 };
export const HUNTER_TAIL_OWN_JOINT = { x: 160, y: 85 };

// ------------------------------------------------- the goby and the pistol shrimp

/** The goby lying in the burrow's mouth, head out, eyes high on the head. */
const goby: Painter = {
  width: 130,
  height: 60,
  paint(ctx, width, height) {
    const random = seededRandom(831);
    const mid = height / 2;
    // Breast fins spread on the sand, and the rounded tail.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(90, mid + side * 10);
      ctx.rotate(side * 2.2);
      ctx.beginPath();
      ctx.ellipse(10, 0, 12, 6.5, 0, 0, TAU);
      ctx.fillStyle = rgba(GOBY_PALE, 0.42);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(12, mid, 10, 4.4, 0, 0, TAU);
    ctx.fillStyle = rgba(GOBY_PALE, 0.5);
    ctx.fill();
    const profile = sampleProfile(
      [
        [14, 3],
        [32, 6],
        [62, 9.5],
        [94, 13.5],
        [110, 14.5],
        [120, 12],
        [125.5, 7],
        [127.8, 0],
      ],
      40,
    );
    ctx.save();
    traceSymmetric(ctx, profile, (u) => u, mid, 1);
    softFill(
      ctx,
      litWash(ctx, 90, mid, 40, GOBY_PALE, GOBY, mix(GOBY, GOBY_DASH, 0.4)),
      GOBY_DASH,
      3,
      0.45,
    );
    ctx.clip();
    // Dark dashes down each side, and faint saddles across the back.
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let index = 0; index < 5; index++) {
        const x = 28 + index * 15 + (side > 0 ? 6 : 0) + random() * 4;
        const w = profile.find(([u]) => u >= x)?.[1] ?? 8;
        const y = mid + side * w * (0.5 + random() * 0.2);
        ctx.strokeStyle = rgba(GOBY_DASH, 0.45 + random() * 0.25);
        ctx.lineWidth = 2 + random() * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3 + random() * 6, y + (random() - 0.5) * 2);
        ctx.stroke();
      }
    }
    for (let index = 0; index < 4; index++) {
      glow(ctx, 38 + index * 17, mid, 6, GOBY_DASH, 0.22);
    }
    speckle(
      ctx,
      random,
      60,
      { x: 14, y: mid - 13, w: 114, h: 26 },
      [0.4, 1],
      GOBY_DASH,
      [0.15, 0.4],
    );
    ctx.restore();
    traceSymmetric(ctx, profile, (u) => u, mid, 1);
    ctx.strokeStyle = rgba(GOBY_DASH, 0.45);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // Eyes high on the head, close together, each in a pale bulge.
    for (const side of [-1, 1]) {
      ctx.fillStyle = rgba(GOBY_PALE, 0.9);
      ctx.beginPath();
      ctx.arc(112, mid + side * 4.6, 3.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(28,26,22,0.9)';
      ctx.beginPath();
      ctx.arc(112.4, mid + side * 4.8, 2.3, 0, TAU);
      ctx.fill();
    }
    void width;
  },
};

/**
 * The pistol shrimp: stout, olive-tan with darker bands. The small claw is in
 * this image, the big one is its own. The eyes lie under the shell's front,
 * seen as two dim spots.
 */
const pistolBody: Painter = {
  width: 100,
  height: 60,
  paint(ctx, width, height) {
    const random = seededRandom(841);
    const mid = height / 2;
    // Walking legs, thin, on both sides.
    ctx.strokeStyle = rgba(PISTOL_BAND, 0.4);
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let index = 0; index < 3; index++) {
        const x = 60 + index * 8;
        ctx.beginPath();
        ctx.moveTo(x, mid + side * 12);
        ctx.quadraticCurveTo(x - 1, mid + side * 17, x - 4, mid + side * 20);
        ctx.stroke();
      }
    }
    // The small claw, slender, on the upper side.
    band(
      ctx,
      sampleCurve(
        [
          { x: 80, y: mid - 9 },
          { x: 88, y: mid - 15 },
          { x: 97, y: mid - 17 },
        ],
        10,
      ),
      (t) => 5 - 2.4 * t,
      PISTOL,
      PISTOL_PALE,
      PISTOL_BAND,
    );
    // The tail fan.
    for (const angle of [-0.5, -0.18, 0.18, 0.5]) {
      ctx.save();
      ctx.translate(18, mid);
      ctx.rotate(Math.PI + angle);
      ctx.beginPath();
      ctx.ellipse(8, 0, 9, 3.6, 0, 0, TAU);
      ctx.fillStyle = rgba(mix(PISTOL, PISTOL_PALE, 0.4), 0.85);
      ctx.fill();
      ctx.strokeStyle = rgba(PISTOL_BAND, 0.4);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
    const profile = sampleProfile(
      [
        [14, 6],
        [24, 10],
        [40, 12],
        [54, 13.5],
        [70, 15],
        [84, 13.5],
        [92, 9],
        [95, 4],
      ],
      40,
    );
    ctx.save();
    traceSymmetric(ctx, profile, (u) => u, mid, 1);
    softFill(ctx, litWash(ctx, 60, mid, 34, PISTOL_PALE, PISTOL, PISTOL_BAND), PISTOL_BAND, 3, 0.5);
    ctx.clip();
    // Darker bands across the tail segments.
    for (let index = 0; index < 5; index++) {
      const x = 18 + index * 7.6;
      const shade = ctx.createLinearGradient(x, 0, x + 4, 0);
      shade.addColorStop(0, rgba(PISTOL_BAND, 0));
      shade.addColorStop(0.5, rgba(PISTOL_BAND, index % 2 === 0 ? 0.3 : 0.18));
      shade.addColorStop(1, rgba(PISTOL_BAND, 0));
      ctx.fillStyle = shade;
      ctx.fillRect(x, mid - 16, 4, 32);
    }
    // The line where the shell meets the tail.
    ctx.strokeStyle = rgba(PISTOL_BAND, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(56, mid - 15);
    ctx.quadraticCurveTo(52, mid, 56, mid + 15);
    ctx.stroke();
    // A band over the shell, and the two dim eyes under its front.
    ctx.fillStyle = rgba(PISTOL_BAND, 0.22);
    ctx.fillRect(66, mid - 16, 6, 32);
    for (const side of [-1, 1]) glow(ctx, 89, mid + side * 4.2, 2.8, [40, 30, 20], 0.35);
    speckle(
      ctx,
      random,
      40,
      { x: 14, y: mid - 15, w: 82, h: 30 },
      [0.3, 0.8],
      PISTOL_BAND,
      [0.2, 0.45],
    );
    ctx.restore();
    traceSymmetric(ctx, profile, (u) => u, mid, 1);
    ctx.strokeStyle = rgba(PISTOL_BAND, 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    void width;
  },
};

/** The big snapping claw, swollen, with a short finger. Its joint is at the left. */
const pistolClaw: Painter = {
  width: 70,
  height: 44,
  paint(ctx, width, height) {
    const random = seededRandom(842);
    const mid = height / 2;
    // The short arm to the body.
    band(
      ctx,
      [
        { x: 5, y: mid },
        { x: 19, y: mid - 1 },
      ],
      () => 7,
      PISTOL,
      PISTOL_PALE,
      PISTOL_BAND,
    );
    // The swollen palm.
    const palm = sampleProfile(
      [
        [16, 6],
        [22, 11],
        [34, 13.5],
        [48, 13],
        [58, 10],
        [64, 5],
        [66, 0],
      ],
      30,
    );
    ctx.save();
    traceSymmetric(ctx, palm, (u) => u, mid + 1, 1);
    softFill(ctx, litWash(ctx, 38, mid, 22, PISTOL_PALE, PISTOL, PISTOL_BAND), PISTOL_BAND, 3, 0.5);
    ctx.clip();
    ctx.fillStyle = rgba(PISTOL_BAND, 0.3);
    ctx.fillRect(22, mid - 16, 5, 34);
    glow(ctx, 58, mid, 9, PISTOL_PALE, 0.4);
    speckle(
      ctx,
      random,
      22,
      { x: 16, y: mid - 14, w: 48, h: 30 },
      [0.3, 0.8],
      PISTOL_BAND,
      [0.2, 0.45],
    );
    ctx.restore();
    traceSymmetric(ctx, palm, (u) => u, mid + 1, 1);
    ctx.strokeStyle = rgba(PISTOL_BAND, 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    // The hinged finger, folded over the tip.
    band(
      ctx,
      sampleCurve(
        [
          { x: 53, y: mid - 8 },
          { x: 61, y: mid - 7.5 },
          { x: 65.5, y: mid - 1.5 },
        ],
        12,
      ),
      (t) => 5 - 2.6 * t,
      mix(PISTOL, PISTOL_PALE, 0.3),
      PISTOL_PALE,
      PISTOL_BAND,
    );
    void width;
  },
};

/** Where the big claw is pinned on the body's image, and the claw's own joint. */
export const PISTOL_CLAW_JOINT = { x: 84, y: 40 };
export const PISTOL_CLAW_OWN_JOINT = { x: 6, y: 22 };

export const lagoonAnimalPainters: Record<string, Painter> = {
  'turtle.shell': turtleShell,
  'turtle.head': turtleHead,
  'turtle.flipper.front': turtleFlipperFront,
  'turtle.flipper.rear': turtleFlipperRear,
  'fish.hunter.body': hunterBody,
  'fish.hunter.tail': hunterTail,
  goby,
  'pistol.body': pistolBody,
  'pistol.claw': pistolClaw,
};
