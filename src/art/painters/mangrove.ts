import { seededRandom } from '../../core/random';
import {
  band,
  blob,
  glow,
  hex,
  litWash,
  mix,
  onLayer,
  patches,
  rgba,
  sampleCurve,
  softFill,
  speckle,
  traceLeaf,
  traceLine,
  tracePath,
  traceRibbon,
  wrapped,
  type Painter,
  type Point,
  type Rgb,
} from '../paint';

/**
 * The mangrove, seen from above through tea-coloured water.
 * Looks are described in docs/11-world-catalogue.md, colours in docs/04-art-direction.md.
 */
const MUD = hex('#5C4630');
const MUD_LIGHT: Rgb = [128, 102, 72];
const MUD_DARK: Rgb = [56, 41, 28];
const MUD_WARM: Rgb = [112, 80, 48];
const SANDMUD: Rgb = [146, 128, 98];
const SANDMUD_LIGHT: Rgb = [182, 166, 134];
const SANDMUD_DARK: Rgb = [112, 95, 70];
const ROOT = hex('#3B2A1E');
const ROOT_LIGHT: Rgb = [124, 96, 68];
const ROOT_DARK: Rgb = [27, 19, 13];
const LEAF = hex('#6E8B3D');
const LEAF_LIGHT: Rgb = [156, 178, 92];
const LEAF_DARK: Rgb = [62, 84, 38];
const LEAF_PALE: Rgb = [206, 214, 150];
const DEAD_LEAF: Rgb = [122, 90, 54];
const DEAD_LEAF_LIGHT: Rgb = [176, 142, 92];
const DEAD_LEAF_DARK: Rgb = [70, 50, 31];
const ALGAE: Rgb = [98, 112, 52];
const ALGAE_LIGHT: Rgb = [142, 156, 78];
const ALGAE_DARK: Rgb = [58, 68, 34];
const WARM = hex('#F2D58A');
const TEA = hex('#8A6B3F');
const BRANCH: Rgb = [112, 98, 84];
const BRANCH_LIGHT: Rgb = [172, 158, 138];
const BRANCH_DARK: Rgb = [52, 43, 36];

const TAU = Math.PI * 2;

/** Mud, seen through shallow water. Repeats in both directions. */
const mud: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(101);
    ctx.fillStyle = rgba(MUD, 1);
    ctx.fillRect(0, 0, size, size);

    // Large soft pools of lighter, darker and warmer mud.
    for (let index = 0; index < 120; index++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 70 + random() * 190;
      const color = [MUD_LIGHT, MUD_DARK, MUD_WARM][Math.floor(random() * 3)] as Rgb;
      const strength = 0.06 + random() * 0.11;
      wrapped(size, x, y, radius, (px, py) => glow(ctx, px, py, radius, color, strength));
    }

    // Streaks of fine silt, laid down by slow water.
    ctx.lineCap = 'round';
    for (let index = 0; index < 80; index++) {
      const x = random() * size;
      const y = random() * size;
      const length = 180 + random() * 320;
      const angle = (random() - 0.5) * 0.5;
      const bend = (random() - 0.5) * 60;
      const width = 5 + random() * 14;
      const light = random() < 0.6;
      const alpha = 0.04 + random() * 0.07;
      wrapped(size, x, y, length, (px, py) => {
        ctx.strokeStyle = rgba(light ? MUD_LIGHT : MUD_DARK, alpha);
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let step = 0; step <= 10; step++) {
          const along = (step / 10 - 0.5) * length;
          const across = Math.sin((step / 10) * Math.PI) * bend;
          const sx = px + Math.cos(angle) * along - Math.sin(angle) * across;
          const sy = py + Math.sin(angle) * along + Math.cos(angle) * across;
          if (step === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      });
    }

    // Small pits. The far wall of each catches the light.
    for (let index = 0; index < 170; index++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 2 + random() * 4;
      wrapped(size, x, y, radius * 2, (px, py) => {
        ctx.fillStyle = rgba(MUD_DARK, 0.5);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(MUD_LIGHT, 0.4);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, py, radius + 0.6, 0.1, Math.PI * 0.9);
        ctx.stroke();
      });
    }

    // Scraps of leaf, pressed into the surface.
    for (let index = 0; index < 80; index++) {
      const x = random() * size;
      const y = random() * size;
      const length = 9 + random() * 16;
      const angle = random() * TAU;
      const color = mix(DEAD_LEAF, random() < 0.3 ? LEAF_DARK : DEAD_LEAF_DARK, random());
      const alpha = 0.3 + random() * 0.35;
      wrapped(size, x, y, length, (px, py) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        traceLeaf(ctx, -length / 2, 0, length, length * (0.2 + random() * 0.12));
        ctx.fillStyle = rgba(color, alpha);
        ctx.fill();
        ctx.restore();
      });
    }

    const whole = { x: 0, y: 0, w: size, h: size };
    speckle(ctx, random, 9000, whole, [0.5, 1.3], MUD_DARK, [0.1, 0.3]);
    speckle(ctx, random, 4500, whole, [0.5, 1.2], [176, 150, 112], [0.08, 0.26]);
    speckle(ctx, random, 500, whole, [1, 2.2], [36, 26, 18], [0.15, 0.3]);
  },
};

/** Paler, sandier mud at the creek mouth. Repeats in both directions. */
const sandmud: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(131);
    ctx.fillStyle = rgba(SANDMUD, 1);
    ctx.fillRect(0, 0, size, size);

    for (let index = 0; index < 100; index++) {
      const x = random() * size;
      const y = random() * size;
      const radius = 60 + random() * 170;
      const color = [SANDMUD_LIGHT, SANDMUD_DARK, MUD][Math.floor(random() * 3)] as Rgb;
      const strength = 0.08 + random() * 0.14;
      wrapped(size, x, y, radius, (px, py) => glow(ctx, px, py, radius, color, strength));
    }

    // Faint ripple marks: the water moves here.
    ctx.lineCap = 'round';
    for (let index = 0; index < 90; index++) {
      const x = random() * size;
      const y = random() * size;
      const length = 120 + random() * 220;
      const angle = Math.PI / 2 + (random() - 0.5) * 0.4;
      const bend = (random() - 0.5) * 24;
      const strength = 0.4 + random() * 0.6;
      wrapped(size, x, y, length, (px, py) => {
        for (const [shift, color, alpha, width] of [
          [0, SANDMUD_DARK, 0.16, 7],
          [5, SANDMUD_LIGHT, 0.2, 4],
        ] as const) {
          ctx.strokeStyle = rgba(color, alpha * strength);
          ctx.lineWidth = width;
          ctx.beginPath();
          for (let step = 0; step <= 10; step++) {
            const along = (step / 10 - 0.5) * length;
            const across = Math.sin((step / 10) * Math.PI) * bend + shift;
            const sx = px + Math.cos(angle) * along - Math.sin(angle) * across;
            const sy = py + Math.sin(angle) * along + Math.cos(angle) * across;
            if (step === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      });
    }

    const whole = { x: 0, y: 0, w: size, h: size };
    speckle(ctx, random, 11000, whole, [0.5, 1.4], [84, 68, 48], [0.1, 0.3]);
    speckle(ctx, random, 7000, whole, [0.5, 1.5], [226, 214, 186], [0.14, 0.4]);
    speckle(ctx, random, 700, whole, [1, 2.3], [58, 46, 34], [0.15, 0.32]);
  },
};

/** How much of a root image's half-width the foot itself fills. Keep in step with `fit.ts`. */
const ROOT_FILL = 0.46;

interface Foot {
  /** Centre and radius, as shares of the solid radius. */
  x: number;
  y: number;
  r: number;
  wobble: number;
}

/** A skirt of algae on the mud around something: thick in places, missing in others. Drawn before the thing itself. */
function algaeSkirt(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  cx: number,
  cy: number,
  radius: number,
  strength = 1,
): void {
  const film = mix(ALGAE, MUD, 0.3);
  for (let index = 0; index < 9; index++) {
    const angle = (index / 9) * TAU + random() * 0.6;
    const distance = radius * (0.45 + random() * 0.3);
    const r = radius * (0.26 + random() * 0.3);
    ctx.save();
    tracePath(
      ctx,
      blob(random, cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, r, 0.24, 11),
    );
    softFill(ctx, rgba(film, (0.2 + random() * 0.22) * strength), ALGAE_DARK, 12, 0.28 * strength);
    ctx.restore();
  }
  for (let index = 0; index < 70; index++) {
    const angle = random() * TAU;
    const distance = radius * (0.5 + random() * 0.5);
    const x = cx + Math.cos(angle) * distance;
    const y = cy + Math.sin(angle) * distance;
    ctx.fillStyle = rgba(
      random() < 0.5 ? ALGAE_LIGHT : ALGAE_DARK,
      (0.18 + random() * 0.3) * strength,
    );
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + random() * 1.8, 0, TAU);
    ctx.fill();
  }
}

