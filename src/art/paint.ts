/** Small helpers for painting images by code on a 2D canvas. */
export type Rgb = readonly [number, number, number];
export type Painter = {
  width: number;
  height: number;
  paint(ctx: CanvasRenderingContext2D, width: number, height: number): void;
};

export function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

export function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
  ];
}

export interface Point {
  x: number;
  y: number;
}

/** A closed, rounded outline through the given points. */
export function tracePath(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  const count = points.length;
  const last = points[count - 1];
  const first = points[0];
  if (!first || !last) return;
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let index = 0; index < count; index++) {
    const point = points[index] as Point;
    const next = points[(index + 1) % count] as Point;
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  ctx.closePath();
}

/**
 * Half-width of a symmetric shape at each point along its length, read from a
 * few control points and smoothed between them.
 */
export function sampleProfile(
  profile: readonly (readonly [number, number])[],
  samples: number,
): [number, number][] {
  const result: [number, number][] = [];
  const first = profile[0];
  const last = profile[profile.length - 1];
  if (!first || !last) return result;
  const start = first[0];
  const end = last[0];
  let segment = 0;

  for (let index = 0; index <= samples; index++) {
    const u = start + ((end - start) * index) / samples;
    while (segment < profile.length - 2 && u > (profile[segment + 1] as [number, number])[0]) {
      segment++;
    }
    const a = profile[segment] as readonly [number, number];
    const b = profile[segment + 1] as readonly [number, number];
    const before = profile[segment - 1] ?? a;
    const after = profile[segment + 2] ?? b;
    const span = b[0] - a[0];
    const t = span === 0 ? 0 : (u - a[0]) / span;
    // Cubic Hermite with slopes taken from the neighbouring points.
    const slopeA = (b[1] - before[1]) / Math.max(1e-6, b[0] - before[0]);
    const slopeB = (after[1] - a[1]) / Math.max(1e-6, after[0] - a[0]);
    const t2 = t * t;
    const t3 = t2 * t;
    let w =
      (2 * t3 - 3 * t2 + 1) * a[1] +
      (t3 - 2 * t2 + t) * span * slopeA +
      (-2 * t3 + 3 * t2) * b[1] +
      (t3 - t2) * span * slopeB;
    // No bulging past the two control points on either side.
    w = Math.min(Math.max(w, Math.min(a[1], b[1])), Math.max(a[1], b[1]));
    result.push([u, w]);
  }
  return result;
}

