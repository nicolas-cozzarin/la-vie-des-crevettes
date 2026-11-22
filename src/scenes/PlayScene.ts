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
import type { GameEvents } from '../core/gameEvents';
import { approach, rotateToward } from '../core/movement/angles';
import { moveCircle, type Bounds } from '../core/movement/collision';
import { seededRandom } from '../core/random';
import { RibbonMemory, ribbons, type Ribbon } from '../core/scent/ribbons';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import type { ThreatEvent } from '../core/threat/ThreatDirector';
import { distanceToCover, isUnder } from '../core/world/cover';
import { DiscoveryTracker, type Discoverable, type Pull } from '../core/world/discovery';
import { FOOD_KINDS, type FoodKind } from '../core/world/kinds';
import { inRect, ZoneTracker } from '../core/world/zones';
import { newLife, type Life } from '../core/progress/life';
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
  CAMERA,
  CURIOSITY,
  FEELINGS,
  FRAME,
  GRAZE,
  GREET,
  HIDE,
  HUNGER,
  MOOD,
  MOOD_SCREEN,
  MOTION,
  SENSE,
} from '../data/tuning';
import { debugState } from '../debug';
import { ShrimpRig } from '../entities/ShrimpRig';
import { t } from '../i18n';
import { debugRequested } from '../platform/address';
import { loadArea, type CoverHandle, type LoadedArea } from '../systems/AreaLoader';
import { Creatures, LIVE_KINDS } from '../systems/Creatures';
import { MoodPresenter } from '../systems/MoodPresenter';
import { Rim } from '../systems/Rim';
import { Narrator } from '../systems/Narrator';
import { StoryTeller } from '../systems/StoryTeller';
import { Threats } from '../systems/Threats';
import { ScentField } from '../systems/ScentField';
import { Shoal } from '../systems/Shoal';
import { WaterLight } from '../systems/WaterLight';
import type { HudScene } from './HudScene';

export interface PlayData {
  area?: string;
  /** Opened by `?explore=`: one place, no story. */
  explore?: boolean;
  /** Explore mode only: where to start instead of the area's spawn. */
  at?: { x: number; y: number };
  /** The life so far, from the place before. A new one when left out. */
  life?: Life;
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
export class PlayScene extends Phaser.Scene {
  private areaId: PlayableArea = FIRST_AREA;
  private explore = false;
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
  /** How many times each prompt has shown, and the one showing now. */
  private prompts = new Map<string, number>();
  private promptNow: string | null = null;

  /** The other shrimp, and the player's bonds with them. Bonds last as long as the scene until saving (step 9). */
  private bonds!: Bonds;
  private shoal!: Shoal;
  /** How much brighter the other shrimp are drawn while the player is social (doc 10, "Screen"). */
  private lift = 0;
  /** The crabs, snails and fish that move, and the pale rim on what the shrimp is curious about. */
  private creatures!: Creatures;
  private rim!: Rim;
  /** The bird and what it does, and the cornered sequence (step 7). */
  private threats!: Threats;

  private hud: HudScene | null = null;

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
    this.start = this.explore && data.at ? pointFor(this.areaId, data.at.x, data.at.y) : null;
    this.life = data.life ?? newLife();
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
    this.activity = new Activity<CoverHandle, FoodPatch>(HIDE, this.bodyLengthPx, GRAZE, GREET);
    this.zones = new ZoneTracker(this.loaded.zones);
    this.light = new WaterLight(this, area.light);

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
    this.prompts = new Map();
    this.promptNow = null;

