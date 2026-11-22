/** A glass hopper (doc 11, `drift.copepod`): it hangs still, then hops a short way. */
export interface Copepod {
  id: string;
  x: number;
  y: number;
  /** Where it points, in radians. It hops the way it points. */
  heading: number;
  /** Seconds until the next hop. */
  wait: number;
  /** The hop under way, or null. */
  hop: { fromX: number; fromY: number; toX: number; toY: number; age: number } | null;
}

export interface CopepodTuning {
  /** Seconds between hops, from and to. */
  every: [number, number];
  /** Pixels one hop covers. */
  hop: number;
  /** Seconds one hop takes. */
  hopTime: number;
  /** Share of the flow it drifts at. */
  drift: number;
}

/** A drifting bell (doc 11, `drift.bell`): it opens and closes slowly as it drifts. */
export interface Bell {
  id: string;
  x: number;
  y: number;
  /** Pixels across. */
  size: number;
  phase: number;
}

export interface BellTuning {
  /** Seconds for the bell to open and close once. */
  breathe: number;
  /** Share of the flow it drifts at. */
  drift: number;
  /** How much wider it is open than closed, as a share. */
  open: number;
}

/**
 * The copepods and the bells of the Drift. Neither can be eaten or harmed;
 * the larva slides round a bell.
 */
export class Drifters {
  private time = 0;

  constructor(
    readonly copepods: Copepod[],
    readonly bells: Bell[],
    private readonly tuning: { copepod: CopepodTuning; bell: BellTuning },
    /** Pixels per second of the flow, signed by the way it runs. */
    private readonly flow: number,
    private readonly height: number,
    private readonly random: () => number,
  ) {}

  step(dt: number): void {
    this.time += dt;
    const { copepod: c, bell: b } = this.tuning;
    for (const copepod of this.copepods) {
      const drift = this.flow * c.drift * dt;
      const hop = copepod.hop;
      if (hop) {
        hop.age += dt;
        const through = Math.min(1, hop.age / c.hopTime);
        // Fast off the mark, slowing to a stop.
        const eased = 1 - (1 - through) ** 3;
        hop.fromX += drift;
        hop.toX += drift;
        copepod.x = hop.fromX + (hop.toX - hop.fromX) * eased;
        copepod.y = hop.fromY + (hop.toY - hop.fromY) * eased;
        if (through >= 1) copepod.hop = null;
        continue;
      }
      copepod.x += drift;
      copepod.wait -= dt;
      if (copepod.wait > 0) continue;
      copepod.wait = c.every[0] + (c.every[1] - c.every[0]) * this.random();
      copepod.heading += (this.random() - 0.5) * 2.4;
      const toY = copepod.y + Math.sin(copepod.heading) * c.hop;
      // It keeps within the water, turning back from the top and the bottom.
      if (toY < 60 || toY > this.height - 60) copepod.heading = -copepod.heading;
      copepod.hop = {
        fromX: copepod.x,
        fromY: copepod.y,
        toX: copepod.x + Math.cos(copepod.heading) * c.hop,
        toY: copepod.y + Math.sin(copepod.heading) * c.hop,
        age: 0,
      };
    }
    for (const bell of this.bells) bell.x += this.flow * b.drift * dt;
  }

  /** 0 when the bell is closed, 1 when it is open. */
  breath(bell: Bell): number {
    const turn = (this.time / this.tuning.bell.breathe) * Math.PI * 2 + bell.phase;
    return 0.5 - 0.5 * Math.cos(turn);
  }

  /** How wide the bell is now, in pixels. */
  width(bell: Bell): number {
    return bell.size * (1 + this.tuning.bell.open * (this.breath(bell) - 0.5));
  }

  /**
   * Where a body of radius `r` at (x, y) ends up once it has slid round the
   * bells: pushed out from any bell it is inside, along the line from its middle.
   */
  slideAround(x: number, y: number, r: number): { x: number; y: number } {
    let px = x;
    let py = y;
    for (const bell of this.bells) {
      const reach = this.width(bell) * 0.45 + r;
      const dx = px - bell.x;
      const dy = py - bell.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= reach) continue;
      // Straight through the middle: slide round the side it is nearer to, or down.
      const ux = distance > 1e-6 ? dx / distance : 0;
      const uy = distance > 1e-6 ? dy / distance : 1;
      px = bell.x + ux * reach;
      py = bell.y + uy * reach;
    }
    return { x: px, y: py };
  }
}
