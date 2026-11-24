import type { MixLevels } from '../core/audio/mix';
import {
  busOf,
  type AmbienceName,
  type EffectName,
  type LoopName,
  type MusicName,
  type SoundName,
} from '../core/audio/sounds';

/**
 * The browser's sound, through Web Audio. It plays what the game asks for by
 * name and applies the levels of the mix; it decides nothing. A name with no
 * file plays nothing and fetches nothing. Browsers keep sound off until the
 * player presses a key or clicks, so the sound starts then (doc 03), and it
 * stops while the tab is hidden (doc 05, "Levels").
 */

export interface Volumes {
  master: number;
  music: number;
  ambience: number;
  effects: number;
}

export interface SoundOutTuning {
  bus: { music: number; ambience: number; effects: number; ceiling: number };
  crossfade: number;
  loopEase: number;
}

/** Where a name's file is, without its ending, or null when it has none. */
export type FileOf = (name: SoundName) => string | null;

interface Playing {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface Graph {
  master: GainNode;
  heard: GainNode;
  music: GainNode;
  musicMuffle: BiquadFilterNode;
  area: GainNode;
  areaFilter: BiquadFilterNode;
  uneasy: GainNode;
  chime: GainNode;
  shimmer: GainNode;
  ambience: GainNode;
  ambienceMuffle: BiquadFilterNode;
  ambienceMix: GainNode;
  effects: GainNode;
  own: GainNode;
  ownFilter: BiquadFilterNode;
}

const OWN_EFFECTS: ReadonlySet<EffectName> = new Set([
  'tailFlip',
  'greeting',
  'rustle',
  'moltCrack',
  'moltRelease',
  'startle',
]);

/** Short enough that a level set on every frame follows without clicks. */
const SMOOTH = 0.03;

export class SoundOut {
  private context: AudioContext | null = null;
  private graph: Graph | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer | 'loading' | 'none'>();
  private readonly ending: 'ogg' | 'm4a';
  private volumes: Volumes;
  private mix: MixLevels | null = null;
  private wanted: { music: MusicName | null; ambience: AmbienceName | null } = {
    music: null,
    ambience: null,
  };
  private music: { name: MusicName; playing: Playing } | null = null;
  private ambience: { name: AmbienceName; playing: Playing } | null = null;
  /** The uneasy track, the layers and the shrimp's own lasting sounds: always running, at their level. */
  private readonly held = new Map<SoundName, Playing>();
  private readonly loopLevels = new Map<LoopName, number>();
  private hidden = false;

  constructor(
    private readonly fileOf: FileOf,
    private readonly tuning: SoundOutTuning,
    volumes: Volumes,
  ) {
    this.volumes = { ...volumes };
    const probe = typeof Audio === 'function' ? new Audio() : null;
    this.ending = probe?.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
  }

