import { describe, expect, it } from 'vitest';
import { MoodPicker } from '../../src/core/feelings/mood';
import type { Feelings } from '../../src/core/feelings/types';
import { MOOD } from '../../src/data/tuning';

const NONE: Feelings = { hunger: 0, fear: 0, comfort: 0.5, curiosity: 0, company: 0 };

/** Steps the picker for `seconds` and returns every change it reported. */
function run(picker: MoodPicker, seconds: number, feelings: Partial<Feelings>, eating = false) {
  const changes: string[] = [];
  const steps = Math.round(seconds * 30);
  for (let index = 0; index < steps; index++) {
    const change = picker.step(1 / 30, { feelings: { ...NONE, ...feelings }, eating });
    if (change) changes.push(`${change.from}>${change.to}`);
  }
  return changes;
}

describe('the mood', () => {
  it('turns afraid at 0.5 and stays until fear is below 0.4', () => {
    const picker = new MoodPicker(MOOD);
    run(picker, 0.1, { fear: 0.49 });
    expect(picker.mood).toBe('calm');
    run(picker, 0.1, { fear: 0.5 });
    expect(picker.mood).toBe('afraid');
    run(picker, 5, { fear: 0.41 });
    expect(picker.mood).toBe('afraid');
    run(picker, 1, { fear: 0.39 });
    expect(picker.mood).toBe('calm');
  });

  it('is hungry at 0.7 and stays until hunger is below 0.55', () => {
    const picker = new MoodPicker(MOOD);
    run(picker, 1, { hunger: 0.69 });
    expect(picker.mood).toBe('calm');
    run(picker, 1, { hunger: 0.7 });
    expect(picker.mood).toBe('hungry');
    run(picker, 5, { hunger: 0.56 });
    expect(picker.mood).toBe('hungry');
    run(picker, 1, { hunger: 0.54 });
    expect(picker.mood).toBe('calm');
  });

  it('puts content above hungry while grazing and for 5 s after', () => {
    const picker = new MoodPicker(MOOD);
    run(picker, 2, { hunger: 0.8 });
    expect(picker.mood).toBe('hungry');
    run(picker, 2, { hunger: 0.8 }, true);
    expect(picker.mood).toBe('content');
    run(picker, 4.8, { hunger: 0.8 });
    expect(picker.mood).toBe('content');
    run(picker, 1, { hunger: 0.8 });
    expect(picker.mood).toBe('hungry');
  });

  it('needs 0.4 s of the new mood and 1.5 s of the old before a calm change', () => {
    const picker = new MoodPicker(MOOD);
    run(picker, 0.3, { curiosity: 0.7 });
    expect(picker.mood).toBe('calm');
    run(picker, 0.2, { curiosity: 0.7 });
    expect(picker.mood).toBe('curious');
    // Curious began 0.1 s ago: hungry must wait until it has lasted 1.5 s.
    run(picker, 0.9, { hunger: 0.8 });
    expect(picker.mood).toBe('curious');
    run(picker, 0.6, { hunger: 0.8 });
    expect(picker.mood).toBe('hungry');
  });

  it('turns afraid at once, however young the old mood', () => {
    const picker = new MoodPicker(MOOD);
    run(picker, 0.5, { curiosity: 0.7 });
    expect(picker.mood).toBe('curious');
    run(picker, 1 / 30, { fear: 0.6 });
    expect(picker.mood).toBe('afraid');
  });

  it('reports each change once, with from and to', () => {
    const picker = new MoodPicker(MOOD);
    const changes = [
      ...run(picker, 2, { hunger: 0.8 }),
      ...run(picker, 2, { hunger: 0.8, fear: 0.9 }),
      ...run(picker, 3, { hunger: 0.8 }),
    ];
    expect(changes).toEqual(['calm>hungry', 'hungry>afraid', 'afraid>hungry']);
  });

  it('is social with company at 0.6', () => {
    const picker = new MoodPicker(MOOD);
    run(picker, 1, { company: 0.6 });
    expect(picker.mood).toBe('social');
  });
});
