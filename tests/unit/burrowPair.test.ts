import { describe, expect, it } from 'vitest';
import { BurrowPair } from '../../src/core/creatures/burrowPair';
import { seededRandom } from '../../src/core/random';
import { CREATURES } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 30;
const T = CREATURES.burrowPair;
const mouth = { x: 0, y: 0 };
const away = { x: 20 * BL, y: 0, fast: false };

function pair(): BurrowPair {
  return new BurrowPair(mouth, BL, T, seededRandom(3));
}

/** Steps with the passer where it is, for `seconds`. Returns how many flicks there were. */
function run(one: BurrowPair, seconds: number, passer = away): number {
  let flicks = 0;
  for (let step = 0; step < Math.round(seconds / DT); step++) {
    if (one.step(DT, passer)) flicks++;
  }
  return flicks;
}

describe('the pistol shrimp and the goby', () => {
  it('push sand out of the burrow, dump it and back in, again and again', () => {
    const one = pair();
    const phases = new Set<string>();
    let furthest = 0;
    let loadedOut = false;
    for (let step = 0; step < 30 / DT; step++) {
      one.step(DT, away);
      phases.add(one.phase);
      furthest = Math.max(furthest, one.shrimp);
      if (one.loaded && one.shrimp > 0.5) loadedOut = true;
    }
    expect([...phases].sort()).toEqual(['back', 'dig', 'dump', 'push']);
    expect(furthest).toBe(1);
    expect(loadedOut).toBe(true);
    expect(one.piles.length).toBeGreaterThan(0);
    expect(one.goby).toBe(1);
  });

  it('let a slow walk come close, down to the mouth', () => {
    const one = pair();
    expect(run(one, 5, { x: 1.5 * BL, y: 0, fast: false })).toBe(0);
    expect(one.seen).toBe(true);
    expect(run(one, 1, { x: 1 * BL, y: 0, fast: false })).toBe(1);
    expect(one.seen).toBe(false);
  });

  it('go in at once for anything swimming within 4 BL, and come out after 6 s of calm', () => {
    const one = pair();
    run(one, 2);
    expect(run(one, 1, { x: 5 * BL, y: 0, fast: true })).toBe(0);
    expect(one.seen).toBe(true);
    expect(run(one, 0.5, { x: 3.5 * BL, y: 0, fast: true })).toBe(1);
    expect(one.goby).toBe(0);
    expect(one.shrimp).toBe(0);
    expect(one.loaded).toBe(false);
    run(one, T.calm - 0.5);
    expect(one.seen).toBe(false);
    run(one, 0.5 + T.comeOut);
    expect(one.seen).toBe(true);
    expect(one.goby).toBe(1);
  });

  it('wait for calm again if the fright goes on', () => {
    const one = pair();
    run(one, 1, { x: 2 * BL, y: 0, fast: true });
    run(one, T.calm - 1);
    run(one, 0.5, { x: 3 * BL, y: 0, fast: true });
    run(one, T.calm - 1);
    expect(one.seen).toBe(false);
  });

  it('go in at a threat’s cue', () => {
    const one = pair();
    run(one, 1);
    one.hide();
    run(one, 0.5);
    expect(one.goby).toBe(0);
    expect(one.seen).toBe(false);
  });

  it('let a dumped load lie a while, then it is smoothed away', () => {
    const one = pair();
    while (one.piles.length === 0) one.step(DT, away);
    const first = one.piles[0];
    run(one, T.pile + 0.1);
    expect(one.piles[0]).not.toBe(first);
  });
});