/** Fine roots that spread from a root's end into the mud. Drawn before the root. */
function rootlets(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  x: number,
  y: number,
  radius: number,
): void {
  const count = 7;
  ctx.save();
  ctx.lineCap = 'round';
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * TAU + random() * 0.7;
    const bend = (random() - 0.5) * 1.1;
    const reach = radius * (1.25 + random() * 0.55);
    const fromX = x + Math.cos(angle) * radius * 0.7;
    const fromY = y + Math.sin(angle) * radius * 0.7;
    const midX = x + Math.cos(angle + bend * 0.4) * reach * 0.8;
    const midY = y + Math.sin(angle + bend * 0.4) * reach * 0.8;
    const toX = x + Math.cos(angle + bend) * reach;
    const toY = y + Math.sin(angle + bend) * reach;
    // Thick where it leaves the root, a thread at its end.
    for (const [share, width, alpha] of [
      [0.55, 5.5, 0.7],
      [1, 2.4, 0.6],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.quadraticCurveTo(midX, midY, midX + (toX - midX) * share, midY + (toY - midY) * share);
      ctx.strokeStyle = rgba(ROOT, alpha);
      ctx.lineWidth = width * (0.7 + radius / 120);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * One limb of a prop root, seen from above: a thick band that comes down from
 * the tree and ends, rounded, where it enters the mud at (x, y). `radius` is
 * the size of that rounded end.
 */
function limb(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  x: number,
  y: number,
  radius: number,
  angle: number,
  reach: number,
  rounded: boolean,
): void {
  const side = (random() - 0.5) * 0.5;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const line = sampleCurve(
    [
      { x: x - cos * radius, y: y - sin * radius },
      { x, y },
      { x: x + Math.cos(angle + side) * reach * 0.5, y: y + Math.sin(angle + side) * reach * 0.5 },
      { x: x + cos * reach, y: y + sin * reach },
    ],
    36,
  );
  // How far along the limb each sample is, so that the rounded end keeps its shape.
  const along: number[] = [0];
  for (let index = 1; index < line.length; index++) {
    const from = line[index - 1] as Point;
    const to = line[index] as Point;
    along.push((along[index - 1] as number) + Math.hypot(to.x - from.x, to.y - from.y));
  }
  const last = line.length - 1;
  const waist = radius * 1.5;
  const lumps = random() * TAU;
  const width = (t: number): number => {
    const s = along[Math.round(t * last)] as number;
    const full = radius * 2;
    let w: number;
    if (s < radius) w = rounded ? 2 * Math.sqrt(radius * radius - (radius - s) ** 2) : full;
    else {
      const ease = Math.min(1, (s - radius) / (radius * 1.3));
      w = full + (waist - full) * (ease * ease * (3 - 2 * ease));
    }
    return Math.max(1, w * (1 + 0.035 * Math.sin(lumps + s / 17)));
  };

  band(ctx, line, width, ROOT, ROOT_LIGHT, ROOT_DARK);

  // Bark: grain that runs along the limb, pores that run across it.
  ctx.save();
  traceRibbon(ctx, line, width);
  ctx.clip();
  const area = { x: x - reach * 1.2, y: y - reach * 1.2, w: reach * 2.4, h: reach * 2.4 };
  patches(
    ctx,
    random,
    14,
    area,
    [radius * 0.2, radius * 0.55],
    [ROOT_LIGHT, ROOT_DARK],
    [0.08, 0.2],
  );
  const offset = (index: number, across: number): Point => {
    const point = line[index] as Point;
    const before = line[Math.max(0, index - 1)] as Point;
    const after = line[Math.min(last, index + 1)] as Point;
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const w = width(index / last) * across;
    return {
      x: point.x - ((after.y - before.y) / length) * w,
      y: point.y + ((after.x - before.x) / length) * w,
    };
  };
  ctx.lineCap = 'round';
  for (let index = 0; index < 9; index++) {
    const across = (random() - 0.5) * 0.78;
    const from = 2 + Math.floor(random() * (last * 0.5));
    const to = Math.min(last, from + 5 + Math.floor(random() * (last * 0.5)));
    ctx.beginPath();
    for (let step = from; step <= to; step++) {
      const point = offset(step, across + 0.02 * Math.sin(step * 0.9 + index));
      if (step === from) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = rgba(random() < 0.7 ? ROOT_DARK : ROOT_LIGHT, 0.16 + random() * 0.2);
    ctx.lineWidth = 0.8 + random() * 1.4;
    ctx.stroke();
  }
  for (let index = 0; index < 20; index++) {
    const at = 2 + Math.floor(random() * (last - 3));
    const point = offset(at, (random() - 0.5) * 0.74);
    const before = line[at - 1] as Point;
    const after = line[at + 1] as Point;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(Math.atan2(after.y - before.y, after.x - before.x) + Math.PI / 2);
    ctx.fillStyle = rgba([172, 144, 108], 0.22 + random() * 0.26);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.2 + random() * 3, 0.9 + random() * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  speckle(ctx, random, 110, area, [0.5, 1.3], ROOT_DARK, [0.12, 0.34]);
  ctx.restore();
}

/**
 * A prop root where it enters the mud, seen from above. A thick limb comes
 * down from the tree, out of sight above the water, and ends in the mud; that
 * rounded end is solid. Fine roots spread from it. Around it lie a skirt of
 * algae and a ring of scoured mud.
 */
function root(seed: number, feet: readonly Foot[], arches: readonly number[]): Painter {
  return {
    width: 320,
    height: 320,
    paint(ctx, size) {
      const random = seededRandom(seed);
      const centre = size / 2;
      const solid = centre * ROOT_FILL;
      const reach = solid * 2.15;

      // Under everything: the scoured mud, the algae, the fine roots.
      glow(ctx, centre + solid * 0.14, centre + solid * 0.18, solid * 2.1, MUD_DARK, 0.55, 0.42);
      algaeSkirt(ctx, random, centre + solid * 0.05, centre + solid * 0.08, solid * 1.42);
      for (const foot of feet) {
        rootlets(ctx, random, centre + foot.x * solid, centre + foot.y * solid, foot.r * solid);
      }

      // The limbs, on their own sheet so that they can fade as they rise out of the water.
      onLayer(ctx, (sheet) => {
        [...feet].reverse().forEach((foot, order) => {
          const first = order === feet.length - 1;
          const x = centre + foot.x * solid;
          const y = centre + foot.y * solid;
          const radius = foot.r * solid;
          // A smaller foot beside the first is a second limb of the same tree.
          const angles = first ? arches : [(arches[0] ?? 0) + 0.42];
          [...angles].reverse().forEach((angle, index) => {
            const main = index === angles.length - 1;
            const far = Math.hypot(x - centre, y - centre);
            limb(sheet, random, x, y, radius, angle, reach + far, main);
          });
        });
        sheet.save();
        sheet.globalCompositeOperation = 'destination-out';
        const fade = sheet.createRadialGradient(
          centre,
          centre,
          solid * 1.12,
          centre,
          centre,
          solid * 2.12,
        );
        fade.addColorStop(0, 'rgba(0,0,0,0)');
        fade.addColorStop(1, 'rgba(0,0,0,1)');
        sheet.fillStyle = fade;
        sheet.fillRect(0, 0, size, size);
        sheet.restore();
      });

      // Where each limb meets the mud: silt against its end, algae on the side away from the light.
      for (const foot of feet) {
        const x = centre + foot.x * solid;
        const y = centre + foot.y * solid;
        const radius = foot.r * solid;
        const angle = arches[0] ?? 0;
        glow(
          ctx,
          x - Math.cos(angle) * radius * 1.05,
          y - Math.sin(angle) * radius * 1.05,
          radius * 0.62,
          MUD,
          0.75,
          0.2,
        );
        glow(ctx, x + radius * 0.5, y + radius * 0.6, radius * 0.75, ALGAE, 0.3);
      }
    },
  };
}

/** How much of the clump image's half-width is solid. Keep in step with `fit.ts`. */
const CLUMP_FILL = 0.62;

/**
 * The roots of one tree, seen from above. The limbs come down all round from
 * the trunk, which is out of sight above the water, and stand in a ring. The
 * dark heart between them is solid. It closes the end of an edge strip.
 */
const clump: Painter = {
  width: 640,
  height: 640,
  paint(ctx, size) {
    const random = seededRandom(239);
    const centre = size / 2;
    const solid = centre * CLUMP_FILL;

    glow(ctx, centre + 10, centre + 14, solid * 1.55, MUD_DARK, 0.5, 0.5);

    const feet: { x: number; y: number; r: number; angle: number; seed: number }[] = [];
    const count = 12;
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * TAU + (random() - 0.5) * 0.3;
      const distance = solid * (0.8 + random() * 0.18);
      feet.push({
        x: centre + Math.cos(angle) * distance,
        y: centre + Math.sin(angle) * distance,
        r: 22 + random() * 15,
        angle: angle + Math.PI + (random() - 0.5) * 0.5,
        seed: Math.floor(random() * 100000),
      });
    }
    for (const foot of feet) {
      const local = seededRandom(foot.seed);
      algaeSkirt(ctx, local, foot.x, foot.y + 4, foot.r * 1.6, 0.8);
      rootlets(ctx, local, foot.x, foot.y, foot.r);
    }

    // The heart: shade under the tree, with roots half seen in it.
    const heart = blob(random, centre, centre, solid * 0.8, 0.09, 20);
    ctx.save();
    tracePath(ctx, heart);
    const fill = ctx.createRadialGradient(centre, centre, solid * 0.1, centre, centre, solid * 0.8);
    fill.addColorStop(0, rgba(ROOT_DARK, 1));
    fill.addColorStop(1, rgba(ROOT, 1));
    softFill(ctx, fill, ROOT_DARK, 16, 0.85);
    ctx.clip();
    for (let index = 0; index < 12; index++) {
      const angle = random() * TAU;
      const x = centre + (random() - 0.5) * solid;
      const y = centre + (random() - 0.5) * solid;
      const length = 110 + random() * 150;
      const line = sampleCurve(
        [
          { x: x - (Math.cos(angle) * length) / 2, y: y - (Math.sin(angle) * length) / 2 },
          { x: x + Math.sin(angle) * 22, y: y - Math.cos(angle) * 22 },
          { x: x + (Math.cos(angle) * length) / 2, y: y + (Math.sin(angle) * length) / 2 },
        ],
        14,
      );
      band(ctx, line, () => 20 + random() * 4, ROOT, ROOT_LIGHT, ROOT_DARK, 0.5);
    }
    glow(ctx, centre, centre, solid * 0.75, ROOT_DARK, 0.9, 0.25);
    ctx.restore();

    // The limbs, lost in the shade toward the trunk.
    onLayer(ctx, (sheet) => {
      for (const foot of feet) {
        const reach = Math.hypot(foot.x - centre, foot.y - centre) * 0.92;
        limb(sheet, seededRandom(foot.seed + 1), foot.x, foot.y, foot.r, foot.angle, reach, true);
      }
      sheet.save();
      sheet.globalCompositeOperation = 'destination-out';
      const lost = sheet.createRadialGradient(
        centre,
        centre,
        solid * 0.12,
        centre,
        centre,
        solid * 0.72,
      );
      lost.addColorStop(0, 'rgba(0,0,0,0.9)');
      lost.addColorStop(1, 'rgba(0,0,0,0)');
      sheet.fillStyle = lost;
      sheet.fillRect(0, 0, size, size);
      sheet.restore();
    });
    for (const foot of feet) {
      glow(ctx, foot.x + foot.r * 0.4, foot.y + foot.r * 0.7, foot.r * 0.8, ALGAE, 0.3);
    }
  },
};

/**
 * The edge of the mangrove: root feet packed into a dark mass. The mass is at
 * the top of the image and the open mud is below. Repeats sideways.
 */
const wall: Painter = {
  width: 1024,
  height: 420,
  paint(ctx, width, height) {
    const random = seededRandom(151);
    const phaseA = random() * TAU;
    const phaseB = random() * TAU;
    const edge = (x: number): number =>
      236 +
      24 * Math.sin((x / width) * TAU * 3 + phaseA) +
      13 * Math.sin((x / width) * TAU * 7 + phaseB);

    // Shade on the mud in front of the mass.
    for (let x = 0; x < width; x += 32) {
      glow(ctx, x + 16, edge(x + 16) + 10, 130, MUD_DARK, 0.2);
    }

    // The mass.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    for (let x = width; x >= 0; x -= 8) ctx.lineTo(x, edge(x));
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, 270);
    fill.addColorStop(0, rgba(ROOT_DARK, 1));
    fill.addColorStop(1, rgba(ROOT, 1));
    softFill(ctx, fill, ROOT_DARK, 14, 0.8);

    // Roots inside it: arches crossing, half seen.
    ctx.save();
    ctx.clip();
    for (let index = 0; index < 26; index++) {
      const x = random() * width;
      const y = 20 + random() * 200;
      const angle = random() * TAU;
      const length = 120 + random() * 200;
      const thick = 22 + random() * 30;
      wrapped(
        width,
        x,
        y,
        length,
        (px, py) => {
          const line = sampleCurve(
            [
              { x: px - (Math.cos(angle) * length) / 2, y: py - (Math.sin(angle) * length) / 2 },
              { x: px + Math.sin(angle) * 24, y: py - Math.cos(angle) * 24 },
              { x: px + (Math.cos(angle) * length) / 2, y: py + (Math.sin(angle) * length) / 2 },
            ],
            14,
          );
          band(ctx, line, () => thick, ROOT, ROOT_LIGHT, ROOT_DARK, 0.45 + (y / 220) * 0.4);
        },
        true,
      );
    }
    // Deep shade toward the outside.
    const shade = ctx.createLinearGradient(0, 0, 0, 200);
    shade.addColorStop(0, rgba(ROOT_DARK, 0.85));
    shade.addColorStop(1, rgba(ROOT_DARK, 0));
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, 220);
    ctx.restore();

    // The front row: limbs that come out of the mass and end in the mud, each with its algae.
    const feet: { x: number; y: number; r: number; angle: number; seed: number }[] = [];
    for (let x = 20; x < width - 30; x += 50 + random() * 44) {
      feet.push({
        x,
        y: edge(x) - 16 + random() * 50,
        r: 20 + random() * 20,
        angle: -Math.PI / 2 + (random() - 0.5) * 1.1,
        seed: Math.floor(random() * 100000),
      });
    }
    for (const foot of feet) {
      wrapped(
        width,
        foot.x,
        foot.y,
        foot.r * 3,
        (px, py) => {
          const local = seededRandom(foot.seed);
          algaeSkirt(ctx, local, px, py + 6, foot.r * 1.5, 0.8);
          rootlets(ctx, local, px, py, foot.r);
        },
        true,
      );
    }
    onLayer(ctx, (sheet) => {
      for (const foot of feet) {
        const reach = 150 + (foot.seed % 90);
        wrapped(
          width,
          foot.x,
          foot.y,
          reach + foot.r,
          (px, py) =>
            limb(sheet, seededRandom(foot.seed + 1), px, py, foot.r, foot.angle, reach, true),
          true,
        );
      }
      // They are lost in the shade of the mass.
      sheet.save();
      sheet.globalCompositeOperation = 'destination-out';
      const lost = sheet.createLinearGradient(0, 40, 0, 215);
      lost.addColorStop(0, 'rgba(0,0,0,0.8)');
      lost.addColorStop(1, 'rgba(0,0,0,0)');
      sheet.fillStyle = lost;
      sheet.fillRect(0, 0, width, 215);
      sheet.restore();
    });
    for (const foot of feet) {
      wrapped(
        width,
        foot.x,
        foot.y,
        foot.r * 2,
        (px, py) => glow(ctx, px + foot.r * 0.4, py + foot.r * 0.7, foot.r * 0.8, ALGAE, 0.3),
        true,
      );
    }
    void height;
  },
};

/**
 * The mud bank at the top of the mangrove: out of the water, drier and paler,
 * where the fiddler crabs live. The bank is at the top of the image and the
 * waterline runs along its foot. Repeats sideways.
 */
const bank: Painter = {
  width: 1024,
  height: 420,
  paint(ctx, width, height) {
    const random = seededRandom(157);
    const phaseA = random() * TAU;
    const phaseB = random() * TAU;
    const edge = (x: number): number =>
      252 +
      12 * Math.sin((x / width) * TAU * 2 + phaseA) +
      6 * Math.sin((x / width) * TAU * 5 + phaseB);
    const dry: Rgb = [164, 140, 106];
    const damp: Rgb = [112, 88, 62];

    // Very shallow water at the foot of the bank: the mud shows brighter through it.
    for (let x = 0; x < width; x += 28) {
      glow(ctx, x + 14, edge(x + 14) + 16, 110, [168, 138, 96], 0.14);
    }

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    for (let x = width; x >= 0; x -= 8) ctx.lineTo(x, edge(x));
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, 0, 0, 270);
    fill.addColorStop(0, rgba(dry, 1));
    fill.addColorStop(0.6, rgba(mix(dry, damp, 0.35), 1));
    fill.addColorStop(1, rgba(damp, 1));
    softFill(ctx, fill, MUD_DARK, 8, 0.5);

    ctx.save();
    ctx.clip();
    // Sun-dried pools and darker damp ones.
    for (let index = 0; index < 60; index++) {
      const x = random() * width;
      const y = random() * 250;
      const radius = 30 + random() * 90;
      const color = random() < 0.5 ? ([196, 174, 138] as Rgb) : damp;
      const strength = 0.1 + random() * 0.16;
      wrapped(width, x, y, radius, (px, py) => glow(ctx, px, py, radius, color, strength), true);
    }
    // Fine cracks where the top has dried.
    ctx.strokeStyle = rgba(damp, 0.4);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (let index = 0; index < 46; index++) {
      let x = random() * width;
      let y = random() * 150;
      let angle = random() * TAU;
      const steps = 3 + Math.floor(random() * 4);
      const seed = Math.floor(random() * 100000);
      wrapped(
        width,
        x,
        y,
        90,
        (px, py) => {
          const local = seededRandom(seed);
          x = px;
          y = py;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let step = 0; step < steps; step++) {
            angle += (local() - 0.5) * 1.3;
            x += Math.cos(angle) * 14;
            y += Math.sin(angle) * 14;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        },
        true,
      );
    }
    const whole = { x: 0, y: 0, w: width, h: 270 };
    speckle(ctx, random, 2600, whole, [0.5, 1.4], damp, [0.12, 0.34]);
    speckle(ctx, random, 1500, whole, [0.5, 1.3], [222, 204, 170], [0.12, 0.34]);
    // The band the water wets as it rises and falls.
    for (let x = 0; x < width; x += 20) {
      glow(ctx, x + 10, edge(x + 10) - 6, 44, [74, 56, 38], 0.3);
    }
    ctx.restore();

    // The waterline: a thin bright line, broken here and there.
    ctx.lineCap = 'round';
    let x = 0;
    while (x < width) {
      const length = 30 + random() * 90;
      ctx.strokeStyle = rgba([236, 224, 190], 0.35 + random() * 0.35);
      ctx.lineWidth = 1.6 + random() * 1.4;
      ctx.beginPath();
      for (let step = 0; step <= 6; step++) {
        const sx = Math.min(width, x + (length * step) / 6);
        if (step === 0) ctx.moveTo(sx, edge(sx) + 2);
        else ctx.lineTo(sx, edge(sx) + 2);
      }
      ctx.stroke();
      x += length + 6 + random() * 22;
    }
    void height;
  },
};

interface Arch {
  /** The points the root passes through, from one foot to the other. */
  points: Point[];
  width: number;
}

/** A root between two points that bows to one side as it rises. */
function bowed(random: () => number, from: Point, to: Point, bow: number, width: number): Arch {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // At right angles to the straight line between the feet.
  const nx = -dy * bow;
  const ny = dx * bow;
  const early = 0.28 + random() * 0.1;
  const late = 0.66 + random() * 0.1;
  return {
    points: [
      from,
      { x: from.x + dx * early + nx * 0.8, y: from.y + dy * early + ny * 0.8 },
      { x: from.x + dx * late + nx, y: from.y + dy * late + ny },
      to,
    ],
    width,
  };
}

/** Arching roots between points on a circle. Some fork on the way down. */
function arches(
  random: () => number,
  centre: number,
  reach: number,
  count: number,
  width: readonly [number, number],
  span: readonly [number, number],
  forks = 0,
): Arch[] {
  const result: Arch[] = [];
  const polar = (angle: number, r: number): Point => ({
    x: centre + Math.cos(angle) * r,
    y: centre + Math.sin(angle) * r,
  });
  for (let index = 0; index < count; index++) {
    const a1 = (index / count) * TAU + random() * 0.7;
    const a2 = a1 + Math.PI * (span[0] + random() * (span[1] - span[0]));
    const from = polar(a1, reach * (0.7 + random() * 0.28));
    const to = polar(a2, reach * (0.7 + random() * 0.28));
    const bow = (random() < 0.5 ? -1 : 1) * (0.16 + random() * 0.26);
    const w = width[0] + random() * (width[1] - width[0]);
    const arch = bowed(random, from, to, bow, w);
    result.push(arch);
    if (random() < forks) {
      // A second root leaves the first near its top and comes down elsewhere.
      const line = sampleCurve(arch.points, 20);
      const start = line[7 + Math.floor(random() * 6)] as Point;
      const away = Math.atan2(start.y - centre, start.x - centre) + (random() - 0.5) * 1.6;
      const end = polar(away, reach * (0.78 + random() * 0.2));
      result.push(bowed(random, start, end, (random() - 0.5) * 0.5, w * (0.55 + random() * 0.2)));
    }
  }
  return result;
}

function drawArch(ctx: CanvasRenderingContext2D, arch: Arch): void {
  const line = sampleCurve(arch.points, 30);
  // The top of the arch is nearer the eye: wider there.
  band(
    ctx,
    line,
    (t) => arch.width * (0.76 + 0.42 * Math.sin(Math.PI * t)),
    ROOT,
    ROOT_LIGHT,
    ROOT_DARK,
  );
}

function archEnds(arch: Arch): [Point, Point] {
  return [arch.points[0] as Point, arch.points[arch.points.length - 1] as Point];
}

function drawFoot(
  ctx: CanvasRenderingContext2D,
  random: () => number,
  x: number,
  y: number,
  radius: number,
): void {
  const shape = blob(random, x, y, radius, 0.08, 12);
  ctx.save();
  tracePath(ctx, shape);
  softFill(ctx, litWash(ctx, x, y, radius, ROOT_LIGHT, ROOT, ROOT_DARK), ROOT_DARK, 6, 0.7);
  ctx.clip();
  glow(ctx, x + radius * 0.4, y + radius * 0.5, radius * 0.9, ALGAE, 0.35);
  speckle(
    ctx,
    random,
    30,
    { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 },
    [0.5, 1.4],
    ROOT_DARK,
    [0.15, 0.4],
  );
  ctx.restore();
}

/** How much of a tangle image's half-width the tangle fills. Keep in step with `fit.ts`. */
const TANGLE_FILL = 0.9;

/**
 * A root tangle: arching roots crossing each other, with gaps of mud between.
 * The shrimp goes under it. It must still read when faded to 40%.
 */
function tangle(seed: number, thick: number, thin: number): Painter {
  return {
    width: 900,
    height: 900,
    paint(ctx, size) {
      const random = seededRandom(seed);
      const centre = size / 2;
      const reach = centre * TANGLE_FILL;

      // Shade among the roots.
      glow(ctx, centre + 14, centre + 18, reach * 1.04, [22, 16, 11], 0.36, 0.3);

      const fine = arches(random, centre, reach * 0.92, thin, [9, 17], [0.3, 0.75]);
      const main = arches(random, centre, reach * 0.98, thick, [36, 60], [0.6, 1.2], 0.7);
      for (const arch of fine) drawArch(ctx, arch);
      main.sort((a, b) => a.width - b.width);
      for (const arch of main) {
        // Where a root enters the mud.
        for (const end of archEnds(arch)) drawFoot(ctx, random, end.x, end.y, arch.width * 0.6);
      }
      for (const arch of main) drawArch(ctx, arch);
    },
  };
}

/**
 * The hollow: a ring of thick roots, roofed over, with one opening.
 * The opening faces right. Darker inside.
 */
const hollow: Painter = {
  width: 1100,
  height: 1100,
  paint(ctx, size) {
    const random = seededRandom(211);
    const centre = size / 2;
    const reach = centre * TANGLE_FILL;
    const ring = reach * 0.8;
    /** Half of the opening, in radians. */
    const gap = 0.42;

    // The dark inside.
    glow(ctx, centre, centre, reach * 0.98, [18, 13, 9], 0.62, 0.55);

    // The ring: thick roots end to end, leaving the opening.
    const posts: Point[] = [];
    const steps = 9;
    for (let index = 0; index <= steps; index++) {
      const angle = gap + ((TAU - gap * 2) * index) / steps;
      const r = ring * (0.96 + random() * 0.1);
      posts.push({ x: centre + Math.cos(angle) * r, y: centre + Math.sin(angle) * r });
    }
    for (let index = 0; index < posts.length - 1; index++) {
      const from = posts[index] as Point;
      const to = posts[index + 1] as Point;
      // Bowed outward, so the ring is round.
      drawArch(ctx, bowed(random, from, to, -0.2, 62 + random() * 26));
    }

    // The roof: roots thrown across from side to side.
    const roof = arches(random, centre, ring * 1.1, 7, [30, 52], [0.75, 1.15], 0.4).filter(
      (arch) => {
        // Keep the opening clear.
        return arch.points.every((point) => {
          const angle = Math.atan2(point.y - centre, point.x - centre);
          const far = Math.hypot(point.x - centre, point.y - centre);
          return !(Math.abs(angle) < gap * 1.5 && far > ring * 0.5);
        });
      },
    );
    roof.sort((a, b) => a.width - b.width);
    for (const arch of arches(random, centre, ring, 7, [9, 15], [0.4, 0.9])) drawArch(ctx, arch);
    for (const arch of roof) drawArch(ctx, arch);

    // The posts on top.
    for (const post of posts) drawFoot(ctx, random, post.x, post.y, 40 + random() * 14);
  },
};

/** A green leaf lying on the surface. Its stalk is at the left. */
function floatingLeaf(seed: number, tint: Rgb, bend: number, nick: boolean): Painter {
  return {
    width: 560,
    height: 320,
    paint(ctx, width, height) {
      const random = seededRandom(seed);
      const x0 = 34;
      const length = width - 60;
      const mid = height / 2;
      const half = 118;
      const light = mix(tint, LEAF_LIGHT, 0.6);
      const dark = mix(tint, LEAF_DARK, 0.7);
      const spine = (t: number): number => mid + bend * Math.sin(Math.PI * t);

      // The stalk.
      ctx.strokeStyle = rgba(mix(dark, DEAD_LEAF, 0.4), 0.95);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(12, mid + 5);
      ctx.quadraticCurveTo(24, mid + 3, x0 + 12, mid);
      ctx.stroke();

      const fill = ctx.createLinearGradient(0, mid - half, 0, mid + half);
      fill.addColorStop(0, rgba(light, 1));
      fill.addColorStop(0.5, rgba(tint, 1));
      fill.addColorStop(1, rgba(dark, 1));
      ctx.save();
      traceLeaf(ctx, x0, mid, length, half, bend);
      softFill(ctx, fill, dark, 7, 0.6);
      ctx.clip();

      patches(
        ctx,
        random,
        16,
        { x: x0, y: mid - half, w: length, h: half * 2 },
        [30, 90],
        [light, dark, LEAF_PALE],
        [0.06, 0.16],
      );

      // Gloss: the upper half catches the sky.
      ctx.save();
      ctx.translate(x0 + length * 0.42, mid - half * 0.45 + bend * 0.8);
      ctx.scale(1, 0.2);
      glow(ctx, 0, 0, length * 0.36, [255, 255, 240], 0.3);
      ctx.restore();

      // Side veins, curving toward the tip.
      ctx.strokeStyle = rgba(LEAF_PALE, 0.3);
      ctx.lineWidth = 1.6;
      for (let index = 1; index < 11; index++) {
        const t = index / 11.5;
        const x = x0 + t * length;
        const y = spine(t);
        const reachY = half * Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.92;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(
            x + length * 0.06,
            y + side * reachY * 0.6,
            x + length * 0.1,
            y + side * reachY,
          );
          ctx.stroke();
        }
      }
      // The midrib.
      ctx.strokeStyle = rgba(LEAF_PALE, 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        const x = x0 + t * length * 0.97;
        if (step === 0) ctx.moveTo(x, spine(t));
        else ctx.lineTo(x, spine(t));
      }
      ctx.stroke();

      // A few spots.
      speckle(
        ctx,
        random,
        26,
        { x: x0 + 20, y: mid - half * 0.7, w: length - 60, h: half * 1.4 },
        [1.2, 3.4],
        mix(dark, DEAD_LEAF_DARK, 0.5),
        [0.2, 0.45],
      );
      ctx.restore();

      if (nick) {
        // Something has grazed the edge.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        tracePath(ctx, blob(random, x0 + length * 0.62, mid + half * 0.86, 26, 0.2, 9));
        ctx.fill();
        ctx.restore();
      }

      traceLeaf(ctx, x0, mid, length, half, bend);
      ctx.strokeStyle = rgba(dark, 0.5);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    },
  };
}

