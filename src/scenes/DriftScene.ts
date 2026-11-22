import Phaser from 'phaser';
import { app } from '../app';
import { ensureTexture } from '../art/TextureFactory';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Drifters, type Bell, type Copepod } from '../core/drift/drifters';
import { Larvae, Motes, moteClouds, type Mote, type OtherLarva } from '../core/drift/plankton';
import { EventBus } from '../core/events';
import { FeelingsModel, type FeelingsChange } from '../core/feelings/FeelingsModel';
import type { BondStage, FeelingsContext } from '../core/feelings/types';
import type { GameEvents } from '../core/gameEvents';
import { approach } from '../core/movement/angles';
import { DriftMotion, type LarvaShape } from '../core/movement/DriftMotion';
import { newLife, type Life } from '../core/progress/life';
import { seededRandom } from '../core/random';
import { DiscoveryTracker, type Discoverable, type Pull } from '../core/world/discovery';
import { inRect } from '../core/world/zones';
import { driftFor, driftPoint, type DriftDef } from '../data/drift';
import { FOODS } from '../data/foods';
import { CAMERA, CURIOSITY, DRIFT, FEELINGS, FRAME, HUNGER, MOOD } from '../data/tuning';
import { debugState } from '../debug';
import { t } from '../i18n';
import { DriftTeller } from '../systems/DriftTeller';
import { MoodPresenter } from '../systems/MoodPresenter';
import { Narrator } from '../systems/Narrator';
import { Rim } from '../systems/Rim';
import type { HudScene } from './HudScene';

export interface DriftData {
  /** Opened by `?explore=drift`: no story, and landfall opens the mangrove to explore. */
  explore?: boolean;
  /** Explore mode only: where to start, as the data file writes it. */
  at?: { x: number; y: number };
}

const PLAYER = 'player';
const SHAPES: readonly LarvaShape[] = ['early', 'mid', 'late'];
/** Mote pictures are drawn this much wider than the mote, for the halo. */
const MOTE_HALO = 1.6;
const HAZE = 0x8a6b3f;

interface Speck {
  image: Phaser.GameObjects.Image;
  layer: number;
}

/**
 * Chapter 0, the Drift (doc 11, "Chapter 0. Drift"). The water carries the
 * larva from the dark, through the green and the shafts of light, into the
 * brown haze, and it settles among the roots: then the mangrove. The rules are
 * in `core/drift` and `DriftMotion`; this scene draws them and tells the story.
 */
export class DriftScene extends Phaser.Scene {
  private def!: DriftDef;
  private explore = false;
  private at: { x: number; y: number } | null = null;
  private life: Life = newLife();
  private motion!: DriftMotion;
  private shape: LarvaShape = 'early';
  /** How visible each shape's picture is, crossfading as the larva changes. */
  private shapeAlpha: Record<LarvaShape, number> = { early: 1, mid: 0, late: 0 };
  private bodies!: Record<LarvaShape, Phaser.GameObjects.Image>;
  private clock = 0;
  private zone = 'A';

  private motes!: Motes;
  private moteImages = new Map<Mote, Phaser.GameObjects.Image>();
  private moteGlow = new Map<Mote, number>();
  private eaten = 0;
  private larvae!: Larvae;
  private larvaImages = new Map<OtherLarva, Phaser.GameObjects.Image>();
  private larvaSize = new Map<OtherLarva, number>();
  private touched = 0;
  private touching = new Set<OtherLarva>();
  private drifters!: Drifters;
  private copepodImages = new Map<Copepod, Phaser.GameObjects.Image>();
  private bellImages = new Map<Bell, Phaser.GameObjects.Image>();
  private shafts: { image: Phaser.GameObjects.Image; lean: number; phase: number }[] = [];
  private specks: Speck[] = [];
  private haze!: Phaser.GameObjects.Graphics;

  private bus!: EventBus<GameEvents>;
  private feelings!: FeelingsModel;
  private discovery!: DiscoveryTracker;
  private things: Discoverable[] = [];
  private pull: Pull = { value: 0, target: null };
  private presenter!: MoodPresenter;
  private rim!: Rim;
  private narrator: Narrator | null = null;
  private teller: DriftTeller | null = null;
  private hud: HudScene | null = null;
  private view = { x: 0, y: 0 };
  /** Landfall: seconds since it began, or null before. */
  private landing: number | null = null;
  private leaving = false;
  private sink = 1;

