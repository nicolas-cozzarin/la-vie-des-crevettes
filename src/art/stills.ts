import { CRAB_CLAW_JOINT, HERMIT_LEGS_JOINT, HERMIT_SHELL_MOUTH } from './painters/creatures';
import {
  HUNTER_TAIL_JOINT,
  HUNTER_TAIL_OWN_JOINT,
  PISTOL_CLAW_JOINT,
  PISTOL_CLAW_OWN_JOINT,
  TURTLE_JOINTS,
  TURTLE_PART_JOINTS,
} from './painters/lagoonAnimals';
import { seededRandom } from '../core/random';
import type { CreatureDef } from '../data/areas/types';
import { WORLD } from '../data/tuning';
import { imageFit } from './fit';

/**
 * Still pictures of the area's animals, drawn on a 2D canvas from the painted
 * parts. The atelier draws its scenes with them, and the game draws each
 * animal once into a texture with the same code, so both look the same.
 * See docs/14-art-production.md, "From data to picture".
 */

/** Gives the painted picture for a name. */
export type ImageOf = (name: string) => HTMLCanvasElement;

type Ctx = CanvasRenderingContext2D;

/** Animals drawn in mid-water, above the shrimp, with their shadows on the bed. */
export const MID_WATER = new Set(['smallFish']);
/** Large animals that swim over the seagrass: drawn above the cover, their shadows below it. */
export const OVER_COVER = new Set(['turtle', 'huntingFish']);

/** The turtle's shell, from the head end to the tail, in its image's pixels. It is 6 BL. */
const TURTLE_SHELL_LENGTH = 784;

/** How far each animal's picture reaches from its point, in body lengths. */
export const STILL_REACH: Readonly<Record<CreatureDef['kind'], number>> = {
  fiddlerCrab: 1.7,
  snail: 0.7,
  hermitCrab: 0.8,
  smallFish: 3.4,
  turtle: 5.6,
  huntingFish: 3.2,
  pistolAndGoby: 1.1,
};

export interface Stills {
  drawCentred: (
    ctx: Ctx,
    name: string,
    x: number,
    y: number,
    width: number,
    rotation?: number,
    alpha?: number,
  ) => void;
  softShadow: (
    ctx: Ctx,
    x: number,
    y: number,
    w: number,
    h: number,
    alpha: number,
    rotation?: number,
  ) => void;
  drawCreature: (ctx: Ctx, creature: CreatureDef, bl: number) => void;
  swimmerShadow: (ctx: Ctx, creature: CreatureDef, bl: number) => void;
}

