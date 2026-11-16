import type { ActivityName } from '../activity/Activity';
import type { FoodSpot } from '../food/FoodPatch';
import type { Mood } from '../feelings/mood';
import type { BondStage, Feelings } from '../feelings/types';
import type { Bounds, Obstacle } from '../movement/collision';
import type { MotionMode } from '../movement/ShrimpMotion';
import { distanceToCover, type CoverSpot } from '../world/cover';
import {
  chooseBehaviour,
  fleeAt,
  scoreBehaviours,
  type Behaviour,
  type NpcTuning,
  type Temperament,
} from './behaviours';
import { shoalMiddle, shoalPull, type ShoalMember, type ShoalTuning } from './shoal';
import { isClear, steer, type Axis, type SteerTuning } from './steer';

/**
 * The mind of another shrimp: every half second it weighs what it could do
 * and picks one thing (doc 10, "Choosing what to do"), then on every step it
 * turns that choice into what a player would press. The body is the same
 * `ShrimpMotion` and `Activity` as the player's. Nothing here knows about
 * the engine.
 */

/** Another shrimp as this one sees it. */
export interface SeenShrimp {
  id: string;
  x: number;
  y: number;
  heading: number;
  mode: MotionMode;
  player: boolean;
  /** For the player: the bond's stage. Between two others: they know each other. */
  stage: BondStage;
  /** Busy with something it should not be greeted in. */
  busy: boolean;
}

/** What the shoal system gathers for one shrimp on one step. */
export interface NpcWorld {
  time: number;
  x: number;
  y: number;
  heading: number;
  mode: MotionMode;
  feelings: Readonly<Feelings>;
  mood: Mood;
  wary: boolean;
  activity: ActivityName;
  tucked: boolean;
  covers: readonly CoverSpot[];
  foods: readonly FoodSpot[];
  /** Every other shrimp in the area, the player among them. */
  others: readonly SeenShrimp[];
  /** A threat's cue is under way (step 7). */
  cue: boolean;
  /** The player called within the follow time, and the bond is Companion or more. */
  called: boolean;
  /** From chapter 2, the shoal. Null in the mangrove. */
  shoal: readonly ShoalMember[] | null;
  lagoonDay: boolean;
}

/** What the shrimp presses on this step, as a player would. */
export interface NpcIntent {
  axis: Axis;
  dart: boolean;
  hide: boolean;
  interact: boolean;
  greet: boolean;
  /** The shrimp it means to greet, so the activity greets no one else. */
  greetWith: string | null;
  /** What its antennae turn toward. */
  look: { x: number; y: number } | null;
  grooming: boolean;
}

export interface NpcSetup {
  id: string;
  temperament: Temperament;
  bodyLengthPx: number;
  radiusPx: number;
  home: { x: number; y: number };
  obstacles: readonly Obstacle[];
  bounds: Bounds | null;
  random: () => number;
  /** Seconds before its first choice, so that not every shrimp chooses on the same step. */
  firstChoice: number;
}

export interface MindTuning {
  npc: NpcTuning;
  steer: SteerTuning;
  shoal: ShoalTuning;
  /** BL. Greeting starts this close (doc 10, "Activities"). */
  greetReach: number;
  /** Seconds a dart lasts with its glide, so the next is not asked too soon. */
  dartEvery: number;
}

const NOTHING: NpcIntent = {
  axis: { x: 0, y: 0 },
  dart: false,
  hide: false,
  interact: false,
  greet: false,
  greetWith: null,
  look: null,
  grooming: false,
};

export class NpcMind {
  behaviour: Behaviour = 'rest';
  /** Why the current behaviour is under way, for the browser test. */
  private startScore = 0;
  private started = 0;
  private nextChoice: number;
  private ended = false;