/** A brown fallen leaf on the bed: soft, spotted with decay, its edge eaten to lace. */
const fallenLeaf: Painter = {
  width: 520,
  height: 300,
  paint(ctx, width, height) {
    const random = seededRandom(271);
    const x0 = 26;
    const length = width - 52;
    const mid = height / 2;
    const half = 110;
    const bend = -10;
    const spine = (t: number): number => mid + bend * Math.sin(Math.PI * t);

    const fill = ctx.createLinearGradient(0, mid - half, width, mid + half);
    fill.addColorStop(0, rgba(DEAD_LEAF_LIGHT, 0.96));
    fill.addColorStop(0.5, rgba(DEAD_LEAF, 0.96));
    fill.addColorStop(1, rgba(DEAD_LEAF_DARK, 0.96));
    ctx.save();
    traceLeaf(ctx, x0, mid, length, half, bend);
    softFill(ctx, fill, DEAD_LEAF_DARK, 8, 0.6);
    ctx.clip();

    const area = { x: x0, y: mid - half, w: length, h: half * 2 };
    patches(ctx, random, 22, area, [24, 80], [DEAD_LEAF_LIGHT, DEAD_LEAF_DARK], [0.08, 0.22]);
    // Pale spots where the leaf is rotting through.
    for (let index = 0; index < 16; index++) {
      const t = 0.1 + random() * 0.8;
      const x = x0 + t * length;
      const y = spine(t) + (random() - 0.5) * half * 1.3 * Math.sin(Math.PI * t);
      const radius = 5 + random() * 12;
      tracePath(ctx, blob(random, x, y, radius, 0.25, 9));
      ctx.fillStyle = rgba([206, 186, 142], 0.3 + random() * 0.25);
      ctx.fill();
      ctx.strokeStyle = rgba(DEAD_LEAF_DARK, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // A film of green: what the shrimp comes for.
    for (let index = 0; index < 7; index++) {
      const t = 0.15 + random() * 0.7;
      glow(
        ctx,
        x0 + t * length,
        spine(t) + (random() - 0.5) * half,
        36 + random() * 44,
        ALGAE_LIGHT,
        0.2 + random() * 0.14,
      );
    }
    // Veins stand out pale as the leaf thins.
    ctx.strokeStyle = rgba([212, 190, 148], 0.42);
    ctx.lineWidth = 1.4;
    for (let index = 1; index < 10; index++) {
      const t = index / 10.5;
      const x = x0 + t * length;
      const y = spine(t);
      const reachY = half * Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.94;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + length * 0.06,
          y + side * reachY * 0.6,
          x + length * 0.1,
          y + side * reachY,
        );
        ctx.stroke();
      }
    }
    ctx.strokeStyle = rgba([222, 200, 158], 0.7);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    for (let step = 0; step <= 20; step++) {
      const t = step / 20;
      const x = x0 + t * length * 0.97;
      if (step === 0) ctx.moveTo(x, spine(t));
      else ctx.lineTo(x, spine(t));
    }
    ctx.stroke();
    speckle(ctx, random, 200, area, [0.6, 1.6], DEAD_LEAF_DARK, [0.15, 0.4]);
    ctx.restore();

    // The edge, eaten to lace, and a few holes right through.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let index = 0; index < 34; index++) {
      const t = 0.08 + random() * 0.86;
      const side = random() < 0.5 ? -1 : 1;
      const edge = half * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85);
      const inward = random() < 0.25 ? 0.35 + random() * 0.4 : 0.92 + random() * 0.14;
      const x = x0 + t * length;
      const y = spine(t) + side * edge * inward;
      tracePath(ctx, blob(random, x, y, 3 + random() * 9, 0.3, 8));
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    traceLeaf(ctx, x0, mid, length, half, bend);
    ctx.strokeStyle = rgba(DEAD_LEAF_DARK, 0.55);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  },
};

