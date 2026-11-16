import Phaser from 'phaser';
import { app } from '../app';
import { MOOD_EXPRESSIONS, STAGE_LOOKS, withConditions } from '../art/expressions';
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Activity } from '../core/activity/Activity';
import { EventBus } from '../core/events';
import { FeelingsModel, type FeelingsChange } from '../core/feelings/FeelingsModel';
import { MOODS, type Mood } from '../core/feelings/mood';
import type { FeelingsContext } from '../core/feelings/types';
import type { GameEvents } from '../core/gameEvents';
import { approach } from '../core/movement/angles';
import { moveCircle, type Bounds } from '../core/movement/collision';
import { ShrimpMotion, type Mover } from '../core/movement/ShrimpMotion';
import { DiscoveryTracker, type Discoverable, type Pull } from '../core/world/discovery';
import { ZoneTracker } from '../core/world/zones';
import {
  areaFor,
  FIRST_AREA,
  isPlayableArea,
  pointFor,
  STAGE_IN,
  type PlayableArea,
} from '../data/areas';
import type { AreaDef } from '../data/areas/types';
import { CAMERA, CURIOSITY, FEELINGS, FRAME, HIDE, HUNGER, MOOD, MOTION } from '../data/tuning';
import { debugState } from '../debug';
import { ShrimpRig } from '../entities/ShrimpRig';
import { t } from '../i18n';
import { debugRequested } from '../platform/address';
import { loadArea, type CoverHandle, type LoadedArea } from '../systems/AreaLoader';
import { MoodPresenter } from '../systems/MoodPresenter';
import { WaterLight } from '../systems/WaterLight';
import type { HudScene } from './HudScene';

export interface PlayData {
  area?: string;
  /** Opened by `?explore=`: one place, no story. */
  explore?: boolean;
  /** Explore mode only: where to start instead of the area's spawn. */
  at?: { x: number; y: number };
}

/** The player's shrimp on the event bus. */
const PLAYER = 'player';

/**
 * The things of an area the shrimp can come to know: its creatures, and the
 * landmarks and covers that have a journal entry. Foods join in step 5, when
 * they can be tasted.
 */
