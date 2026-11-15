import { seededRandom } from '../../core/random';
import {
  band,
  blob,
  glow,
  hex,
  litWash,
  mix,
  patches,
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
 * The other animals of the mangrove, seen from above. Each is described in
 * docs/11-world-catalogue.md. Anything with a front points right.
 *
 * None of them has a face. Crustaceans keep their living colours.
 */
const TAU = Math.PI * 2;

const CRAB: Rgb = [116, 96, 72];
const CRAB_PALE: Rgb = [178, 160, 128];
const CRAB_DARK: Rgb = [58, 46, 34];
const CLAW: Rgb = [226, 212, 178];
const CLAW_TIP: Rgb = [198, 152, 100];
const CLAW_DARK: Rgb = [128, 104, 72];
const SHELL: Rgb = [88, 76, 64];
const SHELL_PALE: Rgb = [156, 140, 118];
const SHELL_DARK: Rgb = [40, 33, 27];
const FISH: Rgb = [118, 126, 102];
const FISH_PALE: Rgb = [208, 214, 198];
const FISH_DARK: Rgb = [62, 70, 58];
const FOOT = hex('#D9B13B');
const FOOT_DARK: Rgb = [128, 98, 30];
const FOOT_PALE: Rgb = [240, 214, 124];
const LEG: Rgb = [30, 30, 33];
const SHADE: Rgb = [14, 20, 26];
const FOAM: Rgb = [236, 240, 230];
const MUD_DARK: Rgb = [56, 41, 28];
const MUD_LIGHT: Rgb = [150, 124, 92];

/** One leg of a crab: three joints, thinner toward the tip. */
function crabLeg(ctx: CanvasRenderingContext2D, points: readonly Point[], width: number): void {
  const line = sampleCurve(points, 14);
  band(ctx, line, (t) => width * (1 - 0.72 * t), CRAB, CRAB_PALE, CRAB_DARK);
  // The joints show as small pale knuckles.
  for (const point of points.slice(1, -1)) {
    ctx.fillStyle = rgba(CRAB_PALE, 0.55);
    ctx.beginPath();
    ctx.arc(point.x, point.y, width * 0.34, 0, TAU);
    ctx.fill();
  }
}

/**
 * A fiddler crab without its big claw: a squarish body, wider than long and
 * widest at the front, eight walking legs, the small claw, two eyes on stalks.
 * It faces right. The big claw is a separate image, hinged at the front corner
 * on the lower side.
 */
const crabBody: Painter = {
  width: 220,
  height: 190,
  paint(ctx, width, height) {
    const random = seededRandom(503);
    const cx = 104;
    const cy = height / 2;

    // Legs first, under the body. Four on each side, fanned out.
    for (const side of [-1, 1]) {
      for (let index = 0; index < 4; index++) {
        const rootX = cx - 30 + index * 17;
        const rootY = cy + side * 38;
        const sweep = (index - 1.5) * 15;
        crabLeg(
          ctx,
          [
            { x: rootX, y: rootY },
            { x: rootX + sweep * 0.7, y: rootY + side * 22 },
            { x: rootX + sweep * 1.5 - 4, y: rootY + side * 38 },
            { x: rootX + sweep * 2.1 - 10, y: rootY + side * 50 },
          ],
          8.5,
        );
      }
    }

    // The small claw, held in front on the upper side.
    const small = sampleCurve(
      [
        { x: cx + 30, y: cy - 30 },
        { x: cx + 48, y: cy - 34 },
        { x: cx + 60, y: cy - 24 },
      ],
      10,
    );
    band(ctx, small, (t) => 9 - 4 * t, CLAW, [244, 236, 212], CLAW_DARK);

    // The carapace.
    const shape: Point[] = [
      { x: cx - 38, y: cy - 36 },
      { x: cx - 6, y: cy - 46 },
      { x: cx + 32, y: cy - 53 },
      { x: cx + 40, y: cy - 26 },
      { x: cx + 41, y: cy },
      { x: cx + 40, y: cy + 26 },
      { x: cx + 32, y: cy + 53 },
      { x: cx - 6, y: cy + 46 },
      { x: cx - 38, y: cy + 36 },
      { x: cx - 44, y: cy },
    ];
    ctx.save();
    tracePath(ctx, shape);
    softFill(ctx, litWash(ctx, cx, cy, 56, CRAB_PALE, CRAB, CRAB_DARK), CRAB_DARK, 6, 0.7);
    ctx.clip();
    // A paler back, mottled.
    ctx.save();
    ctx.translate(cx + 2, cy);
    ctx.scale(0.75, 1);
    glow(ctx, 0, 0, 44, [196, 180, 148], 0.5);
    ctx.restore();
    patches(
      ctx,
      random,
      14,
      { x: cx - 44, y: cy - 52, w: 88, h: 104 },
      [6, 18],
      [CRAB_DARK, CRAB_PALE],
      [0.12, 0.3],
    );
    // The H-shaped groove fiddler crabs carry on the back.
    ctx.strokeStyle = rgba(CRAB_DARK, 0.4);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy + side * 12);
      ctx.quadraticCurveTo(cx - 2, cy + side * 8, cx + 16, cy + side * 14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 9);
    ctx.lineTo(cx - 2, cy + 9);
    ctx.stroke();
    speckle(
      ctx,
      random,
      90,
      { x: cx - 44, y: cy - 52, w: 88, h: 104 },
      [0.5, 1.4],
      CRAB_DARK,
      [0.15, 0.4],
    );
    ctx.restore();
    tracePath(ctx, shape);
    ctx.strokeStyle = rgba(CRAB_DARK, 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Eyes on tall thin stalks, seen from above as two short lines and two dots.
    for (const side of [-1, 1]) {
      ctx.strokeStyle = rgba(CRAB_PALE, 0.95);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + 38, cy + side * 9);
      ctx.lineTo(cx + 54, cy + side * 13);
      ctx.stroke();
      ctx.fillStyle = 'rgb(26,24,22)';
      ctx.beginPath();
      ctx.arc(cx + 56, cy + side * 13.5, 4, 0, TAU);
      ctx.fill();
    }
    void width;
  },
};