  private target: { x: number; y: number } | null = null;
  private food: FoodSpot | null = null;
  private greetWith: string | null = null;
  private until = 0;
  /** Seconds fear has been below the calm level while hiding. */
  private calmFor = 0;
  private darts = 0;
  private lastDart = -Infinity;
  /** Where the last fright came from, and when a neighbour's alarm last arrived. */
  private danger: { x: number; y: number } | null = null;
  private lastAlarm = -Infinity;
  private lastGreet = -Infinity;
  /** A Stranger stepping away from the player, until it reaches this point. */
  private avoid: { x: number; y: number } | null = null;
  /** The walk's rhythm: steps, then a pause. */
  private pulse = 0;
  /** Getting no closer to where it walks. */
  private stuckFor = 0;
  private bestGap = Infinity;
  /** Seconds standing at food without the graze starting. */
  private waiting = 0;
  /** The length of the step under way. */
  private dt = 0;

  constructor(
    private readonly setup: NpcSetup,
    private readonly tuning: MindTuning,
  ) {
    this.nextChoice = setup.firstChoice;
  }

  get id(): string {
    return this.setup.id;
  }

  get temperament(): Temperament {
    return this.setup.temperament;
  }

  /** The fear at which it flees. */
  get fleeLevel(): number {
    return fleeAt(this.setup.temperament.boldness, this.tuning.npc);
  }

  /** A neighbour's fright has reached it, from (x, y). */
  alarmed(time: number, x: number, y: number): void {
    this.lastAlarm = time;
    this.danger = { x, y };
    this.nextChoice = time;
  }

  /** Something startled it from (x, y): a tail flip close by. */
  startled(time: number, x: number, y: number): void {
    this.danger = { x, y };
    this.nextChoice = time;
  }

  /** Its greeting is done. */
  greeted(time: number): void {
    this.lastGreet = time;
    if (this.behaviour === 'greet') this.ended = true;
  }

  /** The player greeted it, and it greets back: it turns and taps too. */
  greetBack(time: number, playerId: string): void {
    if (this.behaviour === 'flee' || this.behaviour === 'hide' || this.behaviour === 'freeze') {
      return;
    }
    this.begin('greet', time, 1);
    this.greetWith = playerId;
    this.avoid = null;
  }

  /** The player called. It starts to come at its next choice. */
  hearCall(time: number): void {
    this.nextChoice = Math.min(this.nextChoice, time);
  }

  /** Whether it may start a greeting now: once per `every` seconds. */
  canGreet(time: number): boolean {
    return time - this.lastGreet >= this.tuning.npc.greet.every;
  }

  step(dt: number, world: NpcWorld): NpcIntent {
    const npc = this.tuning.npc;
    // Fear past its level makes it choose at once, whatever the clock says.
    const fleeing = this.behaviour === 'flee' || this.behaviour === 'hide';
    if (world.feelings.fear >= this.fleeLevel && !fleeing) this.nextChoice = world.time;
    if (world.time >= this.nextChoice || this.ended) {
      this.choose(world);
      this.nextChoice = world.time + npc.decideEvery;
    }
    this.dt = dt;
    this.pulse += dt;
    const intent = this.act(dt, world);
    return this.towardPlayer(world, intent);
  }

  private choose(world: NpcWorld): void {
    const npc = this.tuning.npc;
    const bl = this.setup.bodyLengthPx;
    const coverGap = this.nearestCover(world)?.gap ?? null;
    const greetable = this.greetTarget(world) !== null;
    const middle = world.shoal ? shoalMiddle(this.id, world.shoal) : null;
    const scores = scoreBehaviours(
      {
        feelings: world.feelings,
        calm: world.mood === 'calm',
        wary: world.wary,
        cue: world.cue,
        sinceAlarm: world.time - this.lastAlarm,
        coverGap: coverGap === null ? null : coverGap / bl,
        food: this.pickFood(world) !== null,
        greetable,
        called: world.called,
        shoalGap: middle ? Math.hypot(middle.x - world.x, middle.y - world.y) / bl : null,
        lagoonDay: world.lagoonDay,
      },
      this.setup.temperament,
      npc,
    );
    // A behaviour under way keeps what it started with until it has ended.
    let current: Behaviour | null = null;
    if (!this.ended && !this.hasEnded(world)) {
      current = this.behaviour;
      const hold = this.behaviour === 'flee' || this.behaviour === 'hide' ? 1 : this.startScore;
      if (!['graze', 'freeze'].includes(this.behaviour)) {
        scores[this.behaviour] = Math.max(scores[this.behaviour], hold);
      }
    } else {
      scores[this.behaviour] = this.behaviour === 'wander' ? scores.wander : 0;
    }
    const next = chooseBehaviour(scores, current, npc.keep);
    if (next !== this.behaviour || current === null)
      this.begin(next, world.time, scores[next], world);
  }