    // Other shrimp. From chapter 2 they keep together as a shoal.
    this.bonds = new Bonds(BOND);
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
    });
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
      armed: story ? (id) => id !== 'bird.first' || life.stepsDone.has('s1.sense') : undefined,
      ambient: story ? (life.stepsDone.has('s1.bird') ? 1 : 0) : undefined,
    });
    this.shoal.watch(this.threats);
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

    this.scene.launch('Hud');
    this.hud = this.scene.get('Hud') as HudScene;

    // The story of this place, told one line at a time.
    this.narrator = null;
    this.teller = null;
    if (story) {
      const narrator = new Narrator(() => this.hud, life.narrated, life.placesSeen);
      this.narrator = narrator;
      this.teller = new StoryTeller(this.bus, narrator, life, this.areaId, this.favourite);
      this.bus.on('step:done', ({ id }) => {
        if (id === 's1.bird') this.threats.director.ambientLeft = 1;
      });
      narrator.enter(this.areaId);
      narrator.say('narr.c1.arrive');
    }

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
    });
    debugState.scent = () => this.scent.snapshot;
    debugState.shrimp = () => this.shoal.snapshot;
    debugState.creatures = () => ({ animals: this.creatures.snapshot, rim: this.rim.snapshot });
    debugState.threat = () => this.threats.snapshot;
    debugState.feelings = () => ({
      values: { ...this.feelings.values },
      mood: this.feelings.mood,
      forced: this.feelings.forcedMood,
      conditions: this.feelings.conditionList,
      waryLeft: this.feelings.waryRemaining,
      discovered: [...this.discovery.known],
      curiousAbout: this.pull.target?.id ?? null,
    });

    // `?debug`: a key cycles the forced mood, to look at each one.
    // F10 calls the bird at once.
    const stopDebug = debugRequested()
      ? app.keyboard.onDebugKey((key) => {
          if (key === 'mood') this.cycleMood();
          else this.threats.callBird();
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
      this.life.hunger = this.feelings.values.hunger;
      this.teller?.destroy();
      this.narrator?.clear();
      this.threats.destroy();
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

    // A slow frame is played as several short steps, so the shrimp covers the
    // same ground whatever the frame rate.
    const frame = Math.min(deltaMs / 1000, FRAME.longest);
    // Cornered: the body moves by itself and the keys do nothing until it wakes.
    const locked = this.threats.cornered.running;
    const sequence = this.threats.cornered.update(frame);
    const own = locked ? { x: 0, y: 0 } : actions.axis();
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
      for (let alarm = this.shoal.takeAlarms().length; alarm > 0; alarm--) {
        this.feelings.stimulus('alarm');
      }
      this.stepFeelings(dt, axis.x !== 0 || axis.y !== 0 || dart);
      this.shoal.step(dt, this.clock, {
        x: this.motion.x,
        y: this.motion.y,
        heading: this.motion.heading,
        mode: this.motion.mode,
        activity: this.activity.name,
        under: this.activity.tucked ? this.activity.cover : null,
        eating,
      });
      const moved = this.motion.step(dt, { x: axis.x, y: axis.y, dart }, this.mover);
      if (moved.darted) {
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
    this.threats.enter(this.motion.x, this.motion.y);
    this.threats.draw(frame);
    this.loaded.update(frame, this.motion.x, this.motion.y);
    this.creatures.update(frame, this.motion);
    this.rim.set(this.rimmed());
    this.rim.update(frame);
    for (const [patch, image] of this.foodImages) image.setAlpha(0.15 + 0.85 * patch.amount);
    this.wiggleLeft = Math.max(0, this.wiggleLeft - frame);
    this.rig.update(frame, this.motion, this.feel(eating));
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
    this.follow(frame);
    this.hud?.track(frame, own.x !== 0 || own.y !== 0, darted && !locked);
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
      hide: held('hide'),
      interact: held('interact'),
      sense: held('sense'),
      tailFlip: dart,
      axis: own,
      hunger: this.feelings.values.hunger,
      fear: this.feelings.values.fear,
      tasted: (kind: FoodKind) => this.discovery.known.has(`food.${kind}`),
      greet: held('greet'),
      others: this.shoal.greetable,
    };
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
      this.feelings.eat(food.graze(dt));
    }
    if (before === 'grazing' && this.activity.name !== 'grazing' && this.meal) {
      this.bus.emit('food:eaten', {
        who: PLAYER,
        kind: this.meal.food.kind,
        first: this.meal.first,
        full: this.feelings.values.hunger < GRAZE.full,
        patchId: this.meal.food.id,
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
      const found = ribbons(
        x,
        y,
        { foods: this.patches, shrimp: this.shoal.sources, dangers: [], unknown },
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
        atWayOut: (this.area.exits ?? []).some((exit) => inRect(x, y, exit.zone)),
      });
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
    let action: 'interact' | 'greet' | 'sense' = 'interact';
    // The story's Sense hint brings its prompt, until Sense is used.
    if (!locked && this.activity.name === 'free' && this.teller?.wantsSense) {
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
        const times = this.prompts.get(key) ?? 0;
        if (times >= 3) key = null;
        else this.prompts.set(key, times + 1);
      }
      this.promptNow = key;
      this.hud?.prompt(key === null ? null : t(key, { key: app.actionKey(action) }));
    }
  }

  /** One step of the feelings, in the same loop as the motion (doc 15, "One clock"). */
  private stepFeelings(dt: number, moving: boolean): void {
    const { x, y } = this.motion;
    for (const id of this.discovery.step(dt, x, y, this.things)) this.found(id);
    this.pull = this.discovery.pull(x, y, this.things);

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
      restingAgainstClose: false,
      curiosityPull: this.pull.value,
      threat: this.threats.view(x, y, true),
      inCurrent: false,
      dayPhase: null,
    };
    this.report(this.feelings.step(dt, context));
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
      soft: this.feelings.has('soft'),
      coverGap: coverGap / this.bodyLengthPx,
    };
  }

  /** What the scene does when the threat moves on. */
  private answerThreat(events: readonly ThreatEvent[]): void {
    for (const event of events) {
      if (event.type === 'stage') {
        this.bus.emit('threat:stage', { kind: event.kind, stage: event.stage });
        // At the cue, the crabs go down and the schools burst; Nacre notices first.
        if (event.stage === 'cue') {
          const shadow = this.threats.director.shadow;
          this.creatures.cue(shadow.x, shadow.y);
          if (this.shoal.cueNoticed(this.clock, this.motion.x, this.motion.y)) {
            this.feelings.stimulus('alarm');
          }
        }
      } else if (event.type === 'strike') {
        this.bus.emit('threat:strike', {
          kind: this.threats.director.kind ?? 'bird',
          hit: event.hit,
        });
        if (event.hit) this.threats.cornered.start();
      } else if (event.type === 'escaped') {
        this.bus.emit('threat:escaped', {
          kind: event.kind,
          clean: event.clean,
          still: event.still,
        });
        this.shoal.escapedTogether(this.motion.x, this.motion.y);
      }
    }
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
    const zoom = CAMERA.zoom * this.presenter.zoom;
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
