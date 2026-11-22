import { describe, expect, it } from 'vitest';
import { Bonds, stageOf } from '../../src/core/bonds/Bonds';
import { BOND } from '../../src/data/tuning';

describe('Bonds', () => {
  it('stages start at 0.25, 0.5 and 0.8', () => {
    expect(stageOf(0, BOND.stages)).toBe('stranger');
    expect(stageOf(0.249, BOND.stages)).toBe('stranger');
    expect(stageOf(0.25, BOND.stages)).toBe('familiar');
    expect(stageOf(0.5, BOND.stages)).toBe('companion');
    expect(stageOf(0.8, BOND.stages)).toBe('close');
    expect(stageOf(1, BOND.stages)).toBe('close');
  });

  it('a greeting gives 0.05, at most once per 30 s for each shrimp', () => {
    const bonds = new Bonds(BOND);
    expect(bonds.greet('nacre', 0, true)?.value).toBeCloseTo(0.05);
    expect(bonds.greet('nacre', 10, true)).toBeNull();
    expect(bonds.greet('nacre', 29.9, true)).toBeNull();
    expect(bonds.greet('nacre', 30, true)?.value).toBeCloseTo(0.1);
    // Another shrimp has its own limit.
    expect(bonds.greet('young.1', 31, false)?.value).toBeCloseTo(0.05);
  });

  it('five greetings make a Familiar, and the change says so once', () => {
    const bonds = new Bonds(BOND);
    const changes = [0, 30, 60, 90, 120].map((time) => bonds.greet('nacre', time, true));
    expect(changes.slice(0, 4).every((change) => change?.from === null)).toBe(true);
    expect(changes[4]?.stage).toBe('familiar');
    expect(changes[4]?.from).toBe('stranger');
    expect(bonds.stage('nacre')).toBe('familiar');
  });

  it('grazing within reach gives 0.03 for each 10 s', () => {
    const bonds = new Bonds(BOND);
    let gained = 0;
    for (let step = 0; step < 240; step++) {
      if (bonds.grazeNear('nacre', 0.125)) gained++;
    }
    expect(gained).toBe(3);
    expect(bonds.value('nacre')).toBeCloseTo(0.09);
  });

  it('sharing cover gives 0.08 once per stay, and not again within 60 s', () => {
    const bonds = new Bonds(BOND);
    expect(bonds.shareCover('nacre', true, 0)?.value).toBeCloseTo(0.08);
    expect(bonds.shareCover('nacre', true, 1)).toBeNull();
    bonds.shareCover('nacre', false, 2);
    expect(bonds.shareCover('nacre', true, 30)).toBeNull();
    bonds.shareCover('nacre', false, 31);
    expect(bonds.shareCover('nacre', true, 61)?.value).toBeCloseTo(0.16);
  });

  it('a bond never falls and never passes 1', () => {
    const bonds = new Bonds(BOND);
    bonds.add('nacre', 0.9);
    expect(bonds.add('nacre', -0.5)).toBeNull();
    expect(bonds.value('nacre')).toBeCloseTo(0.9);
    bonds.add('nacre', 0.5);
    expect(bonds.value('nacre')).toBe(1);
    expect(bonds.add('nacre', 0.1)).toBeNull();
  });

  it('an unnamed shrimp greeted once counts as Familiar; a companion does not', () => {
    const bonds = new Bonds(BOND);
    bonds.greet('young.1', 0, false);
    expect(bonds.stage('young.1')).toBe('familiar');
    bonds.greet('nacre', 0, true);
    expect(bonds.stage('nacre')).toBe('stranger');
  });
});