  private begin(behaviour: Behaviour, time: number, score: number, world?: NpcWorld): void {
    const npc = this.tuning.npc;
    const random = this.setup.random;
    this.behaviour = behaviour;
    this.startScore = score;
    this.started = time;
    this.ended = false;
    this.target = null;
    this.food = null;
    this.greetWith = null;
    this.stuckFor = 0;
    this.bestGap = Infinity;
    this.pulse = 0;
    this.waiting = 0;
    if (behaviour === 'flee') {
      this.darts = 0;
      this.lastDart = -Infinity;
    }
    if (behaviour === 'hide') this.calmFor = 0;
    if (behaviour === 'groom')
      this.until = time + npc.groom.min + (npc.groom.max - npc.groom.min) * random();
    if (behaviour === 'rest') {
      this.until =
        time +
        npc.rest.min +
        npc.rest.span * (1 - this.setup.temperament.activity) * (0.5 + random());
    }
    if (behaviour === 'follow') this.until = time + npc.follow.seconds;
    if (!world) return;
    if (behaviour === 'wander') this.target = this.wanderPoint(world);
    if (behaviour === 'graze') this.food = this.pickFood(world);
    if (behaviour === 'greet') this.greetWith = this.greetTarget(world)?.id ?? null;
  }

  /** Whether the behaviour under way has reached its end, by doc 10's "Ends when". */
  private hasEnded(world: NpcWorld): boolean {
    const npc = this.tuning.npc;
    const time = world.time;
    switch (this.behaviour) {
      case 'flee': {
        const gap = this.nearestCover(world)?.gap ?? Infinity;
        const reached = gap <= npc.hide.reach * this.setup.bodyLengthPx;
        const spent = this.darts >= npc.flee.darts && time - this.lastDart > npc.flee.swim;
        return reached || spent;
      }
      case 'hide':
        return (
          this.calmFor >=
          npc.hide.holdScale * (npc.hide.holdFactor - this.setup.temperament.boldness)
        );
      case 'freeze':
        return !world.cue && time - this.lastAlarm >= npc.freeze.afterAlarm;
      case 'graze':
        return !this.food || this.food.amount <= 0 || world.feelings.hunger < npc.graze.stop;
      case 'greet':
        return (
          this.greetWith === null ||
          !world.others.some((other) => other.id === this.greetWith) ||
          (time - this.started > npc.greet.giveUp && world.activity !== 'greeting')
        );
      case 'follow':
        return !world.called && time >= this.until;
      case 'groom':
      case 'rest':
        return time >= this.until;
      case 'wander':
        return this.target === null || time - this.started > npc.wander.giveUp;
    }
  }

