import type { Rect } from '../world/zones';

/** A mote of floating algae: a bead, a chain of beads, or a disc (doc 11, `food.microalgae`). */
export interface Mote {
  id: number;
  x: number;
  y: number;
  /** Design pixels across. */
  size: number;
  look: 'a' | 'b' | 'c';
  turn: number;
  /** Phase of its slow wobble. */
  phase: number;
}

export interface MoteTuning {
  /** How many motes in a cloud, from and to. */
  cloud: [number, number];
  /** How far a cloud spreads, in pixels. */
  spread: number;
  /** Size of a mote, from and to, in pixels. */
  size: [number, number];
  /** Share of the flow a mote drifts at: slower than the larva, so it is overtaken. */
  drift: number;
  /** Pixels a mote wobbles up and down. */
  wobble: number;
}

/** Where the clouds lie: a number of clouds spread through a zone. */
export interface CloudField {
  zone: Rect;
  clouds: number;
}

/**
 * Clouds of motes, placed from a seed. Each cloud holds 6 to 12 motes
 * gathered round its middle, flattened a little top to bottom.
 */
export function moteClouds(
  fields: readonly CloudField[],
  tuning: MoteTuning,
  random: () => number,
): Mote[] {
  const motes: Mote[] = [];
  for (const field of fields) {
    for (let cloud = 0; cloud < field.clouds; cloud++) {
      // The clouds of a field are spread along it, each in its own stretch.
      const stretch = field.zone.w / field.clouds;
      const cx = field.zone.x + stretch * (cloud + 0.2 + 0.6 * random());
      const cy = field.zone.y + field.zone.h * (0.15 + 0.7 * random());
      const [least, most] = tuning.cloud;
      const count = least + Math.floor(random() * (most - least + 1));
      for (let index = 0; index < count; index++) {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * tuning.spread;
        motes.push({
          id: motes.length,
          x: cx + Math.cos(angle) * distance,
          y: cy + Math.sin(angle) * distance * 0.7,
          size: tuning.size[0] + (tuning.size[1] - tuning.size[0]) * random(),
          look: (['a', 'b', 'c'] as const)[Math.floor(random() * 3)] ?? 'a',
          turn: random() * Math.PI * 2,
          phase: random() * Math.PI * 2,
        });
      }
    }
  }
  return motes;
}

/**
 * The motes of the Drift as they drift. A mote is eaten when it touches the
 * larva's mouth, never in the first seconds, when the youngest larvae live
 * on their yolk (T42).
 */
export class Motes {
  private time = 0;

  constructor(
    readonly motes: Mote[],
    private readonly tuning: MoteTuning,
    /** Pixels per second of the flow, signed by the way it runs. */
    private readonly flow: number,
  ) {}

  step(dt: number): void {
    this.time += dt;
    const drift = this.flow * this.tuning.drift * dt;
    for (const mote of this.motes) {
      mote.x += drift;
      mote.y += Math.sin(this.time * 0.6 + mote.phase) * this.tuning.wobble * 0.6 * dt;
    }
  }

  /**
   * The motes the mouth at (x, y) touches, taken away. `reach` is how far the
   * mouth reaches beyond a mote's edge, in pixels.
   */
  eat(x: number, y: number, reach: number): Mote[] {
    const eaten: Mote[] = [];
    for (let index = this.motes.length - 1; index >= 0; index--) {
      const mote = this.motes[index] as Mote;
      if (Math.hypot(mote.x - x, mote.y - y) <= mote.size / 2 + reach) {
        eaten.push(mote);
        this.motes.splice(index, 1);
      }
    }
    return eaten;
  }

  /** The nearest mote, and how far it is, for the ribbon of a hungry larva and the glow. */
  nearest(x: number, y: number): { mote: Mote; distance: number } | null {
    let best: { mote: Mote; distance: number } | null = null;
    for (const mote of this.motes) {
      const distance = Math.hypot(mote.x - x, mote.y - y);
      if (!best || distance < best.distance) best = { mote, distance };
    }
    return best;
  }
}

/** Another larva hatched with the player. */
export interface OtherLarva {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Share of the flow it drifts at, while it is not keeping near the player. */
  pace: number;
  /** Keeps near the player for as long as it lasts. */
  settler: boolean;
  /** The x past which it goes missing, once out of sight. Infinite, the way the water runs, for never. */
  lostAt: number;
  phase: number;
}

export interface LarvaeTuning {
  count: number;
  /** How many keep near the player and may settle with it. */
  settlers: number;
  /** Share of the flow the others drift at, from and to. */
  pace: [number, number];
  /** How far a settler keeps from the player, from and to, in pixels. */
  keep: [number, number];
  /** Pixels per second a larva steers up and down on its own. */
  steer: number;
  /** Pixels two larvae keep apart. */
  apart: number;
  /** Share of all the larvae that reach the haze (T54). */
  reachHaze: number;
}

