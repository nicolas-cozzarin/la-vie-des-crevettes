import Phaser from 'phaser';
import { PISTOL_CLAW_JOINT, PISTOL_CLAW_OWN_JOINT } from '../art/painters/lagoonAnimals';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import type { BurrowPair } from '../core/creatures/burrowPair';
import type { Point } from '../core/movement/collision';

/** The pistol shrimp turns this far from where the goby looks (doc 14, "Pistol shrimp and goby"). */
const TURN = 0.55;
/** BL. The goby's width, and the shrimp's. */
const GOBY = 0.78;
const SHRIMP = 0.55;
/** BL. A load of sand's width, and how far ahead of the shrimp it is pushed. */
const LOAD = 0.4;
const AHEAD = 0.44;
/** Seconds of a pile's life over which it is smoothed away. */
const SMOOTH = 4;
/** Seconds between the beats of the shrimp's legs as it pushes, and how far it sways. */
const STEP = 0.35;
const SWAY = 0.06;

/**
 * The goby and the pistol shrimp at their burrow, drawn from what the rule
 * says (doc 14, "Pistol shrimp and goby"). The goby lies in the mouth, its
 * tail end in the dark of the hole. The shrimp comes out pushing its load,
 * dumps it and backs in. Its antenna is a line to the goby's tail. In a
 * fright the goby slides back down and the shrimp is gone after it.
 */
