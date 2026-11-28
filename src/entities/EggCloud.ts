import type Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import { seededRandom } from '../core/random';
import type { SpawnPhase } from '../core/spawn/Spawning';
import { SPAWN } from '../data/tuning';

interface Egg {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  /** Seconds after the first before it leaves her body. */
  delay: number;
  /** Seconds since it left. */
  age: number;
}

interface Cloud {
  image: Phaser.GameObjects.Image;
  size: number;
  dx: number;
  dy: number;
  spin: number;
}

/**
 * The spawning seen from above (doc 11, `thing.eggs`; T123). A cloud of pale
 * points leaves the shrimp in pulses and spreads, each egg a little larger as
 * it rises toward the light, the whole carried slowly by the water. Painted
 * clouds of many points behind the loose ones make the thousands. Then one
 * egg drifts on alone, the rest thinning away, and opens into a larva.
 */
export class EggCloud {
  private readonly eggs: Egg[] = [];
  private readonly clouds: Cloud[] = [];
  private readonly larva: Phaser.GameObjects.Image;
  private readonly random = seededRandom(2111);
  private time = 0;
  private readonly origin: { x: number; y: number };
  /** The way the one followed drifts: toward the coast. */
  private readonly away: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    private readonly bl: number,
    at: { x: number; y: number; heading: number },
    coast: number,
  ) {
    const tuning = SPAWN.eggs;
    const egg = ensureTexture(scene, 'fx.egg');
    const cloud = ensureTexture(scene, 'thing.eggs');
    // From under her body, a little behind its middle, where the legs beat.
    const back = 0.15 * bl;
    this.origin = { x: at.x - Math.cos(at.heading) * back, y: at.y - Math.sin(at.heading) * back };
    const lean = coast >= 0 ? -0.5 : Math.PI + 0.5;
    this.away = { x: Math.cos(lean), y: Math.sin(lean) };
    for (let index = 0; index < tuning.clouds; index++) {
      const [least, most] = tuning.cloudSize;
      const turn = this.random() * Math.PI * 2;
      const reach = (0.2 + this.random() * 0.6) * bl;
      this.clouds.push({
        image: scene.add
          .image(this.origin.x, this.origin.y, cloud)
          .setDepth(DEPTH.midWater + 0.8)
          .setRotation(this.random() * Math.PI * 2)
          .setAlpha(0),
        size: (least + this.random() * (most - least)) * bl,
        dx: Math.cos(turn) * reach,
        dy: Math.sin(turn) * reach,
        spin: (this.random() - 0.5) * 0.06,
      });
    }
    for (let index = 0; index < tuning.count; index++) {
      const chosen = index === 0;
      const turn = this.random() * Math.PI * 2;
      const speed = (0.25 + this.random() * 0.75) * tuning.speed * bl;
      const [least, most] = tuning.size;
      const [dim, bright] = tuning.alpha;
      this.eggs.push({
        image: scene.add
          .image(this.origin.x, this.origin.y, egg)
          .setDepth(DEPTH.midWater + (chosen ? 1.2 : 1))
          .setAlpha(0),
        x: this.origin.x,
        y: this.origin.y,
        vx: Math.cos(turn) * speed,
        vy: Math.sin(turn) * speed,
        size: chosen ? tuning.chosen : least + this.random() * (most - least),
        alpha: chosen ? 1 : dim + this.random() * (bright - dim),
        // In pulses, as the legs beat: most leave in the first part of each.
        delay: chosen
          ? tuning.release * 0.3
          : (Math.floor(this.random() * 4) + this.random() ** 2) * (tuning.release / 4),
        age: -1,
      });
    }
    this.larva = scene.add
      .image(this.origin.x, this.origin.y, ensureTexture(scene, 'larva.early'))
      .setDepth(DEPTH.midWater + 1.3)
      .setAlpha(0);
    const width = tuning.larva;
    this.larva.setDisplaySize(width, (width * this.larva.height) / this.larva.width);
  }

  /** Where the egg the view follows is now. */
  get focus(): { x: number; y: number } {
    const chosen = this.eggs[0];
    return chosen ? { x: chosen.x, y: chosen.y } : this.origin;
  }

  update(dt: number, phase: SpawnPhase, through: number): void {
    this.time += dt;
    const tuning = SPAWN.eggs;
    const bl = this.bl;
    const drag = Math.exp(-tuning.drag * dt);
    const driftX = tuning.drift * bl * this.away.x;
    const driftY = tuning.drift * bl * this.away.y;
    // The rest thin away once the view leaves her, and are gone as the one opens.
    const thinning =
      phase === 'rise'
        ? 1
        : phase === 'follow'
          ? 1 - 0.65 * through
          : phase === 'hatch'
            ? 0.35 * (1 - Math.min(1, through * 2))
            : 0;
    this.eggs.forEach((egg, index) => {
      const chosen = index === 0;
      if (egg.age < 0) {
        if (this.time < egg.delay) return;
        egg.age = 0;
      }
      egg.age += dt;
      egg.vx *= drag;
      egg.vy *= drag;
      let { vx, vy } = egg;
      if (chosen && phase !== 'rise') {
        // The one followed drifts on by itself, out of the cloud, and slows as it opens.
        const pace =
          phase === 'follow'
            ? Math.min(1, through * 2)
            : phase === 'hatch'
              ? 1 - 0.7 * Math.min(1, through * 1.5)
              : 0.3;
        const away = tuning.awaySpeed * bl * pace;
        vx += this.away.x * away;
        vy += this.away.y * away;
      }
      egg.x += (vx + driftX) * dt;
      egg.y += (vy + driftY) * dt;
      const shown = Math.min(1, egg.age / 0.6);
      const lift = 1 + tuning.lift * Math.min(1, egg.age / SPAWN.rise);
      // The one followed shimmers a little, a point of light.
      const shimmer = chosen ? 0.85 + 0.15 * Math.sin(this.time * 2.3) : 1;
      let alpha = egg.alpha * shown * (chosen ? shimmer : thinning);
      if (chosen && phase === 'hatch') alpha *= 1 - smooth(Math.min(1, through / 0.45));
      if (chosen && phase === 'fade') alpha = 0;
      egg.image
        .setPosition(egg.x, egg.y)
        .setDisplaySize(egg.size * lift, egg.size * lift)
        .setAlpha(alpha);
    });
    const [least] = tuning.cloudSize;
    for (const cloud of this.clouds) {
      const grow = Math.min(1, this.time / SPAWN.rise);
      const size = least * 0.15 * bl + (cloud.size - least * 0.15 * bl) * smooth(grow);
      const along = Math.min(1, this.time / SPAWN.rise);
      cloud.image
        .setPosition(
          this.origin.x + cloud.dx * along + driftX * this.time,
          this.origin.y + cloud.dy * along + driftY * this.time,
        )
        .setDisplaySize(size, size)
        .setRotation(cloud.image.rotation + cloud.spin * dt)
        .setAlpha(tuning.cloudAlpha * Math.min(1, this.time / 2.5) * thinning);
    }
    // It opens: the larva comes out of the light where the egg was, and stirs.
    const chosen = this.eggs[0];
    if (chosen && (phase === 'hatch' || phase === 'fade')) {
      const opening = phase === 'fade' ? 1 : smooth(Math.min(1, Math.max(0, through - 0.15) / 0.5));
      const heading = Math.atan2(this.away.y, this.away.x);
      const stir = Math.sin(this.time * 7) * 0.12 * opening;
      this.larva
        .setPosition(chosen.x, chosen.y)
        .setRotation(heading + stir)
        .setAlpha(opening);
    }
  }

  destroy(): void {
    for (const egg of this.eggs) egg.image.destroy();
    for (const cloud of this.clouds) cloud.image.destroy();
    this.larva.destroy();
    this.eggs.length = 0;
    this.clouds.length = 0;
  }
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}
