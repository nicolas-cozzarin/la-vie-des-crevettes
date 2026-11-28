import type Phaser from 'phaser';
import { STAGE_LOOKS, type RigLook } from '../art/expressions';
import type { ActivityName, OtherShrimp } from '../core/activity/Activity';
import { Bonds, type BondChange } from '../core/bonds/Bonds';
import type { EventBus } from '../core/events';
import type { FoodPatch } from '../core/food/FoodPatch';
import type { BondStage, DayPhase, StimulusKind, ThreatView } from '../core/feelings/types';
import type { GameEvents } from '../core/gameEvents';
import { moveCircle, type Bounds, type Obstacle, type Point } from '../core/movement/collision';
import { carried, currentAt, inCurrent } from '../core/movement/currents';
import type { MotionMode } from '../core/movement/ShrimpMotion';
import type { MoltEvent } from '../core/molt/Molt';
import { AlarmNet, type Alarm } from '../core/npc/alarm';
import { leadTo, sidestepNow, type Charge } from '../core/npc/close';
import { pickMolter, StayingClose } from '../core/npc/companionMolt';
import { along, pointBeyond, shoalGoal } from '../core/npc/journey';
import { NpcMind, type SeenShrimp } from '../core/npc/NpcMind';
import type { LossCandidate } from '../core/npc/losses';
import type { ShoalMember } from '../core/npc/shoal';
import { GateMoment, type GateMomentStage } from '../core/pond/moment';
import { seededRandom, seedOf } from '../core/random';
import type { ShrimpSource } from '../core/scent/ribbons';
import type { FoodKind, LifeStage } from '../core/world/kinds';
import type { AreaDef, ShrimpSpawnDef } from '../data/areas/types';
import { COMPANIONS, UNNAMED, type ShrimpKind } from '../data/shrimp';
import {
  ALARM,
  BOND,
  CLOSE,
  COMPANY,
  CURRENT,
  GREET,
  JOURNEY,
  LOSSES,
  MOTION,
  NPC,
  PASSING,
  POND,
  SHOAL,
  STEER,
} from '../data/tuning';
import { NpcShrimp } from '../entities/NpcShrimp';
import type { CoverHandle } from './AreaLoader';

/** A threat, as the other shrimp feel it (step 7). */
export interface ShoalThreat {
  /** A cue is under way: they freeze. */
  readonly cue: boolean;
  /** Where the danger is, to flee from. */
  readonly danger: Point;
  /** A fish charging now, for a companion to sidestep (T105). */
  readonly charging?: Charge | null;
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
  /** For a companion at Close to lead the player to food (T105). */
  hunger?: number;
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
  /** The companions who have led the player to food here before: once a chapter (T105). */
  led?: readonly string[];
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
  hunger: number;
  /** How it moves now: rest, walk, swim, dart or glide. */
  mode: string;
  bond: number;
  stage: BondStage;
  /** Where its molt is, or 'none'. */
  molt: string;
  /** Leading the player to its favourite food. */
  leading: boolean;
  /** A stranger passing through, not one of the shoal (T114). */
  traveller: boolean;
}

const PLAYER = 'player';

/** How the save knows every traveller: they pass, and none is kept by name (T114). */
const TRAVELLER = 'traveller';

