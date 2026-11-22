/**
 * A hermit crab in the mangrove mud (doc 11, "Hermit crab"): it walks in
 * short jerky runs. If the shrimp swims or darts close by it vanishes into
 * its shell, which rocks and lies still; after a calm its legs come back out.
 * If the shrimp walks up slowly it carries on, and reaching it like that is
 * the challenge "Slowly" (doc 12, `c1.gentle`). Nothing here knows about the
 * engine.
 */

export interface HermitTuning {
  /** BL per second during a run. */
  speed: number;
  /** Seconds a run lasts, and the pause after it: least and most. */
  run: { min: number; max: number };
  pause: { min: number; max: number };
  /** The most it turns between two runs, in radians. */
  turn: number;
  /** BL from where it lives before it turns back. */
  home: number;
  /** BL. A shrimp swimming or darting this close sends it into its shell. */
  rushed: number;
  /** Seconds of calm before its legs come back out. */
  calm: number;
  /** Seconds the legs take to come out again. */
  outTime: number;
  /** BL. Walking up this close to it, out of its shell, is meeting it gently. */
  gentle: number;
}

export interface HermitPasser {
  x: number;
  y: number;
  /** Swimming or darting, not walking. */
  fast: boolean;
}

export class Hermit {
  x: number;
  y: number;
  heading: number;
  /** 0 in its shell, 1 legs out. */
  out = 1;
  /** How far the shell rocks, in radians, after it pulls in. */
  rock = 0;
  private running = false;
  private phaseLeft: number;
  private calmLeft = 0;
  private rockTime = 0;
  /** Met gently on this approach: the shrimp must go away before it counts again. */
  private met = false;
  private readonly home: { x: number; y: number };

  constructor(
    private readonly tuning: HermitTuning,
    start: { x: number; y: number; heading: number },
    private readonly bodyLengthPx: number,
    private readonly random: () => number,
  ) {
    this.x = start.x;
    this.y = start.y;
    this.heading = start.heading;
    this.home = { x: start.x, y: start.y };
    this.phaseLeft = this.between(tuning.pause);
  }

  get withdrawn(): boolean {
    return this.calmLeft > 0 || this.out < 1;
  }

  /** One step. Returns true on the step the shrimp first walks up to it gently. */
  step(dt: number, passer: HermitPasser | null): boolean {
    const t = this.tuning;
    const bl = this.bodyLengthPx;
    const distance = passer ? Math.hypot(passer.x - this.x, passer.y - this.y) : Infinity;
    if (passer?.fast && distance <= t.rushed * bl) {
      if (this.calmLeft === 0) this.rockTime = 0;
      this.calmLeft = t.calm;
      this.running = false;
    }
    this.rockTime += dt;
    if (this.calmLeft > 0) {
      this.calmLeft = Math.max(0, this.calmLeft - dt);
      this.out = Math.max(0, this.out - dt / 0.2);
      // The shell rocks as it lands, then lies still.
      this.rock = 0.2 * Math.exp(-3 * this.rockTime) * Math.sin(this.rockTime * 14);
      return this.gentle(distance);
    }
    this.rock = 0;
    if (this.out < 1) {
      this.out = Math.min(1, this.out + dt / t.outTime);
      return this.gentle(distance);
    }

    this.phaseLeft -= dt;
    if (this.phaseLeft <= 0) {
      this.running = !this.running;
      if (this.running) {
        this.phaseLeft = this.between(t.run);
        this.heading += (this.random() * 2 - 1) * t.turn;
        // Far from home, it heads back.
        const dx = this.home.x - this.x;
        const dy = this.home.y - this.y;
        if (Math.hypot(dx, dy) > t.home * bl) this.heading = Math.atan2(dy, dx);
      } else {
        this.phaseLeft = this.between(t.pause);
      }
    }
    if (this.running) {
      this.x += Math.cos(this.heading) * t.speed * bl * dt;
      this.y += Math.sin(this.heading) * t.speed * bl * dt;
    }
    return this.gentle(distance);
  }

  private gentle(distance: number): boolean {
    const bl = this.bodyLengthPx;
    if (distance > 2 * this.tuning.gentle * bl) this.met = false;
    if (this.met || this.withdrawn || distance > this.tuning.gentle * bl) return false;
    this.met = true;
    return true;
  }

  private between(range: { min: number; max: number }): number {
    return range.min + (range.max - range.min) * this.random();
  }
}
