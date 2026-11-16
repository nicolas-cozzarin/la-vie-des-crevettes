/**
 * A school of young fish holding in mid-water, all facing into the current.
 * A tail flip close by, or a threat's cue, bursts it apart, and the fish
 * drift back to their places. See docs/11-world-catalogue.md, "Young fish".
 * Nothing here knows about the engine.
 */

export interface SchoolTuning {
  /** BL. How far the school spreads from its middle, across and along. */
  spread: number;
  wide: number;
  deep: number;
  /** BL a fish sways from its place. */
  sway: number;
  /** BL per second a fish bursts away at. */
  burst: number;
  /** How hard a fish is drawn back to its place, and how fast its speed dies away. */
  pull: number;
  drag: number;
  /** BL. A tail flip this close to the school's middle bursts it. */
  reach: number;
}

export interface Fish {
  x: number;
  y: number;
  heading: number;
}

interface Swimmer extends Fish {
  /** Its place in the school, from the middle. */
  placeX: number;
  placeY: number;
  vx: number;
  vy: number;
  phase: number;
  turn: number;
}

export class School {
  private readonly swimmers: Swimmer[] = [];
  private time = 0;

  constructor(
    private readonly tuning: SchoolTuning,
    readonly x: number,
    readonly y: number,
    private readonly facing: number,
    count: number,
    private readonly bodyLengthPx: number,
    random: () => number,
  ) {
    const bl = bodyLengthPx;
    for (let index = 0; index < count; index++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * tuning.spread * bl;
      const placeX = Math.cos(angle) * distance * tuning.wide;
      const placeY = Math.sin(angle) * distance * tuning.deep;
      this.swimmers.push({
        placeX,
        placeY,
        x: x + placeX,
        y: y + placeY,
        vx: 0,
        vy: 0,
        heading: facing,
        phase: random() * Math.PI * 2,
        turn: (random() - 0.5) * 0.3,
      });
    }
  }

  get fish(): readonly Fish[] {
    return this.swimmers;
  }

  /** How far the fish are from their places, on average, in BL. 0 when settled. */
  get scattered(): number {
    let sum = 0;
    for (const one of this.swimmers) {
      sum += Math.hypot(one.x - this.x - one.placeX, one.y - this.y - one.placeY);
    }
    return this.swimmers.length === 0 ? 0 : sum / this.swimmers.length / this.bodyLengthPx;
  }

  /** A fright at (x, y): close enough, every fish bursts away from it. */
  startle(x: number, y: number): boolean {
    const bl = this.bodyLengthPx;
    if (Math.hypot(x - this.x, y - this.y) > this.tuning.reach * bl) return false;
    for (const one of this.swimmers) {
      let dx = one.x - x;
      let dy = one.y - y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) {
        dx = Math.cos(one.phase);
        dy = Math.sin(one.phase);
      } else {
        dx /= length;
        dy /= length;
      }
      // Each a little off the straight line away, so they fan out.
      const spin = one.turn * 2;
      const ax = dx * Math.cos(spin) - dy * Math.sin(spin);
      const ay = dx * Math.sin(spin) + dy * Math.cos(spin);
      one.vx = ax * this.tuning.burst * bl;
      one.vy = ay * this.tuning.burst * bl;
    }
    return true;
  }

  step(dt: number): void {
    const t = this.tuning;
    const bl = this.bodyLengthPx;
    this.time += dt;
    const across = this.facing + Math.PI / 2;
    for (const one of this.swimmers) {
      const sway = Math.sin(this.time * 0.8 + one.phase) * t.sway * bl;
      const goalX = this.x + one.placeX + Math.cos(across) * sway;
      const goalY = this.y + one.placeY + Math.sin(across) * sway;
      one.vx += ((goalX - one.x) * t.pull - one.vx * t.drag) * dt;
      one.vy += ((goalY - one.y) * t.pull - one.vy * t.drag) * dt;
      one.x += one.vx * dt;
      one.y += one.vy * dt;
      const speed = Math.hypot(one.vx, one.vy);
      // Fast, it faces where it swims; holding, it faces into the current.
      const holding = this.facing + one.turn + 0.06 * Math.sin(this.time * 1.3 + one.phase);
      one.heading = speed > 0.6 * bl ? Math.atan2(one.vy, one.vx) : holding;
    }
  }
}