  constructor() {
    super('Drift');
  }

  init(data: DriftData): void {
    this.explore = data.explore === true;
    this.at = this.explore && data.at ? driftPoint(data.at.x, data.at.y) : null;
    this.life = newLife();
  }

  create(): void {
    const def = driftFor();
    this.def = def;
    const flow = DRIFT.motion.flow * def.direction;
    const start = this.at ?? def.start;
    const random = seededRandom(Date.now() >>> 0);
    this.clock = 0;
    this.landing = null;
    this.leaving = false;
    this.sink = 1;
    this.eaten = 0;
    this.touched = 0;
    this.touching = new Set();

    this.motion = new DriftMotion(DRIFT.motion, start.x, start.y, def.size.h, def.direction);
    this.shape = this.shapeAt(this.along(start.x));
    this.shapeAlpha = { early: 0, mid: 0, late: 0 };
    this.shapeAlpha[this.shape] = 1;
    this.zone = this.zoneAt(start.x, start.y);

    // What drifts is written where the larva meets it. It drifts too, so it
    // starts nearer: by its share of the flow, over the way to it.
    const back = (x: number, share: number) => x - share * (x - start.x);
    const motes = moteClouds(def.clouds, DRIFT.motes, random);
    for (const mote of motes) mote.x = back(mote.x, DRIFT.motes.drift);
    this.motes = new Motes(motes, DRIFT.motes, flow);
    this.moteImages = new Map();
    this.moteGlow = new Map();
    for (const mote of motes) {
      const image = this.add
        .image(mote.x, mote.y, ensureTexture(this, `food.microalgae.${mote.look}`))
        .setRotation(mote.turn)
        .setDepth(DEPTH.midWater);
      image.setScale((mote.size * MOTE_HALO) / image.width);
      this.moteImages.set(mote, image);
      this.moteGlow.set(mote, 0);
    }

    const copepods: Copepod[] = def.copepods.map((spot, index) => ({
      id: `copepod.${index}`,
      x: back(spot.x, DRIFT.copepod.drift),
      y: spot.y,
      heading: random() * Math.PI * 2,
      wait: random() * DRIFT.copepod.every[1],
      hop: null,
    }));
    const bells: Bell[] = def.bells.map((spot, index) => ({
      id: `bell.${index}`,
      x: back(spot.x, DRIFT.bell.drift),
      y: spot.y,
      size: spot.size,
      phase: random() * Math.PI * 2,
    }));
    this.drifters = new Drifters(copepods, bells, DRIFT, flow, def.size.h, random);
    this.copepodImages = new Map();
    for (const copepod of copepods) {
      const image = this.add
        .image(copepod.x, copepod.y, ensureTexture(this, 'drift.copepod'))
        .setDepth(DEPTH.midWater);
      image.setScale(60 / image.width);
      this.copepodImages.set(copepod, image);
    }
    this.bellImages = new Map();
    for (const bell of bells) {
      const image = this.add
        .image(bell.x, bell.y, ensureTexture(this, 'drift.bell'))
        .setDepth(DEPTH.midWater + 2)
        .setAlpha(0.9);
      this.bellImages.set(bell, image);
    }

    // The larvae hatched with the player, round it.
    const bl = DRIFT.length.mid;
    const larvae = DRIFT.larvae;
    this.larvae = new Larvae(
      {
        ...larvae,
        keep: [larvae.keep[0] * bl, larvae.keep[1] * bl],
        apart: larvae.apart * bl,
      },
      start,
      { start: this.atAlong(1500), haze: def.haze.from, end: def.landfall },
      def.size.h,
      flow,
      random,
    );
    this.larvaImages = new Map();
    this.larvaSize = new Map();
    for (const larva of this.larvae.larvae) {
      const image = this.add
        .image(larva.x, larva.y, ensureTexture(this, `larva.${this.shape}`))
        .setDepth(DEPTH.midWater + 4)
        .setAlpha(0.85);
      this.larvaImages.set(larva, image);
      const [least, most] = larvae.size;
      this.larvaSize.set(larva, least + (most - least) * random());
    }

    // The player's larva, one picture for each shape, crossfading as it changes.
    this.bodies = {
      early: this.add.image(start.x, start.y, ensureTexture(this, 'larva.early')),
      mid: this.add.image(start.x, start.y, ensureTexture(this, 'larva.mid')),
      late: this.add.image(start.x, start.y, ensureTexture(this, 'larva.late')),
    };
    for (const shape of SHAPES) this.bodies[shape].setDepth(DEPTH.midWater + 6);

    // Light from above in the shafts; shadows of leaves and roots in the haze.
    this.shafts = def.shafts.map((shaft, index) => {
      const image = this.add
        .image(shaft.x, def.size.h / 2, ensureTexture(this, 'drift.shaft'))
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDepth(DEPTH.surfaceLight)
        .setAlpha(0.55);
      image.setScale(shaft.width / image.width, def.size.h / image.height);
      return { image, lean: shaft.lean, phase: index * 1.7 };
    });
    for (const shadow of def.rootShadows) {
      const image = this.add
        .image(shadow.x, shadow.y, ensureTexture(this, 'drift.rootShadow'))
        .setRotation(shadow.turn)
        .setDepth(DEPTH.cover)
        .setAlpha(0.55);
      image.setScale(shadow.length / image.width);
    }

    // Specks in three layers show which way the water moves.
    this.specks = [];
    const camera = this.cameras.main;
    const halfW = GAME_WIDTH / CAMERA.zoom / 2;
    const halfH = GAME_HEIGHT / CAMERA.zoom / 2;
    for (let index = 0; index < DRIFT.specks.count; index++) {
      const layer = index % 3;
      const image = this.add
        .image(
          start.x + (random() * 2 - 1) * halfW * 1.2,
          start.y + (random() * 2 - 1) * halfH * 1.2,
          ensureTexture(this, 'fx.speck'),
        )
        .setDepth(layer === 2 ? DEPTH.overCover : DEPTH.bed)
        .setAlpha(layer === 2 ? 0.2 : 0.25 + random() * 0.35);
      image.setScale(([3, 5, 8][layer] ?? 4) / image.width);
      this.specks.push({ image, layer });
    }

    // The brown haze, over the view.
    this.haze = this.add.graphics().setDepth(DEPTH.mood - 1);
    this.haze.fillGradientStyle(HAZE, HAZE, HAZE, HAZE, 0.35, 1, 0.35, 1);
    this.haze.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.haze.setAlpha(0);

    // Feelings: hunger and curiosity run, and company with the other larvae. No fear.
    this.bus = new EventBus<GameEvents>();
    this.feelings = new FeelingsModel(FEELINGS, MOOD, { hunger: HUNGER.start.drift });
    this.discovery = new DiscoveryTracker(
      { range: CURIOSITY.range.juvenile, weights: CURIOSITY.weights, find: CURIOSITY.find },
      bl,
      this.life.discoveries,
    );
    this.bus.on('discovery', ({ id }) => this.life.discoveries.add(id));
    this.things = [
      ...copepods.map((one): Discoverable => ({
        id: 'drift.copepod',
        kind: 'creature',
        x: one.x,
        y: one.y,
        ref: one.id,
      })),
      ...bells.map((one): Discoverable => ({
        id: 'drift.bell',
        kind: 'creature',
        x: one.x,
        y: one.y,
        ref: one.id,
      })),
    ];
    this.pull = { value: 0, target: null };
    this.rim = new Rim();
    this.presenter = new MoodPresenter(camera, {
      hud: () => this.hud,
      reducedMotion: () => app.settings.reducedMotion,
      nameFeelings: () => app.settings.nameFeelings,
      word: (mood) => t(`mood.${mood}`),
    });

    this.view = { x: this.lookAt().x, y: start.y };
    this.aim();

    this.scene.launch('Hud', { larva: true });
    this.hud = this.scene.get('Hud') as HudScene;

    this.narrator = null;
    this.teller = null;
    if (!this.explore) {
      const narrator = new Narrator(() => this.hud, this.life.narrated, this.life.placesSeen);
      this.narrator = narrator;
      this.teller = new DriftTeller(this.bus, narrator, this.life);
      this.teller.begin();
    }
    this.found('place.drift');
    this.bus.emit('area:entered', { area: 'drift' });
    this.bus.emit('zone:entered', { area: 'drift', zone: this.zone });

    debugState.drift = () => ({
      x: this.motion.x,
      y: this.motion.y,
      along: this.along(this.motion.x),
      heading: this.motion.heading,
      shape: this.shape,
      zone: this.zone,
      time: this.clock,
      yolk: this.yolk,
      eaten: this.eaten,
      touched: this.touched,
      larvae: this.larvae.larvae.length,
      landing: this.landing !== null,
      explore: this.explore,
      steps: [...this.life.stepsDone],
      narration: this.narrator?.showing ?? null,
      nearestMote: this.nearestMote(),
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

    const stopBlur = app.keyboard.onBlur(() => this.openPause());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopBlur();
      this.bus.clear();
      debugState.drift = null;
      debugState.feelings = null;
      this.teller?.destroy();
      this.narrator?.clear();
      this.hud = null;
      this.scene.stop('Hud');
    });
  }

