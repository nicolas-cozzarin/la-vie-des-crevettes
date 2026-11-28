import type { Feelings } from '../feelings/types';

/**
 * What another shrimp can choose to do, and how much it wants each. See
 * docs/10-feelings-and-states.md, "Choosing what to do". Nothing here knows
 * about the engine.
 */
export const BEHAVIOURS = [
  'flee',
  'hide',
  'freeze',
  'graze',
  'greet',
  'follow',
  'travel',
  'groom',
  'rest',
  'wander',
] as const;
export type Behaviour = (typeof BEHAVIOURS)[number];

/** Each from 0 to 1. See doc 10, "Temperament". */
export interface Temperament {
  boldness: number;
  sociability: number;
  activity: number;
}

export interface NpcTuning {
  /** Seconds between two choices for one shrimp. */
  decideEvery: number;
  /** Added to the behaviour already under way, so the shrimp does not dither. */
  keep: number;
  /** Flee at fear of `base + perBoldness * boldness` or more. */
  flee: { base: number; perBoldness: number; darts: number; swim: number };
  /** Hide at this fear with cover within `reach` BL; stop once fear is below `calm` for `holdFactor - boldness` times `holdScale` s. */
  hide: { fear: number; reach: number; calm: number; holdFactor: number; holdScale: number };
  /** The freeze score during a cue, and its length after a neighbour's alarm. */
  freeze: { score: number; afterAlarm: number };
  /** Grazing stops below this hunger, and only food within `range` BL is wanted. */
  graze: { stop: number; range: number };
  /** Greet when another shrimp is within `base + perSociability * sociability` BL, at most once per `every` s. */
  greet: { base: number; perSociability: number; every: number; touch: number; giveUp: number };
  /** Follow when called, keeping `near` to `far` BL away, for `seconds`. From chapter 2, the shoal pull. */
  follow: {
    called: number;
    near: number;
    far: number;
    seconds: number;
    shoalFactor: number;
    shoalSpan: number;
  };
  /** Travel with the tide (T113): this score while farther than `arrive` BL from where the shoal makes for. */
  travel: { score: number; arrive: number };
  groom: { factor: number; min: number; max: number };
  /** Rest: `factor * comfort * (1 - activity)`, plus `lagoonDay` by day in the lagoon, plus `beside` to rest touching a still player at Close (T105). Seconds of rest: `min + span * (1 - activity)`. */
  rest: { factor: number; lagoonDay: number; min: number; span: number; beside: number };
  /** Wander: `base + perActivity * activity`, to a point within `reach` BL, within `home` BL of where it lives. */
  wander: {
    base: number;
    perActivity: number;
    reach: number;
    home: number;
    giveUp: number;
    waryCover: number;
  };
  /** A molt is sheltered in cover within `cover` BL, or else where the shrimp stands. */
  molt: { cover: number };
  /** A Stranger keeps `keep` BL from the player, and backs off to `backOff` BL when rushed within `rushed`. */
  stranger: { keep: number; backOff: number; rushed: number };
  /** A walk is a run of steps, then a pause that grows as activity falls. Seconds. */
  walk: { on: number; off: number; offIdle: number; strength: number };
  /** Afraid: short bursts, then stillness. */
  afraidWalk: { on: number; off: number };
  /** Seconds of no progress before a walk is given up. */
  stuck: number;
}

/** What a shrimp knows when it chooses. The scene and the shoal gather it. */
export interface ChoiceView {
  feelings: Readonly<Feelings>;
  /** The mood is calm. */
  calm: boolean;
  wary: boolean;
  /** A threat's cue is under way (step 7). */
  cue: boolean;
  /** Seconds since a neighbour's alarm reached it. */
  sinceAlarm: number;
  /** BL to the edge of the nearest cover, or null if there is none. */
  coverGap: number | null;
  /** A patch with food lies within the graze range. */
  food: boolean;
  /** Another shrimp it may greet lies within its greeting distance, and it has not greeted for a while. */
  greetable: boolean;
  /** Called by the player with a bond of Companion or more, within the follow time. */
  called: boolean;
  /** From chapter 2: BL to the middle of the shoal, or null. */
  shoalGap: number | null;
  /** By day in the lagoon (chapter 2). */
  lagoonDay: boolean;
  /** At Close, with the player keeping still close by: it comes to rest touching (T105). */
  restBeside?: boolean;
  /** In water that runs: BL to where the shoal makes for on its journey, or null (T113). */
  journeyGap?: number | null;
}

/** The fear at which a shrimp of this boldness flees: 0.38 for Nacre, 0.64 for Brise. */
export function fleeAt(boldness: number, tuning: NpcTuning): number {
  return tuning.flee.base + tuning.flee.perBoldness * boldness;
}

/** Every behaviour's score, by doc 10's table. Molt is scripted and not scored. */
export function scoreBehaviours(
  view: ChoiceView,
  temperament: Temperament,
  tuning: NpcTuning,
): Record<Behaviour, number> {
  const { fear, hunger, company, comfort } = view.feelings;
  const t = tuning;
  const cover = view.coverGap !== null && view.coverGap <= t.hide.reach;
  const frozen = view.cue || view.sinceAlarm < t.freeze.afterAlarm;
  const shoal =
    view.shoalGap === null ? 0 : (t.follow.shoalFactor * view.shoalGap) / t.follow.shoalSpan;
  return {
    flee: fear >= fleeAt(temperament.boldness, t) - 1e-9 ? 1 : 0,
    hide: fear >= t.hide.fear && cover ? 1 : 0,
    freeze: frozen ? t.freeze.score : 0,
    graze: view.food && hunger >= t.graze.stop ? hunger : 0,
    greet: view.greetable ? (1 - company) * temperament.sociability : 0,
    follow: view.called ? t.follow.called : Math.min(1, shoal),
    travel:
      view.journeyGap !== undefined && view.journeyGap !== null && view.journeyGap > t.travel.arrive
        ? t.travel.score
        : 0,
    groom: view.calm && !view.wary ? t.groom.factor * comfort : 0,
    rest:
      t.rest.factor * comfort * (1 - temperament.activity) +
      (view.lagoonDay ? t.rest.lagoonDay : 0) +
      (view.restBeside ? t.rest.beside : 0),
    wander: t.wander.base + t.wander.perActivity * temperament.activity,
  };
}

/**
 * The behaviour with the highest score. The one under way gets `keep` on
 * top, unless it has ended. Ties go to the earlier one in `BEHAVIOURS`,
 * which puts safety first.
 */
export function chooseBehaviour(
  scores: Readonly<Record<Behaviour, number>>,
  current: Behaviour | null,
  keep: number,
): Behaviour {
  let best: Behaviour = 'wander';
  let bestScore = -Infinity;
  for (const behaviour of BEHAVIOURS) {
    const score = scores[behaviour] + (behaviour === current ? keep : 0);
    if (score > bestScore) {
      best = behaviour;
      bestScore = score;
    }
  }
  return best;
}