/** A film of algae on the mud or on a root's skirt. Thicker in the middle, with tiny bubbles. */
const algaeFilm: Painter = {
  width: 320,
  height: 320,
  paint(ctx, size) {
    const random = seededRandom(307);
    const centre = size / 2;

    // Several pools that run into each other.
    const pools: { x: number; y: number; r: number }[] = [{ x: centre, y: centre, r: 92 }];
    for (let index = 0; index < 7; index++) {
      const angle = random() * TAU;
      const distance = 30 + random() * 62;
      pools.push({
        x: centre + Math.cos(angle) * distance,
        y: centre + Math.sin(angle) * distance,
        r: 38 + random() * 40,
      });
    }
    for (const pool of pools) {
      ctx.save();
      tracePath(ctx, blob(random, pool.x, pool.y, pool.r, 0.18, 13));
      softFill(ctx, rgba(ALGAE, 0.26), ALGAE_DARK, 22, 0.3);
      ctx.restore();
    }
    for (const pool of pools) glow(ctx, pool.x, pool.y, pool.r * 0.9, ALGAE_LIGHT, 0.34);
    glow(ctx, centre, centre, 80, [120, 150, 70], 0.4);

    // The film is made of fine threads and dots.
    for (let index = 0; index < 420; index++) {
      const pool = pools[Math.floor(random() * pools.length)] as {
        x: number;
        y: number;
        r: number;
      };
      const angle = random() * TAU;
      const distance = pool.r * Math.sqrt(random()) * 0.95;
      const x = pool.x + Math.cos(angle) * distance;
      const y = pool.y + Math.sin(angle) * distance;
      ctx.fillStyle = rgba(random() < 0.55 ? ALGAE_LIGHT : ALGAE_DARK, 0.25 + random() * 0.4);
      ctx.beginPath();
      ctx.arc(x, y, 0.7 + random() * 1.8, 0, TAU);
      ctx.fill();
    }
    // Bubbles: a pale ring, brighter on the side toward the light.
    for (let index = 0; index < 16; index++) {
      const pool = pools[Math.floor(random() * pools.length)] as {
        x: number;
        y: number;
        r: number;
      };
      const angle = random() * TAU;
      const distance = pool.r * Math.sqrt(random()) * 0.7;
      const x = pool.x + Math.cos(angle) * distance;
      const y = pool.y + Math.sin(angle) * distance;
      const radius = 1.6 + random() * 2.6;
      ctx.strokeStyle = 'rgba(236,240,214,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(248,250,232,0.75)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.35, y - radius * 0.4, radius * 0.32, 0, TAU);
      ctx.fill();
    }
  },
};

