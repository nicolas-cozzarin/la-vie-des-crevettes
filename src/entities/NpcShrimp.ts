import type Phaser from 'phaser';
import { MOOD_EXPRESSIONS, withConditions, type RigLook } from '../art/expressions';
import { Activity, type OtherShrimp } from '../core/activity/Activity';
import type { FoodPatch } from '../core/food/FoodPatch';
import { FeelingsModel, type FeelingsChange } from '../core/feelings/FeelingsModel';
import type { FeelingsContext } from '../core/feelings/types';
import { rotateToward } from '../core/movement/angles';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import { NpcMind, type NpcIntent, type NpcWorld } from '../core/npc/NpcMind';
import { BURROW, FEELINGS, GRAZE, GREET, HIDE, MOOD, MOTION } from '../data/tuning';
import type { CoverHandle } from '../systems/AreaLoader';
import { SandLid } from './SandLid';
import { ShrimpRig } from './ShrimpRig';

/** What happened to one other shrimp on one step, for the shoal to pass on. */
export interface NpcStep {
  darted: boolean;
  /** A greeting it made has finished, with this shrimp. */
  greeted?: string;
  mood?: FeelingsChange['mood'];
}

/**
 * Another shrimp: the same motion, feelings and activities as the player's
 * own, a mind that chooses for it, and a rig that draws it. See
 * docs/15-implementation-guide.md, step 6.
 */
export class NpcShrimp {
  readonly motion: ShrimpMotion;
  readonly feelings: FeelingsModel;
  readonly activity: Activity<CoverHandle, FoodPatch>;
  readonly rig: ShrimpRig;
  intent: NpcIntent | null = null;
  /** Grazing with the mouth on the food on the last step. */
  eating = false;
  /** Seconds owed to a shrimp far outside the view, stepped in one go. */
  owed = 0;
  /** The sand over it when it digs in, where the bed is sand. */
  private readonly lid: SandLid | null;

  constructor(
    scene: Phaser.Scene,
    readonly id: string,
    readonly named: boolean,
    readonly mind: NpcMind,
    readonly bodyLengthPx: number,
    start: { x: number; y: number; heading: number },
    look: Partial<RigLook>,
    hunger: number,
    depth: number,
    /** The ground's picture where the bed is sand, so it can dig in. Null elsewhere. */
    private readonly sand: string | null = null,
  ) {
    this.motion = new ShrimpMotion({ ...MOTION, bodyLengthPx }, start);
    this.feelings = new FeelingsModel(FEELINGS, MOOD, { hunger });
    this.activity = new Activity<CoverHandle, FoodPatch>(HIDE, bodyLengthPx, GRAZE, GREET, BURROW);
    this.rig = new ShrimpRig(scene, bodyLengthPx, depth, look);
    this.lid = sand ? new SandLid(scene, sand, bodyLengthPx, depth + 1) : null;
    this.rig.update(0, this.motion);
  }

  get x(): number {
    return this.motion.x;
  }

  get y(): number {
    return this.motion.y;
  }

  /**
   * One step: the mind chooses what to press, the activity and the motion
   * do the rest, as they do for the player.
   */
  step(
    dt: number,
    world: NpcWorld,
    covers: readonly CoverHandle[],
    foods: readonly FoodPatch[],
    others: readonly OtherShrimp[],
    mover: Mover,
    context: Omit<
      FeelingsContext,
      'motion' | 'activity' | 'hidden' | 'moving' | 'tired' | 'nearCover'
    >,
  ): NpcStep {
    const intent = this.mind.step(dt, world);
    this.intent = intent;
    const result = this.activity.update(
      {
        dt,
        x: this.motion.x,
        y: this.motion.y,
        heading: this.motion.heading,
        hide: intent.hide,
        interact: intent.interact,
        sense: false,
        tailFlip: intent.dart,
        axis: intent.axis,
        hunger: this.feelings.values.hunger,
        fear: this.feelings.values.fear,
        tasted: () => true,
        greet: intent.greet,
        others: intent.greetWith ? others.filter((one) => one.id === intent.greetWith) : [],
        sand: this.sand !== null,
      },
      covers,
      foods,
    );
    this.eating = result.eating && this.activity.food !== null;
    if (this.eating && this.activity.food) this.feelings.eat(this.activity.food.graze(dt));
    if (result.face !== undefined) {
      this.motion.heading = rotateToward(this.motion.heading, result.face, MOTION.turnRate * dt);
    }
    const axis = result.axis;
    const moving = axis.x !== 0 || axis.y !== 0 || intent.dart;
    const change = this.feelings.step(dt, {
      ...context,
      motion: this.motion.mode,
      activity: this.activity.name,
      hidden: this.activity.tucked,
      nearCover: this.activity.canHide(this.motion.x, this.motion.y, covers),
      moving,
      tired: this.motion.tired,
    });
    const moved = this.motion.step(dt, { x: axis.x, y: axis.y, dart: intent.dart }, mover);
    if (moved.darted) this.feelings.stimulus('tailFlip');
    if (result.greeted) this.mind.greeted(world.time);
    return { darted: moved.darted, greeted: result.greeted, mood: change.mood };
  }

  /** Draws it, or hides it when it is out of sight. `lift` brightens it. */
  draw(dt: number, visible: boolean, lift: number, target: { x: number; y: number } | null): void {
    this.rig.setVisible(visible);
    if (!visible) {
      this.lid?.update(this.motion.x, this.motion.y, this.motion.heading, 0);
      return;
    }
    const feelings = this.feelings;
    const has = feelings.has.bind(feelings);
    const greeting = this.activity.name === 'greeting';
    const mood = greeting ? 'social' : feelings.mood;
    this.rig.setLift(lift);
    this.rig.update(dt, this.motion, {
      expression: withConditions(MOOD_EXPRESSIONS[mood], has),
      afraid: mood === 'afraid',
      target: this.intent?.look ?? target,
      startled: has('startled'),
      grazing: this.eating,
      grooming: this.intent?.grooming === true,
    });
    this.lid?.update(this.motion.x, this.motion.y, this.motion.heading, this.activity.burrowDepth);
  }

  destroy(): void {
    this.rig.destroy();
    this.lid?.destroy();
  }
}
