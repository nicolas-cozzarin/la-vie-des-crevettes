/**
 * The one system that starts and runs every frightening event (doc 10,
 * "Threats"). It is told where the player is and what the player does on
 * each step, and it says what the scene should show. It never touches a
 * picture. The threats so far: the wading bird and the hunting fish.
 * Nothing here knows about the engine.
 */

import type { StimulusKind, ThreatView } from '../feelings/types';
import type { ThreatKind } from '../gameEvents';
import { rotateToward } from '../movement/angles';
import type { Point } from '../movement/collision';
import type { MotionMode } from '../movement/ShrimpMotion';
import {
  aimPoint,
  Legs,
  standPoint,
  strikeLands,
  type BirdTuning,
  type BirdWorld,
  type LegEvent,
} from './bird';
import { HuntingFish, type FishTuning } from './fish';

export type DirectorStage = 'idle' | 'cue' | 'presence' | 'chase' | 'cornered' | 'release';

interface Span {
  min: number;
  max: number;
}

export interface ThreatTuning {
  /** Seconds from one release to the next threat, at the least. */
  gap: number;
  /** Seconds between two rolls for an ambient threat, and the average wait they give. */
  roll: number;
  meanWait: number;
  /** BL. A threat may start only with cover this close to the player. */
  coverWithin: number;
  cue: Span;
  presence: Span;
  /** Seconds a chase lasts at most. */
  chase: number;
  /** Seconds from the instant before contact until control returns. */
  cornered: number;
  release: Span;
  /** Notice, per second, and at once for a tail flip. `far` scales gains beyond half the range; `first` scales them for the first scripted bird. */
  notice: {
    hidden: number;
    still: number;
    walk: number;
    swim: number;
    flip: number;
    far: number;
    first: number;
  };
}

/** What the director needs from the player on each step. */
export interface ThreatPlayer {
  x: number;
  y: number;
  /** Pixels per second. */
  vx: number;
  vy: number;
  mode: MotionMode;
  /** Tucked in under cover. */
  hidden: boolean;
  /** Under a cover's spread, tucked or not. */
  underCover: boolean;
  /** It flipped its tail on this step. */
  darted: boolean;
  soft: boolean;
  /** BL from the nearest cover's edge. */
  coverGap: number;
  /** The middle of the shoal close by, which the fish circles. Without one, it circles the player. */
  shoal?: Point | null;
  /** Seconds since the last tail flip began. */
  sinceFlip?: number;
}

export interface ThreatOptions {
  gentle: boolean;
  /** The threats that may come in this place. None in a place without. */
  kinds: readonly ThreatKind[];
  /** How many ambient threats may still come. Without a number, any. */
  ambient?: number;
}

export type ThreatEvent =
  | { type: 'stage'; kind: ThreatKind; stage: DirectorStage }
  | LegEvent
  | { type: 'ring'; x: number; y: number; warn: number }
  | { type: 'strike'; x: number; y: number; hit: boolean }
  | { type: 'escaped'; kind: ThreatKind; clean: boolean; still: boolean }
  | { type: 'faced'; x: number; y: number }
  | { type: 'charge'; x: number; y: number; heading: number }
  | { type: 'sidestep' };

export interface Ring {
  x: number;
  y: number;
  warn: number;
  /** Seconds since it appeared. */
  t: number;
}

interface Request {
  kind: ThreatKind;
  first: boolean;
  /** The way the shadow comes from, as an angle, or a random way. */
  from: number | null;
  force: boolean;
}

export class ThreatDirector {
  stage: DirectorStage = 'idle';
  kind: ThreatKind | null = null;
  /** Hidden: how much the predator has noticed the player, 0 to 1. */
  notice = 0;
  /** Seconds into the current stage, and how long it lasts. */
  stageTime = 0;
  stageLength = 0;
  /** The bird's shadow on the water. */
  readonly shadow = { x: 0, y: 0, heading: 0 };
  /** Where the shadow of its head points. */
  headAim = 0;
  legs: Legs | null = null;
  ring: Ring | null = null;
  /** The hunting fish, from its cue to the end of its release. */
  fish: HuntingFish | null = null;
  strikes = 0;

