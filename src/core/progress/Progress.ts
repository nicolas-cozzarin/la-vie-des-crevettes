import type { BondStage, ThreatStage } from '../feelings/types';
import type { Mood } from '../feelings/mood';
import type { ThreatKind } from '../gameEvents';
import type { AreaId, FoodKind } from '../world/kinds';

/**
 * Challenges, achievements and journal cards, counted from what the game
 * does (doc 12). Everything is counted into named stats, and each goal reads
 * a number from them. Nothing here knows about the engine.
 */

/** A number read from the record. */
export type Count =
  /** One stat. */
  | { stat: string }
  /** How many stats with this prefix are above 0: different foods, different shrimp. */
  | { distinct: string }
  /** 1 once found. */
  | { discovery: string }
  /** 1 once done. */
  | { step: string }
  /** 1 once done. */
  | { challenge: string }
  /** Seconds a held condition was true: in all, or the best run without a break. */
  | { held: string; unbroken?: boolean }
  /** Companions at this stage or past it. */
  | { bonds: Exclude<BondStage, 'stranger'> }
  /** How many of every discovery, or every challenge, are found or done. */
  | { every: 'discovery' | 'challenge'; missing?: true };

export type Condition =
  | { count: Count; atLeast: number }
  | { count: Count; atMost: number }
  | { all: readonly Condition[] };

export type ChallengeType = 'taste' | 'reach' | 'watch' | 'escape' | 'meet' | 'find';

export interface ChallengeDef {
  id: string;
  chapter: number;
  type: ChallengeType;
  count: Count;
  target: number;
}

export type AchievementGroup = 'life' | 'company' | 'taste' | 'escape' | 'curiosity';

export interface AchievementDef {
  id: string;
  /** The chapter where it can first be earned. How to earn it shows from then on. */
  chapter: number;
  group: AchievementGroup;
  when: Condition;
}

export interface CardDef {
  id: string;
  when: Condition;
  /** False while a source or a line of it is still to check (doc 07). */
  released: boolean;
}

/** A chapter that ends with a step. `hunted`: a predator lives there. */
export interface ChapterDef {
  chapter: number;
  area: AreaId;
  end: string;
  hunted: boolean;
}

export interface ProgressDefs {
  challenges: readonly ChallengeDef[];
  achievements: readonly AchievementDef[];
  cards: readonly CardDef[];
  chapters: readonly ChapterDef[];
  /** Every discovery id, for "Full carnet". */
  discoveries: readonly string[];
  /** Where each bond stage starts. */
  bondStages: { familiar: number; companion: number; close: number };
  /** The named companions, for "Familiar faces" and "Shoal". */
  companions: readonly string[];
}

/** What a life has done, kept in the save. Progress reads and writes it. */
export interface ProgressRecord {
  stats: Record<string, number>;
  /** The value of each challenge as last shown. */
  challenges: Record<string, number>;
  achievements: Set<string>;
  cards: Set<string>;
  stepsDone: Set<string>;
  discoveries: Set<string>;
  /** The bond with each companion. */
  bonds: Record<string, number>;
}

/** What Progress hears from the game. */
export type ProgressEvent =
  | {
      kind: 'eaten';
      food: FoodKind;
      area: AreaId;
      full: boolean;
      night: boolean;
      /** Among the thick glowing plankton, at night. */
      glowing?: boolean;
    }
  | { kind: 'tailflip' }
  | { kind: 'greeting'; other: string; area: AreaId }
  | { kind: 'touched'; what: string }
  | { kind: 'discovery'; id: string; area: AreaId }
  | { kind: 'step'; id: string }
  | { kind: 'threat'; threat: ThreatKind; stage: ThreatStage; area: AreaId }
  | { kind: 'escaped'; threat: ThreatKind; clean: boolean; still: boolean }
  | { kind: 'cornered'; area: AreaId }
  | { kind: 'molt'; molts: number }
  | { kind: 'ribbon' }
  | { kind: 'groomed' }
  | { kind: 'sense' }
  | { kind: 'mood'; from: Mood; to: Mood }
  | { kind: 'coverLeft'; wary: boolean }
  | { kind: 'area'; area: AreaId }
  | { kind: 'bond'; with: string; value: number }
  /** A count with no event of its own: the yolk ending, a change of shape, landfall. */
  | { kind: 'stat'; stat: string };

