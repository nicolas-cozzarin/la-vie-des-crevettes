import { describe, expect, it } from 'vitest';
import { Activity, type ActivityInput } from '../../src/core/activity/Activity';
import { BURROW, GRAZE, GREET, HIDE } from '../../src/data/tuning';

const BL = 100;
const DT = 1 / 30;
const tangle = { x: 0, y: 0, r: 200 };
/** Far from the tangle, on open sand. */
const OPEN = { x: 2000, y: 0 };

function activity(): Activity {
  return new Activity(HIDE, BL, GRAZE, GREET, BURROW);
}

function input(hide: boolean, more: Partial<ActivityInput> = {}): ActivityInput {
  return { dt: DT, ...OPEN, hide, tailFlip: false, axis: { x: 0, y: 0 }, sand: true, ...more };
}

function hold(body: Activity, seconds: number, more: Partial<ActivityInput> = {}) {
  for (let time = 0; time < seconds - 1e-9; time += DT) body.update(input(true, more), [tangle]);
}

describe('burrowing (doc 10, "Activities")', () => {
  it('digs in over 1.2 s on sand away from cover, and only then counts as hidden', () => {
    const body = activity();
    body.update(input(true), [tangle]);
    expect(body.name).toBe('burrowing');
    hold(body, BURROW.dig - 0.2);
    expect(body.tucked).toBe(false);
    expect(body.burrowDepth).toBeGreaterThan(0.6);
    hold(body, 0.3);
    expect(body.tucked).toBe(true);
    expect(body.burrowDepth).toBe(1);
  });

  it('keeps the body still while digging, whatever the keys say', () => {
    const body = activity();
    const result = body.update(input(true, { axis: { x: 1, y: 0 } }), [tangle]);
    expect(result.axis).toEqual({ x: 0, y: 0 });
  });

  it('hides under cover rather than digging when cover is in reach, and never digs off sand', () => {
    const near = activity();
    near.update(input(true, { x: 340, y: 0 }), [tangle]);
    expect(near.name).toBe('hiding');
    const mud = activity();
    mud.update(input(true, { sand: false }), [tangle]);
    expect(mud.name).toBe('free');
    expect(mud.canBurrow(OPEN.x, OPEN.y, [tangle], true)).toBe(true);
    expect(mud.canBurrow(340, 0, [tangle], true)).toBe(false);
  });

  it('comes out over 0.5 s once Hide is let go', () => {
    const body = activity();
    hold(body, BURROW.dig + 0.1);
    body.update(input(false), [tangle]);
    expect(body.tucked).toBe(false);
    expect(body.name).toBe('burrowing');
    for (let time = 0; time < BURROW.out + 0.05; time += DT) body.update(input(false), [tangle]);
    expect(body.name).toBe('free');
    expect(body.burrowDepth).toBe(0);
  });

  it('ends at once with a tail flip: fear never locks the escape', () => {
    const body = activity();
    hold(body, BURROW.dig + 0.1);
    body.update(input(true, { tailFlip: true }), [tangle]);
    expect(body.name).toBe('free');
    expect(body.tucked).toBe(false);
  });
});

describe('resting until dusk (doc 02, "Hide and shelter")', () => {
  it('can begin only tucked or dug in', () => {
    const body = activity();
    expect(body.rest()).toBe(false);
    hold(body, BURROW.dig + 0.1);
    expect(body.canRest).toBe(true);
    expect(body.rest()).toBe(true);
    expect(body.name).toBe('resting');
    expect(body.tucked).toBe(true);
    expect(body.burrowDepth).toBe(1);
  });

  it('stays dug in with Hide let go, until a key wakes it', () => {
    const body = activity();
    hold(body, BURROW.dig + 0.1);
    body.rest();
    for (let time = 0; time < 3; time += DT) body.update(input(false), [tangle]);
    expect(body.name).toBe('resting');
    body.update(input(false, { wake: true }), [tangle]);
    // Awake, with Hide let go, it comes out of the sand.
    expect(body.name).toBe('burrowing');
    expect(body.tucked).toBe(false);
  });

  it('wakes at dusk, and stays dug in if Hide is still held', () => {
    const body = activity();
    hold(body, BURROW.dig + 0.1);
    body.rest();
    body.wake();
    hold(body, 1);
    expect(body.name).toBe('burrowing');
    expect(body.tucked).toBe(true);
  });

  it('under cover, wakes still tucked in until the shrimp moves', () => {
    const body = activity();
    // Hide starts in reach of the tangle; the body has walked to the tuck point.
    body.update(input(true, { x: 340, y: 0 }), [tangle]);
    const at = { x: 92, y: 0 };
    body.update(input(true, at), [tangle]);
    expect(body.tucked).toBe(true);
    expect(body.rest()).toBe(true);
    body.wake();
    body.update(input(false, at), [tangle]);
    expect(body.name).toBe('hiding');
    expect(body.tucked).toBe(true);
    body.update(input(false, { ...at, axis: { x: 1, y: 0 } }), [tangle]);
    expect(body.name).toBe('free');
  });
});
