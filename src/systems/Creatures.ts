import Phaser from 'phaser';
import { imageFit } from '../art/fit';
import { CRAB_CLAW_JOINT } from '../art/painters/creatures';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { Crab } from '../core/creatures/crab';
import { School } from '../core/creatures/school';
import { Snail } from '../core/creatures/snail';
import type { MotionMode } from '../core/movement/ShrimpMotion';
import { seededRandom, seedOf } from '../core/random';
import type { AreaDef, CreatureDef } from '../data/areas/types';
import { CREATURES, FRAME, WORLD } from '../data/tuning';

/** The kinds that move by themselves. The others are still pictures, drawn by the area loader. */
export const LIVE_KINDS: ReadonlySet<CreatureDef['kind']> = new Set([
  'fiddlerCrab',
  'snail',
  'smallFish',
]);

/** Where the crab's body is pinned in its picture, as the still picture draws it. */
const CRAB_PIN_X = 104;

interface LiveCrab {
  def: CreatureDef;
  rule: Crab;
  shadow: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Container;
  parts: Phaser.GameObjects.Image[];
  claw: Phaser.GameObjects.Image;
  x: number;
  y: number;
}

interface LiveSnail {
  def: CreatureDef;
  rule: Snail;
  trail: Phaser.GameObjects.Graphics;
  feelers: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Image;
  shell: Phaser.GameObjects.Image;
}

interface LiveSchool {
  def: CreatureDef;
  rule: School;
  fish: Phaser.GameObjects.Image[];
  shadows: Phaser.GameObjects.Image[];
}

/** The player, as the animals notice it. */
export interface Passer {
  x: number;
  y: number;
  mode: MotionMode;
}

/**
 * The animals of an area that move: fiddler crabs waving on the bank,
 * snails crawling, schools of young fish holding in the current. Their rules
 * are in `src/core/creatures/`. See doc 11, "Mangrove creatures".
 */
export class Creatures {
  private readonly crabs: LiveCrab[] = [];
  private readonly snails: LiveSnail[] = [];
  private readonly schools: LiveSchool[] = [];

  constructor(
    scene: Phaser.Scene,
    area: AreaDef,
    private readonly bodyLengthPx: number,
  ) {
    const bl = bodyLengthPx;
    for (const def of area.creatures ?? []) {
      const random = seededRandom(seedOf(`${area.id}:${def.id}`));
      if (def.kind === 'fiddlerCrab') this.crabs.push(this.makeCrab(scene, def, bl, random));
      else if (def.kind === 'snail') this.snails.push(this.makeSnail(scene, def, bl, random));
      else if (def.kind === 'smallFish') this.schools.push(this.makeSchool(scene, def, bl, random));
    }
  }

  /**
   * One frame: every animal steps and its pictures follow. A slow frame is
   * stepped in short pieces, as the shrimp is, so a burst plays the same at
   * any frame rate.
   */
  update(dt: number, passer: Passer): void {
    const bl = this.bodyLengthPx;
    const fast = passer.mode === 'swim' || passer.mode === 'dart' || passer.mode === 'glide';
    const pieces = Math.max(1, Math.ceil(dt / FRAME.step - 1e-9));
    const piece = dt / pieces;
    for (const crab of this.crabs) {
      let pose = crab.rule.step(piece);
      for (let index = 1; index < pieces; index++) pose = crab.rule.step(piece);
      const heading = crab.def.heading ?? 0;
      // Sideways is across its heading.
      const sx = -Math.sin(heading) * pose.side * bl;
      const sy = Math.cos(heading) * pose.side * bl;
      const burrow = this.burrowOf(crab.def);
      const down = pose.down;
      crab.x = crab.def.x + sx + (burrow.x - crab.def.x - sx) * down;
      crab.y = crab.def.y + sy + (burrow.y - crab.def.y - sy) * down;
      const scale = crab.body.getData('scale') as number;
      crab.body
        .setPosition(crab.x, crab.y)
        .setScale(scale * (1 - 0.4 * down))
        .setAlpha(1 - down);
      crab.shadow.setPosition(crab.x + 4, crab.y + 6).setAlpha(0.4 * (1 - down));
      // Up and out, then down. Lifted, the claw comes a little closer to the eye.
      crab.claw.setRotation(-0.12 - 0.95 * pose.claw).setScale(1 + 0.12 * pose.claw);
    }
    for (const snail of this.snails) {
      for (let index = 0; index < pieces; index++) {
        snail.rule.step(piece, { x: passer.x, y: passer.y, fast });
      }
      this.placeSnail(snail);
    }
    for (const school of this.schools) {
      for (let index = 0; index < pieces; index++) school.rule.step(piece);
      school.rule.fish.forEach((fish, index) => {
        school.fish[index]?.setPosition(fish.x, fish.y).setRotation(fish.heading);
        school.shadows[index]
          ?.setPosition(fish.x + 0.2 * bl, fish.y + 0.27 * bl)
          .setRotation(fish.heading);
      });
    }
  }

