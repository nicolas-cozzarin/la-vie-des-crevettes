import { seededRandom } from '../../core/random';
import {
  glow,
  hex,
  rgba,
  sampleCurve,
  softFill,
  tracePath,
  traceRibbon,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * Chapter 0, the Drift: the larva in open water, and what floats there with it.
 * Looks are described in docs/11-world-catalogue.md.
 *
 * A larva is glass: pale, see-through, with dark eye spots. The same living
 * colours as the grown shrimp, never pink.
 */
const TAU = Math.PI * 2;

const GLASS: Rgb = [233, 239, 241];
const GLASS_EDGE: Rgb = [168, 187, 199];
const LINE: Rgb = [108, 130, 146];
const EYE: Rgb = [30, 34, 42];
const GUT: Rgb = [70, 80, 84];
const YOLK: Rgb = [238, 234, 206];
const MOTE = hex('#9BE564');
const MOTE_LIGHT: Rgb = [228, 250, 192];
const MOTE_DARK: Rgb = [92, 164, 58];
const PALE_GREEN = hex('#BFE6D8');

/** Fill the current path as glass: pale inside, a soft bluer edge, a thin line. */
function glass(ctx: CanvasRenderingContext2D, alpha = 0.6): void {
  ctx.save();
  softFill(ctx, rgba(GLASS, alpha), GLASS_EDGE, 6, 0.7);
  ctx.restore();
  ctx.strokeStyle = rgba(LINE, 0.5);
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A fine limb with a fan of bristles at its end. */
function featherLimb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  bristles: number,
  bend = 0,
): void {
  const midX = x + Math.cos(angle + bend) * length * 0.55;
  const midY = y + Math.sin(angle + bend) * length * 0.55;
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(GLASS, 0.85);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();
  ctx.strokeStyle = rgba(GLASS, 0.6);
  ctx.lineWidth = 0.9;
  for (let index = 0; index < bristles; index++) {
    const spread = bristles === 1 ? 0 : (index / (bristles - 1) - 0.5) * 1.3;
    const from = 0.62 + 0.38 * (index / Math.max(1, bristles - 1));
    const bx = x + (endX - x) * from;
    const by = y + (endY - y) * from;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(
      bx + Math.cos(angle + spread) * length * 0.42,
      by + Math.sin(angle + spread) * length * 0.42,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function eyeSpot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.fillStyle = rgba(EYE, 0.92);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

/**
 * The first shape: a pale pear with three pairs of feathery limbs and one eye
 * spot. It faces right. The body is about half the image long.
 */
const larvaEarly: Painter = {
  width: 200,
  height: 120,
  paint(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    glow(ctx, cx, cy, 70, GLASS, 0.12);

    for (const side of [-1, 1]) {
      // Front pair, single. Middle pair, long and forked. Rear pair, short and forked.
      featherLimb(ctx, cx + 30, cy + side * 12, side * 0.62, 44, 3, side * -0.2);
      featherLimb(ctx, cx + 14, cy + side * 22, side * 1.2, 40, 4, side * -0.25);
      featherLimb(ctx, cx + 16, cy + side * 22, side * 1.62, 46, 4, side * 0.2);
      featherLimb(ctx, cx - 6, cy + side * 24, side * 1.95, 30, 3, side * 0.2);
      featherLimb(ctx, cx - 8, cy + side * 23, side * 2.35, 26, 3, side * 0.15);
      // Two short spines at the rear.
      ctx.strokeStyle = rgba(GLASS, 0.75);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy + side * 5);
      ctx.lineTo(cx - 62, cy + side * 9);
      ctx.stroke();
    }

    // The body: an egg, widest toward the front.
    const body: Point[] = [];
    for (let index = 0; index < 40; index++) {
      const t = (index / 40) * TAU;
      body.push({
        x: cx + 48 * Math.cos(t),
        y: cy + 27 * Math.sin(t) * (1 + 0.22 * Math.cos(t)),
      });
    }
    tracePath(ctx, body);
    glass(ctx, 0.72);
    // Yolk: the larva lives on it for its first hours.
    ctx.save();
    tracePath(ctx, body);
    ctx.clip();
    glow(ctx, cx - 6, cy, 30, YOLK, 0.75, 0.2);
    glow(ctx, cx + 22, cy - 8, 20, [255, 255, 255], 0.35);
    ctx.restore();
    eyeSpot(ctx, cx + 31, cy, 4.6);
  },
};

/**
 * The second shape: a see-through comma. A small head with two eye spots, a
 * long thin body that bends, a forked tail, feathery limbs under the front.
 */
const larvaMid: Painter = {
  width: 200,
  height: 120,
  paint(ctx, width, height) {
    const cy = height / 2 - 6;
    glow(ctx, width / 2, height / 2, 76, GLASS, 0.1);
    const spine = sampleCurve(
      [
        { x: 168, y: cy },
        { x: 138, y: cy - 1 },
        { x: 104, y: cy + 3 },
        { x: 70, y: cy + 14 },
        { x: 42, y: cy + 30 },
      ],
      40,
    );
    const widthAt = (t: number): number => {
      if (t < 0.06) return 6 + (t / 0.06) * 22;
      if (t < 0.3) return 28 - ((t - 0.06) / 0.24) * 4;
      if (t < 0.42) return 24 - ((t - 0.3) / 0.12) * 13;
      return 11 - ((t - 0.42) / 0.58) * 6;
    };

    // Swimming limbs under the front of the body.
    for (const side of [-1, 1]) {
      for (let index = 0; index < 4; index++) {
        const at = spine[5 + index * 3] as Point;
        featherLimb(
          ctx,
          at.x,
          at.y + side * 10,
          side * (1.25 + index * 0.24),
          34 - index * 3,
          4,
          side * 0.2,
        );
      }
      // Short feelers in front.
      featherLimb(ctx, 162, cy + side * 6, side * 0.45, 26, 2, side * -0.2);
    }

    traceRibbon(ctx, spine, widthAt);
    glass(ctx, 0.6);
    // The gut, seen through the body.
    ctx.strokeStyle = rgba(GUT, 0.45);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    spine.slice(8, 37).forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    // Rings along the tail.
    ctx.strokeStyle = rgba(LINE, 0.4);
    ctx.lineWidth = 1;
    for (let index = 19; index < 38; index += 4) {
      const point = spine[index] as Point;
      const next = spine[index + 1] as Point;
      const angle = Math.atan2(next.y - point.y, next.x - point.x) + Math.PI / 2;
      const half = widthAt(index / 40) / 2;
      ctx.beginPath();
      ctx.moveTo(point.x - Math.cos(angle) * half, point.y - Math.sin(angle) * half);
      ctx.lineTo(point.x + Math.cos(angle) * half, point.y + Math.sin(angle) * half);
      ctx.stroke();
    }
    // The forked tail.
    const end = spine[spine.length - 1] as Point;
    const before = spine[spine.length - 3] as Point;
    const away = Math.atan2(end.y - before.y, end.x - before.x);
    for (const side of [-1, 1]) featherLimb(ctx, end.x, end.y, away + side * 0.42, 20, 3);
    // A short spike in front, and the two eyes.
    ctx.strokeStyle = rgba(GLASS, 0.8);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(168, cy);
    ctx.lineTo(184, cy - 1);
    ctx.stroke();
    eyeSpot(ctx, 158, cy - 12, 4.2);
    eyeSpot(ctx, 158, cy + 12, 4.2);
  },
};

/**
 * The third shape: a shrimp in small. Glass-clear, with stalked eyes, short
 * antennae and a tiny tail fan.
 */
const larvaLate: Painter = {
  width: 200,
  height: 120,
  paint(ctx, width, height) {
    const cy = height / 2;
    glow(ctx, width / 2, cy, 80, GLASS, 0.1);
    const spine = sampleCurve(
      [
        { x: 160, y: cy },
        { x: 126, y: cy },
        { x: 92, y: cy + 1 },
        { x: 62, y: cy + 4 },
        { x: 44, y: cy + 8 },
      ],
      40,
    );
    const widthAt = (t: number): number => {
      if (t < 0.05) return 5 + (t / 0.05) * 19;
      if (t < 0.36) return 24 - ((t - 0.05) / 0.31) * 2;
      return 22 - ((t - 0.36) / 0.64) * 13;
    };

    for (const side of [-1, 1]) {
      // Walking legs, short.
      ctx.strokeStyle = rgba(GLASS, 0.8);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      for (let index = 0; index < 5; index++) {
        const at = spine[5 + index * 2] as Point;
        ctx.beginPath();
        ctx.moveTo(at.x, at.y + side * 9);
        ctx.quadraticCurveTo(at.x + 2, at.y + side * 19, at.x + 8 - index * 3, at.y + side * 24);
        ctx.stroke();
      }
      // Antennae: half the body long, swept out.
      ctx.strokeStyle = rgba(GLASS, 0.75);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(158, cy + side * 5);
      ctx.quadraticCurveTo(184, cy + side * 14, 176, cy + side * 44);
      ctx.stroke();
      // The outer blades of the tail fan.
      const end = spine[spine.length - 1] as Point;
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(Math.PI - 0.22 + side * 0.48);
      ctx.beginPath();
      ctx.ellipse(11, 0, 12, 4.6, 0, 0, TAU);
      glass(ctx, 0.5);
      ctx.restore();
    }
    // The middle of the fan.
    const end = spine[spine.length - 1] as Point;
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(Math.PI - 0.22);
    ctx.beginPath();
    ctx.ellipse(9, 0, 10, 3.6, 0, 0, TAU);
    glass(ctx, 0.55);
    ctx.restore();

    traceRibbon(ctx, spine, widthAt);
    glass(ctx, 0.55);
    // Gut line and the rings of the abdomen.
    ctx.strokeStyle = rgba(GUT, 0.5);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    spine.slice(6, 38).forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y - 1);
      else ctx.lineTo(point.x, point.y - 1);
    });
    ctx.stroke();
    ctx.strokeStyle = rgba(LINE, 0.4);
    ctx.lineWidth = 1;
    for (let index = 15; index < 39; index += 4) {
      const point = spine[index] as Point;
      const half = widthAt(index / 40) / 2;
      ctx.beginPath();
      ctx.moveTo(point.x + 1.5, point.y - half);
      ctx.quadraticCurveTo(point.x - 1.5, point.y, point.x + 1.5, point.y + half);
      ctx.stroke();
    }
    // The pointed front, and the eyes on short stalks.
    ctx.strokeStyle = rgba(GLASS, 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(160, cy);
    ctx.lineTo(178, cy);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.strokeStyle = rgba(GLASS, 0.85);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(154, cy + side * 8);
      ctx.lineTo(158, cy + side * 14);
      ctx.stroke();
      eyeSpot(ctx, 159, cy + side * 15, 3.8);
    }
  },
};