  override update(_time: number, deltaMs: number): void {
    const actions = app.actions;
    if (!this.leaving && actions.justPressed('pause')) {
      this.openPause();
      return;
    }
    const frame = Math.min(deltaMs / 1000, FRAME.longest);
    const settling = this.landing !== null;
    const axis = settling ? { x: 0, y: 0 } : actions.axis();
    const bl = this.length;
    let remaining = frame;
    while (remaining > 1e-6) {
      const dt = Math.min(remaining, FRAME.step);
      this.clock += dt;
      if (this.landing !== null) this.landing += dt;
      const carry =
        this.landing === null ? 1 : Math.max(0, 1 - this.landing / DRIFT.landfall.settle);
      this.motion.step(dt, axis, this.shape, carry);
      const slid = this.drifters.slideAround(this.motion.x, this.motion.y, bl * 0.4);
      this.motion.x = slid.x;
      this.motion.y = slid.y;
      this.motes.step(dt);
      this.drifters.step(dt);
      const seen = this.cameras.main.worldView;
      const missing = this.larvae.step(dt, this.motion, {
        x: seen.x,
        y: seen.y,
        w: seen.width,
        h: seen.height,
      });
      for (const id of missing) this.lose(id);
      for (const larva of this.larvae.larvae) {
        const away = this.drifters.slideAround(larva.x, larva.y, bl * 0.4);
        larva.x = away.x;
        larva.y = away.y;
      }
      this.eat();
      this.meet();
      this.stepFeelings(dt, axis.x !== 0 || axis.y !== 0);
      remaining -= dt;
    }

    this.enterZone();
    this.changeShape(frame);
    this.drawLarva();
    this.drawWater(frame);
    this.rim.set(this.rimmed());
    this.rim.update(frame);
    this.teller?.update({
      dt: frame,
      mood: this.feelings.mood,
      time: this.clock,
      yolk: this.yolk,
      zone: this.zone,
      veryHungry: this.feelings.has('veryHungry'),
    });
    this.narrator?.update(frame);
    this.presenter.update(frame, {
      mood: this.feelings.mood,
      waryLeft: 0,
      x: this.motion.x,
      y: this.motion.y,
      target: this.feelings.mood === 'curious' ? this.pull.target : null,
      sensing: false,
    });
    this.follow(frame);
    this.hud?.track(frame, axis.y !== 0 || axis.x !== 0, false);
    this.land();
  }

