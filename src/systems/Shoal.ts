import type Phaser from 'phaser';
import { STAGE_LOOKS, type RigLook } from '../art/expressions';
import type { ActivityName, OtherShrimp } from '../core/activity/Activity';
import { Bonds, type BondChange } from '../core/bonds/Bonds';
import type { EventBus } from '../core/events';
import type { FoodPatch } from '../core/food/FoodPatch';
import type { BondStage, DayPhase, StimulusKind, ThreatView } from '../core/feelings/types';
import type { GameEvents } from '../core/gameEvents';
import { moveCircle, type Bounds, type Obstacle, type Point } from '../core/movement/collision';
import type { MotionMode } from '../core/movement/ShrimpMotion';
import { AlarmNet, type Alarm } from '../core/npc/alarm';
import { NpcMind, type SeenShrimp } from '../core/npc/NpcMind';
import type { LossCandidate } from '../core/npc/losses';
import type { ShoalMember } from '../core/npc/shoal';
import { seededRandom, seedOf } from '../core/random';
import type { ShrimpSource } from '../core/scent/ribbons';
import type { LifeStage } from '../core/world/kinds';
import type { AreaDef, ShrimpSpawnDef } from '../data/areas/types';
import { COMPANIONS, UNNAMED, type ShrimpKind } from '../data/shrimp';
import { ALARM, BOND, COMPANY, GREET, LOSSES, MOTION, NPC, SHOAL, STEER } from '../data/tuning';
import { NpcShrimp } from '../entities/NpcShrimp';
import type { CoverHandle } from './AreaLoader';

/** A threat, as the other shrimp feel it (step 7). */
export interface ShoalThreat {
  /** A cue is under way: they freeze. */
  readonly cue: boolean;
  /** Where the danger is, to flee from. */
  readonly danger: Point;
  view(x: number, y: number, isPlayer: boolean): ThreatView | null;
  felt(id: string, x: number, y: number): StimulusKind[];
}

/** The player, as the other shrimp need to know it on each step. */
export interface PlayerView {
  x: number;
  y: number;
  heading: number;
  mode: MotionMode;
  activity: ActivityName;
  /** Tucked in under this cover, or null. */
  under: CoverHandle | null;
  /** Grazing with the mouth on the food. */
  eating: boolean;
}

export interface ShoalOptions {
  area: AreaDef;
  stage: LifeStage;
  /** The player's body length here. Other shrimp are sized from it. */
  bodyLengthPx: number;
  obstacles: readonly Obstacle[];
  bounds: Bounds;
  covers: readonly CoverHandle[];
  foods: readonly FoodPatch[];
  bonds: Bonds;
  bus: EventBus<GameEvents>;
  depth: number;
  /** From chapter 2 the shrimp keep together as a shoal. */
  together: boolean;
  /** How many unnamed shrimp have gone missing here before (D42). They are not there. */
  missing?: number;
}

/** What the browser test can ask about one other shrimp. */
export interface ShrimpSnapshot {
  id: string;
  x: number;
  y: number;
  behaviour: string;
  activity: string;
  mood: string;
  fear: number;
  bond: number;
  stage: BondStage;
}

const PLAYER = 'player';

/** A temperament, size and look for an unnamed shrimp, from its own seed. */
function unnamed(area: string, def: ShrimpSpawnDef): ShrimpKind {
  const random = seededRandom(seedOf(`${area}:${def.id}`));
  const between = (range: { min: number; max: number }) =>
    range.min + (range.max - range.min) * random();
  const shade = 1 - UNNAMED.tint * random();
  const warm = 1 - UNNAMED.tint * 0.5 * random();
  const channel = (amount: number) => Math.round(255 * amount);
  return {
    temperament: {
      boldness: between(UNNAMED.temperament),
      sociability: between(UNNAMED.temperament),
      activity: between(UNNAMED.temperament),
    },
    favourite: UNNAMED.favourites[Math.floor(random() * UNNAMED.favourites.length)] ?? 'algaeFilm',
    size: between(UNNAMED.size),
    look: {
      tint: (channel(shade) << 16) | (channel(shade * warm) << 8) | channel(shade * warm * warm),
    },
  };
}