/** Where the big claw joins the body, in the body's image. The claw's own joint is at (16, 45). */
export const CRAB_CLAW_JOINT = { x: 140, y: 138 };

/**
 * The fiddler crab's big claw: pale cream with a tan tip, as long as the body
 * is wide. Its joint is at the left.
 */
const crabClaw: Painter = {
  width: 170,
  height: 90,
  paint(ctx, width, height) {
    const random = seededRandom(509);
    const mid = height / 2;
    // The hand: swollen, narrowing to the wrist at the left.
    const hand: Point[] = [
      { x: 14, y: mid - 5 },
      { x: 40, y: mid - 23 },
      { x: 76, y: mid - 27 },
      { x: 104, y: mid - 18 },
      { x: 108, y: mid + 4 },
      { x: 98, y: mid + 22 },
      { x: 62, y: mid + 26 },
      { x: 30, y: mid + 18 },
      { x: 14, y: mid + 6 },
    ];
    // The two fingers, a little apart.
    const upper = sampleCurve(
      [
        { x: 96, y: mid - 13 },
        { x: 128, y: mid - 15 },
        { x: 158, y: mid - 3 },
      ],
      12,
    );
    const lower = sampleCurve(
      [
        { x: 96, y: mid + 13 },
        { x: 128, y: mid + 14 },
        { x: 157, y: mid + 4 },
      ],
      12,
    );
    for (const finger of [upper, lower]) {
      band(ctx, finger, (t) => 17 - 13 * t, CLAW, [248, 240, 218], CLAW_DARK);
      ctx.save();
      traceRibbon(ctx, finger, (t) => 17 - 13 * t);
      ctx.clip();
      const tip = ctx.createLinearGradient(104, 0, 160, 0);
      tip.addColorStop(0, rgba(CLAW_TIP, 0));
      tip.addColorStop(1, rgba(CLAW_TIP, 0.85));
      ctx.fillStyle = tip;
      ctx.fillRect(96, 0, 74, height);
      ctx.restore();
    }

    ctx.save();
    tracePath(ctx, hand);
    softFill(ctx, litWash(ctx, 60, mid, 54, [250, 244, 224], CLAW, CLAW_DARK), CLAW_DARK, 5, 0.6);
    ctx.clip();
    // Fine bumps on the hand.
    speckle(
      ctx,
      random,
      70,
      { x: 14, y: mid - 28, w: 96, h: 56 },
      [0.6, 1.5],
      CLAW_DARK,
      [0.12, 0.3],
    );
    glow(ctx, 30, mid + 6, 30, CRAB, 0.3);
    ctx.restore();
    tracePath(ctx, hand);
    ctx.strokeStyle = rgba(CLAW_DARK, 0.55);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    void width;
  },
};