  /** How far along the Drift a point is, the way the water runs. */
  private along(x: number): number {
    return this.def.direction > 0 ? x : this.def.size.w - x;
  }

  /** The x of a point this far along the Drift. */
  private atAlong(along: number): number {
    return this.def.direction > 0 ? along : this.def.size.w - along;
  }

  /** The first seconds: the larva lives on its yolk and cannot eat (doc 10, "The larva"). */
  private get yolk(): boolean {
    return this.clock < DRIFT.yolk && this.along(this.motion.x) < this.along(this.zoneX('B'));
  }

  private get length(): number {
    return DRIFT.length[this.shape];
  }

  /** The shape the larva has at this point: the first until the yolk is gone, the last from `lateAt`. */
  private shapeAt(along: number): LarvaShape {
    if (along >= DRIFT.lateAt) return 'late';
    if (this.clock >= DRIFT.yolk || along >= this.along(this.zoneX('B'))) return 'mid';
    return 'early';
  }

  /** Where a zone begins, the way the water runs. */
  private zoneX(id: string): number {
    const zone = this.def.zones.find((one) => one.id === id)?.zone;
    if (!zone) return 0;
    return this.def.direction > 0 ? zone.x : zone.x + zone.w;
  }

  private zoneAt(x: number, y: number): string {
    return this.def.zones.find((one) => inRect(x, y, one.zone))?.id ?? this.zone;
  }

