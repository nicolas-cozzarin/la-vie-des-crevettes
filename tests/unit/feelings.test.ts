import { describe, expect, it } from 'vitest';
import { FeelingsModel } from '../../src/core/feelings/FeelingsModel';
import {
  QUIET_CONTEXT,
  type FeelingsContext,
  type ThreatView,
} from '../../src/core/feelings/types';
import { COMFORT, COMPANY, CURIOSITY, FEAR, HUNGER, MOOD, WARY } from '../../src/data/tuning';

/** The feelings tuning as the game passes it in. */
const TUNING = {
  hunger: HUNGER,
  fear: FEAR,
  comfort: COMFORT,
  curiosity: CURIOSITY,
  company: COMPANY,
  wary: WARY,
};

function model(start: ConstructorParameters<typeof FeelingsModel>[2] = {}): FeelingsModel {
  return new FeelingsModel(TUNING, MOOD, start);
}

/** Steps the model for `seconds` in steps of 1/30 s, with one context. */
function run(feelings: FeelingsModel, seconds: number, context: Partial<FeelingsContext> = {}) {
  const full = { ...QUIET_CONTEXT, ...context };
  const steps = Math.round(seconds * 30);
  for (let index = 0; index < steps; index++) feelings.step(1 / 30, full);
}

const presence = (more: Partial<ThreatView> = {}): ThreatView => ({
  stage: 'presence',
  inSight: true,
  within8: false,
  afterMe: false,
  ...more,
});

describe('hunger', () => {
  it.each([
    ['walking', 'walk', 240],
    ['swimming', 'swim', 200],
    ['at rest', 'rest', 480],
  ] as const)('goes from 0 to 1 in the right time %s', (_label, motion, seconds) => {
    const feelings = model();
    run(feelings, seconds * 0.98, { motion, moving: motion !== 'rest' });
    expect(feelings.values.hunger).toBeLessThan(1);
    run(feelings, seconds * 0.03, { motion, moving: motion !== 'rest' });
    expect(feelings.values.hunger).toBe(1);
  });

  it('rises slower while hidden', () => {
    const feelings = model();
    run(feelings, 100, { activity: 'hiding', hidden: true });
    expect(feelings.values.hunger).toBeCloseTo((100 / 240) * 0.3, 2);
  });

  it('rises with each tail flip', () => {
    const feelings = model({ hunger: 0.5 });
    feelings.stimulus('tailFlip');
    expect(feelings.values.hunger).toBeCloseTo(0.506);
  });

  it('makes the shrimp peckish at 0.5 and very hungry at 0.9', () => {
    const feelings = model({ hunger: 0.6 });
    run(feelings, 0.1);
    expect(feelings.has('peckish')).toBe(true);
    expect(feelings.has('veryHungry')).toBe(false);
  });
});

describe('fear', () => {
  it('rises by 0.3 for a shadow, 0.6 while soft, 0.45 while wary', () => {
    const plain = model();
    plain.stimulus('shadow');
    expect(plain.values.fear).toBeCloseTo(0.3);

    const soft = model();
    soft.setSoft(30);
    soft.stimulus('shadow');
    expect(soft.values.fear).toBeCloseTo(0.6);

    const wary = model();
    wary.stimulus('startle', 0);
    wary.stimulus('shadow');
    expect(wary.values.fear).toBeCloseTo(0.45);
  });

  it('never rises by more than 0.6 from one stimulus', () => {
    const feelings = model();
    feelings.setSoft(30);
    feelings.stimulus('predatorSeen');
    expect(feelings.values.fear).toBeCloseTo(0.6);
  });

  it.each([
    ['in the open', {}, 0.05],
    ['hidden', { activity: 'hiding', hidden: true }, 0.2],
    ['beside a companion', { companionWithin2: true }, 0.1],
    ['hidden beside a companion: only the largest', { hidden: true, companionWithin2: true }, 0.2],
  ] as const)('falls by the right amount each second %s', (_label, context, fall) => {
    const feelings = model({ fear: 0.8 });
    run(feelings, 1, context);
    expect(feelings.values.fear).toBeCloseTo(0.8 - fall, 2);
  });

  it('does not fall while a predator is in sight and the shrimp is not hidden', () => {
    const feelings = model({ fear: 0.7 });
    run(feelings, 3, { threat: presence() });
    expect(feelings.values.fear).toBeCloseTo(0.7);
  });

  it('cannot drop below 0.8 during a chase after this shrimp', () => {
    const feelings = model({ fear: 0.5 });
    run(feelings, 1, { threat: presence({ stage: 'chase', afterMe: true }) });
    expect(feelings.values.fear).toBe(0.8);
  });

  it('cannot drop below 0.5 while a predator is present within 8 BL, even hidden', () => {
    const feelings = model({ fear: 0.6 });
    run(feelings, 5, {
      hidden: true,
      activity: 'hiding',
      threat: presence({ inSight: false, within8: true }),
    });
    expect(feelings.values.fear).toBe(0.5);
  });

  it('is set to 0.9 when cornered and held there for 3 s', () => {
    const feelings = model({ fear: 0.2 });
    feelings.stimulus('cornered');
    run(feelings, 2.9);
    expect(feelings.values.fear).toBeCloseTo(0.9);
    run(feelings, 1.1);
    expect(feelings.values.fear).toBeLessThan(0.9);
  });

  it('makes the body flinch after a gain of 0.15 or more, for 0.35 s', () => {
    const feelings = model();
    feelings.stimulus('startle', 0.15);
    run(feelings, 0.1);
    expect(feelings.has('startled')).toBe(true);
    run(feelings, 0.3);
    expect(feelings.has('startled')).toBe(false);
  });
});

