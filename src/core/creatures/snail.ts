/**
 * A mangrove snail: it crawls very slowly, turning a little now and then,
 * and leaves a faint trail. If the shrimp rushes past it stops and pulls in
 * its feelers, and goes on after a calm. See docs/11-world-catalogue.md,
 * "Mangrove creatures". Nothing here knows about the engine.
 */

export interface SnailTuning {
  /** BL per second. */
  speed: number;
  /** The most it turns, in radians per second. */
  turn: number;
  /** BL from where it lives before it turns back. */
  home: number;
  /** BL. A shrimp swimming or darting this close makes it pull in. */
  rushed: number;
  /** Seconds of calm before it comes out again. */
  calm: number;
  /** BL between two points of the trail, and how many points it keeps. */
  trailStep: number;
  trailPoints: number;
}

export interface Passer {
  x: number;
  y: number;
  /** Swimming or darting, not walking. */
  fast: boolean;
}

export class Snail {
  x: number;
  y: number;
  heading: number;
  /** 0 pulled in, 1 out. */
  feelers = 1;
  /** Where it has been, oldest first. */
  readonly trail: { x: number; y: number }[] = [];
  private turning = 0;
  private turnFor = 0;
  private calmLeft = 0;
  private readonly home: { x: number; y: number };

  constructor(
    private readonly tuning: SnailTuning,
    start: { x: number; y: number; heading: number },
    private readonly bodyLengthPx: number,
    private readonly random: () => number,
  ) {
    this.x = start.x;
    this.y = start.y;
    this.heading = start.heading;
    this.home = { x: start.x, y: start.y };
    this.trail.push({ x: start.x, y: start.y });
  }

  get withdrawn(): boolean {
    return this.calmLeft > 0;
  }

  step(dt: number, passer: Passer | null): void {
    const t = this.tuning;
    const bl = this.bodyLengthPx;
    if (passer?.fast && Math.hypot(passer.x - this.x, passer.y - this.y) <= t.rushed * bl) {
      this.calmLeft = t.calm;
    }
    if (this.calmLeft > 0) {
      this.calmLeft = Math.max(0, this.calmLeft - dt);
      this.feelers = Math.max(0, this.feelers - dt / 0.3);
      return;
    }
    this.feelers = Math.min(1, this.feelers + dt);
    if (this.feelers < 0.8) return;

    this.turnFor -= dt;
    if (this.turnFor <= 0) {
      this.turning = (this.random() * 2 - 1) * t.turn;
      this.turnFor = 2 + 2 * this.random();
    }
    let turn = this.turning;
    // Far from home, it bends its way back.
    const dx = this.home.x - this.x;
    const dy = this.home.y - this.y;
    if (Math.hypot(dx, dy) > t.home * bl) {
      const back = Math.atan2(dy, dx);
      let gap = back - this.heading;
      while (gap > Math.PI) gap -= Math.PI * 2;
      while (gap < -Math.PI) gap += Math.PI * 2;
      turn = Math.sign(gap) * t.turn;
    }
    this.heading += turn * dt;
    this.x += Math.cos(this.heading) * t.speed * bl * dt;
    this.y += Math.sin(this.heading) * t.speed * bl * dt;

    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.x - last.x, this.y - last.y) >= t.trailStep * bl) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > t.trailPoints) this.trail.shift();
    }
  }
}