  private time = 0;
  private lastRelease = -Infinity;
  private nextRoll: number;
  /**
   * How many ambient threats may still come. In the story the mangrove has
   * none before the first bird and one after it (doc 10, "When a threat starts").
   */
  ambientLeft: number;
  private queued: Request | null = null;
  private first = false;
  private rungBefore = false;
  private lastStrike = -Infinity;
  private hiddenFor = 0;
  private moved = false;
  private cornered = false;
  private path = { x: 0, y: 0, way: 0, offset: 0 };
  private leaving = 0;
  private shadowFelt = new Set<string>();
  private seen = new Set<string>();
  private miss: { seq: number; x: number; y: number } | null = null;
  /** Gentle mode: hunters pass by and never chase. The settings can change it during play. */
  gentle: boolean;
  /** How likely an ambient threat is, against the usual: less at night, more at dawn (doc 10, "Day and night"). */
  ambientFactor = 1;
  private missSeen = new Map<string, number>();
  /** Where the player was on the last step, for the fish to leave away from. */
  private lastPlayer: Point = { x: 0, y: 0 };

  constructor(
    private readonly tuning: ThreatTuning,
    private readonly bird: BirdTuning,
    private readonly world: BirdWorld,
    private readonly random: () => number,
    private readonly options: ThreatOptions,
    private readonly fishTuning?: FishTuning,
  ) {
    this.nextRoll = tuning.gap;
    this.ambientLeft = options.ambient ?? Infinity;
    this.gentle = options.gentle;
  }

  /** Where the predator is: its feet once it stands, else its shadow. */
  get predator(): Point {
    if (this.fish) return { x: this.fish.x, y: this.fish.y };
    return this.legs?.anyDown ? this.legs.middle : { x: this.shadow.x, y: this.shadow.y };
  }

  /** Seconds since this director began. */
  get clock(): number {
    return this.time;
  }

  /**
   * A scripted threat, such as the first bird: it starts as soon as it may.
   * `force` starts it now even within the gap (the debug key), and only if
   * nothing is under way.
   */
  request(kind: ThreatKind, first = false, from: number | null = null, force = false): void {
    if (force ? this.stage !== 'idle' : !this.options.kinds.includes(kind)) return;
    if (kind === 'fish' && !this.fishTuning) return;
    this.queued = { kind, first, from, force };
  }

  step(dt: number, player: ThreatPlayer): ThreatEvent[] {
    this.time += dt;
    this.stageTime += dt;
    this.lastPlayer = { x: player.x, y: player.y };
    const events: ThreatEvent[] = [];
    switch (this.stage) {
      case 'idle':
        this.idle(player, events);
        break;
      case 'cue':
        this.cue(dt, player, events);
        break;
      case 'presence':
        this.presence(dt, player, events);
        break;
      case 'chase':
        this.chase(dt, player, events);
        break;
      case 'cornered':
        this.fish?.leave(dt);
        if (this.stageTime >= this.stageLength) this.release(events);
        break;
      case 'release':
        this.leave(dt, events);
        break;
    }
    return events;
  }

  /** What the feelings of a shrimp at (x, y) need to know. Null when nothing is on. */
  view(x: number, y: number, isPlayer: boolean): ThreatView | null {
    if (this.stage === 'idle') return null;
    const present =
      this.stage === 'presence' || this.stage === 'chase' || this.stage === 'cornered';
    const middle = this.predator;
    const distance = Math.hypot(x - middle.x, y - middle.y);
    const near = this.fish
      ? present && distance <= (this.fishTuning?.sight ?? 0) * this.world.bl
      : present && this.legs?.anyDown === true && distance <= this.bird.sight * this.world.bl;
    return {
      stage: this.stage,
      inSight: near,
      within8: near,
      afterMe: isPlayer && this.stage === 'chase',
    };
  }

