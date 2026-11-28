import { seededRandom } from '../../core/random';
import { glow, hex, mix, rgba, speckle, wrapped, type Painter, type Rgb } from '../paint';

/**
 * The farm pond seen from the channel (D39; doc 18, "Level 3"): its bank,
 * its gate with the mesh, the water that comes out of it, and the pale
 * shapes behind. At night, in the channel's light: moonlight `#C9D6E8`
 * from the upper left. Looks are in docs/11-world-catalogue.md.
 */

const TAU = Math.PI * 2;
const SLATE = hex('#2B3A55');
const MOON = hex('#C9D6E8');
const SHADE: Rgb = [14, 18, 28];
/** Packed earth, dried pale on the crest and dark where the water reaches. */
const EARTH = mix(hex('#7C6748'), SLATE, 0.25);
const EARTH_DARK = mix(hex('#3E3222'), SLATE, 0.22);
const GRASS = mix(hex('#4E5A34'), SLATE, 0.4);
const GRASS_DARK = mix(hex('#2C3420'), SLATE, 0.3);
const CONCRETE = mix(hex('#8A8A80'), SLATE, 0.38);
const CONCRETE_DARK = mix(hex('#4E4E48'), SLATE, 0.3);
/** The pond's water: greener and thicker than the channel's. */
const POND = hex('#4C5A2C');
const POND_DARK = hex('#252C16');
const STAIN = hex('#5E6A2C');
const PALE = hex('#C9CEC0');

/**
 * The pond's bank, an edge strip: a straight dike of packed earth, grass
 * tufts along its crest, the slope smoothed by machines, and at its foot a
 * dead straight line where cracked mud meets the bed.
 */
const wall: Painter = {
  width: 1024,
  height: 360,
  paint(ctx, width) {
    const random = seededRandom(1401);
    const foot = 252;
    const crest = 70;

    // The slope, lighter toward the crest where the moon falls on it.
    const slope = ctx.createLinearGradient(0, 0, 0, foot);
    slope.addColorStop(0, rgba(mix(EARTH, MOON, 0.12), 1));
    slope.addColorStop(0.45, rgba(EARTH, 1));
    slope.addColorStop(1, rgba(EARTH_DARK, 1));
    ctx.fillStyle = slope;
    ctx.fillRect(0, 0, width, foot);

    // Blotches of damp and dry, kept faint: the earth was laid flat.
    for (let index = 0; index < 40; index++) {
      const x = random() * width;
      const y = crest + random() * (foot - crest - 20);
      const r = 18 + random() * 40;
      const tone = random() < 0.5 ? mix(EARTH, MOON, 0.15) : EARTH_DARK;
      const alpha = 0.08 + random() * 0.1;
      wrapped(width, x, y, r, (px, py) => glow(ctx, px, py, r, tone, alpha), true);
    }
    // Lines along it where the machine smoothed it, all parallel.
    ctx.lineCap = 'round';
    for (let line = 0; line < 9; line++) {
      const y = crest + 16 + line * 19 + random() * 4;
      ctx.strokeStyle = rgba(line % 2 === 0 ? EARTH_DARK : mix(EARTH, MOON, 0.2), 0.12);
      ctx.lineWidth = 1 + random();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    // Clods and pebbles pressed into it, each lit on its upper left.
    for (let index = 0; index < 160; index++) {
      const x = random() * width;
      const y = crest + 6 + random() * (foot - crest - 12);
      const r = 2 + random() * 5;
      wrapped(
        width,
        x,
        y,
        r + 2,
        (px, py) => {
          ctx.fillStyle = rgba(EARTH_DARK, 0.45);
          ctx.beginPath();
          ctx.ellipse(px + 1, py + 1.2, r, r * 0.7, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = rgba(mix(EARTH, MOON, 0.25), 0.4);
          ctx.beginPath();
          ctx.ellipse(px - 0.6, py - 0.6, r * 0.8, r * 0.55, 0, 0, TAU);
          ctx.fill();
        },
        true,
      );
    }
    speckle(
      ctx,
      random,
      900,
      { x: 0, y: crest, w: width, h: foot - crest },
      [0.5, 1.4],
      EARTH_DARK,
      [0.2, 0.5],
    );

    // The crest: a band of grass, dark, its tufts leaning over the slope.
    const top = ctx.createLinearGradient(0, 0, 0, crest + 10);
    top.addColorStop(0, rgba(GRASS_DARK, 1));
    top.addColorStop(0.8, rgba(GRASS, 0.9));
    top.addColorStop(1, rgba(GRASS, 0));
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, width, crest + 10);
    for (let index = 0; index < 140; index++) {
      const x = random() * width;
      const y = crest - 14 + random() * 18;
      const blades = 4 + Math.floor(random() * 5);
      const tone = random() < 0.4 ? mix(GRASS, MOON, 0.18) : GRASS;
      wrapped(
        width,
        x,
        y,
        30,
        (px, py) => {
          for (let blade = 0; blade < blades; blade++) {
            const lean = (random() - 0.5) * 22;
            const reach = 10 + random() * 18;
            ctx.strokeStyle = rgba(blade % 2 === 0 ? tone : GRASS_DARK, 0.7);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(px + (random() - 0.5) * 8, py - 6);
            ctx.quadraticCurveTo(px + lean * 0.4, py + reach * 0.5, px + lean, py + reach);
            ctx.stroke();
          }
        },
        true,
      );
    }

    // The foot: cracked mud spreading out over the bed, fading into the water.
    const mud = ctx.createLinearGradient(0, foot, 0, 340);
    mud.addColorStop(0, rgba(EARTH_DARK, 0.95));
    mud.addColorStop(1, rgba(EARTH_DARK, 0));
    ctx.fillStyle = mud;
    ctx.fillRect(0, foot, width, 340 - foot);
    ctx.strokeStyle = rgba(SHADE, 0.45);
    ctx.lineWidth = 1.2;
    for (let index = 0; index < 70; index++) {
      const x = random() * width;
      const y = foot + 6 + random() * 50;
      const legs = 2 + Math.floor(random() * 2);
      wrapped(
        width,
        x,
        y,
        30,
        (px, py) => {
          for (let leg = 0; leg < legs; leg++) {
            const angle = random() * TAU;
            const reach = 8 + random() * 16;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(angle) * reach, py + Math.sin(angle) * reach * 0.6);
            ctx.stroke();
          }
        },
        true,
      );
    }
    // The line itself: a shadow under it, the moon on its edge.
    for (const [dy, tone, alpha, lineWidth] of [
      [3, SHADE, 0.6, 5],
      [-1, MOON, 0.22, 2],
    ] as const) {
      ctx.strokeStyle = rgba(tone, alpha);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(0, foot + dy);
      ctx.lineTo(width, foot + dy);
      ctx.stroke();
    }
  },
};