/** The mouth of a crab's burrow in the bank: a dark hole with a low rim. */
const crabBurrow: Painter = {
  width: 128,
  height: 128,
  paint(ctx, size) {
    const random = seededRandom(521);
    const centre = size / 2;
    // The rim: mud pushed out and dried paler.
    ctx.save();
    tracePath(ctx, blob(random, centre, centre, 44, 0.12, 13));
    softFill(ctx, rgba(MUD_LIGHT, 0.5), MUD_DARK, 8, 0.3);
    ctx.restore();
    // The hole. Its far wall catches the light.
    const hole = blob(random, centre, centre, 24, 0.08, 11);
    ctx.save();
    tracePath(ctx, hole);
    const fill = ctx.createRadialGradient(centre - 5, centre - 6, 2, centre, centre, 26);
    fill.addColorStop(0, 'rgb(16,12,9)');
    fill.addColorStop(1, 'rgb(44,33,24)');
    softFill(ctx, fill, [20, 15, 11], 6, 0.8);
    ctx.restore();
    ctx.strokeStyle = rgba([196, 172, 134], 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centre, centre, 25, 0.25, Math.PI * 0.85);
    ctx.stroke();
  },
};

/**
 * A long narrow cone of a shell, tip trailing to the left. The snail carries
 * it, and it is what a hermit crab would live in. Feelers are drawn by the game.
 */
const snailShell: Painter = {
  width: 160,
  height: 90,
  paint(ctx, width, height) {
    const random = seededRandom(541);
    const mid = height / 2;
    // The soft foot shows a little in front and along the lower side.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(124, mid + 3, 24, 17, 0, 0, TAU);
    softFill(ctx, rgba([150, 142, 128], 0.9), [70, 62, 54], 5, 0.5);
    ctx.restore();

    // The cone: a point at the left, widest near the front.
    const half = (t: number): number =>
      3 + 25 * Math.pow(t, 0.85) * (t < 0.88 ? 1 : 1 - Math.pow((t - 0.88) / 0.12, 2) * 0.55);
    const spine: Point[] = [];
    for (let index = 0; index <= 30; index++) {
      spine.push({ x: 12 + (index / 30) * 118, y: mid - 2 * Math.sin((index / 30) * Math.PI) });
    }
    ctx.save();
    traceRibbon(ctx, spine, (t) => half(t) * 2);
    const fill = ctx.createLinearGradient(0, mid - 28, 0, mid + 28);
    fill.addColorStop(0, rgba(SHELL_PALE, 1));
    fill.addColorStop(0.45, rgba(SHELL, 1));
    fill.addColorStop(1, rgba(SHELL_DARK, 1));
    softFill(ctx, fill, SHELL_DARK, 5, 0.7);
    ctx.clip();
    // The whorls: bands winding round, each with a paler ridge.
    for (let index = 0; index < 9; index++) {
      const t = 0.08 + (index / 9) * 0.9;
      const x = 12 + t * 118;
      const reach = half(t) + 2;
      ctx.strokeStyle = rgba(SHELL_DARK, 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, mid - reach);
      ctx.quadraticCurveTo(x + 7, mid, x - 3, mid + reach);
      ctx.stroke();
      ctx.strokeStyle = rgba(SHELL_PALE, 0.5);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + 1, mid - reach);
      ctx.quadraticCurveTo(x + 13, mid, x + 3, mid + reach);
      ctx.stroke();
    }
    speckle(
      ctx,
      random,
      80,
      { x: 12, y: mid - 28, w: 120, h: 56 },
      [0.5, 1.3],
      SHELL_DARK,
      [0.15, 0.4],
    );
    ctx.restore();
    traceRibbon(ctx, spine, (t) => half(t) * 2);
    ctx.strokeStyle = rgba(SHELL_DARK, 0.55);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    void width;
  },
};