  /**
   * The stimuli due to a shrimp at (x, y) on this step: the shadow passing
   * close, the predator coming into sight, a strike missing nearby. Each
   * shrimp feels each of them once.
   */
  felt(id: string, x: number, y: number): StimulusKind[] {
    const out: StimulusKind[] = [];
    const bl = this.world.bl;
    const fish = this.fish ? this.fishTuning : undefined;
    const reach = {
      shadow: fish?.shadowReach ?? this.bird.shadowReach,
      sight: fish?.sight ?? this.bird.sight,
      miss: fish?.missReach ?? this.bird.missReach,
    };
    if (
      this.stage === 'cue' &&
      !this.shadowFelt.has(id) &&
      Math.hypot(x - this.shadow.x, y - this.shadow.y) <= reach.shadow * bl
    ) {
      this.shadowFelt.add(id);
      out.push('shadow');
    }
    const searching = this.stage === 'presence' || this.stage === 'chase';
    const there = this.fish !== null || this.legs?.anyDown === true;
    if (searching && there && !this.seen.has(id)) {
      const middle = this.predator;
      if (Math.hypot(x - middle.x, y - middle.y) <= reach.sight * bl) {
        this.seen.add(id);
        out.push('predatorSeen');
      }
    }
    if (this.miss && this.missSeen.get(id) !== this.miss.seq) {
      this.missSeen.set(id, this.miss.seq);
      if (Math.hypot(x - this.miss.x, y - this.miss.y) <= reach.miss * bl) {
        out.push('missNearby');
      }
    }
    return out;
  }

  /** What the browser test and the debug view can see. */
  get snapshot() {
    return {
      stage: this.stage,
      kind: this.kind,
      notice: this.notice,
      strikes: this.strikes,
      ring: this.ring ? { x: this.ring.x, y: this.ring.y } : null,
      predator: this.stage === 'idle' ? null : this.predator,
      fish: this.fish
        ? {
            x: this.fish.x,
            y: this.fish.y,
            heading: this.fish.heading,
            phase: this.fish.phase,
            charges: this.fish.charges,
          }
        : null,
    };
  }

  private idle(player: ThreatPlayer, events: ThreatEvent[]): void {
    const queued = this.queued;
    const allowed = !player.soft;
    if (queued && allowed && (queued.force || this.time - this.lastRelease >= this.tuning.gap)) {
      this.queued = null;
      this.begin(queued, player, events);
      return;
    }
    if (this.time < this.nextRoll) return;
    this.nextRoll = this.time + this.tuning.roll;
    const kind = this.options.kinds[0];
    if (
      kind === undefined ||
      !allowed ||
      this.ambientLeft <= 0 ||
      this.time - this.lastRelease < this.tuning.gap ||
      player.coverGap > this.tuning.coverWithin
    ) {
      return;
    }
    if (this.random() < (this.tuning.roll / this.tuning.meanWait) * this.ambientFactor) {
      this.ambientLeft -= 1;
      this.begin({ kind, first: false, from: null, force: false }, player, events);
    }
  }

  private begin(request: Request, player: ThreatPlayer, events: ThreatEvent[]): void {
    this.kind = request.kind;
    this.first = request.first;
    this.notice = 0;
    this.strikes = 0;
    this.lastStrike = -Infinity;
    this.hiddenFor = 0;
    this.moved = false;
    this.cornered = false;
    this.ring = null;
    this.legs = null;
    this.shadowFelt.clear();
    this.seen.clear();
    this.miss = null;
    this.missSeen.clear();
    this.fish = null;
    const from = request.from ?? this.random() * Math.PI * 2;
    if (request.kind === 'fish' && this.fishTuning) {
      // The fish comes in from the edge of the view toward the shoal it will circle.
      const way = this.random() < 0.5 ? 1 : -1;
      this.fish = new HuntingFish(this.fishTuning, this.world.bl, centreOf(player), from, way);
      this.enter('cue', this.between(this.tuning.cue), events);
      this.followFish();
      return;
    }
    // The shadow comes from one side, slides over the player, and goes on.
    const way = from + Math.PI;
    const offset = (this.random() * 2 - 1) * this.bird.pass * this.world.bl;
    this.path = { x: player.x, y: player.y, way, offset };
    this.shadow.heading = way;
    this.enter('cue', this.between(this.tuning.cue), events);
    this.placeShadow();
    this.headAim = way;
  }