/** What changed, for the small line and the save. */
export type ProgressNews =
  | { kind: 'progress'; id: string; value: number; target: number }
  | { kind: 'done'; id: string }
  | { kind: 'achievement'; id: string }
  | { kind: 'card'; id: string };

export function newRecord(): ProgressRecord {
  return {
    stats: {},
    challenges: {},
    achievements: new Set(),
    cards: new Set(),
    stepsDone: new Set(),
    discoveries: new Set(),
    bonds: {},
  };
}

export class Progress {
  /** The current run of each held condition, in seconds. Not saved: a break is a break. */
  private readonly runs = new Map<string, number>();
  private readonly byId: ReadonlyMap<string, ChallengeDef>;

  constructor(
    private readonly defs: ProgressDefs,
    readonly record: ProgressRecord,
    /** With `?debug`, cards still to check unlock too, so the author can read them. */
    private readonly unreleased = false,
  ) {
    this.byId = new Map(defs.challenges.map((one) => [one.id, one]));
  }

  /** Hears one thing the game did. Returns what it changed. */
  hear(event: ProgressEvent): ProgressNews[] {
    this.count(event);
    return this.settle();
  }

  /**
   * Counts the seconds of conditions that last, such as watching a crab
   * wave. A run ends the moment its condition stops.
   */
  hold(dt: number, flags: Readonly<Record<string, boolean>>): ProgressNews[] {
    // Goals read whole seconds, so they are only compared when one is crossed.
    let crossed = false;
    for (const [flag, on] of Object.entries(flags)) {
      const run = on ? (this.runs.get(flag) ?? 0) + dt : 0;
      this.runs.set(flag, run);
      if (!on) continue;
      const held = `held.${flag}`;
      const before = this.stat(held);
      this.add(held, dt);
      if (Math.floor(this.stat(held)) > Math.floor(before)) crossed = true;
      const best = `best.${flag}`;
      const top = this.stat(best);
      if (run > top) {
        this.record.stats[best] = run;
        if (Math.floor(run) > Math.floor(top)) crossed = true;
      }
    }
    return crossed ? this.settle() : [];
  }

  stat(name: string): number {
    return this.record.stats[name] ?? 0;
  }

  /** A challenge's value now, at most its target. */
  value(id: string): number {
    const def = this.byId.get(id);
    if (!def) return 0;
    return Math.min(def.target, Math.floor(this.read(def.count) + 1e-9));
  }

  isDone(id: string): boolean {
    const def = this.byId.get(id);
    return def !== undefined && this.value(id) >= def.target;
  }

  private add(stat: string, by = 1): void {
    this.record.stats[stat] = (this.record.stats[stat] ?? 0) + by;
  }

  private set(stat: string): void {
    this.record.stats[stat] = Math.max(1, this.record.stats[stat] ?? 0);
  }