/** Trace a shape that is symmetric about a horizontal axis at `centreY`. */
export function traceSymmetric(
  ctx: CanvasRenderingContext2D,
  outline: readonly (readonly [number, number])[],
  toX: (u: number) => number,
  centreY: number,
  scale: number,
): void {
  ctx.beginPath();
  outline.forEach(([u, w], index) => {
    const x = toX(u);
    const y = centreY - w * scale;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  for (let index = outline.length - 1; index >= 0; index--) {
    const [u, w] = outline[index] as readonly [number, number];
    ctx.lineTo(toX(u), centreY + w * scale);
  }
  ctx.closePath();
}

/** Scatter small dots, as grains, pores or pigment spots. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  count: number,
  area: { x: number; y: number; w: number; h: number },
  size: readonly [number, number],
  color: Rgb,
  alpha: readonly [number, number],
): void {
  for (let index = 0; index < count; index++) {
    const x = area.x + random() * area.w;
    const y = area.y + random() * area.h;
    const radius = size[0] + random() * (size[1] - size[0]);
    ctx.fillStyle = rgba(color, alpha[0] + random() * (alpha[1] - alpha[0]));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A colour written as `#RRGGBB`. */
export function hex(value: string): Rgb {
  const number = parseInt(value.replace('#', ''), 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

/**
 * Draw something at a point and again wherever it crosses the tile's edge, so
 * the tile repeats cleanly. `height` is given when the tile repeats sideways only.
 */
export function wrapped(
  size: number,
  x: number,
  y: number,
  reach: number,
  draw: (x: number, y: number) => void,
  sidewaysOnly = false,
): void {
  for (const offsetX of [-size, 0, size]) {
    for (const offsetY of sidewaysOnly ? [0] : [-size, 0, size]) {
      const px = x + offsetX;
      const py = y + offsetY;
      if (px < -reach || px > size + reach) continue;
      if (!sidewaysOnly && (py < -reach || py > size + reach)) continue;
      draw(px, py);
    }
  }
}

/** The points of an uneven round shape. Trace them with `tracePath`. */
export function blob(
  random: () => number,
  cx: number,
  cy: number,
  radius: number,
  wobble: number,
  count = 13,
  squash = 1,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const r = radius * (1 - wobble + random() * wobble * 2);
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * squash });
  }
  return points;
}

/** Fill the current path with a soft edge that stands in for the bleed of watercolour. */
export function softFill(
  ctx: CanvasRenderingContext2D,
  fill: string | CanvasGradient,
  edge: Rgb,
  blur = 6,
  edgeAlpha = 0.55,
): void {
  ctx.save();
  ctx.shadowColor = rgba(edge, edgeAlpha);
  ctx.shadowBlur = blur;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/** A round wash lit from the upper left: light, then the base colour, then dark. */
export function litWash(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  light: Rgb,
  base: Rgb,
  dark: Rgb,
  alpha = 1,
): CanvasGradient {
  const fill = ctx.createRadialGradient(
    cx - radius * 0.32,
    cy - radius * 0.38,
    radius * 0.08,
    cx,
    cy,
    radius * 1.08,
  );
  fill.addColorStop(0, rgba(light, alpha));
  fill.addColorStop(0.55, rgba(base, alpha));
  fill.addColorStop(1, rgba(dark, alpha));
  return fill;
}

/** One soft round patch of colour that fades to nothing at its rim. */
export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: Rgb,
  alpha: number,
  core = 0,
): void {
  const patch = ctx.createRadialGradient(x, y, radius * core, x, y, radius);
  patch.addColorStop(0, rgba(color, alpha));
  patch.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = patch;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Faint round patches, lighter and darker, as pigment pools on wet paper. */
export function patches(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  count: number,
  area: { x: number; y: number; w: number; h: number },
  radius: readonly [number, number],
  colors: readonly Rgb[],
  alpha: readonly [number, number],
): void {
  for (let index = 0; index < count; index++) {
    const x = area.x + random() * area.w;
    const y = area.y + random() * area.h;
    const r = radius[0] + random() * (radius[1] - radius[0]);
    const color = colors[Math.floor(random() * colors.length)] as Rgb;
    glow(ctx, x, y, r, color, alpha[0] + random() * (alpha[1] - alpha[0]));
  }
}

/** Points along a smooth curve that passes through every given point. */
export function sampleCurve(points: readonly Point[], samples: number): Point[] {
  const result: Point[] = [];
  const count = points.length;
  if (count === 0) return result;
  if (count === 1) return [points[0] as Point];
  for (let index = 0; index <= samples; index++) {
    const position = (index / samples) * (count - 1);
    const segment = Math.min(count - 2, Math.floor(position));
    const t = position - segment;
    const p1 = points[segment] as Point;
    const p2 = points[segment + 1] as Point;
    const p0 = points[segment - 1] ?? p1;
    const p3 = points[segment + 2] ?? p2;
    const t2 = t * t;
    const t3 = t2 * t;
    // Catmull-Rom.
    result.push({
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    });
  }
  return result;
}

/** Trace an open line through the points. The caller strokes it. */
export function traceLine(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

/**
 * Trace the outline of a ribbon that follows a line. `width` gives the full
 * width at each share of the way along, from 0 to 1. `shift` moves the whole
 * ribbon sideways, as a share of the width, to draw a lit or shaded strip.
 */
export function traceRibbon(
  ctx: CanvasRenderingContext2D,
  line: readonly Point[],
  width: (t: number) => number,
  shift = 0,
  share = 1,
): void {
  const left: Point[] = [];
  const right: Point[] = [];
  const last = line.length - 1;
  for (let index = 0; index <= last; index++) {
    const point = line[index] as Point;
    const before = line[Math.max(0, index - 1)] as Point;
    const after = line[Math.min(last, index + 1)] as Point;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const w = width(index / last);
    const centre = shift * w;
    const half = (w * share) / 2;
    left.push({ x: point.x + nx * (centre - half), y: point.y + ny * (centre - half) });
    right.push({ x: point.x + nx * (centre + half), y: point.y + ny * (centre + half) });
  }
  ctx.beginPath();
  left.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  for (let index = right.length - 1; index >= 0; index--) {
    const point = right[index] as Point;
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}

/**
 * Which side of a line faces the light, for a line that runs from `from` to
 * `to`: -1 or 1, to pass as the sign of `shift` in `traceRibbon`. Light comes
 * from the upper left.
 */
export function litSide(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // The normal used by traceRibbon is (-dy, dx). Light direction is (-0.6, -0.8).
  return -dy * -0.6 + dx * -0.8 >= 0 ? 1 : -1;
}

/**
 * A rounded band along a line, as a root or a branch seen from above: a soft
 * dark edge, the body, a lit strip toward the light and a shaded strip away
 * from it.
 */
export function band(
  ctx: CanvasRenderingContext2D,
  line: readonly Point[],
  width: (t: number) => number,
  base: Rgb,
  light: Rgb,
  dark: Rgb,
  alpha = 1,
): void {
  const first = line[0];
  const last = line[line.length - 1];
  if (!first || !last) return;
  const side = litSide(first, last);
  ctx.save();
  ctx.globalAlpha *= alpha;
  traceRibbon(ctx, line, width);
  softFill(ctx, rgba(base, 1), dark, 6, 0.6);
  traceRibbon(ctx, line, width, -side * 0.24, 0.42);
  ctx.fillStyle = rgba(dark, 0.4);
  ctx.fill();
  traceRibbon(ctx, line, width, side * 0.22, 0.34);
  ctx.fillStyle = rgba(light, 0.34);
  ctx.fill();
  traceRibbon(ctx, line, width);
  ctx.strokeStyle = rgba(dark, 0.5);
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** Trace a leaf: pointed at both ends, widest a little before the middle. The stalk end is at `x0`. */
export function traceLeaf(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  length: number,
  halfWidth: number,
  bend = 0,
): void {
  const steps = 28;
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    // A leaf outline: zero at both ends, fullest at about two fifths.
    const w = halfWidth * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85);
    const spine = y0 + bend * Math.sin(Math.PI * t);
    top.push({ x: x0 + t * length, y: spine - w });
    bottom.push({ x: x0 + t * length, y: spine + w });
  }
  ctx.beginPath();
  top.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  for (let index = bottom.length - 1; index >= 0; index--) {
    const point = bottom[index] as Point;
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}