/** Small things on the mud: a scrap of leaf, a twig, a piece of bark. */
function litter(kind: 'scrap' | 'twig' | 'bark'): Painter {
  return {
    width: 128,
    height: 128,
    paint(ctx, size) {
      const centre = size / 2;
      if (kind === 'scrap') {
        const random = seededRandom(331);
        ctx.save();
        traceLeaf(ctx, 16, centre, 96, 30, 6);
        softFill(ctx, rgba(DEAD_LEAF, 0.92), DEAD_LEAF_DARK, 5, 0.5);
        ctx.clip();
        patches(
          ctx,
          random,
          8,
          { x: 16, y: centre - 30, w: 96, h: 60 },
          [10, 30],
          [DEAD_LEAF_LIGHT, DEAD_LEAF_DARK],
          [0.12, 0.3],
        );
        ctx.strokeStyle = rgba([212, 190, 148], 0.5);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(18, centre);
        ctx.quadraticCurveTo(64, centre + 6, 108, centre);
        ctx.stroke();
        ctx.restore();
        // Torn across.
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        tracePath(ctx, blob(random, 104, centre - 14, 22, 0.3, 9));
        ctx.fill();
        ctx.restore();
      } else if (kind === 'twig') {
        const random = seededRandom(337);
        const line = sampleCurve(
          [
            { x: 14, y: 76 },
            { x: 52, y: 60 },
            { x: 86, y: 58 },
            { x: 114, y: 44 },
          ],
          14,
        );
        band(ctx, line, (t) => 9 - 4 * t, BRANCH, BRANCH_LIGHT, BRANCH_DARK);
        const fork = sampleCurve(
          [
            { x: 56, y: 60 },
            { x: 74, y: 78 },
            { x: 96, y: 86 },
          ],
          8,
        );
        band(ctx, fork, (t) => 6 - 3 * t, BRANCH, BRANCH_LIGHT, BRANCH_DARK);
        void random;
      } else {
        const random = seededRandom(347);
        const shape: Point[] = [
          { x: 22, y: 48 },
          { x: 58, y: 36 },
          { x: 104, y: 46 },
          { x: 108, y: 74 },
          { x: 66, y: 92 },
          { x: 24, y: 80 },
        ].map((point) => ({
          x: point.x + (random() - 0.5) * 8,
          y: point.y + (random() - 0.5) * 8,
        }));
        ctx.save();
        tracePath(ctx, shape);
        softFill(
          ctx,
          litWash(ctx, centre, centre, 50, ROOT_LIGHT, mix(ROOT, MUD, 0.4), ROOT_DARK),
          ROOT_DARK,
          5,
          0.55,
        );
        ctx.clip();
        ctx.strokeStyle = rgba(ROOT_DARK, 0.4);
        ctx.lineWidth = 1.4;
        for (let index = 0; index < 6; index++) {
          const y = 40 + index * 9 + random() * 4;
          ctx.beginPath();
          ctx.moveTo(18, y);
          ctx.quadraticCurveTo(64, y - 6 + random() * 12, 112, y + 2);
          ctx.stroke();
        }
        speckle(ctx, random, 40, { x: 18, y: 32, w: 94, h: 64 }, [0.5, 1.4], ROOT_DARK, [0.2, 0.4]);
        ctx.restore();
      }
    },
  };
}

