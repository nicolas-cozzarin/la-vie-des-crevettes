import type { MotionMode } from './core/movement/ShrimpMotion';

/** What the browser test can ask about the player's shrimp. */
export interface PlayerSnapshot {
  x: number;
  y: number;
  heading: number;
  mode: MotionMode;
  height: number;
}

/** Filled in by the play scene while it runs. Read by the debug hook in main.ts. */
export const debugState: { player: (() => PlayerSnapshot) | null } = { player: null };
