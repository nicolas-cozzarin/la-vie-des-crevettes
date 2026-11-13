import { seededRandom } from '../../core/random';
import { rgba, sampleProfile, speckle, traceSymmetric, type Painter, type Rgb } from '../paint';
import { EYE, PARTS, PART_MARGIN_PX, PART_PX_PER_BL, partSize, type PartDef } from '../shrimpParts';

/**
 * A living whiteleg shrimp is translucent grey-white to pale blue-grey.
 * It is never pink or orange: that is a cooked one. See docs/04-art-direction.md.
 */
const BODY_LIGHT: Rgb = [233, 239, 241];
const BODY_EDGE: Rgb = [168, 187, 199];
const LINE: Rgb = [86, 107, 124];
const GUT: Rgb = [58, 68, 76];
const ORGAN: Rgb = [92, 100, 96];
const FAN_TIP: Rgb = [104, 126, 146];

const PX = PART_PX_PER_BL;
const M = PART_MARGIN_PX;

function tracePart(ctx: CanvasRenderingContext2D, part: PartDef, height: number): void {
  traceSymmetric(ctx, sampleProfile(part.profile, 48), (u) => M + u * PX, height / 2, PX);
}

/** Fill a part with a wash that is lighter along the back and bluer at the sides. */
function wash(
  ctx: CanvasRenderingContext2D,
  part: PartDef,
  height: number,
  alpha: number,
  edge: Rgb = BODY_EDGE,
): void {
  const half = part.halfWidth * PX;
  const gradient = ctx.createLinearGradient(0, height / 2 - half, 0, height / 2 + half);
  gradient.addColorStop(0, rgba(edge, alpha));
  gradient.addColorStop(0.5, rgba(BODY_LIGHT, alpha));
  gradient.addColorStop(1, rgba(edge, alpha));

  // A soft halo stands in for the bleed of watercolour at the edge.
  ctx.save();
  ctx.shadowColor = rgba(edge, 0.55);
  ctx.shadowBlur = 5;
  ctx.fillStyle = gradient;
  tracePart(ctx, part, height);
  ctx.fill();
  ctx.restore();
}

function outline(ctx: CanvasRenderingContext2D, part: PartDef, height: number, alpha = 0.5): void {
  ctx.strokeStyle = rgba(LINE, alpha);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  tracePart(ctx, part, height);
  ctx.stroke();
}

function painterFor(
  part: PartDef,
  paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): Painter {
  const { width, height } = partSize(part);
  return { width, height, paint };
}

const carapace = painterFor(PARTS.carapace, (ctx, width, height) => {
  const part = PARTS.carapace;
  const mid = height / 2;
  const random = seededRandom(31);
  wash(ctx, part, height, 0.93);

  ctx.save();
  tracePart(ctx, part, height);
  ctx.clip();

  // Organs show through the shell as a soft darker patch toward the rear.
  const organX = M + 0.115 * PX;
  const organ = ctx.createRadialGradient(organX, mid, 2, organX, mid, 0.085 * PX);
  organ.addColorStop(0, rgba(ORGAN, 0.42));
  organ.addColorStop(1, rgba(ORGAN, 0));
  ctx.save();
  ctx.translate(0, mid);
  ctx.scale(1, 0.55);
  ctx.translate(0, -mid);
  ctx.fillStyle = organ;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Fine pigment spots.
  speckle(
    ctx,
    random,
    70,
    { x: M, y: M, w: 0.33 * PX, h: height - 2 * M },
    [0.5, 1.3],
    LINE,
    [0.12, 0.3],
  );

  // The ridge that runs forward into the rostrum.
  ctx.strokeStyle = rgba(LINE, 0.32);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(M + 0.15 * PX, mid);
  ctx.lineTo(M + 0.41 * PX, mid);
  ctx.stroke();
  ctx.restore();

  outline(ctx, part, height, 0.55);
});

const segment = painterFor(PARTS.segment, (ctx, width, height) => {
  const part = PARTS.segment;
  const mid = height / 2;
  const random = seededRandom(47);
  wash(ctx, part, height, 0.86);

  ctx.save();
  tracePart(ctx, part, height);
  ctx.clip();

  // The gut shows as a faint dark thread along the back.
  ctx.strokeStyle = rgba(GUT, 0.36);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(width, mid);
  ctx.stroke();

  speckle(
    ctx,
    random,
    16,
    { x: M, y: M, w: width - 2 * M, h: height - 2 * M },
    [0.5, 1.2],
    LINE,
    [0.1, 0.26],
  );

  // A darker band where this plate overlaps the next one.
  const band = ctx.createLinearGradient(M, 0, M + 0.03 * PX, 0);
  band.addColorStop(0, rgba(LINE, 0.34));
  band.addColorStop(1, rgba(LINE, 0));
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, M + 0.03 * PX, height);
  ctx.restore();

  outline(ctx, part, height, 0.42);
});

const telson = painterFor(PARTS.telson, (ctx, _width, height) => {
  const part = PARTS.telson;
  wash(ctx, part, height, 0.9, [150, 170, 185]);
  outline(ctx, part, height, 0.5);
});

const uropod = painterFor(PARTS.uropod, (ctx, width, height) => {
  const part = PARTS.uropod;
  const mid = height / 2;
  wash(ctx, part, height, 0.8);

  // The tail fan darkens toward its tips.
  ctx.save();
  tracePart(ctx, part, height);
  ctx.clip();
  const tip = ctx.createLinearGradient(M, 0, M + 0.09 * PX, 0);
  tip.addColorStop(0, rgba(FAN_TIP, 0.75));
  tip.addColorStop(1, rgba(FAN_TIP, 0));
  ctx.fillStyle = tip;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = rgba(LINE, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(M + 0.01 * PX, mid);
  ctx.lineTo(width - M, mid);
  ctx.stroke();
  ctx.restore();

  outline(ctx, part, height, 0.45);
});

const scale = painterFor(PARTS.scale, (ctx, _width, height) => {
  const part = PARTS.scale;
  wash(ctx, part, height, 0.72);
  outline(ctx, part, height, 0.4);
});

const eye: Painter = {
  width: EYE.sizePx,
  height: EYE.sizePx,
  paint(ctx, _width, height) {
    const mid = height / 2;
    const eyeX = M + (EYE.stalk + EYE.radius * 0.6) * PX;
    const radius = EYE.radius * PX;

    // The stalk.
    ctx.strokeStyle = rgba(BODY_EDGE, 0.95);
    ctx.lineWidth = 0.022 * PX;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(M + 2, mid);
    ctx.lineTo(eyeX - radius * 0.5, mid);
    ctx.stroke();

    // The eye itself: dark, matt and its real size. No highlight, no lid.
    ctx.save();
    ctx.shadowColor = 'rgba(20,24,28,0.5)';
    ctx.shadowBlur = 3;
    const fill = ctx.createRadialGradient(eyeX, mid, radius * 0.2, eyeX, mid, radius);
    fill.addColorStop(0, 'rgb(22,25,29)');
    fill.addColorStop(1, 'rgb(46,54,62)');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(eyeX, mid, radius, radius * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

export const shrimpPainters: Record<string, Painter> = {
  [PARTS.carapace.name]: carapace,
  [PARTS.segment.name]: segment,
  [PARTS.telson.name]: telson,
  [PARTS.uropod.name]: uropod,
  [PARTS.scale.name]: scale,
  [EYE.name]: eye,
};