/**
 * Every other shrimp in the area: their minds, bodies and drawing, the
 * player's bonds with them, and the fright that passes between them. See
 * docs/10-feelings-and-states.md, "Other shrimp".
 */
export class Shoal {
  readonly members: NpcShrimp[] = [];
  private readonly alarm: AlarmNet;
  private readonly movers = new Map<
    NpcShrimp,
    (x: number, y: number, dx: number, dy: number) => { x: number; y: number }
  >();
  /** Until when companions answer the player's call. */
  private calledUntil = -Infinity;
  private player: PlayerView | null = null;
  /** Alarms that reached the player, for the scene to give to its feelings. */
  private forPlayer: Alarm[] = [];
  private time = 0;
  private threat: ShoalThreat | null = null;
  /** The time of day, where the place has one. By day in the lagoon the shoal rests in the sand. */
  dayPhase: DayPhase | null = null;
  /** The shrimp that took fright during the threat under way (doc 02, bonds). */
  private frightened = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    private readonly options: ShoalOptions,
  ) {
    const { area, bodyLengthPx: bl } = options;
    this.alarm = new AlarmNet(ALARM, bl, seededRandom(seedOf(`${area.id}:alarm`)));
    // Those gone missing before are the last unnamed ones, down to the floor.
    const all = area.shrimp ?? [];
    const unnamedIds = all.filter((def) => def.who === 'young').map((def) => def.id);
    const gone = new Set(
      unnamedIds.slice(
        unnamedIds.length - Math.min(options.missing ?? 0, unnamedIds.length - LOSSES.floor),
      ),
    );
    const defs = all.filter((def) => !gone.has(def.id));
    defs.forEach((def, index) => {
      const named = def.who !== 'young';
      const kind = def.who === 'young' ? unnamed(area.id, def) : COMPANIONS[def.who];
      const size = bl * kind.size;
      const random = seededRandom(seedOf(`${area.id}:${def.id}:mind`));
      const antenna =
        def.who === 'young'
          ? UNNAMED.antenna.min + (UNNAMED.antenna.max - UNNAMED.antenna.min) * random()
          : 1;
      const stageLook = STAGE_LOOKS[options.stage];
      const look: Partial<RigLook> = {
        ...stageLook,
        ...kind.look,
        antennaLength: (stageLook.antennaLength ?? 1) * antenna,
      };
      const mind = new NpcMind(
        {
          id: def.id,
          temperament: kind.temperament,
          bodyLengthPx: size,
          radiusPx: MOTION.radius * size,
          home: { x: def.x, y: def.y },
          obstacles: options.obstacles,
          bounds: options.bounds,
          random,
          firstChoice: (index / Math.max(1, defs.length)) * NPC.decideEvery,
        },
        {
          npc: NPC,
          steer: STEER,
          shoal: SHOAL,
          greetReach: GREET.reach,
          dartEvery: MOTION.dartTime + MOTION.glideTime,
        },
      );
      const hunger = NPC.hunger.min + (NPC.hunger.max - NPC.hunger.min) * random();
      const npc = new NpcShrimp(
        scene,
        def.id,
        named,
        mind,
        size,
        { x: def.x, y: def.y, heading: def.heading ?? 0 },
        look,
        hunger,
        options.depth,
        area.sand ? area.ground : null,
      );
      this.members.push(npc);
      this.movers.set(npc, (x, y, dx, dy) =>
        moveCircle(x, y, dx, dy, npc.motion.radiusPx, options.obstacles, options.bounds),
      );
    });
  }

  /** The bond's stage with a shrimp, for company and for how it treats the player. */
  stage(id: string): BondStage {
    return this.options.bonds.stage(id);
  }

  /** One step of every other shrimp, in the game's one loop (doc 15, "One clock"). */
  step(dt: number, time: number, player: PlayerView): void {
    this.time = time;
    this.player = player;
    for (const alarm of this.alarm.due(time)) this.deliver(alarm);
    const playerSeen = this.seenPlayer(player);
    for (const npc of this.members) {
      npc.owed += dt;
      const far = this.isFar(npc, player);
      if (far && npc.owed < NPC.farStep) continue;
      // A shrimp far away steps in one go, cut into pieces the motion can take.
      let left = npc.owed;
      npc.owed = 0;
      while (left > 1e-6) {
        const piece = Math.min(left, far ? 0.1 : dt);
        this.stepOne(npc, piece, time, player, playerSeen);
        left -= piece;
      }
    }
    this.keepApart(player);
    this.gainBonds(dt, time, player);
  }

  /**
   * Bodies do not pass through each other: two shrimp closer than `apart`
   * BL are pushed apart, half each. The player is never pushed; the other
   * shrimp gives way.
   */
  private keepApart(player: PlayerView): void {
    const members = this.members;
    const nudge = (npc: NpcShrimp, dx: number, dy: number) => {
      const mover = this.movers.get(npc);
      const to = mover ? mover(npc.x, npc.y, dx, dy) : { x: npc.x + dx, y: npc.y + dy };
      npc.motion.x = to.x;
      npc.motion.y = to.y;
    };
    for (let i = 0; i < members.length; i++) {
      const a = members[i] as NpcShrimp;
      const fromPlayer = this.overlap(a.x, a.y, player.x, player.y, a.bodyLengthPx);
      if (fromPlayer) nudge(a, fromPlayer.x, fromPlayer.y);
      for (let j = i + 1; j < members.length; j++) {
        const b = members[j] as NpcShrimp;
        const push = this.overlap(a.x, a.y, b.x, b.y, (a.bodyLengthPx + b.bodyLengthPx) / 2);
        if (!push) continue;
        nudge(a, push.x / 2, push.y / 2);
        nudge(b, -push.x / 2, -push.y / 2);
      }
    }
  }

  /** How far to move the first point so it is `NPC.apart` BL from the second, or null. */
  private overlap(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    bl: number,
  ): { x: number; y: number } | null {
    const dx = ax - bx;
    const dy = ay - by;
    const distance = Math.hypot(dx, dy);
    const apart = NPC.apart * bl;
    if (distance >= apart) return null;
    if (distance < 1e-6) return { x: apart, y: 0 };
    const share = (apart - distance) / distance;
    return { x: dx * share, y: dy * share };
  }

  private stepOne(
    npc: NpcShrimp,
    dt: number,
    time: number,
    player: PlayerView,
    playerSeen: SeenShrimp,
  ): void {
    const threat = this.threat;
    if (threat) {
      for (const kind of threat.felt(npc.id, npc.x, npc.y)) {
        npc.feelings.stimulus(kind);
        npc.mind.startled(time, threat.danger.x, threat.danger.y);
      }
    }
    const others: SeenShrimp[] = [{ ...playerSeen, stage: this.stage(npc.id) }];
    for (const other of this.members) {
      if (other === npc) continue;
      others.push({
        id: other.id,
        x: other.x,
        y: other.y,
        heading: other.motion.heading,
        mode: other.motion.mode,
        player: false,
        stage: 'familiar',
        busy: other.activity.name !== 'free' && other.activity.name !== 'greeting',
      });
    }
    const values = npc.feelings.values;
    const result = npc.step(
      dt,
      {
        time,
        x: npc.x,
        y: npc.y,
        heading: npc.motion.heading,
        mode: npc.motion.mode,
        feelings: values,
        mood: npc.feelings.mood,
        wary: npc.feelings.has('wary'),
        activity: npc.activity.name,
        tucked: npc.activity.tucked,
        covers: this.options.covers,
        foods: this.options.foods,
        others,
        cue: this.threat?.cue ?? false,
        called:
          time < this.calledUntil && this.options.bonds.value(npc.id) >= BOND.stages.companion,
        shoal: this.options.together ? this.shoalMembers() : null,
        lagoonDay: this.dayPhase === 'day' && this.options.area.sand === true,
      },
      this.options.covers,
      this.options.foods,
      others,
      this.movers.get(npc) ?? ((x, y) => ({ x, y })),
      {
        neighbours: this.neighboursOf(npc, others),
        companionWithin2:
          this.options.bonds.value(npc.id) >= BOND.stages.companion &&
          Math.hypot(player.x - npc.x, player.y - npc.y) <= 2 * npc.bodyLengthPx,
        restingAgainstClose: false,
        curiosityPull: 0,
        threat: this.threat?.view(npc.x, npc.y, false) ?? null,
        inCurrent: false,
        dayPhase: null,
      },
    );
    if (npc.feelings.mood === 'afraid') this.frightened.add(npc.id);
    if (result.mood?.to === 'afraid' || (result.darted && npc.mind.behaviour === 'flee')) {
      this.alarm.raise(npc.id, npc.x, npc.y, time, this.everyone());
    }
    if (result.greeted) this.greetingDone(npc, result.greeted, time);
  }

  /** The threats of the place, for the other shrimp to feel. */
  watch(threat: ShoalThreat): void {
    this.threat = threat;
  }

  /**
   * A threat's cue has begun. Nacre notices it before anyone else (doc 10,
   * "Alarm"): she takes fright from where she is. Returns whether the player
   * feels it too, which needs her to be a Companion within 5 BL.
   */
  cueNoticed(time: number, x: number, y: number): boolean {
    this.frightened.clear();
    const nacre = this.members.find((one) => one.id === 'nacre');
    if (!nacre) return false;
    const bl = this.options.bodyLengthPx;
    nacre.feelings.stimulus('alarm');
    const danger = this.threat?.danger ?? { x, y };
    nacre.mind.alarmed(time, danger.x, danger.y);
    return (
      this.options.bonds.value(nacre.id) >= BOND.stages.companion &&
      Math.hypot(nacre.x - x, nacre.y - y) <= ALARM.reach * bl
    );
  }

  /**
   * The threat left and the player got away. Each shrimp that took fright
   * during it and is now within the company radius of the player shares the
   * escape: +0.10 (doc 02, "Bonds"). Returns the companions among them,
   * for the journal's memory.
   */
  escapedTogether(x: number, y: number): string[] {
    const reach = COMPANY.radius * this.options.bodyLengthPx;
    const named: string[] = [];
    for (const npc of this.members) {
      if (!this.frightened.has(npc.id)) continue;
      if (Math.hypot(npc.x - x, npc.y - y) > reach) continue;
      this.report(this.options.bonds.add(npc.id, BOND.flee));
      if (npc.named) named.push(npc.id);
    }
    this.frightened.clear();
    return named;
  }

  /** The companions within the company radius of a point. */
  companionsNear(x: number, y: number): string[] {
    const reach = COMPANY.radius * this.options.bodyLengthPx;
    return this.members
      .filter((npc) => npc.named && Math.hypot(npc.x - x, npc.y - y) <= reach)
      .map((npc) => npc.id);
  }

  /** The player took fright: the shrimp around feel it a moment later. */
  playerAfraid(time: number, x: number, y: number): void {
    this.alarm.raise(PLAYER, x, y, time, this.everyone());
  }

  /**
   * A tail flip startles any Stranger within 1.5 BL. Others have learned it
   * is harmless. Returns whether it startled one.
   */
  playerFlipped(time: number, x: number, y: number): boolean {
    let startled = false;
    for (const npc of this.members) {
      if (this.stage(npc.id) !== 'stranger') continue;
      if (Math.hypot(npc.x - x, npc.y - y) > NPC.startleReach * this.options.bodyLengthPx) continue;
      npc.feelings.stimulus('startle');
      npc.mind.startled(time, x, y);
      startled = true;
    }
    return startled;
  }

  /** The player's greeting with `id` is done. A shrimp that knows the player greets back. */
  playerGreeted(time: number, id: string): void {
    const npc = this.members.find((one) => one.id === id);
    if (!npc) return;
    this.options.bus.emit('greeting', { a: PLAYER, b: id });
    this.report(this.options.bonds.greet(id, time, npc.named));
    if (this.stage(id) !== 'stranger' && npc.mind.canGreet(time)) npc.mind.greetBack(time, PLAYER);
  }

  /** The player calls: companions within 14 BL start to come, for 20 s. */
  playerCalled(time: number): void {
    this.calledUntil = time + NPC.follow.seconds;
    const player = this.player;
    for (const npc of this.members) {
      if (this.options.bonds.value(npc.id) < BOND.stages.companion) continue;
      if (
        player &&
        Math.hypot(npc.x - player.x, npc.y - player.y) > GREET.callReach * this.options.bodyLengthPx
      )
        continue;
      npc.mind.hearCall(time);
    }
  }

  /** The alarms that reached the player since the last call. */
  takeAlarms(): Alarm[] {
    const alarms = this.forPlayer;
    this.forPlayer = [];
    return alarms;
  }

  /** Bond stages of every shrimp within the company radius of a point (doc 10, "Company"). */
  neighbours(x: number, y: number): BondStage[] {
    const reach = COMPANY.radius * this.options.bodyLengthPx;
    return this.members
      .filter((npc) => Math.hypot(npc.x - x, npc.y - y) <= reach)
      .map((npc) => this.stage(npc.id));
  }

  /** A shrimp with a bond of Companion or more within 2 BL. */
  companionNear(x: number, y: number): boolean {
    const reach = 2 * this.options.bodyLengthPx;
    return this.members.some(
      (npc) =>
        this.options.bonds.value(npc.id) >= BOND.stages.companion &&
        Math.hypot(npc.x - x, npc.y - y) <= reach,
    );
  }

  /** Whether any shrimp has become a companion: calling then means something. */
  get anyCompanion(): boolean {
    return this.members.some((npc) => this.options.bonds.value(npc.id) >= BOND.stages.companion);
  }

  /** How many other shrimp are within `reach` px of a point. */
  near(x: number, y: number, reach: number): number {
    return this.members.filter((npc) => Math.hypot(npc.x - x, npc.y - y) <= reach).length;
  }

  /** The middle of the other shrimp within `reach` px of a point, if two or more are there. */
  middleNear(x: number, y: number, reach: number): { x: number; y: number } | null {
    const close = this.members.filter((npc) => Math.hypot(npc.x - x, npc.y - y) <= reach);
    if (close.length < 2) return null;
    let sx = 0;
    let sy = 0;
    for (const npc of close) {
      sx += npc.x;
      sy += npc.y;
    }
    return { x: sx / close.length, y: sy / close.length };
  }

  /** Another shrimp tucked under cover within `reach` px, for "Side by side". */
  hiddenNear(x: number, y: number, reach: number): boolean {
    return this.members.some(
      (npc) => npc.activity.tucked && Math.hypot(npc.x - x, npc.y - y) <= reach,
    );
  }

  /** Every other shrimp, as the player's Greet needs them. */
  get greetable(): OtherShrimp[] {
    return this.members.map((npc) => ({ id: npc.id, x: npc.x, y: npc.y }));
  }

  /** Where another shrimp is, for the player's antennae while greeting. */
  where(id: string): { x: number; y: number } | null {
    const npc = this.members.find((one) => one.id === id);
    return npc ? { x: npc.x, y: npc.y } : null;
  }

  /** The scent of every other shrimp, for the ribbons. */
  get sources(): ShrimpSource[] {
    return this.members.map((npc) => ({
      id: npc.id,
      x: npc.x,
      y: npc.y,
      companion: this.options.bonds.value(npc.id) >= BOND.stages.companion,
    }));
  }

  /** Draws each shrimp in view. `lift` brightens them while the player is social. */
  draw(dt: number, view: Phaser.Geom.Rectangle, lift: number): void {
    const margin = NPC.awake * this.options.bodyLengthPx;
    for (const npc of this.members) {
      const visible =
        npc.x > view.x - margin &&
        npc.x < view.right + margin &&
        npc.y > view.y - margin &&
        npc.y < view.bottom + margin;
      const target =
        npc.activity.name === 'greeting'
          ? (this.where(npc.activity.with ?? '') ?? this.player)
          : null;
      npc.draw(dt, visible, lift, target);
    }
  }

  get snapshot(): ShrimpSnapshot[] {
    return this.members.map((npc) => ({
      id: npc.id,
      x: npc.x,
      y: npc.y,
      behaviour: npc.mind.behaviour,
      activity: npc.activity.name,
      mood: npc.feelings.mood,
      fear: npc.feelings.values.fear,
      bond: this.options.bonds.value(npc.id),
      stage: this.stage(npc.id),
    }));
  }

  /** Every shrimp of the shoal, for choosing who goes missing (D42). */
  lossCandidates(view: { contains(x: number, y: number): boolean }): LossCandidate[] {
    return this.members.map((npc) => ({
      id: npc.id,
      named: npc.named,
      x: npc.x,
      y: npc.y,
      // A little beyond the view's edge counts as in view: a body length might show.
      inView:
        view.contains(npc.x, npc.y) ||
        view.contains(npc.x + npc.bodyLengthPx, npc.y) ||
        view.contains(npc.x - npc.bodyLengthPx, npc.y) ||
        view.contains(npc.x, npc.y + npc.bodyLengthPx) ||
        view.contains(npc.x, npc.y - npc.bodyLengthPx),
    }));
  }

  /** These shrimp are gone, out of view, with no trace. */
  remove(ids: readonly string[]): void {
    for (const id of ids) {
      const index = this.members.findIndex((npc) => npc.id === id);
      const npc = this.members[index];
      if (!npc || npc.named) continue;
      this.members.splice(index, 1);
      this.movers.delete(npc);
      npc.destroy();
    }
  }

  /** How many of the shoal are here. */
  get count(): number {
    return this.members.length;
  }

  destroy(): void {
    for (const npc of this.members) npc.destroy();
    this.members.length = 0;
  }

  private deliver(alarm: Alarm): void {
    if (alarm.to === PLAYER) {
      this.forPlayer.push(alarm);
      return;
    }
    const npc = this.members.find((one) => one.id === alarm.to);
    if (!npc) return;
    npc.feelings.stimulus('alarm');
    npc.mind.alarmed(this.time, alarm.x, alarm.y);
  }

  private greetingDone(npc: NpcShrimp, with_: string, time: number): void {
    if (with_ === PLAYER) {
      this.options.bus.emit('greeting', { a: npc.id, b: PLAYER });
      this.report(this.options.bonds.greet(npc.id, time, npc.named));
      return;
    }
    this.options.bus.emit('greeting', { a: npc.id, b: with_ });
    this.members.find((one) => one.id === with_)?.mind.greeted(time);
  }

  /** Grazing side by side, and sharing cover, bring the bond on (doc 02, "Bonds"). */
  private gainBonds(dt: number, time: number, player: PlayerView): void {
    const reach = BOND.grazeReach * this.options.bodyLengthPx;
    for (const npc of this.members) {
      if (player.eating && npc.eating && Math.hypot(npc.x - player.x, npc.y - player.y) <= reach) {
        this.report(this.options.bonds.grazeNear(npc.id, dt));
      }
      const sharing =
        player.under !== null && npc.activity.tucked && npc.activity.cover === player.under;
      this.report(this.options.bonds.shareCover(npc.id, sharing, time));
    }
  }

  private report(change: BondChange | null): void {
    if (!change) return;
    this.options.bus.emit('bond:changed', {
      with: change.with,
      value: change.value,
      stage: change.stage,
    });
  }

  private seenPlayer(player: PlayerView): SeenShrimp {
    return {
      id: PLAYER,
      x: player.x,
      y: player.y,
      heading: player.heading,
      mode: player.mode,
      player: true,
      stage: 'stranger',
      busy: player.activity !== 'free',
    };
  }

  private neighboursOf(npc: NpcShrimp, others: readonly SeenShrimp[]): BondStage[] {
    const reach = COMPANY.radius * npc.bodyLengthPx;
    return others
      .filter((other) => Math.hypot(other.x - npc.x, other.y - npc.y) <= reach)
      .map((other) => (other.player ? this.stage(npc.id) : other.stage));
  }

  private everyone(): { id: string; x: number; y: number }[] {
    const all = this.members.map((npc) => ({ id: npc.id, x: npc.x, y: npc.y }));
    if (this.player) all.push({ id: PLAYER, x: this.player.x, y: this.player.y });
    return all;
  }

  private shoalMembers(): ShoalMember[] {
    return this.members.map((npc) => ({
      id: npc.id,
      x: npc.x,
      y: npc.y,
      heading: npc.motion.heading,
    }));
  }

  private isFar(npc: NpcShrimp, player: PlayerView): boolean {
    // About a screen and a half away: out of sight with room to spare.
    const reach = 14 * this.options.bodyLengthPx;
    return Math.hypot(npc.x - player.x, npc.y - player.y) > reach;
  }
}
