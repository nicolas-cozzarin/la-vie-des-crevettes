import { describe, expect, it } from 'vitest';
import { along, pointAlong, pointBeyond, routeLength, shoalGoal } from '../../src/core/npc/journey';

// Right to left, then down and left: 1000 px, then 500.
const ROUTE = [
  { x: 2000, y: 500 },
  { x: 1000, y: 500 },
  { x: 700, y: 900 },
];

describe('the journey', () => {
  it('measures how far along the route a point lies, by the nearest point on it', () => {
    expect(routeLength(ROUTE)).toBe(1500);
    expect(along(ROUTE, 2000, 500)).toBe(0);
    expect(along(ROUTE, 1500, 300)).toBe(500);
    expect(along(ROUTE, 850, 700)).toBeCloseTo(1250);
    // Beyond either end, the end.
    expect(along(ROUTE, 2600, 500)).toBe(0);
    expect(along(ROUTE, 400, 1300)).toBe(1500);
  });

  it('finds the point a distance along, held to the ends', () => {
    expect(pointAlong(ROUTE, 250)).toEqual({ x: 1750, y: 500 });
    expect(pointAlong(ROUTE, 1250)).toEqual({ x: 850, y: 700 });
    expect(pointAlong(ROUTE, -50)).toEqual({ x: 2000, y: 500 });
    expect(pointAlong(ROUTE, 9000)).toEqual({ x: 700, y: 900 });
  });

  it('puts the shoal ahead of the player, and waits at the end', () => {
    expect(shoalGoal(ROUTE, { x: 1900, y: 650 }, 400)).toEqual({ x: 1500, y: 500 });
    // A player going back upstream brings the shoal back with them.
    expect(shoalGoal(ROUTE, { x: 2100, y: 500 }, 400)).toEqual({ x: 1600, y: 500 });
    expect(shoalGoal(ROUTE, { x: 760, y: 820 }, 400)).toEqual({ x: 700, y: 900 });
  });

  it('goes on straight past either end, for those who pass through (T114)', () => {
    expect(pointBeyond(ROUTE, 250)).toEqual({ x: 1750, y: 500 });
    // Before the start, back along the first stretch.
    expect(pointBeyond(ROUTE, -300)).toEqual({ x: 2300, y: 500 });
    // Past the end, on along the last: down and left, 3 across for 4 down.
    const past = pointBeyond(ROUTE, 1500 + 250);
    expect(past.x).toBeCloseTo(550);
    expect(past.y).toBeCloseTo(1100);
    expect(pointBeyond([{ x: 5, y: 5 }], 100)).toEqual({ x: 5, y: 5 });
  });
});
