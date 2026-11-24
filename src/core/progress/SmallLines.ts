/** One small line at the top right: a discovery, a challenge moving, an achievement. */
export interface SmallLine {
  /** Lines with the same id replace each other while they wait, such as "2/3" by "3/3". */
  id: string;
  text: string;
  /** The picture beside the text, if any. */
  icon: string | null;
  /** Bells to ring with it: one, or two for an achievement. */
  bells: 1 | 2;
}

export interface SmallLineTuning {
  /** Seconds a line holds, after it has come in. */
  hold: number;
  /** Seconds to come in, and to go. */
  fade: number;
}

/**
 * The queue of small lines (doc 12, "What shows over play"): one at a time,
 * each in turn. A newer line for the same thing takes the place of one that
 * is still waiting, so a quick run of motes reads "5/15", not five lines.
 */
export class SmallLines {
  private readonly waiting: SmallLine[] = [];
  private current: SmallLine | null = null;
  private age = 0;

  constructor(private readonly tuning: SmallLineTuning) {}

  push(line: SmallLine): void {
    const same = this.waiting.findIndex((one) => one.id === line.id);
    if (same >= 0) this.waiting[same] = line;
    else this.waiting.push(line);
  }

  /** Moves time on. Returns the line showing and how visible it is, from 0 to 1. */
  step(dt: number): { line: SmallLine | null; alpha: number; began: boolean } {
    let began = false;
    if (!this.current) {
      const next = this.waiting.shift();
      if (next) {
        this.current = next;
        this.age = 0;
        began = true;
      }
    }
    if (!this.current) return { line: null, alpha: 0, began };
    this.age += dt;
    const { fade, hold } = this.tuning;
    const line = this.current;
    if (this.age >= hold + 2 * fade) this.current = null;
    const alpha = Math.max(0, Math.min(1, this.age / fade, (hold + 2 * fade - this.age) / fade));
    return { line, alpha, began };
  }

  get pending(): number {
    return this.waiting.length + (this.current ? 1 : 0);
  }
}
