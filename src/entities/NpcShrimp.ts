import type Phaser from 'phaser';
import { MOOD_EXPRESSIONS, withConditions, type RigLook } from '../art/expressions';
import { Activity, type OtherShrimp } from '../core/activity/Activity';
import type { FoodPatch } from '../core/food/FoodPatch';
import { FeelingsModel, type FeelingsChange } from '../core/feelings/FeelingsModel';
import type { FeelingsContext } from '../core/feelings/types';
import { rotateToward } from '../core/movement/angles';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import type { MoltEvent, MoltStage } from '../core/molt/Molt';
import { NpcMind, type NpcIntent, type NpcWorld } from '../core/npc/NpcMind';
import { BURROW, FEELINGS, GRAZE, GREET, HIDE, MOLT, MOOD, MOTION } from '../data/tuning';
import type { CoverHandle } from '../systems/AreaLoader';
import { Molting } from '../systems/Molting';
import { SandLid } from './SandLid';
import { ShrimpRig } from './ShrimpRig';

/** What happened to one other shrimp on one step, for the shoal to pass on. */
export interface NpcStep {
  darted: boolean;
  /** A greeting it made has finished, with this shrimp. */
  greeted?: string;
  mood?: FeelingsChange['mood'];
  /** Phases of its molt that began on this step. */
  molt?: MoltEvent[];
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
  /** Its molt and the shell it leaves, from the first time it molts (T104). */
  private molting: Molting | null = null;
  /** Molts here so far. */
  molts = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: string,
    readonly named: boolean,
    readonly mind: NpcMind,
    readonly bodyLengthPx: number,
    start: { x: number; y: number; heading: number },
    private readonly look: Partial<RigLook>,
    hunger: number,
    private readonly depth: number,
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

  /** In a current: the way the water runs, for the antennae and tail fan to lean (T110). */
  downstream: number | null = null;

  get x(): number {
    return this.motion.x;
  }

  get y(): number {
    return this.motion.y;
  }

  /** Where its molt is. */
  get moltStage(): MoltStage {
    return this.molting?.molt.stage ?? 'none';
  }

  /** Its shell has grown too small: the molt begins with its signal. */
  beginMolt(seed: number): MoltEvent[] {
    this.molting ??= new Molting(this.scene, this.bodyLengthPx, this.depth, this.look, seed);
    const events = this.molting.signal();
    this.answerMolt(events);
    return events;
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
    const molt = this.stepMolt(dt, moving, mover);
    return { darted: moved.darted, greeted: result.greeted, mood: change.mood, molt };
  }

  /** One step of its molt, as the player's: sheltered, it molts and backs out of its shell. */
  private stepMolt(dt: number, moving: boolean, mover: Mover): MoltEvent[] | undefined {
    const molting = this.molting;
    if (!molting || molting.molt.stage === 'none') return undefined;
    // In cover it must be tucked in; with none close by, keeping still is enough.
    const sheltered = this.activity.tucked || (this.mind.moltInOpen && !moving);
    const { events, back } = molting.step(dt, sheltered, this.motion);
    if (back > 0) {
      const heading = this.motion.heading;
      const after = mover(
        this.motion.x,
        this.motion.y,
        -Math.cos(heading) * back,
        -Math.sin(heading) * back,
      );
      this.motion.x = after.x;
      this.motion.y = after.y;
    }
    this.answerMolt(events);
    return events.length > 0 ? events : undefined;
  }

  /** What each phase of its molt does to its feelings and to how it is tucked in. */
  private answerMolt(events: readonly MoltEvent[]): void {
    for (const event of events) {
      if (event.type === 'done') {
        this.molts += 1;
        // It is drawn at the size of its kind: only the player's growth is followed.
        this.molting?.restore(0);
        continue;
      }
      const phase = event.phase;
      this.feelings.setPremolt(phase === 'signal' || phase === 'shelter');
      const cover = this.activity.cover;
      if ((phase === 'molt' || phase === 'soft') && cover && this.activity.name === 'hiding') {
        this.activity.tuckInto(cover, { x: this.motion.x, y: this.motion.y });
      }
      if (phase === 'soft') this.feelings.setSoft(MOLT.soft);
      if (phase === 'hardened') this.feelings.hungerUp(MOLT.hunger);
    }
  }

  /** Draws it, or hides it when it is out of sight. `lift` brightens it. */
  draw(dt: number, visible: boolean, lift: number, target: { x: number; y: number } | null): void {
    this.rig.setVisible(visible);
    this.molting?.draw(dt);
    if (!visible) {
      this.lid?.update(this.motion.x, this.motion.y, this.motion.heading, 0);
      return;
    }
    const feelings = this.feelings;
    const has = feelings.has.bind(feelings);
    const greeting = this.activity.name === 'greeting';
    const mood = greeting ? 'social' : feelings.mood;
    const molt = this.molting?.molt;
    this.rig.setLift(lift);
    this.rig.setAlpha(molt?.stage === 'soft' ? MOLT.softAlpha : 1);
    this.rig.update(dt, this.motion, {
      downstream: this.downstream,
      expression: withConditions(MOOD_EXPRESSIONS[mood], has),
      afraid: mood === 'afraid',
      target: this.intent?.look ?? target,
      startled: has('startled'),
      grazing: this.eating,
      grooming: this.intent?.grooming === true,
      arch: molt?.arch ?? 0,
      scratch: molt?.scratching ?? false,
    });
    this.lid?.update(this.motion.x, this.motion.y, this.motion.heading, this.activity.burrowDepth);
  }

  destroy(): void {
    this.rig.destroy();
    this.lid?.destroy();
    this.molting?.destroy();
  }
}
