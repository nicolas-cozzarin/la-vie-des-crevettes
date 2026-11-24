import { describe, expect, it } from 'vitest';
import { newRecord, Progress, type ProgressNews } from '../../src/core/progress/Progress';
import { PROGRESS_DEFS } from '../../src/data/progress';

const DT = 1 / 30;

function progress(unreleased = false) {
  return new Progress(PROGRESS_DEFS, newRecord(), unreleased);
}

function hold(p: Progress, seconds: number, flags: Record<string, boolean>): ProgressNews[] {
  const news: ProgressNews[] = [];
  for (let time = 0; time < seconds - 1e-9; time += DT) news.push(...p.hold(DT, flags));
  return news;
}

describe('challenges', () => {
  it('count motes toward fifteen, and are done at the target', () => {
    const p = progress();
    const eat = () =>
      p.hear({ kind: 'eaten', food: 'microalgae', area: 'drift', full: false, night: false });
    expect(eat()).toContainEqual({ kind: 'progress', id: 'c0.motes', value: 1, target: 15 });
    for (let index = 2; index < 15; index++) eat();
    expect(p.value('c0.motes')).toBe(14);
    expect(eat()).toContainEqual({ kind: 'done', id: 'c0.motes' });
    // Nothing more is said once done.
    expect(eat().filter((one) => 'id' in one && one.id === 'c0.motes')).toEqual([]);
    expect(p.value('c0.motes')).toBe(15);
  });

  it('count different foods tasted in the mangrove, not elsewhere', () => {
    const p = progress();
    const eat = (food: 'algaeFilm' | 'sandFilm' | 'mangroveLeaf', area: 'mangrove' | 'lagoon') =>
      p.hear({ kind: 'eaten', food, area, full: true, night: false });
    eat('algaeFilm', 'mangrove');
    eat('algaeFilm', 'mangrove');
    eat('sandFilm', 'lagoon');
    expect(p.value('c1.tastes')).toBe(1);
    eat('sandFilm', 'mangrove');
    eat('mangroveLeaf', 'mangrove');
    expect(p.isDone('c1.tastes')).toBe(true);
  });

  it('count three different shrimp greeted', () => {
    const p = progress();
    p.hear({ kind: 'greeting', other: 'nacre', area: 'mangrove' });
    p.hear({ kind: 'greeting', other: 'nacre', area: 'mangrove' });
    p.hear({ kind: 'greeting', other: 'young.1', area: 'mangrove' });
    expect(p.value('c1.greet3')).toBe(2);
    const news = p.hear({ kind: 'greeting', other: 'young.2', area: 'mangrove' });
    expect(news).toContainEqual({ kind: 'done', id: 'c1.greet3' });
  });

  it('watch a crab wave for 5 s without a break, and keep the best run', () => {
    const p = progress();
    hold(p, 3, { watchWave: true });
    hold(p, 1, { watchWave: false });
    expect(p.value('c1.crab')).toBe(3);
    hold(p, 4, { watchWave: true });
    expect(p.value('c1.crab')).toBe(4);
    expect(p.isDone('c1.crab')).toBe(false);
    const news = hold(p, 1.1, { watchWave: true });
    expect(news).toContainEqual({ kind: 'done', id: 'c1.crab' });
  });

  it('add up the seconds hidden beside another shrimp, with breaks', () => {
    const p = progress();
    hold(p, 1.2, { hiddenTogether: true });
    hold(p, 1, { hiddenTogether: false });
    expect(p.value('c1.together')).toBe(1);
    hold(p, 0.9, { hiddenTogether: true });
    expect(p.isDone('c1.together')).toBe(true);
  });

  it('report a seconds challenge only when a whole second is added', () => {
    const p = progress();
    const news = hold(p, 2.5, { watchWave: true }).filter((one) => one.kind === 'progress');
    expect(news.map((one) => (one.kind === 'progress' ? one.value : 0))).toEqual([1, 2]);
  });

  it('count a bird visit that ends with no strike as out of the shadow', () => {
    const p = progress();
    p.hear({ kind: 'escaped', threat: 'bird', clean: false, still: false });
    expect(p.isDone('c1.clean')).toBe(false);
    p.hear({ kind: 'escaped', threat: 'bird', clean: true, still: false });
    expect(p.isDone('c1.clean')).toBe(true);
  });

  it('count a discovery and a touch', () => {
    const p = progress();
    p.hear({ kind: 'discovery', id: 'thing.sunkenBranch', area: 'mangrove' });
    p.hear({ kind: 'touched', what: 'drift.larva' });
    expect(p.isDone('c1.branch')).toBe(true);
    expect(p.isDone('c0.larva')).toBe(true);
  });
});