  /** The shadow on its line, crossing the player `crossBeforeEnd` seconds before the cue ends. */
  private placeShadow(): void {
    const { x, y, way, offset } = this.path;
    const cross = this.stageLength - this.bird.crossBeforeEnd;
    const along = this.bird.shadowSpeed * this.world.bl * (this.stageTime - cross);
    this.shadow.x = x - Math.sin(way) * offset + Math.cos(way) * along;
    this.shadow.y = y + Math.cos(way) * offset + Math.sin(way) * along;
  }

  private cue(dt: number, player: ThreatPlayer, events: ThreatEvent[]): void {
    if (this.fish) {
      this.fish.arrive(dt, centreOf(player));
      this.followFish();
      if (this.stageTime >= this.stageLength) {
        this.enter('presence', this.between(this.tuning.presence), events);
      }
      return;
    }
    if (this.stageTime < this.stageLength) {
      this.placeShadow();
      this.headAim = this.shadow.heading;
      return;
    }
    // It lands level with the player, on the side its shadow went, facing it.
    // Level, its feet stay in the view, which is wider than it is tall.
    const prefer = this.shadow.x >= player.x ? 0 : Math.PI;
    const stand = standPoint(player, prefer, this.world, this.bird);
    const heading = Math.atan2(player.y - stand.y, player.x - stand.x);
    this.legs = new Legs(this.bird, this.world.bl, stand, heading);
    this.enter('presence', this.between(this.tuning.presence), events);
    events.push(...this.legs.arrive());
  }

  private presence(dt: number, player: ThreatPlayer, events: ThreatEvent[]): void {
    if (this.fish && this.fishTuning) {
      // It circles. Shrimp that are burrowed, hidden or still are not seen.
      this.fish.circle(dt, centreOf(player));
      this.followFish();
      if (player.mode !== 'rest' || player.darted) this.moved = true;
      const distance = Math.hypot(player.x - this.fish.x, player.y - this.fish.y);
      const change = this.noticeChange(dt, player, distance, this.fishTuning.range);
      this.notice = Math.max(0, Math.min(1, this.notice + change));
      if (this.notice >= 1 && !this.gentle) {
        this.fish.hunt();
        this.enter('chase', this.tuning.chase, events);
      } else if (this.stageTime >= this.stageLength) {
        this.release(events);
      }
      return;
    }
    const legs = this.legs;
    if (!legs) return;
    events.push(...legs.step(dt));
    this.follow(dt);
    if (player.mode !== 'rest' || player.darted) this.moved = true;
    const middle = legs.middle;
    const distance = Math.hypot(player.x - middle.x, player.y - middle.y);
    const range = this.bird.range * this.world.bl;
    // The head's shadow drifts toward whatever moves; with nothing moving, it sways.
    const moving = player.mode !== 'rest' && !player.hidden;
    const aim =
      moving && distance <= range
        ? Math.atan2(player.y - middle.y, player.x - middle.x)
        : legs.heading + 0.6 * Math.sin(this.time * 0.5);
    this.headAim = rotateToward(this.headAim, aim, this.bird.headTurn * dt);
    const change = this.noticeChange(dt, player, distance, this.bird.range);
    this.notice = Math.max(0, Math.min(1, this.notice + change));
    if (this.notice >= 1 && !this.gentle) {
      this.enter('chase', this.tuning.chase, events);
    } else if (this.stageTime >= this.stageLength) {
      this.release(events);
    }
  }

  /** How much notice changes on this step (doc 10, "Being noticed"). */
  private noticeChange(
    dt: number,
    player: ThreatPlayer,
    distance: number,
    rangeBl: number,
  ): number {
    const n = this.tuning.notice;
    if (player.hidden) return n.hidden * dt;
    const range = rangeBl * this.world.bl;
    if (distance > range) return 0;
    let gain = 0;
    if (player.mode === 'walk') gain = n.walk * dt;
    else if (player.mode === 'swim' || player.mode === 'dart' || player.mode === 'glide') {
      gain = n.swim * dt;
    }
    if (player.darted) gain += n.flip;
    if (gain === 0) return n.still * dt;
    if (distance > range / 2) gain *= n.far;
    if (this.first) gain *= n.first;
    return gain;
  }

