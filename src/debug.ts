import type { ActivityName } from './core/activity/Activity';
import type { Mood } from './core/feelings/mood';
import type { Condition, DayPhase, Feelings, ThreatStage } from './core/feelings/types';
import type { DayLight } from './core/world/dayCycle';
import type { ThreatKind } from './core/gameEvents';
import type { MotionMode } from './core/movement/ShrimpMotion';
import type { AudioSnapshot } from './systems/AudioDirector';
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
  /** Where a molt is, and how many molts this life has had. */
  molt: string;
  molts: number;
  /** The story steps done in this life. */
  steps: string[];
  /** The line of narration on screen, by its key, or null. */
  narration: string | null;
  /** The place the shrimp is on its way to, or null. */
  leaving: string | null;
  /** The activity's prompt on screen, by its key, or null. */
  prompt: string | null;
}

/** What the browser test can ask about the time of day, where a place has one. */
export interface DaySnapshot {
  phase: DayPhase;
  /** Seconds left in the phase. */
  left: number;
  light: DayLight;
  /** How likely an ambient threat is, against the usual. */
  ambient: number;
  /** How strong the veils of dusk and night are on screen. */
  dusk: number;
  night: number;
  /** Plankton points drawn, those lit, and whether any is lit near the player. */
  plankton: number;
  lit: number;
  litNearPlayer: boolean;
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
  threat: (() => ThreatSnapshot) | null;
  drift: (() => DriftSnapshot) | null;
  journal: (() => JournalSnapshot) | null;
  progress: (() => ProgressSnapshot) | null;
  audio: (() => AudioSnapshot) | null;
  day: (() => DaySnapshot | null) | null;
} = {
  player: null,
  feelings: null,
  scent: null,
  shrimp: null,
  creatures: null,
  threat: null,
  drift: null,
  journal: null,
  progress: null,
  audio: null,
  day: null,
};

/** What the browser test can ask about the open journal. */
export interface JournalSnapshot {
  page: string;
  index: number;
  /** The ids of the entries on this page. */
  entries: string[];
  pinned: string | null;
  /** Entries on this page with the dot of "new since last opened". */
  fresh: string[];
}

/** What the browser test can ask about the life's progress. */
export interface ProgressSnapshot {
  challenges: Record<string, number>;
  achievements: string[];
  cards: string[];
  discoveries: string[];
  stats: Record<string, number>;
  pinned: string | null;
  /** The small line on screen, by its id, or null. */
  line: string | null;
}

/** What the browser test can ask about the larva in the Drift. */
export interface DriftSnapshot {
  x: number;
  y: number;
  /** How far along the Drift, the way the water runs. */
  along: number;
  heading: number;
  shape: 'early' | 'mid' | 'late';
  /** A to E. */
  zone: string;
  /** Seconds since the Drift began. */
  time: number;
  yolk: boolean;
  /** Motes eaten, and other larvae touched. */
  eaten: number;
  touched: number;
  /** Other larvae still drifting. */
  larvae: number;
  landing: boolean;
  explore: boolean;
  steps: string[];
  narration: string | null;
  nearestMote: { x: number; y: number; distance: number } | null;
}

/** What the browser test can ask about the threat under way. */
export interface ThreatSnapshot {
  stage: ThreatStage;
  kind: ThreatKind | null;
  notice: number;
  strikes: number;
  ring: { x: number; y: number } | null;
  predator: { x: number; y: number } | null;
  /** The cornered sequence is running. */
  cornered: boolean;
}

/** What the browser test can ask about the animals: where each is, and how strong the rim is. */
export interface CreaturesSnapshot {
  /** A school also says how far its fish are from their places, in BL. */
  animals: { id: string; x: number; y: number; state: string; scattered?: number }[];
  rim: number;
}
