import type Phaser from 'phaser';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH } from '../config';
import type { OtherShrimp } from '../core/activity/Activity';
import type { Point } from '../core/movement/collision';
import { Crowd } from '../core/pond/crowd';
import { inPlume, type Plume } from '../core/pond/plume';
import { seededRandom, seedOf } from '../core/random';
import type { PondDef } from '../data/areas/types';
import { POND } from '../data/tuning';

/** The one behind the mesh, as a greeting names it. */
export const POND_ONE = 'pond.one';

/**
 * The gate's picture in design pixels at a gate 420 wide: its mouth, where
 * the mesh is, lies 340 down, and the open passage between its cheeks is
 * 150 to either side of the middle (`pond.outlet` in `src/art/painters/pond.ts`).
 */
const OUTLET = { width: 420, height: 400, mouth: 340, opening: 150 };
/** The pale shape's picture: 180 by 80 design pixels, the body 140 of them in the middle. */
const SHAPE = { width: 180, height: 80, body: 140 };
/** Pixels over which a shape fades as it passes under the gate's cheeks. */
const FADE = 40;

/**
 * A farm pond seen from the channel through its gate (D39; doc 18, "Level
 * 3"). It draws the gate, the water it lets out, and the pale shapes behind
 * the mesh; it says where the pond's water is, and which shape has come to
 * the mesh to be greeted.
 */
export class Pond {
  readonly plume: Plume;
  private readonly crowd: Crowd;
  private readonly shapes: Phaser.GameObjects.Image[];
  private readonly stains: { image: Phaser.GameObjects.Image; strength: number }[];
  private readonly gate: Phaser.GameObjects.Image;
  /** Where the one that comes stays: just behind the mesh, its head at it. */
  private readonly mesh: Point;
  private readonly opening: number;
  private time = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly def: PondDef,
    private readonly bl: number,
    seed: string,
  ) {
    const { gate, plume } = def;
    const scale = gate.width / OUTLET.width;
    this.plume = plume;
    this.opening = OUTLET.opening * scale;
    this.mesh = { x: gate.x, y: gate.y - bl / 2 };

    // The plume: soft stains in a row from the gate, wider and thinner as they go.
    const length = Math.hypot(plume.to.x - plume.from.x, plume.to.y - plume.from.y);
    const count = Math.max(2, Math.ceil(length / (plume.width * POND.stainStep)) + 1);
    const stainKey = ensureTexture(scene, 'pond.plume');
    this.stains = [];
    for (let index = 0; index < count; index++) {
      const along = index / (count - 1);
      const size =
        plume.width * (POND.stainSize[0] + (POND.stainSize[1] - POND.stainSize[0]) * along);
      const strength = 1 - (1 - POND.stainFade) * along;
      this.stains.push({
        strength,
        image: scene.add
          .image(
            plume.from.x + (plume.to.x - plume.from.x) * along,
            plume.from.y + (plume.to.y - plume.from.y) * along,
            stainKey,
          )
          .setDisplaySize(size, size)
          .setRotation(along * 2.3)
          .setAlpha(POND.plumeAlpha * strength)
          .setDepth(DEPTH.groundObjects + 0.4),
      });
    }

    this.gate = scene.add
      .image(gate.x, gate.y - OUTLET.mouth * scale, ensureTexture(scene, 'pond.outlet'))
      .setOrigin(0.5, 0)
      .setDisplaySize(gate.width, OUTLET.height * scale)
      .setDepth(DEPTH.groundObjects + 0.6);

    const [near, far] = POND.behind;
    this.crowd = new Crowd(
      {
        left: gate.x - POND.loop * bl,
        right: gate.x + POND.loop * bl,
        top: gate.y - far * bl,
        bottom: gate.y - near * bl,
      },
      this.mesh,
      def.crowd,
      {
        speed: [POND.crowdSpeed[0] * bl, POND.crowdSpeed[1] * bl],
        come: POND.come * bl,
        near: POND.near * bl,
      },
      seededRandom(seedOf(`${seed}:pond`)),
    );
    const shapeWidth = (SHAPE.width / SHAPE.body) * bl;
    const key = ensureTexture(scene, 'pond.shape');
    this.shapes = this.crowd.shapes.map(() =>
      scene.add
        .image(0, 0, key)
        .setDisplaySize(shapeWidth, (shapeWidth * SHAPE.height) / SHAPE.width)
        .setDepth(DEPTH.groundObjects + 0.5),
    );
  }

  /** Whether the water at (x, y) is the pond's: the shrimp will not eat there. */
  tainted(x: number, y: number): boolean {
    return inPlume(this.plume, x, y);
  }

  /** The one at the mesh, once it is there, for the player's Greet. */
  get greetable(): OtherShrimp[] {
    const one = this.crowd.atMesh;
    if (!one || Math.hypot(one.x - this.mesh.x, one.y - this.mesh.y) > 1) return [];
    return [{ id: POND_ONE, x: one.x, y: one.y }];
  }

  /** Where the one at the mesh is, for the player's antennae. */
  where(id: string): Point | null {
    const one = this.crowd.atMesh;
    return id === POND_ONE && one ? { x: one.x, y: one.y } : null;
  }

  update(dt: number, player: Point): void {
    this.time += dt;
    this.crowd.step(dt, player);
    const { gate } = this.def;
    this.crowd.shapes.forEach((shape, index) => {
      const image = this.shapes[index];
      if (!image) return;
      // Seen only through the passage: gone under the cheeks to either side.
      const inside = this.opening - Math.abs(shape.x - gate.x);
      const shown = Math.max(0, Math.min(1, inside / FADE));
      image
        .setPosition(shape.x, shape.y)
        .setRotation(shape.heading)
        .setAlpha(POND.crowdAlpha * shown)
        .setVisible(shown > 0);
    });
    // The water coming out breathes a little.
    const breath = 0.9 + 0.1 * Math.sin(this.time * 0.6);
    for (const { image, strength } of this.stains) {
      image.setAlpha(POND.plumeAlpha * strength * breath);
    }
  }

  destroy(): void {
    for (const { image } of this.stains) image.destroy();
    this.gate.destroy();
    for (const image of this.shapes) image.destroy();
  }
}
