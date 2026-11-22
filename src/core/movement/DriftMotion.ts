/** The larva's three looks (doc 11, "Chapter 0. Drift"). */
export type LarvaShape = 'early' | 'mid' | 'late';

export interface DriftTuning {
  /** Pixels per second the water carries everything along. */
  flow: number;
  /** Pixels per second the larva steers up or down, at full strength. */
  steer: number;
  /** Pixels per second it leans with or against the flow. */
  lean: number;
  /** Seconds to reach the speed asked for. */
  response: number;
  /** Beats per second of the limbs, and how much of the larva's own push comes in beats, by shape. */
  beat: Readonly<Record<LarvaShape, { rate: number; depth: number }>>;
  /** Pixels kept between the larva and the top and bottom of the water. */
  margin: number;
  /** The most the body tilts from the way the water runs, in radians. */
  tilt: number;
}

/**
 * The larva in the Drift (doc 02, "Larva"; doc 11). The water carries it
 * along; the player steers it up and down and can lean with or against the
 * flow. Its own push comes in beats of its limbs: jerks for the first shape,
 * small pulses for the second, a steady swim for the last. `direction` is 1
 * when the water runs to the right, -1 when the coast is turned round.
 */
export class DriftMotion {
  vx: number;
  vy = 0;
  /** Where the head points, in radians. */
  heading: number;
  /** The phase of the limbs' beat, in radians. */
  beat = 0;

  constructor(
    private readonly tuning: DriftTuning,
    public x: number,
    public y: number,
    private readonly height: number,
    private readonly direction: 1 | -1 = 1,
  ) {
    this.vx = tuning.flow * direction;
    this.heading = direction > 0 ? 0 : Math.PI;
  }

  /** 0 to 1: how hard the limbs push on this beat. */
  get push(): number {
    return 0.5 + 0.5 * Math.sin(this.beat);
  }

  /**
   * One step. `carry` is how much of the flow carries the larva: 1 in open
   * water, easing to 0 as it settles at landfall.
   */
  step(dt: number, input: { x: number; y: number }, shape: LarvaShape, carry = 1): void {
    const t = this.tuning;
    const { rate, depth } = t.beat[shape];
    this.beat += rate * 2 * Math.PI * dt;
    // Between beats the larva's own push fades; on a beat it is strongest.
    const own = 1 - depth + depth * 2 * this.push;
    // The keys lean the way they point: with the flow, or against it.
    const wantVx = t.flow * this.direction * carry + t.lean * input.x * own;
    const wantVy = t.steer * input.y * own;
    const ease = 1 - Math.exp(-dt / t.response);
    this.vx += (wantVx - this.vx) * ease;
    this.vy += (wantVy - this.vy) * ease;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < t.margin) {
      this.y = t.margin;
      this.vy = Math.max(0, this.vy);
    } else if (this.y > this.height - t.margin) {
      this.y = this.height - t.margin;
      this.vy = Math.min(0, this.vy);
    }
    // The body points along its way through the water, tilted no more than `tilt`.
    const along = Math.atan2(this.vy, Math.abs(this.vx) + 1e-6);
    const tilt = Math.max(-t.tilt, Math.min(t.tilt, along));
    this.heading = this.direction > 0 ? tilt : Math.PI - tilt;
  }
}
