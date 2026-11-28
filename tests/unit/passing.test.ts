import { describe, expect, it } from 'vitest';
import { entryAlong, Passing } from '../../src/core/npc/passing';

const TUNING = { first: [10, 20], every: [40, 90], group: [2, 4], retry: 3 } as const;

/** Steps of a tenth of a second until a group comes, or `limit` seconds pass. */
function until(passing: Passing, limit: number, here = false): { after: number; count: number } {
  for (let time = 0; time < limit; time += 0.1) {
    const count = passing.step(0.1, here);
    if (count > 0) return { after: time + 0.1, count };
  }
  return { after: Infinity, count: 0 };
}

describe('strangers passing through (T114)', () => {
  it('sends the first group within its wait, two to four of them', () => {
    for (const seed of [0, 0.3, 0.6, 0.99]) {
      const passing = new Passing(TUNING, () => seed);
      const first = until(passing, 30);
      expect(first.after).toBeGreaterThanOrEqual(10);
      expect(first.after).toBeLessThanOrEqual(20.1);
      expect(first.count).toBeGreaterThanOrEqual(2);
      expect(first.count).toBeLessThanOrEqual(4);
    }
  });

  it('waits while a group is still here, then the time between groups', () => {
    const passing = new Passing(TUNING, () => 0);
    expect(until(passing, 30).after).toBeCloseTo(10, 0);
    // Still here for a long while: nobody new comes.
    expect(until(passing, 500, true).count).toBe(0);
    // Gone: the next comes after the time between groups.
    expect(until(passing, 100).after).toBeCloseTo(40, 0);
  });

  it('tries again soon when no place out of view lets them in', () => {
    const passing = new Passing(TUNING, () => 0.5);
    until(passing, 30);
    passing.later();
    expect(until(passing, 10).after).toBeCloseTo(3, 0);
  });

  it('comes at once with the debug key, even while another passes', () => {
    const passing = new Passing(TUNING, () => 0.5);
    passing.now();
    expect(passing.step(0.1, true)).toBeGreaterThan(0);
    expect(passing.step(0.1, true)).toBe(0);
  });

  it('comes in upstream of the player, beyond the view, and no further back than before the start', () => {
    expect(entryAlong(5000, 1300, 560)).toBe(3700);
    expect(entryAlong(900, 1300, 560)).toBe(-400);
    expect(entryAlong(100, 1300, 560)).toBe(-560);
  });
});
