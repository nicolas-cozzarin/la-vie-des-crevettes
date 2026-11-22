import type { ActivityName } from './core/activity/Activity';
import type { Mood } from './core/feelings/mood';
import type { Condition, Feelings } from './core/feelings/types';
import type { MotionMode } from './core/movement/ShrimpMotion';
import type { ScentSnapshot } from './systems/ScentField';
import type { ShrimpSnapshot } from './systems/Shoal';

/** What the browser test can ask about the player's shrimp. */
export interface PlayerSnapshot {
  x: number;
  y: number;
  heading: number;
  mode: MotionMode;
  height: number;
  /** The area being played. */
  area: string;
  /** Opened by `?explore=`. */
  explore: boolean;
  activity: ActivityName;
  /** Under cover and settled. */
  tucked: boolean;
  /** Ids of the named zones the shrimp is in. */
  zones: string[];
}

/** What the browser test can ask about the player's feelings. */
export interface FeelingsSnapshot {
  values: Feelings;
  mood: Mood;
  /** The mood forced by the debug key, or null. */
  forced: Mood | null;
  conditions: Condition[];
  waryLeft: number;
  /** Journal entries found so far in this play. */
  discovered: string[];
  /** What the shrimp is curious about now, if anything. */
  curiousAbout: string | null;
}

/** Filled in by the play scene while it runs. Read by the debug hook in main.ts. */
export const debugState: {
  player: (() => PlayerSnapshot) | null;
  feelings: (() => FeelingsSnapshot) | null;
  scent: (() => ScentSnapshot[]) | null;
  shrimp: (() => ShrimpSnapshot[]) | null;
  creatures: (() => CreaturesSnapshot) | null;
} = { player: null, feelings: null, scent: null, shrimp: null, creatures: null };

/** What the browser test can ask about the animals: where each is, and how strong the rim is. */
export interface CreaturesSnapshot {
  /** A school also says how far its fish are from their places, in BL. */
  animals: { id: string; x: number; y: number; state: string; scattered?: number }[];
  rim: number;
}