  /** The rules that turn an event into stats (doc 12, "What the save must hold"). */
  private count(event: ProgressEvent): void {
    const { record } = this;
    switch (event.kind) {
      case 'eaten':
        this.add(`eaten.${event.food}`);
        this.set(`tasted.${event.food}`);
        this.set(`tastedIn.${event.area}.${event.food}`);
        if (event.full) this.add('meals');
        if (event.full && event.night) this.add('nightMeals');
        if (event.full && event.night && event.glowing) this.add('glowMeals');
        if (event.full) this.add('mealsSinceMolt');
        break;
      case 'tailflip':
        this.add('tailFlips');
        break;
      case 'greeting':
        this.add('greetings');
        this.set(`greeted.${event.other}`);
        // Where each one was met and each thing found, for the journal.
        this.set(`metIn.${event.area}.${event.other}`);
        break;
      case 'touched':
        this.add(`touched.${event.what}`);
        break;
      case 'discovery':
        record.discoveries.add(event.id);
        this.set(`foundIn.${event.area}.${event.id}`);
        break;
      case 'step':
        record.stepsDone.add(event.id);
        this.chapterEnded(event.id);
        break;
      case 'threat':
        if (event.stage === 'chase') this.add(`chases.${event.area}`);
        break;
      case 'escaped':
        this.add(`escaped.${event.threat}`);
        if (event.clean) this.add(`escapedClean.${event.threat}`);
        if (event.still) this.add('escapedStill');
        break;
      case 'cornered':
        this.add('cornered');
        this.add(`cornered.${event.area}`);
        break;
      case 'molt':
        record.stats.molts = Math.max(this.stat('molts'), event.molts);
        record.stats.mealsSinceMolt = 0;
        break;
      case 'ribbon':
        this.add('ribbonsFollowed');
        break;
      case 'groomed':
        this.add('grooms');
        break;
      case 'sense':
        this.add('senses');
        break;
      case 'mood':
        if (event.to === 'afraid') this.add('frights');
        if (event.from === 'afraid') this.add('frightsEased');
        break;
      case 'coverLeft':
        if (event.wary) this.add('waryLeft');
        break;
      case 'area':
        this.set(`reached.${event.area}`);
        // "This visit" counts start again.
        record.stats[`chases.${event.area}`] = 0;
        record.stats[`cornered.${event.area}`] = 0;
        break;
      case 'bond':
        record.bonds[event.with] = event.value;
        break;
      case 'stat':
        this.add(event.stat);
        break;
    }
  }

  /** "Unseen": a chapter with a predator, ended with no chase begun in it. */
  private chapterEnded(step: string): void {
    for (const chapter of this.defs.chapters) {
      if (chapter.end !== step || !chapter.hunted) continue;
      if (this.stat(`chases.${chapter.area}`) === 0) this.add('unseen');
    }
  }

  private read(count: Count): number {
    const { record, defs } = this;
    if ('stat' in count) return this.stat(count.stat);
    if ('distinct' in count) {
      let n = 0;
      for (const [key, value] of Object.entries(record.stats)) {
        if (key.startsWith(count.distinct) && value > 0) n++;
      }
      return n;
    }
    if ('discovery' in count) return record.discoveries.has(count.discovery) ? 1 : 0;
    if ('step' in count) return record.stepsDone.has(count.step) ? 1 : 0;
    if ('challenge' in count) return this.isDone(count.challenge) ? 1 : 0;
    if ('held' in count) return this.stat(`${count.unbroken ? 'best' : 'held'}.${count.held}`);
    if ('bonds' in count) {
      const at = defs.bondStages[count.bonds];
      return defs.companions.filter((id) => (record.bonds[id] ?? 0) >= at).length;
    }
    if (count.every === 'discovery') {
      const found = defs.discoveries.filter((id) => record.discoveries.has(id)).length;
      return count.missing ? defs.discoveries.length - found : found;
    }
    const done = defs.challenges.filter((one) => this.isDone(one.id)).length;
    return count.missing ? defs.challenges.length - done : done;
  }

  private meets(when: Condition): boolean {
    if ('all' in when) return when.all.every((one) => this.meets(one));
    const value = this.read(when.count);
    return 'atLeast' in when ? value >= when.atLeast : value <= when.atMost;
  }

  /** Compares every goal with what was last shown, and reports what moved. */
  private settle(): ProgressNews[] {
    const news: ProgressNews[] = [];
    const { record } = this;
    for (const def of this.defs.challenges) {
      const before = record.challenges[def.id] ?? 0;
      const value = this.value(def.id);
      if (value <= before) continue;
      record.challenges[def.id] = value;
      news.push(
        value >= def.target
          ? { kind: 'done', id: def.id }
          : { kind: 'progress', id: def.id, value, target: def.target },
      );
    }
    // Achievements that read challenges see the ones just done.
    for (const def of this.defs.achievements) {
      if (record.achievements.has(def.id) || !this.meets(def.when)) continue;
      record.achievements.add(def.id);
      news.push({ kind: 'achievement', id: def.id });
    }
    for (const def of this.defs.cards) {
      if (record.cards.has(def.id) || (!def.released && !this.unreleased)) continue;
      if (!this.meets(def.when)) continue;
      record.cards.add(def.id);
      news.push({ kind: 'card', id: def.id });
    }
    return news;
  }
}
