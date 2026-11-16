/**
 * Things the shrimp has not come to know yet, how hard each pulls on its
 * curiosity, and when it is found. Nothing here knows about the engine.
 * See docs/10-feelings-and-states.md, "Curiosity".
 */

export type DiscoverableKind = 'creature' | 'thing';

export interface Discoverable {
  /** The journal entry, such as `creature.fiddlerCrab` or `thing.seedPod`. */
  id: string;
  kind: DiscoverableKind;
  x: number;
  y: number;
  /** Found by going under it, as the hollow is: the radius of the cover. */
  under?: number;
}

export interface DiscoveryTuning {
  /** BL. How far curiosity reaches. */
  range: number;
  weights: Record<DiscoverableKind, number>;
  /** BL and seconds to find each kind. */
  find: Record<DiscoverableKind, { distance: number; seconds: number }>;
}

export interface Pull {
  value: number;
  target: Discoverable | null;
}

/** The pull of the strongest unknown thing in range. */
export function curiosityPull(
  x: number,
  y: number,
  things: readonly Discoverable[],
  known: ReadonlySet<string>,
  tuning: DiscoveryTuning,
  bodyLengthPx: number,
): Pull {
  const range = tuning.range * bodyLengthPx;
  let best: Pull = { value: 0, target: null };
  for (const thing of things) {
    if (known.has(thing.id)) continue;
    const distance = Math.hypot(thing.x - x, thing.y - y);
    if (distance >= range) continue;
    const value = tuning.weights[thing.kind] * (1 - distance / range);
    if (value > best.value) best = { value, target: thing };
  }
  return best;
}

/**
 * Keeps what is known, and finds things: a creature after 2 s within 2.5 BL,
 * a thing after 1 s within 1.5 BL, or at once when the shrimp goes under it.
 */
export class DiscoveryTracker {
  private readonly found: Set<string>;
  /** Seconds spent close to each thing. */
  private readonly near = new Map<Discoverable, number>();

  constructor(
    private readonly tuning: DiscoveryTuning,
    private readonly bodyLengthPx: number,
    known: Iterable<string> = [],
  ) {
    this.found = new Set(known);
  }

  get known(): ReadonlySet<string> {
    return this.found;
  }

  /** Marks an entry found by other means: a place entered, a food tasted. Returns true if new. */
  add(id: string): boolean {
    if (this.found.has(id)) return false;
    this.found.add(id);
    return true;
  }

  pull(x: number, y: number, things: readonly Discoverable[]): Pull {
    return curiosityPull(x, y, things, this.found, this.tuning, this.bodyLengthPx);
  }

  /** Returns the entries found on this step. */
  step(dt: number, x: number, y: number, things: readonly Discoverable[]): string[] {
    const found: string[] = [];
    for (const thing of things) {
      if (this.found.has(thing.id)) continue;
      const distance = Math.hypot(thing.x - x, thing.y - y);
      if (thing.under !== undefined) {
        if (distance < thing.under && this.add(thing.id)) found.push(thing.id);
        continue;
      }
      const rule = this.tuning.find[thing.kind];
      if (distance > rule.distance * this.bodyLengthPx) {
        this.near.delete(thing);
        continue;
      }
      const seconds = (this.near.get(thing) ?? 0) + dt;
      this.near.set(thing, seconds);
      // A little slack, so that steps that add up to the time count as reaching it.
      if (seconds >= rule.seconds - 1e-6 && this.add(thing.id)) found.push(thing.id);
    }
    return found;
  }
}
