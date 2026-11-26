import type { Mood } from './feelings/mood';
import type { BondStage, Condition, DayPhase, StimulusKind, ThreatStage } from './feelings/types';
import type { AreaId, FoodKind } from './world/kinds';

/**
 * Every event the game's systems send each other, on one `EventBus`. The
 * list is the one in docs/15-implementation-guide.md, "The game's events".
 * Step 4 sends the mood, condition, tail flip and discovery events; the rest are sent by
 * the steps that build them.
 */

/** `player`, a companion's name, or the id of an unnamed shrimp. */
export type ShrimpId = string;
export type ThreatKind = 'bird' | 'fish' | 'net';
export type MoltPhase = 'signal' | 'shelter' | 'molt' | 'soft';

export type GameEvents = {
  'mood:changed': { who: ShrimpId; from: Mood; to: Mood };
  'condition:changed': { who: ShrimpId; condition: Condition; on: boolean };
  stimulus: { who: ShrimpId; kind: StimulusKind };
  'food:eaten': {
    who: ShrimpId;
    kind: FoodKind;
    first: boolean;
    full: boolean;
    patchId: string;
    /** The patch was eaten to nothing. */
    cleared?: boolean;
  };
  'sense:used': { seconds: number };
  'ribbon:followed': { kind: FoodKind; patchId: string };
  tailflip: { who: ShrimpId };
  'cover:entered': { who: ShrimpId; coverId: string };
  'cover:left': { who: ShrimpId; coverId: string; wary: boolean };
  groomed: { who: ShrimpId };
  greeting: { a: ShrimpId; b: ShrimpId };
  'bond:changed': { with: ShrimpId; value: number; stage: BondStage };
  'threat:stage': { kind: ThreatKind; stage: ThreatStage };
  'threat:strike': { kind: ThreatKind; hit: boolean };
  'threat:escaped': { kind: ThreatKind; clean: boolean; still: boolean };
  cornered: { kind: ThreatKind };
  'molt:phase': { who: ShrimpId; phase: MoltPhase };
  'molt:done': { who: ShrimpId; molts: number };
  discovery: { id: string };
  'step:done': { id: string };
  'challenge:progress': { id: string; value: number; target: number };
  'challenge:done': { id: string };
  achievement: { id: string };
  'card:unlocked': { id: string };
  'area:entered': { area: AreaId };
  'zone:entered': { area: AreaId; zone: string };
  'day:phase': { phase: DayPhase };
  spawned: { generation: number };
};
