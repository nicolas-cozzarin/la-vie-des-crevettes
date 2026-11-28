import type Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { seededRandom } from '../core/random';
import type { ThreatDirector } from '../core/threat/ThreatDirector';
import { NET } from '../data/tuning';

/** Seconds the throb takes to fade once the net has gone. */
const FADE = 3;

interface Cloud {
  image: Phaser.GameObjects.Image;
  /** Seconds since it was stirred up. */
  age: number;
}

/**
 * The net, drawn from what the director says (doc 10, "The net"; doc 11,
 * `shadow.hull`, `shadow.grid`, `fx.silt`). It is never an object: the hull's
 * long shadow crossing, the band of grid shadow sweeping the bed, the silt
 * it leaves hanging, and the specks in the water trembling with the throb.
 */
export class NetShadow {
  private readonly hull: Phaser.GameObjects.Image;
  private readonly grid: Phaser.GameObjects.Image;
  private readonly specks: {
    image: Phaser.GameObjects.Image;
    x: number;
    y: number;
    phase: number;
  }[];
  private readonly clouds: Cloud[] = [];
  private readonly random = seededRandom(1803);
  private time = 0;
  /** How loud the engine is, 0 to 1: the specks tremble with it. */
  throb = 0;
  /** Where along its way the grid's back edge last left a cloud. */
  private lastSilt: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bl: number,
  ) {
    this.hull = scene.add
      .image(0, 0, ensureTexture(scene, 'shadow.hull'))
      .setDisplaySize(NET.hull.long * bl, NET.hull.wide * bl)
      .setDepth(DEPTH.surfaceLight)
      .setVisible(false);
    this.grid = scene.add
      .image(0, 0, ensureTexture(scene, 'shadow.grid'))
      .setDisplaySize(NET.grid.deep * bl, NET.grid.across * bl)
      .setDepth(DEPTH.surfaceLight + 0.1)
      .setVisible(false);
    const speck = ensureTexture(scene, 'fx.speck');
    this.specks = [];
    for (let index = 0; index < NET.specks.count; index++) {
      const size = 5 + this.random() * 9;
      this.specks.push({
        image: scene.add
          .image(0, 0, speck)
          .setDisplaySize(size, size)
          .setAlpha(NET.specks.alpha * (0.5 + this.random() * 0.5))
          .setDepth(DEPTH.midWater + 0.5),
        x: this.random(),
        y: this.random(),
        phase: this.random() * Math.PI * 2,
      });
    }
  }

  update(dt: number, threat: ThreatDirector, view: Phaser.Geom.Rectangle): void {
    this.time += dt;
    const net = threat.net;
    const isNet = threat.kind === 'net';
    let want = 0;
    if (isNet && threat.stage === 'cue') want = threat.stageTime / threat.stageLength;
    else if (isNet && (threat.stage === 'presence' || threat.stage === 'cornered')) want = 1;
    else if (isNet && threat.stage === 'release') want = Math.max(0, 1 - threat.stageTime / FADE);
    this.throb += (want - this.throb) * Math.min(1, dt * 2);

    this.hull.setVisible(net !== null);
    this.grid.setVisible(net?.band != null);
    if (net) {
      this.hull.setPosition(net.hull.x, net.hull.y).setRotation(net.hull.heading);
      const band = net.band;
      if (band) {
        this.grid.setPosition(band.x + band.w / 2, band.y + band.h / 2).setFlipX(net.way < 0);
        this.stir(net.back ?? 0, net.way, band, view);
      }
    } else {
      this.lastSilt = null;
    }
    this.drawSpecks(view);
    this.settle(dt);
  }

  /** The grid stirs the bed as it goes: a cloud now and then at its back edge, where it can be seen. */
  private stir(
    back: number,
    way: 1 | -1,
    band: { y: number; h: number },
    view: Phaser.Geom.Rectangle,
  ): void {
    const every = NET.silt.every * this.bl;
    if (this.lastSilt === null) this.lastSilt = back;
    if ((back - this.lastSilt) * way < every) return;
    this.lastSilt = back;
    const margin = 3 * this.bl;
    if (back < view.x - margin || back > view.right + margin) return;
    for (let index = 0; index < 2; index++) {
      const y = band.y + this.random() * band.h;
      if (y < view.y - margin || y > view.bottom + margin) continue;
      const [small, large] = NET.silt.size;
      const size = (small + this.random() * (large - small)) * this.bl;
      const image = this.scene.add
        .image(back - way * this.random() * this.bl, y, ensureTexture(this.scene, 'fx.silt'))
        .setDisplaySize(size, size)
        .setRotation(this.random() * Math.PI * 2)
        .setAlpha(0)
        .setDepth(DEPTH.cover - 0.5);
      this.clouds.push({ image, age: 0 });
    }
  }

  /** Clouds come up quickly, hang, then thin to nothing. */
  private settle(dt: number): void {
    const { hang, thin, alpha } = NET.silt;
    for (let index = this.clouds.length - 1; index >= 0; index--) {
      const cloud = this.clouds[index];
      if (!cloud) continue;
      cloud.age += dt;
      const rise = Math.min(1, cloud.age / 1.2);
      const fade = cloud.age <= hang ? 1 : Math.max(0, 1 - (cloud.age - hang) / thin);
      cloud.image.setAlpha(alpha * rise * fade);
      if (fade <= 0) {
        cloud.image.destroy();
        this.clouds.splice(index, 1);
      }
    }
  }

  /**
   * Specks held in the water, each trembling with the throb. They stay where
   * they are in the place and wrap round the view, so they pass as it moves.
   */
  private drawSpecks(view: Phaser.Geom.Rectangle): void {
    const shake = this.throb * NET.specks.tremble;
    const wrap = (value: number, size: number): number => ((value % size) + size) % size;
    const w = view.width;
    const h = view.height;
    for (const speck of this.specks) {
      const jitter = Math.sin(this.time * 31 + speck.phase) * shake;
      const jitterY = Math.cos(this.time * 27 + speck.phase * 1.7) * shake;
      speck.image.setPosition(
        view.x + wrap(speck.x * w - view.x, w) + jitter,
        view.y + wrap(speck.y * h - view.y, h) + jitterY,
      );
    }
  }

  /** The silt still hanging, for the browser test. */
  get silt(): number {
    return this.clouds.length;
  }

  destroy(): void {
    this.hull.destroy();
    this.grid.destroy();
    for (const speck of this.specks) speck.image.destroy();
    for (const cloud of this.clouds) cloud.image.destroy();
  }
}
