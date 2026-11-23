import type { CaptionKey } from './cues';

/**
 * The caption line at the top of the view (doc 12, "What shows over play"):
 * one line at a time, for as long as its sound, and at least `least` seconds.
 * A new sound's caption takes the place of the one showing.
 */

export interface CaptionTuning {
  /** The least a caption holds, in seconds. */
  least: number;
  /** Seconds to come in, and to go. */
  fade: number;
}

export interface Caption {
  key: CaptionKey;
  /** Words to put in the line, such as a companion's name. */
  params: Record<string, string>;
}

export class CaptionLine {
  private current: Caption | null = null;
  private age = 0;
  private hold = 0;

  constructor(private readonly tuning: CaptionTuning) {}

  /** A sound that carries meaning has begun. `seconds` is its length, if known. */
  show(caption: Caption, seconds: number | null): void {
    // The same caption again keeps showing without coming in a second time.
    const same = this.current?.key === caption.key && this.age < this.hold + this.tuning.fade;
    this.current = caption;
    this.hold = Math.max(this.tuning.least, seconds ?? 0);
    this.age = same ? Math.min(this.age, this.tuning.fade) : 0;
  }

  /** Moves time on. Returns the caption showing, if any, and how visible it is. */
  step(dt: number): { caption: Caption | null; alpha: number } {
    if (!this.current) return { caption: null, alpha: 0 };
    this.age += dt;
    const { fade } = this.tuning;
    const end = this.hold + 2 * fade;
    const caption = this.current;
    const alpha = Math.max(0, Math.min(1, this.age / fade, (end - this.age) / fade));
    if (this.age >= end) this.current = null;
    return { caption, alpha };
  }

  get showing(): Caption | null {
    return this.current;
  }

  clear(): void {
    this.current = null;
  }
}
