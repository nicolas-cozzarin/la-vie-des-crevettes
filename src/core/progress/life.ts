import type { AreaId, FoodKind } from '../world/kinds';
import { newRecord, type ProgressRecord } from './Progress';

/**
 * What one life carries from place to place and keeps in the save: the
 * story steps done, the lines already narrated, what has been found, the
 * places seen, the molts, the feelings that carry over, and everything the
 * journal counts (doc 06, `SaveV1`; doc 12, "What the save must hold").
 */
export interface Life extends ProgressRecord {
  narrated: Set<string>;
  placesSeen: Set<AreaId>;
  molts: number;
  /** The hunger to start the next place with, or null for the place's own. */
  hunger: number | null;
  /** The food this shrimp likes best, chosen once in a life (T35). */
  favourite: FoodKind | null;
  /** Which life this is: 1 for the first. */
  generation: number;
  /** The challenge pinned in the journal. */
  pinned: string | null;
  /** How many times each prompt has shown, for the first three times (doc 03). */
  promptsShown: Record<string, number>;
  playSeconds: number;
  /** What the journal showed when it was last opened, so what is new has a dot. */
  journalSeen: Set<string>;
}

export function newLife(): Life {
  return {
    ...newRecord(),
    narrated: new Set(),
    placesSeen: new Set(),
    molts: 0,
    hunger: null,
    favourite: null,
    generation: 1,
    pinned: null,
    promptsShown: {},
    playSeconds: 0,
    journalSeen: new Set(),
  };
}

/** Counts kept for one life only: its story's own visits, losses and leads. */
const ONE_LIFE = [
  'cornered',
  'cornered.',
  'missing',
  'missing.',
  'released.',
  'led.',
  'chases.',
  'cleanRun.',
];

/**
 * A new life that keeps the carnet of an old one: what was found, the
 * challenges, achievements and cards, the counts, the prompts shown and the
 * time played. Nothing is ever taken away (doc 12). What the old life
 * counted toward its own story does not carry over: the threats that came
 * and went, the shoal's losses, who led to food, the times cornered (T123).
 * `generation` is the new one's, kept in the counts too for "Second tide".
 */
export function lifeAfter(old: Life, generation = old.generation): Life {
  const stats: Record<string, number> = {};
  for (const [key, value] of Object.entries(old.stats)) {
    const ofOneLife = ONE_LIFE.some((one) =>
      one.endsWith('.') ? key.startsWith(one) : key === one,
    );
    if (!ofOneLife) stats[key] = value;
  }
  stats.generation = Math.max(stats.generation ?? 0, generation);
  return {
    ...newLife(),
    discoveries: new Set(old.discoveries),
    challenges: { ...old.challenges },
    achievements: new Set(old.achievements),
    cards: new Set(old.cards),
    stats,
    generation,
    promptsShown: { ...old.promptsShown },
    playSeconds: old.playSeconds,
    journalSeen: new Set(old.journalSeen),
  };
}
