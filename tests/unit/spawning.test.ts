import { describe, expect, it } from 'vitest';
import { Spawning } from '../../src/core/spawn/Spawning';

const TUNING = { rise: 9, follow: 8, hatch: 7, fade: 2.5 };

describe('the spawning (T123)', () => {
  it('runs through its phases in order, and is over at the end', () => {
    const spawning = new Spawning(TUNING);
    expect(spawning.running).toBe(false);
    expect(spawning.begin()).toEqual(['rise']);
    expect(spawning.running).toBe(true);
    const begun: string[] = [];
    for (let time = 0; time < 30; time += 0.1) begun.push(...spawning.step(0.1));
    expect(begun).toEqual(['follow', 'hatch', 'fade', 'done']);
    expect(spawning.running).toBe(false);
    expect(spawning.phase).toBe('done');
  });

  it('changes phase at the lengths it is given', () => {
    const spawning = new Spawning(TUNING);
    spawning.begin();
    expect(spawning.step(8.9)).toEqual([]);
    expect(spawning.through).toBeCloseTo(8.9 / 9);
    expect(spawning.step(0.2)).toEqual(['follow']);
    expect(spawning.time).toBeCloseTo(0.1);
  });

  it('misses no phase on a long frame', () => {
    const spawning = new Spawning(TUNING);
    spawning.begin();
    expect(spawning.step(18)).toEqual(['follow', 'hatch']);
    expect(spawning.step(100)).toEqual(['fade', 'done']);
    expect(spawning.step(1)).toEqual([]);
  });

  it('begins once only, and does nothing before it begins', () => {
    const spawning = new Spawning(TUNING);
    expect(spawning.step(5)).toEqual([]);
    expect(spawning.phase).toBe('none');
    spawning.begin();
    expect(spawning.begin()).toEqual([]);
  });
});
