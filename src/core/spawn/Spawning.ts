/**
 * Where the spawning is (doc 11, "Chapter 5"; doc 12, `s5.spawn`; T123):
 * not begun, the eggs rising from the shrimp, the view following one of
 * them as it drifts, that one opening into a larva, the fade to the Drift,
 * or over.
 */
export type SpawnPhase = 'none' | 'rise' | 'follow' | 'hatch' | 'fade' | 'done';

export interface SpawnTuning {
  /** Seconds the eggs rise and spread from the shrimp, the view on her. */
  rise: number;
  /** Seconds the view leaves her and follows one egg as it drifts. */
  follow: number;
  /** Seconds as that egg opens into a larva. */
  hatch: number;
  /** Seconds of the fade into the Drift. */
  fade: number;
}

const ORDER: readonly SpawnPhase[] = ['rise', 'follow', 'hatch', 'fade', 'done'];

/**
 * The spawning, second by second. It has no button: once begun it runs to
 * its end, and the keys do nothing. `step` returns each phase begun on that
 * step, in order, so none is missed on a long frame.
 */
export class Spawning {
  phase: SpawnPhase = 'none';
  /** Seconds in the phase. */
  time = 0;

  constructor(private readonly tuning: SpawnTuning) {}

  /** The eggs begin to rise. Returns the phase begun, or nothing if already under way. */
  begin(): SpawnPhase[] {
    if (this.phase !== 'none') return [];
    this.phase = 'rise';
    this.time = 0;
    return ['rise'];
  }

  step(dt: number): SpawnPhase[] {
    if (this.phase === 'none' || this.phase === 'done') return [];
    this.time += dt;
    const begun: SpawnPhase[] = [];
    let length = this.length(this.phase);
    while (this.phase !== 'done' && this.time >= length) {
      this.time -= length;
      this.phase = ORDER[ORDER.indexOf(this.phase) + 1] ?? 'done';
      begun.push(this.phase);
      length = this.length(this.phase);
    }
    if (this.phase === 'done') this.time = 0;
    return begun;
  }

  /** From 0 to 1 through the phase. */
  get through(): number {
    const length = this.length(this.phase);
    return length > 0 ? Math.min(1, this.time / length) : 1;
  }

  /** Begun and not yet over: the keys do nothing. */
  get running(): boolean {
    return this.phase !== 'none' && this.phase !== 'done';
  }

  private length(phase: SpawnPhase): number {
    if (phase === 'rise') return this.tuning.rise;
    if (phase === 'follow') return this.tuning.follow;
    if (phase === 'hatch') return this.tuning.hatch;
    if (phase === 'fade') return this.tuning.fade;
    return 0;
  }
}
