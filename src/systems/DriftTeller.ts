import type { EventBus } from '../core/events';
import type { Mood } from '../core/feelings/mood';
import type { GameEvents } from '../core/gameEvents';
import { Story, type StoryEvent } from '../core/progress/Story';
import type { Life } from '../core/progress/life';
import { STORY_STEPS } from '../data/story';
import { STORY } from '../data/tuning';
import type { Narrator } from './Narrator';

/** What the Drift tells its story on each frame. */
export interface DriftFrame {
  dt: number;
  mood: Mood;
  /** Seconds since the Drift began. */
  time: number;
  /** Still living on its yolk. */
  yolk: boolean;
  /** The zone the larva is in, A to E. */
  zone: string;
  veryHungry: boolean;
}

const PLAYER = 'player';
/** Seconds into the Drift for the yolk's line (doc 13). */
const YOLK_LINE = 5;
/** Seconds after the change of shape that its line may still come. */
const CHANGE_LINE = 30;

/**
 * The story of chapter 0 and its narration (doc 12, "Story steps"; doc 13,
 * "Chapter 0. Drift"). A line dropped because another showed gets another
 * chance while its moment lasts: the yolk while it lasts, the taste at each
 * mote, the others at each touch, the brown water while in it.
 */
export class DriftTeller {
  readonly story: Story;
  private readonly stops: (() => void)[] = [];
  private calmFor = 0;
  private sinceChange: number | null = null;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly narrator: Narrator,
    life: Life,
  ) {
    this.story = new Story(STORY_STEPS, life.stepsDone);
    const on = <K extends keyof GameEvents>(type: K, handler: (event: GameEvents[K]) => void) =>
      this.stops.push(bus.on(type, handler));
    on('mood:changed', ({ who, to }) => {
      if (who !== PLAYER) return;
      if (to === 'content' && !life.narrated.has('narr.c0.taste')) return;
      if (to !== 'calm') this.narrator.say(`narr.mood.${to}`);
    });
    on('food:eaten', ({ who, kind }) => {
      if (who !== PLAYER || kind !== 'microalgae') return;
      this.narrator.say('narr.c0.taste');
      this.hear({ kind: 'eaten', food: kind });
    });
    on('zone:entered', ({ area, zone }) => this.hear({ kind: 'zone', area, zone }));
  }

  /** The Drift begins: its name, then the tide. */
  begin(): void {
    this.narrator.enter('drift');
    this.narrator.say('narr.c0.start');
  }

  update(frame: DriftFrame): void {
    const { dt } = frame;
    this.calmFor = frame.mood === 'calm' ? this.calmFor + dt : 0;
    if (this.calmFor >= STORY.calmFor) this.narrator.say('narr.mood.calm');
    if (frame.yolk && frame.time >= YOLK_LINE) this.narrator.say('narr.c0.yolk');
    if (frame.zone === 'D') this.narrator.say('narr.c0.brown');
    if (frame.veryHungry) this.narrator.say('narr.veryHungry');
    if (this.sinceChange !== null) {
      this.sinceChange += dt;
      if (this.sinceChange <= CHANGE_LINE) this.narrator.say('narr.c0.change');
    }
  }

  /** The larva touched another one. */
  touched(): void {
    this.narrator.say('narr.c0.others');
  }

  /** The larva took its last shape. */
  changed(): void {
    this.sinceChange = 0;
  }

  /** Landfall: the larva holds on to something solid. */
  landed(): void {
    this.narrator.say('narr.c0.land');
  }

  destroy(): void {
    for (const stop of this.stops) stop();
    this.stops.length = 0;
  }

  private hear(event: StoryEvent): void {
    for (const id of this.story.hear(event)) this.bus.emit('step:done', { id });
  }
}