function discoverables(area: AreaDef): Discoverable[] {
  const things: Discoverable[] = [];
  for (const creature of area.creatures ?? []) {
    things.push({
      id: `creature.${creature.kind}`,
      kind: 'creature',
      x: creature.x,
      y: creature.y,
    });
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
  private activity!: Activity<CoverHandle>;
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

  private hud: HudScene | null = null;

  constructor() {
    super('Play');
  }

  init(data: PlayData): void {
    this.areaId = data.area !== undefined && isPlayableArea(data.area) ? data.area : FIRST_AREA;
    this.explore = data.explore === true;
    this.start = this.explore && data.at ? pointFor(this.areaId, data.at.x, data.at.y) : null;
  }

  create(): void {
    const area = areaFor(this.areaId);
    this.area = area;
    const bounds: Bounds = { x: 0, y: 0, w: area.size.w, h: area.size.h };

    this.loaded = loadArea(this, area);
    this.bodyLengthPx = this.loaded.bodyLengthPx;
    const obstacles = this.loaded.obstacles;

    const spawn = this.start ? { ...area.spawn, ...this.start } : area.spawn;
    this.motion = new ShrimpMotion({ ...MOTION, bodyLengthPx: this.bodyLengthPx }, spawn);
    this.mover = (x, y, dx, dy) =>
      moveCircle(x, y, dx, dy, this.motion.radiusPx, obstacles, bounds);
    const stage = STAGE_IN[this.areaId];
    this.rig = new ShrimpRig(this, this.bodyLengthPx, DEPTH.bedAnimals, STAGE_LOOKS[stage]);
    this.rig.update(0, this.motion);
    this.activity = new Activity<CoverHandle>(HIDE, this.bodyLengthPx);
    this.zones = new ZoneTracker(this.loaded.zones);
    this.light = new WaterLight(this, area.light);

    // Feelings. What is found lives only as long as the scene until saving
    // comes in step 9.
    this.bus = new EventBus<GameEvents>();
    const hunger = (HUNGER.start as Record<string, number>)[area.id] ?? HUNGER.start.other;
    this.feelings = new FeelingsModel(FEELINGS, MOOD, { hunger });
    const range = stage === 'larva' ? CURIOSITY.range.juvenile : CURIOSITY.range[stage];
    this.discovery = new DiscoveryTracker(
      { range, weights: CURIOSITY.weights, find: CURIOSITY.find },
      this.bodyLengthPx,
    );
    this.things = discoverables(area);
    this.pull = { value: 0, target: null };
    this.enterZones();

    const camera = this.cameras.main;
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
    const stopDebug = debugRequested() ? app.keyboard.onDebugKey(() => this.cycleMood()) : null;

    // If the tab loses focus, the game pauses.
    const stopBlur = app.keyboard.onBlur(() => this.openPause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopBlur();
      stopDebug?.();
      this.bus.clear();
      debugState.player = null;
      debugState.feelings = null;
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
    const own = actions.axis();
    const tailFlip = actions.justPressed('tailFlip');
    let dart = tailFlip;
    let darted = false;
    let remaining = frame;
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, FRAME.step);
      // Hiding walks the body in by itself; otherwise the player's own direction.
      const { axis } = this.activity.update(
        {
          dt,
          x: this.motion.x,
          y: this.motion.y,
          hide: actions.isDown('hide'),
          tailFlip: dart,
          axis: own,
        },
        this.loaded.covers,
      );
      this.stepFeelings(dt, axis.x !== 0 || axis.y !== 0 || dart);
      const result = this.motion.step(dt, { x: axis.x, y: axis.y, dart }, this.mover);
      if (result.darted) {
        this.feelings.stimulus('tailFlip');
        this.bus.emit('tailflip', { who: PLAYER });
      }
      darted = darted || result.darted;
      dart = false;
      remaining -= dt;
    }

    this.enterZones();
    this.loaded.update(frame, this.motion.x, this.motion.y);
    this.rig.update(frame, this.motion, this.feel());
    this.presenter.update(frame, {
      mood: this.feelings.mood,
      waryLeft: this.feelings.waryRemaining,
      x: this.motion.x,
      y: this.motion.y,
      target: this.feelings.mood === 'curious' ? this.pull.target : null,
    });
    this.follow(frame);
    this.hud?.track(frame, own.x !== 0 || own.y !== 0, darted);
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
      // Other shrimp, threats, currents and the day come in later steps.
      neighbours: [],
      companionWithin2: false,
      restingAgainstClose: false,
      curiosityPull: this.pull.value,
      threat: null,
      inCurrent: false,
      dayPhase: null,
    };
    this.report(this.feelings.step(dt, context));
  }

  private report(change: FeelingsChange): void {
    if (change.mood) {
      this.bus.emit('mood:changed', { who: PLAYER, ...change.mood });
      this.presenter.moodChanged(change.mood.to);
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
  private feel() {
    const feelings = this.feelings;
    const mood = feelings.mood;
    const has = feelings.has.bind(feelings);
    let target: { x: number; y: number } | null = null;
    if (mood === 'curious') target = this.pull.target;
    else if (has('veryHungry')) target = this.nearestFood();
    return {
      expression: withConditions(MOOD_EXPRESSIONS[mood], has),
      afraid: mood === 'afraid',
      target,
      startled: has('startled'),
    };
  }

  /** The nearest food within the Sense range, for a very hungry shrimp to lean toward. */
  private nearestFood(): { x: number; y: number } | null {
    const reach = CURIOSITY.range.juvenile * this.bodyLengthPx;
    let best: { x: number; y: number } | null = null;
    let bestDistance = reach;
    for (const food of this.area.food ?? []) {
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
