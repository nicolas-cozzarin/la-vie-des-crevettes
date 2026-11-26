/**
 * A companion's molt (doc 10, "Molting"; doc 12, `c2.molt`; T104). At night,
 * one named shrimp the player knows, close by, feels its shell grow tight,
 * finds cover and molts. The player who stays within reach through the
 * molt and the soft time after it has stayed with her. Nothing here knows
 * about the engine.
 */

export interface CompanionMoltTuning {
  /** Seconds into the night before a companion may begin to molt. */
  after: number;
  /** BL from the player within which the one who molts must be. */
  near: number;
  /** BL. Within this of her, the whole time, the player stays with her. */
  stay: number;
  /** The bond she must have with the player: someone the player knows. */
  known: number;
}

export interface MoltCandidate {
  id: string;
  named: boolean;
  bond: number;
  x: number;
  y: number;
  /** Molts already in this place. */
  molts: number;
}

/**
 * Who begins to molt now, or null: a named shrimp the player knows, close
 * by. Of those, the one who has molted least here, then the closest bond,
 * so each takes her turn.
 */
export function pickMolter(
  candidates: readonly MoltCandidate[],
  player: { x: number; y: number },
  bl: number,
  tuning: CompanionMoltTuning,
): string | null {
  let best: MoltCandidate | null = null;
  for (const one of candidates) {
    if (!one.named || one.bond < tuning.known) continue;
    if (Math.hypot(one.x - player.x, one.y - player.y) > tuning.near * bl) continue;
    if (
      !best ||
      one.molts < best.molts ||
      (one.molts === best.molts && one.bond > best.bond) ||
      (one.molts === best.molts && one.bond === best.bond && one.id < best.id)
    ) {
      best = one;
    }
  }
  return best?.id ?? null;
}

/**
 * Whether the player stays within reach of her from the moment the molt
 * begins until her shell is hard. One step away beyond it, and it is not
 * counted this time.
 */
export class StayingClose {
  private broken = false;

  constructor(
    private readonly reach: number,
    /** The player was within reach as the molt began. */
    near: boolean,
  ) {
    this.broken = !near;
  }

  /** One step, with the distance between them in px. */
  step(distance: number): void {
    if (distance > this.reach) this.broken = true;
  }

  /** The player has stayed so far. */
  get staying(): boolean {
    return !this.broken;
  }
}