export class BurrowPairView {
  private readonly goby: Phaser.GameObjects.Image;
  private readonly gobyShadow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly claw: Phaser.GameObjects.Image;
  private readonly bodyShadow: Phaser.GameObjects.Image;
  private readonly load: Phaser.GameObjects.Image;
  private readonly hole: Phaser.GameObjects.Image;
  private readonly antenna: Phaser.GameObjects.Graphics;
  private readonly piles: Phaser.GameObjects.Image[] = [];
  private readonly scene: Phaser.Scene;
  private readonly shrimpScale: number;
  private readonly bodySize: { width: number; height: number };
  private time = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly mouth: Point,
    private readonly heading: number,
    private readonly bl: number,
    /** Seconds a dumped load lies. */
    private readonly pileLife: number,
  ) {
    this.scene = scene;
    const shadowKey = ensureTexture(scene, 'shadow.soft');
    const gobyKey = ensureTexture(scene, 'goby');
    const gobyFrame = scene.textures.getFrame(gobyKey);
    this.gobyShadow = scene.add
      .image(0, 0, shadowKey)
      .setDisplaySize(GOBY * bl, GOBY * bl * 0.3)
      .setAlpha(0.35)
      .setDepth(DEPTH.groundObjects + 0.2);
    this.goby = scene.add
      .image(0, 0, gobyKey)
      .setDisplaySize(GOBY * bl, (GOBY * bl * gobyFrame.height) / gobyFrame.width)
      .setRotation(heading)
      .setDepth(DEPTH.bedAnimals - 0.3);
    // The dark of the hole, over the goby's tail end.
    this.hole = scene.add
      .image(mouth.x, mouth.y, shadowKey)
      .setDisplaySize(0.4 * bl, 0.4 * bl)
      .setTint(0x18140e)
      .setAlpha(0.75)
      .setDepth(DEPTH.bedAnimals - 0.25);
    const bodyKey = ensureTexture(scene, 'pistol.body');
    const clawKey = ensureTexture(scene, 'pistol.claw');
    const bodyFrame = scene.textures.getFrame(bodyKey);
    const clawFrame = scene.textures.getFrame(clawKey);
    this.bodySize = { width: bodyFrame.width, height: bodyFrame.height };
    this.shrimpScale = (SHRIMP * bl) / bodyFrame.width;
    this.bodyShadow = scene.add
      .image(0, 0, shadowKey)
      .setDisplaySize(0.56 * bl, 0.3 * bl)
      .setAlpha(0.35)
      .setDepth(DEPTH.groundObjects + 0.2);
    this.load = this.loadImage(DEPTH.groundObjects + 0.3);
    this.body = scene.add
      .image(0, 0, bodyKey)
      .setScale(this.shrimpScale)
      .setDepth(DEPTH.bedAnimals - 0.2);
    this.claw = scene.add
      .image(0, 0, clawKey)
      .setOrigin(
        PISTOL_CLAW_OWN_JOINT.x / clawFrame.width,
        PISTOL_CLAW_OWN_JOINT.y / clawFrame.height,
      )
      .setScale(this.shrimpScale)
      .setDepth(DEPTH.bedAnimals - 0.2);
    this.antenna = scene.add.graphics().setDepth(DEPTH.bedAnimals - 0.1);
  }

  /** The pictures the pale rim goes round. */
  get images(): Phaser.GameObjects.Image[] {
    return [this.goby, this.body, this.claw];
  }

  draw(pair: BurrowPair, dt: number): void {
    this.time += dt;
    const bl = this.bl;
    const { x: mx, y: my } = this.mouth;
    const fx = Math.cos(this.heading);
    const fy = Math.sin(this.heading);
    // Across the heading, to the goby's right.
    const rx = -fy;
    const ry = fx;
    // The goby slides back down the hole as it goes in, its tail first into the dark.
    const g = pair.goby;
    const out = (0.3 * g - 0.25 * (1 - g)) * bl;
    const gx = mx + fx * out;
    const gy = my + fy * out;
    this.goby.setPosition(gx, gy).setAlpha(Math.min(1, g * 1.5));
    this.gobyShadow
      .setPosition(gx + 3, gy + 4)
      .setRotation(this.heading)
      .setAlpha(0.35 * g);
    // The shrimp comes up out of the hole toward its place beside the goby, facing its push.
    const turn = this.heading + TURN;
    const dx = Math.cos(turn);
    const dy = Math.sin(turn);
    const s = pair.shrimp;
    const end = {
      x: mx + rx * 0.28 * bl + fx * 0.12 * bl + dx * 0.2 * bl,
      y: my + ry * 0.28 * bl + fy * 0.12 * bl + dy * 0.2 * bl,
    };
    const pushing = pair.phase === 'push' || pair.phase === 'back';
    const sway = pushing ? SWAY * Math.sin((this.time * Math.PI * 2) / STEP) : 0;
    const px = mx + (end.x - mx) * s;
    const py = my + (end.y - my) * s;
    const seen = Math.min(1, s * 4);
    this.body
      .setPosition(px, py)
      .setRotation(turn + sway)
      .setAlpha(seen);
    const joint = this.onBody(px, py, turn + sway, PISTOL_CLAW_JOINT);
    this.claw
      .setPosition(joint.x, joint.y)
      .setRotation(turn + sway + 0.12)
      .setAlpha(seen);
    this.bodyShadow
      .setPosition(px + 3, py + 4)
      .setRotation(turn)
      .setAlpha(0.35 * seen);
    // Its load just ahead of its claws, wet from below.
    this.load
      .setPosition(px + dx * AHEAD * bl, py + dy * AHEAD * bl)
      .setVisible(pair.loaded)
      .setAlpha(seen);
    // Where the loads are dumped, a little heap that is smoothed away in time.
    const dump = { x: end.x + dx * AHEAD * bl, y: end.y + dy * AHEAD * bl };
    while (this.piles.length < pair.piles.length) {
      this.piles.push(this.loadImage(DEPTH.groundObjects + 0.1));
    }
    this.piles.forEach((image, index) => {
      const pile = pair.piles[index];
      if (!pile) {
        image.setVisible(false);
        return;
      }
      const left = (this.pileLife - pile.age) / SMOOTH;
      image
        .setVisible(true)
        .setPosition(dump.x - dy * pile.spread * 0.15 * bl, dump.y + dx * pile.spread * 0.15 * bl)
        .setAlpha(Math.max(0, Math.min(1, left)) * 0.9);
    });
    // One antenna from its head, round to the goby's tail just out of the hole.
    const head = { x: px + dx * 0.24 * bl, y: py + dy * 0.24 * bl };
    const tail = { x: mx + fx * 0.06 * bl, y: my + fy * 0.06 * bl };
    const bend = {
      x: head.x - rx * 0.32 * bl * s + fx * 0.12 * bl * s,
      y: head.y - ry * 0.32 * bl * s + fy * 0.12 * bl * s,
    };
    const a = this.antenna.clear();
    const alpha = 0.85 * Math.min(1, g * 1.5);
    if (alpha > 0.02) {
      a.lineStyle(1.1, 0x968060, alpha);
      a.beginPath();
      for (let index = 0; index <= 10; index++) {
        const t = index / 10;
        const u = 1 - t;
        const x = u * u * head.x + 2 * u * t * bend.x + t * t * tail.x;
        const y = u * u * head.y + 2 * u * t * bend.y + t * t * tail.y;
        if (index === 0) a.moveTo(x, y);
        else a.lineTo(x, y);
      }
      a.strokePath();
    }
  }

  destroy(): void {
    for (const image of [
      this.goby,
      this.gobyShadow,
      this.body,
      this.claw,
      this.bodyShadow,
      this.load,
      this.hole,
      ...this.piles,
    ]) {
      image.destroy();
    }
    this.antenna.destroy();
  }

  /** A point given in the body picture's pixels, where it is in the world. */
  private onBody(x: number, y: number, turn: number, at: Point): Point {
    const ox = (at.x - this.bodySize.width / 2) * this.shrimpScale;
    const oy = (at.y - this.bodySize.height / 2) * this.shrimpScale;
    return {
      x: x + Math.cos(turn) * ox - Math.sin(turn) * oy,
      y: y + Math.sin(turn) * ox + Math.cos(turn) * oy,
    };
  }

  private loadImage(depth: number): Phaser.GameObjects.Image {
    const key = ensureTexture(this.scene, 'sand.load');
    return this.scene.add
      .image(0, 0, key)
      .setDisplaySize(LOAD * this.bl, LOAD * this.bl)
      .setDepth(depth)
      .setVisible(false);
  }
}