  /** A tail flip at (x, y): a school close by bursts apart. */
  flip(x: number, y: number): void {
    for (const school of this.schools) school.rule.startle(x, y);
  }

  /** A threat's cue (step 7): the crabs go down their burrows and the schools burst. */
  cue(x: number, y: number): void {
    for (const crab of this.crabs) crab.rule.hide();
    for (const school of this.schools) school.rule.startle(x, y);
  }

  /** Where an animal is now, by its id in the area file. */
  where(id: string): { x: number; y: number } | null {
    const crab = this.crabs.find((one) => one.def.id === id);
    if (crab) return { x: crab.x, y: crab.y };
    const snail = this.snails.find((one) => one.def.id === id);
    if (snail) return { x: snail.rule.x, y: snail.rule.y };
    const school = this.schools.find((one) => one.def.id === id);
    if (school) return { x: school.rule.x, y: school.rule.y };
    return null;
  }

  /** The pictures that get the pale rim when the shrimp is curious about this animal. */
  imagesOf(id: string): Phaser.GameObjects.Image[] {
    const crab = this.crabs.find((one) => one.def.id === id);
    if (crab) return crab.parts;
    const snail = this.snails.find((one) => one.def.id === id);
    if (snail) return [snail.shell];
    return this.schools.find((one) => one.def.id === id)?.fish ?? [];
  }

  /** A crab waving its claw within `reach` px of the point, for "The waving claw". */
  wavingNear(x: number, y: number, reach: number): boolean {
    return this.crabs.some(
      (crab) => crab.rule.waving && Math.hypot(crab.x - x, crab.y - y) <= reach,
    );
  }

  /** The nearest animal of a kind, for a pinned challenge's ribbon. */
  nearest(kind: string, x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let distance = Infinity;
    for (const crab of this.crabs) {
      if (crab.def.kind !== kind) continue;
      const d = Math.hypot(crab.x - x, crab.y - y);
      if (d < distance) {
        distance = d;
        best = { x: crab.x, y: crab.y };
      }
    }
    return best;
  }

  /** What the browser test can see. */
  get snapshot(): { id: string; x: number; y: number; state: string; scattered?: number }[] {
    return [
      ...this.crabs.map((crab) => ({
        id: crab.def.id,
        x: crab.x,
        y: crab.y,
        state: crab.rule.inBurrow ? 'burrow' : 'out',
      })),
      ...this.snails.map((snail) => ({
        id: snail.def.id,
        x: snail.rule.x,
        y: snail.rule.y,
        state: snail.rule.withdrawn ? 'withdrawn' : 'crawling',
      })),
      ...this.schools.map((school) => ({
        id: school.def.id,
        x: school.rule.x,
        y: school.rule.y,
        state: school.rule.scattered > 0.5 ? 'scattered' : 'holding',
        scattered: school.rule.scattered,
      })),
    ];
  }

  private burrowOf(def: CreatureDef): { x: number; y: number } {
    const bl = this.bodyLengthPx;
    return { x: def.x - 0.75 * bl, y: def.y - 0.15 * bl };
  }

  /** The crab as the still picture draws it, but in parts: the big claw turns at its joint. */
  private makeCrab(
    scene: Phaser.Scene,
    def: CreatureDef,
    bl: number,
    random: () => number,
  ): LiveCrab {
    const burrow = this.burrowOf(def);
    image(scene, 'crab.burrow', burrow.x, burrow.y, 0.62 * bl, DEPTH.groundObjects);
    const shadow = scene.add
      .image(def.x + 4, def.y + 6, ensureTexture(scene, 'shadow.soft'))
      .setDisplaySize(1.0 * bl, 0.9 * bl)
      .setAlpha(0.4)
      .setDepth(DEPTH.groundObjects);
    const bodyKey = ensureTexture(scene, 'crab.body');
    const clawKey = ensureTexture(scene, 'crab.claw');
    const bodyFrame = scene.textures.getFrame(bodyKey);
    const clawFrame = scene.textures.getFrame(clawKey);
    const scale = (1.1 * bl) / bodyFrame.height;
    const body = scene.add.image(0, 0, bodyKey).setOrigin(CRAB_PIN_X / bodyFrame.width, 0.5);
    const claw = scene.add
      .image(CRAB_CLAW_JOINT.x - CRAB_PIN_X, CRAB_CLAW_JOINT.y - bodyFrame.height / 2, clawKey)
      .setOrigin(16 / clawFrame.width, 0.5)
      .setRotation(-0.5);
    const container = scene.add
      .container(def.x, def.y, [body, claw])
      .setRotation(def.heading ?? 0)
      .setScale(scale)
      .setDepth(DEPTH.bedAnimals);
    container.setData('scale', scale);
    return {
      def,
      rule: new Crab(CREATURES.crab, random),
      shadow,
      body: container,
      parts: [body, claw],
      claw,
      x: def.x,
      y: def.y,
    };
  }

