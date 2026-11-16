import { seededRandom } from '../../core/random';
import { glow, rgba, sampleCurve, type Painter, type Point, type Rgb } from '../paint';

/**
 * Chapter 3, the channel: deep water between rock walls, at night. Looks are
 * described in docs/11-world-catalogue.md. Only the sea fan is painted so far.
 */

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

export const channelPainters: Record<string, Painter> = {
  'channel.seaFan': seaFan,
};
