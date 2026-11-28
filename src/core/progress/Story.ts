import type { ThreatKind } from '../gameEvents';
import type { DayPhase, ThreatStage } from '../feelings/types';
import type { AreaId, FoodKind } from '../world/kinds';

/** What makes a story step done (doc 12, "Story steps"). */
export type StoryCondition =
  | { kind: 'eaten'; food: FoodKind; count: number }
  | { kind: 'zone'; area: AreaId; zone: string }
  | { kind: 'hunger'; atMost: number }
  | { kind: 'sense'; seconds: number }
  | { kind: 'threat'; threat: ThreatKind; stage: ThreatStage; area: AreaId; count: number }
  | { kind: 'greeting' }
  | { kind: 'molt'; area: AreaId }
  /** Hidden or burrowed when dusk begins, or "Rest until dusk" chosen. */
  | { kind: 'duskHidden' }
  /** A whole graze in this phase with this many of the shoal close. */
  | { kind: 'shoalGraze'; phase: DayPhase; with: number }
  | { kind: 'bond'; atLeast: number };

export interface StoryStep {
  id: string;
  chapter: number;
  when: StoryCondition;
}

/** What the story hears from the game. */
export type StoryEvent =
  | {
      kind: 'eaten';
      food: FoodKind;
      /** The time of day, from chapter 2. */
      phase?: DayPhase | null;
      /** Eaten to the end: full, or the patch cleared. */
      whole?: boolean;
      /** Shoal members within 4 BL. */
      shoal?: number;
    }
  | { kind: 'zone'; area: AreaId; zone: string }
  | { kind: 'hunger'; value: number }
  | { kind: 'sense'; seconds: number }
  | { kind: 'threat'; threat: ThreatKind; stage: ThreatStage; area: AreaId }
  | { kind: 'greeting' }
  | { kind: 'molt'; area: AreaId }
  | { kind: 'dusk'; hidden: boolean }
  | { kind: 'rest' }
  | { kind: 'bond'; value: number };

/**
 * The steps of the story. A step is done the moment its condition is true,
 * even if an earlier one is still open. The first step not done is the one
 * the narration prompts.
 */
export class Story {
  private readonly eaten = new Map<FoodKind, number>();
  private readonly visits = new Map<string, number>();

  constructor(
    private readonly steps: readonly StoryStep[],
    /** Steps already done in this life. */
    readonly done: Set<string> = new Set(),
    /** Threat visits that reached release before, by area and kind, as `released.<area>.<threat>` in the stats. */
    released: Readonly<Record<string, number>> = {},
  ) {
    for (const [key, count] of Object.entries(released)) {
      if (key.startsWith('released.')) this.visits.set(`${key.slice(9)}.release`, count);
    }
  }

  /** Hears one thing the game did. Returns the steps it finished. */
  hear(event: StoryEvent): string[] {
    if (event.kind === 'eaten') this.eaten.set(event.food, (this.eaten.get(event.food) ?? 0) + 1);
    if (event.kind === 'threat') {
      const key = `${event.area}.${event.threat}.${event.stage}`;
      this.visits.set(key, (this.visits.get(key) ?? 0) + 1);
    }
    const finished: string[] = [];
    for (const step of this.steps) {
      if (this.done.has(step.id) || !this.meets(step.when, event)) continue;
      this.done.add(step.id);
      finished.push(step.id);
    }
    return finished;
  }

  has(id: string): boolean {
    return this.done.has(id);
  }

  /** The first step of a chapter that is not done, or null when all are. */
  current(chapter: number): string | null {
    return (
      this.steps.find((step) => step.chapter === chapter && !this.done.has(step.id))?.id ?? null
    );
  }

  private meets(when: StoryCondition, event: StoryEvent): boolean {
    switch (when.kind) {
      case 'eaten':
        return event.kind === 'eaten' && (this.eaten.get(when.food) ?? 0) >= when.count;
      case 'zone':
        return event.kind === 'zone' && event.area === when.area && event.zone === when.zone;
      case 'hunger':
        return event.kind === 'hunger' && event.value <= when.atMost;
      case 'sense':
        return event.kind === 'sense' && event.seconds >= when.seconds;
      case 'threat':
        return (
          event.kind === 'threat' &&
          event.threat === when.threat &&
          event.stage === when.stage &&
          event.area === when.area &&
          (this.visits.get(`${when.area}.${when.threat}.${when.stage}`) ?? 0) >= when.count
        );
      case 'greeting':
        return event.kind === 'greeting';
      case 'molt':
        return event.kind === 'molt' && event.area === when.area;
      case 'duskHidden':
        return (event.kind === 'dusk' && event.hidden) || event.kind === 'rest';
      case 'shoalGraze':
        return (
          event.kind === 'eaten' &&
          event.phase === when.phase &&
          event.whole === true &&
          (event.shoal ?? 0) >= when.with
        );
      case 'bond':
        return event.kind === 'bond' && event.value >= when.atLeast;
    }
  }
}
