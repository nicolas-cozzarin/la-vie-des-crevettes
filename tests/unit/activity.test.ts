import { describe, expect, it } from 'vitest';
import { Activity, type ActivityInput } from '../../src/core/activity/Activity';

const BL = 100;
const TUNING = { reach: 1.5, tuck: 0.45, settled: 0.12, slowing: 0.35 };
const tangle = { x: 0, y: 0, r: 200 };
const GRAZE = { reach: 0.6, head: 0.4, full: 0.15, taste: 1, fearEnds: 0.5 };

function input(x: number, y: number, hide: boolean, more: Partial<ActivityInput> = {}) {
  return { dt: 1 / 60, x, y, hide, tailFlip: false, axis: { x: 1, y: 0 }, ...more };
}

describe('Activity', () => {
  it('starts free and passes the player direction through', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    expect(activity.name).toBe('free');
    expect(activity.update(input(1000, 0, false), [tangle]).axis).toEqual({ x: 1, y: 0 });
  });

  it('starts hiding only with cover in reach', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    // 1.6 BL from the edge: too far.
    activity.update(input(360, 0, true), [tangle]);
    expect(activity.name).toBe('free');
    // 1.4 BL from the edge: in reach.
    activity.update(input(340, 0, true), [tangle]);
    expect(activity.name).toBe('hiding');
    expect(activity.cover).toBe(tangle);
  });

  it('says whether Hide would start here', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    expect(activity.canHide(340, 0, [tangle])).toBe(true);
    expect(activity.canHide(360, 0, [tangle])).toBe(false);
  });

  it('walks the body in, ignoring the movement keys', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    const { axis } = activity.update(input(340, 0, true, { axis: { x: 1, y: 1 } }), [tangle]);
    expect(axis.x).toBeLessThan(0);
    expect(axis.y).toBeCloseTo(0);
    expect(activity.tucked).toBe(false);
  });

  it('settles and counts as hidden at the tuck point', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    activity.update(input(340, 0, true), [tangle]);
    const { axis } = activity.update(input(92, 0, true), [tangle]);
    expect(axis).toEqual({ x: 0, y: 0 });
    expect(activity.tucked).toBe(true);
  });

  it('settles where it is when blocked under the cover', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    activity.update(input(340, 0, true), [tangle]);
    let result = activity.update(input(150, 0, true), [tangle]);
    for (let frame = 0; frame < 30; frame += 1)
      result = activity.update(input(150, 0, true), [tangle]);
    expect(result.axis).toEqual({ x: 0, y: 0 });
    expect(activity.tucked).toBe(true);
  });

  it('ends when Hide is let go', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    activity.update(input(340, 0, true), [tangle]);
    activity.update(input(300, 0, false), [tangle]);
    expect(activity.name).toBe('free');
    expect(activity.cover).toBeNull();
  });

  it('always lets a tail flip leave cover', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    activity.update(input(340, 0, true), [tangle]);
    activity.update(input(92, 0, true), [tangle]);
    expect(activity.tucked).toBe(true);
    const { axis } = activity.update(input(92, 0, true, { tailFlip: true }), [tangle]);
    expect(activity.name).toBe('free');
    expect(activity.tucked).toBe(false);
    expect(axis).toEqual({ x: 1, y: 0 });
  });

  it('does not start hiding on the frame of a tail flip', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    activity.update(input(340, 0, true, { tailFlip: true }), [tangle]);
    expect(activity.name).toBe('free');
  });
});

describe('Activity, grazing and sensing', () => {
  const film = { id: 'film', kind: 'algaeFilm' as const, x: 200, y: 0, r: 80, amount: 1 };
  const tasted = () => true;
  function graze(x: number, more: Partial<ActivityInput> = {}): ActivityInput {
    return {
      ...input(x, 0, false),
      axis: { x: 0, y: 0 },
      interact: true,
      heading: 0,
      hunger: 0.6,
      fear: 0,
      tasted,
      ...more,
    };
  }

  it('starts grazing only when the mouth is within 0.6 BL of a patch', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    // The patch's edge is at 120 and the mouth 40 ahead: 70 from the edge, then 50.
    activity.update(graze(10), [], [film]);
    expect(activity.name).toBe('free');
    activity.update(graze(30), [], [film]);
    expect(activity.name).toBe('grazing');
    expect(activity.food).toBe(film);
  });

  it('steps to the patch, then eats', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    const walking = activity.update(graze(30), [], [film]);
    expect(walking.eating).toBe(false);
    expect(walking.axis.x).toBeGreaterThan(0);
    const eating = activity.update(graze(100), [], [film]);
    expect(eating.eating).toBe(true);
    expect(eating.axis).toEqual({ x: 0, y: 0 });
  });

  it('ends when released, moved, full, afraid, or the patch is empty', () => {
    const ends: Partial<ActivityInput>[] = [
      { interact: false },
      { axis: { x: 1, y: 0 } },
      { hunger: 0.1 },
      { fear: 0.5 },
      { tailFlip: true },
    ];
    for (const more of ends) {
      const activity = new Activity(TUNING, BL, GRAZE);
      activity.update(graze(100), [], [film]);
      expect(activity.name).toBe('grazing');
      activity.update(graze(100, more), [], [film]);
      expect(activity.name).toBe('free');
    }
    const activity = new Activity(TUNING, BL, GRAZE);
    const small = { ...film };
    activity.update(graze(100), [], [small]);
    small.amount = 0;
    activity.update(graze(100), [], [small]);
    expect(activity.name).toBe('free');
  });

  it('a full shrimp does not graze, but may taste a new food for 1 s', () => {
    const full = new Activity(TUNING, BL, GRAZE);
    full.update(graze(100, { hunger: 0.1 }), [], [film]);
    expect(full.name).toBe('free');

    const taste = new Activity(TUNING, BL, GRAZE);
    const fresh = { hunger: 0.1, tasted: () => false };
    taste.update(graze(100, fresh), [], [film]);
    expect(taste.name).toBe('grazing');
    for (let frame = 0; frame < 59; frame++) taste.update(graze(100, fresh), [], [film]);
    expect(taste.name).toBe('grazing');
    taste.update(graze(100, fresh), [], [film]);
    taste.update(graze(100, fresh), [], [film]);
    expect(taste.name).toBe('free');
    // Still held, it does not start again: a new press is needed.
    taste.update(graze(100, fresh), [], [film]);
    expect(taste.name).toBe('free');
    taste.update(graze(100, { ...fresh, interact: false }), [], [film]);
    taste.update(graze(100, fresh), [], [film]);
    expect(taste.name).toBe('grazing');
  });

  it('senses while Sense is held, standing still, until released or afraid', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    const result = activity.update({ ...input(1000, 0, false), sense: true }, [], []);
    expect(activity.name).toBe('sensing');
    expect(result.axis).toEqual({ x: 0, y: 0 });
    activity.update({ ...input(1000, 0, false), sense: true, fear: 0.6 }, [], []);
    expect(activity.name).toBe('free');
    activity.update({ ...input(1000, 0, false), sense: true }, [], []);
    activity.update({ ...input(1000, 0, false), sense: false }, [], []);
    expect(activity.name).toBe('free');
  });

  it('a tail flip ends sensing', () => {
    const activity = new Activity(TUNING, BL, GRAZE);
    activity.update({ ...input(1000, 0, false), sense: true }, [], []);
    activity.update({ ...input(1000, 0, false), sense: true, tailFlip: true }, [], []);
    expect(activity.name).toBe('free');
  });
});
