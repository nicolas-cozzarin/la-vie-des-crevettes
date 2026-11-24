import type { AchievementDef } from '../core/progress/Progress';

/**
 * The achievements (doc 12, "Achievements"). Names and how each is earned
 * are `ach.<id>.name` and `ach.<id>.how` (doc 13). The stamp is the picture
 * `icon.ach.<id>`. `chapter` is where it can first be earned: how to earn it
 * shows in the journal from then on.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'landfall', chapter: 0, group: 'life', when: { count: { stat: 'landfalls' }, atLeast: 1 } },
  { id: 'newShell', chapter: 1, group: 'life', when: { count: { stat: 'molts' }, atLeast: 1 } },
  { id: 'fullGrown', chapter: 5, group: 'life', when: { count: { stat: 'molts' }, atLeast: 3 } },
  {
    id: 'antenna',
    chapter: 1,
    group: 'company',
    when: { count: { stat: 'greetings' }, atLeast: 1 },
  },
  {
    id: 'familiar',
    chapter: 2,
    group: 'company',
    when: { count: { bonds: 'familiar' }, atLeast: 3 },
  },
  { id: 'shoal', chapter: 2, group: 'company', when: { count: { bonds: 'close' }, atLeast: 3 } },
  {
    id: 'everyTaste',
    chapter: 3,
    group: 'taste',
    when: { count: { distinct: 'tasted.' }, atLeast: 6 },
  },
  {
    id: 'nose',
    chapter: 1,
    group: 'curiosity',
    when: { count: { stat: 'ribbonsFollowed' }, atLeast: 10 },
  },
  {
    id: 'quickTail',
    chapter: 1,
    group: 'escape',
    when: { count: { stat: 'tailFlips' }, atLeast: 50 },
  },
  { id: 'unseen', chapter: 1, group: 'escape', when: { count: { stat: 'unseen' }, atLeast: 1 } },
  {
    id: 'neverCornered',
    chapter: 5,
    group: 'escape',
    when: {
      all: [
        { count: { stat: 'reached.openSea' }, atLeast: 1 },
        { count: { stat: 'cornered' }, atMost: 0 },
      ],
    },
  },
  {
    id: 'underGrid',
    chapter: 4,
    group: 'escape',
    when: { count: { step: 's4.shoal' }, atLeast: 1 },
  },
  {
    id: 'nightGrazer',
    chapter: 2,
    group: 'taste',
    when: { count: { stat: 'nightMeals' }, atLeast: 10 },
  },
  {
    id: 'neighbour',
    chapter: 2,
    group: 'curiosity',
    when: { count: { discovery: 'creature.pistolAndGoby' }, atLeast: 1 },
  },
  {
    id: 'slowCompany',
    chapter: 2,
    group: 'company',
    when: { count: { challenge: 'c2.turtle' }, atLeast: 1 },
  },
  {
    id: 'openWater',
    chapter: 5,
    group: 'life',
    when: { count: { stat: 'reached.openSea' }, atLeast: 1 },
  },
  { id: 'nextOnes', chapter: 5, group: 'life', when: { count: { stat: 'spawned' }, atLeast: 1 } },
  {
    id: 'secondTide',
    chapter: 5,
    group: 'life',
    when: { count: { stat: 'generation' }, atLeast: 2 },
  },
  {
    id: 'fifthTide',
    chapter: 5,
    group: 'life',
    when: { count: { stat: 'generation' }, atLeast: 5 },
  },
  {
    id: 'fullCarnet',
    chapter: 0,
    group: 'curiosity',
    when: { count: { every: 'discovery', missing: true }, atMost: 0 },
  },
  {
    id: 'allOfIt',
    chapter: 0,
    group: 'curiosity',
    when: { count: { every: 'challenge', missing: true }, atMost: 0 },
  },
  {
    id: 'cleanAntennae',
    chapter: 1,
    group: 'life',
    when: { count: { stat: 'grooms' }, atLeast: 10 },
  },
  {
    id: 'stoneStill',
    chapter: 1,
    group: 'escape',
    when: { count: { stat: 'escapedStill' }, atLeast: 1 },
  },
  {
    id: 'gentle',
    chapter: 1,
    group: 'company',
    when: { count: { challenge: 'c1.gentle' }, atLeast: 1 },
  },
];