  private act(dt: number, world: NpcWorld): NpcIntent {
    const npc = this.tuning.npc;
    const bl = this.setup.bodyLengthPx;
    const here = { x: world.x, y: world.y };
    switch (this.behaviour) {
      case 'flee':
        return this.flee(world);
      case 'hide': {
        if (world.feelings.fear < npc.hide.calm) this.calmFor += dt;
        else this.calmFor = 0;
        const cover = this.nearestCover(world);
        if (!cover) return NOTHING;
        if (cover.gap <= npc.hide.reach * bl * 0.9 || world.activity === 'hiding') {
          return { ...NOTHING, hide: true };
        }
        return { ...NOTHING, axis: this.walkTo(here, cover.cover, 1, false) };
      }
      case 'freeze':
        return { ...NOTHING, look: this.danger };
      case 'graze': {
        const food = this.food;
        if (!food) return NOTHING;
        if (world.activity === 'grazing') return { ...NOTHING, interact: true, look: food };
        const gap = Math.hypot(food.x - world.x, food.y - world.y) - food.r;
        // Close enough for the mouth to reach: stand still and press.
        if (gap <= 0.85 * bl) {
          this.waiting += dt;
          if (this.waiting > 3) this.ended = true;
          return { ...NOTHING, interact: true, look: food };
        }
        return {
          ...NOTHING,
          axis: this.walkTo(here, food, npc.walk.strength, true, world),
          look: food,
        };
      }
      case 'greet': {
        const other = world.others.find((one) => one.id === this.greetWith);
        if (!other) return NOTHING;
        const distance = Math.hypot(other.x - world.x, other.y - world.y);
        if (world.activity === 'greeting' || distance <= npc.greet.touch * bl) {
          return { ...NOTHING, greet: true, greetWith: other.id, look: other };
        }
        return {
          ...NOTHING,
          axis: this.walkTo(here, other, npc.walk.strength, true, world),
          look: other,
        };
      }
      case 'follow': {
        const player = world.others.find((one) => one.player);
        if (world.called && player) {
          const distance = Math.hypot(player.x - world.x, player.y - world.y);
          if (distance <= npc.follow.far * bl) {
            return { ...NOTHING, look: player };
          }
          return { ...NOTHING, axis: this.walkTo(here, player, 1, false, world), look: player };
        }
        const middle = world.shoal ? shoalMiddle(this.id, world.shoal) : null;
        if (!middle) return NOTHING;
        return { ...NOTHING, axis: this.walkTo(here, middle, npc.walk.strength, true, world) };
      }
      case 'groom':
        return { ...NOTHING, grooming: true };
      case 'rest':
        return { ...NOTHING, look: this.social(world) };
      case 'wander': {
        if (!this.target) return NOTHING;
        const axis = this.walkTo(here, this.target, npc.walk.strength, true, world);
        if (axis.x === 0 && axis.y === 0 && this.arrived(here, this.target)) this.ended = true;
        return { ...NOTHING, axis, look: this.social(world) };
      }
    }
  }

  /** Tail flips toward cover and away from the fright, up to three, then a swim. */
  private flee(world: NpcWorld): NpcIntent {
    const npc = this.tuning.npc;
    const here = { x: world.x, y: world.y };
    const cover = this.nearestCover(world, this.danger);
    let goal: { x: number; y: number };
    if (cover) goal = cover.cover;
    else if (this.danger) {
      const dx = world.x - this.danger.x;
      const dy = world.y - this.danger.y;
      const length = Math.hypot(dx, dy) || 1;
      const away = 6 * this.setup.bodyLengthPx;
      goal = { x: world.x + (dx / length) * away, y: world.y + (dy / length) * away };
    } else return { ...NOTHING, hide: true };
    const axis = this.walkTo(here, goal, 1, false);
    const dart =
      this.darts < npc.flee.darts &&
      world.time - this.lastDart >= this.tuning.dartEvery &&
      (axis.x !== 0 || axis.y !== 0);
    if (dart) {
      this.darts++;
      this.lastDart = world.time;
    }
    return { ...NOTHING, axis, dart, hide: true };
  }

