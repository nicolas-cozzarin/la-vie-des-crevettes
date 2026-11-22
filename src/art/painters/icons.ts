import { seededRandom } from '../../core/random';
import { hex, rgba, sampleCurve, traceLine, type Painter, type Point, type Rgb } from '../paint';

/**
 * The journal's marks (doc 12, "Icons"): one hand for all of them, a dark
 * pencil-ink line of even weight, a little wobbly, with one flat wash of
 * watercolour that does not quite fill the line. No faces, hearts, stars,
 * trophies or medals: field-notebook marks.
 */
const TAU = Math.PI * 2;
const INK = hex('#2A2A2A');

/** Stamp washes by group (doc 14, "Stamp washes"). */
const WASH = {
  life: hex('#8FA58A'),
  company: hex('#D9A441'),
  taste: hex('#7BA65A'),
  escape: hex('#8C84A8'),
  curiosity: hex('#6F95B8'),
} as const;

/** Each mark draws on a square from -1 to 1, scaled to its size. */
type Mark = (pen: Pen) => void;

/** A pencil-ink pen on a square from -1 to 1. Every line wobbles a little, the same way each time. */
class Pen {
  private readonly random: () => number;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    private readonly half: number,
    seed: number,
    /** The line's weight, in the mark's own units. */
    private readonly weight: number,
  ) {
    this.random = seededRandom(seed);
  }

  private at(point: Point): Point {
    return { x: this.half + point.x * this.half, y: this.half + point.y * this.half };
  }

  private wobble(points: readonly Point[], amount = 0.012): Point[] {
    return points.map((point) => ({
      x: point.x + (this.random() - 0.5) * amount * 2,
      y: point.y + (this.random() - 0.5) * amount * 2,
    }));
  }

  /** An open line through the points, smoothed. */
  line(points: readonly Point[], weight = 1, closed = false): void {
    const ring = closed && points[0] ? [...points, points[0]] : points;
    const smooth = sampleCurve(this.wobble(ring), Math.max(8, ring.length * 8));
    const ctx = this.ctx;
    ctx.strokeStyle = rgba(INK, 0.92);
    ctx.lineWidth = this.weight * weight * this.half;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traceLine(
      ctx,
      smooth.map((point) => this.at(point)),
    );
    ctx.stroke();
  }

  /** A circle or an arc, in ink. */
  arc(x: number, y: number, r: number, from = 0, to = TAU, weight = 1): void {
    const steps = Math.max(10, Math.round(((to - from) / TAU) * 36));
    const points: Point[] = [];
    for (let index = 0; index <= steps; index++) {
      const angle = from + ((to - from) * index) / steps;
      points.push({ x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r });
    }
    this.line(points, weight);
  }

  /** A small filled dot of ink. */
  dot(x: number, y: number, r: number): void {
    const p = this.at({ x, y });
    this.ctx.fillStyle = rgba(INK, 0.9);
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, r * this.half, 0, TAU);
    this.ctx.fill();
  }

  /** A flat wash under the lines, a little off its mark, as a hand lays it. */
  wash(points: readonly Point[], color: Rgb, alpha = 0.55): void {
    const shift = { x: 0.025 + this.random() * 0.02, y: 0.02 + this.random() * 0.02 };
    const ctx = this.ctx;
    ctx.fillStyle = rgba(color, alpha);
    ctx.beginPath();
    const smooth = sampleCurve([...points, points[0] as Point], points.length * 6);
    smooth.forEach((point, index) => {
      const p = this.at({ x: point.x + shift.x, y: point.y + shift.y });
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
  }

  /** A round wash. */
  washDisc(x: number, y: number, r: number, color: Rgb, alpha = 0.55): void {
    const points: Point[] = [];
    for (let index = 0; index < 18; index++) {
      const angle = (index / 18) * TAU;
      const wobble = 1 + (this.random() - 0.5) * 0.08;
      points.push({ x: x + Math.cos(angle) * r * wobble, y: y + Math.sin(angle) * r * wobble });
    }
    this.wash(points, color, alpha);
  }

  /**
   * A shrimp seen from above, `length` long, heading along `angle`: a slim
   * body, a tail fan and two long antennae. Straight, never curled (rule 8).
   */
  shrimp(x: number, y: number, length: number, angle: number, wash?: Rgb, antennae = true): void {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const p = (along: number, side: number): Point => ({
      x: x + (c * along - s * side) * length,
      y: y + (s * along + c * side) * length,
    });
    const body = [
      p(0.5, 0),
      p(0.34, 0.1),
      p(0.05, 0.12),
      p(-0.25, 0.08),
      p(-0.4, 0.04),
      p(-0.4, -0.04),
      p(-0.25, -0.08),
      p(0.05, -0.12),
      p(0.34, -0.1),
    ];
    if (wash) this.wash(body, wash, 0.5);
    this.line(body, 1, true);
    // The tail fan.
    this.line([p(-0.4, 0), p(-0.52, 0.12), p(-0.56, 0), p(-0.52, -0.12), p(-0.4, 0)]);
    if (!antennae) return;
    this.line([p(0.48, 0.03), p(0.75, 0.16), p(0.95, 0.24)], 0.7);
    this.line([p(0.48, -0.03), p(0.75, -0.16), p(0.95, -0.24)], 0.7);
  }

  /** A tail fan, spread, opening toward `angle`. */
  fan(x: number, y: number, size: number, angle: number, spread = 1): void {
    for (const side of [-1, -0.5, 0, 0.5, 1]) {
      const a = angle + side * 0.55 * spread;
      this.line(
        [
          { x, y },
          { x: x + Math.cos(a) * size, y: y + Math.sin(a) * size },
        ],
        0.9,
      );
    }
    this.arc(x, y, size, angle - 0.6 * spread, angle + 0.6 * spread, 0.9);
  }

  /** Two antennae from a point, curving the way of `angle`. */
  antennae(x: number, y: number, length: number, angle: number, spread = 0.35): void {
    for (const side of [-1, 1]) {
      const a = angle + side * spread;
      const bend = angle + side * spread * 0.4;
      this.line(
        [
          { x, y },
          { x: x + Math.cos(a) * length * 0.5, y: y + Math.sin(a) * length * 0.5 },
          { x: x + Math.cos(bend) * length, y: y + Math.sin(bend) * length },
        ],
        0.8,
      );
    }
  }

  /** A spiral from the centre outward. */
  spiral(x: number, y: number, r: number, turns = 2.2): void {
    const points: Point[] = [];
    const steps = Math.round(turns * 24);
    for (let index = 0; index <= steps; index++) {
      const share = index / steps;
      const angle = share * turns * TAU;
      points.push({ x: x + Math.cos(angle) * r * share, y: y + Math.sin(angle) * r * share });
    }
    this.line(points);
  }

  /** A long wave line across, at height `y`. */
  wave(y: number, from = -0.62, to = 0.62, height = 0.06): void {
    const points: Point[] = [];
    for (let index = 0; index <= 16; index++) {
      const share = index / 16;
      points.push({
        x: from + (to - from) * share,
        y: y + Math.sin(share * TAU * 1.5) * height,
      });
    }
    this.line(points);
  }
}

function painter(size: number, weight: number, seed: number, mark: Mark): Painter {
  return {
    width: size,
    height: size,
    paint(ctx) {
      mark(new Pen(ctx, size / 2, seed, weight));
    },
  };
}

/** A round stamp: a double ring like a rubber stamp, a wash, and its drawing inside. */
function stamp(seed: number, group: keyof typeof WASH, inside: Mark): Painter {
  return painter(192, 0.035, seed, (pen) => {
    pen.washDisc(0, 0, 0.8, WASH[group], 0.35);
    pen.arc(0, 0, 0.92, 0, TAU, 1);
    pen.arc(0, 0, 0.82, 0, TAU, 0.7);
    inside(pen);
  });
}

/** A small icon with a thicker line, so it reads at 48 px. */
function icon(size: number, seed: number, mark: Mark): Painter {
  return painter(size, 0.07, seed, mark);
}

const BLUE = WASH.curiosity;

/** Challenge types (doc 12): taste, reach, watch, escape, meet, find. */
const typeTaste = icon(64, 11, (pen) => {
  // A round patch with a bite out.
  const points: Point[] = [];
  for (let index = 0; index <= 30; index++) {
    const angle = 0.7 + (index / 30) * (TAU - 1.4);
    points.push({ x: Math.cos(angle) * 0.62, y: Math.sin(angle) * 0.62 });
  }
  points.push({ x: 0.4, y: 0.12 }, { x: 0.32, y: -0.1 });
  pen.wash(points, WASH.taste);
  pen.line(points, 1, true);
});

const typeReach = icon(64, 12, (pen) => {
  pen.wash(
    [
      { x: 0.42, y: -0.2 },
      { x: 0.62, y: 0 },
      { x: 0.42, y: 0.2 },
      { x: 0.24, y: 0 },
    ],
    BLUE,
  );
  pen.line([
    { x: -0.7, y: 0.3 },
    { x: -0.2, y: 0.1 },
    { x: 0.2, y: 0 },
  ]);
  pen.line([
    { x: 0.02, y: -0.16 },
    { x: 0.22, y: 0 },
    { x: 0.04, y: 0.18 },
  ]);
  pen.dot(0.52, 0, 0.11);
});

const typeWatch = icon(64, 13, (pen) => {
  pen.washDisc(-0.4, 0.2, 0.24, BLUE);
  pen.antennae(-0.5, 0.25, 1.2, -0.35, 0.22);
});

const typeEscape = icon(64, 14, (pen) => {
  pen.washDisc(0.1, 0, 0.36, WASH.escape);
  pen.fan(-0.2, 0, 0.62, 0, 0.9);
  pen.line([
    { x: -0.42, y: -0.3 },
    { x: -0.74, y: -0.3 },
  ]);
  pen.line([
    { x: -0.42, y: 0.3 },
    { x: -0.74, y: 0.3 },
  ]);
});

const typeMeet = icon(64, 15, (pen) => {
  pen.washDisc(0, 0.15, 0.3, WASH.company);
  pen.line([
    { x: -0.7, y: 0.5 },
    { x: -0.35, y: -0.05 },
    { x: 0, y: -0.3 },
  ]);
  pen.line([
    { x: 0.7, y: 0.5 },
    { x: 0.35, y: -0.05 },
    { x: 0, y: -0.3 },
  ]);
});

const typeFind = icon(64, 16, (pen) => {
  pen.washDisc(0, 0, 0.5, BLUE, 0.4);
  pen.spiral(0, 0, 0.66);
});

/** Journal tabs: a leaf, three small shrimp, an antenna tip with ripples, a spiral, a stamp ring. */
const tabDiscoveries = icon(64, 21, (pen) => {
  const leaf: Point[] = [
    { x: -0.62, y: 0.42 },
    { x: -0.3, y: -0.2 },
    { x: 0.25, y: -0.55 },
    { x: 0.62, y: -0.5 },
    { x: 0.4, y: 0.05 },
    { x: -0.1, y: 0.4 },
  ];
  pen.wash(leaf, WASH.taste);
  pen.line(leaf, 1, true);
  pen.line(
    [
      { x: -0.62, y: 0.42 },
      { x: 0, y: -0.05 },
      { x: 0.5, y: -0.4 },
    ],
    0.7,
  );
});

const tabCompanions = icon(64, 22, (pen) => {
  pen.shrimp(-0.05, -0.45, 0.7, 0, WASH.company, false);
  pen.shrimp(-0.05, 0.05, 0.7, 0, undefined, false);
  pen.shrimp(-0.05, 0.55, 0.7, 0, undefined, false);
});

const tabFeel = icon(64, 23, (pen) => {
  pen.line([
    { x: -0.7, y: 0.6 },
    { x: -0.3, y: 0.15 },
    { x: 0.05, y: -0.1 },
  ]);
  pen.washDisc(0.1, -0.15, 0.22, BLUE);
  pen.arc(0.1, -0.15, 0.3, -1.6, 1.0, 0.8);
  pen.arc(0.1, -0.15, 0.55, -1.5, 0.9, 0.7);
});

const tabChallenges = icon(64, 24, (pen) => {
  pen.washDisc(0, 0, 0.5, WASH.escape, 0.4);
  pen.spiral(0, 0, 0.66, 2.6);
});

const tabAchievements = icon(64, 25, (pen) => {
  pen.washDisc(0, 0, 0.55, WASH.company, 0.4);
  pen.arc(0, 0, 0.7);
  pen.arc(0, 0, 0.52, 0, TAU, 0.7);
});

/** Bond stages: two shrimp, further apart to closer. At Close they touch. */
function bond(seed: number, apart: number, wash: boolean): Painter {
  return painter(80, 0.06, seed, (pen) => {
    pen.shrimp(-apart, 0.1, 0.62, -0.35, wash ? WASH.company : undefined, false);
    pen.shrimp(apart, -0.1, 0.62, Math.PI + 0.35, wash ? WASH.company : undefined, false);
  });
}

/** The twenty-four stamps (doc 12, "Achievements"). */
const stamps: Record<string, Painter> = {
  // A tiny comma under one arch of root.
  landfall: stamp(101, 'life', (pen) => {
    pen.line([
      { x: -0.62, y: 0.5 },
      { x: -0.5, y: -0.1 },
      { x: -0.1, y: -0.45 },
      { x: 0.35, y: -0.3 },
      { x: 0.6, y: 0.5 },
    ]);
    pen.line([
      { x: 0.02, y: 0.32 },
      { x: 0.1, y: 0.22 },
      { x: 0.08, y: 0.4 },
      { x: -0.04, y: 0.5 },
    ]);
    pen.dot(0.07, 0.24, 0.05);
  }),
  // A small shrimp walking away from its own empty outline.
  newShell: stamp(102, 'life', (pen) => {
    pen.ctx.setLineDash([6, 7]);
    pen.shrimp(-0.22, 0.18, 0.62, 0.2, undefined, false);
    pen.ctx.setLineDash([]);
    pen.shrimp(0.18, -0.2, 0.6, -0.2, WASH.life);
  }),
  // Three outlines in a row, each larger.
  fullGrown: stamp(103, 'life', (pen) => {
    pen.shrimp(-0.5, 0.35, 0.3, -0.5, undefined, false);
    pen.shrimp(-0.08, 0.05, 0.42, -0.5, undefined, false);
    pen.shrimp(0.32, -0.3, 0.55, -0.5, WASH.life, false);
  }),
  // Two pairs of antennae crossing at the tips.
  antenna: stamp(104, 'company', (pen) => {
    pen.antennae(-0.62, 0.3, 0.95, -0.25, 0.28);
    pen.antennae(0.62, -0.3, 0.95, Math.PI - 0.25, 0.28);
  }),
  // Three tail fans side by side: one beside a short antenna, one pale, one small.
  familiar: stamp(105, 'company', (pen) => {
    pen.fan(-0.42, 0.25, 0.3, -Math.PI / 2);
    pen.line(
      [
        { x: -0.6, y: 0.3 },
        { x: -0.62, y: -0.05 },
      ],
      0.7,
    );
    pen.washDisc(0.02, 0.05, 0.16, [246, 241, 228], 0.9);
    pen.fan(0.02, 0.25, 0.3, -Math.PI / 2);
    pen.fan(0.42, 0.25, 0.2, -Math.PI / 2);
  }),
  // Four shrimp in a loose ring, heads inward.
  shoal: stamp(106, 'company', (pen) => {
    for (let index = 0; index < 4; index++) {
      const angle = (index / 4) * TAU + 0.4;
      pen.shrimp(
        Math.cos(angle) * 0.42,
        Math.sin(angle) * 0.42,
        0.42,
        angle + Math.PI,
        undefined,
        false,
      );
    }
  }),
  // Six small marks in a circle, one for each food.
  everyTaste: stamp(107, 'taste', (pen) => {
    for (let index = 0; index < 6; index++) {
      const angle = (index / 6) * TAU;
      const x = Math.cos(angle) * 0.45;
      const y = Math.sin(angle) * 0.45;
      pen.washDisc(x, y, 0.1, WASH.taste, 0.7);
      pen.arc(x, y, 0.1);
    }
  }),
  // A ribbon curling in to a dot.
  nose: stamp(108, 'curiosity', (pen) => {
    const points: Point[] = [];
    for (let index = 0; index <= 40; index++) {
      const share = index / 40;
      const angle = share * TAU * 1.3;
      const r = 0.6 * (1 - share) + 0.06;
      points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    pen.line(points);
    pen.dot(0.06, 0, 0.07);
  }),
  // A tail fan spread wide with three short lines behind it.
  quickTail: stamp(109, 'escape', (pen) => {
    pen.fan(0.1, 0, 0.45, Math.PI, 1.3);
    for (const y of [-0.25, 0, 0.25]) {
      pen.line([
        { x: 0.28, y },
        { x: 0.58, y },
      ]);
    }
  }),
  // A leaf with two antennae showing from under it.
  unseen: stamp(110, 'escape', (pen) => {
    pen.antennae(0.1, 0, 0.62, -0.6, 0.25);
    const leaf: Point[] = [
      { x: -0.6, y: 0.25 },
      { x: -0.2, y: -0.25 },
      { x: 0.35, y: -0.3 },
      { x: 0.55, y: 0.05 },
      { x: 0.2, y: 0.4 },
      { x: -0.3, y: 0.45 },
    ];
    pen.wash(leaf, WASH.taste, 0.7);
    pen.line(leaf, 1, true);
    pen.line(
      [
        { x: -0.6, y: 0.25 },
        { x: 0, y: 0.08 },
        { x: 0.5, y: 0.02 },
      ],
      0.6,
    );
  }),
  // A ring of ripples, and the shrimp outside it.
  neverCornered: stamp(111, 'escape', (pen) => {
    pen.arc(-0.15, 0.1, 0.22, 0, TAU, 0.8);
    pen.arc(-0.15, 0.1, 0.4, 0, TAU, 0.6);
    pen.shrimp(0.45, -0.45, 0.36, -0.7, WASH.escape, false);
  }),
  // A square of grid with one line bent open.
  underGrid: stamp(112, 'escape', (pen) => {
    for (const x of [-0.45, -0.15, 0.15, 0.45]) {
      if (x === 0.15) {
        pen.line([
          { x, y: -0.45 },
          { x: x + 0.12, y: -0.05 },
          { x: x + 0.2, y: 0.1 },
          { x, y: 0.45 },
        ]);
      } else {
        pen.line([
          { x, y: -0.45 },
          { x, y: 0.45 },
        ]);
      }
    }
    for (const y of [-0.45, -0.15, 0.15, 0.45]) {
      pen.line([
        { x: -0.45, y },
        { x: 0.45, y },
      ]);
    }
  }),
  // A thin moon over a patch of dots.
  nightGrazer: stamp(113, 'taste', (pen) => {
    pen.arc(0.05, -0.32, 0.22, 2.0, 5.2);
    pen.arc(0.13, -0.36, 0.17, 2.2, 4.9, 0.7);
    for (const [x, y] of [
      [-0.3, 0.3],
      [-0.1, 0.38],
      [0.1, 0.3],
      [0.3, 0.36],
      [0, 0.18],
      [-0.2, 0.15],
      [0.2, 0.16],
    ] as const) {
      pen.dot(x, y, 0.035);
    }
  }),
  // A burrow mouth with two heads in it.
  neighbour: stamp(114, 'curiosity', (pen) => {
    pen.arc(0, 0.12, 0.5, Math.PI + 0.2, TAU - 0.2);
    pen.line([
      { x: -0.48, y: -0.02 },
      { x: -0.55, y: 0.3 },
    ]);
    pen.line([
      { x: 0.48, y: -0.02 },
      { x: 0.55, y: 0.3 },
    ]);
    pen.arc(-0.18, 0.1, 0.12);
    pen.antennae(-0.18, 0.0, 0.3, -Math.PI / 2, 0.3);
    pen.arc(0.2, 0.12, 0.13);
    pen.dot(0.22, 0.1, 0.03);
  }),
  // A turtle shell from above.
  slowCompany: stamp(115, 'company', (pen) => {
    const shell: Point[] = [];
    for (let index = 0; index < 14; index++) {
      const angle = (index / 14) * TAU;
      shell.push({ x: Math.cos(angle) * 0.42, y: Math.sin(angle) * 0.55 });
    }
    pen.wash(shell, WASH.company, 0.6);
    pen.line(shell, 1, true);
    pen.line(
      [
        { x: 0, y: -0.5 },
        { x: 0, y: 0.5 },
      ],
      0.6,
    );
    for (const y of [-0.2, 0.15]) {
      pen.line(
        [
          { x: -0.38, y },
          { x: 0.38, y },
        ],
        0.6,
      );
    }
  }),
  // Three long wave lines and nothing else.
  openWater: stamp(116, 'life', (pen) => {
    for (const y of [-0.25, 0, 0.25]) pen.wave(y);
  }),
  // A cloud of dots rising.
  nextOnes: stamp(117, 'life', (pen) => {
    const random = seededRandom(9);
    for (let index = 0; index < 22; index++) {
      const y = 0.5 - random() * 1;
      const spread = 0.15 + (0.5 - y) * 0.3;
      pen.dot((random() - 0.5) * 2 * spread, y, 0.025 + random() * 0.02);
    }
  }),
  // Two wave lines.
  secondTide: stamp(118, 'life', (pen) => {
    for (const y of [-0.12, 0.12]) pen.wave(y);
  }),
  // Five wave lines.
  fifthTide: stamp(119, 'life', (pen) => {
    for (const y of [-0.4, -0.2, 0, 0.2, 0.4]) pen.wave(y, -0.55, 0.55, 0.045);
  }),
  // An open notebook.
  fullCarnet: stamp(120, 'curiosity', (pen) => {
    const left: Point[] = [
      { x: 0, y: -0.3 },
      { x: -0.3, y: -0.4 },
      { x: -0.6, y: -0.3 },
      { x: -0.6, y: 0.35 },
      { x: -0.3, y: 0.28 },
      { x: 0, y: 0.38 },
    ];
    const right = left.map((point) => ({ x: -point.x, y: point.y }));
    pen.wash(left, [246, 241, 228], 0.8);
    pen.line(left, 1, true);
    pen.line(right, 1, true);
    for (const y of [-0.15, 0, 0.15]) {
      pen.line(
        [
          { x: -0.48, y },
          { x: -0.12, y: y + 0.03 },
        ],
        0.5,
      );
    }
  }),
  // A full circle of small stamps.
  allOfIt: stamp(121, 'curiosity', (pen) => {
    for (let index = 0; index < 8; index++) {
      const angle = (index / 8) * TAU;
      pen.arc(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0.12, 0, TAU, 0.8);
    }
    pen.arc(0, 0, 0.18);
  }),
  // One antenna drawn through two front legs.
  cleanAntennae: stamp(122, 'life', (pen) => {
    pen.line([
      { x: -0.6, y: 0.4 },
      { x: -0.1, y: 0 },
      { x: 0.3, y: -0.3 },
      { x: 0.6, y: -0.5 },
    ]);
    for (const side of [-1, 1]) {
      pen.line([
        { x: -0.2 + side * 0.02, y: 0.45 },
        { x: -0.05 + side * 0.12, y: 0.1 },
        { x: side * 0.06, y: -0.05 },
      ]);
    }
  }),
  // A shrimp flat on the bed under a wide shadow.
  stoneStill: stamp(123, 'escape', (pen) => {
    pen.washDisc(0, -0.1, 0.55, [60, 60, 70], 0.25);
    pen.shrimp(0, 0.25, 0.55, 0, undefined, false);
    pen.line(
      [
        { x: -0.6, y: 0.42 },
        { x: 0.6, y: 0.42 },
      ],
      0.6,
    );
  }),
  // A shell with legs out, and two antennae reaching toward it.
  gentle: stamp(124, 'company', (pen) => {
    pen.spiral(0.25, 0.05, 0.3, 1.8);
    pen.arc(0.25, 0.05, 0.32, 0, TAU, 0.9);
    for (const angle of [2.4, 2.8]) {
      pen.line([
        { x: 0.25 + Math.cos(angle) * 0.3, y: 0.05 + Math.sin(angle) * 0.3 },
        { x: 0.25 + Math.cos(angle) * 0.46, y: 0.05 + Math.sin(angle) * 0.46 + 0.06 },
      ]);
    }
    pen.antennae(-0.62, 0.15, 0.6, -0.1, 0.18);
  }),
};

export const iconPainters: Record<string, Painter> = {
  'icon.type.taste': typeTaste,
  'icon.type.reach': typeReach,
  'icon.type.watch': typeWatch,
  'icon.type.escape': typeEscape,
  'icon.type.meet': typeMeet,
  'icon.type.find': typeFind,
  'icon.tab.discoveries': tabDiscoveries,
  'icon.tab.companions': tabCompanions,
  'icon.tab.feel': tabFeel,
  'icon.tab.challenges': tabChallenges,
  'icon.tab.achievements': tabAchievements,
  'icon.bond.stranger': bond(31, 0.42, false),
  'icon.bond.familiar': bond(32, 0.3, false),
  'icon.bond.companion': bond(33, 0.2, true),
  'icon.bond.close': bond(34, 0.12, true),
  ...Object.fromEntries(Object.entries(stamps).map(([id, one]) => [`icon.ach.${id}`, one])),
};
