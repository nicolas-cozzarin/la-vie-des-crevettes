import Phaser from 'phaser';
import { TURTLE_JOINTS, TURTLE_PART_JOINTS } from '../art/painters/lagoonAnimals';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import type { Turtle } from '../core/creatures/turtle';
import { angleDiff } from '../core/movement/angles';
import { COVER } from '../data/tuning';

/** The shell from the head end to the tail, in its picture's pixels (doc 14, "Turtle"). */
const SHELL_LENGTH = 784;
/** How dark its shadow is on the bed, as the atelier draws it. */
const SHADOW_ALPHA = 0.42;
/** The flippers' turn at rest, back from the head, as the atelier draws a glide. */
const FRONT = -2.4;
const REAR = -2.5;
/** How far either way each swings in a stroke, in radians. */
const FRONT_SWING = 0.32;
const REAR_SWING = 0.14;

interface Part {
  image: Phaser.GameObjects.Image;
  /** Where it is pinned, from the shell's middle, in the shell picture's pixels. */
  at: { x: number; y: number };
  /** The lower side mirrors the upper. */
  lower: boolean;
}

/**
 * The turtle drawn from its parts (doc 14, "Animals in parts"): the shell,
 * the head turning and dipping at the neck, two long front flippers and two
 * short rear ones swinging at the shoulder, all over the seagrass, and its
 * shadow on the bed below.
 */
export class TurtleView {
  private readonly shell: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly front: Part[];
  private readonly rear: Part[];
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly scale: number;
  private readonly middle: { x: number; y: number };
  /** Like cover, it fades while the shrimp is beneath it, so the shrimp is not lost. */
  private alpha = 1;

  constructor(
    scene: Phaser.Scene,
    private readonly bl: number,
    private readonly shadowSize: { long: number; wide: number; dx: number; dy: number },
  ) {
    const shellKey = ensureTexture(scene, 'turtle.shell');
    const shellFrame = scene.textures.getFrame(shellKey);
    this.scale = (6 * bl) / SHELL_LENGTH;
    this.middle = { x: shellFrame.width / 2, y: shellFrame.height / 2 };
    const pinned = (name: string, own: { x: number; y: number }, depth: number) => {
      const key = ensureTexture(scene, name);
      const frame = scene.textures.getFrame(key);
      return scene.add
        .image(0, 0, key)
        .setOrigin(own.x / frame.width, own.y / frame.height)
        .setDepth(depth);
    };
    const from = (joint: { x: number; y: number }) => ({
      x: joint.x - this.middle.x,
      y: joint.y - this.middle.y,
    });
    const pair = (name: string, joint: { x: number; y: number }, own: { x: number; y: number }) =>
      [false, true].map((lower) => {
        const at = from(joint);
        return {
          image: pinned(name, own, DEPTH.overCover - 0.03),
          at: lower ? { x: at.x, y: -at.y } : at,
          lower,
        };
      });
    this.rear = pair(
      'turtle.flipper.rear',
      TURTLE_JOINTS.rearFlipper,
      TURTLE_PART_JOINTS.rearFlipper,
    );
    this.front = pair(
      'turtle.flipper.front',
      TURTLE_JOINTS.frontFlipper,
      TURTLE_PART_JOINTS.frontFlipper,
    );
    this.head = pinned('turtle.head', TURTLE_PART_JOINTS.head, DEPTH.overCover - 0.02);
    this.shell = scene.add.image(0, 0, shellKey).setDepth(DEPTH.overCover - 0.01);
    this.shadow = scene.add
      .image(0, 0, ensureTexture(scene, 'shadow.soft'))
      .setDisplaySize(shadowSize.long * bl, shadowSize.wide * bl)
      .setAlpha(SHADOW_ALPHA)
      .setDepth(DEPTH.midWater);
  }

  /** The pictures the pale rim goes round. */
  get images(): Phaser.GameObjects.Image[] {
    return [this.shell, this.head];
  }

  /** Follows the turtle. `beneath`: the shrimp is under its shell. */
  draw(turtle: Turtle, dt = 0, beneath = false): void {
    const target = beneath ? COVER.fadedAlpha : 1;
    const fade = ((1 - COVER.fadedAlpha) / COVER.fadeTime) * dt;
    this.alpha =
      this.alpha < target
        ? Math.min(target, this.alpha + fade)
        : Math.max(target, this.alpha - fade);
    for (const image of [
      this.shell,
      this.head,
      ...[...this.front, ...this.rear].map((p) => p.image),
    ]) {
      image.setAlpha(this.alpha);
    }
    const { x, y, heading } = turtle;
    const s = this.scale;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const place = (at: { x: number; y: number }) => ({
      x: x + (cos * at.x - sin * at.y) * s,
      y: y + (sin * at.x + cos * at.y) * s,
    });
    this.shell.setPosition(x, y).setRotation(heading).setScale(s);
    // Both front flippers beat together, the rear ones half a stroke behind and less.
    const wave = Math.sin(turtle.stroke * Math.PI * 2);
    const swing = (parts: Part[], rest: number, reach: number, lag: number) => {
      const turn = rest + reach * (lag === 0 ? wave : Math.sin(turtle.stroke * Math.PI * 2 + lag));
      for (const part of parts) {
        const at = place(part.at);
        // The lower one is the upper one mirrored across the shell's long middle.
        part.image
          .setPosition(at.x, at.y)
          .setRotation(heading + (part.lower ? -turn : turn))
          .setScale(s, part.lower ? -s : s);
      }
    };
    swing(this.front, FRONT, FRONT_SWING, 0);
    swing(this.rear, REAR, REAR_SWING, Math.PI);
    // The head looks the way it is going, and swings a little as it crops, lowered into the blades.
    const dip = turtle.dip;
    const towards = turtle.towards;
    const look = towards
      ? Math.max(
          -0.25,
          Math.min(0.25, angleDiff(Math.atan2(towards.y - y, towards.x - x), heading)),
        )
      : 0;
    const crop = 0.14 * dip * Math.sin((turtle.time * Math.PI * 2) / 1.6);
    const neck = place(this.headAt);
    const shade = Math.round(255 - 50 * dip);
    this.head
      .setPosition(neck.x, neck.y)
      .setRotation(heading + 0.08 + look * (1 - dip) + crop)
      .setScale(s * (1 - 0.22 * dip), s)
      .setTint(Phaser.Display.Color.GetColor(shade, shade, shade));
    const shadow = this.shadowSize;
    this.shadow.setPosition(x + shadow.dx * this.bl, y + shadow.dy * this.bl).setRotation(heading);
  }

  destroy(): void {
    for (const image of [this.shell, this.head, this.shadow]) image.destroy();
    for (const part of [...this.front, ...this.rear]) part.image.destroy();
  }

  private get headAt(): { x: number; y: number } {
    return { x: TURTLE_JOINTS.head.x - this.middle.x, y: TURTLE_JOINTS.head.y - this.middle.y };
  }
}
