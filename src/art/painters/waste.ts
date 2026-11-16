import { seededRandom } from '../../core/random';
import {
  blob,
  glow,
  mix,
  rgba,
  sampleCurve,
  softFill,
  speckle,
  tracePath,
  traceRibbon,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * Litter left by people on the wild coast (D43), seen from above. Each piece
 * is worn, faded and silted, never shiny or new, and carries no print, word
 * or mark. It lies on the bed as decor and is never mentioned. Sizes, places
 * and rules are in docs/11-world-catalogue.md, "Litter".
 *
 * Light comes from the upper left, as everywhere.
 */

const TAU = Math.PI * 2;

/** Silt that settles on anything left on the bed. Neutral enough for sand and mud. */
const SILT: Rgb = [132, 122, 96];
const SILT_DARK: Rgb = [88, 80, 62];
/** The green and brown film that grows on anything left in the water. */
const FILM: Rgb = [96, 112, 62];
const FILM_BROWN: Rgb = [118, 100, 62];
const SHADE: Rgb = [30, 32, 28];

/** A soft contact shadow under a shape, thrown down and to the right. */
function shadowUnder(ctx: CanvasRenderingContext2D, trace: () => void, blur: number): void {
  ctx.save();
  ctx.translate(blur * 0.35, blur * 0.45);
  trace();
  ctx.shadowColor = rgba(SHADE, 0.55);
  ctx.shadowBlur = blur;
  ctx.fillStyle = rgba(SHADE, 0.3);
  ctx.fill();
  ctx.restore();
}

/** Silt and film laid over whatever is clipped, in soft patches. */
function weather(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  box: { x: number; y: number; w: number; h: number },
  amount: number,
): void {
  for (let index = 0; index < Math.round(14 * amount); index++) {
    const x = box.x + random() * box.w;
    const y = box.y + random() * box.h;
    const r = Math.min(box.w, box.h) * (0.12 + random() * 0.3);
    const pick = random();
    glow(ctx, x, y, r, pick < 0.45 ? SILT : pick < 0.75 ? FILM : FILM_BROWN, 0.12 + random() * 0.2);
  }
  speckle(
    ctx,
    random,
    Math.round(box.w * box.h * 0.004 * amount),
    box,
    [0.6, 1.8],
    SILT_DARK,
    [0.12, 0.35],
  );
}

// ------------------------------------------------------------------ bottle

/**
 * A plastic bottle lying on its side, cap gone, neck to the right. Cloudy and
 * greyed, ribbed, dented on one side, with silt lying inside along the bottom.
 */
const bottle: Painter = {
  width: 640,
  height: 220,
  paint(ctx, width, height) {
    const random = seededRandom(1301);
    const cy = height / 2;
    const r = 86;
    const left = 52;
    const shoulder = 448;
    const neck = 540;
    const mouth = 596;
    const neckR = 30;
    // Upper outline from the base to the mouth, then back along the lower side.
    const outline = (dent: number): Point[] => {
      const top: Point[] = [];
      for (let step = 0; step <= 40; step++) {
        const x = left + ((mouth - left) * step) / 40;
        let half: number;
        if (x < left + 30) half = r * Math.sqrt(1 - ((left + 30 - x) / 30) ** 2 * 0.55);
        else if (x < shoulder) half = r;
        else if (x < neck) {
          const t = (x - shoulder) / (neck - shoulder);
          half = neckR + (r - neckR) * (0.5 + 0.5 * Math.cos(t * Math.PI));
        } else half = neckR;
        top.push({ x, y: cy - half });
      }
      const bottom = top
        .map((point) => {
          // A dent pushes the lower side in, a third of the way along.
          const t = (point.x - 160) / 110;
          const push = Math.abs(t) < 1 ? dent * (1 - t * t) : 0;
          return { x: point.x, y: 2 * cy - point.y - push };
        })
        .reverse();
      return [...top, ...bottom];
    };
    const shape = outline(22);
    const trace = (): void => tracePath(ctx, shape);
    shadowUnder(ctx, trace, 18);

    // The plastic: cloudy, letting the bed show through.
    trace();
    const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    body.addColorStop(0, rgba([214, 224, 214], 0.62));
    body.addColorStop(0.35, rgba([196, 210, 200], 0.42));
    body.addColorStop(0.75, rgba([170, 184, 174], 0.48));
    body.addColorStop(1, rgba([120, 132, 124], 0.6));
    softFill(ctx, body, [90, 100, 92], 5, 0.5);

    ctx.save();
    trace();
    ctx.clip();
    // Silt inside, lying along the lower side.
    const silt = ctx.createLinearGradient(0, cy + r * 0.2, 0, cy + r);
    silt.addColorStop(0, rgba(SILT, 0));
    silt.addColorStop(0.45, rgba(SILT, 0.45));
    silt.addColorStop(1, rgba(SILT_DARK, 0.6));
    ctx.fillStyle = silt;
    ctx.fillRect(left, cy, shoulder - left + 40, r + 10);
    // Ribs round the body.
    for (let index = 0; index < 6; index++) {
      const x = 110 + index * 56;
      ctx.strokeStyle = rgba([238, 244, 236], 0.13);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, cy - r);
      ctx.quadraticCurveTo(x + 10, cy, x, cy + r);
      ctx.stroke();
      ctx.strokeStyle = rgba([80, 90, 84], 0.18);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6, cy - r);
      ctx.quadraticCurveTo(x + 16, cy, x + 6, cy + r);
      ctx.stroke();
    }
    // Creases round the dent.
    ctx.lineCap = 'round';
    for (let index = 0; index < 7; index++) {
      const x = 120 + random() * 90;
      const y = cy + 20 + random() * 50;
      ctx.strokeStyle = rgba(random() < 0.5 ? [238, 244, 236] : [70, 80, 74], 0.3);
      ctx.lineWidth = 1.5 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 50, y + (random() - 0.5) * 30);
      ctx.stroke();
    }
    // The long light along the upper side.
    ctx.strokeStyle = rgba([244, 248, 240], 0.2);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(left + 40, cy - r * 0.55);
    ctx.lineTo(shoulder - 10, cy - r * 0.55);
    ctx.stroke();
    weather(ctx, random, { x: left, y: cy - r, w: mouth - left, h: r * 2 }, 1.7);
    ctx.restore();

    // The neck: a thread and a ring, the mouth open and dark.
    for (const x of [mouth - 34, mouth - 22, mouth - 10]) {
      ctx.strokeStyle = rgba([110, 122, 114], 0.45);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, cy - neckR);
      ctx.lineTo(x + 4, cy + neckR);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(mouth, cy, 9, neckR + 2, 0, 0, TAU);
    ctx.fillStyle = rgba([96, 108, 100], 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mouth + 1, cy, 5, neckR - 6, 0, 0, TAU);
    ctx.fillStyle = rgba([36, 40, 36], 0.8);
    ctx.fill();

    trace();
    ctx.strokeStyle = rgba([84, 96, 88], 0.5);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    void width;
  },
};