describe('achievements', () => {
  it('landfall, a first molt and a first greeting', () => {
    const p = progress();
    expect(p.hear({ kind: 'stat', stat: 'landfalls' })).toContainEqual({
      kind: 'achievement',
      id: 'landfall',
    });
    expect(p.hear({ kind: 'molt', molts: 1 })).toContainEqual({
      kind: 'achievement',
      id: 'newShell',
    });
    expect(p.hear({ kind: 'greeting', other: 'nacre', area: 'mangrove' })).toContainEqual({
      kind: 'achievement',
      id: 'antenna',
    });
    // Once only.
    expect(p.hear({ kind: 'greeting', other: 'young.1', area: 'mangrove' })).not.toContainEqual({
      kind: 'achievement',
      id: 'antenna',
    });
  });

  it('fifty tail flips', () => {
    const p = progress();
    for (let index = 0; index < 49; index++) p.hear({ kind: 'tailflip' });
    expect(p.record.achievements.has('quickTail')).toBe(false);
    p.hear({ kind: 'tailflip' });
    expect(p.record.achievements.has('quickTail')).toBe(true);
  });

  it('unseen: the mangrove ends with no chase begun in it', () => {
    const chased = progress();
    chased.hear({ kind: 'area', area: 'mangrove' });
    chased.hear({ kind: 'threat', threat: 'bird', stage: 'chase', area: 'mangrove' });
    chased.hear({ kind: 'step', id: 's1.molt' });
    expect(chased.record.achievements.has('unseen')).toBe(false);

    const hidden = progress();
    hidden.hear({ kind: 'area', area: 'mangrove' });
    hidden.hear({ kind: 'threat', threat: 'bird', stage: 'presence', area: 'mangrove' });
    expect(hidden.hear({ kind: 'step', id: 's1.molt' })).toContainEqual({
      kind: 'achievement',
      id: 'unseen',
    });
  });

  it('stone still, and familiar faces with all three companions', () => {
    const p = progress();
    p.hear({ kind: 'escaped', threat: 'bird', clean: true, still: true });
    expect(p.record.achievements.has('stoneStill')).toBe(true);
    p.hear({ kind: 'bond', with: 'nacre', value: 0.3 });
    p.hear({ kind: 'bond', with: 'brise', value: 0.3 });
    expect(p.record.achievements.has('familiar')).toBe(false);
    p.hear({ kind: 'bond', with: 'ecume', value: 0.26 });
    expect(p.record.achievements.has('familiar')).toBe(true);
    expect(p.record.achievements.has('shoal')).toBe(false);
  });

  it('never cornered needs the open sea with no time cornered', () => {
    const p = progress();
    p.hear({ kind: 'cornered', area: 'mangrove' });
    p.hear({ kind: 'area', area: 'openSea' });
    expect(p.record.achievements.has('openWater')).toBe(true);
    expect(p.record.achievements.has('neverCornered')).toBe(false);
  });
});

describe('cards', () => {
  it('unlock from what the shrimp does: the yolk, the shapes, landfall, Sense, a fright', () => {
    const p = progress();
    expect(p.hear({ kind: 'stat', stat: 'yolkEnded' })).toContainEqual({
      kind: 'card',
      id: 'toLight',
    });
    p.hear({ kind: 'stat', stat: 'shapeChanges' });
    expect(p.record.cards.has('shapes')).toBe(false);
    p.hear({ kind: 'stat', stat: 'shapeChanges' });
    expect(p.record.cards.has('shapes')).toBe(true);
    p.hear({ kind: 'stat', stat: 'landfalls' });
    p.hear({ kind: 'sense' });
    p.hear({ kind: 'mood', from: 'calm', to: 'afraid' });
    expect([...p.record.cards]).toEqual(['toLight', 'shapes', 'rideTide', 'scent', 'heart']);
  });

  it('a card still to check unlocks only for the author, with ?debug', () => {
    const p = progress();
    p.hear({ kind: 'molt', molts: 1 });
    expect(p.record.cards.has('molt')).toBe(false);
    const author = progress(true);
    expect(author.hear({ kind: 'molt', molts: 1 })).toContainEqual({ kind: 'card', id: 'molt' });
  });
});

describe('the record', () => {
  it('keeps going from a record already made, as from a save', () => {
    const p = progress();
    for (let index = 0; index < 10; index++) {
      p.hear({ kind: 'eaten', food: 'microalgae', area: 'drift', full: false, night: false });
    }
    const again = new Progress(PROGRESS_DEFS, p.record);
    const news = again.hear({
      kind: 'eaten',
      food: 'microalgae',
      area: 'drift',
      full: false,
      night: false,
    });
    expect(news).toEqual([{ kind: 'progress', id: 'c0.motes', value: 11, target: 15 }]);
  });

  it('counts a visit afresh each time a place is entered', () => {
    const p = progress();
    p.hear({ kind: 'area', area: 'mangrove' });
    p.hear({ kind: 'threat', threat: 'bird', stage: 'chase', area: 'mangrove' });
    expect(p.stat('chases.mangrove')).toBe(1);
    p.hear({ kind: 'area', area: 'mangrove' });
    expect(p.stat('chases.mangrove')).toBe(0);
  });
});
