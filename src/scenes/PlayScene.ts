import Phaser from 'phaser';
import { app } from '../app';
import { MOOD_EXPRESSIONS, STAGE_LOOKS, withActivity, withConditions } from '../art/expressions';
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Activity } from '../core/activity/Activity';
import { Bonds } from '../core/bonds/Bonds';
import { EventBus } from '../core/events';
import { FoodPatch } from '../core/food/FoodPatch';
import { FeelingsModel, type FeelingsChange } from '../core/feelings/FeelingsModel';
import { MOODS, type Mood } from '../core/feelings/mood';
import type { FeelingsContext } from '../core/feelings/types';
import type { GameEvents, ThreatKind } from '../core/gameEvents';
import type { MoltEvent } from '../core/molt/Molt';
import { approach, rotateToward } from '../core/movement/angles';
import { moveCircle, type Bounds } from '../core/movement/collision';
import { pickMissing } from '../core/npc/losses';
import { seededRandom, seedOf } from '../core/random';
import { RibbonMemory, ribbons, type Ribbon } from '../core/scent/ribbons';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import type { ThreatEvent } from '../core/threat/ThreatDirector';
import { distanceToCover, isUnder } from '../core/world/cover';
import { DayCycle, next as nextPhase } from '../core/world/dayCycle';
import type { DayPhase } from '../core/feelings/types';
import { DiscoveryTracker, type Discoverable, type Pull } from '../core/world/discovery';
import { CHALLENGE_TARGETS } from '../data/challenges';
import { FOOD_KINDS, type FoodKind } from '../core/world/kinds';
import { inRect, ZoneTracker } from '../core/world/zones';
import { newLife, type Life } from '../core/progress/life';
import { RestSaver } from '../core/save/RestSaver';
import {
  areaFor,
  FIRST_AREA,
  isPlayableArea,
  pointFor,
  STAGE_IN,
  type PlayableArea,
} from '../data/areas';
import type { AreaDef } from '../data/areas/types';
import { FOODS } from '../data/foods';
import {
  BOND,
  BURROW,
  CAMERA,
  CURIOSITY,
  DAY,
  FEELINGS,
  FISH,
  FRAME,
  GRAZE,
  GREET,
  HIDE,
  HUNGER,
  LOSSES,
  MOOD,
  MOLT,
  MOOD_SCREEN,
  MOTION,
  NPC,
  REST,
  SAVE,
  SENSE,
  STORY,
} from '../data/tuning';
import { debugState } from '../debug';
import { SandLid } from '../entities/SandLid';
import { ShrimpRig } from '../entities/ShrimpRig';
import { i18n, t } from '../i18n';
import { debugRequested, exploreTime } from '../platform/address';
import { loadArea, type CoverHandle, type LoadedArea } from '../systems/AreaLoader';
import { Creatures, LIVE_KINDS, THREAT_KINDS } from '../systems/Creatures';
import { AudioDirector } from '../systems/AudioDirector';
import { DayNight } from '../systems/DayNight';
import { MoodPresenter } from '../systems/MoodPresenter';
import { Rim } from '../systems/Rim';
import { keepLife } from '../systems/keep';
import { Molting } from '../systems/Molting';
import { ProgressKeeper } from '../systems/ProgressKeeper';
import { Narrator } from '../systems/Narrator';
import { StoryTeller } from '../systems/StoryTeller';
import { Threats } from '../systems/Threats';
import { ScentField } from '../systems/ScentField';
import { Shoal } from '../systems/Shoal';
import { WaterLight } from '../systems/WaterLight';
import type { HudScene } from './HudScene';
import type { JournalHost } from './JournalScene';

export interface PlayData {
  area?: string;
  /** Opened by `?explore=`: one place, no story. */
  explore?: boolean;
  /** Explore mode, or coming back from a save: where to start instead of the area's spawn, as the data file writes it. */
  at?: { x: number; y: number };
  /** The life so far, from the place before or from the save. A new one when left out. */
  life?: Life;
  /** Coming back to this place from the save, rather than arriving in it. */
  resume?: boolean;
  /** Arriving from the place before: the view fades in. */
  arriving?: boolean;
}

/** The player's shrimp on the event bus. */
const PLAYER = 'player';

/**
 * The things of an area the shrimp can come to know: its creatures, its
 * foods, and the landmarks and covers that have a journal entry. A food is
 * found by tasting it.
 */
function discoverables(area: AreaDef): Discoverable[] {
  const things: Discoverable[] = [];
  for (const creature of area.creatures ?? []) {
    // A hunter is known once it has come and gone, not by going to where it starts.
    if (THREAT_KINDS.has(creature.kind)) continue;
    things.push({
      id: `creature.${creature.kind}`,
      kind: 'creature',
      x: creature.x,
      y: creature.y,
      // An animal that moves is found where it is now, not where it started.
      ref: LIVE_KINDS.has(creature.kind) ? creature.id : undefined,
    });
  }
  for (const food of area.food ?? []) {
    things.push({ id: `food.${food.kind}`, kind: 'food', x: food.x, y: food.y });
  }
  for (const landmark of area.landmarks ?? []) {
    if (landmark.discovery) {
      things.push({ id: landmark.discovery, kind: 'thing', x: landmark.x, y: landmark.y });
    }
  }
  for (const cover of area.cover ?? []) {
    if (cover.discovery) {
      things.push({ id: cover.discovery, kind: 'thing', x: cover.x, y: cover.y, under: cover.r });
    }
  }
  return things;
}

/**
 * Play. Loads one area and lets the shrimp live in it. The story, which
 * chooses the area, comes in step 8. Until then Play opens the mangrove, and
 * `?explore=<area>` opens any area that has data.
 */
export class PlayScene extends Phaser.Scene implements JournalHost {
  private areaId: PlayableArea = FIRST_AREA;
  private explore = false;
  private resume = false;
  private arriving = false;
  private start: { x: number; y: number } | null = null;
  private area!: AreaDef;
  private loaded!: LoadedArea;
  private light!: WaterLight;
  private activity!: Activity<CoverHandle, FoodPatch>;
  private zones!: ZoneTracker;
  private bodyLengthPx = 110;
  private motion!: ShrimpMotion;
  private rig!: ShrimpRig;
  private mover!: Mover;
  private view = { x: 0, y: 0 };
  private lead = { x: 0, y: 0 };

  private bus!: EventBus<GameEvents>;
  private feelings!: FeelingsModel;
  private discovery!: DiscoveryTracker;
  private things: Discoverable[] = [];
  private pull: Pull = { value: 0, target: null };
  private presenter!: MoodPresenter;
  private audio!: AudioDirector;

  private patches: FoodPatch[] = [];
  private foodImages = new Map<FoodPatch, Phaser.GameObjects.Image>();
  private scent!: ScentField;
  private memory!: RibbonMemory;
  /** Seconds of play, for the ribbon memory. */
  private clock = 0;
  /** The patch of the meal under way, once the mouth is on it, and whether it is a first taste. */
  private meal: { food: FoodPatch; first: boolean } | null = null;
  private wiggleLeft = 0;
  /** The player's favourite food, chosen at random for each life (T35). */
  private favourite: FoodKind = 'algaeFilm';
  /** The prompt showing now. How many times each has shown is kept in the life. */
  private promptNow: string | null = null;
  /** What the journal counts, the small line, and when to keep the life at rest. */
  private keeper!: ProgressKeeper;
  private restSaver!: RestSaver;
  /** Last frame's activity and tuck, to tell when Sense or cover is left. */
  private wasSensing = 0;
  private wasTucked = false;

