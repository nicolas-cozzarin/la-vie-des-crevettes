/**
 * One line of narration at a time (doc 12, "What shows over play"; doc 13,
 * "Narration"). A must line waits its turn and always shows. Any other line
 * is dropped if a line is showing, waiting, or began less than `gap` seconds
 * ago; it gets another chance the next time its moment comes. A line shows
 * once in a life unless it is marked to show each time, and then no more
 * often than its `every`.
 */

export interface NarrationLine {
  /** Waits its turn and always shows. */
  must?: boolean;
  /** Shows each time its moment comes, not once in a life. */
  each?: boolean;
  /** Seconds that must pass before a line shown each time may show again. */
  every?: number;
}

export interface NarrationTuning {
  /** Seconds between the start of one line and the next that is not a must line. */
  gap: number;
  fadeIn: number;
  hold: number;
  /** Extra seconds held for each letter. */
  perLetter: number;
  fadeOut: number;
}

/** What shows now: a line's key and how visible it is. */
export interface NarrationShown {
  key: string;
  alpha: number;
}

interface Showing {
  key: string;
  age: number;
  length: number;
}

export class NarrationQueue {
  private readonly waiting: string[] = [];
  private showing: Showing | null = null;
  /** Seconds since the last line began. */
  private sinceLast = Infinity;
  private readonly lastShown = new Map<string, number>();
  private time = 0;

  constructor(
    private readonly lines: Readonly<Record<string, NarrationLine>>,
    private readonly tuning: NarrationTuning,
    /** How many letters a line has, for how long it holds. */
    private readonly letters: (key: string) => number,
    /** Lines already shown in this life. */
    readonly shown: Set<string> = new Set(),
  ) {}

  /** A line's moment has come. Returns whether it will show. */
  say(key: string): boolean {
    const line = this.lines[key];
    if (!line) return false;
    if (!line.each && this.shown.has(key)) return false;
    if (this.waiting.includes(key) || this.showing?.key === key) return false;
    const last = this.lastShown.get(key);
    if (line.each && line.every !== undefined && last !== undefined) {
      if (this.time - last < line.every) return false;
    }
    if (line.must) {
      this.waiting.push(key);
      this.next();
      return true;
    }
    const busy = this.showing !== null || this.waiting.length > 0;
    if (busy || this.sinceLast < this.tuning.gap) return false;
    this.begin(key);
    return true;
  }

  /** Advances by `dt` seconds. */
  step(dt: number): void {
    this.time += dt;
    this.sinceLast += dt;
    if (this.showing) {
      this.showing.age += dt;
      if (this.showing.age >= this.showing.length) this.showing = null;
    }
    this.next();
  }

  /** The line on screen now, if any. */
  get current(): NarrationShown | null {
    const showing = this.showing;
    if (!showing) return null;
    const { fadeIn, fadeOut } = this.tuning;
    const left = showing.length - showing.age;
    const alpha = Math.max(0, Math.min(1, showing.age / fadeIn, left / fadeOut));
    return { key: showing.key, alpha };
  }

  /** Whether a line is showing or waiting. */
  get busy(): boolean {
    return this.showing !== null || this.waiting.length > 0;
  }

  /** Seconds a line stays, from the start of its fade in to the end of its fade out. */
  lengthOf(key: string): number {
    const t = this.tuning;
    return t.fadeIn + t.hold + t.perLetter * this.letters(key) + t.fadeOut;
  }

  private next(): void {
    if (this.showing) return;
    const key = this.waiting.shift();
    if (key !== undefined) this.begin(key);
  }

  private begin(key: string): void {
    this.showing = { key, age: 0, length: this.lengthOf(key) };
    this.sinceLast = 0;
    this.shown.add(key);
    this.lastShown.set(key, this.time);
  }
}