/** A young fish in mid-water: a slim silver-olive spindle with a pale stripe. */
const smallFish: Painter = {
  width: 110,
  height: 44,
  paint(ctx, width, height) {
    const mid = height / 2;
    // The tail fin, seen edge on, and two side fins held out a little.
    ctx.strokeStyle = rgba(FISH_DARK, 0.6);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(22, mid);
    ctx.lineTo(8, mid);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.fillStyle = rgba(FISH_PALE, 0.4);
      ctx.beginPath();
      ctx.ellipse(70, mid + side * 9, 9, 3.2, side * -0.5, 0, TAU);
      ctx.fill();
    }
    // The body: fullest a third of the way back from the nose.
    const spine: Point[] = [];
    for (let index = 0; index <= 24; index++) spine.push({ x: 18 + (index / 24) * 82, y: mid });
    const body = (t: number): number =>
      2 + 13 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.5)), 0.8);
    ctx.save();
    traceRibbon(ctx, spine, body);
    const fill = ctx.createLinearGradient(0, mid - 8, 0, mid + 8);
    fill.addColorStop(0, rgba(FISH_DARK, 0.95));
    fill.addColorStop(0.5, rgba(FISH, 0.95));
    fill.addColorStop(1, rgba(FISH_DARK, 0.95));
    softFill(ctx, fill, FISH_DARK, 4, 0.6);
    ctx.clip();
    // The pale stripe along the back.
    ctx.strokeStyle = rgba(FISH_PALE, 0.75);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(26, mid);
    ctx.lineTo(92, mid);
    ctx.stroke();
    ctx.restore();
    // Eyes sit at the sides of the head.
    for (const side of [-1, 1]) {
      ctx.fillStyle = 'rgba(24,26,24,0.9)';
      ctx.beginPath();
      ctx.arc(89, mid + side * 4.6, 1.9, 0, TAU);
      ctx.fill();
    }
    void width;
  },
};

/**
 * The wading bird is never seen whole. This is the shadow of its body and
 * folded wing on the water, with edges so soft that it reads as weather
 * before it reads as an animal. The neck leaves from the right.
 */
const birdShadowBody: Painter = {
  width: 1024,
  height: 720,
  paint(ctx, width, height) {
    const random = seededRandom(601);
    const cx = width * 0.46;
    const cy = height / 2;
    // Built from many soft rounds, so that no edge is ever sharp.
    const rounds: [number, number, number, number][] = [
      [0, 0, 250, 0.42],
      [-150, 16, 210, 0.36],
      [130, -10, 200, 0.36],
      [-290, 40, 150, 0.3],
      [250, -30, 140, 0.3],
      [-390, 70, 100, 0.24],
      [330, -40, 100, 0.24],
      [-40, 90, 190, 0.24],
      [40, -90, 180, 0.22],
    ];
    for (const [dx, dy, radius, alpha] of rounds) {
      ctx.save();
      ctx.translate(cx + dx, cy + dy);
      ctx.scale(1, 0.74);
      glow(ctx, 0, 0, radius, SHADE, alpha, 0.2);
      ctx.restore();
    }
    // The folded wing: a slightly darker lobe along the lower side.
    for (let index = 0; index < 7; index++) {
      const t = index / 6;
      glow(
        ctx,
        cx - 300 + t * 420,
        cy + 96 - 60 * Math.sin(t * Math.PI),
        96 + random() * 30,
        SHADE,
        0.12,
      );
    }
    void height;
  },
};

