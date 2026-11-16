import Phaser from 'phaser';
import { IMAGE_SCALE, imageFit } from '../art/fit';
import { ROCK_FILL, SLAB_MARGIN } from '../art/painters/world';
import { makeStills, MID_WATER, OVER_COVER, STILL_REACH, type Stills } from '../art/stills';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Obstacle } from '../core/movement/collision';
import { seededRandom } from '../core/random';
import type { CoverSpot } from '../core/world/cover';
import type { AreaDef, CoverDef, CreatureDef, NamedZone, WallDef } from '../data/areas/types';
import { CAMERA, COVER, WORLD } from '../data/tuning';

/**
 * Builds a place from its data with Phaser objects: the bed, what lies on it,
 * the edges, the roots and stones, the animals as still pictures, and the
 * cover above the shrimp. The sizing rules are the ones the atelier follows
 * (`src/atelier/scene.ts`, and doc 14, "From data to picture").
 */

/** A cover as the game uses it: a spot to hide under, and what is drawn for it. */
export interface CoverHandle extends CoverSpot {
  id: string;
  def: CoverDef;
  /** Faded together while the player is beneath. */
  images: Phaser.GameObjects.Image[];
  /** A floating leaf's shadow on the bed. */
  shadow?: Phaser.GameObjects.Image;
  alpha: number;
}

export interface LoadedArea {
  area: AreaDef;
  bodyLengthPx: number;
  /** Everything solid: obstacles, edge strips and blocks. */
  obstacles: Obstacle[];
  covers: CoverHandle[];
  zones: NamedZone[];
  /** Keep the bed under the view. Call after the camera moves. */
  placeGround(left: number, top: number): void;
  /** Fade the cover the player is under and move the drifting leaves. */
  update(dt: number, playerX: number, playerY: number): void;
}

/** The view, in design pixels, at the game's zoom. */
export const VIEW_W = GAME_WIDTH / CAMERA.zoom;
export const VIEW_H = GAME_HEIGHT / CAMERA.zoom;