  private enterZone(): void {
    const zone = this.zoneAt(this.motion.x, this.motion.y);
    if (zone === this.zone) return;
    this.zone = zone;
    this.bus.emit('zone:entered', { area: 'drift', zone });
  }

  /** The larva changes shape: the first after its yolk, the last early in the shafts. */
  private changeShape(dt: number): void {
    const shape = this.shapeAt(this.along(this.motion.x));
    if (shape !== this.shape && SHAPES.indexOf(shape) > SHAPES.indexOf(this.shape)) {
      this.shape = shape;
      if (shape === 'late') this.teller?.changed();
      // The others are at the same stage.
      for (const image of this.larvaImages.values()) image.setTexture(`larva.${shape}`);
    }
    const step = dt / DRIFT.change;
    for (const one of SHAPES) {
      const target = one === this.shape ? 1 : 0;
      const now = this.shapeAlpha[one];
      this.shapeAlpha[one] = target > now ? Math.min(1, now + step) : Math.max(0, now - step);
    }
  }

  /** Motes touching the mouth are eaten, once the yolk is gone. */
  private eat(): void {
    if (this.yolk || this.landing !== null) return;
    const bl = this.length;
    const heading = this.motion.heading;
    const mouthX = this.motion.x + Math.cos(heading) * bl * 0.5;
    const mouthY = this.motion.y + Math.sin(heading) * bl * 0.5;
    for (const mote of this.motes.eat(mouthX, mouthY, DRIFT.reach * bl)) {
      this.eaten += 1;
      const first = this.discovery.add('food.microalgae');
      if (first) this.found('food.microalgae');
      this.feelings.eat(FOODS.microalgae.removes);
      this.bus.emit('food:eaten', {
        who: PLAYER,
        kind: 'microalgae',
        first,
        full: this.feelings.values.hunger < 0.15,
        patchId: `mote.${mote.id}`,
      });
      const image = this.moteImages.get(mote);
      this.moteImages.delete(mote);
      this.moteGlow.delete(mote);
      if (image) {
        this.tweens.add({
          targets: image,
          alpha: 0,
          scale: image.scale * 0.4,
          x: mouthX,
          y: mouthY,
          duration: 220,
          onComplete: () => image.destroy(),
        });
      }
    }
  }

  /** Touching another larva: the first meeting. */
  private meet(): void {
    const now = new Set(
      this.larvae.touching(this.motion.x, this.motion.y, DRIFT.larvae.touch * this.length),
    );
    for (const larva of now) {
      if (this.touching.has(larva)) continue;
      this.touched += 1;
      this.teller?.touched();
    }
    this.touching = now;
  }

  /** A larva goes missing, out of sight (T54). */
  private lose(id: string): void {
    for (const [larva, image] of this.larvaImages) {
      if (larva.id !== id) continue;
      image.destroy();
      this.larvaImages.delete(larva);
      this.larvaSize.delete(larva);
      this.touching.delete(larva);
    }
  }

