import type { ThreatStage } from '../feelings/types';
import type { ThreatKind } from '../gameEvents';
import type { ActivityName } from '../activity/Activity';
import type { MotionMode } from '../movement/ShrimpMotion';
import type { EffectName, LoopName } from './sounds';

/**
 * Which sound answers which moment, and which of them carry a caption (doc
 * 05, "Sound effects" and "Captions"; doc 13, "Captions"). Only sounds that
 * carry meaning have a caption.
 */

export type CaptionKey =
  | 'caption.shadow'
  | 'caption.step'
  | 'caption.strike'
  | 'caption.rush'
  | 'caption.relief'
  | 'caption.alarm'
  | 'caption.crackle';

export interface Cue {
  sound: EffectName | null;
  caption: CaptionKey | null;
}

/** A threat moving to a new stage. The bird's cue is its shadow; then it steps in. */
export function stageCue(kind: ThreatKind, stage: ThreatStage): Cue | null {
  if (stage === 'cue') {
    return { sound: 'threatCue', caption: kind === 'fish' ? null : 'caption.shadow' };
  }
  if (stage === 'presence' && kind === 'bird') return { sound: null, caption: 'caption.step' };
  if (stage === 'chase' && kind === 'fish') return { sound: 'rush', caption: 'caption.rush' };
  return null;
}

/** A strike or a charge, hit or miss: what is heard is the same. */
export function strikeCue(kind: ThreatKind): Cue {
  if (kind === 'fish') return { sound: 'rush', caption: 'caption.rush' };
  return { sound: 'splash', caption: 'caption.strike' };
}

/** The threat has gone. */
export const RELIEF: Cue = { sound: 'relief', caption: 'caption.relief' };

/** What the shrimp is doing, for its own sounds that last. */
export interface OwnDoing {
  mode: MotionMode;
  /** Pixels per second. */
  speed: number;
  activity: ActivityName;
}

/**
 * How loud each of the shrimp's own lasting sounds is, 0 to 1: faint ticks
 * while walking, a soft flutter while swimming, tiny crunches while grazing,
 * a glassy wash while sensing.
 */
export function ownLoops(doing: OwnDoing, walkSpeed: number): Record<LoopName, number> {
  const pace = walkSpeed > 0 ? Math.min(1, doing.speed / walkSpeed) : 0;
  const grazing = doing.activity === 'grazing';
  const sensing = doing.activity === 'sensing';
  return {
    walk: doing.mode === 'walk' && !grazing ? pace : 0,
    swim: doing.mode === 'swim' || doing.mode === 'glide' ? Math.min(1, pace) : 0,
    graze: grazing ? 1 : 0,
    sense: sensing ? 1 : 0,
  };
}
