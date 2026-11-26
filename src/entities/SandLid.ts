import Phaser from 'phaser';
import { IMAGE_SCALE } from '../art/fit';
import { ensureTexture } from '../art/TextureFactory';

/** The rounded shape the sand covers, in BL along the body: behind, ahead, across. */
const BEHIND = 0.78;
const AHEAD = 0.24;
const ACROSS = 0.44;
/** Room round the shape for the soft rim, in BL. */
const RIM = 0.16;
/** How soft the rim is, in BL. */
const SOFT = 0.06;
/** Turned-over sand, a little darker and wet from below. */
const TURNED = 'rgba(120,100,62,0.1)';

let made = 0;

/**
 * The sand over a shrimp dug in (doc 14, "Burrowed shrimp"): the ground
 * itself, a little darker where it was turned over, in a rounded shape from
 * the tail fan to just behind the eyes, blurred at the rim. The eyes and
 * antennae stay out. It is painted again each time the shrimp starts to dig,
 * from the bed under that very spot, so it matches the sand round it.
 */
export class SandLid {
  private readonly image: Phaser.GameObjects.Image;
  private readonly texture: Phaser.Textures.CanvasTexture | null;
  private readonly source: CanvasImageSource;
  private readonly bl: number;
  private readonly width: number;
  private readonly height: number;
  /** Where it was last painted, or null when it is not showing. */
  private paintedAt: { x: number; y: number; heading: number } | null = null;

  constructor(scene: Phaser.Scene, ground: string, bodyLengthPx: number, depth: number) {
    this.bl = bodyLengthPx;
    this.width = Math.ceil((BEHIND + AHEAD + 2 * RIM) * bodyLengthPx);
    this.height = Math.ceil((ACROSS + 2 * RIM) * bodyLengthPx);
    const key = `sandLid.${made++}`;
    this.texture = scene.textures.createCanvas(key, this.width, this.height);
    this.source = scene.textures
      .get(ensureTexture(scene, ground))
      .getSourceImage() as CanvasImageSource;
    // The picture's origin is the shrimp's centre, which is not the shape's.
    this.image = scene.add
      .image(0, 0, key)
      .setOrigin(this.originX / this.width, 0.5)
      .setDepth(depth)
      .setVisible(false);
  }

  private get originX(): number {
    return (BEHIND + RIM) * this.bl;
  }

  /** Over the shrimp at (x, y), turned with it, `depth` 0 to 1 dug in. */
  update(x: number, y: number, heading: number, depth: number): void {
    const showing = depth > 0.01;
    if (!showing) {
      this.paintedAt = null;
      this.image.setVisible(false);
      return;
    }
    const at = this.paintedAt;
    if (!at || Math.hypot(at.x - x, at.y - y) > 1 || Math.abs(at.heading - heading) > 0.01) {
      this.paint(x, y, heading);
      this.paintedAt = { x, y, heading };
    }
    this.image
      .setPosition(x, y)
      .setRotation(heading)
      .setAlpha(Math.min(1, depth * 1.15))
      .setVisible(true);
  }

  destroy(): void {
    this.image.destroy();
    this.texture?.destroy();
  }

  /** The bed under (x, y), as the ground draws it there, cut to the rounded shape. */
  private paint(x: number, y: number, heading: number): void {
    const ctx = this.texture?.getContext();
    if (!this.texture || !ctx) return;
    const { bl, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    const pattern = ctx.createPattern(this.source, 'repeat');
    if (pattern) {
      // The bed shows the picture's pixel (world × IMAGE_SCALE): line this one up with it.
      pattern.setTransform(
        new DOMMatrix()
          .translate(this.originX, height / 2)
          .rotate((-heading * 180) / Math.PI)
          .scale(1 / IMAGE_SCALE)
          .translate(-x * IMAGE_SCALE, -y * IMAGE_SCALE),
      );
      ctx.fillStyle = pattern;
    }
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = TURNED;
    ctx.fillRect(0, 0, width, height);
    // Keep only the rounded shape, soft at its rim.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.filter = `blur(${SOFT * bl}px)`;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(RIM * bl, RIM * bl, (BEHIND + AHEAD) * bl, ACROSS * bl, 0.2 * bl);
    ctx.fill();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    this.texture.refresh();
  }
}
