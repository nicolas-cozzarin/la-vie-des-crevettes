import { describe, expect, it } from 'vitest';
import { Volcano } from '../../src/core/creatures/volcano';
import { seededRandom } from '../../src/core/random';
import { ZoneTracker } from '../../src/core/world/zones';
import { CREATURES } from '../../src/data/tuning';

const DT = 1 / 30;
const T = CREATURES.sandVolcano;

describe('a sand volcano', () => {
  it('puffs now and then, each puff the time given, the waits within the range', () => {
    const volcano = new Volcano(T, seededRandom(9));
    const starts: number[] = [];
    for (let step = 0; step < 120 / DT; step++) {
      if (volcano.step(DT)) starts.push(step * DT);
    }
    expect(starts.length).toBeGreaterThan(120 / (T.every.max + T.puff) - 1);
    expect(starts.length).toBeLessThan(120 / (T.every.min + T.puff) + 2);
    for (let index = 1; index < starts.length; index++) {
      const gap = (starts[index] ?? 0) - (starts[index - 1] ?? 0);
      expect(gap).toBeGreaterThanOrEqual(T.every.min + T.puff - 2 * DT);
      expect(gap).toBeLessThanOrEqual(T.every.max + T.puff + 2 * DT);
    }
  });

  it('says how far through its puff it is', () => {
    const volcano = new Volcano(T, seededRandom(2));
    while (!volcano.step(DT));
    expect(volcano.through).toBe(0);
    for (let step = 0; step < T.puff / 2 / DT; step++) volcano.step(DT);
    expect(volcano.through).toBeCloseTo(0.5, 1);
    for (let step = 0; step < T.puff / DT; step++) volcano.step(DT);
    expect(volcano.through).toBeNull();
  });
});

describe('time in a zone', () => {
  it('counts the seconds since the point came in, and starts again after it leaves', () => {
    const zones = new ZoneTracker([{ id: 'D', zone: { x: 0, y: 0, w: 100, h: 100 } }]);
    zones.update(50, 50, DT);
    expect(zones.inFor('D')).toBe(0);
    for (let step = 0; step < 90; step++) zones.update(50, 50, DT);
    expect(zones.inFor('D')).toBeCloseTo(3);
    zones.update(150, 50, DT);
    expect(zones.inFor('D')).toBe(0);
    zones.update(50, 50, DT);
    expect(zones.inFor('D')).toBe(0);
  });
});