/** A mangrove seedling standing in the mud where it dropped, seen end on. */
const seedPodStanding: Painter = {
  width: 96,
  height: 96,
  paint(ctx, size) {
    const random = seededRandom(359);
    const centre = size / 2;
    const radius = centre * 0.5;
    // A dimple in the mud where it went in.
    glow(ctx, centre + 2, centre + 3, radius * 1.8, MUD_DARK, 0.5, 0.4);
    const pod: Rgb = [104, 112, 58];
    const shape = blob(random, centre, centre, radius, 0.05, 12);
    ctx.save();
    tracePath(ctx, shape);
    softFill(
      ctx,
      litWash(ctx, centre, centre, radius, [176, 180, 110], pod, [52, 56, 30]),
      [40, 44, 24],
      5,
      0.7,
    );
    ctx.clip();
    // The scar where it hung from the tree: a small pale ring, off centre.
    ctx.strokeStyle = rgba([150, 130, 86], 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centre - 2, centre - 3, radius * 0.3, 0, TAU);
    ctx.stroke();
    speckle(
      ctx,
      random,
      16,
      { x: centre - radius, y: centre - radius, w: radius * 2, h: radius * 2 },
      [0.6, 1.4],
      [50, 54, 28],
      [0.2, 0.4],
    );
    ctx.restore();
    tracePath(ctx, shape);
    ctx.strokeStyle = rgba([40, 44, 24], 0.55);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
};

/** A mangrove seedling lying on the mud: a long green-brown pencil, thicker at one end. */
const seedPodLying: Painter = {
  width: 420,
  height: 96,
  paint(ctx, width, height) {
    const random = seededRandom(367);
    const mid = height / 2;
    const line = sampleCurve(
      [
        { x: 18, y: mid + 4 },
        { x: 140, y: mid - 5 },
        { x: 280, y: mid + 3 },
        { x: 402, y: mid - 2 },
      ],
      30,
    );
    // Thin at the cap, swelling toward the far end, then a point.
    const profile = (t: number): number =>
      t < 0.86 ? 14 + 16 * Math.pow(t / 0.86, 0.9) : 30 * Math.pow((1 - t) / 0.14, 0.6) + 1;
    const pod: Rgb = [110, 116, 60];
    band(ctx, line, profile, pod, [182, 186, 116], [54, 58, 30]);
    // It browns toward the tip.
    ctx.save();
    traceRibbon(ctx, line, profile);
    ctx.clip();
    const brown = ctx.createLinearGradient(width * 0.45, 0, width, 0);
    brown.addColorStop(0, 'rgba(110,74,42,0)');
    brown.addColorStop(1, 'rgba(110,74,42,0.6)');
    ctx.fillStyle = brown;
    ctx.fillRect(0, 0, width, height);
    speckle(
      ctx,
      random,
      90,
      { x: 18, y: mid - 20, w: 384, h: 40 },
      [0.6, 1.5],
      [60, 48, 28],
      [0.2, 0.4],
    );
    ctx.restore();
    // The cap.
    ctx.fillStyle = rgba([86, 62, 38], 0.95);
    ctx.beginPath();
    ctx.ellipse(20, mid + 4, 9, 11, 0, 0, TAU);
    ctx.fill();
  },
};

/**
 * The sunken branch: grey-brown, with stubs of side branches. The left end
 * is half sunk in the mud. The right end is lifted, and the shrimp can go
 * under it.
 */
const sunkenBranch: Painter = {
  width: 1800,
  height: 520,
  paint(ctx, width, height) {
    const random = seededRandom(389);
    const mid = height / 2;
    const spine = sampleCurve(
      [
        { x: 40, y: mid + 40 },
        { x: 420, y: mid + 10 },
        { x: 900, y: mid - 26 },
        { x: 1360, y: mid - 6 },
        { x: 1760, y: mid - 50 },
      ],
      60,
    );
    const thickness = (t: number): number =>
      64 + 60 * t - 30 * Math.pow(Math.max(0, t - 0.86) / 0.14, 2);
    const at = (t: number): Point => spine[Math.round(t * (spine.length - 1))] as Point;

    // Shade under the lifted end.
    for (let index = 0; index < 12; index++) {
      const t = 0.45 + (index / 11) * 0.55;
      const point = at(t);
      glow(
        ctx,
        point.x + 20 * t,
        point.y + 30 * t,
        thickness(t) * (0.8 + t * 0.5),
        [20, 15, 11],
        0.16 * t,
      );
    }

    // Stubs of side branches, under the trunk.
    const stubs: [number, number, number][] = [
      [0.2, -1, 150],
      [0.36, 1, 210],
      [0.52, -1, 240],
      [0.66, 1, 170],
      [0.8, -1, 200],
      [0.9, 1, 130],
    ];
    for (const [t, side, length] of stubs) {
      const from = at(t);
      const lean = 0.5 + random() * 0.4;
      const line = sampleCurve(
        [
          from,
          { x: from.x + length * 0.45 * lean, y: from.y + side * length * 0.5 },
          { x: from.x + length * (0.7 + random() * 0.3) * lean, y: from.y + side * length * 0.92 },
        ],
        12,
      );
      band(ctx, line, (u) => (30 + 16 * t) * (1 - 0.6 * u), BRANCH, BRANCH_LIGHT, BRANCH_DARK);
      // A broken end.
      const end = line[line.length - 1] as Point;
      ctx.fillStyle = rgba([186, 168, 140], 0.75);
      ctx.beginPath();
      ctx.arc(end.x, end.y, (30 + 16 * t) * 0.18, 0, TAU);
      ctx.fill();
    }

    // The trunk.
    band(ctx, spine, thickness, BRANCH, BRANCH_LIGHT, BRANCH_DARK);

    ctx.save();
    traceRibbon(ctx, spine, thickness);
    ctx.clip();
    // Long cracks in the bark, along the grain.
    ctx.lineCap = 'round';
    for (let index = 0; index < 46; index++) {
      const t0 = random() * 0.9;
      const length = 0.04 + random() * 0.1;
      const offset = (random() - 0.5) * 0.8;
      ctx.strokeStyle = rgba(random() < 0.7 ? BRANCH_DARK : BRANCH_LIGHT, 0.2 + random() * 0.25);
      ctx.lineWidth = 1 + random() * 1.6;
      ctx.beginPath();
      for (let step = 0; step <= 8; step++) {
        const t = Math.min(1, t0 + (length * step) / 8);
        const point = at(t);
        const y = point.y + (offset * thickness(t)) / 2;
        if (step === 0) ctx.moveTo(point.x, y);
        else ctx.lineTo(point.x, y);
      }
      ctx.stroke();
    }
    // Knots.
    for (let index = 0; index < 5; index++) {
      const point = at(0.12 + random() * 0.76);
      const y = point.y + (random() - 0.5) * 30;
      ctx.strokeStyle = rgba(BRANCH_DARK, 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(point.x, y, 13, 8, random(), 0, TAU);
      ctx.stroke();
      ctx.fillStyle = rgba(BRANCH_DARK, 0.3);
      ctx.fill();
    }
    // Algae grows along the top.
    for (let index = 0; index < 26; index++) {
      const t = random();
      const point = at(t);
      glow(
        ctx,
        point.x,
        point.y - thickness(t) * 0.08 + (random() - 0.5) * 24,
        26 + random() * 46,
        random() < 0.6 ? ALGAE : ALGAE_LIGHT,
        0.24 + random() * 0.2,
      );
    }
    speckle(
      ctx,
      random,
      900,
      { x: 0, y: 0, w: width, h: height },
      [0.6, 1.8],
      BRANCH_DARK,
      [0.12, 0.34],
    );
    speckle(
      ctx,
      random,
      500,
      { x: 0, y: 0, w: width, h: height },
      [0.6, 1.6],
      BRANCH_LIGHT,
      [0.1, 0.3],
    );
    ctx.restore();

    // The sunk end goes under the mud: it fades, and silt lies over it.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const sink = ctx.createLinearGradient(20, 0, 330, 0);
    sink.addColorStop(0, 'rgba(0,0,0,1)');
    sink.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sink;
    ctx.fillRect(0, 0, 340, height);
    ctx.restore();
    for (let index = 0; index < 10; index++) {
      glow(
        ctx,
        60 + random() * 300,
        mid + 30 + (random() - 0.5) * 70,
        40 + random() * 50,
        MUD,
        0.2,
      );
    }

    // The broken top end.
    const top = at(1);
    ctx.fillStyle = rgba([190, 172, 144], 0.85);
    ctx.beginPath();
    ctx.ellipse(top.x - 4, top.y, 16, 40, 0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(BRANCH_DARK, 0.45);
    ctx.lineWidth = 1.5;
    for (const radius of [0.35, 0.7]) {
      ctx.beginPath();
      ctx.ellipse(top.x - 4, top.y, 16 * radius, 40 * radius, 0.1, 0, TAU);
      ctx.stroke();
    }
  },
};

/**
 * Light through the leaves above: warm soft patches on nothing. Laid over the
 * bed with a blend that only lightens. Repeats in both directions.
 */
const dapple: Painter = {
  width: 1024,
  height: 1024,
  paint(ctx, size) {
    const random = seededRandom(401);
    const spot = (x: number, y: number, radius: number, strength: number): void => {
      const squash = 0.55 + random() * 0.45;
      const turn = random() * Math.PI;
      wrapped(size, x, y, radius, (px, py) => {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(turn);
        ctx.scale(1, squash);
        const fill = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
        fill.addColorStop(0, rgba(WARM, strength));
        fill.addColorStop(0.55, rgba(WARM, strength * 0.6));
        fill.addColorStop(1, rgba(WARM, 0));
        ctx.fillStyle = fill;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        ctx.restore();
      });
    };
    // Gaps in the canopy come in clusters: wide soft pools, with a few brighter hearts.
    for (let cluster = 0; cluster < 9; cluster++) {
      const cx = random() * size;
      const cy = random() * size;
      const pools = 2 + Math.floor(random() * 3);
      for (let index = 0; index < pools; index++) {
        const angle = random() * TAU;
        const distance = random() * 150;
        spot(
          cx + Math.cos(angle) * distance,
          cy + Math.sin(angle) * distance,
          90 + random() * 120,
          0.1 + random() * 0.1,
        );
      }
      const hearts = 1 + Math.floor(random() * 4);
      for (let index = 0; index < hearts; index++) {
        const angle = random() * TAU;
        const distance = random() * 110;
        spot(
          cx + Math.cos(angle) * distance,
          cy + Math.sin(angle) * distance,
          24 + random() * 44,
          0.14 + random() * 0.14,
        );
      }
    }
  },
};

/**
 * Murk: the brown of the water closing in with distance. Stretched over the
 * view and centred on the shrimp. Clear to about 3 BL, thick by 7.
 */
const murk: Painter = {
  width: 512,
  height: 288,
  paint(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    // Drawn at twice the size of the view, which is about 12.5 BL wide: one BL is about 20 pixels here.
    const bl = width / 25;
    const fog = mix(TEA, MUD_DARK, 0.45);
    const fill = ctx.createRadialGradient(cx, cy, bl * 3, cx, cy, bl * 8.5);
    fill.addColorStop(0, rgba(fog, 0));
    fill.addColorStop(0.45, rgba(fog, 0.3));
    fill.addColorStop(1, rgba(fog, 0.82));
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
  },
};

export const mangrovePainters: Record<string, Painter> = {
  'mangrove.mud': mud,
  'mangrove.sandmud': sandmud,
  // Six roots, one for each way a limb can come down. Their light is painted in,
  // so the area data turns them only a little and picks another one for another way.
  'mangrove.root.a': root(163, [{ x: 0, y: 0, r: 1, wobble: 0.06 }], [-0.7]),
  'mangrove.root.b': root(
    173,
    [
      { x: -0.22, y: -0.12, r: 0.74, wobble: 0.07 },
      { x: 0.5, y: 0.34, r: 0.44, wobble: 0.08 },
    ],
    [2.7],
  ),
  'mangrove.root.c': root(181, [{ x: 0, y: 0, r: 1, wobble: 0.12 }], [-2.3, 0.5]),
  'mangrove.root.d': root(167, [{ x: 0, y: 0, r: 1, wobble: 0.06 }], [1.4]),
  'mangrove.root.e': root(
    179,
    [
      { x: 0.1, y: 0.2, r: 0.76, wobble: 0.07 },
      { x: -0.5, y: -0.3, r: 0.42, wobble: 0.08 },
    ],
    [-1.75],
  ),
  'mangrove.root.f': root(193, [{ x: 0, y: 0, r: 1, wobble: 0.1 }], [0.25]),
  'mangrove.clump': clump,
  'mangrove.wall': wall,
  'mangrove.bank': bank,
  'mangrove.tangle.a': tangle(191, 6, 8),
  'mangrove.tangle.b': tangle(197, 8, 6),
  'mangrove.hollow': hollow,
  'mangrove.leaf.floating.a': floatingLeaf(223, LEAF, -14, false),
  'mangrove.leaf.floating.b': floatingLeaf(227, [124, 146, 58], 18, true),
  'mangrove.litter.a': litter('scrap'),
  'mangrove.litter.b': litter('twig'),
  'mangrove.litter.c': litter('bark'),
  'food.mangroveLeaf': fallenLeaf,
  'food.algaeFilm': algaeFilm,
  'thing.seedPod.standing': seedPodStanding,
  'thing.seedPod.lying': seedPodLying,
  'thing.sunkenBranch': sunkenBranch,
  'light.dapple': dapple,
  'mangrove.murk': murk,
};

// Used by painters to come. Kept here so the palette stays in one place.
export const MANGROVE_COLORS = { MUD, MUD_DARK, MUD_LIGHT, TEA, WARM, ALGAE } as const;
void traceLine;
