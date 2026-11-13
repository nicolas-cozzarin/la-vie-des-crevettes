import type { Lang } from './core/i18n';

/** Read-only view of the running game, used by the browser test. */
export interface DebugHook {
  /** Keys of the scenes that are currently running. */
  scenes(): string[];
  lang(): Lang;
}

declare global {
  interface Window {
    __lvdc?: DebugHook;
  }
}
