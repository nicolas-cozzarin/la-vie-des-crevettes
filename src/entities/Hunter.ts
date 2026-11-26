import Phaser from 'phaser';
import { HUNTER_TAIL_JOINT, HUNTER_TAIL_OWN_JOINT } from '../art/painters/lagoonAnimals';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import type { ThreatDirector } from '../core/threat/ThreatDirector';
import { FISH } from '../data/tuning';

/** How dark its shadow is on the bed, as the atelier draws it. */
const SHADOW_ALPHA = 0.42;
/** Seconds it takes to come into the view's water and to fade out of it. */
const FADE = 0.8;

/**
 * The hunting fish, drawn from what the director says (doc 10, "The hunting
 * fish"; doc 14, "Hunting fish"): a long spindle over the seagrass, its tail
 * swinging at its joint, slowly on patrol and fast in the pause before a
 * charge, and its shadow on the bed below. On a charge that lands nothing
 * more is drawn: the cornered sequence covers the instant before contact.
 */
export class Hunter {
  private readonly body: Phaser.GameObjects.Image;
  private readonly tail: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly scale: number;
  /** The middle of the fish, in the body picture's pixels. */
  private readonly middle: { x: number; y: number };
  private shown = 0;
  private beat = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly bl: number,
  ) {
    const bodyKey = ensureTexture(scene, 'fish.hunter.body');
    const tailKey = ensureTexture(scene, 'fish.hunter.tail');
    const bodyFrame = scene.textures.getFrame(bodyKey);
    const tailFrame = scene.textures.getFrame(tailKey);
    // From the tail's tip to the snout is 4.5 BL.
    const tip = HUNTER_TAIL_JOINT.x - HUNTER_TAIL_OWN_JOINT.x;
    this.scale = (FISH.length * bl) / (bodyFrame.width - tip);
    this.middle = { x: (bodyFrame.width + tip) / 2, y: bodyFrame.height / 2 };
    this.body = scene.add
      .image(0, 0, bodyKey)
      .setOrigin(this.middle.x / bodyFrame.width, this.middle.y / bodyFrame.height)
      .setScale(this.scale)
      .setDepth(DEPTH.overCover + 0.1);
    this.tail = scene.add
      .image(0, 0, tailKey)
      .setOrigin(
        HUNTER_TAIL_OWN_JOINT.x / tailFrame.width,
        HUNTER_TAIL_OWN_JOINT.y / tailFrame.height,
      )
      .setScale(this.scale)
      .setDepth(DEPTH.overCover);
    this.shadow = scene.add
      .image(0, 0, ensureTexture(scene, 'shadow.soft'))
      .setDisplaySize(4.4 * bl, 0.95 * bl)
      .setDepth(DEPTH.midWater);
    for (const image of this.all()) image.setVisible(false);
  }

  /** Follows the fish of the director, if there is one. */
  update(dt: number, threat: ThreatDirector): void {
    const fish = threat.fish;
    let want = fish ? 1 : 0;
    if (fish && threat.stage === 'release') {
      want = Math.min(1, Math.max(0, (threat.stageLength - threat.stageTime) / FADE));
    }
    this.shown += (want - this.shown) * Math.min(1, dt / (FADE / 3));
    if (!fish || this.shown < 0.01) {
      this.shown = fish ? this.shown : 0;
      for (const image of this.all()) image.setVisible(false);
      return;
    }
    const bl = this.bl;
    const { x, y, heading } = fish;
    // The tail beats faster as the charge comes, and swings to either side of its joint.
    const rate = FISH.tail.slow + (FISH.tail.fast - FISH.tail.slow) * fish.urgency;
    this.beat += dt * rate * Math.PI * 2;
    const swing = FISH.swing * Math.sin(this.beat) * (fish.phase === 'charge' ? 0.6 : 1);
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const jx = (HUNTER_TAIL_JOINT.x - this.middle.x) * this.scale;
    const jy = (HUNTER_TAIL_JOINT.y - this.middle.y) * this.scale;
    this.body.setVisible(true).setPosition(x, y).setRotation(heading).setAlpha(this.shown);
    this.tail
      .setVisible(true)
      .setPosition(x + cos * jx - sin * jy, y + sin * jx + cos * jy)
      .setRotation(heading + swing)
      .setAlpha(this.shown);
    // Its shadow lies on the bed half a body length off, as the atelier draws it.
    this.shadow
      .setVisible(true)
      .setPosition(x + 0.3 * bl - cos * 0.2 * bl, y + 0.4 * bl)
      .setRotation(heading)
      .setAlpha(SHADOW_ALPHA * this.shown);
  }

  destroy(): void {
    for (const image of this.all()) image.destroy();
  }

  private all(): Phaser.GameObjects.Image[] {
    return [this.body, this.tail, this.shadow];
  }
}
