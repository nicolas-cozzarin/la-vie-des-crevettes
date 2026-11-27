import Phaser from 'phaser';
import { imageFit } from '../art/fit';
import { CRAB_CLAW_JOINT, HERMIT_LEGS_JOINT, HERMIT_SHELL_MOUTH } from '../art/painters/creatures';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { BurrowPair } from '../core/creatures/burrowPair';
import { Crab } from '../core/creatures/crab';
import { Hermit } from '../core/creatures/hermit';
import { School } from '../core/creatures/school';
import { Snail } from '../core/creatures/snail';
import { Turtle } from '../core/creatures/turtle';
import type { MotionMode } from '../core/movement/ShrimpMotion';
import { seededRandom, seedOf } from '../core/random';
import type { AreaDef, CreatureDef } from '../data/areas/types';
import { CREATURES, FRAME, WORLD } from '../data/tuning';
import { BurrowPairView } from '../entities/BurrowPairView';
import { TurtleView } from '../entities/TurtleView';

/** The kinds that move by themselves. The others are still pictures, drawn by the area loader. */
export const LIVE_KINDS: ReadonlySet<CreatureDef['kind']> = new Set([
  'fiddlerCrab',
  'snail',
  'hermitCrab',
  'smallFish',
  'turtle',
  'pistolAndGoby',
]);

/** The kinds the threats draw when they come. The area's entry is only where they come from. */
export const THREAT_KINDS: ReadonlySet<CreatureDef['kind']> = new Set(['huntingFish']);

/** A hermit crab's whole length, shell and legs, in BL (doc 11). */
const HERMIT_LENGTH = 0.9;

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

interface LiveHermit {
  def: CreatureDef;
  rule: Hermit;
  shadow: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Container;
  shell: Phaser.GameObjects.Image;
  legs: Phaser.GameObjects.Image;
  /** Where the legs sit when out, in the body's own pixels. */
  legsAt: number;
}

interface LiveTurtle {
  def: CreatureDef;
  rule: Turtle;
  view: TurtleView;
}

