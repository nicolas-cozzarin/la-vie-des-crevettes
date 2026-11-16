import { describe, expect, it } from 'vitest';
import { distanceToCover, isUnder, nearestCover, tuckPoint } from '../../src/core/world/cover';

const tangle = { id: 'tangle', x: 100, y: 100, r: 50 };
const leaf = { id: 'leaf', x: 280, y: 100, r: 30 };

describe('cover', () => {
  it('knows when a point is under it', () => {
    expect(isUnder(120, 100, tangle)).toBe(true);
    expect(isUnder(160, 100, tangle)).toBe(false);
  });

  it('measures from the edge, negative under it', () => {
    expect(distanceToCover(170, 100, tangle)).toBeCloseTo(20);
    expect(distanceToCover(110, 100, tangle)).toBeCloseTo(-40);
  });

  it('finds the cover whose edge is nearest', () => {
    // 60 from the tangle's edge, 40 from the leaf's.
    expect(nearestCover(210, 100, [tangle, leaf], 100)?.id).toBe('leaf');
  });

  it('finds nothing beyond the limit', () => {
    expect(nearestCover(210, 100, [tangle, leaf], 39)).toBeNull();
    expect(nearestCover(210, 100, [tangle, leaf], 40)?.id).toBe('leaf');
  });

  it('prefers the cover the point is under to one it is beside', () => {
    const near = { id: 'near', x: 220, y: 100, r: 80 };
    expect(nearestCover(130, 100, [near, tangle], 10)?.id).toBe('tangle');
  });

  it('tucks in on the line from the centre toward the shrimp', () => {
    const point = tuckPoint(200, 100, tangle, 0.4);
    expect(point.x).toBeCloseTo(120);
    expect(point.y).toBeCloseTo(100);
  });

  it('stays put when already deep enough', () => {
    expect(tuckPoint(110, 105, tangle, 0.4)).toEqual({ x: 110, y: 105 });
  });
});
