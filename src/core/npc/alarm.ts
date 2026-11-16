/**
 * Fright that passes from shrimp to shrimp. When one becomes afraid or
 * flees, every shrimp within reach feels it a moment later, so the fright
 * moves through a group as a wave. See docs/10-feelings-and-states.md,
 * "Alarm". Nothing here knows about the engine.
 */

export interface AlarmTuning {
  /** BL. Who feels it. */
  reach: number;
  /** Seconds before it arrives: a random time between these. */
  delayMin: number;
  delayMax: number;
  /** Seconds. One shrimp feels it at most once in this time, and raises it at most once. */
  every: number;
}

export interface Neighbour {
  id: string;
  x: number;
  y: number;
}

/** An alarm that has reached a shrimp, with where it came from. */
export interface Alarm {
  to: string;
  from: string;
  x: number;
  y: number;
}

interface Pending extends Alarm {
  at: number;
}

export class AlarmNet {
  private pending: Pending[] = [];
  private readonly received = new Map<string, number>();
  private readonly raised = new Map<string, number>();

  constructor(
    private readonly tuning: AlarmTuning,
    private readonly bodyLengthPx: number,
    private readonly random: () => number,
  ) {}

  /**
   * `from` takes fright at (x, y), at `time` seconds. Returns how many
   * neighbours will feel it.
   */
  raise(from: string, x: number, y: number, time: number, shrimp: readonly Neighbour[]): number {
    const last = this.raised.get(from);
    if (last !== undefined && time - last < this.tuning.every) return 0;
    this.raised.set(from, time);
    const reach = this.tuning.reach * this.bodyLengthPx;
    let count = 0;
    for (const one of shrimp) {
      if (one.id === from) continue;
      if (Math.hypot(one.x - x, one.y - y) > reach) continue;
      const { delayMin, delayMax } = this.tuning;
      const at = time + delayMin + (delayMax - delayMin) * this.random();
      this.pending.push({ to: one.id, from, x, y, at });
      count++;
    }
    return count;
  }

  /** The alarms that arrive by `time`. A shrimp that felt one lately lets the next pass. */
  due(time: number): Alarm[] {
    const arrived: Alarm[] = [];
    const waiting: Pending[] = [];
    for (const alarm of this.pending) {
      if (alarm.at > time) {
        waiting.push(alarm);
        continue;
      }
      const last = this.received.get(alarm.to);
      if (last !== undefined && time - last < this.tuning.every) continue;
      this.received.set(alarm.to, time);
      arrived.push({ to: alarm.to, from: alarm.from, x: alarm.x, y: alarm.y });
    }
    this.pending = waiting;
    return arrived;
  }

  /** A shrimp that has gone, so nothing more reaches it. */
  forget(id: string): void {
    this.pending = this.pending.filter((alarm) => alarm.to !== id);
  }
}
