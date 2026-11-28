import { describe, expect, it } from 'vitest';
import { Turtle } from '../../src/core/creatures/turtle';
import { CREATURES } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 30;
const T = CREATURES.turtle;
const route = [
  { x: 2000, y: 0 },
  { x: 2000, y: 1500 },
  { x: 0, y: 1500 },
];

function turtle(): Turtle {
  return new Turtle({ x: 0, y: 0, heading: 0 }, route, BL, T);
}

/** Steps until the test holds, for at most `seconds`. Returns the seconds it took. */
function until(one: Turtle, test: () => boolean, seconds = 200): number {
  for (let step = 0; step < seconds / DT; step++) {
    if (test()) return step * DT;
    one.step(DT);
  }
  return Infinity;
}

describe('the turtle', () => {
  it('glides no faster than 0.6 BL a second, and stops with its head over the clump', () => {
    const one = turtle();
    let fastest = 0;
    const took = until(one, () => {
      fastest = Math.max(fastest, one.speed);
      return one.phase === 'crop';
    });
    expect(took).toBeLessThan(60);
    expect(fastest).toBeCloseTo(T.speed, 5);
    const gap = Math.hypot(route[0]!.x - one.x, route[0]!.y - one.y) / BL;
    expect(gap).toBeGreaterThan(T.reach - 0.2);
    expect(gap).toBeLessThan(T.reach + 0.2);
  });

  it('crops for 6 s with its head down, then glides on to the next clump', () => {
    const one = turtle();
    until(one, () => one.phase === 'crop');
    const at = { x: one.x, y: one.y };
    until(one, () => one.time >= T.crop / 2);
    expect(one.dip).toBe(1);
    expect(Math.hypot(one.x - at.x, one.y - at.y)).toBeLessThan(0.2 * BL);
    const cropped = until(one, () => one.phase === 'glide');
    expect(cropped + T.crop / 2).toBeCloseTo(T.crop, 0);
    expect(one.target).toBe(1);
    expect(one.dip).toBe(0);
  });

  it('goes round its route and back to the first clump', () => {
    const one = turtle();
    const visited: number[] = [];
    until(
      one,
      () => {
        if (one.phase === 'crop' && visited[visited.length - 1] !== one.target) {
          visited.push(one.target);
        }
        return visited.length === 4;
      },
      400,
    );
    expect(visited).toEqual([0, 1, 2, 0]);
  });

  it('strokes its flippers as it glides, slowly as it crops', () => {
    const one = turtle();
    until(one, () => one.speed >= T.speed);
    const gliding = one.stroke;
    one.step(1);
    const glide = (one.stroke - gliding + 1) % 1;
    until(one, () => one.phase === 'crop' && one.speed === 0);
    const cropping = one.stroke;
    one.step(1);
    const crop = (one.stroke - cropping + 1) % 1;
    expect(glide).toBeCloseTo(1 / T.stroke, 2);
    expect(crop).toBeCloseTo(1 / (T.stroke * T.slowStroke), 2);
  });

  it('casts its shadow half a body length off, as large as a root tangle', () => {
    const one = turtle();
    expect(one.shades({ x: T.shadow.dx * BL, y: T.shadow.dy * BL })).toBe(true);
    expect(one.shades({ x: 3 * BL, y: 0 })).toBe(true);
    expect(one.shades({ x: 0, y: 3.5 * BL })).toBe(false);
    expect(one.shades({ x: 5 * BL, y: 0 })).toBe(false);
  });

  it('is followed from within 4 BL of its shell', () => {
    const one = turtle();
    expect(one.gapTo({ x: 0, y: 0 })).toBe(0);
    expect(one.gapTo({ x: 2 * BL, y: 0 })).toBe(0);
    expect(one.gapTo({ x: 7 * BL, y: 0 })).toBeCloseTo(4, 5);
    expect(one.gapTo({ x: 0, y: 6.4 * BL })).toBeCloseTo(4, 5);
  });
});
