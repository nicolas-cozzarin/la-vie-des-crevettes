import Phaser from 'phaser';
import {
  EYE,
  PARTS,
  PART_PX_PER_BL,
  SHRIMP,
  eyeOriginX,
  partOriginX,
  type PartDef,
} from '../art/shrimpParts';
import { ensureTexture } from '../art/TextureFactory';
import { angleDiff, approach, TAU } from '../core/movement/angles';
import type { MotionMode } from '../core/movement/ShrimpMotion';
import { SHADOW } from '../data/tuning';

/** What the rig needs to know about the shrimp on this frame. */
export interface RigPose {
  x: number;
  y: number;
  /** Where the head points, in radians. */
  heading: number;
  mode: MotionMode;
  /** Pixels per second. */
  vx: number;
  vy: number;
  /** 0 on the bed, 1 when swimming. */
  height: number;
}

const SEGMENTS = SHRIMP.segmentLengths.length;
/** How much of each abdominal plate lies over the one behind it. */
const PLATE_OVERLAP = 1.22;
/** Seconds each joint of the abdomen lags behind the one before it. */
const JOINT_LAG = 0.02;
/** The most one joint bends sideways, in radians. */
const JOINT_LIMIT = 0.26;

const ANTENNA_POINTS = 14;
const ANTENNA_LENGTH = 1.25;
/** Longest time step for the antennae, in seconds. Longer frames are cut up. */
const ANTENNA_STEP = 1 / 120;
/** The most one link of an antenna bends from the link before it, in radians. */
const ANTENNA_BEND = 0.42;

/** Where the five pairs of walking legs leave the body, in BL ahead of the abdomen. */
const LEG_ROOTS = [0.07, 0.115, 0.16, 0.205, 0.25];
/** Resting angle of each leg, forward of straight out, in radians. */
const LEG_ANGLES = [-0.55, -0.28, 0, 0.3, 0.6];

const LEG_COLOR = 0xf3f6f7;
const FEELER_COLOR = 0x8c8274;
const SWIMMERET_COLOR = 0xe6edf0;
const SHADOW_COLOR = 0x141e28;

interface Point {
  x: number;
  y: number;
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}

/**
 * A whiteleg shrimp seen from above, built from parts and moved by code:
 * a body that bends when it turns and folds when it darts, antennae that
 * trail like soft ropes, legs that step, swimmerets that flutter, a tail fan
 * that opens and closes, and a shadow that falls further away the higher the
 * shrimp is. See docs/04-art-direction.md.
 */
export class ShrimpRig {
  private readonly root: Phaser.GameObjects.Container;
  private readonly shadows: Phaser.GameObjects.Image[] = [];
  private readonly lineShadows: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly uropods: Phaser.GameObjects.Image[] = [];
  private readonly telson: Phaser.GameObjects.Image;
  private readonly segments: Phaser.GameObjects.Image[] = [];
  private readonly scales: Phaser.GameObjects.Image[] = [];
  private readonly carapace: Phaser.GameObjects.Image;
  private readonly eyes: Phaser.GameObjects.Image[] = [];

  /** Direction of each abdominal segment, then of the tail fan. */
  private readonly angles: number[] = new Array<number>(SEGMENTS + 1).fill(0);
  /** Where each abdominal segment starts, then where the tail fan starts. */
  private readonly joints: Point[] = Array.from({ length: SEGMENTS + 1 }, () => ({ x: 0, y: 0 }));
  private readonly antennae: Point[][] = [-1, 1].map(() =>
    Array.from({ length: ANTENNA_POINTS }, () => ({ x: 0, y: 0 })),
  );

