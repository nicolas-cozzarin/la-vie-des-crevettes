import { describe, expect, it } from 'vitest';
import {
  challengeLines,
  chaptersReached,
  companionLines,
  companionMet,
  moveCursor,
  pinChallenge,
  unlockedMarks,
  whereFrom,
  type JournalPage,
} from '../../src/core/journal/journal';
import { newRecord, Progress } from '../../src/core/progress/Progress';
import { AREA_IDS } from '../../src/core/world/kinds';
import { PROGRESS_DEFS } from '../../src/data/progress';

const COUNTS: Record<JournalPage, number> = {
  discoveries: 4,
  companions: 3,
  feel: 0,
  challenges: 2,
  achievements: 5,
};

describe('the journal', () => {
  it('turns pages with Left and Right and moves through entries with Up and Down, round', () => {
    const start = { page: 'discoveries' as const, index: 0 };
    expect(moveCursor(start, 'right', COUNTS)).toEqual({ page: 'companions', index: 0 });
    expect(moveCursor(start, 'left', COUNTS)).toEqual({ page: 'achievements', index: 0 });
    expect(moveCursor(start, 'up', COUNTS)).toEqual({ page: 'discoveries', index: 3 });
    expect(moveCursor({ page: 'discoveries', index: 3 }, 'down', COUNTS).index).toBe(0);
    // A page with nothing on it keeps its cursor at 0.
    expect(moveCursor({ page: 'feel', index: 0 }, 'down', COUNTS)).toEqual({
      page: 'feel',
      index: 0,
    });
  });

  it('shows the challenges of the chapters reached, and nothing of the others', () => {
    const record = newRecord();
    const progress = new Progress(PROGRESS_DEFS, record);
    progress.hear({ kind: 'area', area: 'drift' });
    let reached = chaptersReached(PROGRESS_DEFS, record);
    expect([...reached]).toEqual([0]);
    expect(challengeLines(PROGRESS_DEFS, progress, reached, null).map((line) => line.id)).toEqual([
      'c0.motes',
      'c0.larva',
    ]);
    progress.hear({ kind: 'area', area: 'mangrove' });
    reached = chaptersReached(PROGRESS_DEFS, record);
    const lines = challengeLines(PROGRESS_DEFS, progress, reached, 'c1.crab');
    expect(lines.every((line) => line.chapter <= 1)).toBe(true);
    expect(lines.find((line) => line.id === 'c1.crab')).toMatchObject({ pinned: true, best: true });
    expect(lines.find((line) => line.id === 'c1.greet3')).toMatchObject({
      value: 0,
      target: 3,
      best: false,
    });
  });

  it('pins one challenge at a time, lets it go on a second press, and never pins one done', () => {
    const line = {
      id: 'c1.crab',
      chapter: 1,
      value: 0,
      target: 5,
      done: false,
      best: true,
      pinned: false,
    };
    expect(pinChallenge(null, line)).toBe('c1.crab');
    expect(pinChallenge('c1.branch', line)).toBe('c1.crab');
    expect(pinChallenge('c1.crab', { ...line, pinned: true })).toBeNull();
    expect(pinChallenge('c1.branch', { ...line, done: true })).toBe('c1.branch');
  });

  it('remembers where each thing was found and each shrimp met', () => {
    const record = newRecord();
    const progress = new Progress(PROGRESS_DEFS, record);
    progress.hear({ kind: 'discovery', id: 'thing.seedPod', area: 'mangrove' });
    progress.hear({ kind: 'greeting', other: 'nacre', area: 'mangrove' });
    expect(whereFrom(record, 'foundIn', 'thing.seedPod', AREA_IDS)).toBe('mangrove');
    expect(whereFrom(record, 'metIn', 'nacre', AREA_IDS)).toBe('mangrove');
    expect(whereFrom(record, 'foundIn', 'thing.sunkenBranch', AREA_IDS)).toBeNull();
    expect(unlockedMarks(record)).toContain('d:thing.seedPod');
  });

  it('shows a companion once met, and her lines as the bond grows', () => {
    const record = newRecord();
    const stages = PROGRESS_DEFS.bondStages;
    const lines = () => companionLines('nacre', record, stages, AREA_IDS).map((one) => one.line);
    expect(companionMet('nacre', record)).toBe(false);
    record.stats['greeted.nacre'] = 1;
    record.stats['metIn.mangrove.nacre'] = 1;
    expect(companionMet('nacre', record)).toBe(true);
    // A stranger: nothing written yet.
    expect(lines()).toEqual([]);
    record.bonds.nacre = stages.familiar;
    expect(lines()).toEqual(['look', 'way', 'met']);
    record.bonds.nacre = stages.companion;
    expect(lines()).toEqual(['look', 'way', 'met', 'more']);
    record.bonds.nacre = stages.close;
    // Close with no memory yet: the memory line waits.
    expect(lines()).toEqual(['look', 'way', 'met', 'more']);
    record.stats['softWith.nacre'] = 1;
    expect(lines()).toEqual(['look', 'way', 'met', 'more', 'yourMolt']);
    // The first threat fled together comes before the molt.
    record.stats['fledWith.nacre.bird'] = 1;
    expect(companionLines('nacre', record, stages, AREA_IDS).at(-1)).toEqual({
      line: 'fled',
      threat: 'bird',
    });
  });
});
