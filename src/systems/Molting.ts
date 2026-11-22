import type Phaser from 'phaser';
import { MOOD_EXPRESSIONS, withConditions, type RigLook } from '../art/expressions';
import { Molt, type MoltEvent } from '../core/molt/Molt';
import { seededRandom } from '../core/random';
import type { RigPose } from '../entities/ShrimpRig';
import { MOLT } from '../data/tuning';
import { ShrimpRig } from '../entities/ShrimpRig';

/** The empty shell, a pale copy of the body, still and drifting slowly off. */
interface Shell {
  rig: ShrimpRig;
  pose: RigPose;
  age: number;
  away: { x: number; y: number };
}

const STILL = withConditions(MOOD_EXPRESSIONS.calm, (condition) => condition === 'frozen');

/**
 * The player's molt on screen (doc 10, "Molting"; doc 14, "Molt"): the
 * scratching while it waits, the body arching and backing out of its old
 * shell, the pale shell left behind, the soft body, and the growth as it
 * hardens. The rules are `Molt` in `core`.
 */
export class Molting {
  readonly molt: Molt;
  private shell: Shell | null = null;
  /** How much larger the body is drawn, from the molts of this place. */
  growth = 1;
  private grownFrom = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bodyLengthPx: number,
    private readonly depth: number,
    private readonly look: Partial<RigLook>,
    seed: number,
  ) {
    this.molt = new Molt(MOLT, seededRandom(seed));
  }

  signal(): MoltEvent[] {
    return this.molt.signal();
  }

  /** Coming back from the save: the body keeps the size its molts gave it. */
  restore(molts: number): void {
    this.growth = (1 + MOLT.growth) ** molts;
    this.grownFrom = this.growth;
  }

  /**
   * One step. `pose` is the player's now. Returns the events, and how far to
   * move the body back along its heading on this step, in pixels.
   */
  step(dt: number, tucked: boolean, pose: RigPose): { events: MoltEvent[]; back: number } {
    const before = this.molt.through;
    const events = this.molt.step(dt, tucked);
    for (const event of events) {
      if (event.type !== 'phase') continue;
      if (event.phase === 'molt') this.leaveShell(pose);
      if (event.phase === 'hardened') this.grownFrom = this.growth;
    }
    if (this.molt.stage === 'hardened') {
      this.growth = this.grownFrom * (1 + MOLT.growth * this.molt.hardening);
    }
    // The body backs out of the old shell over the second half of the molt.
    const after = this.molt.through;
    const share = (value: number) => Math.max(0, Math.min(1, (value - 0.5) / 0.5));
    const back = (share(after) - share(before)) * MOLT.backOut * this.bodyLengthPx;
    return { events, back: this.molt.stage === 'molt' ? back : 0 };
  }

  /** Draws the empty shell, still, then drifting off and fading. */
  draw(dt: number): void {
    const shell = this.shell;
    if (!shell) return;
    // It lies still through the molt, then drifts off over a minute.
    if (this.molt.stage !== 'molt') shell.age += dt;
    const through = shell.age / MOLT.shellDrift;
    if (through >= 1) {
      shell.rig.destroy();
      this.shell = null;
      return;
    }
    const away = through * MOLT.shellAway * this.bodyLengthPx;
    shell.rig.setAlpha(MOLT.shellAlpha * (1 - through));
    shell.rig.update(
      dt,
      {
        ...shell.pose,
        x: shell.pose.x + shell.away.x * away,
        y: shell.pose.y + shell.away.y * away,
      },
      { expression: STILL, afraid: false, target: null, startled: false },
    );
  }

  destroy(): void {
    this.shell?.rig.destroy();
    this.shell = null;
  }

  private leaveShell(pose: RigPose): void {
    this.shell?.rig.destroy();
    const rig = new ShrimpRig(this.scene, this.bodyLengthPx, this.depth - 1, this.look);
    rig.setGrowth(this.growth);
    rig.setAlpha(MOLT.shellAlpha);
    const still: RigPose = { ...pose, vx: 0, vy: 0, mode: 'rest', height: 0 };
    rig.update(0, still);
    // It drifts off sideways, as the water takes it.
    const side = pose.heading + Math.PI / 2;
    this.shell = { rig, pose: still, age: 0, away: { x: Math.cos(side), y: Math.sin(side) } };
  }
}