export function makeStills(paintImage: ImageOf): Stills {
  function drawCentred(
    ctx: Ctx,
    name: string,
    x: number,
    y: number,
    width: number,
    rotation = 0,
    alpha = 1,
  ): void {
    const image = paintImage(name);
    const height = (width * image.height) / image.width;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    // A picture that faces a way faces the other when the coast is turned round (doc 19).
    if (WORLD.mirror && imageFit(name).faces === true) ctx.scale(-1, 1);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function softShadow(
    ctx: Ctx,
    x: number,
    y: number,
    w: number,
    h: number,
    alpha: number,
    rotation = 0,
  ): void {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(paintImage('shadow.soft'), -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawCreature(ctx: Ctx, creature: CreatureDef, bl: number): void {
    const heading = creature.heading ?? 0;
    if (creature.kind === 'fiddlerCrab') {
      // Its burrow, beside it.
      drawCentred(ctx, 'crab.burrow', creature.x - 0.75 * bl, creature.y - 0.15 * bl, 0.62 * bl);
      const body = paintImage('crab.body');
      const scale = (1.1 * bl) / body.height;
      softShadow(ctx, creature.x + 4, creature.y + 6, 1.0 * bl, 0.9 * bl, 0.4);
      ctx.save();
      ctx.translate(creature.x, creature.y);
      ctx.rotate(heading);
      ctx.scale(scale, scale);
      ctx.drawImage(body, -104, -body.height / 2);
      // The big claw, half raised.
      const claw = paintImage('crab.claw');
      ctx.translate(CRAB_CLAW_JOINT.x - 104, CRAB_CLAW_JOINT.y - body.height / 2);
      ctx.rotate(-0.5);
      ctx.drawImage(claw, -16, -claw.height / 2);
      ctx.restore();
    } else if (creature.kind === 'snail') {
      const width = 0.8 * bl;
      softShadow(ctx, creature.x + 3, creature.y + 5, width * 0.95, width * 0.5, 0.4, heading);
      // Two short feelers in front.
      ctx.save();
      ctx.translate(creature.x, creature.y);
      ctx.rotate(heading);
      ctx.strokeStyle = 'rgba(150,142,128,0.9)';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(width * 0.4, side * 4);
        ctx.lineTo(width * 0.56, side * 9);
        ctx.stroke();
      }
      ctx.restore();
      drawCentred(ctx, 'snail.shell', creature.x, creature.y, width, heading);
    } else if (creature.kind === 'hermitCrab') {
      // The shell, with the legs and claws out of its mouth, as in play.
      const shell = paintImage('snail.shell');
      const legs = paintImage('hermit.legs');
      const mouth = HERMIT_SHELL_MOUTH.x - shell.width / 2;
      const scale = (0.9 * bl) / (shell.width / 2 + mouth + legs.width - HERMIT_LEGS_JOINT.x);
      softShadow(ctx, creature.x + 3, creature.y + 5, 0.9 * bl, 0.45 * bl, 0.4, heading);
      ctx.save();
      ctx.translate(creature.x, creature.y);
      ctx.rotate(heading);
      ctx.scale(scale, scale);
      ctx.drawImage(shell, -shell.width / 2, -shell.height / 2);
      ctx.drawImage(
        legs,
        mouth - HERMIT_LEGS_JOINT.x,
        HERMIT_SHELL_MOUTH.y - shell.height / 2 - HERMIT_LEGS_JOINT.y,
      );
      ctx.restore();
    } else if (creature.kind === 'smallFish') {
      const random = seededRandom(creature.x * 7 + creature.y);
      const count = creature.count ?? 12;
      const fish: { x: number; y: number; turn: number }[] = [];
      for (let index = 0; index < count; index++) {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * 1.9 * bl;
        fish.push({
          x: creature.x + Math.cos(angle) * distance * 1.3,
          y: creature.y + Math.sin(angle) * distance * 0.8,
          turn: heading + (random() - 0.5) * 0.3,
        });
      }
      // In mid-water: their shadows lie on the mud, well away from them.
      for (const one of fish) {
        softShadow(ctx, one.x + 0.2 * bl, one.y + 0.27 * bl, 0.62 * bl, 0.16 * bl, 0.3, one.turn);
      }
      for (const one of fish) drawCentred(ctx, 'fish.small', one.x, one.y, 0.7 * bl, one.turn);
    } else if (creature.kind === 'turtle') {
      drawTurtle(ctx, creature.x, creature.y, heading, bl);
    } else if (creature.kind === 'huntingFish') {
      drawHunter(ctx, creature.x, creature.y, heading, bl);
    } else if (creature.kind === 'pistolAndGoby') {
      drawPistolAndGoby(ctx, creature.x, creature.y, heading, bl);
    }
  }

  /**
   * The shadow of an animal over the seagrass, on the bed half a body length
   * off: the turtle's as large as a root tangle, the fish's a long spindle.
   */
  function swimmerShadow(ctx: Ctx, creature: CreatureDef, bl: number): void {
    const heading = creature.heading ?? 0;
    const x = creature.x + 0.3 * bl;
    const y = creature.y + 0.4 * bl;
    if (creature.kind === 'turtle') softShadow(ctx, x, y, 8.4 * bl, 6.4 * bl, 0.42, heading);
    else softShadow(ctx, x - Math.cos(heading) * 0.2 * bl, y, 4.4 * bl, 0.95 * bl, 0.42, heading);
  }

  /** The turtle from its parts, gliding, flippers half way through a stroke. */
  function drawTurtle(ctx: Ctx, x: number, y: number, heading: number, bl: number): void {
    const shell = paintImage('turtle.shell');
    const scale = (6 * bl) / TURTLE_SHELL_LENGTH;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.scale(scale, scale);
    ctx.translate(-shell.width / 2, -shell.height / 2);
    const part = (
      name: string,
      at: { x: number; y: number },
      own: { x: number; y: number },
      turn: number,
    ) => {
      const image = paintImage(name);
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(turn);
      ctx.drawImage(image, -own.x, -own.y);
      ctx.restore();
    };
    // The parts lie under the shell. The lower side mirrors the upper across the middle.
    for (const side of [-1, 1]) {
      ctx.save();
      if (side > 0) {
        ctx.translate(0, shell.height);
        ctx.scale(1, -1);
      }
      part('turtle.flipper.rear', TURTLE_JOINTS.rearFlipper, TURTLE_PART_JOINTS.rearFlipper, -2.5);
      part(
        'turtle.flipper.front',
        TURTLE_JOINTS.frontFlipper,
        TURTLE_PART_JOINTS.frontFlipper,
        -2.4,
      );
      ctx.restore();
    }
    part('turtle.head', TURTLE_JOINTS.head, TURTLE_PART_JOINTS.head, 0.08);
    ctx.drawImage(shell, 0, 0);
    ctx.restore();
  }

  /** The hunting fish on patrol, its tail a little to one side. */
  function drawHunter(ctx: Ctx, x: number, y: number, heading: number, bl: number): void {
    const body = paintImage('fish.hunter.body');
    const tail = paintImage('fish.hunter.tail');
    const tip = HUNTER_TAIL_JOINT.x - HUNTER_TAIL_OWN_JOINT.x;
    const scale = (4.5 * bl) / (body.width - tip);
    const middle = (body.width + tip) / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.scale(scale, scale);
    ctx.translate(-middle, -body.height / 2);
    ctx.save();
    ctx.translate(HUNTER_TAIL_JOINT.x, HUNTER_TAIL_JOINT.y);
    ctx.rotate(0.18);
    ctx.drawImage(tail, -HUNTER_TAIL_OWN_JOINT.x, -HUNTER_TAIL_OWN_JOINT.y);
    ctx.restore();
    ctx.drawImage(body, 0, 0);
    ctx.restore();
  }

  /**
   * The goby lying in the burrow's mouth, head out, and the pistol shrimp
   * beside it pushing a load of sand out, one antenna on the goby's tail.
   * The point is the burrow's mouth. The heading is where the goby looks.
   */
  function drawPistolAndGoby(ctx: Ctx, x: number, y: number, heading: number, bl: number): void {
    const fx = Math.cos(heading);
    const fy = Math.sin(heading);
    // Across the heading, to the goby's right.
    const rx = -fy;
    const ry = fx;
    // The goby's tail end is in the dark of the hole.
    const gobyWidth = 0.78 * bl;
    const gx = x + fx * 0.3 * bl;
    const gy = y + fy * 0.3 * bl;
    softShadow(ctx, gx + 3, gy + 4, gobyWidth, gobyWidth * 0.3, 0.35, heading);
    drawCentred(ctx, 'goby', gx, gy, gobyWidth, heading);
    const hole = ctx.createRadialGradient(x, y, 0, x, y, 0.16 * bl);
    hole.addColorStop(0, 'rgba(24,20,14,0.75)');
    hole.addColorStop(1, 'rgba(24,20,14,0)');
    ctx.fillStyle = hole;
    ctx.fillRect(x - 0.2 * bl, y - 0.2 * bl, 0.4 * bl, 0.4 * bl);
    // The pistol shrimp, half out, turned a little away from the goby.
    const turn = heading + 0.55;
    const px = x + rx * 0.28 * bl + fx * 0.12 * bl;
    const py = y + ry * 0.28 * bl + fy * 0.12 * bl;
    const body = paintImage('pistol.body');
    const claw = paintImage('pistol.claw');
    const scale = (0.55 * bl) / body.width;
    // The load of sand it pushes, just ahead of its claws: wet from below, so darker.
    const lx = px + Math.cos(turn) * 0.44 * bl;
    const ly = py + Math.sin(turn) * 0.44 * bl;
    softShadow(ctx, lx + 3, ly + 4, 0.4 * bl, 0.28 * bl, 0.4, turn);
    const load = ctx.createRadialGradient(lx, ly, 0, lx, ly, 0.17 * bl);
    load.addColorStop(0, 'rgba(198,178,134,0.95)');
    load.addColorStop(0.65, 'rgba(204,186,142,0.75)');
    load.addColorStop(1, 'rgba(204,186,142,0)');
    ctx.fillStyle = load;
    ctx.fillRect(lx - 0.2 * bl, ly - 0.2 * bl, 0.4 * bl, 0.4 * bl);
    const grains = seededRandom(Math.round(x + y));
    for (let index = 0; index < 16; index++) {
      const angle = grains() * Math.PI * 2;
      const distance = Math.sqrt(grains()) * 0.12 * bl;
      ctx.fillStyle = grains() < 0.5 ? 'rgba(130,112,78,0.6)' : 'rgba(246,238,214,0.7)';
      ctx.beginPath();
      ctx.arc(
        lx + Math.cos(angle) * distance,
        ly + Math.sin(angle) * distance,
        0.012 * bl,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    softShadow(ctx, px + 3, py + 4, 0.56 * bl, 0.3 * bl, 0.35, turn);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(turn);
    ctx.scale(scale, scale);
    ctx.translate(-body.width / 2, -body.height / 2);
    ctx.drawImage(body, 0, 0);
    ctx.translate(PISTOL_CLAW_JOINT.x, PISTOL_CLAW_JOINT.y);
    ctx.rotate(0.12);
    ctx.drawImage(claw, -PISTOL_CLAW_OWN_JOINT.x, -PISTOL_CLAW_OWN_JOINT.y);
    ctx.restore();
    // One antenna out from its head and back to the goby's tail, just out of the hole.
    const hx = px + Math.cos(turn) * 0.24 * bl;
    const hy = py + Math.sin(turn) * 0.24 * bl;
    const tx = x + fx * 0.06 * bl;
    const ty = y + fy * 0.06 * bl;
    const cx = hx - rx * 0.32 * bl + fx * 0.12 * bl;
    const cy = hy - ry * 0.32 * bl + fy * 0.12 * bl;
    ctx.save();
    ctx.strokeStyle = 'rgba(150,128,96,0.85)';
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  return { drawCentred, softShadow, drawCreature, swimmerShadow };
}
