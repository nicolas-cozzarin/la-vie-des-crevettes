import type { Bindings } from './core/input/bindings';
import type { Lang } from './core/i18n';
import type {
  CreaturesSnapshot,
  DriftSnapshot,
  FeelingsSnapshot,
  PlayerSnapshot,
  ThreatSnapshot,
} from './debug';
import type { ScentSnapshot } from './systems/ScentField';
import type { ShrimpSnapshot } from './systems/Shoal';

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
  /** The scent ribbons drawn now, or null outside play. */
  scent(): ScentSnapshot[] | null;
  /** The other shrimp: where they are, what they do, and the bond with each. */
  shrimp(): ShrimpSnapshot[] | null;
  /** The animals that move, and the strength of the pale rim on the curious target. */
  creatures(): CreaturesSnapshot | null;
  /** The threat under way: its stage, notice, the strike ring, and whether the player is cornered. */
  threat(): ThreatSnapshot | null;
  /** The larva in the Drift, or null outside it. */
  drift(): DriftSnapshot | null;
}

declare global {
  interface Window {
    __lvdc?: DebugHook;
  }
}