  private makeSnail(
    scene: Phaser.Scene,
    def: CreatureDef,
    bl: number,
    random: () => number,
  ): LiveSnail {
    const rule = new Snail(
      CREATURES.snail,
      { x: def.x, y: def.y, heading: def.heading ?? 0 },
      bl,
      random,
    );
    const trail = scene.add.graphics().setDepth(DEPTH.groundObjects);
    const shadow = scene.add
      .image(def.x, def.y, ensureTexture(scene, 'shadow.soft'))
      .setAlpha(0.4)
      .setDepth(DEPTH.bedAnimals);
    const feelers = scene.add.graphics().setDepth(DEPTH.bedAnimals);
    const shell = image(scene, 'snail.shell', def.x, def.y, 0.8 * bl, DEPTH.bedAnimals);
    const snail = { def, rule, trail, feelers, shadow, shell };
    this.placeSnail(snail);
    return snail;
  }

  private placeSnail(snail: LiveSnail): void {
    const { rule } = snail;
    const width = 0.8 * this.bodyLengthPx;
    const heading = rule.heading;
    snail.shell.setPosition(rule.x, rule.y).setRotation(heading);
    snail.shadow
      .setPosition(rule.x + 3, rule.y + 5)
      .setDisplaySize(width * 0.95, width * 0.5)
      .setRotation(heading);
    // Two short feelers in front, drawn in as it pulls back.
    const f = snail.feelers.clear();
    const reach = rule.feelers;
    if (reach > 0.05) {
      f.lineStyle(2.2, 0x968e80, 0.9);
      const fx = Math.cos(heading);
      const fy = Math.sin(heading);
      for (const side of [-1, 1]) {
        const ax = width * 0.4;
        const bx = width * (0.4 + 0.16 * reach);
        const ay = side * 4;
        const by = side * (4 + 5 * reach);
        f.beginPath();
        f.moveTo(rule.x + fx * ax - fy * ay, rule.y + fy * ax + fx * ay);
        f.lineTo(rule.x + fx * bx - fy * by, rule.y + fy * bx + fx * by);
        f.strokePath();
      }
    }
    // A faint smooth trail behind it on the mud.
    const t = snail.trail.clear();
    const points = rule.trail;
    if (points.length > 1) {
      t.lineStyle(0.22 * width, 0xe6dcc0, 0.08);
      t.beginPath();
      points.forEach((point, index) => {
        if (index === 0) t.moveTo(point.x, point.y);
        else t.lineTo(point.x, point.y);
      });
      t.lineTo(rule.x, rule.y);
      t.strokePath();
    }
  }

  private makeSchool(
    scene: Phaser.Scene,
    def: CreatureDef,
    bl: number,
    random: () => number,
  ): LiveSchool {
    const rule = new School(
      CREATURES.fish,
      def.x,
      def.y,
      def.heading ?? 0,
      def.count ?? 12,
      bl,
      random,
    );
    const shadowKey = ensureTexture(scene, 'shadow.soft');
    // In mid-water: their shadows lie on the mud, well away from them.
    const shadows = rule.fish.map((fish) =>
      scene.add
        .image(fish.x + 0.2 * bl, fish.y + 0.27 * bl, shadowKey)
        .setDisplaySize(0.62 * bl, 0.16 * bl)
        .setRotation(fish.heading)
        .setAlpha(0.3)
        .setDepth(DEPTH.groundObjects),
    );
    const fish = rule.fish.map((one) =>
      image(scene, 'fish.small', one.x, one.y, 0.7 * bl, DEPTH.midWater).setRotation(one.heading),
    );
    return { def, rule, fish, shadows };
  }
}

/** A picture centred on a point, `width` wide, turned round with the coast if it faces a way. */
function image(
  scene: Phaser.Scene,
  name: string,
  x: number,
  y: number,
  width: number,
  depth: number,
): Phaser.GameObjects.Image {
  const key = ensureTexture(scene, name);
  const frame = scene.textures.getFrame(key);
  return scene.add
    .image(x, y, key)
    .setDisplaySize(width, (width * frame.height) / frame.width)
    .setFlipX(WORLD.mirror && imageFit(name).faces === true)
    .setDepth(depth);
}
