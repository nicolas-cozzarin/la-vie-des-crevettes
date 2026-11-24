import { describe, expect, it } from 'vitest';
import type { FoodSpot } from '../../src/core/food/FoodPatch';
import { EMPTY_WORLD, RibbonMemory, ribbons } from '../../src/core/scent/ribbons';

const TUNING = { maxUnknown: 3, fade: 0.65 };
const RANGE = 800;

function food(id: string, kind: FoodSpot['kind'], x: number, amount = 1): FoodSpot {
  return { id, kind, x, y: 0, r: 80, amount };
}

describe('ribbons', () => {
  it('leads to the nearest patch of each food kind', () => {
    const found = ribbons(
      0,
      0,
      {
        ...EMPTY_WORLD,
        foods: [
          food('far', 'algaeFilm', 600),
          food('near', 'algaeFilm', 300),
          food('leaf', 'mangroveLeaf', 500),
        ],
      },
      RANGE,
      TUNING,
    );
    expect(found.map((ribbon) => ribbon.id).sort()).toEqual(['leaf', 'near']);
    expect(found.every((ribbon) => ribbon.kind === 'food')).toBe(true);
  });

  it('shows no food ribbon to an empty patch', () => {
    const found = ribbons(
      0,
      0,
      {
        ...EMPTY_WORLD,
        foods: [food('empty', 'algaeFilm', 100, 0), food('full', 'algaeFilm', 400)],
      },
      RANGE,
      TUNING,
    );
    expect(found.map((ribbon) => ribbon.id)).toEqual(['full']);
  });

  it('shows nothing beyond the range', () => {
    const world = {
      foods: [food('film', 'algaeFilm', 900)],
      shrimp: [{ id: 'nacre', x: 0, y: 850, companion: true }],
      dangers: [{ id: 'bird', x: -820, y: 0 }],
      unknown: [{ id: 'creature.snail', x: 0, y: -801 }],
    };
    expect(ribbons(0, 0, world, RANGE, TUNING)).toEqual([]);
    expect(ribbons(0, 0, world, 1000, TUNING)).toHaveLength(4);
  });

  it('is strongest close by and fades toward the edge of the range', () => {
    const [near] = ribbons(
      0,
      0,
      { ...EMPTY_WORLD, foods: [food('a', 'algaeFilm', 0)] },
      RANGE,
      TUNING,
    );
    const [edge] = ribbons(
      0,
      0,
      { ...EMPTY_WORLD, foods: [food('a', 'algaeFilm', 800)] },
      RANGE,
      TUNING,
    );
    expect(near?.strength).toBeCloseTo(1);
    expect(edge?.strength).toBeCloseTo(0.35);
  });

  it('shows at most three unknown things, nearest first', () => {
    const unknown = [500, 100, 300, 200, 400].map((x) => ({ id: `thing.${x}`, x, y: 0 }));
    const found = ribbons(0, 0, { ...EMPTY_WORLD, unknown }, RANGE, TUNING);
    expect(found.map((ribbon) => ribbon.id)).toEqual(['thing.100', 'thing.200', 'thing.300']);
  });

  it("adds a white ribbon to the pinned challenge's target, over the three, within range", () => {
    const unknown = [100, 200, 300].map((x) => ({ id: `thing.${x}`, x, y: 0 }));
    const pinned = { id: 'pinned.c1.crab', x: 0, y: 600 };
    const found = ribbons(0, 0, { ...EMPTY_WORLD, unknown, pinned }, RANGE, TUNING);
    expect(found.map((ribbon) => ribbon.id)).toEqual([
      'thing.100',
      'thing.200',
      'thing.300',
      'pinned.c1.crab',
    ]);
    expect(found.at(-1)?.kind).toBe('unknown');
    // Where a white ribbon already leads, there is no second one.
    const same = ribbons(
      0,
      0,
      { ...EMPTY_WORLD, unknown, pinned: { ...pinned, x: 200, y: 0 } },
      RANGE,
      TUNING,
    );
    expect(same).toHaveLength(3);
    const far = { id: 'pinned.c1.crab', x: 0, y: 900 };
    expect(ribbons(0, 0, { ...EMPTY_WORLD, pinned: far }, RANGE, TUNING)).toEqual([]);
  });

  it('one ribbon per shrimp and per danger mark', () => {
    const found = ribbons(
      0,
      0,
      {
        ...EMPTY_WORLD,
        shrimp: [
          { id: 'nacre', x: 100, y: 0, companion: true },
          { id: 'young.1', x: 0, y: 200, companion: false },
        ],
        dangers: [{ id: 'mark', x: -300, y: 0 }],
      },
      RANGE,
      TUNING,
    );
    expect(found.filter((ribbon) => ribbon.kind === 'shrimp')).toHaveLength(2);
    expect(found.filter((ribbon) => ribbon.kind === 'danger')).toHaveLength(1);
    expect(found.find((ribbon) => ribbon.id === 'nacre')?.companion).toBe(true);
  });
});

describe('RibbonMemory', () => {
  const shown = ribbons(
    0,
    0,
    { ...EMPTY_WORLD, foods: [food('film', 'algaeFilm', 300)] },
    RANGE,
    TUNING,
  );

  it('grazing a patch within 30 s of its ribbon follows it, once', () => {
    const memory = new RibbonMemory(30);
    memory.shown(shown, 10);
    expect(memory.followed('film', 39)).toBe(true);
    expect(memory.followed('film', 39.5)).toBe(false);
  });

  it('after 30 s it no longer counts', () => {
    const memory = new RibbonMemory(30);
    memory.shown(shown, 10);
    expect(memory.followed('film', 41)).toBe(false);
  });

  it('a patch with no ribbon shown is not followed', () => {
    expect(new RibbonMemory(30).followed('film', 1)).toBe(false);
  });
});
