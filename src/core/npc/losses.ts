/**
 * Who goes missing from the shoal when a threat leaves (doc 10, "Losses",
 * D42). Only unnamed shrimp, never one the player can see or one close by,
 * and never below the floor. Nothing is shown: the shrimp is simply not
 * there any more. Nothing here knows about the engine.
 */

import type { ThreatKind } from '../gameEvents';

export interface LossTuning {
  /** The chance that one goes missing when this threat leaves. The net's is always. */
  chance: Record<ThreatKind, number>;
  /** BL from the player beyond which one may go missing. */
  away: number;
  /** Unnamed shrimp the shoal always keeps. */
  floor: number;
  /** The net takes a second one, one time in two, while this many unnamed remain. */
  netTwoFrom: number;
}

export interface LossCandidate {
  id: string;
  /** Brise, Nacre and Écume are named, and never go missing. */
  named: boolean;
  x: number;
  y: number;
  /** In the player's view now. */
  inView: boolean;
}

/**
 * The ids of the shrimp that go missing as a threat of `kind` reaches its
 * release, or none. `random` is the game's seeded random, so a run replays.
 */
export function pickMissing(
  kind: ThreatKind,
  shoal: readonly LossCandidate[],
  player: { x: number; y: number },
  bl: number,
  random: () => number,
  tuning: LossTuning,
): string[] {
  const unnamed = shoal.filter((one) => !one.named);
  const room = unnamed.length - tuning.floor;
  if (room <= 0) return [];
  if (random() >= tuning.chance[kind]) return [];
  const out = unnamed.filter(
    (one) => !one.inView && Math.hypot(one.x - player.x, one.y - player.y) > tuning.away * bl,
  );
  if (out.length === 0) return [];
  let count = 1;
  if (kind === 'net' && unnamed.length >= tuning.netTwoFrom && random() < 0.5) count = 2;
  count = Math.min(count, room, out.length);
  const picked: string[] = [];
  const left = [...out];
  for (let index = 0; index < count; index++) {
    const at = Math.floor(random() * left.length);
    const [one] = left.splice(at, 1);
    if (one) picked.push(one.id);
  }
  return picked;
}
