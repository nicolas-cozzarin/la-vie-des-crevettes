import { describe, expect, it } from 'vitest';
import { FoodPatch, type FoodSpot } from '../../src/core/food/FoodPatch';
import { FeelingsModel } from '../../src/core/feelings/FeelingsModel';
import { FOOD_KINDS } from '../../src/core/world/kinds';
import { FOODS } from '../../src/data/foods';
import { FEELINGS, MOOD } from '../../src/data/tuning';

function patch(kind: keyof typeof FOODS = 'algaeFilm'): FoodPatch {
  return new FoodPatch('p', kind, 0, 0, 80, FOODS[kind]);
}

/** Grazes for `seconds` in steps of 1/30 s, as the play scene does. Returns the hunger removed. */
function graze(food: FoodPatch, seconds: number, dusk = false): number {
  let removed = 0;
  for (let step = 0; step < Math.round(seconds * 30); step++) {
    removed += food.graze(1 / 30, dusk);
    food.step(1 / 30);
  }
  return removed;
}

describe('FoodPatch', () => {
  it('a full algae graze takes 4 s and removes 0.25', () => {
    const food = patch();
    expect(graze(food, 4)).toBeCloseTo(0.25, 5);
    expect(food.amount).toBeCloseTo(0, 5);
  });

  it('half a graze removes half', () => {
    const food = patch();
    expect(graze(food, 2)).toBeCloseTo(0.125, 5);
    expect(food.amount).toBeCloseTo(0.5, 5);
  });

  it('a mangrove leaf takes 8 s and removes 0.45', () => {
    const food = patch('mangroveLeaf');
    expect(graze(food, 4)).toBeCloseTo(0.225, 5);
    expect(graze(food, 4)).toBeCloseTo(0.225, 5);
    expect(food.graze(1 / 30)).toBe(0);
  });

  it('golden sand film is better at dusk', () => {
    expect(graze(patch('sandFilm'), 4, true)).toBeCloseTo(0.35, 5);
  });

  it('a food eaten on touch goes at once', () => {
    const food = patch('seaweed');
    expect(food.graze(1 / 30)).toBeCloseTo(0.15, 5);
    expect(food.amount).toBe(0);
  });

  it('an empty patch grows back in 90 s, and not while it is grazed', () => {
    const food = patch();
    graze(food, 4);
    for (let step = 0; step < 89 * 30; step++) food.step(1 / 30);
    expect(food.amount).toBeLessThan(1);
    expect(food.amount).toBeGreaterThan(0.95);
    for (let step = 0; step < 30; step++) food.step(1 / 30);
    expect(food.amount).toBe(1);
  });

  it('every food kind has a value', () => {
    for (const kind of FOOD_KINDS) expect(FOODS[kind].removes).toBeGreaterThan(0);
  });

  it('eating lowers hunger in the feelings, never below 0', () => {
    const feelings = new FeelingsModel(FEELINGS, MOOD, { hunger: 0.6 });
    feelings.eat(0.25);
    expect(feelings.values.hunger).toBeCloseTo(0.35, 5);
    feelings.eat(1);
    expect(feelings.values.hunger).toBe(0);
  });

  it('a patch is a food spot', () => {
    const spot: FoodSpot = patch();
    expect(spot.amount).toBe(1);
  });
});