/** Where the neck begins in the image `bird.shadow.head`: the point to pin to the body's shadow. */
export const BIRD_NECK_START = { x: 66, y: 102 };

/** The shadow of the bird's neck and head. It moves on its own, turning about `BIRD_NECK_START`. */
const birdShadowHead: Painter = {
  width: 470,
  height: 220,
  paint(ctx, width, height) {
    const mid = height / 2;
    const start = BIRD_NECK_START.x;
    // The neck: a soft band that narrows.
    for (let index = 0; index < 12; index++) {
      const t = index / 11;
      const x = start + t * 230;
      const y = mid + 22 * Math.sin(t * Math.PI * 1.1) - 8;
      glow(ctx, x, y, 62 - 24 * t, SHADE, 0.22);
    }
    // The head, and the beak as a long point.
    ctx.save();
    ctx.translate(start + 258, mid - 12);
    ctx.scale(1.25, 0.8);
    glow(ctx, 0, 0, 56, SHADE, 0.46, 0.25);
    ctx.restore();
    for (let index = 0; index < 9; index++) {
      const t = index / 8;
      glow(ctx, start + 292 + t * 86, mid - 12 + t * 6, 26 - 19 * t, SHADE, 0.38);
    }
    void width;
  },
};

/**
 * One foot of the bird, standing on the mud. The leg is seen end on, as a
 * small dark round. The toes are yellow: three forward, one back. They are
 * almost three times as long as the shrimp.
 */
const birdFoot: Painter = {
  width: 440,
  height: 440,
  paint(ctx, size) {
    const random = seededRandom(613);
    const centre = size / 2;
    const cx = centre - 30;
    // Mud pressed down around the foot.
    glow(ctx, cx + 30, centre + 8, 200, MUD_DARK, 0.3, 0.3);

    const toes: [number, number, number][] = [
      [-0.5, 196, 0.16],
      [0.02, 226, -0.05],
      [0.52, 190, -0.18],
      [Math.PI + 0.1, 104, 0.1],
    ];
    for (const [angle, length, curl] of toes) {
      const line = sampleCurve(
        [
          { x: cx, y: centre },
          {
            x: cx + Math.cos(angle + curl) * length * 0.5,
            y: centre + Math.sin(angle + curl) * length * 0.5,
          },
          { x: cx + Math.cos(angle) * length, y: centre + Math.sin(angle) * length },
        ],
        20,
      );
      band(ctx, line, (t) => 20 - 10 * t, FOOT, FOOT_PALE, FOOT_DARK);
      // Scales across the toe, and the joints.
      ctx.save();
      traceRibbon(ctx, line, (t) => 20 - 10 * t);
      ctx.clip();
      for (let index = 2; index < 19; index++) {
        const point = line[index] as Point;
        const next = line[index + 1] as Point;
        const nx = -(next.y - point.y);
        const ny = next.x - point.x;
        ctx.strokeStyle = rgba(FOOT_DARK, index % 6 === 0 ? 0.5 : 0.22);
        ctx.lineWidth = index % 6 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(point.x - nx, point.y - ny);
        ctx.lineTo(point.x + nx, point.y + ny);
        ctx.stroke();
      }
      ctx.restore();
      // A short dark claw.
      const end = line[line.length - 1] as Point;
      const before = line[line.length - 3] as Point;
      const direction = Math.atan2(end.y - before.y, end.x - before.x);
      const claw = sampleCurve(
        [end, { x: end.x + Math.cos(direction) * 20, y: end.y + Math.sin(direction) * 20 }],
        4,
      );
      band(ctx, claw, (t) => 8 - 6 * t, [52, 46, 38], [110, 100, 84], [24, 22, 20]);
    }

    // The leg, end on.
    const shape = blob(random, cx, centre, 27, 0.05, 12);
    ctx.save();
    tracePath(ctx, shape);
    softFill(
      ctx,
      litWash(ctx, cx, centre, 27, [84, 84, 88], LEG, [10, 10, 12]),
      [10, 10, 12],
      7,
      0.8,
    );
    ctx.restore();
  },
};