export function loadArea(scene: Phaser.Scene, area: AreaDef): LoadedArea {
  const bl = area.bodyLengthPx ?? 110;
  const flip = (name: string): boolean => WORLD.mirror && imageFit(name).faces === true;
  const imageOf = (name: string) => scene.textures.get(ensureTexture(scene, name)).getSourceImage();
  const stills = makeStills((name) => imageOf(name) as HTMLCanvasElement);

  /** A picture centred on a point, `width` wide, as the atelier's `drawCentred`. */
  const centred = (
    name: string,
    x: number,
    y: number,
    width: number,
    depth: number,
    rotation = 0,
    alpha = 1,
  ): Phaser.GameObjects.Image => {
    const key = ensureTexture(scene, name);
    const frame = scene.textures.getFrame(key);
    return scene.add
      .image(x, y, key)
      .setDisplaySize(width, (width * frame.height) / frame.width)
      .setRotation(rotation)
      .setAlpha(alpha)
      .setFlipX(flip(name))
      .setDepth(depth);
  };
  const shadow = (
    x: number,
    y: number,
    w: number,
    h: number,
    alpha: number,
    depth: number,
    rotation = 0,
  ): Phaser.GameObjects.Image =>
    scene.add
      .image(x, y, ensureTexture(scene, 'shadow.soft'))
      .setDisplaySize(w, h)
      .setRotation(rotation)
      .setAlpha(alpha)
      .setDepth(depth);

  // 1. The bed: one repeating image the size of the view, slid as the view moves.
  const groundScale = 1 / IMAGE_SCALE;
  const ground = scene.add
    .tileSprite(0, 0, VIEW_W + 4, VIEW_H + 4, ensureTexture(scene, area.ground))
    .setOrigin(0)
    .setTileScale(groundScale)
    .setDepth(DEPTH.bed);

  // 2. A second ground, feathered into the first.
  (area.groundPatches ?? []).forEach((patch, index) => {
    const key = `patch.${area.id}.${index}.${WORLD.mirror ? 'm' : 'n'}`;
    if (!scene.textures.exists(key)) {
      const w = Math.round(patch.zone.w * IMAGE_SCALE);
      const h = Math.round(patch.zone.h * IMAGE_SCALE);
      const texture = scene.textures.createCanvas(key, w, h);
      if (!texture) throw new Error(`Could not create the image "${key}"`);
      const ctx = texture.context;
      // The pattern lines up with the world, as the bed does.
      const pattern = ctx.createPattern(imageOf(patch.image) as HTMLCanvasElement, 'repeat');
      if (pattern) {
        pattern.setTransform(
          new DOMMatrix().translate(-patch.zone.x * IMAGE_SCALE, -patch.zone.y * IMAGE_SCALE),
        );
        ctx.fillStyle = pattern;
      }
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.translate(w / 2, h / 2);
      ctx.scale(w / h, 1);
      const reach = h / 2;
      const feather = patch.feather * IMAGE_SCALE;
      const mask = ctx.createRadialGradient(0, 0, Math.max(0, reach - feather), 0, 0, reach);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mask;
      ctx.fillRect(-reach * 4, -reach * 4, reach * 8, reach * 8);
      texture.refresh();
    }
    scene.add
      .image(patch.zone.x, patch.zone.y, key)
      .setOrigin(0)
      .setDisplaySize(patch.zone.w, patch.zone.h)
      .setDepth(DEPTH.bed + 0.5);
  });

  // 3. Scatter. Same numbers, in the same order, as the atelier draws.
  for (const scatter of area.scatter) {
    const random = seededRandom(scatter.seed);
    const texture = ensureTexture(scene, scatter.image);
    for (let index = 0; index < scatter.count; index++) {
      const x = scatter.zone.x + random() * scatter.zone.w;
      const y = scatter.zone.y + random() * scatter.zone.h;
      const size = scatter.size[0] + random() * (scatter.size[1] - scatter.size[0]);
      const squash = 0.7 + random() * 0.3;
      const turn = random() * Math.PI * 2;
      const shade = 0.82 + random() * 0.18;
      scene.add
        .image(x, y, texture)
        .setDisplaySize(size, size * squash)
        .setRotation(turn)
        .setTint(Phaser.Display.Color.GetColor(255 * shade, 250 * shade, 238 * shade))
        .setDepth(DEPTH.bed + 1);
    }
  }

  // 4. Food and the landmarks that lie on the bed. Fuzz grows on the seagrass: it is drawn with its clump.
  for (const food of area.food ?? []) {
    if (food.kind === 'seagrassFuzz') continue;
    centred(`food.${food.kind}`, food.x, food.y, food.size, DEPTH.groundObjects, food.rotation);
  }
  for (const landmark of area.landmarks ?? []) {
    if (landmark.layer !== 'ground') continue;
    const turn = landmark.rotation ?? 0;
    shadow(
      landmark.x + 5,
      landmark.y + 8,
      landmark.width * 1.05,
      landmark.width * 0.5,
      0.35,
      DEPTH.groundObjects,
      turn,
    );
    centred(landmark.image, landmark.x, landmark.y, landmark.width, DEPTH.groundObjects, turn);
  }

  // 5. The edges, then what stands on the bed. A root clump may close the end of an edge strip.
  const obstacles: Obstacle[] = [];
  for (const wall of area.walls ?? []) {
    addWall(scene, area, wall);
    obstacles.push(wallRect(area, wall));
  }
  for (const obstacle of area.obstacles) {
    obstacles.push(obstacle);
    if (obstacle.shape === 'circle') {
      const fill = imageFit(obstacle.image).fill ?? ROCK_FILL;
      const size = (obstacle.r * 2) / fill;
      shadow(
        obstacle.x + obstacle.r * 0.2,
        obstacle.y + obstacle.r * 0.26,
        obstacle.r * 2.5,
        obstacle.r * 2.5,
        0.5,
        DEPTH.groundObjects,
      );
      centred(obstacle.image, obstacle.x, obstacle.y, size, DEPTH.groundObjects, obstacle.rotation);
    } else {
      addSlab(scene, obstacle.image, obstacle, shadow);
    }
  }
  obstacles.push(...(area.blocks ?? []));

  // 6. Animals: on the bed, in mid-water, or over the cover with their shadows below.
  for (const creature of area.creatures ?? []) {
    if (OVER_COVER.has(creature.kind)) {
      addStill(scene, area, creature, bl, DEPTH.midWater, stills, 'shadow');
      addStill(scene, area, creature, bl, DEPTH.overCover, stills, 'body');
    } else {
      const depth = MID_WATER.has(creature.kind) ? DEPTH.midWater : DEPTH.bedAnimals;
      addStill(scene, area, creature, bl, depth, stills, 'body');
    }
  }

  // 7. Cover, above the shrimp. A floating leaf throws its shadow on what lies below.
  for (const landmark of area.landmarks ?? []) {
    if (landmark.layer !== 'cover') continue;
    centred(landmark.image, landmark.x, landmark.y, landmark.width, DEPTH.cover, landmark.rotation);
  }
  const covers: CoverHandle[] = [];
  for (const cover of area.cover ?? []) {
    const images: Phaser.GameObjects.Image[] = [];
    let leafShadow: Phaser.GameObjects.Image | undefined;
    if (cover.image) {
      const width = cover.width ?? (cover.r * 2) / (imageFit(cover.image).fill ?? 1);
      const turn = cover.rotation ?? 0;
      if (cover.kind === 'leaf') {
        leafShadow = shadow(
          cover.x + 0.3 * bl,
          cover.y + 0.4 * bl,
          width * 0.98,
          width * 0.5,
          0.5,
          DEPTH.cover - 1,
          turn,
        );
      }
      images.push(centred(cover.image, cover.x, cover.y, width, DEPTH.cover, turn));
      for (const food of area.food ?? []) {
        if (food.kind !== 'seagrassFuzz' || food.x !== cover.x || food.y !== cover.y) continue;
        images.push(
          centred('food.seagrassFuzz', food.x, food.y, food.size, DEPTH.cover, food.rotation),
        );
      }
    }
    covers.push({
      id: cover.id,
      def: cover,
      x: cover.x,
      y: cover.y,
      r: cover.r,
      images,
      shadow: leafShadow,
      alpha: 1,
    });
  }

  const fadeRate = (1 - COVER.fadedAlpha) / COVER.fadeTime;

  return {
    area,
    bodyLengthPx: bl,
    obstacles,
    covers,
    zones: area.zones ?? [],
    placeGround(left, top) {
      ground.setPosition(left, top).setTilePosition(left / groundScale, top / groundScale);
    },
    update(dt, playerX, playerY) {
      for (const cover of covers) {
        const drift = cover.def.drift;
        if (drift) {
          const within = drift.within;
          cover.x = wrap(cover.x + drift.x * dt, within.x, within.x + within.w);
          cover.y = wrap(cover.y + drift.y * dt, within.y, within.y + within.h);
          for (const image of cover.images) image.setPosition(cover.x, cover.y);
          cover.shadow?.setPosition(cover.x + 0.3 * bl, cover.y + 0.4 * bl);
        }
        const beneath = Math.hypot(playerX - cover.x, playerY - cover.y) < cover.r;
        const target = beneath ? COVER.fadedAlpha : 1;
        if (cover.alpha !== target) {
          const step = fadeRate * dt;
          cover.alpha =
            cover.alpha < target
              ? Math.min(target, cover.alpha + step)
              : Math.max(target, cover.alpha - step);
          for (const image of cover.images) image.setAlpha(cover.alpha);
        }
      }
    },
  };
}