/** A temperament, size and look for an unnamed shrimp, from its own seed. */
function unnamed(seed: string, def: ShrimpSpawnDef): ShrimpKind {
  const random = seededRandom(seedOf(`${seed}:${def.id}`));
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
  /** The player's own molt is under way: those at Close come and stay (doc 10). */
  playerMolting = false;
  /** Seconds into the night, and whether a companion has begun to molt this night (T104). */
  private nightFor = 0;
  private moltedTonight = false;
  /** The player near her through a companion's molt, and those the player stayed with. */
  private staying: { id: string; watch: StayingClose } | null = null;
  private stayedWith: string[] = [];
  /** Each one's favourite food, and those seen eating it from close by (doc 12, `c2.favourites`). */
  private readonly favourites = new Map<string, FoodKind>();
  private seenFavourite = new Set<string>();
  private favouriteNews: string[] = [];
  /** A Close companion leading the player to food, those who have here, and the news (T105). */
  private leading: { id: string; food: FoodPatch; since: number } | null = null;
  private readonly led: Set<string>;
  private ledNews: string[] = [];
  /** Seconds the player has kept still, for a Close companion to rest touching. */
  private stillFor = 0;
  /** Those who sidestepped the charge under way. */
  private readonly dodged = new Set<string>();
  /** Where the shoal makes for on its journey with the tide, or null where there is none (T113). */
  private goal: Point | null = null;
  /** Where the strangers passing through make for, beyond the shoal's (T114). */
  private travellersGoal: Point | null = null;
  /** Passing a pond's gate: Brise goes to the mesh, Nacre stops short (doc 18, "Level 3"; T118). */
  private readonly gate: GateMoment | null;

  constructor(
    scene: Phaser.Scene,
    private readonly options: ShoalOptions,
  ) {
    const { area, bodyLengthPx: bl } = options;
    this.led = new Set(options.led ?? []);
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
      this.members.push(this.make(scene, def, area.id, index / Math.max(1, defs.length), null));
    });
    const moment = POND.moment;
    this.gate = area.pond
      ? new GateMoment(area.pond.plume, area.pond.gate, {
          start: moment.start * bl,
          reach: moment.reach * bl,
          atMesh: { out: moment.out * bl, aside: moment.aside * bl },
          short: moment.short * bl,
          pull: moment.pull,
        })
      : null;
  }

  /** Where the shoal is in passing a pond's gate, or null where there is none. */
  get gateStage(): GateMomentStage | null {
    return this.gate?.stage ?? null;
  }

  /** The player's antennae touched the one behind the mesh. */
  pondGreeted(): void {
    this.gate?.greetedAtMesh();
  }

  /**
   * One other shrimp, made from its spawn. `seed` makes each unnamed one
   * itself. `firstChoice` spreads their first choices over the decision
   * time. A traveller may leave the area: its edge does not hold it (T114).
   */
  private make(
    scene: Phaser.Scene,
    def: ShrimpSpawnDef,
    seed: string,
    firstChoice: number,
    traveller: Bounds | null,
  ): NpcShrimp {
    const { options } = this;
    const { area, bodyLengthPx: bl } = options;
    const named = def.who !== 'young';
    const kind = def.who === 'young' ? unnamed(seed, def) : COMPANIONS[def.who];
    const size = bl * kind.size;
    if (!traveller) this.favourites.set(def.id, kind.favourite);
    const bounds = traveller ?? options.bounds;
    const random = seededRandom(seedOf(`${seed}:${def.id}:mind`));
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
        bounds,
        random,
        firstChoice: firstChoice * NPC.decideEvery,
      },
      {
        npc: NPC,
        steer: STEER,
        shoal: SHOAL,
        greetReach: GREET.reach,
        dartEvery: MOTION.dartTime + MOTION.glideTime,
        close: CLOSE,
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
    npc.traveller = traveller !== null;
    this.movers.set(npc, (x, y, dx, dy) =>
      moveCircle(x, y, dx, dy, npc.motion.radiusPx, options.obstacles, bounds),
    );
    return npc;
  }

  /**
   * A group of strangers comes in, at these places, facing downstream
   * (doc 11, `shrimp.traveller`; T114). Each group is new shrimp: `group`
   * makes them so. Returns their ids.
   */
  addTravellers(
    scene: Phaser.Scene,
    group: number,
    places: readonly Point[],
    heading: number,
  ): string[] {
    const { area, bounds, bodyLengthPx: bl } = this.options;
    // Far enough past the edge for a whole body to be out of sight.
    const margin = (PASSING.beyond + PASSING.spread * 2) * bl;
    const wide: Bounds = {
      x: bounds.x - margin,
      y: bounds.y - margin,
      w: bounds.w + margin * 2,
      h: bounds.h + margin * 2,
    };
    const ids: string[] = [];
    places.forEach((place, index) => {
      const def: ShrimpSpawnDef = {
        id: `${TRAVELLER}.${group}.${index + 1}`,
        who: 'young',
        x: place.x,
        y: place.y,
        heading,
      };
      const npc = this.make(scene, def, `${area.id}:passing`, index / places.length, wide);
      this.members.push(npc);
      ids.push(npc.id);
    });
    return ids;
  }

  /** The strangers passing through now (T114). */
  get travellers(): { id: string; x: number; y: number; bodyLengthPx: number }[] {
    return this.members
      .filter((npc) => npc.traveller)
      .map((npc) => ({ id: npc.id, x: npc.x, y: npc.y, bodyLengthPx: npc.bodyLengthPx }));
  }

  /** The bond's stage with a shrimp, for company and for how it treats the player. */
  stage(id: string): BondStage {
    return this.options.bonds.stage(id);
  }

  /** One step of every other shrimp, in the game's one loop (doc 15, "One clock"). */
  step(dt: number, time: number, player: PlayerView): void {
    this.time = time;
    this.player = player;
    const route = this.options.area.journey;
    this.goal =
      route && route.length > 1
        ? shoalGoal(route, player, JOURNEY.ahead * this.options.bodyLengthPx)
        : null;
    // Strangers keep their own way, a little ahead of their own middle and on past the end.
    const middle = this.middleOf(this.members.filter((npc) => npc.traveller));
    this.travellersGoal =
      route && route.length > 1 && middle
        ? pointBeyond(
            route,
            along(route, middle.x, middle.y) + PASSING.ahead * this.options.bodyLengthPx,
          )
        : null;
    this.gate?.step(dt, player);
    this.watchClose(dt, player);
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
    this.watchMolts(dt, player);
    this.watchFavourites(player);
  }

  /** Before each step: what the companions at Close and those with the player do for it (T105). */
  private watchClose(dt: number, player: PlayerView): void {
    const bl = this.options.bodyLengthPx;
    this.stillFor = player.mode === 'rest' ? this.stillFor + dt : 0;
    // A lead under way ends at the food, when given up, or at a threat.
    const leading = this.leading;
    if (leading) {
      leading.since += dt;
      const npc = this.members.find((one) => one.id === leading.id);
      if (!npc || npc.mind.ledThere || leading.since > CLOSE.lead.giveUp || this.threat?.cue) {
        this.leading = null;
      }
    } else if ((player.hunger ?? 0) >= CLOSE.lead.playerHunger && !this.threat?.cue) {
      for (const npc of this.members) {
        if (!npc.named || this.led.has(npc.id) || npc.moltStage !== 'none') continue;
        if (this.options.bonds.value(npc.id) < BOND.stages.close) continue;
        if (npc.feelings.values.hunger < CLOSE.lead.ownHunger || npc.feelings.mood === 'afraid') {
          continue;
        }
        if (Math.hypot(npc.x - player.x, npc.y - player.y) > CLOSE.lead.near * bl) continue;
        const favourite = this.favourites.get(npc.id);
        const spot = favourite ? leadTo(npc, favourite, this.options.foods, bl, CLOSE.lead) : null;
        const food = this.options.foods.find((patch) => patch === spot);
        // Not when the player is there already.
        if (!food || Math.hypot(food.x - player.x, food.y - player.y) <= CLOSE.lead.wait * bl) {
          continue;
        }
        this.leading = { id: npc.id, food, since: 0 };
        this.led.add(npc.id);
        this.ledNews.push(npc.id);
        break;
      }
    }
    // A companion with the player darts aside a beat before the charge passes.
    const charge = this.threat?.charging ?? null;
    if (!charge) {
      this.dodged.clear();
      return;
    }
    for (const npc of this.members) {
      if (this.dodged.has(npc.id) || npc.moltStage !== 'none') continue;
      if (this.options.bonds.value(npc.id) < BOND.stages.companion) continue;
      if (Math.hypot(npc.x - player.x, npc.y - player.y) > CLOSE.sidestep.with * bl) continue;
      const axis = sidestepNow(charge, npc, bl, CLOSE.sidestep);
      if (!axis) continue;
      npc.mind.sidestep(axis);
      this.dodged.add(npc.id);
    }
  }

  /** Where a Close companion rests touching the player now, or null (T105). */
  private restBesideFor(npc: NpcShrimp, player: PlayerView): { x: number; y: number } | null {
    if (this.stillFor < CLOSE.rest.after || !npc.named) return null;
    if (this.options.bonds.value(npc.id) < BOND.stages.close) return null;
    const near = CLOSE.rest.near * this.options.bodyLengthPx;
    if (Math.hypot(npc.x - player.x, npc.y - player.y) > near) return null;
    return { x: player.x, y: player.y };
  }

  /** The player keeps still touching a Close companion who rests too (doc 10, "Fear"). */
  restingAgainstClose(x: number, y: number): boolean {
    if (this.stillFor < CLOSE.rest.after) return false;
    const reach = CLOSE.rest.touch * 1.5 * this.options.bodyLengthPx;
    return this.members.some(
      (npc) =>
        this.options.bonds.value(npc.id) >= BOND.stages.close &&
        npc.motion.mode === 'rest' &&
        Math.hypot(npc.x - x, npc.y - y) <= reach,
    );
  }

  /** A companion seen eating her favourite from within 4 BL: the player learns it (doc 12). */
  private watchFavourites(player: PlayerView): void {
    const reach = COMPANY.radius * this.options.bodyLengthPx;
    for (const npc of this.members) {
      if (!npc.named || !npc.eating || this.seenFavourite.has(npc.id)) continue;
      if (npc.activity.food?.kind !== this.favourites.get(npc.id)) continue;
      if (Math.hypot(npc.x - player.x, npc.y - player.y) > reach) continue;
      this.seenFavourite.add(npc.id);
      this.favouriteNews.push(npc.id);
    }
  }

  /** Companions seen eating their favourite since the last call. */
  takeFavourites(): string[] {
    const news = this.favouriteNews;
    this.favouriteNews = [];
    return news;
  }

  /** Companions who began to lead the player to food since the last call. */
  takeLed(): string[] {
    const news = this.ledNews;
    this.ledNews = [];
    return news;
  }

  /**
   * A companion's molt (T104): at night, a while in, one named shrimp the
   * player knows, close by, begins to molt. One a night, and never while
   * the player molts.
   */
  private watchMolts(dt: number, player: PlayerView): void {
    if (this.dayPhase !== 'night' || !this.options.together) {
      this.nightFor = 0;
      this.moltedTonight = false;
    } else {
      this.nightFor += dt;
      if (!this.moltedTonight && this.nightFor >= NPC.molt.after && !this.playerMolting) {
        const id = pickMolter(
          this.members.map((npc) => ({
            id: npc.id,
            named: npc.named,
            bond: this.options.bonds.value(npc.id),
            x: npc.x,
            y: npc.y,
            molts: npc.molts,
          })),
          player,
          this.options.bodyLengthPx,
          NPC.molt,
        );
        if (id) this.beginMolt(id);
      }
    }
    const staying = this.staying;
    if (!staying) return;
    const npc = this.members.find((one) => one.id === staying.id);
    if (!npc) {
      this.staying = null;
      return;
    }
    staying.watch.step(Math.hypot(npc.x - player.x, npc.y - player.y));
  }

  /** `id` begins to molt now. Returns whether it did. */
  beginMolt(id: string): boolean {
    const npc = this.members.find((one) => one.id === id);
    if (!npc || this.members.some((one) => one.moltStage !== 'none')) return false;
    this.moltedTonight = true;
    const seed = seedOf(`${this.options.area.id}:${id}:molt:${npc.molts}`);
    this.moltPhases(npc, npc.beginMolt(seed));
    return true;
  }

  /** With `?debug`: the named shrimp nearest the player begins to molt, whatever the bond. */
  moltNearest(): boolean {
    const player = this.player;
    if (!player) return false;
    let best: NpcShrimp | null = null;
    let bestDistance = Infinity;
    for (const npc of this.members) {
      if (!npc.named) continue;
      const distance = Math.hypot(npc.x - player.x, npc.y - player.y);
      if (distance < bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best ? this.beginMolt(best.id) : false;
  }

  /** A shrimp is sheltering to molt, molting or soft: no threat may start (doc 10, "Molting"). */
  get moltGuarded(): boolean {
    return this.members.some((npc) => ['shelter', 'molt', 'soft'].includes(npc.moltStage));
  }

  /** The companions whose whole molt the player stayed through, since the last call (doc 12, `c2.molt`). */
  takeStayed(): string[] {
    const stayed = this.stayedWith;
    this.stayedWith = [];
    return stayed;
  }

  /** The companion who is soft now, with the player near her since her molt began, or null. */
  get softStaying(): string | null {
    const staying = this.staying;
    if (!staying?.watch.staying) return null;
    const npc = this.members.find((one) => one.id === staying.id);
    return npc?.moltStage === 'soft' ? npc.id : null;
  }

  /**
   * The phases of a companion's molt as they begin: told to the rest of the
   * game, and watched for the player staying near (doc 12, `c2.molt`).
   */
  private moltPhases(npc: NpcShrimp, events: readonly MoltEvent[]): void {
    const player = this.player;
    const reach = NPC.molt.stay * this.options.bodyLengthPx;
    for (const event of events) {
      if (event.type === 'done') {
        this.options.bus.emit('molt:done', { who: npc.id, molts: npc.molts });
        continue;
      }
      const phase = event.phase;
      if (phase !== 'none' && phase !== 'hardened') {
        this.options.bus.emit('molt:phase', { who: npc.id, phase });
      }
      if (phase === 'molt') {
        const near = player !== null && Math.hypot(npc.x - player.x, npc.y - player.y) <= reach;
        this.staying = { id: npc.id, watch: new StayingClose(reach, near) };
      }
      const staying = this.staying?.id === npc.id ? this.staying : null;
      if (!staying || phase !== 'hardened') continue;
      // Her shell is hard: the player who stayed the whole time has stayed with her.
      if (staying.watch.staying) {
        this.report(this.options.bonds.add(npc.id, BOND.molt));
        this.stayedWith.push(npc.id);
      }
      this.staying = null;
    }
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
        // The shoal know each other, and the strangers passing know each other.
        stage: other.traveller === npc.traveller ? 'familiar' : 'stranger',
        busy: other.activity.name !== 'free' && other.activity.name !== 'greeting',
      });
    }
    const values = npc.feelings.values;
    const restBeside = this.restBesideFor(npc, player);
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
        // Called, or, at Close, through the player's molt (doc 10, "Toward the player").
        called:
          (time < this.calledUntil && this.options.bonds.value(npc.id) >= BOND.stages.companion) ||
          (this.playerMolting && this.options.bonds.value(npc.id) >= BOND.stages.close),
        shoal: npc.traveller
          ? this.shoalMembers(true)
          : this.options.together
            ? this.shoalMembers(false)
            : null,
        lagoonDay: this.dayPhase === 'day' && this.options.area.sand === true,
        molting: npc.moltStage,
        leading: this.leading?.id === npc.id ? this.leading.food : null,
        restBeside,
        journey: npc.traveller
          ? this.travellersGoal
          : (this.gate?.goalFor(npc.id, npc) ?? this.goal),
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
        restingAgainstClose:
          restBeside !== null &&
          Math.hypot(player.x - npc.x, player.y - npc.y) <=
            CLOSE.rest.touch * 1.5 * npc.bodyLengthPx,
        curiosityPull: 0,
        threat: this.threat?.view(npc.x, npc.y, false) ?? null,
        inCurrent: inCurrent(this.options.area.currents ?? [], npc.x, npc.y),
        dayPhase: null,
      },
    );
    this.drift(npc, dt);
    if (npc.feelings.mood === 'afraid') this.frightened.add(npc.id);
    if (result.mood?.to === 'afraid' || (result.darted && npc.mind.behaviour === 'flee')) {
      this.alarm.raise(npc.id, npc.x, npc.y, time, this.everyone());
    }
    if (result.greeted) this.greetingDone(npc, result.greeted, time);
    if (result.molt) this.moltPhases(npc, result.molt);
  }

  /** The water carries it as it carries the player: all off the bed, a share on it, none tucked (T110). */
  private drift(npc: NpcShrimp, dt: number): void {
    const water = currentAt(this.options.area.currents ?? [], npc.x, npc.y);
    if (water.vx === 0 && water.vy === 0) {
      npc.downstream = null;
      return;
    }
    npc.downstream = Math.atan2(water.vy, water.vx);
    const { dx, dy } = carried(
      water,
      { mode: npc.motion.mode, tucked: npc.activity.tucked },
      dt,
      CURRENT,
    );
    const mover = this.movers.get(npc);
    if (!mover || (dx === 0 && dy === 0)) return;
    const to = mover(npc.x, npc.y, dx, dy);
    npc.motion.x = to.x;
    npc.motion.y = to.y;
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
      if (!this.frightened.has(npc.id) || npc.traveller) continue;
      if (Math.hypot(npc.x - x, npc.y - y) > reach) continue;
      this.report(this.options.bonds.add(npc.id, BOND.flee));
      if (npc.named) named.push(npc.id);
    }
    this.frightened.clear();
    return named;
  }

  /** Every named companion here is within `reach` px of a point, and there are three (doc 12, `c3.together`). */
  allCompanionsNear(x: number, y: number, reach: number): boolean {
    const named = this.members.filter((npc) => npc.named);
    return (
      named.length >= Object.keys(COMPANIONS).length &&
      named.every((npc) => Math.hypot(npc.x - x, npc.y - y) <= reach)
    );
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
    // A stranger passing through is met, and goes on: no bond is kept with it.
    if (npc.traveller) {
      this.options.bus.emit('greeting', { a: PLAYER, b: TRAVELLER });
      return;
    }
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

  /** A shrimp with a bond of Companion or more within `bls` BL. */
  companionNear(x: number, y: number, bls = 2): boolean {
    const reach = bls * this.options.bodyLengthPx;
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

  /** How many of the shoal are within `reach` px of a point. Strangers passing are not. */
  near(x: number, y: number, reach: number): number {
    return this.members.filter((npc) => !npc.traveller && Math.hypot(npc.x - x, npc.y - y) <= reach)
      .length;
  }

  /** The middle of the other shrimp within `reach` px of a point, if two or more are there. */
  middleNear(x: number, y: number, reach: number): { x: number; y: number } | null {
    const close = this.members.filter((npc) => Math.hypot(npc.x - x, npc.y - y) <= reach);
    return close.length < 2 ? null : this.middleOf(close);
  }

  /** The middle of some shrimp, or null for none. */
  private middleOf(some: readonly NpcShrimp[]): Point | null {
    if (some.length === 0) return null;
    let sx = 0;
    let sy = 0;
    for (const npc of some) {
      sx += npc.x;
      sy += npc.y;
    }
    return { x: sx / some.length, y: sy / some.length };
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
      hunger: npc.feelings.values.hunger,
      mode: npc.motion.mode,
      bond: this.options.bonds.value(npc.id),
      stage: this.stage(npc.id),
      molt: npc.moltStage,
      leading: this.leading?.id === npc.id,
      traveller: npc.traveller,
    }));
  }

  /** Every shrimp of the shoal, for choosing who goes missing (D42). */
  lossCandidates(view: { contains(x: number, y: number): boolean }): LossCandidate[] {
    // Strangers passing through are not of the shoal.
    return this.members
      .filter((npc) => !npc.traveller)
      .map((npc) => ({
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
    return this.members.filter((npc) => !npc.traveller).length;
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
    if (with_ === PLAYER && npc.traveller) {
      this.options.bus.emit('greeting', { a: TRAVELLER, b: PLAYER });
      return;
    }
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
      if (npc.traveller) continue;
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

  /** The shoal, or the strangers passing through: each keeps together with its own. */
  private shoalMembers(travellers: boolean): ShoalMember[] {
    return this.members
      .filter((npc) => npc.traveller === travellers)
      .map((npc) => ({
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
