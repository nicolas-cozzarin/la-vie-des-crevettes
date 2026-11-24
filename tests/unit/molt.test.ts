import { describe, expect, it } from 'vitest';
import { Molt, type MoltEvent } from '../../src/core/molt/Molt';
import { MOLT } from '../../src/data/tuning';

const DT = 0.1;

function run(molt: Molt, seconds: number, tucked: boolean): MoltEvent[] {
  const events: MoltEvent[] = [];
  for (let time = 0; time < seconds - 1e-9; time += DT) events.push(...molt.step(DT, tucked));
  return events;
}

const phases = (events: MoltEvent[]) =>
  events.flatMap((event) => (event.type === 'phase' ? [event.phase] : []));

describe('molt', () => {
  it('does nothing until the signal', () => {
    const molt = new Molt(MOLT, () => 0.5);
    expect(run(molt, 10, true)).toEqual([]);
    expect(molt.stage).toBe('none');
  });

  it('waits after the signal until the shrimp shelters, however long', () => {
    const molt = new Molt(MOLT, () => 0.5);
    expect(phases(molt.signal())).toEqual(['signal']);
    run(molt, 120, false);
    expect(molt.stage).toBe('signal');
    expect(molt.premolt).toBe(true);
  });

  it('begins after 2 s of Hide in cover, and starts the count again if the shrimp leaves', () => {
    const molt = new Molt(MOLT, () => 0.5);
    molt.signal();
    run(molt, 1.5, true);
    expect(molt.stage).toBe('shelter');
    run(molt, 0.5, false);
    expect(molt.stage).toBe('signal');
    run(molt, 1.5, true);
    expect(molt.stage).toBe('shelter');
    run(molt, 1, true);
    expect(molt.stage).toBe('molt');
  });

  it('goes through the molt, soft and hardened, then is done', () => {
    const molt = new Molt(MOLT, () => 0.5);
    molt.signal();
    const events = run(molt, 2.5, true);
    expect(molt.locked).toBe(true);
    events.push(...run(molt, 6, true));
    expect(molt.stage).toBe('soft');
    expect(molt.locked).toBe(false);
    expect(molt.speed).toBe(0.5);
    events.push(...run(molt, 30, false));
    expect(molt.stage).toBe('hardened');
    events.push(...run(molt, 3.2, false));
    expect(phases(events)).toEqual(['shelter', 'molt', 'soft', 'hardened', 'none']);
    expect(events.filter((event) => event.type === 'done')).toHaveLength(1);
    expect(molt.stage).toBe('none');
    expect(molt.speed).toBe(1);
  });

  it('keeps threats away from the shelter until the shell is hard', () => {
    const molt = new Molt(MOLT, () => 0.5);
    molt.signal();
    expect(molt.guarded).toBe(false);
    run(molt, 0.5, true);
    expect(molt.guarded).toBe(true);
    run(molt, 2 + 6 + 29, true);
    expect(molt.stage).toBe('soft');
    expect(molt.guarded).toBe(true);
    run(molt, 1.5, true);
    expect(molt.stage).toBe('hardened');
    expect(molt.guarded).toBe(false);
  });

  it('arches through the molt and lies flat again at its end', () => {
    const molt = new Molt(MOLT, () => 0.5);
    molt.signal();
    run(molt, 2.1, true);
    expect(molt.stage).toBe('molt');
    run(molt, 3, true);
    expect(molt.arch).toBe(1);
    run(molt, 2.95, true);
    expect(molt.arch).toBeLessThan(0.1);
  });

  it('scratches for 0.6 s every 3 to 5 s while waiting', () => {
    const molt = new Molt(MOLT, () => 0.5);
    molt.signal();
    let scratching = 0;
    for (let time = 0; time < 46; time += DT) {
      molt.step(DT, false);
      if (molt.scratching) scratching += DT;
    }
    // A gap of 4 s and a scratch of 0.6 s: about ten scratches in 46 s.
    expect(scratching).toBeGreaterThan(5);
    expect(scratching).toBeLessThan(7);
  });

  it('grows over the hardening', () => {
    const molt = new Molt(MOLT, () => 0.5);
    molt.signal();
    run(molt, 2.2 + 6 + 30, true);
    expect(molt.stage).toBe('hardened');
    const from = molt.hardening;
    run(molt, 1.5, true);
    expect(molt.hardening - from).toBeCloseTo(0.5, 1);
  });
});
