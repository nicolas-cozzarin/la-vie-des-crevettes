import type { ProgressDefs } from '../core/progress/Progress';
import { ACHIEVEMENTS } from './achievements';
import { CHALLENGES, CHAPTERS } from './challenges';
import { DISCOVERY_IDS } from './discoveries';
import { CARDS } from './journal';
import { COMPANIONS } from './shrimp';
import { BOND } from './tuning';

/** Everything `Progress` counts toward (doc 12). */
export const PROGRESS_DEFS: ProgressDefs = {
  challenges: CHALLENGES,
  achievements: ACHIEVEMENTS,
  cards: CARDS,
  chapters: CHAPTERS,
  discoveries: DISCOVERY_IDS,
  bondStages: BOND.stages,
  companions: Object.keys(COMPANIONS),
};
