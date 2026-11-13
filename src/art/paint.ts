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
