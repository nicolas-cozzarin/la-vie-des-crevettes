import { describe, expect, it } from 'vitest';
import { Hermit } from '../../src/core/creatures/hermit';
import { seededRandom } from '../../src/core/random';
import { CREATURES } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 30;

function hermit(): Hermit {
  return new Hermit(CREATURES.hermit, { x: 0, y: 0, heading: 0 }, BL, seededRandom(7));
}

function run(rule: Hermit, seconds: number, passer: { x: number; y: number; fast: boolean }) {
  let gentle = 0;
  for (let time = 0; time < seconds - 1e-9; time += DT) {
    if (rule.step(DT, { ...passer, x: passer.x + rule.x, y: passer.y + rule.y })) gentle++;
  }
  return gentle;
}

describe('the hermit crab', () => {
  it('walks in short runs and pauses, near where it lives', () => {
    const rule = hermit();
    let moved = 0;
    let still = 0;
    let last = { x: rule.x, y: rule.y };
    for (let time = 0; time < 60; time += DT) {
      rule.step(DT, null);
      if (Math.hypot(rule.x - last.x, rule.y - last.y) > 1e-6) moved++;
      else still++;
      last = { x: rule.x, y: rule.y };
      expect(Math.hypot(rule.x, rule.y)).toBeLessThan(CREATURES.hermit.home * BL + BL);
    }
    expect(moved).toBeGreaterThan(0);
    expect(still).toBeGreaterThan(moved);
  });

  it('pulls into its shell when the shrimp swims close, and comes out after a calm', () => {
    const rule = hermit();
    run(rule, 0.5, { x: 140, y: 0, fast: true });
    expect(rule.withdrawn).toBe(true);
    expect(rule.out).toBe(0);
    // Still in its shell before the calm is over.
    run(rule, CREATURES.hermit.calm - 1, { x: 1000, y: 0, fast: false });
    expect(rule.withdrawn).toBe(true);
    run(rule, 1 + CREATURES.hermit.outTime + 0.2, { x: 1000, y: 0, fast: false });
    expect(rule.withdrawn).toBe(false);
    expect(rule.out).toBe(1);
  });

  it('does not mind a shrimp swimming past further away', () => {
    const rule = hermit();
    run(rule, 1, { x: 200, y: 0, fast: true });
    expect(rule.withdrawn).toBe(false);
  });

  it('is met gently once when the shrimp walks up to 1 BL, and again after it went away', () => {
    const rule = hermit();
    expect(run(rule, 0.5, { x: 90, y: 0, fast: false })).toBe(1);
    expect(run(rule, 2, { x: 90, y: 0, fast: false })).toBe(0);
    run(rule, 0.2, { x: 300, y: 0, fast: false });
    expect(run(rule, 0.2, { x: 90, y: 0, fast: false })).toBe(1);
  });

  it('is not met gently in its shell', () => {
    const rule = hermit();
    run(rule, 0.2, { x: 120, y: 0, fast: true });
    expect(run(rule, 1, { x: 90, y: 0, fast: false })).toBe(0);
  });
});
