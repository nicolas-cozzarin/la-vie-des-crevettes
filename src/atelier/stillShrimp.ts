import { DEFAULT_LOOK, type RigExpression, type RigLook } from '../art/expressions';
import {
  EYE,
  PARTS,
  PART_PX_PER_BL,
  SHRIMP,
  eyeOriginX,
  partOriginX,
  type PartDef,
} from '../art/shrimpParts';
import { paintImage } from './images';

/**
 * A shrimp drawn once, standing still, for the atelier's pictures. It places
 * the same parts in the same way as `src/entities/ShrimpRig.ts`, and holds the
 * posture of a `RigExpression`. The numbers that say where things attach
 * mirror the rig's: change them in both.
 */
export interface StillShrimp {
  x: number;
  y: number;
  /** Where the head points, in radians. */
  heading: number;
  expression: RigExpression;
  look?: Partial<RigLook>;
  /** What the antennae aim at when the expression asks them to. */
  target?: { x: number; y: number };
  /** Radians each joint of the abdomen turns: a body caught in a curve. */
  curve?: number;
  /** A point in the slow sweep of the antennae, from -1 to 1. */
  sweep?: number;
  /** 0 on the bed, 1 swimming. */
  height?: number;
}

const SEGMENTS = SHRIMP.segmentLengths.length;
const PLATE_OVERLAP = 1.22;
const ANTENNA_POINTS = 14;
const ANTENNA_BEND = 0.42;
const LEG_ROOTS = [0.07, 0.115, 0.16, 0.205, 0.25];
const LEG_ANGLES = [-0.55, -0.28, 0, 0.3, 0.6];
const LEG_COLOR = '243,246,247';
const FEELER_COLOR = '140,130,116';
const SWIMMERET_COLOR = '230,237,240';
const SHADOW_COLOR = '20,30,40';

const paleCache = new Map<string, HTMLCanvasElement>();

/** A copy of a part washed toward white, for a pale tail fan. */
function pale(name: string, amount: number): HTMLCanvasElement {
  const key = `${name}:${amount}`;
  const kept = paleCache.get(key);
  if (kept) return kept;
  const source = paintImage(name);
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(250,250,246,${amount})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paleCache.set(key, canvas);
  return canvas;
}