  private chase(dt: number, player: ThreatPlayer, events: ThreatEvent[]): void {
    if (this.fish) {
      this.chaseFish(dt, this.fish, player, events);
      return;
    }
    const legs = this.legs;
    if (!legs) return;
    const bl = this.world.bl;
    const b = this.bird;
    events.push(...legs.step(dt));
    this.follow(dt);
    if (player.mode !== 'rest' || player.darted) this.moved = true;
    this.hiddenFor = player.hidden ? this.hiddenFor + dt : 0;
    const middle = legs.middle;
    const ring = this.ring;
    if (ring) {
      ring.t += dt;
      this.headAim = rotateToward(
        this.headAim,
        Math.atan2(ring.y - middle.y, ring.x - middle.x),
        b.headTurn * 2 * dt,
      );
      if (ring.t < ring.warn) return;
      const hit = strikeLands(ring, player, player.underCover || player.hidden, bl, b);
      events.push({ type: 'strike', x: ring.x, y: ring.y, hit });
      this.strikes += 1;
      this.lastStrike = this.time;
      this.ring = null;
      if (hit) {
        this.cornered = true;
        this.enter('cornered', this.tuning.cornered, events);
        return;
      }
      this.miss = { seq: (this.miss?.seq ?? 0) + 1, x: ring.x, y: ring.y };
      if (this.strikes >= b.strikes) this.release(events);
      return;
    }
    this.headAim = rotateToward(
      this.headAim,
      Math.atan2(player.y - middle.y, player.x - middle.x),
      b.headTurn * dt,
    );
    const distance = Math.hypot(player.x - middle.x, player.y - middle.y);
    if (
      this.hiddenFor >= b.giveUp.hidden ||
      distance > b.giveUp.far * bl ||
      this.stageTime >= Math.min(this.stageLength, b.giveUp.seconds)
    ) {
      this.release(events);
      return;
    }
    if (player.hidden || player.underCover) return;
    const warn = this.rungBefore ? b.ring.warn : b.ring.firstWarn;
    if (this.time - this.lastStrike < b.strikeGap - warn) return;
    const aim = aimPoint(player, { x: player.vx, y: player.vy }, this.strikes === 0, this.world, b);
    if (Math.hypot(aim.x - middle.x, aim.y - middle.y) <= b.reach * bl) {
      if (legs.moving) return;
      this.ring = { x: aim.x, y: aim.y, warn, t: 0 };
      this.rungBefore = true;
      events.push({ type: 'ring', x: aim.x, y: aim.y, warn });
    } else {
      legs.stepToward(aim);
    }
  }

  /**
   * Face, pause, charge, recover, and again (doc 10, "The hunting fish").
   * It gives up, between charges, once the player has hidden for 2 s or
   * after 12 s, and after a recovery with the player 8 BL away or the third
   * charge made.
   */
  private chaseFish(
    dt: number,
    fish: HuntingFish,
    player: ThreatPlayer,
    events: ThreatEvent[],
  ): void {
    const t = this.fishTuning;
    if (!t) return;
    const bl = this.world.bl;
    if (player.mode !== 'rest' || player.darted) this.moved = true;
    this.hiddenFor = player.hidden ? this.hiddenFor + dt : 0;
    if (
      fish.phase !== 'charge' &&
      (this.hiddenFor >= t.giveUp.hidden ||
        this.stageTime >= Math.min(this.stageLength, t.giveUp.seconds))
    ) {
      this.release(events);
      return;
    }
    const prey = {
      x: player.x,
      y: player.y,
      safe: player.hidden || player.underCover,
      sinceFlip: player.sinceFlip ?? Infinity,
    };
    for (const event of fish.chase(dt, prey, this.world.covers, this.world.bounds)) {
      if (event.type === 'faced' || event.type === 'charge') {
        events.push(event);
      } else if (event.type === 'passed') {
        this.strikes = fish.charges;
        this.lastStrike = this.time;
        events.push({ type: 'strike', x: event.x, y: event.y, hit: event.hit });
        if (event.sidestep) events.push({ type: 'sidestep' });
        if (event.hit) {
          this.cornered = true;
          fish.goAway(player);
          this.followFish();
          this.enter('cornered', this.tuning.cornered, events);
          return;
        }
        this.miss = { seq: (this.miss?.seq ?? 0) + 1, x: event.x, y: event.y };
      } else {
        const far = Math.hypot(player.x - fish.x, player.y - fish.y) > t.giveUp.far * bl;
        if (fish.charges >= t.charges || far) {
          this.followFish();
          this.release(events);
          return;
        }
      }
    }
    this.followFish();
  }