// --------------------------------------------------------------------- bag

/**
 * A thin plastic bag, flattened and crumpled on the bed: greyed, torn, a
 * handle at one end, silt in its folds.
 */
const bag: Painter = {
  width: 600,
  height: 520,
  paint(ctx, width, height) {
    const random = seededRandom(1307);
    const cx = width / 2;
    const cy = height / 2;
    // A ragged outline: a soft blob with a torn, jagged rim.
    const rim: Point[] = [];
    for (let index = 0; index < 64; index++) {
      const angle = (index / 64) * TAU;
      const reach = 1 + 0.18 * Math.sin(angle * 3 + 0.6) + 0.1 * Math.sin(angle * 7 + 2);
      const tear = index % 5 === 0 ? 0.82 + random() * 0.1 : 0.96 + random() * 0.08;
      rim.push({
        x: cx + Math.cos(angle) * 220 * reach * tear,
        y: cy + Math.sin(angle) * 175 * reach * tear,
      });
    }
    // The handles: two loops at the left, one torn open.
    const handle = (dy: number, open: boolean): Point[] => {
      const points: Point[] = [];
      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        if (open && t > 0.7) break;
        const angle = Math.PI * 0.5 + t * Math.PI;
        points.push({ x: cx - 160 + Math.cos(angle) * 70, y: cy + dy + Math.sin(angle) * 40 });
      }
      return points;
    };
    const trace = (): void => tracePath(ctx, rim);
    // The handles first, so the bag's rim lies over where they join it.
    for (const [dy, open] of [
      [-70, false],
      [60, true],
    ] as const) {
      const line = handle(dy, open);
      ctx.save();
      traceRibbon(ctx, line, () => 16);
      softFill(ctx, rgba([200, 202, 192], 0.5), [110, 112, 104], 3, 0.4);
      ctx.restore();
    }
    shadowUnder(ctx, trace, 10);

    trace();
    softFill(ctx, rgba([212, 214, 204], 0.5), [120, 122, 112], 4, 0.4);
    ctx.save();
    trace();
    ctx.clip();
    // Folds: long creases, each a lit edge beside a shaded one.
    ctx.lineCap = 'round';
    for (let index = 0; index < 26; index++) {
      const x = cx + (random() - 0.5) * 420;
      const y = cy + (random() - 0.5) * 320;
      const angle = random() * Math.PI;
      const length = 50 + random() * 160;
      const bend = (random() - 0.5) * 40;
      const line = sampleCurve(
        [
          { x: x - (Math.cos(angle) * length) / 2, y: y - (Math.sin(angle) * length) / 2 },
          { x: x - Math.sin(angle) * bend, y: y + Math.cos(angle) * bend },
          { x: x + (Math.cos(angle) * length) / 2, y: y + (Math.sin(angle) * length) / 2 },
        ],
        12,
      );
      for (const [shift, color, alpha, lineWidth] of [
        [0, [236, 238, 230] as Rgb, 0.22, 3],
        [4, [96, 98, 90] as Rgb, 0.22, 2.5],
      ] as const) {
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        line.forEach((point, step) => {
          const px = point.x + shift * Math.sin(angle);
          const py = point.y - shift * Math.cos(angle);
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      // Silt caught along the fold.
      const mid = line[6] as Point;
      glow(ctx, mid.x + 6, mid.y + 6, 18 + random() * 22, SILT, 0.22);
    }
    weather(ctx, random, { x: cx - 230, y: cy - 190, w: 460, h: 380 }, 0.9);
    // Holes worn through.
    ctx.globalCompositeOperation = 'destination-out';
    for (let index = 0; index < 4; index++) {
      tracePath(
        ctx,
        blob(
          random,
          cx + (random() - 0.4) * 300,
          cy + (random() - 0.5) * 220,
          10 + random() * 22,
          0.4,
          9,
        ),
      );
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    trace();
    ctx.strokeStyle = rgba([150, 152, 142], 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  },
};

// -------------------------------------------------------------------- rope

/**
 * A length of blue three-strand rope, faded almost to grey, frayed at both
 * ends, half sunk into the bed along the middle.
 */
const rope: Painter = {
  width: 720,
  height: 260,
  paint(ctx, width, height) {
    const random = seededRandom(1319);
    const line = sampleCurve(
      [
        { x: 70, y: 150 },
        { x: 210, y: 90 },
        { x: 360, y: 150 },
        { x: 520, y: 190 },
        { x: 650, y: 110 },
      ],
      80,
    );
    const thick = 20;
    const blue: Rgb = [112, 134, 148];
    shadowUnder(ctx, () => traceRibbon(ctx, line, () => thick), 8);
    ctx.save();
    traceRibbon(ctx, line, () => thick);
    softFill(ctx, rgba(blue, 1), [50, 66, 78], 4, 0.6);
    ctx.clip();
    // The twist: short slanted strands all along.
    for (let index = 1; index < line.length - 1; index++) {
      const point = line[index] as Point;
      const next = line[index + 1] as Point;
      const angle = Math.atan2(next.y - point.y, next.x - point.x);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      for (const [offset, color, alpha] of [
        [0, [178, 200, 210] as Rgb, 0.5],
        [3, [44, 60, 72] as Rgb, 0.45],
      ] as const) {
        const along = offset;
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(
          point.x + Math.cos(angle) * along - nx * thick * 0.5 - Math.cos(angle) * 5,
          point.y + Math.sin(angle) * along - ny * thick * 0.5 - Math.sin(angle) * 5,
        );
        ctx.lineTo(
          point.x + Math.cos(angle) * along + nx * thick * 0.5 + Math.cos(angle) * 5,
          point.y + Math.sin(angle) * along + ny * thick * 0.5 + Math.sin(angle) * 5,
        );
        ctx.stroke();
      }
    }
    // Lit along the upper edge, shaded below.
    traceRibbon(ctx, line, () => thick, -0.3, 0.3);
    ctx.fillStyle = rgba([220, 232, 236], 0.25);
    ctx.fill();
    traceRibbon(ctx, line, () => thick, 0.32, 0.36);
    ctx.fillStyle = rgba([30, 40, 48], 0.25);
    ctx.fill();
    weather(ctx, random, { x: 40, y: 60, w: 640, h: 160 }, 1.2);
    ctx.restore();

    // Sunk into the bed along the middle: silt over it, soft at both sides.
    const sunk = ctx.createLinearGradient(300, 0, 470, 0);
    sunk.addColorStop(0, rgba(SILT, 0));
    sunk.addColorStop(0.5, rgba(SILT, 0.7));
    sunk.addColorStop(1, rgba(SILT, 0));
    ctx.save();
    traceRibbon(ctx, line, () => thick + 6);
    ctx.clip();
    ctx.fillStyle = sunk;
    ctx.fillRect(280, 0, 210, height);
    ctx.restore();

    // Frayed ends: loose fibres fanning out.
    for (const [end, back] of [
      [0, 1],
      [line.length - 1, line.length - 2],
    ] as const) {
      const tip = line[end] as Point;
      const prev = line[back] as Point;
      const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x);
      for (let index = 0; index < 16; index++) {
        const spread = angle + (random() - 0.5) * 1.3;
        const length = 14 + random() * 34;
        const start = (random() - 0.5) * thick * 0.8;
        const sx = tip.x - Math.sin(angle) * start;
        const sy = tip.y + Math.cos(angle) * start;
        ctx.strokeStyle = rgba(mix(blue, [190, 204, 210], random() * 0.6), 0.55);
        ctx.lineWidth = 1 + random() * 1.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          sx + Math.cos(spread) * length * 0.6 + (random() - 0.5) * 8,
          sy + Math.sin(spread) * length * 0.6 + (random() - 0.5) * 8,
          sx + Math.cos(spread) * length,
          sy + Math.sin(spread) * length,
        );
        ctx.stroke();
      }
    }
    void width;
  },
};

// ------------------------------------------------------------------ sandal

/**
 * The sole of a rubber sandal, toe to the right: worn pale at the heel and
 * the ball, the top layer chipped, one strap left, the other torn away.
 */
const sandal: Painter = {
  width: 560,
  height: 240,
  paint(ctx, width, height) {
    const random = seededRandom(1321);
    const cy = height / 2;
    // A foot-sole outline: narrow at the arch, rounded at both ends.
    const outline: Point[] = [];
    const half = (x: number): number => {
      const t = (x - 40) / 470;
      const heel = 62 * Math.sqrt(Math.max(0, 1 - ((t - 0.13) / 0.16) ** 2));
      const ball = 84 * Math.sqrt(Math.max(0, 1 - ((t - 0.72) / 0.29) ** 2));
      const arch = 52;
      return Math.max(heel, ball, t > 0.08 && t < 0.92 ? arch : 0);
    };
    for (let x = 40; x <= 510; x += 6) outline.push({ x, y: cy - half(x) - (x - 275) * 0.02 });
    for (let x = 510; x >= 40; x -= 6) outline.push({ x, y: cy + half(x) - (x - 275) * 0.02 });
    const trace = (): void => tracePath(ctx, outline);
    shadowUnder(ctx, trace, 12);

    // The edge: layers of rubber, paler than the top.
    trace();
    softFill(ctx, rgba([150, 150, 140], 1), [60, 62, 58], 5, 0.6);
    ctx.save();
    ctx.translate(-3, -4);
    ctx.scale(0.985, 0.97);
    ctx.translate(4, 4);
    trace();
    ctx.restore();
    const top: Rgb = [66, 74, 92];
    ctx.fillStyle = rgba(top, 1);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Worn pale where the heel and the ball pressed.
    glow(ctx, 110, cy, 70, [150, 156, 160], 0.6);
    glow(ctx, 380, cy - 6, 85, [150, 156, 160], 0.45);
    // Chips out of the top layer.
    for (let index = 0; index < 9; index++) {
      tracePath(
        ctx,
        blob(random, 60 + random() * 440, cy + (random() - 0.5) * 120, 6 + random() * 14, 0.4, 8),
      );
      ctx.fillStyle = rgba([150, 150, 140], 0.85);
      ctx.fill();
    }
    weather(ctx, random, { x: 40, y: cy - 90, w: 470, h: 180 }, 1.1);
    ctx.restore();

    // The toe post, and one strap running back to the side. The other is gone.
    const post = { x: 420, y: cy - 4 };
    ctx.beginPath();
    ctx.arc(post.x, post.y, 9, 0, TAU);
    ctx.fillStyle = rgba([34, 40, 52], 0.9);
    ctx.fill();
    const strap = sampleCurve([post, { x: 340, y: cy - 50 }, { x: 250, y: cy - 58 }], 16);
    ctx.save();
    traceRibbon(ctx, strap, (t) => 18 - t * 4);
    softFill(ctx, rgba([70, 84, 110], 1), [30, 36, 46], 6, 0.6);
    ctx.restore();
    // The torn stub of the other strap.
    ctx.save();
    traceRibbon(ctx, [post, { x: 392, y: cy + 26 }, { x: 378, y: cy + 36 }], () => 15);
    softFill(ctx, rgba([70, 84, 110], 1), [30, 36, 46], 5, 0.6);
    ctx.restore();
    trace();
    ctx.strokeStyle = rgba([50, 52, 48], 0.5);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    void width;
  },
};

// -------------------------------------------------------------------- foam

/** A broken chunk of white foam, gone grey, its beads showing, crumbs beside it. */
const foam: Painter = {
  width: 300,
  height: 260,
  paint(ctx, width, height) {
    const random = seededRandom(1327);
    const cx = width / 2 - 10;
    const cy = height / 2 - 6;
    // Straight broken edges, not a smooth blob.
    const shape: Point[] = [];
    const corners = 9;
    for (let index = 0; index < corners; index++) {
      const angle = (index / corners) * TAU + random() * 0.3;
      const reach = 80 + random() * 40;
      shape.push({ x: cx + Math.cos(angle) * reach * 1.15, y: cy + Math.sin(angle) * reach * 0.9 });
    }
    const trace = (): void => tracePath(ctx, shape);
    shadowUnder(ctx, trace, 12);
    trace();
    const fill = ctx.createLinearGradient(cx - 100, cy - 90, cx + 100, cy + 90);
    fill.addColorStop(0, rgba([226, 226, 216], 1));
    fill.addColorStop(1, rgba([176, 176, 164], 1));
    softFill(ctx, fill, [90, 90, 82], 4, 0.6);
    ctx.save();
    trace();
    ctx.clip();
    // Beads: small rounds, each a faint ring.
    for (let index = 0; index < 260; index++) {
      const x = cx + (random() - 0.5) * 260;
      const y = cy + (random() - 0.5) * 220;
      ctx.strokeStyle = rgba([140, 140, 128], 0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 3 + random() * 3, 0, TAU);
      ctx.stroke();
    }
    weather(ctx, random, { x: cx - 130, y: cy - 110, w: 260, h: 220 }, 1.4);
    ctx.restore();
    trace();
    ctx.strokeStyle = rgba([110, 110, 100], 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Crumbs that broke off.
    for (let index = 0; index < 14; index++) {
      const angle = random() * TAU;
      const distance = 120 + random() * 25;
      const x = cx + Math.cos(angle) * distance * 0.95;
      const y = cy + Math.sin(angle) * distance * 0.75;
      tracePath(ctx, blob(random, x, y, 2.5 + random() * 4, 0.3, 6));
      ctx.fillStyle = rgba([206, 206, 196], 0.8);
      ctx.fill();
    }
  },
};

// -------------------------------------------------------------------- sack

/**
 * An empty woven sack, folded over, half under silt: its weave shows, the
 * open end frays. It carries no print.
 */
const sack: Painter = {
  width: 760,
  height: 640,
  paint(ctx, width, height) {
    const random = seededRandom(1331);
    const shape: Point[] = [
      { x: 90, y: 150 },
      { x: 400, y: 110 },
      { x: 660, y: 140 },
      { x: 690, y: 330 },
      { x: 650, y: 520 },
      { x: 360, y: 545 },
      { x: 110, y: 500 },
      { x: 70, y: 320 },
    ];
    const smooth = sampleCurve([...shape, shape[0] as Point], 64);
    const trace = (): void => tracePath(ctx, smooth);
    shadowUnder(ctx, trace, 16);
    trace();
    softFill(ctx, rgba([206, 202, 186], 1), [100, 96, 84], 6, 0.6);
    ctx.save();
    trace();
    ctx.clip();
    // The weave: flat strips crossing, each a faint pair of lines.
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 9) {
      ctx.strokeStyle = rgba(x % 18 ? [236, 232, 218] : [150, 146, 130], 0.35);
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 30, 580);
      ctx.stroke();
    }
    for (let y = 80; y < 600; y += 9) {
      ctx.strokeStyle = rgba(y % 18 ? [236, 232, 218] : [150, 146, 130], 0.28);
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(720, y - 20);
      ctx.stroke();
    }
    // The fold: a crease across, with the near layer a little lighter.
    ctx.strokeStyle = rgba([110, 106, 92], 0.55);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(80, 340);
    ctx.bezierCurveTo(280, 300, 470, 360, 700, 310);
    ctx.stroke();
    const near = ctx.createLinearGradient(0, 120, 0, 330);
    near.addColorStop(0, rgba([240, 236, 222], 0.2));
    near.addColorStop(1, rgba([240, 236, 222], 0));
    ctx.fillStyle = near;
    ctx.fillRect(0, 100, width, 230);
    // Half under silt toward the lower right.
    const silt = ctx.createLinearGradient(300, 300, 700, 560);
    silt.addColorStop(0, rgba(SILT, 0));
    silt.addColorStop(0.55, rgba(SILT, 0.55));
    silt.addColorStop(1, rgba(SILT, 0.85));
    ctx.fillStyle = silt;
    ctx.fillRect(0, 0, width, height);
    weather(ctx, random, { x: 70, y: 110, w: 620, h: 440 }, 1.3);
    // A hole worn through.
    ctx.globalCompositeOperation = 'destination-out';
    tracePath(ctx, blob(random, 230, 430, 24, 0.35, 10));
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // The open end, at the left, frays into loose strips.
    for (let index = 0; index < 24; index++) {
      const y = 160 + index * 14 + random() * 6;
      const x = 72 + Math.abs(y - 330) * 0.08;
      const length = 12 + random() * 30;
      ctx.strokeStyle = rgba([210, 206, 190], 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - length, y + (random() - 0.5) * 14);
      ctx.stroke();
    }
    trace();
    ctx.strokeStyle = rgba([110, 106, 92], 0.45);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  },
};

// -------------------------------------------------------------------- pipe

/**
 * A short length of grey pipe, cut square, the open end to the right showing
 * the dark inside. Scuffed, with growth along it, the far end under silt.
 */
const pipe: Painter = {
  width: 720,
  height: 200,
  paint(ctx, width, height) {
    const random = seededRandom(1337);
    const cy = height / 2;
    const r = 44;
    const left = 50;
    const right = 650;
    const trace = (): void => {
      ctx.beginPath();
      ctx.moveTo(left, cy - r);
      ctx.lineTo(right, cy - r);
      ctx.ellipse(right, cy, 16, r, 0, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(left, cy + r);
      ctx.ellipse(left, cy, 16, r, 0, Math.PI / 2, (Math.PI * 3) / 2);
      ctx.closePath();
    };
    shadowUnder(ctx, trace, 16);
    trace();
    // Round across: lit along the top, dark along the bottom.
    const body = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    body.addColorStop(0, rgba([196, 198, 192], 1));
    body.addColorStop(0.3, rgba([168, 170, 164], 1));
    body.addColorStop(0.8, rgba([118, 120, 114], 1));
    body.addColorStop(1, rgba([84, 86, 80], 1));
    softFill(ctx, body, [60, 62, 58], 5, 0.6);
    ctx.save();
    trace();
    ctx.clip();
    // Scuffs along it.
    ctx.lineCap = 'round';
    for (let index = 0; index < 30; index++) {
      const x = left + random() * (right - left);
      const y = cy + (random() - 0.5) * r * 1.6;
      ctx.strokeStyle = rgba(random() < 0.5 ? [220, 222, 216] : [90, 92, 86], 0.25);
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10 + random() * 40, y + (random() - 0.5) * 6);
      ctx.stroke();
    }
    weather(ctx, random, { x: left, y: cy - r, w: right - left, h: r * 2 }, 1.4);
    // The far end under silt.
    const silt = ctx.createLinearGradient(left, 0, left + 200, 0);
    silt.addColorStop(0, rgba(SILT, 0.9));
    silt.addColorStop(1, rgba(SILT, 0));
    ctx.fillStyle = silt;
    ctx.fillRect(0, 0, left + 200, height);
    ctx.restore();
    // The open end: a rim, and the dark inside.
    ctx.beginPath();
    ctx.ellipse(right, cy, 16, r, 0, 0, TAU);
    ctx.fillStyle = rgba([150, 152, 146], 1);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(right + 1, cy, 12, r - 6, 0, 0, TAU);
    const inside = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    inside.addColorStop(0, rgba([20, 22, 20], 0.95));
    inside.addColorStop(1, rgba([58, 56, 46], 0.9));
    ctx.fillStyle = inside;
    ctx.fill();
    trace();
    ctx.strokeStyle = rgba([60, 62, 58], 0.5);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    void width;
  },
};

export const wastePainters: Record<string, Painter> = {
  'waste.bottle': bottle,
  'waste.bag': bag,
  'waste.rope': rope,
  'waste.sandal': sandal,
  'waste.foam': foam,
  'waste.sack': sack,
  'waste.pipe': pipe,
};
