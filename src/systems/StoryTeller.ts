import type { EventBus } from '../core/events';
import type { Mood } from '../core/feelings/mood';
import type { DayPhase } from '../core/feelings/types';
import type { GameEvents } from '../core/gameEvents';
import { Story, type StoryEvent } from '../core/progress/Story';
import type { Life } from '../core/progress/life';
import type { AreaId, FoodKind } from '../core/world/kinds';
import { STORY_STEPS } from '../data/story';
import { BURROW, STORY } from '../data/tuning';
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
  /** Waiting to molt. */
  premolt: boolean;
  /** Shoal members within 4 BL, from chapter 2. */
  shoalNear?: number;
  /** Dug into the sand. */
  burrowed?: boolean;
  /** Soft after the molt, with a companion within 3 BL. */
  softNotAlone?: boolean;
  /** The name of a companion soft now, the player near her since her molt began. */
  herSoft?: string | null;
}

const PLAYER = 'player';

/** The chapter each place tells. */
const CHAPTER_OF: Partial<Record<AreaId, number>> = { mangrove: 1, lagoon: 2 };

/**
 * The story of a place and its narration (doc 12, "Story steps"; doc 13,
 * "Narration"): it hears the game, marks the steps done, and says each line
 * when its moment comes. Built for the mangrove, chapter 1, in step 8, and
 * the lagoon, chapter 2, in release 0.2. The lines of any chapter are said
 * in both.
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
  private premoltFor = 0;
  private moltSignalled = false;
  private wokeNow = false;
  readonly chapter: number;
  /** The time of day, from chapter 2. */
  private phase: DayPhase | null = null;
  private shoalNear = 0;
  /** Chapter 2: seconds since the dawn fish went, and since the molt, or null before. */
  private sinceFish: number | null = null;
  private sinceMolt: number | null = null;
  /** Chapter 2: the shrimp has dug in at least once in this life. */
  private everBurrowed: boolean;
  /** The shoal is smaller and has not yet been seen together since. */
  private fewerDue = false;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly narrator: Narrator,
    private readonly life: Life,
    private readonly area: AreaId,
    private readonly favourite: FoodKind,
  ) {
    this.chapter = CHAPTER_OF[area] ?? 1;
    this.story = new Story(STORY_STEPS, life.stepsDone);
    this.everBurrowed = life.narrated.has('narr.c2.burrowed') || this.story.has('s2.burrow');
    // Coming back from the save, the clocks between steps start again where they matter.
    if (this.chapter === 1) {
      if (this.story.has('s1.fill') && !this.story.has('s1.sense')) {
        this.sinceFull = STORY.senseHint;
      }
      if (this.story.has('s1.greet') && !this.story.has('s1.molt')) this.sinceGreet = 0;
    } else {
      if (this.story.has('s2.fish') && !this.story.has('s2.molt')) this.sinceFish = 0;
    }
    const on = <K extends keyof GameEvents>(type: K, handler: (event: GameEvents[K]) => void) =>
      this.stops.push(bus.on(type, handler));

    on('mood:changed', ({ who, to }) => {
      if (who !== PLAYER) return;
      if (to === 'content' && !life.narrated.has('narr.c0.taste')) return;
      if (to !== 'calm') this.narrator.say(`narr.mood.${to}`);
    });
    on('food:eaten', ({ who, kind, first, full, cleared }) => {
      if (who !== PLAYER) return;
      this.hear({
        kind: 'eaten',
        food: kind,
        phase: this.phase,
        whole: full || cleared === true,
        shoal: this.shoalNear,
      });
      if (first && kind === this.favourite) this.narrator.say('narr.favourite');
    });
    on('greeting', ({ a, b }) => {
      if (a !== PLAYER && b !== PLAYER) return;
      this.hear({ kind: 'greeting' });
    });
    on('bond:changed', ({ with: id, stage, value }) => {
      if (id === 'nacre' && stage === 'familiar') this.narrator.say('narr.c1.nacre');
      if (this.chapter === 2 && stage === 'familiar') {
        if (id === 'brise') this.narrator.say('narr.c2.brise');
        if (id === 'ecume') this.narrator.say('narr.c2.ecume');
      }
      this.hear({ kind: 'bond', value });
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
    return this.story.current(this.chapter);
  }

  /** Arriving in the place: its first line. */
  arrive(): void {
    this.narrator.say(this.chapter === 2 ? 'narr.c2.arrive' : 'narr.c1.arrive');
    // A bond already made in the place before counts toward this chapter's.
    if (this.chapter === 2) {
      for (const value of Object.values(this.life.bonds)) this.hear({ kind: 'bond', value });
    }
  }

  /** A phase of the day began. At dusk, the shrimp is hidden or burrowed, or not. */
  dayPhase(phase: DayPhase, hidden: boolean): void {
    this.phase = phase;
    if (phase === 'dusk') {
      this.hear({ kind: 'dusk', hidden });
      this.narrator.say('narr.c2.dusk');
    }
  }

  /** Chapter 2: the sand has been hinted and never yet dug into. Its prompt shows. */
  get wantsBurrow(): boolean {
    return this.chapter === 2 && this.time >= BURROW.hint && !this.everBurrowed;
  }

  /** "Rest until dusk" was chosen. It counts as burrowing through a day. */
  rested(): void {
    this.hear({ kind: 'rest' });
  }

  /** The plankton lit up in the shrimp's own wake. */
  glowed(): void {
    this.narrator.say('narr.c2.glow');
  }

  /** Chapter 2: at dawn the fish comes, until it has come and gone once (doc 12, `s2.fish`). */
  get wantsDawnFish(): boolean {
    return this.chapter === 2 && this.phase === 'dawn' && !this.story.has('s2.fish');
  }

  /** Someone of the shoal has gone missing, unseen (D42). */
  lost(): void {
    if (!this.life.narrated.has('narr.fewer')) this.fewerDue = true;
  }

  /** The fish turned to face the shrimp and held still: the warning. */
  fishFaced(): void {
    this.narrator.say('narr.c2.faces');
  }

  /** Sense has been hinted and not yet used: its prompt shows. */
  get wantsSense(): boolean {
    return (
      this.sinceFull !== null && this.sinceFull >= STORY.senseHint && !this.story.has('s1.sense')
    );
  }

  /**
   * The molt signal is due: 60 s after the first greeting, once the bird has
   * gone. True once, on the frame it comes due.
   */
  takeMoltDue(): boolean {
    if (this.moltSignalled) return false;
    if (this.chapter === 2) {
      if (this.story.has('s2.molt')) return false;
      if (this.sinceFish === null || this.sinceFish < STORY.moltAfterFish) return false;
    } else {
      if (this.story.has('s1.molt')) return false;
      if (this.sinceGreet === null || this.sinceGreet < STORY.moltAfterGreet) return false;
    }
    this.moltSignalled = true;
    return true;
  }

  update(frame: StoryFrame): void {
    const { dt } = frame;
    const before = this.time;
    this.time += dt;
    if (this.chapter === 2) {
      if (before < BURROW.hint && this.time >= BURROW.hint && !this.everBurrowed) {
        this.narrator.say('narr.c2.sand');
      }
      if (frame.burrowed && !this.everBurrowed) {
        this.everBurrowed = true;
        this.narrator.say('narr.c2.burrowed');
      }
    }
    // Soft, with a companion close; or close to a companion who is soft (T104).
    if (this.chapter >= 2 && frame.softNotAlone) this.narrator.say('narr.c2.notAlone');
    if (frame.herSoft) this.narrator.say('narr.c2.herMolt', { name: frame.herSoft });
    this.shoalNear = frame.shoalNear ?? 0;
    // The first time the shoal is together again after a loss, it is fewer.
    if (this.fewerDue && this.shoalNear >= STORY.regrouped && this.narrator.say('narr.fewer')) {
      this.fewerDue = false;
    }
    if (this.sinceFish !== null) this.sinceFish += dt;
    if (this.sinceMolt !== null) {
      const before = this.sinceMolt;
      this.sinceMolt += dt;
      if (before < STORY.leanAfterMolt && this.sinceMolt >= STORY.leanAfterMolt) {
        this.narrator.say('narr.c2.lean');
      }
    }
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
    // Waiting to molt out in the open, the body asks for cover.
    this.premoltFor = frame.premolt ? this.premoltFor + dt : 0;
    if (this.premoltFor >= STORY.notHere && !frame.tucked) this.narrator.say('narr.c1.notHere');
    // At a way out that is still closed. Beyond the lagoon, the life is still being made.
    if (frame.atWayOut) {
      const open = this.story.has(this.chapter === 2 ? 's2.molt' : 's1.molt');
      this.narrator.say(open ? 'end.continued' : 'narr.c1.closed');
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

  /** Nacre noticed a threat first, and the player felt her alarm (doc 13, `narr.c2.alarm`). */
  nacreAlarm(): void {
    if (this.chapter === 2) this.narrator.say('narr.c2.alarm');
  }

  /** The player's tail flip startled a shrimp that does not know it yet. */
  startledStranger(): void {
    this.narrator.say('narr.tooFast');
  }

  /** A phase of the player's molt began. */
  moltPhase(phase: string): void {
    if (phase === 'signal') this.narrator.say('narr.c1.tight');
    if (phase === 'molt') this.narrator.say('narr.c1.molt');
    if (phase === 'soft') this.narrator.say('narr.c1.soft');
    if (phase === 'hardened') {
      this.narrator.say('narr.c1.hard');
      // The taste of salt comes 10 s later.
      this.sinceHard = 0;
    }
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
    } else if (id === 's2.dusk') {
      this.narrator.say('narr.c2.graze');
    } else if (id === 's2.bond') {
      this.narrator.say('narr.c2.call');
    } else if (id === 's2.fish') {
      this.narrator.say('narr.c2.fishGone');
      this.sinceFish = 0;
    } else if (id === 's2.molt') {
      this.sinceMolt = 0;
    }
  }
}
