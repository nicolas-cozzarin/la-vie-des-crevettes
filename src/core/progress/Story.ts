import type { ThreatKind } from '../gameEvents';
import type { ThreatStage } from '../feelings/types';
import type { AreaId, FoodKind } from '../world/kinds';

/** What makes a story step done (doc 12, "Story steps"). */
export type StoryCondition =
  | { kind: 'eaten'; food: FoodKind; count: number }
  | { kind: 'zone'; area: AreaId; zone: string }
  | { kind: 'hunger'; atMost: number }
  | { kind: 'sense'; seconds: number }
  | { kind: 'threat'; threat: ThreatKind; stage: ThreatStage; area: AreaId; count: number }
  | { kind: 'greeting' }
  | { kind: 'molt'; area: AreaId };

export interface StoryStep {
  id: string;
  chapter: number;
  when: StoryCondition;
}

/** What the story hears from the game. */
export type StoryEvent =
  | { kind: 'eaten'; food: FoodKind }
  | { kind: 'zone'; area: AreaId; zone: string }
  | { kind: 'hunger'; value: number }
  | { kind: 'sense'; seconds: number }
  | { kind: 'threat'; threat: ThreatKind; stage: ThreatStage; area: AreaId }
  | { kind: 'greeting' }
  | { kind: 'molt'; area: AreaId };

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
  ) {}

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
    }
  }
}