function wrap(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return value;
  return ((((value - min) % span) + span) % span) + min;
}

/** The solid part of an edge strip, for collision: `depth` thick along its edge. */
export function wallRect(area: AreaDef, wall: WallDef): Obstacle {
  const { w, h } = area.size;
  const length = wall.to - wall.from;
  switch (wall.side) {
    case 'top':
      return { shape: 'rect', x: wall.from, y: 0, w: length, h: wall.depth };
    case 'bottom':
      return { shape: 'rect', x: wall.from, y: h - wall.depth, w: length, h: wall.depth };
    case 'left':
      return { shape: 'rect', x: 0, y: wall.from, w: wall.depth, h: length };
    case 'right':
      return { shape: 'rect', x: w - wall.depth, y: wall.from, w: wall.depth, h: length };
  }
}

/**
 * An edge strip: its picture repeats along the edge with the solid part toward
 * the outside. The picture is turned so that "along the edge" is its x and
 * "into the area" its y, as the atelier's `drawWall` does.
 */
function addWall(scene: Phaser.Scene, area: AreaDef, wall: WallDef): void {
  const key = ensureTexture(scene, wall.image);
  const frame = scene.textures.getFrame(key);
  const solid = imageFit(wall.image).solid ?? 0.5;
  const scale = wall.depth / (solid * frame.height);
  const thick = frame.height * scale;
  const { w, h } = area.size;
  const horizontal = wall.side === 'top' || wall.side === 'bottom';
  const length = horizontal ? w : h;
  // After turning, a strip that ran from `from` to `to` runs the other way on two sides.
  const flipped = wall.side === 'bottom' || wall.side === 'left';
  const start = flipped ? length - wall.to : wall.from;
  const end = flipped ? length - wall.from : wall.to;
  const at = {
    top: { x: start, y: 0, rotation: 0 },
    bottom: { x: w - start, y: h, rotation: Math.PI },
    left: { x: 0, y: h - start, rotation: -Math.PI / 2 },
    right: { x: w, y: start, rotation: Math.PI / 2 },
  }[wall.side];
  scene.add
    .tileSprite(at.x, at.y, end - start, thick, key)
    .setOrigin(0)
    .setRotation(at.rotation)
    .setTileScale(scale)
    // The pattern starts at the edge's own start, not at the strip's.
    .setTilePosition(start / scale, 0)
    .setDepth(DEPTH.groundObjects);
}