/**
 * The gate, drawn into the bank (`width` 420 design pixels, the image at 1.4
 * times that). Two concrete cheeks with grooves, the channel between them
 * full of the pond's green water, and across its mouth the mesh. The mouth's
 * line is at 340 of 400 design pixels down; below it, the water pouring out.
 */
const outlet: Painter = {
  width: 588,
  height: 560,
  paint(ctx, width, height) {
    const random = seededRandom(1403);
    const s = width / 420;
    const cheek = 60 * s;
    const mouth = 340 * s;
    const apron = 360 * s;
    const inner = { x: cheek, w: width - cheek * 2 };

    // The pond's water in the passage, darker toward the pond.
    const water = ctx.createLinearGradient(0, 0, 0, mouth);
    water.addColorStop(0, rgba(POND_DARK, 0.82));
    water.addColorStop(1, rgba(POND, 0.5));
    ctx.fillStyle = water;
    ctx.fillRect(inner.x, 0, inner.w, mouth);
    for (let index = 0; index < 14; index++) {
      const x = inner.x + random() * inner.w;
      const y = random() * mouth;
      glow(ctx, x, y, 20 + random() * 40, POND_DARK, 0.18);
    }

    // The cheeks: concrete, its top lit from the upper left, stained where the water runs.
    for (const left of [0, width - cheek]) {
      const face = ctx.createLinearGradient(left, 0, left + cheek, 0);
      face.addColorStop(0, rgba(mix(CONCRETE, MOON, left === 0 ? 0.18 : 0.06), 1));
      face.addColorStop(1, rgba(CONCRETE_DARK, 1));
      ctx.fillStyle = face;
      ctx.fillRect(left, 0, cheek, apron);
      // Green-brown stain rising from the water.
      const stain = ctx.createLinearGradient(0, apron, 0, apron * 0.35);
      stain.addColorStop(0, rgba(STAIN, 0.75));
      stain.addColorStop(1, rgba(STAIN, 0));
      ctx.fillStyle = stain;
      ctx.fillRect(left, apron * 0.35, cheek, apron * 0.65);
      speckle(
        ctx,
        random,
        220,
        { x: left, y: 0, w: cheek, h: apron },
        [0.5, 1.6],
        CONCRETE_DARK,
        [0.25, 0.6],
      );
      // Its edges, and a groove for boards on the inner side.
      ctx.strokeStyle = rgba(SHADE, 0.55);
      ctx.lineWidth = 3;
      ctx.strokeRect(left + 1.5, -2, cheek - 3, apron + 0.5);
      const groove = left === 0 ? cheek - 16 * s : left + 10 * s;
      ctx.fillStyle = rgba(SHADE, 0.6);
      ctx.fillRect(groove, mouth - 70 * s, 6 * s, 40 * s);
    }
    // The cheeks' shadow falls on the water inside, toward the lower right.
    const shadow = ctx.createLinearGradient(inner.x, 0, inner.x + 30 * s, 0);
    shadow.addColorStop(0, rgba(SHADE, 0.5));
    shadow.addColorStop(1, rgba(SHADE, 0));
    ctx.fillStyle = shadow;
    ctx.fillRect(inner.x, 0, 30 * s, mouth);

    // The mesh: a frame across the mouth and a fine grid in it, the water seen through.
    const band = { y: mouth - 14 * s, h: 22 * s };
    ctx.fillStyle = rgba(CONCRETE_DARK, 0.35);
    ctx.fillRect(inner.x, band.y, inner.w, band.h);
    ctx.strokeStyle = rgba(mix(CONCRETE, MOON, 0.2), 0.55);
    ctx.lineWidth = 1;
    for (let x = inner.x + 4; x < inner.x + inner.w; x += 6 * s) {
      ctx.beginPath();
      ctx.moveTo(x, band.y);
      ctx.lineTo(x, band.y + band.h);
      ctx.stroke();
    }
    for (let y = band.y + 3; y < band.y + band.h; y += 5 * s) {
      ctx.beginPath();
      ctx.moveTo(inner.x, y);
      ctx.lineTo(inner.x + inner.w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(SHADE, 0.7);
    ctx.lineWidth = 4;
    ctx.strokeRect(inner.x, band.y, inner.w, band.h);
    // Silt and film caught along the mesh.
    for (let index = 0; index < 18; index++) {
      glow(
        ctx,
        inner.x + random() * inner.w,
        band.y + band.h * random(),
        6 + random() * 10,
        STAIN,
        0.4,
      );
    }

    // The concrete lip below the mouth, then the water pouring out, pale where it churns.
    ctx.fillStyle = rgba(CONCRETE_DARK, 0.9);
    ctx.fillRect(inner.x, mouth + 8 * s, inner.w, apron - mouth - 8 * s);
    for (let index = 0; index < 40; index++) {
      const x = inner.x + random() * inner.w;
      const y = apron + random() * (height - apron);
      const r = 6 + random() * 18;
      glow(ctx, x, y, r, mix(POND, MOON, 0.3), 0.12 + random() * 0.12);
    }
    ctx.lineCap = 'round';
    for (let index = 0; index < 22; index++) {
      const x = inner.x + 10 + random() * (inner.w - 20);
      const y = apron + 4 + random() * 20;
      const reach = 18 + random() * 40;
      ctx.strokeStyle = rgba(mix(POND, MOON, 0.45), 0.22);
      ctx.lineWidth = 1.5 + random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + (random() - 0.5) * 10,
        y + reach * 0.5,
        x + (random() - 0.5) * 18,
        y + reach,
      );
      ctx.stroke();
    }
  },
};

/**
 * The pond's water in the channel: one soft round stain of it, greener and
 * murkier than the channel, with silt held in it. The plume is a row of
 * these from the gate, spreading and thinning as they go.
 */
const plume: Painter = {
  width: 256,
  height: 256,
  paint(ctx, width, height) {
    const random = seededRandom(1405);
    const middle = { x: width / 2, y: height / 2 };
    glow(ctx, middle.x, middle.y, width / 2, STAIN, 0.55, 0.15);
    for (let index = 0; index < 10; index++) {
      const angle = random() * TAU;
      const reach = random() * width * 0.18;
      glow(
        ctx,
        middle.x + Math.cos(angle) * reach,
        middle.y + Math.sin(angle) * reach,
        width * (0.18 + random() * 0.12),
        random() < 0.6 ? POND : POND_DARK,
        0.2 + random() * 0.15,
      );
    }
    // Fine silt held in it, thinning toward the rim.
    for (let index = 0; index < 160; index++) {
      const angle = random() * TAU;
      const reach = Math.sqrt(random()) * width * 0.36;
      ctx.fillStyle = rgba(
        mix(STAIN, MOON, 0.3),
        (0.15 + random() * 0.2) * (1 - reach / (width * 0.4)),
      );
      ctx.beginPath();
      ctx.arc(
        middle.x + Math.cos(angle) * reach,
        middle.y + Math.sin(angle) * reach,
        0.6 + random() * 1.2,
        0,
        TAU,
      );
      ctx.fill();
    }
  },
};

/**
 * One of the pond's shrimp as seen through its water: a pale shape, no
 * colour and little detail, facing right. The body is 140 of the image's
 * 180 design pixels; the long antennae sweep back along its sides. Never
 * pink, never curled (rule 8).
 */
const shape: Painter = {
  width: 252,
  height: 112,
  paint(ctx, width, height) {
    const s = width / 180;
    const middle = height / 2;
    /** A point along the body, from the tail fan's end (0) to the rostrum's tip (1). */
    const at = (share: number): number => (20 + share * 140) * s;
    /** Half the body's width at each place along it. */
    const half = (share: number): number => {
      if (share < 0.12) return 0;
      if (share > 0.97) return 0.6 * s;
      if (share > 0.62) return (11 - ((share - 0.62) / 0.35) ** 2 * 9) * s;
      return (4 + ((share - 0.12) / 0.5) * 7) * s;
    };
    // The antennae first, under the body: from the head, out, and back past the tail.
    ctx.strokeStyle = rgba(PALE, 0.5);
    ctx.lineWidth = 1.1 * s;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(at(0.92), middle + side * 3 * s);
      ctx.bezierCurveTo(
        at(1.02),
        middle + side * 8 * s,
        at(0.9),
        middle + side * 22 * s,
        at(0.6),
        middle + side * 27 * s,
      );
      ctx.quadraticCurveTo(at(0.25), middle + side * 32 * s, 2 * s, middle + side * 38 * s);
      ctx.stroke();
    }
    ctx.save();
    ctx.filter = `blur(${1.2 * s}px)`;
    ctx.fillStyle = rgba(PALE, 0.9);
    // The tail fan, spread: five blades from one point.
    const root = { x: at(0.13), y: middle };
    for (const angle of [-0.55, -0.27, 0, 0.27, 0.55]) {
      const reach = (angle === 0 ? 17 : 15) * s;
      const tipX = root.x - Math.cos(angle) * reach;
      const tipY = root.y + Math.sin(angle) * reach;
      ctx.beginPath();
      ctx.moveTo(root.x, root.y - 2 * s);
      ctx.quadraticCurveTo(tipX + 2 * s, tipY - 3 * s, tipX, tipY);
      ctx.quadraticCurveTo(tipX + 2 * s, tipY + 3 * s, root.x, root.y + 2 * s);
      ctx.closePath();
      ctx.fill();
    }
    // The body: the abdomen narrowing to the tail, the carapace, the rostrum.
    ctx.beginPath();
    const steps = 40;
    for (let index = 0; index <= steps; index++) {
      const share = 0.12 + (index / steps) * 0.88;
      const x = at(share);
      if (index === 0) ctx.moveTo(x, middle - half(share));
      else ctx.lineTo(x, middle - half(share));
    }
    for (let index = steps; index >= 0; index--) {
      const share = 0.12 + (index / steps) * 0.88;
      ctx.lineTo(at(share), middle + half(share));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // The joins of the abdomen, and where the carapace ends: faint.
    ctx.strokeStyle = rgba(SHADE, 0.14);
    ctx.lineWidth = 1 * s;
    for (const share of [0.2, 0.28, 0.36, 0.44, 0.52, 0.62]) {
      ctx.beginPath();
      ctx.moveTo(at(share) + 1.5 * s, middle - half(share) + 1 * s);
      ctx.quadraticCurveTo(
        at(share) - 1.5 * s,
        middle,
        at(share) + 1.5 * s,
        middle + half(share) - 1 * s,
      );
      ctx.stroke();
    }
    // Legs just showing at the carapace's sides.
    ctx.strokeStyle = rgba(PALE, 0.35);
    for (const share of [0.68, 0.74, 0.8]) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(at(share), middle + side * half(share) * 0.8);
        ctx.lineTo(at(share) - 2 * s, middle + side * (half(share) + 4 * s));
        ctx.stroke();
      }
    }
  },
};

export const pondPainters: Record<string, Painter> = {
  'pond.wall': wall,
  'pond.outlet': outlet,
  'pond.plume': plume,
  'pond.shape': shape,
};