  /** The shadow and the head's aim, for whatever draws the threat, follow the fish. */
  private followFish(): void {
    const fish = this.fish;
    if (!fish) return;
    this.shadow.x = fish.x;
    this.shadow.y = fish.y;
    this.shadow.heading = fish.heading;
    this.headAim = fish.heading;
  }

  /** The shadow keeps over the feet, a little behind them, turning as they turn. */
  private follow(dt: number): void {
    const legs = this.legs;
    if (!legs) return;
    const middle = legs.middle;
    const back = 0.6 * this.world.bl;
    const goalX = middle.x - Math.cos(legs.heading) * back;
    const goalY = middle.y - Math.sin(legs.heading) * back;
    const dx = goalX - this.shadow.x;
    const dy = goalY - this.shadow.y;
    const distance = Math.hypot(dx, dy);
    const most = this.bird.shadowSpeed * this.world.bl * dt;
    if (distance <= most) {
      this.shadow.x = goalX;
      this.shadow.y = goalY;
    } else {
      this.shadow.x += (dx / distance) * most;
      this.shadow.y += (dy / distance) * most;
    }
    this.shadow.heading = rotateToward(this.shadow.heading, legs.heading, 1.5 * dt);
  }

  private release(events: ThreatEvent[]): void {
    const kind = this.kind ?? 'bird';
    if (!this.cornered) {
      events.push({ type: 'escaped', kind, clean: this.strikes === 0, still: !this.moved });
    }
    this.ring = null;
    this.enter('release', this.between(this.tuning.release), events);
    if (this.fish && this.fish.phase !== 'leave') this.fish.goAway(this.lastPlayer);
    const legs = this.legs;
    if (legs) events.push(...legs.lift());
    this.leaving = this.shadow.heading;
  }

  private leave(dt: number, events: ThreatEvent[]): void {
    if (this.fish) {
      this.fish.leave(dt);
      this.followFish();
    }
    const legs = this.legs;
    if (legs) {
      events.push(...legs.step(dt));
      if (this.stageTime >= this.bird.liftGap && legs.anyDown) events.push(...legs.lift());
    }
    // Once both feet are up, the shadow slides away the way it faces.
    if (!this.fish && !legs?.anyDown) {
      const speed = this.bird.shadowSpeed * this.world.bl * dt;
      this.shadow.x += Math.cos(this.leaving) * speed;
      this.shadow.y += Math.sin(this.leaving) * speed;
      this.headAim = rotateToward(this.headAim, this.leaving, this.bird.headTurn * dt);
    }
    if (this.stageTime < this.stageLength) return;
    const kind = this.kind ?? 'bird';
    this.stage = 'idle';
    this.stageTime = 0;
    this.legs = null;
    this.fish = null;
    this.lastRelease = this.time;
    this.nextRoll = Math.max(this.nextRoll, this.time + this.tuning.gap);
    this.kind = null;
    events.push({ type: 'stage', kind, stage: 'idle' });
  }

  private enter(stage: DirectorStage, length: number, events: ThreatEvent[]): void {
    this.stage = stage;
    this.stageTime = 0;
    this.stageLength = length;
    events.push({ type: 'stage', kind: this.kind ?? 'bird', stage });
  }

  private between(span: Span): number {
    return span.min + this.random() * (span.max - span.min);
  }
}

/** What the fish circles: the shoal close by, or the player. */
function centreOf(player: ThreatPlayer): Point {
  return player.shoal ?? { x: player.x, y: player.y };
}
