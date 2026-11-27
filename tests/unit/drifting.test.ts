import { describe, expect, it } from 'vitest';
import { DriftingFood, upstreamSide } from '../../src/core/food/drifting';
import type { Current } from '../../src/core/movement/currents';
import { seededRandom } from '../../src/core/random';

const TUNING = { fade: 100, spin: 0.3 };
const LEFTWARD: Current[] = [{ zone: { x: 0, y: 0, w: 2000, h: 1000 }, vx: -100, vy: 0 }];
const RUN = {
  id: 'seaweed.b',
  kind: 'seaweed' as const,
  run: { x: 500, y: 0, w: 1000, h: 800 },
  count: 4,
};

describe('drifting food', () => {
  it('comes in on the side the water runs from', () => {
    expect(upstreamSide({ vx: -100, vy: 10 })).toBe('right');
    expect(upstreamSide({ vx: 100, vy: 10 })).toBe('left');
    expect(upstreamSide({ vx: 5, vy: -40 })).toBe('bottom');
    expect(upstreamSide({ vx: 5, vy: 40 })).toBe('top');
  });

  it('spreads its clumps along the run, each with its own id', () => {
    const food = new DriftingFood(RUN, LEFTWARD, seededRandom(1), TUNING);
    expect(food.clumps.map((one) => one.id)).toEqual([
      'seaweed.b.1',
      'seaweed.b.2',
      'seaweed.b.3',
      'seaweed.b.4',
    ]);
    // The first is nearest the upstream end, on the right.
    expect(food.clumps.map((one) => one.x)).toEqual([1375, 1125, 875, 625]);
    for (const clump of food.clumps) {
      expect(clump.y).toBeGreaterThanOrEqual(0);
      expect(clump.y).toBeLessThan(800);
    }
  });

  it('rides with the whole of the water, and comes in again upstream, whole, once out', () => {
    const food = new DriftingFood(RUN, LEFTWARD, seededRandom(1), TUNING);
    const last = food.clumps[3];
    if (!last) throw new Error('no clump');
    last.eaten = true;
    food.step(1);
    expect(food.clumps[0]?.x).toBe(1275);
    // The last starts at 625: still in after one second, out after two, so in again upstream.
    expect(last.x).toBe(525);
    food.step(1);
    expect(last.x).toBeGreaterThan(1400);
    expect(last.eaten).toBe(false);
  });

  it('is touched within reach, and not once eaten', () => {
    const food = new DriftingFood(RUN, LEFTWARD, seededRandom(1), TUNING);
    const first = food.clumps[0];
    if (!first) throw new Error('no clump');
    expect(food.touching(first.x + 30, first.y, 40)).toBe(first);
    expect(food.touching(first.x + 50, first.y, 40)).toBeNull();
    first.eaten = true;
    expect(food.touching(first.x, first.y, 40)).toBeNull();
  });

  it('fades in at the upstream end and out at the downstream end', () => {
    const food = new DriftingFood(RUN, LEFTWARD, seededRandom(1), TUNING);
    const clump = food.clumps[0];
    if (!clump) throw new Error('no clump');
    clump.x = 1450;
    expect(food.shown(clump)).toBeCloseTo(0.5);
    clump.x = 1000;
    expect(food.shown(clump)).toBe(1);
    clump.x = 520;
    expect(food.shown(clump)).toBeCloseTo(0.2);
    clump.eaten = true;
    expect(food.shown(clump)).toBe(0);
  });
});