function wrap(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function drawStillShrimp(ctx: CanvasRenderingContext2D, shrimp: StillShrimp): void {
  const look: RigLook = { ...DEFAULT_LOOK, ...shrimp.look };
  const e = shrimp.expression;
  const height = shrimp.height ?? 0;
  const bl = look.bodyLengthPx * (1 + 0.05 * Math.min(height, 1.6));
  const scale = bl / PART_PX_PER_BL;
  const stroke = look.bodyLengthPx / 110;

  // A curious shrimp leans toward what it looks at.
  let { x, y } = shrimp;
  const aimAngle = shrimp.target
    ? Math.atan2(shrimp.target.y - y, shrimp.target.x - x)
    : shrimp.heading;
  x += Math.cos(aimAngle) * e.lean * bl;
  y += Math.sin(aimAngle) * e.lean * bl;

  const heading = shrimp.heading;
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const rx = -fy;
  const ry = fx;
  const spread = e.fan ?? 0.5;
  const stretch = 1 - 0.08 * e.tuck;
  const curve = shrimp.curve ?? 0;

  // Shadows fall down and to the right, further off the higher the shrimp is.
  const offset = (3 + height * 0.17 * look.bodyLengthPx) * (1 - 0.6 * e.flat);
  const shadowX = offset * 0.6;
  const shadowY = offset * 0.8;
  const shadowAlpha = (0.34 / (1 + 0.9 * height)) * (1 + 0.25 * e.flat);
  const lineShadowAlpha = 0.2 / (1 + 0.9 * height);

  // The abdomen, as a chain of joints behind the carapace.
  const joints: { x: number; y: number; angle: number }[] = [];
  let jx = x;
  let jy = y;
  let angle = heading;
  for (let index = 0; index <= SEGMENTS; index++) {
    angle += curve;
    joints.push({ x: jx, y: jy, angle });
    if (index < SEGMENTS) {
      const length = (SHRIMP.segmentLengths[index] as number) * bl * stretch;
      jx -= Math.cos(angle) * length;
      jy -= Math.sin(angle) * length;
    }
  }
  const fan = joints[SEGMENTS] as { x: number; y: number; angle: number };
  const fanAngle = fan.angle + e.fanSway * 0.6;

  ctx.save();
  ctx.globalAlpha *= look.alpha;

  const part = (
    name: string,
    originX: number,
    px: number,
    py: number,
    rotation: number,
    scaleX: number,
    scaleY: number,
    image: HTMLCanvasElement = paintImage(name),
  ): void => {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(image, -originX * image.width, -image.height / 2);
    ctx.restore();
  };
  const def = (
    partDef: PartDef,
    px: number,
    py: number,
    rotation: number,
    scaleX: number,
    scaleY: number,
    image?: HTMLCanvasElement,
  ): void => part(partDef.name, partOriginX(partDef), px, py, rotation, scaleX, scaleY, image);

  // Soft shadows under the body.
  const shadow = paintImage('shadow.soft');
  const blobs: [number, number, number, number, number][] = [
    [x + fx * 0.17 * bl, y + fy * 0.17 * bl, heading, 0.46, 0.25],
    [
      (joints[2] as { x: number }).x,
      (joints[2] as { y: number }).y,
      (joints[2] as { angle: number }).angle,
      0.32,
      0.21,
    ],
    [
      (joints[4] as { x: number }).x,
      (joints[4] as { y: number }).y,
      (joints[4] as { angle: number }).angle,
      0.3,
      0.18,
    ],
    [
      fan.x - Math.cos(fanAngle) * 0.06 * bl,
      fan.y - Math.sin(fanAngle) * 0.06 * bl,
      fanAngle,
      0.26,
      0.15 + 0.12 * spread,
    ],
  ];
  const grow = 1 + 0.28 * height;
  for (const [bx, by, rotation, length, width] of blobs) {
    ctx.save();
    ctx.globalAlpha *= shadowAlpha;
    ctx.translate(bx + shadowX, by + shadowY);
    ctx.rotate(rotation);
    ctx.drawImage(
      shadow,
      (-length * bl * grow) / 2,
      (-width * bl * grow) / 2,
      length * bl * grow,
      width * bl * grow,
    );
    ctx.restore();
  }

  // Thin parts: a line, and its shadow on the bed.
  const line = (path: readonly number[], width: number, color: string, alpha: number): void => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [dx, dy, style, w] of [
      [shadowX, shadowY, `rgba(${SHADOW_COLOR},${lineShadowAlpha})`, width * 1.4],
      [0, 0, `rgba(${color},${alpha})`, width],
    ] as const) {
      ctx.strokeStyle = style;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let index = 0; index < path.length; index += 2) {
        const px = (path[index] as number) + dx;
        const py = (path[index + 1] as number) + dy;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  };

  // Walking legs. A frightened shrimp draws them in.
  const reach = bl * 0.115 * e.legReach;
  for (const side of [-1, 1]) {
    for (let index = 0; index < LEG_ROOTS.length; index++) {
      const along = (LEG_ROOTS[index] as number) * bl;
      const out = heading + side * (Math.PI / 2);
      const rootX = x + fx * along + Math.cos(out) * 0.05 * bl;
      const rootY = y + fy * along + Math.sin(out) * 0.05 * bl;
      const forward = (LEG_ANGLES[index] as number) * (1 - 0.5 * e.flat);
      const direction = heading + side * (Math.PI / 2 - forward);
      const kneeX = rootX + Math.cos(direction) * reach * 0.58;
      const kneeY = rootY + Math.sin(direction) * reach * 0.58;
      const shin = direction + side * 0.55;
      line(
        [
          rootX,
          rootY,
          kneeX,
          kneeY,
          kneeX + Math.cos(shin) * reach * 0.5,
          kneeY + Math.sin(shin) * reach * 0.5,
        ],
        1.5 * stroke,
        LEG_COLOR,
        0.9,
      );
    }
  }

  // Swimmerets, barely showing at rest.
  for (let index = 0; index < 5; index++) {
    const from = joints[index] as { x: number; y: number; angle: number };
    const to = joints[index + 1] as { x: number; y: number };
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const halfWidth = (SHRIMP.segmentHalfWidths[index] as number) * bl;
    const length = bl * (0.012 + 0.055 * 0.5 * (0.16 + 0.84 * Math.min(1, height)));
    for (const side of [-1, 1]) {
      const out = from.angle + side * (Math.PI / 2);
      const rootX = midX + Math.cos(out) * halfWidth * 0.8;
      const rootY = midY + Math.sin(out) * halfWidth * 0.8;
      const direction = from.angle + side * (Math.PI / 2 + 0.6);
      line(
        [rootX, rootY, rootX + Math.cos(direction) * length, rootY + Math.sin(direction) * length],
        2.6 * stroke,
        SWIMMERET_COLOR,
        0.45,
      );
    }
  }

  // Antennules: the short forked pair between the eyes.
  for (const side of [-1, 1]) {
    const baseX = x + fx * 0.3 * bl + rx * side * 0.012 * bl;
    const baseY = y + fy * 0.3 * bl + ry * side * 0.012 * bl;
    const direction = heading + side * (0.24 + e.antennuleFlick * 0.6);
    const forkX = baseX + Math.cos(direction) * 0.075 * bl;
    const forkY = baseY + Math.sin(direction) * 0.075 * bl;
    line([baseX, baseY, forkX, forkY], 1.3 * stroke, FEELER_COLOR, 0.85);
    for (const fork of [-0.16, 0.16]) {
      line(
        [
          forkX,
          forkY,
          forkX + Math.cos(direction + fork) * 0.09 * bl,
          forkY + Math.sin(direction + fork) * 0.09 * bl,
        ],
        1.3 * stroke,
        FEELER_COLOR,
        0.75,
      );
    }
  }

  // The long antennae, each a chain of links along its resting curve.
  [-1, 1].forEach((side, which) => {
    const factor = which === 0 ? look.leftAntennaFactor : 1;
    const link = (look.antennaLength * factor * bl) / (ANTENNA_POINTS - 1);
    const baseX = x + fx * 0.295 * bl + rx * side * 0.036 * bl;
    const baseY = y + fy * 0.295 * bl + ry * side * 0.036 * bl;
    const sweep = e.antennaSweep * (shrimp.sweep ?? 0.4) * (which === 0 ? 1 : -0.6);
    let first = heading + side * (e.antennaAngle + sweep);
    let curl = e.antennaCurl;
    if (shrimp.target && e.aim > 0) {
      // Turn toward the target, a little apart so the two do not cross.
      const toTarget = Math.atan2(shrimp.target.y - baseY, shrimp.target.x - baseX) + side * 0.07;
      first += wrap(toTarget - first) * e.aim;
      curl *= 1 - 0.7 * e.aim;
    }
    const path: number[] = [baseX, baseY];
    let px = baseX;
    let py = baseY;
    let direction = first;
    for (let index = 1; index < ANTENNA_POINTS; index++) {
      px += Math.cos(direction) * link;
      py += Math.sin(direction) * link;
      path.push(px, py);
      direction += side * Math.min(ANTENNA_BEND, curl);
    }
    const runs: [number, number, number, number][] = [
      [0, 5, 1.7, 0.9],
      [5, 9, 1.3, 0.8],
      [9, ANTENNA_POINTS - 1, 1, 0.65],
    ];
    for (const [from, to, width, alpha] of runs) {
      line(path.slice(from * 2, to * 2 + 2), width * stroke, FEELER_COLOR, alpha);
    }
  });

  // The tail fan.
  const fanImage = look.fanPale > 0 ? pale(PARTS.uropod.name, look.fanPale) : undefined;
  const inner = 0.12 + 0.3 * spread;
  const outer = 0.26 + 0.62 * spread;
  for (const blade of [-outer, outer, -inner, inner]) {
    def(PARTS.uropod, fan.x, fan.y, fanAngle + blade, scale, scale, fanImage);
  }
  def(
    PARTS.telson,
    fan.x,
    fan.y,
    fanAngle,
    scale * stretch,
    scale,
    look.fanPale > 0 ? pale(PARTS.telson.name, look.fanPale * 0.7) : undefined,
  );

  // The abdomen. Each plate lies over the one behind it.
  for (let index = SEGMENTS - 1; index >= 0; index--) {
    const joint = joints[index] as { x: number; y: number; angle: number };
    const length = SHRIMP.segmentLengths[index] as number;
    const halfWidth = SHRIMP.segmentHalfWidths[index] as number;
    def(
      PARTS.segment,
      joint.x,
      joint.y,
      joint.angle,
      ((scale * length * PLATE_OVERLAP) / PARTS.segment.length) * stretch,
      (scale * halfWidth) / PARTS.segment.halfWidth,
    );
  }

  // The head.
  for (const side of [-1, 1]) {
    def(
      PARTS.scale,
      x + fx * 0.293 * bl + rx * side * 0.024 * bl,
      y + fy * 0.293 * bl + ry * side * 0.024 * bl,
      heading + side * 0.2,
      scale,
      scale,
    );
  }
  def(PARTS.carapace, x, y, heading, scale, scale);
  for (const side of [-1, 1]) {
    part(
      EYE.name,
      eyeOriginX(),
      x + fx * 0.288 * bl + rx * side * 0.034 * bl,
      y + fy * 0.288 * bl + ry * side * 0.034 * bl,
      heading + side * 0.95,
      scale * look.eyeScale,
      scale * look.eyeScale,
    );
  }

  ctx.restore();
}
