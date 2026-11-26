import type Phaser from 'phaser';
import type { StimulusKind, ThreatView } from '../core/feelings/types';
import type { Point } from '../core/movement/collision';
import { seededRandom } from '../core/random';
import { shelterFor, type Shelter } from '../core/threat/cornered';
import { ThreatDirector, type ThreatEvent, type ThreatPlayer } from '../core/threat/ThreatDirector';
import { ZoneTracker } from '../core/world/zones';
import type { AreaDef } from '../data/areas/types';
import { BIRD, CORNERED, FISH, HIDE, THREAT, WORLD } from '../data/tuning';
import { Bird } from '../entities/Bird';
import { Hunter } from '../entities/Hunter';
import type { CoverHandle, LoadedArea } from './AreaLoader';
import { CorneredSequence } from './CorneredSequence';

export interface ThreatsOptions {
  area: AreaDef;
  loaded: LoadedArea;
  bodyLengthPx: number;
  camera: Phaser.Cameras.Scene2D.Camera;
  gentle: boolean;
  reducedMotion: () => boolean;
  seed: number;
  /** Whether a trigger may fire yet. The story arms the first bird after Sense. Without it, always. */
  armed?: (id: string) => boolean;
  /** How many ambient threats may come. Without a number, any. */
  ambient?: number;
}

/**
 * The threats of one place in the scene: the director with its rules, the
 * bird it shows, the cornered sequence, and the triggers that start a
 * scripted threat. The play scene feeds it the player and reads back what
 * the feelings need.
 */
export class Threats {
  readonly director: ThreatDirector;
  readonly cornered: CorneredSequence;
  private readonly bird: Bird | null;
  private readonly hunter: Hunter | null;
  private readonly triggers: ZoneTracker;
  private readonly fired = new Set<string>();
  private frameEvents: ThreatEvent[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly options: ThreatsOptions,
  ) {
    const { area, loaded, bodyLengthPx } = options;
    this.director = new ThreatDirector(
      THREAT,
      BIRD,
      {
        covers: loaded.covers,
        obstacles: loaded.obstacles,
        bounds: { x: 0, y: 0, w: area.size.w, h: area.size.h },
        bl: bodyLengthPx,
      },
      seededRandom(options.seed),
      { gentle: options.gentle, kinds: area.threats ?? [], ambient: options.ambient },
      FISH,
    );
    const kinds = area.threats ?? [];
    this.bird = kinds.includes('bird') ? new Bird(scene, bodyLengthPx) : null;
    this.hunter = kinds.includes('fish') ? new Hunter(scene, bodyLengthPx) : null;
    this.cornered = new CorneredSequence(scene, options.camera, CORNERED, options.reducedMotion);
    this.triggers = new ZoneTracker(area.triggers ?? []);
  }

  /** One step of the rules. The events are kept for the drawing at the end of the frame. */
  step(dt: number, player: ThreatPlayer): ThreatEvent[] {
    const events = this.director.step(dt, player);
    this.frameEvents.push(...events);
    return events;
  }

  /**
   * The player walked to (x, y): a trigger may start a scripted threat. A
   * trigger armed while the player is already inside it fires at once.
   */
  enter(x: number, y: number): void {
    const { entered } = this.triggers.update(x, y);
    const defs = this.options.area.triggers ?? [];
    const armed = this.options.armed ?? (() => true);
    for (const id of new Set([...entered, ...this.triggers.current])) {
      const def = defs.find((one) => one.id === id);
      if (!def || !armed(id)) continue;
      if (this.fired.has(id) && (def.once || !entered.includes(id))) continue;
      this.fired.add(id);
      // The first bird is the lesson: it comes from the north-east, and notices half as much.
      if (id === 'bird.first') {
        const from = WORLD.mirror ? Math.PI - BIRD.firstFrom : BIRD.firstFrom;
        this.director.request('bird', true, from);
      }
    }
  }

  /** The debug key: this place's threat now, whatever the gap. */
  callThreat(): void {
    const kind = this.options.area.threats?.[0];
    if (kind) this.director.request(kind, false, null, true);
  }

  /** The story's dawn fish, coming from the way given: it starts as soon as it may. */
  dawnFish(from: number): void {
    this.director.request('fish', false, from);
  }

  /** Where the danger is: the bird's feet, or its shadow. */
  get danger(): Point {
    return this.director.predator;
  }

  /** A threat's cue is under way: other shrimp freeze. */
  get cue(): boolean {
    return this.director.stage === 'cue';
  }

  view(x: number, y: number, isPlayer: boolean): ThreatView | null {
    return this.director.view(x, y, isPlayer);
  }

  felt(id: string, x: number, y: number): StimulusKind[] {
    return this.director.felt(id, x, y);
  }

  /** Where the player wakes after being cornered. */
  shelter(from: Point): Shelter<CoverHandle> {
    return shelterFor(
      from,
      this.director.predator,
      this.options.loaded.covers,
      CORNERED.away * this.options.bodyLengthPx,
      HIDE.tuck,
      this.options.area.spawn,
    );
  }

  /** Draws the bird or the fish from this frame's events. */
  draw(dt: number): void {
    this.bird?.update(dt, this.director, this.director.fish ? [] : this.frameEvents);
    this.hunter?.update(dt, this.director);
    this.frameEvents = [];
  }

  get snapshot() {
    return { ...this.director.snapshot, cornered: this.cornered.running };
  }

  destroy(): void {
    this.bird?.destroy();
    this.hunter?.destroy();
    this.cornered.destroy();
  }
}
