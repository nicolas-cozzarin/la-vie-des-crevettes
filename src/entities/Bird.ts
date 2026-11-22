import Phaser from 'phaser';
import { BIRD_NECK_START } from '../art/painters/creatures';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import type { ThreatDirector, ThreatEvent } from '../core/threat/ThreatDirector';

/** How dark the shadows are at full, as the atelier draws them. */
const SHADOW_ALPHA = 0.85;
/** Seconds the shadow takes to come and go. */
const SHADOW_FADE = 0.6;
/** The beak shows for a fifth of a second; the splash settles over half a second. */
const BEAK_SECONDS = 0.2;
const SPLASH_SECONDS = 0.6;
/** A foot's ring of ripples grows from 1.1 BL to twice that and fades. */
const STEP_RING = { from: 1.1, to: 2.2, seconds: 1.2, alpha: 0.55 };
/** The strike ring tightens from this share of its size down to its size. */
const RING_FROM = 1.6;

interface Ripple {
  image: Phaser.GameObjects.Image;
  age: number;
}

/**
 * The wading bird, drawn from what the director says (doc 10, "The wading
 * bird"; doc 14, "Bird"): a soft shadow on the water with the head's shadow
 * turning on its own, two yellow feet on the mud, rings of ripples where a
 * foot lands or lifts, the strike ring, and the beak with its splash on a
 * miss. On a strike that lands nothing is drawn: the cornered sequence
 * covers the instant before contact.
 */
export class Bird {
  private readonly body: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly feet: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private readonly ring: Phaser.GameObjects.Image;
  private readonly beak: Phaser.GameObjects.Image;
  private readonly splash: Phaser.GameObjects.Image;
  private readonly ripples: Ripple[] = [];
  private ringWarn = 1;
  private ringAge = 0;
  private beakAge = Infinity;
  private shown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bl: number,
  ) {
    this.body = sized(scene, 'bird.shadow.body', 9 * bl, DEPTH.surfaceLight);
    this.head = sized(scene, 'bird.shadow.head', 4.25 * bl, DEPTH.surfaceLight);
    const neck = scene.textures.getFrame(this.head.texture.key);
    this.head.setOrigin(BIRD_NECK_START.x / neck.width, BIRD_NECK_START.y / neck.height);
    this.feet = [
      sized(scene, 'bird.foot', 3.6 * bl, DEPTH.bedAnimals),
      sized(scene, 'bird.foot', 3.6 * bl, DEPTH.bedAnimals),
    ];
    this.ring = sized(scene, 'fx.ripple', 2 * bl, DEPTH.surfaceLight);
    this.beak = sized(scene, 'bird.beak', 1.3 * bl, DEPTH.surfaceLight);
    this.splash = sized(scene, 'bird.splash', 2.5 * bl, DEPTH.surfaceLight);
    for (const image of this.all()) image.setVisible(false);
  }

  /** Follows the director, and answers its events with ripples, rings and splashes. */
  update(dt: number, threat: ThreatDirector, events: readonly ThreatEvent[]): void {
    const bl = this.bl;
    for (const event of events) {
      if (event.type === 'landed' || event.type === 'lifted') this.ripple(event.x, event.y);
      if (event.type === 'ring') {
        this.ring.setPosition(event.x, event.y).setVisible(true);
        this.ringWarn = event.warn;
        this.ringAge = 0;
      }
      if (event.type === 'strike') {
        this.ring.setVisible(false);
        if (!event.hit) {
          this.beakAge = 0;
          this.beak.setPosition(event.x, event.y).setRotation(threat.headAim);
          this.splash.setPosition(event.x, event.y);
        }
      }
    }

    // The shadow comes in over the cue and goes over the end of the release.
    const stage = threat.stage;
    let want = stage === 'idle' ? 0 : 1;
    if (stage === 'release') {
      want = Math.min(1, Math.max(0, (threat.stageLength - threat.stageTime) / SHADOW_FADE));
    }
    this.shown += (want - this.shown) * Math.min(1, dt / (SHADOW_FADE / 3));
    if (stage === 'idle' && this.shown < 0.01) this.shown = 0;
    const visible = this.shown > 0;
    const shadow = threat.shadow;
    this.body
      .setVisible(visible)
      .setPosition(shadow.x, shadow.y)
      .setRotation(shadow.heading)
      .setAlpha(SHADOW_ALPHA * this.shown);
    // The head is pinned 2.8 BL ahead of the body's middle, turning on its own.
    const pin = 2.8 * bl;
    this.head
      .setVisible(visible)
      .setPosition(
        shadow.x + Math.cos(shadow.heading) * pin,
        shadow.y + Math.sin(shadow.heading) * pin,
      )
      .setRotation(threat.headAim)
      .setAlpha(SHADOW_ALPHA * this.shown);

    // The feet: on the mud they show; in the air, seen from above, they do not.
    const feet = threat.legs?.feet;
    this.feet.forEach((image, index) => {
      const foot = feet?.[index];
      if (!foot || !foot.down) {
        image.setVisible(false);
        return;
      }
      const side = index === 0 ? 1 : -1;
      image
        .setVisible(true)
        .setPosition(foot.x, foot.y)
        .setRotation((threat.legs?.heading ?? 0) + side * 0.15);
    });

    if (this.ring.visible) {
      this.ringAge += dt;
      const through = Math.min(1, this.ringAge / this.ringWarn);
      const size = 2 * bl * (RING_FROM - (RING_FROM - 1) * through);
      this.ring.setDisplaySize(size, size).setAlpha(0.45 + 0.5 * through);
    }

    this.beakAge += dt;
    this.beak.setVisible(this.beakAge < BEAK_SECONDS);
    const splashing = this.beakAge < SPLASH_SECONDS;
    this.splash.setVisible(splashing);
    if (splashing) {
      const through = this.beakAge / SPLASH_SECONDS;
      const size = 2.5 * bl * (0.7 + 0.5 * through);
      this.splash.setDisplaySize(size, size).setAlpha(1 - through);
    }

    for (let index = this.ripples.length - 1; index >= 0; index--) {
      const ripple = this.ripples[index];
      if (!ripple) continue;
      ripple.age += dt;
      const through = ripple.age / STEP_RING.seconds;
      if (through >= 1) {
        ripple.image.destroy();
        this.ripples.splice(index, 1);
        continue;
      }
      const size = bl * (STEP_RING.from + (STEP_RING.to - STEP_RING.from) * through);
      ripple.image.setDisplaySize(size, size).setAlpha(STEP_RING.alpha * (1 - through));
    }
  }

  destroy(): void {
    for (const image of this.all()) image.destroy();
    for (const ripple of this.ripples) ripple.image.destroy();
    this.ripples.length = 0;
  }

  private ripple(x: number, y: number): void {
    const image = sized(this.scene, 'fx.ripple', STEP_RING.from * this.bl, DEPTH.surfaceLight);
    image.setPosition(x, y).setAlpha(STEP_RING.alpha);
    this.ripples.push({ image, age: 0 });
  }

  private all(): Phaser.GameObjects.Image[] {
    return [this.body, this.head, ...this.feet, this.ring, this.beak, this.splash];
  }
}

/** A picture `width` wide, centred, at a depth. */
function sized(
  scene: Phaser.Scene,
  name: string,
  width: number,
  depth: number,
): Phaser.GameObjects.Image {
  const key = ensureTexture(scene, name);
  const frame = scene.textures.getFrame(key);
  return scene.add
    .image(0, 0, key)
    .setDisplaySize(width, (width * frame.height) / frame.width)
    .setDepth(depth);
}