  /**
   * Toward the player, by the bond's stage (doc 10, "Toward the player"). A
   * Stranger keeps its distance and backs off when rushed. Fleeing, hiding and
   * freezing come first.
   */
  private towardPlayer(world: NpcWorld, intent: NpcIntent): NpcIntent {
    const npc = this.tuning.npc;
    const bl = this.setup.bodyLengthPx;
    if (['flee', 'hide', 'freeze'].includes(this.behaviour)) {
      this.avoid = null;
      return intent;
    }
    const player = world.others.find((one) => one.player);
    if (!player || player.stage !== 'stranger' || this.greetWith === player.id) {
      this.avoid = null;
      return intent;
    }
    const dx = world.x - player.x;
    const dy = world.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    const rushed =
      distance < npc.stranger.rushed * bl && player.mode !== 'walk' && player.mode !== 'rest';
    if (!this.avoid && (rushed || distance < npc.stranger.keep * bl)) {
      const away = (rushed ? npc.stranger.backOff : npc.stranger.rushed) * bl;
      this.avoid = this.freePoint(
        world.x + (dx / distance) * (away - distance),
        world.y + (dy / distance) * (away - distance),
        world,
      );
    }
    if (!this.avoid) return intent;
    const here = { x: world.x, y: world.y };
    const axis = this.walkTo(here, this.avoid, rushed ? 1 : npc.walk.strength, false);
    if ((axis.x === 0 && axis.y === 0) || this.stuckFor > npc.stuck) {
      this.avoid = null;
      this.stuckFor = 0;
      return intent;
    }
    return { ...NOTHING, axis, look: player };
  }

