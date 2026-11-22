import { describe, expect, it } from 'vitest';
import { newLife } from '../../src/core/progress/life';
import { RestSaver } from '../../src/core/save/RestSaver';
import { clearSave, lifeOf, loadSave, SAVE_KEY, saveOf, writeSave } from '../../src/core/save/save';
import { MemoryStore } from '../../src/core/save/store';
import { SAVE } from '../../src/data/tuning';

const DT = 1 / 30;

function steps(saver: RestSaver, seconds: number, resting: boolean): number {
  let saves = 0;
  for (let time = 0; time < seconds - 1e-9; time += DT) if (saver.step(DT, resting)) saves++;
  return saves;
}

describe('the save', () => {
  it('gives back the life it was made from', () => {
    const life = newLife();
    life.stepsDone.add('s0.motes');
    life.narrated.add('narr.c0.start');
    life.narrated.add('narr.mood.hungry');
    life.discoveries.add('food.microalgae');
    life.placesSeen.add('drift');
    life.stats['eaten.microalgae'] = 7;
    life.challenges['c0.motes'] = 7;
    life.achievements.add('landfall');
    life.cards.add('toLight');
    life.bonds.nacre = 0.3;
    life.molts = 1;
    life.hunger = 0.4;
    life.favourite = 'algaeFilm';
    life.pinned = 'c1.branch';
    life.promptsShown['prompt.graze'] = 2;
    life.playSeconds = 321.4;
    const save = saveOf(life, { area: 'mangrove', stage: 'juvenile', at: { x: 1700.4, y: 2800 } });
    expect(save.moodsNamed).toEqual(['hungry']);
    expect(save.at).toEqual({ x: 1700, y: 2800 });

    const store = new MemoryStore();
    expect(writeSave(store, save)).toBe(true);
    const loaded = loadSave(store);
    expect(loaded).toEqual(save);
    if (!loaded) return;
    const back = lifeOf(loaded);
    expect(back.stepsDone).toEqual(life.stepsDone);
    expect(back.narrated).toEqual(life.narrated);
    expect(back.stats).toEqual(life.stats);
    expect(back.cards).toEqual(life.cards);
    expect(back.bonds).toEqual(life.bonds);
    expect(back.molts).toBe(1);
    expect(back.favourite).toBe('algaeFilm');
    expect(back.pinned).toBe('c1.branch');
    expect(back.playSeconds).toBe(321);
  });

  it('is null when there is none, or it is not a save', () => {
    const store = new MemoryStore();
    expect(loadSave(store)).toBeNull();
    store.setItem(SAVE_KEY, 'not json');
    expect(loadSave(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ v: 2, area: 'mangrove' }));
    expect(loadSave(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ v: 1, area: 'nowhere' }));
    expect(loadSave(store)).toBeNull();
  });

  it('fills what an older save leaves out with defaults, and drops what is wrong', () => {
    const store = new MemoryStore();
    store.setItem(
      SAVE_KEY,
      JSON.stringify({
        v: 1,
        area: 'mangrove',
        stage: 'juvenile',
        stepsDone: ['s1.fill', 3],
        stats: { tailFlips: 4, wrong: 'x' },
        hunger: 3,
        favourite: 'shrimp',
        moodsNamed: ['calm', 'angry'],
      }),
    );
    const save = loadSave(store);
    expect(save).not.toBeNull();
    if (!save) return;
    expect(save.generation).toBe(1);
    expect(save.at).toBeNull();
    expect(save.stepsDone).toEqual(['s1.fill']);
    expect(save.stats).toEqual({ tailFlips: 4 });
    expect(save.hunger).toBe(1);
    // No food outside the closed list, ever (rule 1).
    expect(save.favourite).toBeNull();
    expect(save.moodsNamed).toEqual(['calm']);
    expect(save.pinned).toBeNull();
    expect(save.cardsUnlocked).toEqual([]);
  });

  it('can be cleared', () => {
    const store = new MemoryStore();
    writeSave(store, saveOf(newLife(), { area: 'drift', stage: 'larva', at: null }));
    clearSave(store);
    expect(loadSave(store)).toBeNull();
  });
});

describe('saving at rest', () => {
  it('saves once a rest under cover has lasted, once per rest', () => {
    const saver = new RestSaver(SAVE);
    expect(steps(saver, SAVE.rest - 0.1, true)).toBe(0);
    expect(steps(saver, 0.2, true)).toBe(1);
    expect(steps(saver, 20, true)).toBe(0);
  });

  it('waits for the gap before saving at the next rest', () => {
    const saver = new RestSaver(SAVE);
    steps(saver, SAVE.rest + 0.1, true);
    steps(saver, 1, false);
    expect(steps(saver, SAVE.rest + 1, true)).toBe(0);
    steps(saver, 1, false);
    steps(saver, SAVE.gap, false);
    expect(steps(saver, SAVE.rest + 0.1, true)).toBe(1);
  });

  it('counts a save made another way toward the gap', () => {
    const saver = new RestSaver(SAVE);
    saver.savedNow();
    expect(steps(saver, SAVE.rest + 0.1, true)).toBe(0);
  });
});