interface LivePair {
  def: CreatureDef;
  rule: BurrowPair;
  view: BurrowPairView;
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
  private readonly hermits: LiveHermit[] = [];
  private readonly schools: LiveSchool[] = [];
  private readonly turtles: LiveTurtle[] = [];
  private readonly pairs: LivePair[] = [];
  private flicked = 0;

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
      else if (def.kind === 'hermitCrab')
        this.hermits.push(this.makeHermit(scene, def, bl, random));
      else if (def.kind === 'smallFish') this.schools.push(this.makeSchool(scene, def, bl, random));
      else if (def.kind === 'turtle') this.turtles.push(this.makeTurtle(scene, area, def, bl));
      else if (def.kind === 'pistolAndGoby') {
        const rule = new BurrowPair(def, bl, CREATURES.burrowPair, random);
        const view = new BurrowPairView(
          scene,
          def,
          def.heading ?? 0,
          bl,
          CREATURES.burrowPair.pile,
        );
        view.draw(rule, 0);
        this.pairs.push({ def, rule, view });
      }
    }
  }

  /**
   * One frame: every animal steps and its pictures follow. A slow frame is
   * stepped in short pieces, as the shrimp is, so a burst plays the same at
   * any frame rate. Returns how many hermit crabs the shrimp walked up to
   * gently on this frame.
   */
  update(dt: number, passer: Passer): number {
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
    let gentle = 0;
    for (const hermit of this.hermits) {
      for (let index = 0; index < pieces; index++) {
        if (hermit.rule.step(piece, { x: passer.x, y: passer.y, fast })) gentle++;
      }
      this.placeHermit(hermit);
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
    for (const turtle of this.turtles) {
      for (let index = 0; index < pieces; index++) turtle.rule.step(piece);
      turtle.view.draw(turtle.rule, dt, turtle.rule.gapTo(passer) <= 0);
    }
    for (const pair of this.pairs) {
      for (let index = 0; index < pieces; index++) {
        if (pair.rule.step(piece, { x: passer.x, y: passer.y, fast })) this.flicked++;
      }
      pair.view.draw(pair.rule, dt);
    }
    return gentle;
  }

  /** Whether the dark of the turtle's shadow lies over the point. */
  turtleShades(x: number, y: number): boolean {
    return this.turtles.some((turtle) => turtle.rule.shades({ x, y }));
  }

  /** Whether the point is within `reach` BL of the turtle's shell. */
  turtleNear(x: number, y: number, reach: number): boolean {
    return this.turtles.some((turtle) => turtle.rule.gapTo({ x, y }) <= reach);
  }

  /** A tail flip at (x, y): a school close by bursts apart. */
  flip(x: number, y: number): void {
    for (const school of this.schools) school.rule.startle(x, y);
  }

  /** Times the goby has flicked its tail and gone, since this was last asked. */
  takeFlicks(): number {
    const flicked = this.flicked;
    this.flicked = 0;
    return flicked;
  }

  /** Whether an animal can be seen now: the goby and the pistol shrimp may be down their burrow. */
  seen(id: string): boolean {
    const pair = this.pairs.find((one) => one.def.id === id);
    return pair ? pair.rule.seen : true;
  }

  /** Whether the player is within `reach` px of an animal, and can see it. */
  watching(id: string, x: number, y: number, reach: number): boolean {
    const at = this.where(id);
    return at !== null && this.seen(id) && Math.hypot(at.x - x, at.y - y) <= reach;
  }

  /** A threat's cue (step 7): the crabs go down their burrows and the schools burst. */
  cue(x: number, y: number): void {
    for (const crab of this.crabs) crab.rule.hide();
    for (const pair of this.pairs) pair.rule.hide();
    for (const school of this.schools) school.rule.startle(x, y);
  }

  /** Where an animal is now, by its id in the area file. */
  where(id: string): { x: number; y: number } | null {
    const crab = this.crabs.find((one) => one.def.id === id);
    if (crab) return { x: crab.x, y: crab.y };
    const snail = this.snails.find((one) => one.def.id === id);
    if (snail) return { x: snail.rule.x, y: snail.rule.y };
    const hermit = this.hermits.find((one) => one.def.id === id);
    if (hermit) return { x: hermit.rule.x, y: hermit.rule.y };
    const school = this.schools.find((one) => one.def.id === id);
    if (school) return { x: school.rule.x, y: school.rule.y };
    const turtle = this.turtles.find((one) => one.def.id === id);
    if (turtle) return { x: turtle.rule.x, y: turtle.rule.y };
    const pair = this.pairs.find((one) => one.def.id === id);
    if (pair) return { x: pair.def.x, y: pair.def.y };
    return null;
  }

  /** The pictures that get the pale rim when the shrimp is curious about this animal. */
  imagesOf(id: string): Phaser.GameObjects.Image[] {
    const crab = this.crabs.find((one) => one.def.id === id);
    if (crab) return crab.parts;
    const snail = this.snails.find((one) => one.def.id === id);
    if (snail) return [snail.shell];
    const hermit = this.hermits.find((one) => one.def.id === id);
    if (hermit) return [hermit.shell, hermit.legs];
    const turtle = this.turtles.find((one) => one.def.id === id);
    if (turtle) return turtle.view.images;
    const pair = this.pairs.find((one) => one.def.id === id);
    if (pair) return pair.view.images;
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
      ...this.hermits.map((hermit) => ({
        id: hermit.def.id,
        x: hermit.rule.x,
        y: hermit.rule.y,
        state: hermit.rule.withdrawn ? 'withdrawn' : 'out',
      })),
      ...this.schools.map((school) => ({
        id: school.def.id,
        x: school.rule.x,
        y: school.rule.y,
        state: school.rule.scattered > 0.5 ? 'scattered' : 'holding',
        scattered: school.rule.scattered,
      })),
      ...this.turtles.map((turtle) => ({
        id: turtle.def.id,
        x: turtle.rule.x,
        y: turtle.rule.y,
        state: turtle.rule.phase,
      })),
      ...this.pairs.map((pair) => ({
        id: pair.def.id,
        x: pair.def.x,
        y: pair.def.y,
        state: pair.rule.inside ? 'in' : pair.rule.phase,
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

  /**
   * A hermit crab: the snail's kind of shell with legs and claws out of its
   * mouth, laid over its front (doc 14, "Animals in parts"). Pulling in,
   * the legs slide back and are gone.
   */
  private makeHermit(
    scene: Phaser.Scene,
    def: CreatureDef,
    bl: number,
    random: () => number,
  ): LiveHermit {
    const rule = new Hermit(
      CREATURES.hermit,
      { x: def.x, y: def.y, heading: def.heading ?? 0 },
      bl,
      random,
    );
    const shellKey = ensureTexture(scene, 'snail.shell');
    const legsKey = ensureTexture(scene, 'hermit.legs');
    const shellFrame = scene.textures.getFrame(shellKey);
    const legsFrame = scene.textures.getFrame(legsKey);
    // From the back of the shell to the tips of the claws.
    const mouth = HERMIT_SHELL_MOUTH.x - shellFrame.width / 2;
    const reach = legsFrame.width - HERMIT_LEGS_JOINT.x;
    const scale = (HERMIT_LENGTH * bl) / (shellFrame.width / 2 + mouth + reach);
    const legs = scene.add
      .image(mouth, HERMIT_SHELL_MOUTH.y - shellFrame.height / 2, legsKey)
      .setOrigin(HERMIT_LEGS_JOINT.x / legsFrame.width, HERMIT_LEGS_JOINT.y / legsFrame.height);
    const shell = scene.add.image(0, 0, shellKey);
    const body = scene.add
      .container(def.x, def.y, [shell, legs])
      .setScale(scale)
      .setDepth(DEPTH.bedAnimals);
    const shadow = scene.add
      .image(def.x + 3, def.y + 5, ensureTexture(scene, 'shadow.soft'))
      .setDisplaySize(HERMIT_LENGTH * bl, 0.45 * bl)
      .setAlpha(0.4)
      .setDepth(DEPTH.groundObjects);
    const hermit = { def, rule, shadow, body, shell, legs, legsAt: mouth };
    this.placeHermit(hermit);
    return hermit;
  }

  private placeHermit(hermit: LiveHermit): void {
    const { rule } = hermit;
    hermit.body.setPosition(rule.x, rule.y).setRotation(rule.heading + rule.rock);
    hermit.shadow.setPosition(rule.x + 3, rule.y + 5).setRotation(rule.heading);
    // In its shell the legs are drawn back into it, out of sight.
    hermit.legs.setX(hermit.legsAt - (1 - rule.out) * 70).setAlpha(rule.out);
  }

  /** The turtle on its round of the meadow, from clump to clump of the area's cover. */
  private makeTurtle(scene: Phaser.Scene, area: AreaDef, def: CreatureDef, bl: number): LiveTurtle {
    const covers = area.cover ?? [];
    const route = (def.route ?? []).flatMap((id) => {
      const cover = covers.find((one) => one.id === id);
      return cover ? [{ x: cover.x, y: cover.y }] : [];
    });
    const tuning = CREATURES.turtle;
    const rule = new Turtle({ x: def.x, y: def.y, heading: def.heading ?? 0 }, route, bl, tuning);
    const view = new TurtleView(scene, bl, tuning.shadow);
    view.draw(rule);
    return { def, rule, view };
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
