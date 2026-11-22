import type { EventBus } from '../core/events';
import type { Mood } from '../core/feelings/mood';
import type { GameEvents } from '../core/gameEvents';
import { Story, type StoryEvent } from '../core/progress/Story';
import type { Life } from '../core/progress/life';
import type { AreaId, FoodKind } from '../core/world/kinds';
import { STORY_STEPS } from '../data/story';
import { STORY } from '../data/tuning';
import type { Narrator } from './Narrator';

/** What the play scene tells the story on each frame. */
export interface StoryFrame {
  dt: number;
  hunger: number;
  mood: Mood;
  sensing: boolean;
  tucked: boolean;
  wary: boolean;
  tired: boolean;
  frozen: boolean;
  veryHungry: boolean;
  /** A threat's visit is under way. */
  visit: boolean;
  /** BL to the nearest other shrimp. */
  nearestShrimp: number;
  /** In the way out of the place. */
  atWayOut: boolean;
}

const PLAYER = 'player';

/**
 * The story of a place and its narration (doc 12, "Story steps"; doc 13,
 * "Narration"): it hears the game, marks the steps done, and says each line
 * when its moment comes. Built for the mangrove, chapter 1, in step 8.
 */
export class StoryTeller {
  readonly story: Story;
  private readonly stops: (() => void)[] = [];
  private time = 0;
  private calmFor = 0;
  private senseFor = 0;
  private waryFor = 0;
  /** Seconds since the shrimp was full, or null before. */
  private sinceFull: number | null = null;
  /** Seconds since the first greeting, or null before. */
  private sinceGreet: number | null = null;
  private sinceHard: number | null = null;
  private wokeNow = false;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly narrator: Narrator,
    private readonly life: Life,
    private readonly area: AreaId,
    private readonly favourite: FoodKind,
  ) {
    this.story = new Story(STORY_STEPS, life.stepsDone);
    const on = <K extends keyof GameEvents>(type: K, handler: (event: GameEvents[K]) => void) =>
      this.stops.push(bus.on(type, handler));

    on('mood:changed', ({ who, to }) => {
      if (who !== PLAYER) return;
      if (to === 'content' && !life.narrated.has('narr.c0.taste')) return;
      if (to !== 'calm') this.narrator.say(`narr.mood.${to}`);
    });
    on('food:eaten', ({ who, kind, first }) => {
      if (who !== PLAYER) return;
      this.hear({ kind: 'eaten', food: kind });
      if (first && kind === this.favourite) this.narrator.say('narr.favourite');
    });
    on('greeting', ({ a, b }) => {
      if (a !== PLAYER && b !== PLAYER) return;
      this.hear({ kind: 'greeting' });
    });
    on('bond:changed', ({ with: id, stage }) => {
      if (id === 'nacre' && stage === 'familiar') this.narrator.say('narr.c1.nacre');
    });
    on('threat:stage', ({ kind, stage }) => {
      this.hear({ kind: 'threat', threat: kind, stage, area: this.area });
    });
    on('molt:done', ({ who }) => {
      if (who !== PLAYER) return;
      this.hear({ kind: 'molt', area: this.area });
    });
  }

  /** The first step of the chapter not done, for the narration to prompt. */
  get current(): string | null {
    return this.story.current(1);
  }

  /** Sense has been hinted and not yet used: its prompt shows. */
  get wantsSense(): boolean {
    return (
      this.sinceFull !== null && this.sinceFull >= STORY.senseHint && !this.story.has('s1.sense')
    );
  }

  /** The molt signal is due: 60 s after the first greeting, once the bird has gone. */
  get moltDue(): boolean {
    return this.sinceGreet !== null && this.sinceGreet >= STORY.moltAfterGreet;
  }

  update(frame: StoryFrame): void {
    const { dt } = frame;
    this.time += dt;
    this.hear({ kind: 'hunger', value: frame.hunger });
    this.senseFor = frame.sensing ? this.senseFor + dt : 0;
    if (frame.sensing) this.hear({ kind: 'sense', seconds: this.senseFor });
    if (this.sinceFull !== null) {
      const before = this.sinceFull;
      this.sinceFull += dt;
      if (before < STORY.senseHint && this.sinceFull >= STORY.senseHint) {
        if (!this.story.has('s1.sense')) this.narrator.say('narr.c1.senseHint');
      }
    }
    if (this.sinceGreet !== null && this.story.has('s1.bird')) this.sinceGreet += dt;
    if (this.sinceHard !== null) {
      const before = this.sinceHard;
      this.sinceHard += dt;
      if (before < STORY.saltAfterHard && this.sinceHard >= STORY.saltAfterHard) {
        this.narrator.say('narr.c1.salt');
      }
    }

    // The first calm that lasts 10 s.
    this.calmFor = frame.mood === 'calm' ? this.calmFor + dt : 0;
    if (this.calmFor >= STORY.calmFor) this.narrator.say('narr.mood.calm');
    this.waryFor = frame.wary ? this.waryFor + dt : 0;
    if (this.waryFor >= STORY.waryLine) this.narrator.say('narr.c1.wary');
    if (frame.tucked) this.narrator.say('narr.c1.cover');
    if (frame.tired) this.narrator.say('narr.tired');
    if (frame.frozen && frame.visit) this.narrator.say('narr.frozen');
    if (frame.veryHungry) this.narrator.say('narr.veryHungry');
    if (frame.nearestShrimp <= STORY.meet) this.narrator.say('narr.c1.meet');
    if (frame.atWayOut) {
      this.narrator.say(this.story.has('s1.molt') ? 'end.continued' : 'narr.c1.closed');
    }
    if (this.wokeNow) {
      this.narrator.say('narr.cornered');
      this.wokeNow = false;
    }
  }

  /** The shrimp woke in cover after being cornered. */
  woke(): void {
    this.wokeNow = true;
  }

  /** The player's tail flip startled a shrimp that does not know it yet. */
  startledStranger(): void {
    this.narrator.say('narr.tooFast');
  }

  /** The molt has hardened: the salt line comes 10 s later. */
  hardened(): void {
    this.sinceHard = 0;
  }

  destroy(): void {
    for (const stop of this.stops) stop();
    this.stops.length = 0;
  }

  private hear(event: StoryEvent): void {
    for (const id of this.story.hear(event)) {
      this.bus.emit('step:done', { id });
      this.stepDone(id);
    }
  }

  private stepDone(id: string): void {
    if (id === 's1.fill') {
      this.narrator.say('narr.c1.full');
      this.sinceFull = 0;
    } else if (id === 's1.sense') {
      this.narrator.say('narr.c1.sensed');
    } else if (id === 's1.bird') {
      this.narrator.say('narr.c1.birdGone');
    } else if (id === 's1.greet') {
      this.narrator.say('narr.c1.greet');
      this.sinceGreet = 0;
    }
  }
}
