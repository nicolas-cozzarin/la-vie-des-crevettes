import { describe, expect, it } from 'vitest';
import { carried, currentAt, inCurrent, type Current } from '../../src/core/movement/currents';

const TUNING = { onBed: 0.25 };
const CURRENTS: Current[] = [
  { zone: { x: 0, y: 0, w: 100, h: 100 }, vx: -20, vy: 0 },
  { zone: { x: 50, y: 0, w: 100, h: 100 }, vx: 0, vy: 10 },
];

describe('currents', () => {
  it('add up where they overlap, and are still water elsewhere', () => {
    expect(currentAt(CURRENTS, 10, 10)).toEqual({ vx: -20, vy: 0 });
    expect(currentAt(CURRENTS, 60, 10)).toEqual({ vx: -20, vy: 10 });
    expect(currentAt(CURRENTS, 500, 10)).toEqual({ vx: 0, vy: 0 });
    expect(inCurrent(CURRENTS, 10, 10)).toBe(true);
    expect(inCurrent(CURRENTS, 500, 10)).toBe(false);
  });

  it('carry a swimming shrimp in full, one on the bed a share, and one under cover not at all', () => {
    const water = { vx: -20, vy: 8 };
    expect(carried(water, { mode: 'swim', tucked: false }, 0.5, TUNING)).toEqual({
      dx: -10,
      dy: 4,
    });
    expect(carried(water, { mode: 'glide', tucked: false }, 0.5, TUNING)).toEqual({
      dx: -10,
      dy: 4,
    });
    expect(carried(water, { mode: 'walk', tucked: false }, 0.5, TUNING)).toEqual({
      dx: -2.5,
      dy: 1,
    });
    expect(carried(water, { mode: 'rest', tucked: true }, 0.5, TUNING)).toEqual({ dx: 0, dy: 0 });
  });
});