/** One glowing bead. */
function bead(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const fill = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius,
  );
  fill.addColorStop(0, rgba(MOTE_LIGHT, 0.95));
  fill.addColorStop(0.6, rgba(MOTE, 0.9));
  fill.addColorStop(1, rgba(MOTE_DARK, 0.85));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

/** Floating algae, in three shapes: a bead, a chain of beads, a small disc. */
function mote(kind: 'bead' | 'chain' | 'disc'): Painter {
  return {
    width: 64,
    height: 64,
    paint(ctx, size) {
      const centre = size / 2;
      glow(ctx, centre, centre, 30, MOTE, 0.34);
      if (kind === 'bead') {
        bead(ctx, centre, centre, 9);
      } else if (kind === 'chain') {
        for (let index = 0; index < 4; index++) {
          const t = index / 3 - 0.5;
          bead(ctx, centre + t * 34, centre + 7 * Math.sin(t * 2.4) - 2, 6.2 - Math.abs(t) * 2);
        }
      } else {
        ctx.fillStyle = rgba(MOTE, 0.55);
        ctx.beginPath();
        ctx.arc(centre, centre, 13, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(MOTE_LIGHT, 0.85);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // A second ring inside, and fine dots between the two: a glass box seen from above.
        ctx.strokeStyle = rgba(MOTE_LIGHT, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centre, centre, 8, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = rgba(MOTE_LIGHT, 0.7);
        for (let index = 0; index < 12; index++) {
          const angle = (index / 12) * TAU;
          ctx.beginPath();
          ctx.arc(centre + Math.cos(angle) * 10.5, centre + Math.sin(angle) * 10.5, 0.9, 0, TAU);
          ctx.fill();
        }
        bead(ctx, centre, centre, 3.4);
      }
    },
  };
}

/** A slanted bar of paler water: light coming down from the surface. For a blend that only lightens. */
const shaft: Painter = {
  width: 300,
  height: 900,
  paint(ctx, width, height) {
    ctx.save();
    // Lean the bar: its top is further right than its foot.
    ctx.transform(1, 0, -0.14, 1, 0.14 * height * 0.5, 0);
    const across = ctx.createLinearGradient(40, 0, width - 40, 0);
    across.addColorStop(0, rgba(PALE_GREEN, 0));
    across.addColorStop(0.4, rgba(PALE_GREEN, 0.3));
    across.addColorStop(0.55, rgba([236, 250, 240], 0.36));
    across.addColorStop(1, rgba(PALE_GREEN, 0));
    ctx.fillStyle = across;
    ctx.fillRect(40, 0, width - 80, height);
    ctx.restore();
    // Both ends fade.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const along = ctx.createLinearGradient(0, 0, 0, height);
    along.addColorStop(0, 'rgba(0,0,0,0)');
    along.addColorStop(0.18, 'rgba(0,0,0,1)');
    along.addColorStop(0.7, 'rgba(0,0,0,0.8)');
    along.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

/** The shadow of a root or a leaf far above: a long dark bar with no edge. */
const rootShadow: Painter = {
  width: 640,
  height: 200,
  paint(ctx, width, height) {
    const random = seededRandom(811);
    const mid = height / 2;
    for (let index = 0; index < 22; index++) {
      const t = index / 21;
      const x = 70 + t * (width - 140);
      const y = mid + 14 * Math.sin(t * 5 + 1) + (random() - 0.5) * 10;
      const radius = 52 + 22 * Math.sin(t * Math.PI) + random() * 10;
      glow(ctx, x, y, radius, [18, 14, 10], 0.16);
    }
  },
};

/**
 * A copepod, the glass hopper: a clear teardrop facing right, its two long
 * feelers held out sideways, one red-brown eye spot at the front.
 */
const copepod: Painter = {
  width: 96,
  height: 96,
  paint(ctx, width, height) {
    const mid = height / 2;
    // The feelers: long, slightly swept back, with fine hairs near the tips.
    for (const side of [-1, 1]) {
      const line = sampleCurve(
        [
          { x: 60, y: mid + side * 4 },
          { x: 58, y: mid + side * 22 },
          { x: 52, y: mid + side * 38 },
          { x: 44, y: mid + side * 45 },
        ],
        16,
      );
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(GLASS, 0.75);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      line.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.strokeStyle = rgba(GLASS, 0.45);
      ctx.lineWidth = 0.7;
      for (const share of [0.55, 0.7, 0.85, 1]) {
        const point = line[Math.round(share * (line.length - 1))] as Point;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x - 5, point.y + side * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    // The tail: a thin stalk ending in two short forks with bristles.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(GLASS, 0.7);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, mid);
    ctx.lineTo(24, mid);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(24, mid);
      ctx.lineTo(17, mid + side * 4);
      ctx.lineTo(9, mid + side * 6);
      ctx.stroke();
    }
    ctx.restore();
    // The body: a teardrop, round at the front.
    const body: Point[] = [];
    for (let index = 0; index < 24; index++) {
      const angle = (index / 24) * TAU;
      const x = Math.cos(angle);
      const r = x > 0 ? 1 : 1 - 0.45 * x * x;
      body.push({ x: 52 + x * 14, y: mid + Math.sin(angle) * 9.5 * r });
    }
    tracePath(ctx, body);
    glass(ctx, 0.5);
    // The gut, faint, and the eye spot.
    glow(ctx, 50, mid, 6, GUT, 0.35);
    ctx.fillStyle = rgba([150, 64, 42], 0.95);
    ctx.beginPath();
    ctx.arc(63, mid, 2.2, 0, TAU);
    ctx.fill();
    void width;
  },
};

/**
 * A small drifting jelly, seen from above: a glassy bell with a pale rim, a
 * faint cross of canals inside, and a fringe of fine threads around it.
 */
const bell: Painter = {
  width: 256,
  height: 256,
  paint(ctx, width, height) {
    const random = seededRandom(271);
    const cx = width / 2;
    const cy = height / 2;
    const radius = 92;
    // The fringe: fine threads hanging from the rim, seen from above.
    ctx.save();
    ctx.lineCap = 'round';
    for (let index = 0; index < 32; index++) {
      const angle = (index / 32) * TAU + (random() - 0.5) * 0.05;
      const length = 10 + random() * 22;
      const curl = (random() - 0.5) * 0.5;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.strokeStyle = rgba(GLASS, 0.25 + random() * 0.2);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle + curl) * length * 0.6,
        y + Math.sin(angle + curl) * length * 0.6,
        x + Math.cos(angle + curl * 2) * length,
        y + Math.sin(angle + curl * 2) * length,
      );
      ctx.stroke();
    }
    ctx.restore();
    // The bell: clear in the middle, brighter toward the rim.
    const rim = ctx.createRadialGradient(cx - 14, cy - 18, radius * 0.1, cx, cy, radius);
    rim.addColorStop(0, rgba(GLASS, 0.06));
    rim.addColorStop(0.7, rgba(GLASS, 0.14));
    rim.addColorStop(0.93, rgba(GLASS, 0.34));
    rim.addColorStop(1, rgba(GLASS_EDGE, 0.5));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fillStyle = rim;
    ctx.fill();
    // The ring canal just inside the rim, and the four canals of the cross.
    ctx.strokeStyle = rgba(GLASS, 0.4);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, 0, TAU);
    ctx.stroke();
    for (let index = 0; index < 4; index++) {
      const angle = (index / 4) * TAU + 0.3;
      ctx.strokeStyle = rgba(GLASS, 0.32);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 14, cy + Math.sin(angle) * 14);
      ctx.lineTo(cx + Math.cos(angle) * (radius - 6), cy + Math.sin(angle) * (radius - 6));
      ctx.stroke();
      // A pale swelling partway along each canal.
      glow(ctx, cx + Math.cos(angle) * 48, cy + Math.sin(angle) * 48, 12, PALE_GREEN, 0.22);
    }
    // The small mouth at the centre, a pale four-lobed knot.
    for (let index = 0; index < 4; index++) {
      const angle = (index / 4) * TAU + 0.3 + Math.PI / 4;
      glow(ctx, cx + Math.cos(angle) * 5, cy + Math.sin(angle) * 5, 9, GLASS, 0.35);
    }
    // Light catches the upper left of the rim.
    ctx.strokeStyle = rgba(GLASS, 0.5);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = rgba(LINE, 0.4);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
  },
};

export const driftPainters: Record<string, Painter> = {
  'larva.early': larvaEarly,
  'larva.mid': larvaMid,
  'larva.late': larvaLate,
  'food.microalgae.a': mote('bead'),
  'food.microalgae.b': mote('chain'),
  'food.microalgae.c': mote('disc'),
  'drift.shaft': shaft,
  'drift.rootShadow': rootShadow,
  'drift.copepod': copepod,
  'drift.bell': bell,
};
