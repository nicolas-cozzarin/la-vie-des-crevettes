import { IMAGE_SCALE, imageFit } from '../art/fit';
import { BIRD_NECK_START } from '../art/painters/creatures';
import { makeStills, MID_WATER, OVER_COVER } from '../art/stills';
import { seededRandom } from '../core/random';
import { mirrorArea } from '../data/areas/mirror';
import type { AreaDef, CoverDef, WallDef } from '../data/areas/types';
import { WORLD } from '../data/tuning';
import { paintImage } from './images';
import { drawStillShrimp, type StillShrimp } from './stillShrimp';

/**
 * Draws a view of an area from its data, the way the game will: bed, things
 * on it, animals, cover, light, murk. It is a picture of how the area should
 * look, not the game. The sizing rules here are the ones the game's area
 * loader must follow. See docs/15-implementation-guide.md, step 3.
 */

export interface SceneView {
  area: AreaDef;
  /** The part of the area shown, in design pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Canvas pixels for each design pixel. */
  scale: number;
  shrimp?: StillShrimp[];
  /** Ids of cover drawn faded, as when the player is beneath. */
  faded?: string[];
  /** Where the murk is centred. Left out, no murk. */
  murkAt?: { x: number; y: number };
  /** The bird, standing over the water. */
  bird?: { x: number; y: number; heading: number; strikeAt?: { x: number; y: number } };
  /** Draw the zone rectangles and their letters, for a map. */
  showZones?: boolean;
  /** Where the area has a day cycle: the time shown. Left out, day. */
  time?: 'day' | 'dusk' | 'night';
  /** At night, points the glowing plankton brightens around: the wake of whatever moved. */
  wake?: { x: number; y: number }[];
  /** Places in `shrimp` of the ones dug into the sand, eyes and antennae out. */
  burrowed?: number[];
}

type Ctx = CanvasRenderingContext2D;

const { drawCentred, softShadow, drawCreature, swimmerShadow } = makeStills(paintImage);

function tilePattern(ctx: Ctx, name: string): CanvasPattern {
  const pattern = ctx.createPattern(paintImage(name), 'repeat') as CanvasPattern;
  pattern.setTransform(new DOMMatrix().scale(1 / IMAGE_SCALE));
  return pattern;
}

function drawWall(ctx: Ctx, area: AreaDef, wall: WallDef): void {
  const image = paintImage(wall.image);
  const solid = imageFit(wall.image).solid ?? 0.5;
  // The solid part of the strip is `depth` thick.
  const scale = wall.depth / (solid * image.height);
  const tile = image.width * scale;
  const thick = image.height * scale;
  ctx.save();
  // Turn the picture so that "along the edge" is x and "into the area" is y.
  if (wall.side === 'bottom') {
    ctx.translate(area.size.w, area.size.h);
    ctx.rotate(Math.PI);
  } else if (wall.side === 'left') {
    ctx.translate(0, area.size.h);
    ctx.rotate(-Math.PI / 2);
  } else if (wall.side === 'right') {
    ctx.translate(area.size.w, 0);
    ctx.rotate(Math.PI / 2);
  }
  const length = wall.side === 'top' || wall.side === 'bottom' ? area.size.w : area.size.h;
  // After turning, a strip that ran from `from` to `to` runs the other way on two sides.
  const flipped = wall.side === 'bottom' || wall.side === 'left';
  const start = flipped ? length - wall.to : wall.from;
  const end = flipped ? length - wall.from : wall.to;
  ctx.beginPath();
  ctx.rect(start, 0, end - start, thick);
  ctx.clip();
  for (let x = Math.floor(start / tile) * tile; x < end; x += tile) {
    ctx.drawImage(image, x, 0, tile, thick);
  }
  ctx.restore();
}

function coverWidth(cover: CoverDef): number {
  if (!cover.image) return 0;
  if (cover.width) return cover.width;
  return (cover.r * 2) / (imageFit(cover.image).fill ?? 1);
}