  private stepFeelings(dt: number, moving: boolean): void {
    const { x, y } = this.motion;
    for (const thing of this.things) {
      const copepod = this.drifters.copepods.find((one) => one.id === thing.ref);
      const bell = copepod ? null : this.drifters.bells.find((one) => one.id === thing.ref);
      const where = copepod ?? bell;
      if (where) {
        thing.x = where.x;
        thing.y = where.y;
      }
    }
    for (const id of this.discovery.step(dt, x, y, this.things)) this.found(id);
    this.pull = this.discovery.pull(x, y, this.things);
    const company = 4 * this.length;
    const neighbours: BondStage[] = [];
    for (const larva of this.larvae.larvae) {
      if (Math.hypot(larva.x - x, larva.y - y) <= company) neighbours.push('stranger');
    }
    this.feelings.setYolk(this.yolk);
    const context: FeelingsContext = {
      motion: 'swim',
      activity: 'drifting',
      hidden: false,
      nearCover: false,
      moving,
      tired: false,
      neighbours,
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
    this.discovery.add(id);
    this.feelings.stimulus('discovery');
    this.bus.emit('discovery', { id });
  }

  /** The pictures of the copepod or bell the larva is curious about. */
  private rimmed(): Phaser.GameObjects.Image[] {
    const target = this.feelings.mood === 'curious' ? this.pull.target : null;
    if (!target?.ref) return [];
    const copepod = this.drifters.copepods.find((one) => one.id === target.ref);
    if (copepod) return [this.copepodImages.get(copepod)].filter((one) => one !== undefined);
    const bell = this.drifters.bells.find((one) => one.id === target.ref);
    return bell ? [this.bellImages.get(bell)].filter((one) => one !== undefined) : [];
  }

  private drawLarva(): void {
    const { x, y, heading } = this.motion;
    // The body swells a little with each beat of its limbs.
    const beat = this.motion.push - 0.5;
    for (const shape of SHAPES) {
      const image = this.bodies[shape];
      const alpha = this.shapeAlpha[shape];
      image.setVisible(alpha > 0.01);
      if (alpha <= 0.01) continue;
      const scale = (DRIFT.length[shape] * 2) / image.width;
      image
        .setPosition(x, y)
        .setRotation(heading)
        .setScale(scale * (1 + 0.04 * beat))
        .setAlpha(alpha);
    }
    for (const [larva, image] of this.larvaImages) {
      const size = (this.larvaSize.get(larva) ?? 1) * DRIFT.length[this.shape];
      const scale = (size * 2) / image.width;
      const pulse = Math.sin(this.clock * 3 + larva.phase);
      const along = Math.atan2(larva.vy, Math.abs(larva.vx) + 1e-6);
      const tilt = Math.max(-0.5, Math.min(0.5, along));
      image
        .setPosition(larva.x, larva.y)
        .setRotation(this.def.direction > 0 ? tilt : Math.PI - tilt)
        .setScale(scale * (1 + 0.03 * pulse));
    }
  }

  /** The water and what floats in it, for this frame. */
  private drawWater(dt: number): void {
    const camera = this.cameras.main;
    const view = camera.worldView;
    const near = DRIFT.brighten * this.length;
    const ease = approach(dt, 0.25);
    const margin = 120;
    for (const [mote, image] of this.moteImages) {
      const seen =
        mote.x > view.x - margin &&
        mote.x < view.right + margin &&
        mote.y > view.y - margin &&
        mote.y < view.bottom + margin;
      image.setVisible(seen);
      if (!seen) continue;
      // A mote brightens when the larva comes near.
      const close = Math.hypot(mote.x - this.motion.x, mote.y - this.motion.y) < near ? 1 : 0;
      const glow = (this.moteGlow.get(mote) ?? 0) + (close - (this.moteGlow.get(mote) ?? 0)) * ease;
      this.moteGlow.set(mote, glow);
      const base = (mote.size * MOTE_HALO) / image.width;
      image
        .setPosition(mote.x, mote.y)
        .setAlpha(0.75 + 0.25 * glow)
        .setScale(base * (1 + 0.15 * glow));
    }
    for (const [copepod, image] of this.copepodImages) {
      image.setPosition(copepod.x, copepod.y).setRotation(copepod.heading);
    }
    for (const [bell, image] of this.bellImages) {
      // The picture's bell is 184 across; the threads reach its edge.
      image.setPosition(bell.x, bell.y).setScale(this.drifters.width(bell) / 184);
    }
    for (const shaft of this.shafts) {
      shaft.image.setRotation(shaft.lean + Math.sin(this.clock * 0.25 + shaft.phase) * 0.03);
    }
    // Specks drift slower than the larva, and come round again at the far side.
    const flow = DRIFT.motion.flow * this.def.direction;
    const w = view.width + 2 * margin;
    const h = view.height + 2 * margin;
    for (const speck of this.specks) {
      const image = speck.image;
      let x = image.x + flow * (DRIFT.specks.layers[speck.layer] ?? 0.3) * dt;
      let y = image.y;
      if (x < view.x - margin) x += w;
      else if (x > view.right + margin) x -= w;
      if (y < view.y - margin) y += h;
      else if (y > view.bottom + margin) y -= h;
      image.setPosition(x, y);
    }
    // The haze rises from the far side and thickens into landfall.
    const { from, to } = this.def.haze;
    const along = this.along(this.motion.x);
    const haze = Math.max(
      0,
      Math.min(1, (along - this.along(from)) / (this.along(to) - this.along(from))),
    );
    const zoom = camera.zoom;
    this.haze
      .setPosition(view.x, view.y)
      .setScale(1 / zoom)
      .setAlpha(haze * DRIFT.haze);
    if (this.def.direction < 0) this.haze.setScale(-1 / zoom, 1 / zoom).setX(view.right);
    camera.setBackgroundColor(this.waterAt(this.view.x));
  }

  /** The colour of the water at x. */
  private waterAt(x: number): number {
    const stops = this.def.water;
    let before = stops[0];
    let after = stops[stops.length - 1];
    for (const stop of stops) {
      if (stop.x <= x) before = stop;
      if (stop.x >= x) {
        after = stop;
        break;
      }
    }
    if (!before || !after) return 0;
    const a = Phaser.Display.Color.HexStringToColor(before.color);
    const b = Phaser.Display.Color.HexStringToColor(after.color);
    const share = after.x === before.x ? 0 : (x - before.x) / (after.x - before.x);
    const mix = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, share * 100);
    return Phaser.Display.Color.GetColor(mix.r, mix.g, mix.b);
  }