describe('comfort', () => {
  it('rises with a time of 8 s and falls with a time of 2 s', () => {
    const rising = model({ comfort: 0, hunger: 0 });
    // Target with nothing going on: 0.35 + 0.25.
    run(rising, 8);
    expect(rising.values.comfort).toBeCloseTo(0.6 * (1 - Math.exp(-1)), 1);

    const falling = model({ comfort: 1, hunger: 0 });
    run(falling, 2);
    expect(falling.values.comfort).toBeCloseTo(0.6 + 0.4 * Math.exp(-1), 1);
  });

  it('rises at once with a discovery', () => {
    const feelings = model({ comfort: 0.5 });
    feelings.stimulus('discovery');
    expect(feelings.values.comfort).toBeCloseTo(0.6);
  });
});

describe('curiosity', () => {
  it('is 0 when fear is 0.5 or more', () => {
    const feelings = model({ curiosity: 0.8, fear: 0.9 });
    run(feelings, 15, { curiosityPull: 1, threat: presence() });
    expect(feelings.values.curiosity).toBeLessThan(0.01);
  });

  it('follows the pull it is given', () => {
    const feelings = model();
    run(feelings, 6, { curiosityPull: 0.6 });
    expect(feelings.values.curiosity).toBeCloseTo(0.6, 2);
  });
});

describe('company', () => {
  it('reaches 0.6 with two strangers and 1 with one Close companion', () => {
    const strangers = model();
    run(strangers, 20, { neighbours: ['stranger', 'stranger'] });
    expect(strangers.values.company).toBeCloseTo(0.6, 2);

    const close = model();
    run(close, 20, { neighbours: ['close'] });
    expect(close.values.company).toBeCloseTo(1, 2);
  });

  it('falls with a time of 20 s when alone', () => {
    const feelings = model({ company: 1 });
    run(feelings, 20);
    expect(feelings.values.company).toBeCloseTo(Math.exp(-1), 2);
  });
});

describe('conditions', () => {
  it('wary starts when afraid ends and lasts 20 s', () => {
    const feelings = model({ fear: 0.6 });
    run(feelings, 0.1);
    expect(feelings.mood).toBe('afraid');
    // Fear falls 0.05 a second in the open: below 0.4 after 4 s, and the
    // mood follows 0.4 s later. Wary runs from there.
    let seconds = 0.1;
    while (feelings.mood === 'afraid') {
      run(feelings, 1 / 30);
      seconds += 1 / 30;
    }
    expect(seconds).toBeGreaterThan(4);
    expect(seconds).toBeLessThan(5);
    expect(feelings.has('wary')).toBe(true);
    run(feelings, 19.8);
    expect(feelings.has('wary')).toBe(true);
    run(feelings, 0.3);
    expect(feelings.has('wary')).toBe(false);
  });

  it('wary lasts 40 s after being cornered', () => {
    const feelings = model();
    feelings.stimulus('cornered');
    // 3 s held, then 10 s to fall below 0.4, then the mood changes.
    while (feelings.mood !== 'calm' || feelings.values.fear > 0.39) run(feelings, 1 / 30);
    expect(feelings.has('wary')).toBe(true);
    run(feelings, 39.8);
    expect(feelings.has('wary')).toBe(true);
    run(feelings, 0.3);
    expect(feelings.has('wary')).toBe(false);
  });

  it('wary lasts 10 s after a harmless startle', () => {
    const feelings = model();
    feelings.stimulus('startle');
    run(feelings, 9.9);
    expect(feelings.has('wary')).toBe(true);
    run(feelings, 0.2);
    expect(feelings.has('wary')).toBe(false);
  });

  it('wary ends early after 10 s resting in cover', () => {
    const feelings = model({ fear: 0.6 });
    run(feelings, 6);
    expect(feelings.has('wary')).toBe(true);
    run(feelings, 10.1, { activity: 'hiding', hidden: true });
    expect(feelings.has('wary')).toBe(false);
  });

  it('frozen needs fear of 0.3 and 1 s without input', () => {
    const scared = model({ fear: 0.45 });
    run(scared, 0.9);
    expect(scared.has('frozen')).toBe(false);
    run(scared, 0.2);
    expect(scared.has('frozen')).toBe(true);

    const moving = model({ fear: 0.45 });
    run(moving, 2, { moving: true, motion: 'walk' });
    expect(moving.has('frozen')).toBe(false);

    const calm = model({ fear: 0.1 });
    run(calm, 2);
    expect(calm.has('frozen')).toBe(false);
  });

  it('reports each condition change once', () => {
    const feelings = model({ hunger: 0.49 });
    const changes: string[] = [];
    for (let index = 0; index < 30 * 10; index++) {
      const result = feelings.step(1 / 30, { ...QUIET_CONTEXT, motion: 'walk', moving: true });
      for (const change of result.conditions) changes.push(`${change.condition}:${change.on}`);
    }
    expect(changes).toEqual(['peckish:true']);
  });
});