  private placed = false;
  private lastHeading = 0;
  private clock = 0;
  private gait = 0;
  private flutter = 0;
  /** 0 walking, 1 swimming. */
  private swim = 0;
  /** 0 legs out, 1 legs tucked under the body. */
  private tuck = 0;
  /** 0 stretched out, 1 folded in a tail flip. */
  private fold = 0;
  /** 0 tail fan closed, 1 wide open. */
  private spread = 0.5;
  /** Where shadows fall on this frame, and how dark the thin ones are. */
  private shadowX = 0;
  private shadowY = 0;
  private shadowAlpha = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly bodyLengthPx: number,
    depth: number,
  ) {
    const image = (name: string, originX: number): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, ensureTexture(scene, name)).setOrigin(originX, 0.5);
    const part = (def: PartDef): Phaser.GameObjects.Image => image(def.name, partOriginX(def));

    this.root = scene.add.container(0, 0).setDepth(depth);

    for (let index = 0; index < 4; index++) {
      this.shadows.push(scene.add.image(0, 0, ensureTexture(scene, 'shadow.soft')));
    }
    this.lineShadows = scene.add.graphics();
    this.lines = scene.add.graphics();
    for (let index = 0; index < 4; index++) this.uropods.push(part(PARTS.uropod));
    this.telson = part(PARTS.telson);
    for (let index = 0; index < SEGMENTS; index++) this.segments.push(part(PARTS.segment));
    for (let index = 0; index < 2; index++) this.scales.push(part(PARTS.scale));
    this.carapace = part(PARTS.carapace);
    for (let index = 0; index < 2; index++) this.eyes.push(image(EYE.name, eyeOriginX()));

    // Bottom to top. Each plate of the abdomen lies over the one behind it.
    this.root.add([
      ...this.shadows,
      this.lineShadows,
      this.lines,
      ...this.uropods,
      this.telson,
      ...[...this.segments].reverse(),
      ...this.scales,
      this.carapace,
      ...this.eyes,
    ]);
  }

  destroy(): void {
    this.root.destroy(true);
  }

  update(dt: number, pose: RigPose): void {
    const speed = Math.hypot(pose.vx, pose.vy);
    const darting = pose.mode === 'dart';
    const gliding = pose.mode === 'glide';
    const swimming = pose.mode === 'swim';

    this.clock += dt;
    this.swim += ((swimming ? 1 : 0) - this.swim) * approach(dt, 0.18);
    this.tuck += ((swimming || darting || gliding ? 1 : 0) - this.tuck) * approach(dt, 0.12);
    this.fold += ((darting ? 1 : 0) - this.fold) * approach(dt, darting ? 0.03 : 0.14);

    let spreadTarget = 0.5 + 0.08 * Math.sin(this.clock * 0.9);
    if (darting) spreadTarget = 1;
    else if (gliding) spreadTarget = 0.75;
    else if (swimming) spreadTarget = 0.18;
    else if (pose.mode === 'walk') spreadTarget = 0.36;
    this.spread += (spreadTarget - this.spread) * approach(dt, 0.12);

    this.gait += (speed / (0.4 * this.bodyLengthPx)) * TAU * dt;
    this.flutter += TAU * dt * lerp(1.1, 8.5, this.swim);

    // Rising off the bed brings the shrimp a little closer to the eye.
    const bl = this.bodyLengthPx * (1 + 0.05 * Math.min(pose.height, 1.6));
    const scale = bl / PART_PX_PER_BL;
    const heading = pose.heading;
    const fx = Math.cos(heading);
    const fy = Math.sin(heading);
    // Unit vector to the shrimp's right.
    const rx = -fy;
    const ry = fx;

    this.placeBody(dt, pose, bl, scale);
    this.placeHead(pose, bl, scale, fx, fy, rx, ry);
    this.placeShadows(pose, bl);

    this.lines.clear();
    this.lineShadows.clear();
    const stroke = this.bodyLengthPx / 110;
    this.drawLegs(pose, bl, stroke, speed, fx, fy);
    this.drawSwimmerets(bl, stroke);
    this.drawAntennules(pose, bl, stroke, fx, fy, rx, ry);
    this.drawAntennae(dt, pose, bl, stroke, fx, fy, rx, ry);

    this.placed = true;
  }

  /** Carapace, abdomen and tail fan. The abdomen follows the head like a chain. */
  private placeBody(dt: number, pose: RigPose, bl: number, scale: number): void {
    const heading = pose.heading;
    this.carapace.setPosition(pose.x, pose.y).setRotation(heading).setScale(scale);

    // Seen from above, a tail flip folds the abdomen under the body and shortens it.
    const stretch = 1 - 0.42 * this.fold;
    const relax = this.placed ? Math.exp(-dt / JOINT_LAG) : 0;

    let previous = heading;
    let x = pose.x;
    let y = pose.y;
    for (let index = 0; index <= SEGMENTS; index++) {
      const lag = Phaser.Math.Clamp(
        angleDiff(this.angles[index] ?? previous, previous) * relax,
        -JOINT_LIMIT,
        JOINT_LIMIT,
      );
      const angle = previous + lag;
      this.angles[index] = angle;
      const joint = this.joints[index] as Point;
      joint.x = x;
      joint.y = y;

      if (index < SEGMENTS) {
        const length = SHRIMP.segmentLengths[index] as number;
        const halfWidth = SHRIMP.segmentHalfWidths[index] as number;
        (this.segments[index] as Phaser.GameObjects.Image)
          .setPosition(x, y)
          .setRotation(angle)
          .setScale(
            ((scale * length * PLATE_OVERLAP) / PARTS.segment.length) * stretch,
            (scale * halfWidth) / PARTS.segment.halfWidth,
          );
        x -= Math.cos(angle) * length * bl * stretch;
        y -= Math.sin(angle) * length * bl * stretch;
      }
      previous = angle;
    }

    const fan = this.angles[SEGMENTS] as number;
    this.telson
      .setPosition(x, y)
      .setRotation(fan)
      .setScale(scale * stretch, scale);
    const inner = 0.12 + 0.3 * this.spread;
    const outer = 0.26 + 0.62 * this.spread;
    [-outer, outer, -inner, inner].forEach((angle, index) => {
      (this.uropods[index] as Phaser.GameObjects.Image)
        .setPosition(x, y)
        .setRotation(fan + angle)
        .setScale(scale * (1 - 0.25 * this.fold), scale);
    });
  }

  private placeHead(
    pose: RigPose,
    bl: number,
    scale: number,
    fx: number,
    fy: number,
    rx: number,
    ry: number,
  ): void {
    [-1, 1].forEach((side, index) => {
      (this.eyes[index] as Phaser.GameObjects.Image)
        .setPosition(
          pose.x + fx * 0.288 * bl + rx * side * 0.034 * bl,
          pose.y + fy * 0.288 * bl + ry * side * 0.034 * bl,
        )
        .setRotation(pose.heading + side * 0.95)
        .setScale(scale);
      (this.scales[index] as Phaser.GameObjects.Image)
        .setPosition(
          pose.x + fx * 0.293 * bl + rx * side * 0.024 * bl,
          pose.y + fy * 0.293 * bl + ry * side * 0.024 * bl,
        )
        .setRotation(pose.heading + side * 0.2)
        .setScale(scale);
    });
  }

  /** Soft blobs under the body. They slide away and fade as the shrimp rises. */
  private placeShadows(pose: RigPose, bl: number): void {
    const offset = SHADOW.contactPx + pose.height * SHADOW.perHeight * this.bodyLengthPx;
    const norm = Math.hypot(SHADOW.directionX, SHADOW.directionY);
    const ox = (SHADOW.directionX / norm) * offset;
    const oy = (SHADOW.directionY / norm) * offset;
    const grow = 1 + 0.28 * pose.height;
    const alpha = 0.34 / (1 + 0.9 * pose.height);
    this.shadowX = ox;
    this.shadowY = oy;
    this.shadowAlpha = 0.2 / (1 + 0.9 * pose.height);
    const heading = pose.heading;
    const fan = this.angles[SEGMENTS] as number;
    const fanJoint = this.joints[SEGMENTS] as Point;
    const mid = this.joints[2] as Point;
    const rear = this.joints[4] as Point;

    const blobs: [number, number, number, number, number][] = [
      [
        pose.x + Math.cos(heading) * 0.17 * bl,
        pose.y + Math.sin(heading) * 0.17 * bl,
        heading,
        0.46,
        0.25,
      ],
      [mid.x, mid.y, this.angles[2] as number, 0.32, 0.21],
      [rear.x, rear.y, this.angles[4] as number, 0.3, 0.18],
      [
        fanJoint.x - Math.cos(fan) * 0.06 * bl,
        fanJoint.y - Math.sin(fan) * 0.06 * bl,
        fan,
        0.26,
        0.15 + 0.12 * this.spread,
      ],
    ];
    blobs.forEach(([x, y, rotation, length, width], index) => {
      (this.shadows[index] as Phaser.GameObjects.Image)
        .setPosition(x + ox, y + oy)
        .setRotation(rotation)
        .setDisplaySize(length * bl * grow, width * bl * grow)
        .setAlpha(alpha);
    });
  }

  /** Five pairs of walking legs. They step when walking and tuck in when swimming. */
  private drawLegs(
    pose: RigPose,
    bl: number,
    stroke: number,
    speed: number,
    fx: number,
    fy: number,
  ): void {
    const stepping = Math.min(1, speed / (1.2 * this.bodyLengthPx)) * (1 - this.tuck);
    const reach = bl * lerp(0.115, 0.045, this.tuck);
    const heading = pose.heading;
    const width = 1.5 * stroke;
    const alpha = lerp(0.9, 0.55, this.tuck);

    for (const side of [-1, 1]) {
      for (let index = 0; index < LEG_ROOTS.length; index++) {
        const along = (LEG_ROOTS[index] as number) * bl;
        // Out from the body's side, at right angles to the heading.
        const out = heading + side * (Math.PI / 2);
        const rootX = pose.x + fx * along + Math.cos(out) * 0.05 * bl;
        const rootY = pose.y + fy * along + Math.sin(out) * 0.05 * bl;

        // Neighbouring legs, and the two legs of a pair, step out of time.
        const phase = this.gait + index * 2.4 + (side > 0 ? Math.PI : 0);
        const swing = Math.sin(phase) * 0.42 * stepping;
        const forward = lerp((LEG_ANGLES[index] as number) + swing, -1.15, this.tuck);
        const direction = heading + side * (Math.PI / 2 - forward);
        const kneeX = rootX + Math.cos(direction) * reach * 0.58;
        const kneeY = rootY + Math.sin(direction) * reach * 0.58;
        const shin = direction + side * 0.55;
        this.stroke(
          [
            rootX,
            rootY,
            kneeX,
            kneeY,
            kneeX + Math.cos(shin) * reach * 0.5,
            kneeY + Math.sin(shin) * reach * 0.5,
          ],
          width,
          LEG_COLOR,
          alpha,
        );
      }
    }
  }

  /** Five pairs of swimmerets under the abdomen, beating in a wave from front to back. */
  private drawSwimmerets(bl: number, stroke: number): void {
    const strength = lerp(0.16, 1, this.swim) * (1 - this.fold);
    const width = 2.6 * stroke;
    const alpha = lerp(0.4, 0.7, this.swim);

    for (let index = 0; index < 5; index++) {
      const angle = this.angles[index] as number;
      const from = this.joints[index] as Point;
      const to = this.joints[index + 1] as Point;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const halfWidth = (SHRIMP.segmentHalfWidths[index] as number) * bl;
      const beat = 0.5 + 0.5 * Math.sin(this.flutter - index * 1.15);
      const length = bl * (0.012 + 0.055 * beat * strength);

      for (const side of [-1, 1]) {
        const out = angle + side * (Math.PI / 2);
        const rootX = midX + Math.cos(out) * halfWidth * 0.8;
        const rootY = midY + Math.sin(out) * halfWidth * 0.8;
        // Swept back from straight out.
        const direction = angle + side * (Math.PI / 2 + 0.6);
        this.stroke(
          [
            rootX,
            rootY,
            rootX + Math.cos(direction) * length,
            rootY + Math.sin(direction) * length,
          ],
          width,
          SWIMMERET_COLOR,
          alpha,
        );
      }
    }
  }

  /** The short forked pair between the eyes. They flick a little, always. */
  private drawAntennules(
    pose: RigPose,
    bl: number,
    stroke: number,
    fx: number,
    fy: number,
    rx: number,
    ry: number,
  ): void {
    const width = 1.3 * stroke;
    for (const side of [-1, 1]) {
      const baseX = pose.x + fx * 0.3 * bl + rx * side * 0.012 * bl;
      const baseY = pose.y + fy * 0.3 * bl + ry * side * 0.012 * bl;
      const flick = 0.05 * Math.sin(this.clock * 5.2 + side * 1.3);
      const direction = pose.heading + side * (0.24 + flick);
      const forkX = baseX + Math.cos(direction) * 0.075 * bl;
      const forkY = baseY + Math.sin(direction) * 0.075 * bl;
      this.stroke([baseX, baseY, forkX, forkY], width, FEELER_COLOR, 0.85);
      for (const fork of [-0.16, 0.16]) {
        this.stroke(
          [
            forkX,
            forkY,
            forkX + Math.cos(direction + fork) * 0.09 * bl,
            forkY + Math.sin(direction + fork) * 0.09 * bl,
          ],
          width,
          FEELER_COLOR,
          0.75,
        );
      }
    }
  }

  /**
   * The long antennae. Each is a chain of points: the first is fixed to the
   * head, and every other one is drawn toward a resting curve but stays where
   * it was in the water for a moment, so the antennae trail behind movement.
   */
  private drawAntennae(
    dt: number,
    pose: RigPose,
    bl: number,
    stroke: number,
    fx: number,
    fy: number,
    rx: number,
    ry: number,
  ): void {
    const link = (ANTENNA_LENGTH * bl) / (ANTENNA_POINTS - 1);
    // Small steps keep the chain smooth however long the frame was.
    const steps = this.placed ? Math.min(12, Math.max(1, Math.ceil(dt / ANTENNA_STEP))) : 1;
    const stepTime = dt / steps;
    const turned = angleDiff(pose.heading, this.lastHeading);

    [-1, 1].forEach((side, which) => {
      const chain = this.antennae[which] as Point[];
      const base = chain[0] as Point;
      const fromX = base.x;
      const fromY = base.y;
      const toX = pose.x + fx * 0.295 * bl + rx * side * 0.036 * bl;
      const toY = pose.y + fy * 0.295 * bl + ry * side * 0.036 * bl;
      // A slow sweep, out of time on the two sides.
      const sweep = 0.14 * Math.sin(this.clock * 0.8 + which * 2.1);

      for (let step = 1; step <= steps; step++) {
        const share = step / steps;
        const heading = this.placed ? this.lastHeading + turned * share : pose.heading;
        base.x = this.placed ? fromX + (toX - fromX) * share : toX;
        base.y = this.placed ? fromY + (toY - fromY) * share : toY;

        let previousLink = heading + side * (0.5 + sweep);
        for (let index = 1; index < ANTENNA_POINTS; index++) {
          const before = chain[index - 1] as Point;
          const point = chain[index] as Point;
          const rest = heading + side * (0.5 + sweep + index * 0.115);
          if (this.placed) {
            // Stiff near the head, loose toward the tip.
            const pull = approach(stepTime, 1 / lerp(24, 3.2, index / (ANTENNA_POINTS - 1)));
            point.x += (before.x + Math.cos(rest) * link - point.x) * pull;
            point.y += (before.y + Math.sin(rest) * link - point.y) * pull;
          }
          // Each link keeps its length and bends only so far from the one before it.
          const wanted = this.placed ? Math.atan2(point.y - before.y, point.x - before.x) : rest;
          const bend = Phaser.Math.Clamp(
            angleDiff(wanted, previousLink),
            -ANTENNA_BEND,
            ANTENNA_BEND,
          );
          previousLink += bend;
          point.x = before.x + Math.cos(previousLink) * link;
          point.y = before.y + Math.sin(previousLink) * link;
        }
      }

      // Thinner and fainter toward the tip.
      const runs: [number, number, number, number][] = [
        [0, 5, 1.7, 0.9],
        [5, 9, 1.3, 0.8],
        [9, ANTENNA_POINTS - 1, 1, 0.65],
      ];
      for (const [from, to, width, alpha] of runs) {
        const path: number[] = [];
        for (let index = from; index <= to; index++) {
          const point = chain[index] as Point;
          path.push(point.x, point.y);
        }
        this.stroke(path, width * stroke, FEELER_COLOR, alpha);
      }
    });

    this.lastHeading = pose.heading;
  }

  /** Draw a thin line through the points (x, y, x, y, ...) and its shadow on the bed. */
  private stroke(path: readonly number[], width: number, color: number, alpha: number): void {
    const shadow = this.lineShadows;
    shadow.lineStyle(width * 1.4, SHADOW_COLOR, this.shadowAlpha);
    shadow.beginPath();
    const line = this.lines;
    line.lineStyle(width, color, alpha);
    line.beginPath();
    for (let index = 0; index < path.length; index += 2) {
      const x = path[index] as number;
      const y = path[index + 1] as number;
      if (index === 0) {
        shadow.moveTo(x + this.shadowX, y + this.shadowY);
        line.moveTo(x, y);
      } else {
        shadow.lineTo(x + this.shadowX, y + this.shadowY);
        line.lineTo(x, y);
      }
    }
    shadow.strokePath();
    line.strokePath();
  }
}