  /** Start listening for the first key or click, and for the tab being hidden. */
  attach(): void {
    window.addEventListener('keydown', this.unlock, true);
    window.addEventListener('pointerdown', this.unlock, true);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** True once the browser lets sound play. */
  get started(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  setVolumes(volumes: Volumes): void {
    this.volumes = { ...volumes };
    this.applyVolumes();
  }

  /** The area's calm track and its bed. They cross over when the area changes. */
  setArea(music: MusicName | null, ambience: AmbienceName | null): void {
    this.wanted = { music, ambience };
    this.followArea();
  }

  setMix(levels: MixLevels): void {
    this.mix = levels;
    const graph = this.graph;
    if (!graph) return;
    this.to(graph.area.gain, levels.area);
    this.to(graph.areaFilter.frequency, levels.areaBright);
    this.to(graph.uneasy.gain, levels.uneasy);
    this.to(graph.chime.gain, levels.chime);
    this.to(graph.shimmer.gain, levels.shimmer);
    this.to(graph.ambienceMix.gain, levels.ambience);
    this.to(graph.musicMuffle.frequency, levels.muffle);
    this.to(graph.ambienceMuffle.frequency, levels.muffle);
    this.to(graph.own.gain, levels.own);
    this.to(graph.ownFilter.frequency, levels.ownBright);
    this.to(graph.heard.gain, levels.heard);
    for (const name of ['music.uneasy', 'layer.chime', 'layer.shimmer'] as const) {
      const level =
        name === 'music.uneasy'
          ? levels.uneasy
          : name === 'layer.chime'
            ? levels.chime
            : levels.shimmer;
      if (level > 0.001) this.hold(name);
    }
  }

  /** How loud one of the shrimp's own lasting sounds is now, 0 to 1. */
  setLoop(name: LoopName, level: number): void {
    this.loopLevels.set(name, level);
    if (level > 0.001) this.hold(name);
    const playing = this.held.get(name);
    if (playing && this.context) {
      playing.gain.gain.setTargetAtTime(level, this.context.currentTime, this.tuning.loopEase / 3);
    }
  }

  /** Play a sound once. Returns its length in seconds, or null when it has no file yet. */
  play(name: EffectName): number | null {
    const buffer = this.buffer(name);
    const context = this.context;
    const graph = this.graph;
    if (!buffer || !context || !graph || this.hidden) return null;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(OWN_EFFECTS.has(name) ? graph.own : graph.effects);
    source.start();
    return buffer.duration;
  }

  /** What the browser test can ask. */
  get snapshot(): { started: boolean; music: string | null; ambience: string | null } {
    return {
      started: this.started,
      music: this.music?.name ?? null,
      ambience: this.ambience?.name ?? null,
    };
  }

  private readonly unlock = (): void => {
    if (this.context) {
      if (this.context.state === 'suspended' && !this.hidden) void this.context.resume();
      return;
    }
    const Context = window.AudioContext as typeof AudioContext | undefined;
    if (!Context) return;
    const context = new Context();
    this.context = context;
    this.graph = this.build(context);
    this.applyVolumes();
    if (this.mix) this.setMix(this.mix);
    this.followArea();
    for (const [name, level] of this.loopLevels) this.setLoop(name, level);
    window.removeEventListener('pointerdown', this.unlock, true);
  };

  private readonly onVisibility = (): void => {
    this.hidden = document.visibilityState === 'hidden';
    const context = this.context;
    if (!context) return;
    if (this.hidden) void context.suspend();
    else void context.resume();
  };

  private build(context: AudioContext): Graph {
    const gain = (value = 1) => {
      const node = context.createGain();
      node.gain.value = value;
      return node;
    };
    const lowpass = (hz: number) => {
      const node = context.createBiquadFilter();
      node.type = 'lowpass';
      node.frequency.value = hz;
      return node;
    };
    const open = 20000;
    const master = gain();
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.ratio.value = 8;
    master.connect(limiter).connect(context.destination);
    const heard = gain();
    heard.connect(master);

    const music = gain();
    const musicMuffle = lowpass(open);
    musicMuffle.connect(music).connect(heard);
    const areaFilter = lowpass(open);
    const area = gain();
    area.connect(areaFilter).connect(musicMuffle);
    const uneasy = gain(0);
    const chime = gain(0);
    const shimmer = gain(0);
    for (const node of [uneasy, chime, shimmer]) node.connect(musicMuffle);

    const ambience = gain();
    const ambienceMuffle = lowpass(open);
    const ambienceMix = gain();
    ambienceMix.connect(ambienceMuffle).connect(ambience).connect(heard);

    const effects = gain();
    effects.connect(heard);
    const ownFilter = lowpass(open);
    const own = gain();
    own.connect(ownFilter).connect(effects);

    return {
      master,
      heard,
      music,
      musicMuffle,
      area,
      areaFilter,
      uneasy,
      chime,
      shimmer,
      ambience,
      ambienceMuffle,
      ambienceMix,
      effects,
      own,
      ownFilter,
    };
  }

  private applyVolumes(): void {
    const graph = this.graph;
    if (!graph) return;
    const { bus } = this.tuning;
    const v = this.volumes;
    this.to(graph.master.gain, v.master * bus.ceiling);
    this.to(graph.music.gain, v.music * bus.music);
    this.to(graph.ambience.gain, v.ambience * bus.ambience);
    this.to(graph.effects.gain, v.effects * bus.effects);
  }

  /** The area's track and bed: start what is wanted, let go of what is not. */
  private followArea(): void {
    const context = this.context;
    const graph = this.graph;
    if (!context || !graph) return;
    const { music, ambience } = this.wanted;
    if (this.music?.name !== music) {
      this.letGo(this.music?.playing ?? null);
      this.music = null;
      const buffer = music ? this.buffer(music) : null;
      if (music && buffer)
        this.music = { name: music, playing: this.start(buffer, graph.area, true) };
    }
    if (this.ambience?.name !== ambience) {
      this.letGo(this.ambience?.playing ?? null);
      this.ambience = null;
      const buffer = ambience ? this.buffer(ambience) : null;
      if (ambience && buffer) {
        this.ambience = { name: ambience, playing: this.start(buffer, graph.ambienceMix, true) };
      }
    }
  }

  /** Start a looping sound that stays, at its level: the uneasy track, a layer, an own sound. */
  private hold(name: SoundName): void {
    if (this.held.has(name)) return;
    const graph = this.graph;
    const buffer = this.buffer(name);
    if (!graph || !buffer) return;
    const into =
      name === 'music.uneasy'
        ? graph.uneasy
        : name === 'layer.chime'
          ? graph.chime
          : name === 'layer.shimmer'
            ? graph.shimmer
            : graph.own;
    const playing = this.start(buffer, into, false);
    // The uneasy track and the layers follow their bus gains; own sounds start silent.
    playing.gain.gain.value = busOf(name) === 'music' ? 1 : 0;
    this.held.set(name, playing);
  }

  private start(buffer: AudioBuffer, into: AudioNode, fadeIn: boolean): Playing {
    const context = this.context as AudioContext;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    source.connect(gain).connect(into);
    if (fadeIn) {
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(1, context.currentTime, this.tuning.crossfade / 3);
    }
    source.start();
    return { source, gain };
  }

  private letGo(playing: Playing | null): void {
    const context = this.context;
    if (!playing || !context) return;
    const { crossfade } = this.tuning;
    playing.gain.gain.setTargetAtTime(0, context.currentTime, crossfade / 3);
    playing.source.stop(context.currentTime + crossfade * 1.5);
  }

  /** The decoded sound, or null while it loads or when it has no file. Loading starts here. */
  private buffer(name: SoundName): AudioBuffer | null {
    const known = this.buffers.get(name);
    if (known instanceof AudioBuffer) return known;
    if (known !== undefined) return null;
    const file = this.fileOf(name);
    const context = this.context;
    if (!file) {
      this.buffers.set(name, 'none');
      return null;
    }
    if (!context) return null;
    this.buffers.set(name, 'loading');
    void fetch(`assets/audio/${file}.${this.ending}`)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(response.status)))
      .then((data) => context.decodeAudioData(data))
      .then((decoded) => {
        this.buffers.set(name, decoded);
        // A track or a lasting sound asked for while it loaded starts now.
        this.followArea();
        if (this.mix) this.setMix(this.mix);
        for (const [loop, level] of this.loopLevels) this.setLoop(loop, level);
      })
      .catch(() => this.buffers.set(name, 'none'));
    return null;
  }

  private to(param: AudioParam, value: number): void {
    const context = this.context;
    if (!context || Math.abs(param.value - value) < 1e-4 * Math.max(1, value)) return;
    param.setTargetAtTime(value, context.currentTime, SMOOTH);
  }
}