/**
 * Sand over a shrimp dug in: the body and legs hidden from the tail fan to
 * just behind the eyes. The eyes and antennae stay out.
 */
function drawSandOver(ctx: Ctx, area: AreaDef, shrimp: StillShrimp, view: SceneView): void {
  const bl = shrimp.look?.bodyLengthPx ?? area.bodyLengthPx ?? 110;
  const reach = 1.1 * bl;
  const left = shrimp.x - reach;
  const top = shrimp.y - reach;
  const layer = document.createElement('canvas');
  layer.width = Math.ceil(2 * reach * view.scale);
  layer.height = layer.width;
  const lctx = layer.getContext('2d') as Ctx;
  lctx.scale(view.scale, view.scale);
  lctx.translate(-left, -top);
  lctx.fillStyle = tilePattern(lctx, area.ground);
  lctx.fillRect(left, top, 2 * reach, 2 * reach);
  // A little darker where it was turned over, wet from below.
  lctx.fillStyle = 'rgba(120,100,62,0.12)';
  lctx.fillRect(left, top, 2 * reach, 2 * reach);
  lctx.globalCompositeOperation = 'destination-in';
  lctx.filter = `blur(${0.035 * bl * view.scale}px)`;
  lctx.translate(shrimp.x, shrimp.y);
  lctx.rotate(shrimp.heading);
  lctx.fillStyle = '#000';
  lctx.beginPath();
  lctx.roundRect(-0.78 * bl, -0.22 * bl, 1.02 * bl, 0.44 * bl, 0.2 * bl);
  lctx.fill();
  const fx = Math.cos(shrimp.heading);
  const fy = Math.sin(shrimp.heading);
  softShadow(
    ctx,
    shrimp.x - fx * 0.27 * bl + 2,
    shrimp.y - fy * 0.27 * bl + 3,
    1.2 * bl,
    0.55 * bl,
    0.16,
    shrimp.heading,
  );
  ctx.drawImage(layer, left, top, 2 * reach, 2 * reach);
}

/** Dusk and night are laid over everything with a multiply blend. Colours from doc 04. */
const DUSK = '#F0B27A';
const DUSK_STRENGTH = 0.55;
const NIGHT = '#1B2350';
const NIGHT_STRENGTH = 0.86;
/** Plankton points for each square body length in the shallows. Elsewhere a third as many. */
const PLANKTON_PER_BL2 = 2;

/**
 * Glowing plankton at night: faint points everywhere, thickest in the
 * bright shallows, and bright for a body length and a half around the wake.
 */
function drawPlankton(ctx: Ctx, view: SceneView, bl: number): void {
  const shallows = (view.area.zones ?? []).find((zone) => zone.id === 'F')?.zone;
  const random = seededRandom(view.area.size.w + view.area.size.h);
  const count = Math.round((view.area.size.w * view.area.size.h * PLANKTON_PER_BL2) / (bl * bl));
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let index = 0; index < count; index++) {
    const x = random() * view.area.size.w;
    const y = random() * view.area.size.h;
    const keep = random();
    const size = 0.1 + random() * 0.12;
    const thick =
      shallows &&
      x > shallows.x &&
      x < shallows.x + shallows.w &&
      y > shallows.y &&
      y < shallows.y + shallows.h;
    if (keep > (thick ? 1 : 0.35) || !(x > view.x - bl && x < view.x + view.w + bl)) continue;
    if (!(y > view.y - bl && y < view.y + view.h + bl)) continue;
    const near = Math.min(
      Infinity,
      ...(view.wake ?? []).map((point) => Math.hypot(x - point.x, y - point.y)),
    );
    const lit = Math.max(0, 1 - near / (1.5 * bl));
    ctx.globalAlpha = 0.22 + 0.78 * lit;
    const width = size * bl * (1 + 1.6 * lit);
    ctx.drawImage(paintImage('fx.glow'), x - width / 2, y - width / 2, width, width);
  }
  ctx.restore();
}