  /** The other shrimp, and the player's bonds with them. Bonds are kept in the life. */
  private bonds!: Bonds;
  private shoal!: Shoal;
  /** How much brighter the other shrimp are drawn while the player is social (doc 10, "Screen"). */
  private lift = 0;
  /** The crabs, snails and fish that move, and the pale rim on what the shrimp is curious about. */
  private creatures!: Creatures;
  private rim!: Rim;
  /** The bird and what it does, and the cornered sequence (step 7). */
  private threats!: Threats;
  /** The player's molt (step 8), and how far the view has eased out with it. */
  private molting!: Molting;
  private viewScale = 1;
  private viewFrom = 1;

  private hud: HudScene | null = null;

  /** Day and night, where the place has them (chapter 2 on), and how they are drawn. */
  private day: DayCycle | null = null;
  private dayNight: DayNight | null = null;
  /** Leaving for the next place: the view fades and the keys do nothing. */
  private leaving = false;
  /** The place to go to next, so the next place starts with its own hunger. */
  private leavingTo: PlayableArea | null = null;
  /** The sand over the shrimp when it digs in, where the bed is sand. */
  private lid: SandLid | null = null;
  /** Seconds tucked or dug in, calm: "Rest until dusk" may be chosen after a few. */
  private calmTucked = 0;
  /** Resting until dusk: the day runs faster until it comes. */
  private restingToDusk = false;
  /** "Rest until dusk" was chosen on this frame: the key that chose it does not wake it. */
  private restBegunNow = false;
  /** The draws for who goes missing (D42), seeded so a run replays. */
  private lossRandom: () => number = Math.random;
  /** When the last tail flip began, by the scene's clock, for a sidestep. */
  private lastFlip = -Infinity;

  /** The life this place is part of. In explore mode, a life of its own. */
  private life: Life = newLife();
  /** The story and its narration. None in explore mode. */
  private narrator: Narrator | null = null;
  private teller: StoryTeller | null = null;

  constructor() {
    super('Play');
  }

  init(data: PlayData): void {
    this.areaId = data.area !== undefined && isPlayableArea(data.area) ? data.area : FIRST_AREA;
    this.explore = data.explore === true;
    this.resume = !this.explore && data.resume === true;
    this.start =
      (this.explore || this.resume) && data.at ? pointFor(this.areaId, data.at.x, data.at.y) : null;
    this.life = data.life ?? newLife();
    this.arriving = data.arriving === true;
  }

