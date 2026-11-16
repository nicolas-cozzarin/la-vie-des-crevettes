import { describe, expect, it } from 'vitest';
import { Activity, type ActivityInput } from '../../src/core/activity/Activity';

const BL = 100;
const TUNING = { reach: 1.5, tuck: 0.45, settled: 0.12, slowing: 0.35 };
const tangle = { x: 0, y: 0, r: 200 };

function input(x: number, y: number, hide: boolean, more: Partial<ActivityInput> = {}) {
  return { dt: 1 / 60, x, y, hide, tailFlip: false, axis: { x: 1, y: 0 }, ...more };
}

describe('Activity', () => {
  it('starts free and passes the player direction through', () => {
    const activity = new Activity(TUNING, BL);
    expect(activity.name).toBe('free');
    expect(activity.update(input(1000, 0, false), [tangle]).axis).toEqual({ x: 1, y: 0 });
  });

  it('starts hiding only with cover in reach', () => {
    const activity = new Activity(TUNING, BL);
    // 1.6 BL from the edge: too far.
    activity.update(input(360, 0, true), [tangle]);
    expect(activity.name).toBe('free');
    // 1.4 BL from the edge: in reach.
    activity.update(input(340, 0, true), [tangle]);
    expect(activity.name).toBe('hiding');
    expect(activity.cover).toBe(tangle);
  });

  it('says whether Hide would start here', () => {
    const activity = new Activity(TUNING, BL);
    expect(activity.canHide(340, 0, [tangle])).toBe(true);
    expect(activity.canHide(360, 0, [tangle])).toBe(false);
  });

  it('walks the body in, ignoring the movement keys', () => {
    const activity = new Activity(TUNING, BL);
    const { axis } = activity.update(input(340, 0, true, { axis: { x: 1, y: 1 } }), [tangle]);
    expect(axis.x).toBeLessThan(0);
    expect(axis.y).toBeCloseTo(0);
    expect(activity.tucked).toBe(false);
  });

  it('settles and counts as hidden at the tuck point', () => {
    const activity = new Activity(TUNING, BL);
    activity.update(input(340, 0, true), [tangle]);
    const { axis } = activity.update(input(92, 0, true), [tangle]);
    expect(axis).toEqual({ x: 0, y: 0 });
    expect(activity.tucked).toBe(true);
  });

  it('settles where it is when blocked under the cover', () => {
    const activity = new Activity(TUNING, BL);
    activity.update(input(340, 0, true), [tangle]);
    let result = activity.update(input(150, 0, true), [tangle]);
    for (let frame = 0; frame < 30; frame += 1)
      result = activity.update(input(150, 0, true), [tangle]);
    expect(result.axis).toEqual({ x: 0, y: 0 });
    expect(activity.tucked).toBe(true);
  });

  it('ends when Hide is let go', () => {
    const activity = new Activity(TUNING, BL);
    activity.update(input(340, 0, true), [tangle]);
    activity.update(input(300, 0, false), [tangle]);
    expect(activity.name).toBe('free');
    expect(activity.cover).toBeNull();
  });

  it('always lets a tail flip leave cover', () => {
    const activity = new Activity(TUNING, BL);
    activity.update(input(340, 0, true), [tangle]);
    activity.update(input(92, 0, true), [tangle]);
    expect(activity.tucked).toBe(true);
    const { axis } = activity.update(input(92, 0, true, { tailFlip: true }), [tangle]);
    expect(activity.name).toBe('free');
    expect(activity.tucked).toBe(false);
    expect(axis).toEqual({ x: 1, y: 0 });
  });

  it('does not start hiding on the frame of a tail flip', () => {
    const activity = new Activity(TUNING, BL);
    activity.update(input(340, 0, true, { tailFlip: true }), [tangle]);
    expect(activity.name).toBe('free');
  });
});
