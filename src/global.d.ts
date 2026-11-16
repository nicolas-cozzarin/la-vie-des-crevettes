import type { Bindings } from './core/input/bindings';
import type { Lang } from './core/i18n';
import type { FeelingsSnapshot, PlayerSnapshot } from './debug';

/** Read-only view of the running game, used by the browser test. */
export interface DebugHook {
  /** Keys of the scenes that are currently running. */
  scenes(): string[];
  lang(): Lang;
  bindings(): Bindings;
  /** The player's shrimp, or null outside play. */
  player(): PlayerSnapshot | null;
  /** The player's feelings, mood and conditions, or null outside play. */
  feelings(): FeelingsSnapshot | null;
}

declare global {
  interface Window {
    __lvdc?: DebugHook;
  }
}
