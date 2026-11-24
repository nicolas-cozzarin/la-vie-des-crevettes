import type { BondStage } from '../feelings/types';

/**
 * The bond between the player and each other shrimp: one value from 0 to 1
 * that never falls. See docs/02-mechanics.md, "Bonds", and doc 10, "Toward
 * the player". Nothing here knows about the engine.
 */

export interface BondTuning {
  /** Gain for a greeting, and seconds before the same shrimp can give it again. */
  greet: number;
  greetEvery: number;
  /** Gain for each `grazeSeconds` of grazing within `grazeReach` BL of each other. */
  grazeNear: number;
  grazeSeconds: number;
  grazeReach: number;
  /** Gain for tucking in under the same cover, once per stay, and at most once per `shareEvery` s. */
  shareCover: number;
  shareEvery: number;
  /** Fleeing a threat and both reaching safety (step 7), and staying through a molt (step 8). */
  flee: number;
  molt: number;
  /** Where each stage starts. */
  stages: { familiar: number; companion: number; close: number };
}

/** What a gain did, for the `bond:changed` event. */
export interface BondChange {
  with: string;
  value: number;
  stage: BondStage;
  /** The stage before, when this gain moved it on. */
  from: BondStage | null;
}

export function stageOf(value: number, stages: BondTuning['stages']): BondStage {
  if (value >= stages.close) return 'close';
  if (value >= stages.companion) return 'companion';
  if (value >= stages.familiar) return 'familiar';
  return 'stranger';
}

interface Bond {
  value: number;
  /** Clock time of the last greeting that counted. */
  greeted: number;
  /** Seconds grazed near each other, toward the next gain. */
  grazed: number;
  /** Clock time of the last shared cover that counted, and whether the stay has been counted. */
  shared: number;
  sharing: boolean;
}

export class Bonds {
  private readonly bonds = new Map<string, Bond>();
  /** Unnamed shrimp greeted at least once: they count as Familiar for company (doc 10). */
  private readonly met = new Set<string>();

  constructor(private readonly tuning: BondTuning) {}

  value(id: string): number {
    return this.bonds.get(id)?.value ?? 0;
  }

  /** Bonds kept in the save. */
  load(values: Readonly<Record<string, number>>): void {
    for (const [id, value] of Object.entries(values)) {
      this.bond(id).value = Math.min(1, Math.max(0, value));
    }
  }

  /** The stage, with an unnamed shrimp that has been greeted counted as Familiar. */
  stage(id: string): BondStage {
    const stage = stageOf(this.value(id), this.tuning.stages);
    return stage === 'stranger' && this.met.has(id) ? 'familiar' : stage;
  }

  /** Every shrimp with a bond above 0, for the journal and the save. */
  get all(): ReadonlyMap<string, number> {
    return new Map([...this.bonds].map(([id, bond]) => [id, bond.value]));
  }

  /**
   * A greeting between the player and `id`, at `time` seconds of play.
   * Counts once per `greetEvery` seconds for each shrimp. An unnamed shrimp
   * greeted once is met for good.
   */
  greet(id: string, time: number, named: boolean): BondChange | null {
    if (!named) this.met.add(id);
    const bond = this.bond(id);
    if (time - bond.greeted < this.tuning.greetEvery) return null;
    bond.greeted = time;
    return this.add(id, this.tuning.greet);
  }

  /** Both are grazing within reach of each other for `dt` seconds. */
  grazeNear(id: string, dt: number): BondChange | null {
    const bond = this.bond(id);
    bond.grazed += dt;
    if (bond.grazed < this.tuning.grazeSeconds) return null;
    bond.grazed -= this.tuning.grazeSeconds;
    return this.add(id, this.tuning.grazeNear);
  }

  /**
   * Whether both are tucked in under the same cover on this step. A stay
   * counts once, when it starts, and not again within `shareEvery` seconds.
   */
  shareCover(id: string, sharing: boolean, time: number): BondChange | null {
    const bond = this.bond(id);
    if (!sharing) {
      bond.sharing = false;
      return null;
    }
    if (bond.sharing) return null;
    bond.sharing = true;
    if (time - bond.shared < this.tuning.shareEvery) return null;
    bond.shared = time;
    return this.add(id, this.tuning.shareCover);
  }

  /** Any other gain. A bond never falls. */
  add(id: string, amount: number): BondChange | null {
    if (amount <= 0) return null;
    const bond = this.bond(id);
    const before = this.stage(id);
    const value = Math.min(1, bond.value + amount);
    if (value === bond.value) return null;
    bond.value = value;
    const stage = this.stage(id);
    return { with: id, value, stage, from: stage === before ? null : before };
  }

  private bond(id: string): Bond {
    let bond = this.bonds.get(id);
    if (!bond) {
      bond = { value: 0, greeted: -Infinity, grazed: 0, shared: -Infinity, sharing: false };
      this.bonds.set(id, bond);
    }
    return bond;
  }
}
