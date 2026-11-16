import type { ActivityName } from './core/activity/Activity';
import type { MotionMode } from './core/movement/ShrimpMotion';

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

/** Filled in by the play scene while it runs. Read by the debug hook in main.ts. */
export const debugState: { player: (() => PlayerSnapshot) | null } = { player: null };