  /** The shrimp nearest to it, for a social shrimp's antennae. */
  private social(world: NpcWorld): { x: number; y: number } | null {
    if (world.mood !== 'social') return null;
    let best: SeenShrimp | null = null;
    let bestDistance = Infinity;
    for (const other of world.others) {
      const distance = Math.hypot(other.x - world.x, other.y - world.y);
      if (distance < bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  /**
   * Walks toward a point. A calm walk goes in runs of steps with pauses
   * between, longer for a less active shrimp; an afraid one moves in short
   * bursts (doc 10, "Movement"). Returns no direction once there.
   */
  private walkTo(
    from: { x: number; y: number },
    to: { x: number; y: number },
    strength: number,
    paced: boolean,
    world?: NpcWorld,
  ): Axis {
    const bl = this.setup.bodyLengthPx;
    const gap = Math.hypot(to.x - from.x, to.y - from.y);
    if (gap < this.bestGap - 0.02 * bl) {
      this.bestGap = gap;
      this.stuckFor = 0;
    } else if (!paced || this.pulseOn(world)) {
      this.stuckFor += this.dt;
    }
    if (paced && !this.pulseOn(world)) return { x: 0, y: 0 };
    const axis = steer(
      from,
      to,
      bl,
      this.setup.radiusPx,
      this.setup.obstacles,
      this.setup.bounds,
      this.tuning.steer,
      strength,
    );
    if (!world?.shoal || (this.behaviour !== 'wander' && this.behaviour !== 'follow')) return axis;
    if (axis.x === 0 && axis.y === 0) return axis;
    const self = world.shoal.find((member) => member.id === this.id) ?? {
      id: this.id,
      x: from.x,
      y: from.y,
      heading: world.heading,
    };
    const pull = shoalPull(self, world.shoal, bl, this.tuning.shoal);
    const x = axis.x + pull.x;
    const y = axis.y + pull.y;
    const length = Math.hypot(x, y);
    return length > strength
      ? { x: (x / length) * strength, y: (y / length) * strength }
      : { x, y };
  }

  private pulseOn(world?: NpcWorld): boolean {
    const npc = this.tuning.npc;
    const afraid = world?.mood === 'afraid';
    const hungry = world?.mood === 'hungry' && this.behaviour === 'graze';
    if (hungry) return true;
    const on = afraid ? npc.afraidWalk.on : npc.walk.on;
    const idle = 1 - this.setup.temperament.activity;
    const off = afraid ? npc.afraidWalk.off : npc.walk.off + npc.walk.offIdle * idle;
    return this.pulse % (on + off) < on;
  }

  private arrived(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    const reach = this.tuning.steer.arrive * this.setup.bodyLengthPx;
    return (
      Math.hypot(to.x - from.x, to.y - from.y) <= reach || this.stuckFor > this.tuning.npc.stuck
    );
  }

  /** The nearest cover, and the gap to its edge. Away from a danger if one is given. */
  private nearestCover(
    world: NpcWorld,
    danger: { x: number; y: number } | null = null,
  ): { cover: CoverSpot; gap: number } | null {
    let best: { cover: CoverSpot; gap: number } | null = null;
    let bestCost = Infinity;
    for (const cover of world.covers) {
      const gap = distanceToCover(world.x, world.y, cover);
      let cost = gap;
      if (danger) {
        // Cover that lies past the danger costs twice as much.
        const toCover = Math.atan2(cover.y - world.y, cover.x - world.x);
        const toDanger = Math.atan2(danger.y - world.y, danger.x - world.x);
        if (Math.cos(toCover - toDanger) > 0.5) cost *= 2;
      }
      if (cost < bestCost) {
        best = { cover, gap };
        bestCost = cost;
      }
    }
    return best;
  }

  /** The nearest patch with food within its range. */
  private pickFood(world: NpcWorld): FoodSpot | null {
    const range = this.tuning.npc.graze.range * this.setup.bodyLengthPx;
    let best: FoodSpot | null = null;
    let bestDistance = range;
    for (const food of world.foods) {
      if (food.amount <= 0) continue;
      const distance = Math.hypot(food.x - world.x, food.y - world.y);
      if (distance < bestDistance) {
        best = food;
        bestDistance = distance;
      }
    }
    return best;
  }

  /**
   * Someone to greet: the nearest other shrimp within its greeting distance
   * that is not busy. The player only once it is no longer a Stranger.
   */
  private greetTarget(world: NpcWorld): SeenShrimp | null {
    const npc = this.tuning.npc;
    if (!this.canGreet(world.time)) return null;
    const reach =
      (npc.greet.base + npc.greet.perSociability * this.setup.temperament.sociability) *
      this.setup.bodyLengthPx;
    let best: SeenShrimp | null = null;
    let bestDistance = reach;
    for (const other of world.others) {
      if (other.busy || (other.player && other.stage === 'stranger')) continue;
      const distance = Math.hypot(other.x - world.x, other.y - world.y);
      if (distance < bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** A point within reach to wander to: near home, or near cover when wary. */
  private wanderPoint(world: NpcWorld): { x: number; y: number } | null {
    const npc = this.tuning.npc;
    const bl = this.setup.bodyLengthPx;
    const random = this.setup.random;
    let centre = this.setup.home;
    let span = npc.wander.home * bl;
    if (world.wary) {
      const cover = this.nearestCover(world);
      if (cover) {
        centre = cover.cover;
        span = cover.cover.r + npc.wander.waryCover * bl;
      }
    } else if (world.shoal) {
      centre = shoalMiddle(this.id, world.shoal) ?? centre;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = random() * Math.PI * 2;
      const distance = (0.3 + 0.7 * random()) * npc.wander.reach * bl;
      let x = world.x + Math.cos(angle) * distance;
      let y = world.y + Math.sin(angle) * distance;
      const fromCentre = Math.hypot(x - centre.x, y - centre.y);
      if (fromCentre > span) {
        x = centre.x + ((x - centre.x) / fromCentre) * span * random();
        y = centre.y + ((y - centre.y) / fromCentre) * span * random();
      }
      if (isClear(x, y, this.setup.radiusPx, this.setup.obstacles, this.setup.bounds)) {
        return { x, y };
      }
    }
    return null;
  }

  /** A point near the one asked for that is not inside anything. */
  private freePoint(x: number, y: number, world: NpcWorld): { x: number; y: number } {
    const radius = this.setup.radiusPx;
    if (isClear(x, y, radius, this.setup.obstacles, this.setup.bounds)) return { x, y };
    for (let turn = 1; turn <= 6; turn++) {
      for (const side of [1, -1]) {
        const angle = Math.atan2(y - world.y, x - world.x) + side * turn * 0.4;
        const distance = Math.hypot(x - world.x, y - world.y);
        const px = world.x + Math.cos(angle) * distance;
        const py = world.y + Math.sin(angle) * distance;
        if (isClear(px, py, radius, this.setup.obstacles, this.setup.bounds))
          return { x: px, y: py };
      }
    }
    return { x, y };
  }
}