/**
 * The view as the game shows it. When the coast is turned round (doc 19), the
 * area and everything placed in the view are mirrored, so a named view still
 * looks at the same things.
 */
function asPlayed(view: SceneView): SceneView {
  if (!WORLD.mirror) return view;
  const w = view.area.size.w;
  const point = <T extends { x: number }>(p: T): T => ({ ...p, x: w - p.x });
  const turn = (heading: number): number => Math.PI - heading;
  return {
    ...view,
    area: mirrorArea(view.area),
    x: w - view.x - view.w,
    shrimp: view.shrimp?.map((one) => ({
      ...point(one),
      heading: turn(one.heading),
      target: one.target && point(one.target),
      curve: one.curve === undefined ? undefined : -one.curve,
      sweep: one.sweep === undefined ? undefined : -one.sweep,
    })),
    murkAt: view.murkAt && point(view.murkAt),
    bird: view.bird && {
      ...point(view.bird),
      heading: turn(view.bird.heading),
      strikeAt: view.bird.strikeAt && point(view.bird.strikeAt),
    },
    wake: view.wake?.map(point),
  };
}

export function renderScene(asWritten: SceneView): HTMLCanvasElement {
  const view = asPlayed(asWritten);
  const { area } = view;
  const bl = area.bodyLengthPx ?? 110;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(view.w * view.scale);
  canvas.height = Math.round(view.h * view.scale);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(view.scale, view.scale);
  ctx.translate(-view.x, -view.y);
  const inView = (x: number, y: number, reach: number): boolean =>
    x > view.x - reach &&
    x < view.x + view.w + reach &&
    y > view.y - reach &&
    y < view.y + view.h + reach;

  // 1. The bed.
  ctx.fillStyle = tilePattern(ctx, area.ground);
  ctx.fillRect(view.x, view.y, view.w, view.h);

  // 2. A second ground, feathered into the first.
  for (const patch of area.groundPatches ?? []) {
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const lctx = layer.getContext('2d') as Ctx;
    lctx.scale(view.scale, view.scale);
    lctx.translate(-view.x, -view.y);
    lctx.fillStyle = tilePattern(lctx, patch.image);
    lctx.fillRect(view.x, view.y, view.w, view.h);
    lctx.globalCompositeOperation = 'destination-in';
    // An oval that is whole inside the zone and gone by its edge.
    const cx = patch.zone.x + patch.zone.w / 2;
    const cy = patch.zone.y + patch.zone.h / 2;
    lctx.translate(cx, cy);
    lctx.scale(patch.zone.w / patch.zone.h, 1);
    const reach = patch.zone.h / 2;
    const mask = lctx.createRadialGradient(0, 0, Math.max(0, reach - patch.feather), 0, 0, reach);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = mask;
    lctx.fillRect(-reach * 4, -reach * 4, reach * 8, reach * 8);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  // 3. Scatter. Same numbers, in the same order, as the game draws.
  for (const scatter of area.scatter) {
    const random = seededRandom(scatter.seed);
    const image = paintImage(scatter.image);
    for (let index = 0; index < scatter.count; index++) {
      const x = scatter.zone.x + random() * scatter.zone.w;
      const y = scatter.zone.y + random() * scatter.zone.h;
      const size = scatter.size[0] + random() * (scatter.size[1] - scatter.size[0]);
      const squash = 0.7 + random() * 0.3;
      const turn = random() * Math.PI * 2;
      random();
      if (!inView(x, y, size)) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.drawImage(image, -size / 2, (-size * squash) / 2, size, size * squash);
      ctx.restore();
    }
  }

  // 4. Things that lie on the bed: food and landmarks.
  for (const food of area.food ?? []) {
    // Fuzz is on the blades of a clump: it is drawn with the clump, in the cover.
    if (food.kind === 'seagrassFuzz' || !inView(food.x, food.y, food.size)) continue;
    drawCentred(ctx, `food.${food.kind}`, food.x, food.y, food.size, food.rotation ?? 0);
  }
  for (const landmark of area.landmarks ?? []) {
    if (landmark.layer !== 'ground' || !inView(landmark.x, landmark.y, landmark.width)) continue;
    softShadow(
      ctx,
      landmark.x + 5,
      landmark.y + 8,
      landmark.width * 1.05,
      landmark.width * 0.5,
      0.35,
      landmark.rotation ?? 0,
    );
    drawCentred(
      ctx,
      landmark.image,
      landmark.x,
      landmark.y,
      landmark.width,
      landmark.rotation ?? 0,
    );
  }
  // 5. The edges, then the things that stand on the bed. A root clump may close the end of an edge strip.
  for (const wall of area.walls ?? []) drawWall(ctx, area, wall);
  for (const obstacle of area.obstacles) {
    if (obstacle.shape !== 'circle' || !inView(obstacle.x, obstacle.y, obstacle.r * 3)) continue;
    const size = (obstacle.r * 2) / (imageFit(obstacle.image).fill ?? 1);
    softShadow(
      ctx,
      obstacle.x + obstacle.r * 0.2,
      obstacle.y + obstacle.r * 0.26,
      obstacle.r * 2.5,
      obstacle.r * 2.5,
      0.5,
    );
    drawCentred(ctx, obstacle.image, obstacle.x, obstacle.y, size, obstacle.rotation ?? 0);
  }

  // 6. Animals on the bed, then the shrimp.
  const swimmers = (area.creatures ?? []).filter(
    (creature) => OVER_COVER.has(creature.kind) && inView(creature.x, creature.y, 6 * bl),
  );
  for (const creature of area.creatures ?? []) {
    const swims = MID_WATER.has(creature.kind) || OVER_COVER.has(creature.kind);
    if (swims || !inView(creature.x, creature.y, 300)) continue;
    drawCreature(ctx, creature, bl);
  }
  (view.shrimp ?? []).forEach((shrimp, index) => {
    drawStillShrimp(ctx, shrimp);
    if (view.burrowed?.includes(index)) drawSandOver(ctx, area, shrimp, view);
  });

  // 7. Mid-water, and the shadows of what swims over the cover.
  for (const creature of area.creatures ?? []) {
    if (!MID_WATER.has(creature.kind) || !inView(creature.x, creature.y, 500)) continue;
    drawCreature(ctx, creature, bl);
  }
  for (const creature of swimmers) swimmerShadow(ctx, creature, bl);

  // 8. Cover, above the shrimp. A floating leaf throws its shadow on the bed below.
  for (const landmark of area.landmarks ?? []) {
    if (landmark.layer !== 'cover' || !inView(landmark.x, landmark.y, landmark.width)) continue;
    drawCentred(
      ctx,
      landmark.image,
      landmark.x,
      landmark.y,
      landmark.width,
      landmark.rotation ?? 0,
    );
  }
  for (const cover of area.cover ?? []) {
    if (!cover.image || !inView(cover.x, cover.y, cover.r * 3)) continue;
    const width = coverWidth(cover);
    const alpha = view.faded?.includes(cover.id) ? 0.4 : 1;
    if (cover.kind === 'leaf') {
      softShadow(
        ctx,
        cover.x + 0.3 * bl,
        cover.y + 0.4 * bl,
        width * 0.98,
        width * 0.5,
        0.5,
        cover.rotation ?? 0,
      );
    }
    drawCentred(ctx, cover.image, cover.x, cover.y, width, cover.rotation ?? 0, alpha);
    for (const food of area.food ?? []) {
      if (food.kind !== 'seagrassFuzz' || food.x !== cover.x || food.y !== cover.y) continue;
      drawCentred(ctx, 'food.seagrassFuzz', food.x, food.y, food.size, food.rotation ?? 0, alpha);
    }
  }

  // 8b. Large animals over the seagrass.
  for (const creature of swimmers) drawCreature(ctx, creature, bl);

  // 9. Light from above: weaker at dusk, gone at night.
  const time = area.dayCycle ? (view.time ?? 'day') : 'day';
  if (area.light?.dapple && time !== 'night') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (area.light.dappleStrength ?? 1) * (time === 'dusk' ? 0.4 : 1);
    ctx.fillStyle = tilePattern(ctx, area.light.dapple);
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.restore();
  }

  // 10. The bird: a shadow on the water, two feet on the mud, a ring where it will strike.
  if (view.bird) {
    const { x, y, heading } = view.bird;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    for (const side of [-1, 1]) {
      const fx = x - sin * side * 1.3 * bl + cos * side * 0.5 * bl;
      const fy = y + cos * side * 1.3 * bl + sin * side * 0.5 * bl;
      drawCentred(ctx, 'bird.foot', fx, fy, 3.6 * bl, heading + side * 0.15);
      drawCentred(ctx, 'fx.ripple', fx - cos * 0.25 * bl, fy - sin * 0.25 * bl, 1.1 * bl, 0, 0.55);
    }
    drawCentred(
      ctx,
      'bird.shadow.body',
      x - cos * 0.6 * bl,
      y - sin * 0.6 * bl,
      9 * bl,
      heading,
      0.9,
    );
    const neck = paintImage('bird.shadow.head');
    const neckWidth = 4.25 * bl;
    const neckHeight = (neckWidth * neck.height) / neck.width;
    const aim = view.bird.strikeAt
      ? Math.atan2(view.bird.strikeAt.y - y, view.bird.strikeAt.x - x)
      : heading;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.translate(x + cos * 2.2 * bl, y + sin * 2.2 * bl);
    ctx.rotate(aim);
    const pin = neckWidth / neck.width;
    ctx.drawImage(neck, -BIRD_NECK_START.x * pin, -BIRD_NECK_START.y * pin, neckWidth, neckHeight);
    ctx.restore();
    if (view.bird.strikeAt) {
      drawCentred(ctx, 'fx.ripple', view.bird.strikeAt.x, view.bird.strikeAt.y, 2 * bl, 0, 0.9);
    }
  }

  // 11. Murk: centred on the shrimp and twice the size of the game's view,
  // so that it still covers the screen when the shrimp is not at its centre.
  if (view.murkAt && area.light?.murk) {
    const murk = paintImage(area.light.murk);
    const w = (1920 / 1.4) * 2;
    const h = (1080 / 1.4) * 2;
    ctx.drawImage(murk, view.murkAt.x - w / 2, view.murkAt.y - h / 2, w, h);
  }

  // 11b. The time of day, over the murk too, then the living light at night.
  if (time !== 'day') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = time === 'dusk' ? DUSK_STRENGTH : NIGHT_STRENGTH;
    ctx.fillStyle = time === 'dusk' ? DUSK : NIGHT;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    ctx.restore();
  }
  if (time === 'night') drawPlankton(ctx, view, bl);

  if (view.showZones) {
    ctx.save();
    // Letters and lines the same size on the page whatever the scale.
    ctx.font = `600 ${Math.round(27 / view.scale)}px Georgia, serif`;
    ctx.textBaseline = 'top';
    for (const zone of area.zones ?? []) {
      ctx.strokeStyle = 'rgba(246,241,228,0.6)';
      ctx.lineWidth = 1.8 / view.scale;
      ctx.setLineDash([7.2 / view.scale, 5.4 / view.scale]);
      ctx.strokeRect(zone.zone.x, zone.zone.y, zone.zone.w, zone.zone.h);
      ctx.fillStyle = 'rgba(246,241,228,0.9)';
      ctx.fillText(zone.id, zone.zone.x + 7 / view.scale, zone.zone.y + 5 / view.scale);
    }
    ctx.restore();
  }

  // 12. Edge darkening and paper grain, as the game lays them over everything.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (view.murkAt) ctx.drawImage(paintImage('fx.vignette'), 0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = ctx.createPattern(paintImage('fx.grain'), 'repeat') as CanvasPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  return canvas;
}
