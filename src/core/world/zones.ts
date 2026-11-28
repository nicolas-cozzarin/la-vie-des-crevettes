/**
 * Named parts of an area. Entering one can move the story or the journal.
 * Nothing here knows about the engine.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ZoneSpot {
  id: string;
  zone: Rect;
}

export function inRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** The first zone that holds the point, in the order given, or null. */
export function zoneAt<T extends ZoneSpot>(x: number, y: number, zones: readonly T[]): T | null {
  return zones.find((spot) => inRect(x, y, spot.zone)) ?? null;
}

export interface ZoneChange {
  entered: string[];
  left: string[];
}

/**
 * Reports each zone once when the shrimp comes into it and once when it
 * leaves. Zones may overlap: each is followed on its own.
 */
export class ZoneTracker {
  private inside = new Set<string>();
  private readonly seconds = new Map<string, number>();

  constructor(private readonly zones: readonly ZoneSpot[]) {}

  /** The zones the point is in now. */
  get current(): ReadonlySet<string> {
    return this.inside;
  }

  update(x: number, y: number, dt = 0): ZoneChange {
    const now = new Set(this.zones.filter((spot) => inRect(x, y, spot.zone)).map((s) => s.id));
    const entered = [...now].filter((id) => !this.inside.has(id));
    const left = [...this.inside].filter((id) => !now.has(id));
    this.inside = now;
    for (const id of left) this.seconds.delete(id);
    for (const id of now) this.seconds.set(id, entered.includes(id) ? 0 : this.inFor(id) + dt);
    return { entered, left };
  }

  /** Seconds the point has been in a zone without leaving it, 0 if it is not in it. */
  inFor(id: string): number {
    return this.seconds.get(id) ?? 0;
  }
}
