import Phaser from 'phaser';
import { app } from '../app';
import { CaptionLine, type Caption } from '../core/audio/captions';
import { ownLoops, RELIEF, stageCue, strikeCue, type Cue, type OwnDoing } from '../core/audio/cues';
import { SoundMix, type MixInput, type MixLevels } from '../core/audio/mix';
import { LOOP_NAMES, type EffectName } from '../core/audio/sounds';
import type { EventBus } from '../core/events';
import type { GameEvents } from '../core/gameEvents';
import type { FoodKind, AreaId } from '../core/world/kinds';
import { AREA_SOUND } from '../data/sounds';
import { SOUND } from '../data/tuning';
import { t } from '../i18n';

const PLAYER = 'player';
/** Seconds between the two bells of an achievement. */
const SECOND_BELL = 0.6;
/** How many of the last sounds asked for the browser test can see. */
const HEARD_KEPT = 12;

/** Where the caption is drawn. */
export interface CaptionView {
  caption(text: string | null, alpha: number): void;
}

export interface AudioDirectorOptions {
  area: AreaId;
  bus: EventBus<GameEvents>;
  hud: () => CaptionView | null;
  /** Pixels per second at a walk, to set how fast the walking ticks come. */
  walkSpeed: number;
  /** The food the shrimp likes best, for its warm note. */
  favourite?: () => FoodKind | null;
}

export interface AudioSnapshot {
  started: boolean;
  music: string | null;
  ambience: string | null;
  mix: MixLevels;
  /** The caption on screen, by its key, or null. None shows with captions off. */
  caption: string | null;
  /** The last sounds asked for, oldest first, whether or not they have a file yet. */
  heard: string[];
}

/**
 * Mixes music, ambience and effects from the mood and the game's events (doc
 * 05, doc 10 "Sound"). The rules are in `core/audio`; this listens, keeps the
 * captions, and tells the browser's sound what to do. One for each scene that
 * plays a place.
 */
export class AudioDirector {
  private readonly mix = new SoundMix(SOUND.mix);
  private readonly captions = new CaptionLine(SOUND.caption);
  private readonly stops: (() => void)[] = [];
  private readonly heard: string[] = [];
  private bellLeft = -1;
  private paused = false;

  constructor(
    scene: Phaser.Scene,
    private readonly options: AudioDirectorOptions,
  ) {
    const sound = AREA_SOUND[options.area];
    app.sound.setArea(sound.music, sound.ambience);
    const bus = options.bus;
    const on = <K extends keyof GameEvents>(type: K, handler: (event: GameEvents[K]) => void) =>
      this.stops.push(bus.on(type, handler));

    on('tailflip', ({ who }) => {
      if (who === PLAYER) this.play('tailFlip');
    });
    on('food:eaten', ({ who, kind, first }) => {
      if (who === PLAYER && (first || kind === options.favourite?.())) this.play('warmNote');
    });
    on('greeting', ({ a, b }) => {
      if (a === PLAYER || b === PLAYER) this.play('greeting');
    });
    on('cover:entered', ({ who }) => {
      if (who === PLAYER) this.play('rustle');
    });
    on('molt:phase', ({ who, phase }) => {
      if (who !== PLAYER) return;
      if (phase === 'molt') this.play('moltCrack');
      else if (phase === 'soft') this.play('moltRelease');
    });
    on('condition:changed', ({ who, condition, on: now }) => {
      if (who === PLAYER && condition === 'startled' && now) this.play('startle');
    });
    on('threat:stage', ({ kind, stage }) => this.cue(stageCue(kind, stage)));
    on('threat:strike', ({ kind }) => this.cue(strikeCue(kind)));
    on('threat:escaped', () => this.cue(RELIEF));

    const onPause = () => this.hush();
    scene.events.on(Phaser.Scenes.Events.PAUSE, onPause);
    scene.events.on(Phaser.Scenes.Events.SLEEP, onPause);
    this.stops.push(() => {
      scene.events.off(Phaser.Scenes.Events.PAUSE, onPause);
      scene.events.off(Phaser.Scenes.Events.SLEEP, onPause);
    });
  }

  /** Once a frame, with the shrimp's state. */
  update(dt: number, state: MixInput & OwnDoing): void {
    this.paused = false;
    app.sound.setMix(this.mix.step(dt, state));
    const loops = ownLoops(state, this.options.walkSpeed);
    for (const name of LOOP_NAMES) app.sound.setLoop(name, loops[name]);
    if (this.bellLeft >= 0) {
      this.bellLeft -= dt;
      if (this.bellLeft < 0) this.play('bell');
    }
    const { caption, alpha } = this.captions.step(dt);
    const on = app.settings.captions;
    this.options.hud()?.caption(on && caption ? this.words(caption) : null, alpha);
  }

  /** A small line has come: a low bell, two for an achievement (doc 12). */
  ring(bells: 1 | 2): void {
    this.play('bell');
    if (bells === 2) this.bellLeft = SECOND_BELL;
  }

  /** A companion takes fright and the player feels it: only a caption (doc 10, "Alarm"). */
  alarmed(name: string): void {
    this.caption({ key: 'caption.alarm', params: { name } }, null);
  }

  get snapshot(): AudioSnapshot {
    return {
      ...app.sound.snapshot,
      mix: { ...this.mix.levels },
      caption: app.settings.captions ? (this.captions.showing?.key ?? null) : null,
      heard: [...this.heard],
    };
  }

  destroy(): void {
    this.hush();
    for (const stop of this.stops) stop();
    this.stops.length = 0;
    this.captions.clear();
  }

  /** The scene stops for a while: the shrimp's own sounds stop with it. */
  private hush(): void {
    if (this.paused) return;
    this.paused = true;
    for (const name of LOOP_NAMES) app.sound.setLoop(name, 0);
  }

  private cue(cue: Cue | null): void {
    if (!cue) return;
    const seconds = cue.sound ? this.play(cue.sound) : null;
    if (cue.caption) this.caption({ key: cue.caption, params: {} }, seconds);
  }

  private play(name: EffectName): number | null {
    this.heard.push(name);
    if (this.heard.length > HEARD_KEPT) this.heard.shift();
    return app.sound.play(name);
  }

  private caption(caption: Caption, seconds: number | null): void {
    this.captions.show(caption, seconds);
  }

  private words(caption: Caption): string {
    return t(caption.key, caption.params);
  }
}