/** The tip of the beak: dark and dagger-shaped. It is seen for a fifth of a second, in a splash. */
const birdBeak: Painter = {
  width: 200,
  height: 70,
  paint(ctx, width, height) {
    const mid = height / 2;
    const spine: Point[] = [];
    for (let index = 0; index <= 20; index++) spine.push({ x: 8 + (index / 20) * 184, y: mid });
    const shape = (t: number): number => 34 * Math.pow(1 - t, 0.8) + 1.5;
    ctx.save();
    traceRibbon(ctx, spine, shape);
    const fill = ctx.createLinearGradient(0, mid - 17, 0, mid + 17);
    fill.addColorStop(0, 'rgb(84,82,78)');
    fill.addColorStop(0.5, 'rgb(40,39,38)');
    fill.addColorStop(1, 'rgb(18,18,18)');
    softFill(ctx, fill, [10, 10, 10], 5, 0.7);
    ctx.clip();
    // Where the two halves of the beak meet.
    ctx.strokeStyle = 'rgba(8,8,8,0.6)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(8, mid + 2);
    ctx.lineTo(190, mid);
    ctx.stroke();
    ctx.restore();
    // It comes down out of the splash: the base is lost.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, 0, 80, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 80, height);
    ctx.restore();
    void width;
  },
};

/** The beak breaking the surface: broken rings of pale ripples and a few bright drops. */
const birdSplash: Painter = {
  width: 320,
  height: 320,
  paint(ctx, size) {
    const random = seededRandom(631);
    const centre = size / 2;
    glow(ctx, centre, centre, 70, FOAM, 0.4);
    ctx.lineCap = 'round';
    for (const [radius, width, alpha] of [
      [52, 5, 0.75],
      [88, 4, 0.55],
      [124, 3, 0.35],
    ] as const) {
      // Each ring is in pieces, as thrown water is.
      let angle = random() * TAU;
      const end = angle + TAU;
      while (angle < end) {
        const length = 0.3 + random() * 0.7;
        ctx.strokeStyle = rgba(FOAM, alpha * (0.6 + random() * 0.4));
        ctx.lineWidth = width * (0.7 + random() * 0.6);
        ctx.beginPath();
        ctx.arc(centre, centre, radius * (0.96 + random() * 0.08), angle, angle + length);
        ctx.stroke();
        angle += length + 0.12 + random() * 0.3;
      }
    }
    // Drops, thrown outward.
    for (let index = 0; index < 22; index++) {
      const angle = random() * TAU;
      const distance = 40 + random() * 104;
      const x = centre + Math.cos(angle) * distance;
      const y = centre + Math.sin(angle) * distance;
      const radius = 2 + random() * 4.5;
      ctx.fillStyle = rgba(FOAM, 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, radius * 1.3, radius, angle, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.3, y - radius * 0.35, radius * 0.3, 0, TAU);
      ctx.fill();
    }
  },
};

export const creaturePainters: Record<string, Painter> = {
  'crab.body': crabBody,
  'crab.claw': crabClaw,
  'crab.burrow': crabBurrow,
  'snail.shell': snailShell,
  'fish.small': smallFish,
  'bird.shadow.body': birdShadowBody,
  'bird.shadow.head': birdShadowHead,
  'bird.foot': birdFoot,
  'bird.beak': birdBeak,
  'bird.splash': birdSplash,
};

void mix;
