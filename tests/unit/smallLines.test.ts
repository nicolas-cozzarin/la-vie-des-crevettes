import { describe, expect, it } from 'vitest';
import { SmallLines, type SmallLine } from '../../src/core/progress/SmallLines';

const DT = 1 / 30;
const TUNING = { hold: 4, fade: 0.4 };
const line = (id: string, text: string): SmallLine => ({
  id,
  text,
  icon: 'icon.type.find',
  bells: 1,
});

function run(lines: SmallLines, seconds: number): string[] {
  const seen: string[] = [];
  for (let time = 0; time < seconds - 1e-9; time += DT) {
    const { line: now, began } = lines.step(DT);
    if (began && now) seen.push(now.text);
  }
  return seen;
}

describe('small lines', () => {
  it('show one at a time, each in turn, for its hold and fades', () => {
    const lines = new SmallLines(TUNING);
    lines.push(line('a', 'first'));
    lines.push(line('b', 'second'));
    expect(run(lines, 4.7)).toEqual(['first']);
    expect(run(lines, 0.2)).toEqual(['second']);
    run(lines, 5);
    expect(lines.pending).toBe(0);
  });

  it('come in and go out softly', () => {
    const lines = new SmallLines(TUNING);
    lines.push(line('a', 'one'));
    expect(lines.step(0.2).alpha).toBeCloseTo(0.5, 5);
    expect(lines.step(1).alpha).toBe(1);
    expect(lines.step(3.4).alpha).toBeCloseTo(0.5, 5);
  });

  it('let a newer line for the same thing replace one still waiting', () => {
    const lines = new SmallLines(TUNING);
    lines.push(line('find', 'New in the carnet'));
    lines.push(line('c0.motes', 'Fifteen motes 1/15'));
    lines.push(line('c0.motes', 'Fifteen motes 2/15'));
    lines.push(line('c0.motes', 'Fifteen motes 3/15'));
    expect(run(lines, 10)).toEqual(['New in the carnet', 'Fifteen motes 3/15']);
  });
});