  /** The nearest mote, for the browser test: where it is and how far. */
  private nearestMote(): { x: number; y: number; distance: number } | null {
    const nearest = this.motes.nearest(this.motion.x, this.motion.y);
    return nearest ? { x: nearest.mote.x, y: nearest.mote.y, distance: nearest.distance } : null;
  }

  /** Landfall: the larva settles, the view sinks, and the mangrove begins. */
  private land(): void {
    if (this.landing === null) {
      if (this.along(this.motion.x) >= this.along(this.def.landfall)) {
        this.landing = 0;
        this.teller?.landed();
      }
      return;
    }
    const settled = this.landing >= DRIFT.landfall.settle;
    const told = !this.narrator?.busy;
    if (this.leaving || !settled || !told) return;
    this.leaving = true;
    const camera = this.cameras.main;
    camera.fadeOut(DRIFT.landfall.fade * 1000, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Chapter 1 starts with its own hunger (doc 10, "Hunger").
      this.life.hunger = null;
      this.scene.start('Play', {
        area: 'mangrove',
        explore: this.explore,
        life: this.explore ? undefined : this.life,
      });
    });
  }

  /** Where the view looks: ahead of the larva, along the flow. */
  private lookAt(): { x: number; y: number } {
    const ahead = (GAME_WIDTH / CAMERA.zoom) * DRIFT.ahead * this.def.direction;
    return { x: this.motion.x + ahead, y: this.motion.y };
  }

  private follow(dt: number): void {
    const want = this.lookAt();
    const ease = approach(dt, CAMERA.followTime * 2);
    this.view.x += (want.x - this.view.x) * ease;
    this.view.y += (want.y - this.view.y) * ease;
    // At landfall the view sinks toward the roots.
    const sink = this.landing === null ? 1 : DRIFT.landfall.sink;
    this.sink += (sink - this.sink) * approach(dt, 1.5);
    this.aim();
  }

  private aim(): void {
    const zoom = CAMERA.zoom * this.presenter.zoom * this.sink;
    const camera = this.cameras.main;
    camera.setZoom(zoom);
    const halfW = GAME_WIDTH / zoom / 2;
    const halfH = GAME_HEIGHT / zoom / 2;
    const { w, h } = this.def.size;
    const lean = this.presenter.lean;
    const x = Phaser.Math.Clamp(this.view.x + lean.x, halfW, w - halfW);
    const y = Phaser.Math.Clamp(this.view.y + lean.y, halfH, h - halfH);
    camera.centerOn(x, y);
  }

  private openPause(): void {
    if (!this.scene.isActive() || this.leaving) return;
    this.scene.pause();
    this.scene.launch('Pause');
  }
}
