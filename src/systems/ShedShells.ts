import type Phaser from 'phaser';
import { MOOD_EXPRESSIONS, STAGE_LOOKS, withConditions } from '../art/expressions';
import { DEPTH } from '../config';
import type { AreaDef } from '../data/areas/types';
import { CREATURES, MOLT } from '../data/tuning';
import { ShrimpRig } from '../entities/ShrimpRig';

/** The shell holds still: nothing in it moves. */
const STILL = withConditions(MOOD_EXPRESSIONS.calm, (condition) => condition === 'frozen');

interface Shell {
  id: string;
  x: number;
  y: number;
  heading: number;
  rig: ShrimpRig;
  /** Where in its slow rocking and drifting it is, so that no two move together. */
  phase: number;
}

/**
 * Shed shells lying in the weed bank (doc 11, `thing.shedShell`; T108):
 * the whole outline of a shrimp, glassy and pale, drawn by the shrimp's rig
 * as the player's own shell is after a molt. They rock in the current and
 * drift a little about where they lie.
 */
export class ShedShells {
  private readonly shells: Shell[] = [];
  private time = 0;

  constructor(
    scene: Phaser.Scene,
    area: AreaDef,
    private readonly bl: number,
  ) {
    (area.shedShells ?? []).forEach((def, index) => {
      const rig = new ShrimpRig(scene, bl, DEPTH.groundObjects + 2, STAGE_LOOKS.subAdult);
      rig.setAlpha(MOLT.shellAlpha);
      this.shells.push({ ...def, rig, phase: index * 2.1 });
    });
    this.update(0);
  }

  /** Where each one lies now. For the journal: each is found as `thing.shedShell`. */
  get places(): { id: string; x: number; y: number }[] {
    return this.shells.map((shell) => ({ id: shell.id, ...this.at(shell) }));
  }

  update(dt: number): void {
    this.time += dt;
    for (const shell of this.shells) {
      const t = CREATURES.shedShell;
      const rock = t.rock * Math.sin((this.time / t.rockEvery) * Math.PI * 2 + shell.phase);
      const at = this.at(shell);
      shell.rig.update(
        dt,
        {
          x: at.x,
          y: at.y,
          heading: shell.heading + rock,
          mode: 'rest',
          vx: 0,
          vy: 0,
          height: 0,
        },
        { expression: STILL, afraid: false, target: null, startled: false },
      );
    }
  }

  destroy(): void {
    for (const shell of this.shells) shell.rig.destroy();
    this.shells.length = 0;
  }

  /** A slow drift about where it lies, out and back. */
  private at(shell: Shell): { x: number; y: number } {
    const t = CREATURES.shedShell;
    const angle = (this.time / t.driftEvery) * Math.PI * 2 + shell.phase;
    return {
      x: shell.x + Math.cos(angle) * t.drift * this.bl,
      y: shell.y + Math.sin(angle * 0.7) * t.drift * this.bl * 0.6,
    };
  }
}