/** A stone slab: a rectangle obstacle, as the sand flat has. */
function addSlab(
  scene: Phaser.Scene,
  image: string,
  obstacle: Extract<Obstacle, { shape: 'rect' }>,
  shadow: (x: number, y: number, w: number, h: number, alpha: number, depth: number) => unknown,
): void {
  const key = ensureTexture(scene, image);
  const centerX = obstacle.x + obstacle.w / 2;
  const centerY = obstacle.y + obstacle.h / 2;
  const upright = obstacle.h > obstacle.w;
  const long = Math.max(obstacle.w, obstacle.h);
  const short = Math.min(obstacle.w, obstacle.h);
  const frame = scene.textures.getFrame(key);
  // The stone fills its image except for a margin left for its soft edge.
  const scaleX = long / (frame.width - SLAB_MARGIN * 2);
  const scaleY = short / (frame.height - SLAB_MARGIN * 2);
  shadow(
    centerX + 10,
    centerY + 14,
    obstacle.w * 1.25,
    obstacle.h * 1.25,
    0.38,
    DEPTH.groundObjects,
  );
  scene.add
    .image(centerX, centerY, key)
    .setScale(scaleX, scaleY)
    .setRotation(upright ? Math.PI / 2 : 0)
    .setDepth(DEPTH.groundObjects);
}

/**
 * An animal as a still picture: drawn once into its own texture with the
 * atelier's code, then placed. They start to move in step 5.
 */
function addStill(
  scene: Phaser.Scene,
  area: AreaDef,
  creature: CreatureDef,
  bl: number,
  depth: number,
  stills: Stills,
  part: 'body' | 'shadow',
): void {
  const reach = STILL_REACH[creature.kind] * bl;
  const key = `still.${area.id}.${creature.id}.${part}.${WORLD.mirror ? 'm' : 'n'}`;
  if (!scene.textures.exists(key)) {
    const size = Math.ceil(2 * reach * IMAGE_SCALE);
    const texture = scene.textures.createCanvas(key, size, size);
    if (!texture) throw new Error(`Could not create the image "${key}"`);
    const ctx = texture.context;
    ctx.scale(IMAGE_SCALE, IMAGE_SCALE);
    ctx.translate(reach - creature.x, reach - creature.y);
    if (part === 'shadow') stills.swimmerShadow(ctx, creature, bl);
    else stills.drawCreature(ctx, creature, bl);
    texture.refresh();
  }
  scene.add
    .image(creature.x, creature.y, key)
    .setDisplaySize(2 * reach, 2 * reach)
    .setDepth(depth);
}