  create(): void {
    const area = areaFor(this.areaId);
    this.area = area;
    const bounds: Bounds = { x: 0, y: 0, w: area.size.w, h: area.size.h };

    this.loaded = loadArea(this, area);
    this.bodyLengthPx = this.loaded.bodyLengthPx;
    this.creatures = new Creatures(this, area, this.bodyLengthPx);
    this.rim = new Rim();
    const obstacles = this.loaded.obstacles;

    const spawn = this.start ? { ...area.spawn, ...this.start } : area.spawn;
    this.motion = new ShrimpMotion({ ...MOTION, bodyLengthPx: this.bodyLengthPx }, spawn);
    this.mover = (x, y, dx, dy) =>
      moveCircle(x, y, dx, dy, this.motion.radiusPx, obstacles, bounds);
    const stage = STAGE_IN[this.areaId];
    this.rig = new ShrimpRig(this, this.bodyLengthPx, DEPTH.bedAnimals, STAGE_LOOKS[stage]);
    this.rig.update(0, this.motion);
    this.activity = new Activity<CoverHandle, FoodPatch>(
      HIDE,
      this.bodyLengthPx,
      GRAZE,
      GREET,
      BURROW,
    );
    this.lid = area.sand
      ? new SandLid(this, area.ground, this.bodyLengthPx, DEPTH.bedAnimals + 1)
      : null;
    this.calmTucked = 0;
    this.lastFlip = -Infinity;
    this.restingToDusk = false;
    this.restBegunNow = false;
    this.zones = new ZoneTracker(this.loaded.zones);
    this.light = new WaterLight(this, area.light);
    // A place with a day cycle opens by day; explore mode may ask for another time.
    this.day = null;
    this.dayNight = null;
    if (area.dayCycle) {
      const phase: DayPhase = (this.explore ? exploreTime() : null) ?? 'day';
      this.day = new DayCycle(DAY, { phase, into: 0 });
      this.dayNight = new DayNight(this, area, this.loaded.bodyLengthPx, this.light);
    }
    this.leaving = false;
    this.leavingTo = null;

    // Feelings. What is found lives only as long as the scene until saving
    // comes in step 9.
    this.bus = new EventBus<GameEvents>();
    const hunger =
      this.life.hunger ?? (HUNGER.start as Record<string, number>)[area.id] ?? HUNGER.start.other;
    this.feelings = new FeelingsModel(FEELINGS, MOOD, { hunger });
    const range = stage === 'larva' ? CURIOSITY.range.juvenile : CURIOSITY.range[stage];
    this.discovery = new DiscoveryTracker(
      { range, weights: CURIOSITY.weights, find: CURIOSITY.find },
      this.bodyLengthPx,
      this.life.discoveries,
    );
    this.bus.on('discovery', ({ id }) => this.life.discoveries.add(id));
    this.things = discoverables(area);
    this.pull = { value: 0, target: null };
    this.enterZones();

    // Food, and the scent that leads to it.
    this.patches = [];
    this.foodImages = new Map();
    for (const { def, image } of this.loaded.foods) {
      const patch = new FoodPatch(
        def.id,
        def.kind,
        def.x,
        def.y,
        def.size * GRAZE.patchShare,
        FOODS[def.kind],
      );
      this.patches.push(patch);
      // Fuzz rides on its seagrass, which fades on its own when the shrimp is under it.
      if (def.kind !== 'seagrassFuzz') this.foodImages.set(patch, image);
    }
    this.scent = new ScentField(this, this.bodyLengthPx, DEPTH.scent);
    this.memory = new RibbonMemory(SENSE.followWindow);
    this.clock = 0;
    this.meal = null;
    this.wiggleLeft = 0;
    const likes = FOOD_KINDS.filter((kind) => kind !== 'microalgae');
    this.favourite =
      this.life.favourite ??
      likes[Math.floor(seededRandom(Date.now() >>> 0)() * likes.length)] ??
      'algaeFilm';
    this.life.favourite = this.favourite;
    this.promptNow = null;
    this.wasSensing = 0;
    this.wasTucked = false;

    // Other shrimp. From chapter 2 they keep together as a shoal.
    this.bonds = new Bonds(BOND);
    this.bonds.load(this.life.bonds);
    this.shoal = new Shoal(this, {
      area,
      stage,
      bodyLengthPx: this.bodyLengthPx,
      obstacles,
      bounds,
      covers: this.loaded.covers,
      foods: this.patches,
      bonds: this.bonds,
      bus: this.bus,
      depth: DEPTH.bedAnimals,
      together: stage === 'subAdult' || stage === 'adult',
      missing: this.life.stats[`missing.${area.id}`] ?? 0,
      led: Object.keys(this.life.stats)
        .filter((key) => key.startsWith(`led.${area.id}.`))
        .map((key) => key.slice(`led.${area.id}.`.length)),
    });
    this.lossRandom = seededRandom(seedOf(`${area.id}:losses`));
    this.lift = 0;

    const camera = this.cameras.main;
    const story = !this.explore;
    const life = this.life;
    this.threats = new Threats(this, {
      area,
      loaded: this.loaded,
      bodyLengthPx: this.bodyLengthPx,
      camera,
      gentle: app.settings.gentleMode,
      reducedMotion: () => app.settings.reducedMotion,
      seed: Date.now() >>> 0,
      // In the story the first bird waits for Sense, and one ambient bird may follow it.
      // Once it has gone, it does not come again on coming back from the save.
      armed: story
        ? (id) =>
            id !== 'bird.first' ||
            (life.stepsDone.has('s1.sense') && !life.stepsDone.has('s1.bird'))
        : undefined,
      ambient: story ? ambientInStory(area.id, life.stepsDone) : undefined,
    });
    this.shoal.watch(this.threats);
    this.molting = new Molting(
      this,
      this.bodyLengthPx,
      DEPTH.bedAnimals,
      STAGE_LOOKS[stage],
      Date.now() >>> 0,
    );
    this.viewScale = 1;
    this.viewFrom = 1;
    camera.setBackgroundColor(COLORS.deepTeal);
    this.presenter = new MoodPresenter(camera, {
      hud: () => this.hud,
      reducedMotion: () => app.settings.reducedMotion,
      nameFeelings: () => app.settings.nameFeelings,
      word: (mood) => t(`mood.${mood}`),
    });
    this.view = { x: spawn.x, y: spawn.y };
    this.lead = { x: 0, y: 0 };
    this.aim();
    if (this.arriving) camera.fadeIn(STORY.leaveFade * 1000, 0, 0, 0);

    this.scene.launch('Hud', { larva: false });
    this.hud = this.scene.get('Hud') as HudScene;
    this.audio = new AudioDirector(this, {
      area: this.areaId,
      bus: this.bus,
      hud: () => this.hud,
      walkSpeed: MOTION.walkSpeed * this.bodyLengthPx,
      favourite: () => this.favourite,
    });

    // What the journal counts. Explore mode counts too, in a life of its own that is never kept.
    this.keeper = new ProgressKeeper(this.bus, this.life, this.areaId, () => this.hud, {
      arrived: !this.resume,
      author: debugRequested(),
      find: (id) => {
        if (this.discovery.add(id)) this.found(id);
      },
      ring: (bells) => this.audio.ring(bells),
    });
    this.keeper.progress.record.bonds = this.life.bonds;
    if (this.discovery.add(`place.${this.areaId}`)) this.found(`place.${this.areaId}`);
    this.restSaver = new RestSaver(SAVE);
    if (this.resume) {
      // The body keeps the size of its molts, and the view with it.
      this.molting.restore(this.life.molts);
      const by = MOLT.viewByMolts;
      this.viewScale = (by[this.life.molts] ?? by[by.length - 1] ?? 1) / (by[0] ?? 1);
      this.viewFrom = this.viewScale;
    } else if (story) {
      // Each chapter's start is kept (doc 02, "Saving").
      keepLife(app.store, this.life, { area: this.areaId, stage, at: null });
      this.restSaver.savedNow();
    }

    // The story of this place, told one line at a time.
    this.narrator = null;
    this.teller = null;
    if (story) {
      const narrator = new Narrator(() => this.hud, life.narrated, life.placesSeen);
      this.narrator = narrator;
      this.teller = new StoryTeller(this.bus, narrator, life, this.areaId, this.favourite);
      this.bus.on('step:done', ({ id }) => {
        if (id === 's1.bird') this.threats.director.ambientLeft = 1;
        // After the dawn fish, the lagoon's fish may come at any time.
        if (id === 's2.fish') this.threats.director.ambientLeft = Infinity;
      });
      narrator.enter(this.areaId);
      this.teller.arrive();
      if (this.day) this.teller.dayPhase(this.day.phase, false);
    }
    this.answerDay([]);

    debugState.player = () => ({
      x: this.motion.x,
      y: this.motion.y,
      heading: this.motion.heading,
      mode: this.motion.mode,
      height: this.motion.height,
      area: this.area.id,
      explore: this.explore,
      activity: this.activity.name,
      tucked: this.activity.tucked,
      zones: [...this.zones.current],
      molt: this.molting.molt.stage,
      molts: this.life.molts,
      steps: [...this.life.stepsDone],
      narration: this.narrator?.showing ?? null,
      leaving: this.leavingTo,
      prompt: this.promptNow,
    });
    debugState.day = () =>
      this.day && this.dayNight
        ? {
            phase: this.day.phase,
            left: this.day.left,
            light: { ...this.day.light },
            ambient: this.threats.director.ambientFactor,
            ...this.dayNight.snapshot,
          }
        : null;
    debugState.scent = () => this.scent.snapshot;
    debugState.shrimp = () => this.shoal.snapshot;
    debugState.creatures = () => ({ animals: this.creatures.snapshot, rim: this.rim.snapshot });
    debugState.threat = () => this.threats.snapshot;
    debugState.audio = () => this.audio.snapshot;
    debugState.feelings = () => ({
      values: { ...this.feelings.values },
      mood: this.feelings.mood,
      forced: this.feelings.forcedMood,
      conditions: this.feelings.conditionList,
      waryLeft: this.feelings.waryRemaining,
      discovered: [...this.discovery.known],
      curiousAbout: this.pull.target?.id ?? null,
    });

    // `?debug`: F9 cycles the forced mood, to look at each one. F10 calls
    // the bird at once. F8 brings the molt signal, and Shift and F8 a
    // companion's, the nearest.
    const stopDebug = debugRequested()
      ? app.keyboard.onDebugKey((key) => {
          if (key === 'mood') this.cycleMood();
          else if (key === 'threat') this.threats.callThreat();
          else if (key === 'time') this.nextTime();
          else if (key === 'herMolt') this.shoal.moltNearest();
          else this.answerMolt(this.molting.signal());
        })
      : null;

    // If the tab loses focus, the game pauses.
    const stopBlur = app.keyboard.onBlur(() => this.openPause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopBlur();
      stopDebug?.();
      this.bus.clear();
      debugState.player = null;
      debugState.feelings = null;
      debugState.scent = null;
      debugState.shrimp = null;
      debugState.creatures = null;
      debugState.threat = null;
      debugState.audio = null;
      debugState.day = null;
      this.audio.destroy();
      this.dayNight?.destroy();
      this.lid?.destroy();
      // The next place starts with its own hunger (doc 10, "Hunger").
      this.life.hunger = this.leavingTo ? null : this.feelings.values.hunger;
      this.teller?.destroy();
      this.keeper.destroy();
      this.narrator?.clear();
      this.threats.destroy();
      this.molting.destroy();
      this.scent.destroy();
      this.shoal.destroy();
      this.rig.destroy();
      this.hud = null;
      this.scene.stop('Hud');
    });
  }

  override update(_time: number, deltaMs: number): void {
    const actions = app.actions;

    if (actions.justPressed('pause')) {
      this.openPause();
      return;
    }
    if (actions.justPressed('journal')) {
      this.openJournal();
      return;
    }

    // A slow frame is played as several short steps, so the shrimp covers the
    // same ground whatever the frame rate.
    const frame = Math.min(deltaMs / 1000, FRAME.longest);
    // Gentle mode can be changed from the pause menu's settings.
    this.threats.director.gentle = app.settings.gentleMode;
    // Cornered, and in the molt itself, the keys do nothing.
    const locked = this.threats.cornered.running || this.molting.molt.locked || this.leaving;
    const sequence = this.threats.cornered.update(frame);
    // Soft after a molt, the shrimp moves at half speed.
    const slow = this.molting.molt.speed;
    const axisNow = actions.axis();
    const own = locked ? { x: 0, y: 0 } : { x: axisNow.x * slow, y: axisNow.y * slow };
    const tailFlip = !locked && actions.justPressed('tailFlip');
    let dart = tailFlip;
    if (sequence.flip) dart = this.flipAway();
    if (sequence.place) {
      this.wake();
      this.teller?.woke();
    }
    if (sequence.done) {
      this.feelings.stimulus('cornered');
      this.bus.emit('cornered', { kind: this.threats.director.kind ?? 'bird' });
    }
    this.restBegunNow = false;
    if (!locked && actions.justPressed('interact') && this.mayRest()) {
      this.activity.rest();
      this.restingToDusk = true;
      this.restBegunNow = true;
      this.teller?.rested();
    }
    let darted = false;
    let remaining = frame;
    let eating = false;
    // The animals that move are found where they are now.
    for (const thing of this.things) {
      const now = thing.ref ? this.creatures.where(thing.ref) : null;
      if (now) {
        thing.x = now.x;
        thing.y = now.y;
      }
    }
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, FRAME.step);
      this.clock += dt;
      // Hiding and grazing walk the body by themselves; otherwise the player's own direction.
      const before = this.activity.name;
      const result = this.activity.update(
        this.activityInput(dt, own, dart, locked),
        this.loaded.covers,
        this.patches,
      );
      const { axis } = result;
      // Greeting turns the head to the other shrimp; the body stays where it is.
      if (result.face !== undefined) {
        this.motion.heading = rotateToward(this.motion.heading, result.face, MOTION.turnRate * dt);
      }
      if (result.greeted) this.shoal.playerGreeted(this.clock, result.greeted);
      if (result.called) this.shoal.playerCalled(this.clock);
      eating = this.stepMeal(dt, before, result.eating);
      for (const patch of this.patches) patch.step(dt);
      for (const alarm of this.shoal.takeAlarms()) {
        this.feelings.stimulus('alarm');
        this.alarmedBy(alarm.from);
      }
      this.stepFeelings(dt, axis.x !== 0 || axis.y !== 0 || dart);
      this.shoal.playerMolting = this.molting.molt.guarded;
      this.shoal.step(dt, this.clock, {
        x: this.motion.x,
        y: this.motion.y,
        heading: this.motion.heading,
        mode: this.motion.mode,
        activity: this.activity.name,
        under: this.activity.tucked ? this.activity.cover : null,
        eating,
        hunger: this.feelings.values.hunger,
      });
      // A Close companion began to lead the player to food: once a chapter. A favourite seen eaten.
      for (const id of this.shoal.takeLed()) this.keeper.count(`led.${this.areaId}.${id}`);
      for (const id of this.shoal.takeFavourites()) this.keeper.count(`favourites.${id}`);
      // Stayed with a companion through her whole molt: the journal remembers it (doc 12, `c2.molt`).
      for (const id of this.shoal.takeStayed()) {
        this.keeper.count('stayedThroughMolt');
        this.keeper.count(`stayedWith.${id}`);
      }
      const moved = this.motion.step(dt, { x: axis.x, y: axis.y, dart }, this.mover);
      this.stepMolt(dt);
      if (moved.darted) {
        this.lastFlip = this.clock;
        this.feelings.stimulus('tailFlip');
        this.bus.emit('tailflip', { who: PLAYER });
        if (this.shoal.playerFlipped(this.clock, this.motion.x, this.motion.y)) {
          this.teller?.startledStranger();
        }
        this.creatures.flip(this.motion.x, this.motion.y);
      }
      darted = darted || moved.darted;
      this.answerThreat(this.threats.step(dt, this.threatPlayer(moved.darted)));
      for (const kind of this.threats.felt(PLAYER, this.motion.x, this.motion.y)) {
        this.feelings.stimulus(kind);
      }
      dart = false;
      remaining -= dt;
    }

    this.enterZones();
    this.leaveBy();
    this.stepDay(frame);
    this.threats.enter(this.motion.x, this.motion.y);
    this.threats.draw(frame);
    this.loaded.update(frame, this.motion.x, this.motion.y);
    // Walking up to a hermit crab without sending it into its shell (doc 12, "Slowly").
    if (this.creatures.update(frame, this.motion) > 0) this.keeper.count('gentle.hermitCrab');
    this.rim.set(this.rimmed());
    this.rim.update(frame);
    for (const [patch, image] of this.foodImages) image.setAlpha(0.15 + 0.85 * patch.amount);
    this.wiggleLeft = Math.max(0, this.wiggleLeft - frame);
    this.molting.draw(frame);
    this.rig.setGrowth(this.molting.growth);
    this.rig.setAlpha(this.feelings.has('soft') ? MOLT.softAlpha : 1);
    this.rig.update(frame, this.motion, this.feel(eating));
    this.lid?.update(this.motion.x, this.motion.y, this.motion.heading, this.activity.burrowDepth);
    const lift = this.feelings.mood === 'social' ? MOOD_SCREEN.socialLift : 0;
    this.lift += (lift - this.lift) * approach(frame, MOOD.screen);
    this.shoal.draw(frame, this.cameras.main.worldView, this.lift);
    this.showScent(frame);
    this.tellStory(frame);
    this.showPrompt(own, locked);
    this.hud?.hush(this.threats.cornered.darkness);
    this.presenter.update(frame, {
      mood: this.feelings.mood,
      waryLeft: this.feelings.waryRemaining,
      x: this.motion.x,
      y: this.motion.y,
      target: this.feelings.mood === 'curious' ? this.pull.target : null,
      sensing: this.activity.name === 'sensing',
    });
    this.audio.update(frame, {
      mood: this.feelings.mood,
      hidden: this.feelings.has('hidden'),
      wary: this.feelings.has('wary'),
      waryLeft: this.feelings.waryRemaining,
      frozen: this.feelings.has('frozen'),
      soft: this.feelings.has('soft'),
      dark: this.threats.cornered.darkness,
      mode: this.motion.mode,
      speed: Math.hypot(this.motion.vx, this.motion.vy),
      activity: this.activity.name,
    });
    this.follow(frame);
    this.hud?.track(frame, own.x !== 0 || own.y !== 0, darted && !locked);
    this.keep(frame, own, locked);
  }

  /**
   * What the journal counts on each frame, Sense and cover as they are left,
   * and keeping the life at each rest under cover (doc 02, "Saving").
   */
  private keep(frame: number, own: { x: number; y: number }, locked: boolean): void {
    const { x, y } = this.motion;
    const bl = this.bodyLengthPx;
    const sensing = this.activity.name === 'sensing';
    if (sensing) this.wasSensing += frame;
    else if (this.wasSensing > 0) {
      this.bus.emit('sense:used', { seconds: this.wasSensing });
      this.wasSensing = 0;
    }
    const tucked = this.activity.tucked;
    if (tucked !== this.wasTucked) {
      const coverId = this.activity.cover?.id ?? '';
      if (tucked) this.bus.emit('cover:entered', { who: PLAYER, coverId });
      else this.bus.emit('cover:left', { who: PLAYER, coverId, wary: this.feelings.has('wary') });
      this.wasTucked = tucked;
    }
    this.life.playSeconds += frame;
    this.keeper.update(frame, {
      watchWave: this.creatures.wavingNear(x, y, 3 * bl),
      hiddenTogether: tucked && this.shoal.hiddenNear(x, y, 1.5 * bl),
    });
    if (this.explore) return;
    const resting =
      tucked &&
      own.x === 0 &&
      own.y === 0 &&
      !locked &&
      this.threats.director.stage === 'idle' &&
      this.molting.molt.stage === 'none';
    if (this.restSaver.step(frame, resting)) {
      this.life.hunger = this.feelings.values.hunger;
      const at = pointFor(this.areaId, x, y);
      if (keepLife(app.store, this.life, { area: this.areaId, stage: STAGE_IN[this.areaId], at })) {
        this.keeper.say('saved', t('notice.saved'));
      }
    }
  }

  private activityInput(dt: number, own: { x: number; y: number }, dart: boolean, locked = false) {
    const actions = app.actions;
    const held = (action: 'hide' | 'interact' | 'sense' | 'greet') =>
      !locked && actions.isDown(action);
    return {
      dt,
      x: this.motion.x,
      y: this.motion.y,
      heading: this.motion.heading,
      // Through the molt itself the body stays tucked in, whatever the keys do.
      hide: held('hide') || this.molting.molt.locked,
      interact: held('interact'),
      sense: held('sense'),
      tailFlip: dart,
      axis: own,
      hunger: this.feelings.values.hunger,
      fear: this.feelings.values.fear,
      tasted: (kind: FoodKind) => this.discovery.known.has(`food.${kind}`),
      greet: held('greet'),
      others: this.shoal.greetable,
      sand: this.area.sand === true,
      // Any key wakes a resting shrimp, except the one that just chose to rest.
      wake:
        !locked &&
        (own.x !== 0 ||
          own.y !== 0 ||
          actions.justPressed('tailFlip') ||
          actions.justPressed('hide') ||
          actions.justPressed('sense') ||
          actions.justPressed('greet') ||
          (actions.justPressed('interact') && !this.restBegunNow)),
    };
  }

  /**
   * "Rest until dusk" may be chosen: a place with a day, by day or at dawn,
   * tucked or dug in, calm for a few seconds and comfortable enough (doc 10,
   * "Comfort"), with no threat and no molt under way.
   */
  private mayRest(): boolean {
    const phase = this.day?.phase;
    return (
      (phase === 'day' || phase === 'dawn') &&
      this.activity.canRest &&
      this.calmTucked >= REST.calm &&
      this.feelings.values.comfort >= REST.comfort &&
      this.threats.director.stage === 'idle' &&
      this.molting.molt.stage === 'none'
    );
  }

  /**
   * Eating on this step, if the mouth is on the food. The first bite of a meal
   * is when a food is first tasted and the wiggle comes; the meal ends when
   * grazing does. Returns whether the shrimp ate.
   */
  private stepMeal(dt: number, before: string, eating: boolean): boolean {
    const food = this.activity.name === 'grazing' ? this.activity.food : null;
    if (food && eating) {
      if (!this.meal) {
        const first = this.discovery.add(`food.${food.kind}`);
        if (first) this.found(`food.${food.kind}`);
        if (first || food.kind === this.favourite) this.wiggleLeft = GRAZE.wiggle;
        if (this.memory.followed(food.id, this.clock)) {
          this.bus.emit('ribbon:followed', { kind: food.kind, patchId: food.id });
        }
        this.meal = { food, first };
      }
      // At dusk the golden film is worth more (doc 10, "Day and night").
      const dusk = this.day?.phase === 'dusk' && food.kind === 'sandFilm';
      this.feelings.eat(food.graze(dt) * (dusk ? DAY.effects.duskFilm : 1));
    }
    if (before === 'grazing' && this.activity.name !== 'grazing' && this.meal) {
      this.bus.emit('food:eaten', {
        who: PLAYER,
        kind: this.meal.food.kind,
        first: this.meal.first,
        full: this.feelings.values.hunger < GRAZE.full,
        patchId: this.meal.food.id,
        cleared: this.meal.food.amount <= 0,
      });
      this.meal = null;
    }
    return food !== null && eating;
  }

  /**
   * Ribbons: all four kinds while sensing; food alone, faint and close, when
   * hungry (doc 10, "Hunger").
   */
  private showScent(dt: number): void {
    const { x, y } = this.motion;
    const bl = this.bodyLengthPx;
    let shown: { ribbon: Ribbon; alpha: number }[] = [];
    if (this.activity.name === 'sensing') {
      const range = this.discovery.range * bl;
      const unknown = this.things
        .filter((thing) => thing.kind !== 'food' && !this.discovery.known.has(thing.id))
        .map((thing, index) => ({ id: `${thing.id}#${index}`, x: thing.x, y: thing.y }));
      // The pinned challenge's target has a white ribbon too (doc 12, "Pinning").
      const pinned = this.pinnedTarget();
      const found = ribbons(
        x,
        y,
        { foods: this.patches, shrimp: this.shoal.sources, dangers: [], unknown, pinned },
        range,
        SENSE,
      );
      this.memory.shown(found, this.clock);
      shown = found.map((ribbon) => ({ ribbon, alpha: ribbon.strength }));
    } else if (this.feelings.values.hunger >= MOOD.hungry.enter) {
      const near = ribbons(
        x,
        y,
        { foods: this.patches, shrimp: [], dangers: [], unknown: [] },
        SENSE.hungryReach * bl,
        SENSE,
      );
      shown = near.map((ribbon) => ({ ribbon, alpha: ribbon.strength * SENSE.hungryStrength }));
    }
    this.scent.update(dt, x, y, shown);
  }

  /** What the story needs from this frame, and the narration's own step. */
  private tellStory(dt: number): void {
    const teller = this.teller;
    if (teller) {
      const { x, y } = this.motion;
      const has = this.feelings.has.bind(this.feelings);
      let nearest = Infinity;
      for (const other of this.shoal.greetable) {
        nearest = Math.min(nearest, Math.hypot(other.x - x, other.y - y) / this.bodyLengthPx);
      }
      teller.update({
        dt,
        hunger: this.feelings.values.hunger,
        mood: this.feelings.mood,
        sensing: this.activity.name === 'sensing',
        tucked: this.activity.tucked,
        wary: has('wary'),
        tired: this.motion.tired,
        frozen: has('frozen'),
        veryHungry: has('veryHungry'),
        visit: this.threats.director.stage !== 'idle',
        nearestShrimp: nearest,
        atWayOut: !this.leaving && (this.area.exits ?? []).some((exit) => inRect(x, y, exit.zone)),
        premolt: this.molting.molt.premolt,
        shoalNear: this.shoal.near(x, y, STORY.shoalNear * this.bodyLengthPx),
        burrowed: this.activity.name === 'burrowing' && this.activity.tucked,
        softNotAlone:
          this.molting.molt.stage === 'soft' && this.shoal.companionNear(x, y, NPC.molt.stay),
        herSoft: this.shoal.softStaying ? t(`companion.${this.shoal.softStaying}.name`) : null,
      });
      if (teller.takeMoltDue()) this.answerMolt(this.molting.signal());
    }
    this.narrator?.update(dt);
  }

  /**
   * "Hold E to graze" when a graze could start, "F to greet" when another
   * shrimp is close enough, the first three times each (doc 03). In the
   * story, "Hold Q to sense the water" comes with the Sense hint.
   */
  private showPrompt(own: { x: number; y: number }, locked: boolean): void {
    let key: string | null = null;
    let action: 'interact' | 'greet' | 'sense' | 'hide' = 'interact';
    const { x, y } = this.motion;
    // Tucked or dug in by day, calm: the rest can be chosen.
    if (!locked && this.mayRest()) {
      key = 'prompt.rest';
    } else if (
      !locked &&
      this.activity.name === 'free' &&
      this.teller?.wantsBurrow &&
      this.activity.canBurrow(x, y, this.loaded.covers, this.area.sand === true)
    ) {
      // The story's sand line brings its prompt, until the shrimp first digs in.
      key = 'prompt.burrow';
      action = 'hide';
    } else if (!locked && this.activity.name === 'free' && this.teller?.wantsSense) {
      // The story's Sense hint brings its prompt, until Sense is used.
      key = 'prompt.sense';
      action = 'sense';
    } else if (!locked && this.activity.name === 'free' && own.x === 0 && own.y === 0) {
      const input = this.activityInput(0, own, false);
      const food = this.activity.grazeable(input, this.patches);
      if (food) {
        const full = this.feelings.values.hunger < GRAZE.full;
        key = full ? 'prompt.taste' : 'prompt.graze';
      } else if (this.activity.greetable(this.motion.x, this.motion.y, this.shoal.greetable)) {
        key = 'prompt.greet';
        action = 'greet';
      } else if (
        this.shoal.anyCompanion &&
        !this.shoal.companionNear(this.motion.x, this.motion.y)
      ) {
        key = 'prompt.call';
        action = 'greet';
      }
    }
    if (key !== this.promptNow) {
      if (key !== null) {
        const shown = this.life.promptsShown;
        const times = shown[key] ?? 0;
        if (times >= 3) key = null;
        else shown[key] = times + 1;
      }
      this.promptNow = key;
      this.hud?.prompt(key === null ? null : t(key, { key: app.actionKey(action) }));
    }
  }

  /** One step of the feelings, in the same loop as the motion (doc 15, "One clock"). */
  private stepFeelings(dt: number, moving: boolean): void {
    const { x, y } = this.motion;
    for (const id of this.discovery.step(dt, x, y, this.things)) this.found(id);
    const pinned = this.pinnedTarget();
    this.pull = this.discovery.pull(
      x,
      y,
      this.things,
      pinned ? { thing: pinned, weight: CURIOSITY.pinned } : null,
    );

    const context: FeelingsContext = {
      motion: this.motion.mode,
      activity: this.activity.name,
      hidden: this.activity.tucked,
      nearCover: this.activity.canHide(x, y, this.loaded.covers),
      moving,
      tired: this.motion.tired,
      // Threats, currents and the day come in later steps.
      neighbours: this.shoal.neighbours(x, y),
      companionWithin2: this.shoal.companionNear(x, y),
      restingAgainstClose: this.shoal.restingAgainstClose(x, y),
      curiosityPull: this.pull.value,
      threat: this.threats.view(x, y, true),
      inCurrent: false,
      dayPhase: this.day?.phase ?? null,
    };
    this.report(this.feelings.step(dt, context));
  }

  /** One step of the molt: its phases, and the body backing out of the old shell. */
  private stepMolt(dt: number): void {
    const { events, back } = this.molting.step(dt, this.activity.tucked, this.motion);
    if (back > 0) {
      const heading = this.motion.heading;
      const after = this.mover(
        this.motion.x,
        this.motion.y,
        -Math.cos(heading) * back,
        -Math.sin(heading) * back,
      );
      this.motion.x = after.x;
      this.motion.y = after.y;
    }
    this.answerMolt(events);
    // The view eases out as the new shell hardens (doc 10, "Molting").
    const hardening = this.molting.molt.hardening;
    if (hardening > 0) {
      const by = MOLT.viewByMolts;
      const molts = this.life.molts;
      const ratio = (by[molts + 1] ?? by[by.length - 1] ?? 1) / (by[molts] ?? 1);
      this.viewScale = this.viewFrom * (1 + (ratio - 1) * hardening);
    }
  }

  /** What each phase of the molt does to the feelings, the story and the body. */
  private answerMolt(events: readonly MoltEvent[]): void {
    for (const event of events) {
      if (event.type === 'done') {
        this.life.molts += 1;
        this.viewFrom = this.viewScale;
        this.bus.emit('molt:done', { who: PLAYER, molts: this.life.molts });
        // A companion close by as the shell comes off stays in the journal.
        for (const id of this.shoal.companionsNear(this.motion.x, this.motion.y)) {
          this.keeper.count(`softWith.${id}`);
        }
        continue;
      }
      const phase = event.phase;
      this.feelings.setPremolt(phase === 'signal' || phase === 'shelter');
      if (phase === 'molt' || phase === 'soft') {
        // Tucked in for the molt, and still tucked in when it ends, until the player moves.
        const cover = this.activity.cover;
        if (cover) this.activity.tuckInto(cover, { x: this.motion.x, y: this.motion.y });
      }
      if (phase === 'soft') this.feelings.setSoft(MOLT.soft);
      if (phase === 'hardened') this.feelings.hungerUp(MOLT.hunger);
      if (phase !== 'none' && phase !== 'hardened') {
        this.bus.emit('molt:phase', { who: PLAYER, phase });
      }
      this.teller?.moltPhase(phase);
    }
  }

  /** What the threat director needs from the player on this step. */
  private threatPlayer(darted: boolean) {
    const { x, y } = this.motion;
    let coverGap = Infinity;
    let underCover = false;
    for (const cover of this.loaded.covers) {
      coverGap = Math.min(coverGap, distanceToCover(x, y, cover));
      if (isUnder(x, y, cover)) underCover = true;
    }
    return {
      x,
      y,
      vx: this.motion.vx,
      vy: this.motion.vy,
      mode: this.motion.mode,
      hidden: this.activity.tucked,
      underCover,
      darted,
      // No threat may start from the shelter of a molt until the shell is hard, a companion's too.
      soft: this.feelings.has('soft') || this.molting.molt.guarded || this.shoal.moltGuarded,
      // On sand, shelter is everywhere: the shrimp can dig in where it is.
      coverGap: this.area.sand ? 0 : coverGap / this.bodyLengthPx,
      shoal: this.shoal.middleNear(x, y, FISH.sight * this.bodyLengthPx),
      sinceFlip: this.clock - this.lastFlip,
    };
  }

  /** What the scene does when the threat moves on. */
  private answerThreat(events: readonly ThreatEvent[]): void {
    for (const event of events) {
      if (event.type === 'stage') {
        this.bus.emit('threat:stage', { kind: event.kind, stage: event.stage });
        if (event.stage === 'release') this.loseFromShoal(event.kind);
        // At the cue, the crabs go down and the schools burst; Nacre notices first.
        if (event.stage === 'cue') {
          // The bird's shadow passes over the player; the fish is felt before it is seen.
          const shadow =
            event.kind === 'fish'
              ? { x: this.motion.x, y: this.motion.y }
              : this.threats.director.shadow;
          this.creatures.cue(shadow.x, shadow.y);
          if (this.shoal.cueNoticed(this.clock, this.motion.x, this.motion.y)) {
            this.feelings.stimulus('alarm');
            this.alarmedBy('nacre');
            this.teller?.nacreAlarm();
          }
        }
      } else if (event.type === 'strike') {
        this.bus.emit('threat:strike', {
          kind: this.threats.director.kind ?? 'bird',
          hit: event.hit,
        });
        if (event.hit) this.threats.cornered.start();
      } else if (event.type === 'faced') {
        this.teller?.fishFaced();
      } else if (event.type === 'escaped') {
        this.bus.emit('threat:escaped', {
          kind: event.kind,
          clean: event.clean,
          still: event.still,
        });
        for (const id of this.shoal.escapedTogether(this.motion.x, this.motion.y)) {
          this.keeper.count(`fledWith.${id}.${event.kind}`);
        }
      }
    }
  }

  /**
   * The day moves on, and is drawn: the veils of dusk and night, the
   * caustics, the plankton lit in the wake of whatever moves.
   */
  private stepDay(frame: number): void {
    const day = this.day;
    const drawn = this.dayNight;
    if (!day || !drawn) return;
    this.shoal.dayPhase = day.phase;
    // Calm, tucked or dug in, for "Rest until dusk".
    const calm = this.activity.tucked && this.feelings.values.fear < REST.fear;
    this.calmTucked = calm ? this.calmTucked + frame : 0;
    const resting = this.activity.name === 'resting';
    if (!resting) this.restingToDusk = false;
    this.answerDay(day.step(frame * (this.restingToDusk ? REST.speed : 1)));
    const movers = [{ id: 'player', x: this.motion.x, y: this.motion.y }, ...this.shoal.greetable];
    drawn.update(frame, day.light, this.cameras.main.worldView, movers);
    // The first time the water lights up in the shrimp's own wake.
    if (drawn.glowingByPlayer && this.discovery.add('thing.glowingPlankton')) {
      this.found('thing.glowingPlankton');
      this.teller?.glowed();
    }
  }

  /**
   * As a threat leaves, an unnamed shrimp out of view may be gone (doc 10,
   * "Losses", D42). Nothing is shown. The count is kept, so it stays gone.
   */
  private loseFromShoal(kind: ThreatKind): void {
    const ids = pickMissing(
      kind,
      this.shoal.lossCandidates(this.cameras.main.worldView),
      { x: this.motion.x, y: this.motion.y },
      this.bodyLengthPx,
      this.lossRandom,
      LOSSES,
    );
    if (ids.length === 0) return;
    this.shoal.remove(ids);
    for (let index = 0; index < ids.length; index++) {
      this.keeper.count('missing');
      this.keeper.count(`missing.${this.areaId}`);
    }
    this.teller?.lost();
  }

  /** The fish of the story's dawn, from where the area says it comes. */
  private callDawnFish(): void {
    const origin = (this.area.creatures ?? []).find((one) => one.kind === 'huntingFish');
    const { x, y } = this.motion;
    const from = origin ? Math.atan2(origin.y - y, origin.x - x) : Math.PI;
    this.threats.dawnFish(from);
  }

  /** What a new phase of the day changes: the odds of a threat, the story, the journal. */
  private answerDay(begun: readonly DayPhase[]): void {
    const day = this.day;
    if (!day) return;
    const effects = DAY.effects;
    const phase = day.phase;
    this.threats.director.ambientFactor =
      phase === 'night' ? effects.nightThreats : phase === 'dawn' ? effects.dawnThreats : 1;
    for (const one of begun) {
      this.bus.emit('day:phase', { phase: one });
      this.teller?.dayPhase(one, this.activity.tucked);
      // At dawn in the story, the fish comes in from the pass.
      if (one === 'dawn' && this.teller?.wantsDawnFish) this.callDawnFish();
      // Dusk wakes a shrimp resting until it.
      if (one === 'dusk' && this.activity.name === 'resting') {
        this.activity.wake();
        this.restingToDusk = false;
      }
    }
  }

  /** The debug key: the next phase of the day at once. */
  private nextTime(): void {
    const day = this.day;
    if (!day) return;
    const phase = day.skipTo(nextPhase(day.phase));
    if (phase) this.answerDay([phase]);
  }

  /**
   * In the story, a way out that is open leads on to the next place, when
   * that place exists: the view fades and the life goes on there.
   */
  private leaveBy(): void {
    if (this.explore || this.leaving) return;
    const { x, y } = this.motion;
    const exit = (this.area.exits ?? []).find(
      (one) =>
        inRect(x, y, one.zone) &&
        isPlayableArea(one.to) &&
        (one.needsStep === undefined || this.life.stepsDone.has(one.needsStep)),
    );
    if (!exit || !isPlayableArea(exit.to)) return;
    const to = exit.to;
    this.leaving = true;
    this.leavingTo = to;
    const camera = this.cameras.main;
    camera.fadeOut(STORY.leaveFade * 1000, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: PlayData = { area: to, life: this.life, arriving: true };
      this.scene.restart(data);
    });
  }

  /** Cornered: the body flips away from the bird. A tail flip goes backward, so it faces the bird first. */
  private flipAway(): boolean {
    const danger = this.threats.danger;
    this.motion.heading = Math.atan2(danger.y - this.motion.y, danger.x - this.motion.x);
    return true;
  }

  /** Cornered, in the dark: the shrimp wakes tucked in the nearest safe shelter. */
  private wake(): void {
    const shelter = this.threats.shelter({ x: this.motion.x, y: this.motion.y });
    this.motion.x = shelter.x;
    this.motion.y = shelter.y;
    this.motion.vx = 0;
    this.motion.vy = 0;
    this.motion.speed = 0;
    if (shelter.cover) this.activity.tuckInto(shelter.cover, shelter);
    this.view = { x: shelter.x, y: shelter.y };
    this.lead = { x: 0, y: 0 };
    this.aim();
  }

  private report(change: FeelingsChange): void {
    if (change.mood) {
      this.bus.emit('mood:changed', { who: PLAYER, ...change.mood });
      this.presenter.moodChanged(change.mood.to);
      if (change.mood.to === 'afraid') {
        this.shoal.playerAfraid(this.clock, this.motion.x, this.motion.y);
      }
    }
    for (const { condition, on } of change.conditions) {
      this.bus.emit('condition:changed', { who: PLAYER, condition, on });
    }
  }

  /** A named shrimp's fright reached the player: its caption (doc 10, "Alarm"). */
  private alarmedBy(id: string): void {
    const key = `companion.${id}.name`;
    if (i18n.has(key)) this.audio.alarmed(t(key));
  }

  private found(id: string): void {
    this.feelings.stimulus('discovery');
    this.bus.emit('discovery', { id });
  }

  /** Zones entered on this frame, and the places found by entering them. */
  private enterZones(): void {
    const { entered } = this.zones.update(this.motion.x, this.motion.y);
    for (const id of entered) {
      const zone = this.loaded.zones.find((spot) => spot.id === id);
      if (zone?.discovery && this.discovery.add(zone.discovery)) this.found(zone.discovery);
    }
  }

  /** How the body holds itself: the mood, the conditions, and what it looks at. */
  private feel(eating: boolean) {
    const feelings = this.feelings;
    const mood = feelings.mood;
    const has = feelings.has.bind(feelings);
    let target: { x: number; y: number } | null = null;
    // Greeting: antennae reach toward the other shrimp, as a social shrimp's do.
    const greeting = this.activity.name === 'greeting';
    if (greeting) target = this.shoal.where(this.activity.with ?? '');
    else if (mood === 'curious') target = this.pull.target;
    else if (mood === 'social') target = this.nearestShrimp();
    else if (has('veryHungry')) target = this.nearestFood();
    const sensing = this.activity.name === 'sensing';
    const shown = greeting ? 'social' : mood;
    return {
      expression: withActivity(withConditions(MOOD_EXPRESSIONS[shown], has), sensing),
      afraid: mood === 'afraid',
      target,
      startled: has('startled'),
      grazing: eating,
      wiggle: this.wiggleLeft > 0 ? 1 - this.wiggleLeft / GRAZE.wiggle : null,
      arch: this.molting.molt.arch,
      scratch: this.molting.molt.scratching,
    };
  }

  /** The pictures of what the shrimp is curious about, while it is curious (doc 10, "Screen"). */
  private rimmed(): Phaser.GameObjects.Image[] {
    const target = this.feelings.mood === 'curious' ? this.pull.target : null;
    if (!target) return [];
    if (target.ref) return this.creatures.imagesOf(target.ref);
    const spot = this.loaded.spots.find(
      (one) => one.id === target.id && one.x === target.x && one.y === target.y,
    );
    return spot?.images ?? [];
  }

  /** The nearest other shrimp within the company radius, for a social shrimp's antennae. */
  private nearestShrimp(): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestDistance = 4 * this.bodyLengthPx;
    for (const other of this.shoal.greetable) {
      const distance = Math.hypot(other.x - this.motion.x, other.y - this.motion.y);
      if (distance < bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** The nearest food within the Sense range, for a very hungry shrimp to lean toward. */
  private nearestFood(): { x: number; y: number } | null {
    const reach = this.discovery.range * this.bodyLengthPx;
    let best: { x: number; y: number } | null = null;
    let bestDistance = reach;
    for (const food of this.patches) {
      if (food.amount <= 0) continue;
      const distance = Math.hypot(food.x - this.motion.x, food.y - this.motion.y);
      if (distance < bestDistance) {
        best = food;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** The debug key: calm, hungry, content, curious, social, afraid, then the feelings again. */
  private cycleMood(): void {
    const forced = this.feelings.forcedMood;
    const index = forced === null ? 0 : MOODS.indexOf(forced) + 1;
    const next: Mood | null = index < MOODS.length ? (MOODS[index] ?? null) : null;
    this.feelings.force(next);
    this.presenter.moodChanged(this.feelings.mood);
  }

  private openPause(): void {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause');
  }

  /**
   * Where the pinned challenge leads, if it has a place in this area and is
   * not done: the nearest animal of its kind, or its landmark.
   */
  private pinnedTarget(): Discoverable | null {
    const id = this.life.pinned;
    if (!id || this.keeper.progress.isDone(id)) return null;
    const target = CHALLENGE_TARGETS[id];
    if (!target) return null;
    const { x, y } = this.motion;
    if ('creature' in target) {
      const near = this.creatures.nearest(target.creature, x, y);
      return near ? { id: `pinned.${id}`, kind: 'creature', x: near.x, y: near.y } : null;
    }
    const thing = this.things.find((one) => one.id === target.discovery);
    return thing ? { id: `pinned.${id}`, kind: thing.kind, x: thing.x, y: thing.y } : null;
  }

  /** The journal, over the paused game (doc 12, "The journal"). */
  private openJournal(): void {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Journal', { game: 'Play', from: 'game' });
  }

  journalLife() {
    return { life: this.life, area: this.areaId, unreleased: debugRequested() };
  }

  /** The view trails the shrimp a little and looks slightly ahead of it. */
  private follow(dt: number): void {
    const motion = this.motion;
    const max = CAMERA.lookAheadMax * this.bodyLengthPx;
    let leadX = motion.vx * CAMERA.lookAheadTime;
    let leadY = motion.vy * CAMERA.lookAheadTime;
    const length = Math.hypot(leadX, leadY);
    if (length > max) {
      leadX *= max / length;
      leadY *= max / length;
    }
    // The lead itself moves slowly, so a dart does not jerk the view.
    const ease = approach(dt, 0.45);
    this.lead.x += (leadX - this.lead.x) * ease;
    this.lead.y += (leadY - this.lead.y) * ease;

    const lean = this.presenter.lean;
    const follow = approach(dt, CAMERA.followTime);
    this.view.x += (motion.x + this.lead.x + lean.x - this.view.x) * follow;
    this.view.y += (motion.y + this.lead.y + lean.y - this.view.y) * follow;

    this.aim();
  }

  /** Point the camera at the view, kept inside the area, and lay the bed under it. */
  private aim(): void {
    // Fear zooms in a little (MoodPresenter).
    const zoom = CAMERA.zoom * this.presenter.zoom * this.viewScale;
    this.cameras.main.setZoom(zoom);
    const halfW = GAME_WIDTH / zoom / 2;
    const halfH = GAME_HEIGHT / zoom / 2;
    const { w, h } = this.area.size;
    this.view.x = Phaser.Math.Clamp(this.view.x, halfW, Math.max(halfW, w - halfW));
    this.view.y = Phaser.Math.Clamp(this.view.y, halfH, Math.max(halfH, h - halfH));
    this.cameras.main.centerOn(this.view.x, this.view.y);

    // The bed is one repeating image the size of the view. It moves with the
    // view and its pattern is slid the other way, so the sand stays put.
    const left = this.view.x - halfW - 2;
    const top = this.view.y - halfH - 2;
    this.loaded.placeGround(left, top);
    this.light.update(this.game.loop.delta / 1000, left, top, this.motion.x, this.motion.y);
  }
}

/**
 * How many ambient threats may come in the story (doc 10, "When a threat
 * starts"). The mangrove has none before the first bird and one after it.
 * The lagoon has none before the dawn fish, then any.
 */
function ambientInStory(area: string, done: ReadonlySet<string>): number | undefined {
  if (area === 'mangrove') return done.has('s1.bird') ? 1 : 0;
  if (area === 'lagoon') return done.has('s2.fish') ? undefined : 0;
  return undefined;
}
