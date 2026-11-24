import type { ChallengeDef, ChapterDef } from '../core/progress/Progress';

/**
 * The challenges (doc 12, "Challenges"). Names and sentences are
 * `challenge.<id>.name` and `challenge.<id>.what` (doc 13). Counts for
 * chapters 2 to 5 read stats that later steps send.
 */
export const CHALLENGES: readonly ChallengeDef[] = [
  { id: 'c0.motes', chapter: 0, type: 'taste', count: { stat: 'eaten.microalgae' }, target: 15 },
  { id: 'c0.larva', chapter: 0, type: 'meet', count: { stat: 'touched.drift.larva' }, target: 1 },
  {
    id: 'c1.tastes',
    chapter: 1,
    type: 'taste',
    count: { distinct: 'tastedIn.mangrove.' },
    target: 3,
  },
  {
    id: 'c1.branch',
    chapter: 1,
    type: 'reach',
    count: { discovery: 'thing.sunkenBranch' },
    target: 1,
  },
  {
    id: 'c1.crab',
    chapter: 1,
    type: 'watch',
    count: { held: 'watchWave', unbroken: true },
    target: 5,
  },
  { id: 'c1.clean', chapter: 1, type: 'escape', count: { stat: 'escapedClean.bird' }, target: 1 },
  { id: 'c1.greet3', chapter: 1, type: 'meet', count: { distinct: 'greeted.' }, target: 3 },
  { id: 'c1.together', chapter: 1, type: 'meet', count: { held: 'hiddenTogether' }, target: 2 },
  { id: 'c1.gentle', chapter: 1, type: 'meet', count: { stat: 'gentle.hermitCrab' }, target: 1 },
  {
    id: 'c2.neighbours',
    chapter: 2,
    type: 'find',
    count: { discovery: 'creature.pistolAndGoby' },
    target: 1,
  },
  { id: 'c2.glow', chapter: 2, type: 'taste', count: { stat: 'glowMeals' }, target: 1 },
  {
    id: 'c2.turtle',
    chapter: 2,
    type: 'watch',
    count: { held: 'followTurtle', unbroken: true },
    target: 20,
  },
  { id: 'c2.favourites', chapter: 2, type: 'meet', count: { distinct: 'favourites.' }, target: 3 },
  { id: 'c2.molt', chapter: 2, type: 'meet', count: { stat: 'stayedThroughMolt' }, target: 1 },
  { id: 'c2.sidestep', chapter: 2, type: 'escape', count: { stat: 'sidesteps' }, target: 1 },
  { id: 'c2.shell', chapter: 2, type: 'find', count: { discovery: 'thing.shedShell' }, target: 1 },
  { id: 'c3.uncornered', chapter: 3, type: 'escape', count: { stat: 'cleanRuns' }, target: 1 },
  {
    id: 'c3.together',
    chapter: 3,
    type: 'meet',
    count: { held: 'allThreeClose', unbroken: true },
    target: 60,
  },
  { id: 'c3.seaweed', chapter: 3, type: 'taste', count: { stat: 'best.seaweedSwim' }, target: 3 },
  { id: 'c4.edge', chapter: 4, type: 'escape', count: { stat: 'netEdge' }, target: 1 },
  { id: 'c4.crevice', chapter: 4, type: 'escape', count: { stat: 'netCrevice' }, target: 1 },
  { id: 'c5.deep', chapter: 5, type: 'reach', count: { discovery: 'place.deep' }, target: 1 },
  { id: 'c5.rest', chapter: 5, type: 'meet', count: { held: 'restClose' }, target: 5 },
];

/**
 * What a pinned challenge's white ribbon leads to, when its target has a
 * place (doc 12, "Pinning"): a thing found in the area, or the nearest
 * animal of a kind. The others have no ribbon. Named, not placed, so that
 * the ribbon follows the area when the coast turns round (D40).
 */
export const CHALLENGE_TARGETS: Readonly<
  Partial<Record<string, { discovery: string } | { creature: string }>>
> = {
  'c1.branch': { discovery: 'thing.sunkenBranch' },
  'c1.crab': { creature: 'fiddlerCrab' },
};

/** The chapters, their place and the step that ends each (doc 12, "Story steps"). */
export const CHAPTERS: readonly ChapterDef[] = [
  { chapter: 0, area: 'drift', end: 's0.brown', hunted: false },
  { chapter: 1, area: 'mangrove', end: 's1.molt', hunted: true },
  { chapter: 2, area: 'lagoon', end: 's2.molt', hunted: true },
  { chapter: 3, area: 'channel', end: 's3.fish2', hunted: true },
  { chapter: 4, area: 'shadow', end: 's4.shoal', hunted: true },
  { chapter: 5, area: 'openSea', end: 's5.spawn', hunted: false },
];