/**
 * The other larvae of the Drift (T54, `fewArrive`). They drift and pulse
 * round the player. They thin out across the Drift one at a time, and only
 * out of sight: one goes missing when it has passed the point set for it and
 * is not in view. About a third reach the haze; two or three settle with the
 * player at landfall.
 */
export class Larvae {
  readonly larvae: OtherLarva[] = [];
  private time = 0;

  constructor(
    private readonly tuning: LarvaeTuning,
    from: { x: number; y: number },
    /** The x where the larvae begin to thin out, where the haze begins and where landfall is. */
    stretch: { start: number; haze: number; end: number },
    private readonly height: number,
    private readonly flow: number,
    private readonly random: () => number,
  ) {
    const direction = Math.sign(flow) || 1;
    const reaching = Math.round(tuning.count * tuning.reachHaze);
    for (let index = 0; index < tuning.count; index++) {
      const settler = index < tuning.settlers;
      // The settlers, and a few more, reach the haze. The rest go missing before it.
      let lostAt = stretch.start + (stretch.haze - stretch.start) * (0.15 + 0.85 * random());
      if (index < reaching) lostAt = direction * Infinity;
      // One settler in two goes missing in the haze, so two or three settle.
      if (settler && index === tuning.settlers - 1 && random() < 0.5) {
        lostAt = stretch.haze + (stretch.end - stretch.haze) * (0.05 + 0.3 * random());
      }
      const angle = random() * Math.PI * 2;
      const distance = 120 + random() * 380;
      this.larvae.push({
        id: `larva.${index}`,
        x: from.x + Math.cos(angle) * distance,
        y: Math.max(60, Math.min(height - 60, from.y + Math.sin(angle) * distance * 0.8)),
        vx: flow,
        vy: 0,
        pace: settler ? 1 : tuning.pace[0] + (tuning.pace[1] - tuning.pace[0]) * random(),
        settler,
        lostAt,
        phase: random() * Math.PI * 2,
      });
    }
  }

  /**
   * One step. `player` is where the player's larva is, `view` the part of
   * the water on screen. Returns the ids that went missing on this step.
   */
  step(dt: number, player: { x: number; y: number }, view: Rect): string[] {
    this.time += dt;
    const t = this.tuning;
    const direction = Math.sign(this.flow) || 1;
    const missing: string[] = [];
    for (let index = this.larvae.length - 1; index >= 0; index--) {
      const larva = this.larvae[index] as OtherLarva;
      const past = (larva.x - larva.lostAt) * direction >= 0;
      const seen =
        larva.x > view.x - 80 &&
        larva.x < view.x + view.w + 80 &&
        larva.y > view.y - 80 &&
        larva.y < view.y + view.h + 80;
      if (past && !seen) {
        this.larvae.splice(index, 1);
        missing.push(larva.id);
        continue;
      }
      // A settler keeps near the player until it has passed its point; then it drifts on its own.
      let wantVx = this.flow * larva.pace;
      let wantVy = Math.sin(this.time * 0.4 + larva.phase) * t.steer;
      if (larva.settler && !past) {
        const dx = player.x - larva.x;
        const dy = player.y - larva.y;
        const distance = Math.hypot(dx, dy);
        const [near, far] = t.keep;
        if (distance > far) {
          wantVx += (dx / distance) * t.steer * 1.5;
          wantVy += (dy / distance) * t.steer * 1.5;
        } else if (distance < near) {
          wantVx -= (dx / (distance || 1)) * t.steer;
          wantVy -= (dy / (distance || 1)) * t.steer;
        }
      } else if (past) {
        // It falls behind and drifts away from the player, out of sight.
        wantVx = this.flow * 0.5;
        wantVy += Math.sign(larva.y - player.y || 1) * t.steer;
      }
      // Two larvae never lie on top of each other.
      for (const other of this.larvae) {
        if (other === larva) continue;
        const dx = larva.x - other.x;
        const dy = larva.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < t.apart) {
          wantVx += (dx / distance) * t.steer;
          wantVy += (dy / distance) * t.steer;
        }
      }
      const ease = 1 - Math.exp(-dt / 0.8);
      larva.vx += (wantVx - larva.vx) * ease;
      larva.vy += (wantVy - larva.vy) * ease;
      larva.x += larva.vx * dt;
      larva.y = Math.max(60, Math.min(this.height - 60, larva.y + larva.vy * dt));
    }
    return missing;
  }

  /** The larvae within `reach` pixels of (x, y). */
  touching(x: number, y: number, reach: number): OtherLarva[] {
    return this.larvae.filter((larva) => Math.hypot(larva.x - x, larva.y - y) <= reach);
  }
}
