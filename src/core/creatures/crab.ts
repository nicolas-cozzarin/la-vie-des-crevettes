/**
 * A fiddler crab on the bank: it lifts its big claw up and out and lowers it
 * again, about once every 2 s, in bouts of four or five. Between bouts it
 * picks at the mud and steps sideways. A threat's cue sends it down its
 * burrow; it comes back out after a calm. See docs/11-world-catalogue.md,
 * "Mangrove creatures". Nothing here knows about the engine.
 */

export interface CrabTuning {
  /** Seconds for one wave of the claw. */
  wave: number;
  /** Waves in a bout. */
  bout: { min: number; max: number };
  /** Seconds between bouts. */
  rest: { min: number; max: number };
  /** BL either side of its burrow it steps to, and how fast. */
  side: number;
  sideSpeed: number;
  /** Seconds of calm before it comes back out, plus up to `outSpread` more, so they come one by one. */
  out: number;
  outSpread: number;
}

export interface CrabPose {
  /** 0 the claw down, 1 lifted up and out. */
  claw: number;
  /** BL to its right of where it lives. */
  side: number;
  /** 0 out on the mud, 1 down its burrow. */
  down: number;
  /** Picking at the mud with the small claw. */
  picking: boolean;
}

/** A smooth step from 0 to 1. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export class Crab {
  private phase: 'bout' | 'rest' = 'rest';
  private time = 0;
  private waves = 0;
  private restFor: number;
  private side = 0;
  private sideTarget = 0;
  private sideTime = 0;
  private down = 0;
  /** Seconds left in the burrow. */
  private hidden = 0;

  constructor(
    private readonly tuning: CrabTuning,
    private readonly random: () => number,
  ) {
    // Not every crab starts its bout at the same moment.
    this.restFor = tuning.rest.min * random();
  }

  /** A threat's cue: down the burrow at once. */
  hide(): void {
    const t = this.tuning;
    this.hidden = t.out + t.outSpread * this.random();
  }

  get inBurrow(): boolean {
    return this.hidden > 0;
  }

  /** Out on the mud and in a bout of waving. */
  get waving(): boolean {
    return this.hidden <= 0 && this.phase === 'bout';
  }

  step(dt: number): CrabPose {
    const t = this.tuning;
    if (this.hidden > 0) {
      this.hidden = Math.max(0, this.hidden - dt);
      this.down = Math.min(1, this.down + dt / 0.25);
      return { claw: 0, side: this.side, down: this.down, picking: false };
    }
    this.down = Math.max(0, this.down - dt);
    this.time += dt;

    let claw = 0;
    if (this.phase === 'bout') {
      const w = t.wave;
      const into = this.time;
      if (into < 0.35 * w) claw = ease(into / (0.35 * w));
      else if (into < 0.55 * w) claw = 1;
      else if (into < 0.9 * w) claw = 1 - ease((into - 0.55 * w) / (0.35 * w));
      if (into >= w) {
        this.time = 0;
        this.waves--;
        if (this.waves <= 0) {
          this.phase = 'rest';
          this.restFor = t.rest.min + (t.rest.max - t.rest.min) * this.random();
        }
      }
    } else {
      // Sideways steps between bouts.
      this.sideTime -= dt;
      if (this.sideTime <= 0) {
        this.sideTarget = (this.random() * 2 - 1) * t.side;
        this.sideTime = 1.5 + 1.5 * this.random();
      }
      const gap = this.sideTarget - this.side;
      const step = Math.sign(gap) * Math.min(Math.abs(gap), t.sideSpeed * dt);
      this.side += step;
      if (this.time >= this.restFor) {
        this.phase = 'bout';
        this.time = 0;
        this.waves = t.bout.min + Math.floor(this.random() * (t.bout.max - t.bout.min + 1));
      }
    }
    return { claw, side: this.side, down: this.down, picking: this.phase === 'rest' };
  }
}
