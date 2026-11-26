import { describe, expect, it } from 'vitest';
import { FeelingsModel } from '../../src/core/feelings/FeelingsModel';
import { QUIET_CONTEXT, type FeelingsContext } from '../../src/core/feelings/types';
import { Story } from '../../src/core/progress/Story';
import { seededRandom } from '../../src/core/random';
import { ThreatDirector, type ThreatPlayer } from '../../src/core/threat/ThreatDirector';
import { DAY_PHASES, DayCycle, next, phaseLight } from '../../src/core/world/dayCycle';
import { STORY_STEPS } from '../../src/data/story';
import { BIRD, DAY, FEELINGS, MOOD, THREAT } from '../../src/data/tuning';

const DT = 1 / 30;

function run(cycle: DayCycle, seconds: number) {
  const begun = [];
  for (let time = 0; time < seconds - 1e-9; time += DT) begun.push(...cycle.step(DT));
  return begun;
}

describe('day and night', () => {
  it('lasts four minutes, day, dusk, night and dawn in turn', () => {
    const total = DAY_PHASES.reduce((sum, phase) => sum + DAY.length[phase], 0);
    expect(total).toBe(240);
    const cycle = new DayCycle(DAY);
    expect(cycle.phase).toBe('day');
    expect(run(cycle, 240.1)).toEqual(['dusk', 'night', 'dawn', 'day']);
    expect(cycle.phase).toBe('day');
    expect(next('dawn')).toBe('day');
  });

  it('begins where it is asked to, as explore mode can', () => {
    const cycle = new DayCycle(DAY, { phase: 'night', into: 0 });
    expect(cycle.phase).toBe('night');
    expect(cycle.left).toBe(DAY.length.night);
    // A place that opens at night opens dark at once, not after a fade.
    expect(cycle.light.night).toBeCloseTo(DAY.night);
    expect(run(cycle, DAY.length.night + 0.1)).toEqual(['dawn']);
  });

  it('eases the light from one phase to the next instead of switching it', () => {
    const cycle = new DayCycle(DAY, { phase: 'day', into: DAY.length.day - 0.5 });
    run(cycle, 1);
    expect(cycle.phase).toBe('dusk');
    expect(cycle.light.dusk).toBeGreaterThan(0);
    expect(cycle.light.dusk).toBeLessThan(DAY.dusk * 0.5);
    run(cycle, DAY.ease);
    expect(cycle.light.dusk).toBeGreaterThan(DAY.dusk * 0.9);
    expect(cycle.light.caustics).toBeCloseTo(DAY.duskCaustics, 1);
  });

  it('has no caustics and full plankton at night, and lifts the night through dawn', () => {
    expect(phaseLight('night', 0.5, DAY)).toEqual({
      dusk: 0,
      night: DAY.night,
      caustics: 0,
      plankton: 1,
    });
    const early = phaseLight('dawn', 0, DAY);
    const late = phaseLight('dawn', 1, DAY);
    expect(early.night).toBeCloseTo(DAY.night / 2);
    expect(late.night).toBe(0);
    expect(late.caustics).toBe(1);
    expect(late.plankton).toBe(0);
  });

  it('goes straight to dusk when asked, and says so once', () => {
    const cycle = new DayCycle(DAY);
    expect(cycle.skipTo('dusk')).toBe('dusk');
    expect(cycle.skipTo('dusk')).toBeNull();
    expect(cycle.left).toBe(DAY.length.dusk);
  });
});

describe('what the time of day does to the feelings', () => {
  function afterFright(context: Partial<FeelingsContext>, seconds: number): number {
    const feelings = new FeelingsModel(FEELINGS, MOOD, { fear: 0.6 });
    const full = { ...QUIET_CONTEXT, ...context };
    for (let time = 0; time < seconds; time += DT) feelings.step(DT, full);
    return feelings.values.fear;
  }

  it('by day, out in the open, fear falls at half speed', () => {
    const night = afterFright({ dayPhase: 'night' }, 4);
    const day = afterFright({ dayPhase: 'day' }, 4);
    expect(0.6 - night).toBeCloseTo(4 * FEELINGS.fear.falls.open, 2);
    expect(0.6 - day).toBeCloseTo(4 * FEELINGS.fear.falls.open * DAY.effects.dayOpenFall, 2);
  });

  it('by day, hidden or near cover, fear falls as usual', () => {
    const hidden = afterFright({ dayPhase: 'day', hidden: true, activity: 'hiding' }, 2);
    expect(0.6 - hidden).toBeCloseTo(2 * FEELINGS.fear.falls.hidden, 2);
    const near = afterFright({ dayPhase: 'day', nearCover: true }, 2);
    expect(0.6 - near).toBeCloseTo(2 * FEELINGS.fear.falls.open, 2);
  });

  function settledComfort(context: Partial<FeelingsContext>): number {
    const feelings = new FeelingsModel(FEELINGS, MOOD, { hunger: 0.2 });
    const full = { ...QUIET_CONTEXT, ...context };
    for (let time = 0; time < 120; time += DT) feelings.step(DT, full);
    return feelings.values.comfort;
  }

  it('is less comfortable in the open by day and more at dusk', () => {
    const none = settledComfort({ dayPhase: null });
    expect(settledComfort({ dayPhase: 'day' })).toBeCloseTo(none + DAY.effects.dayOpenComfort, 2);
    expect(settledComfort({ dayPhase: 'day', nearCover: true })).toBeGreaterThan(none);
    expect(settledComfort({ dayPhase: 'dusk' })).toBeCloseTo(none + DAY.effects.duskComfort, 2);
    expect(settledComfort({ dayPhase: 'night' })).toBeCloseTo(none, 2);
  });
});

describe('what the time of day does to the threats', () => {
  const player: ThreatPlayer = {
    x: 1000,
    y: 1400,
    vx: 0,
    vy: 0,
    mode: 'rest',
    hidden: false,
    underCover: false,
    darted: false,
    soft: false,
    coverGap: 2,
  };
  const world = {
    covers: [{ x: 1000, y: 1000, r: 150 }],
    obstacles: [],
    bounds: { x: 0, y: 0, w: 6000, h: 4000 },
    bl: 100,
  };

  function meanWait(factor: number): number {
    let sum = 0;
    const runs = 200;
    for (let seed = 1; seed <= runs; seed++) {
      const threat = new ThreatDirector(THREAT, BIRD, world, seededRandom(seed), {
        gentle: false,
        kinds: ['bird'],
      });
      threat.ambientFactor = factor;
      let time = 0;
      while (threat.stage === 'idle' && time < 20000) {
        time += 1;
        threat.step(1, player);
      }
      sum += time - THREAT.gap;
    }
    return sum / runs;
  }

  it('makes an ambient threat half as likely at night and twice as likely at dawn', () => {
    const usual = meanWait(1);
    expect(meanWait(DAY.effects.nightThreats)).toBeGreaterThan(usual * 1.5);
    expect(meanWait(DAY.effects.dawnThreats)).toBeLessThan(usual * 0.7);
  });
});

describe('the story of chapter 2', () => {
  it('counts hiding at dusk, or resting until it, as burrowing through a day', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'dusk', hidden: false })).toEqual([]);
    expect(story.hear({ kind: 'dusk', hidden: true })).toEqual(['s2.burrow']);
    expect(new Story(STORY_STEPS).hear({ kind: 'rest' })).toEqual(['s2.burrow']);
  });

  it('counts a whole graze at dusk with two of the shoal close', () => {
    const story = new Story(STORY_STEPS, new Set(['s1.fill']));
    const meal = { kind: 'eaten', food: 'sandFilm' } as const;
    expect(story.hear({ ...meal, phase: 'day', whole: true, shoal: 3 })).toEqual([]);
    expect(story.hear({ ...meal, phase: 'dusk', whole: false, shoal: 3 })).toEqual([]);
    expect(story.hear({ ...meal, phase: 'dusk', whole: true, shoal: 1 })).toEqual([]);
    expect(story.hear({ ...meal, phase: 'dusk', whole: true, shoal: 2 })).toEqual(['s2.dusk']);
  });

  it('counts a bond of 0.5 as a companion made', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'bond', value: 0.49 })).toEqual([]);
    expect(story.hear({ kind: 'bond', value: 0.5 })).toEqual(['s2.bond']);
    expect(story.current(2)).toBe('s2.burrow');
  });

  it('counts the fish and the molt only in the lagoon', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'molt', area: 'mangrove' })).toEqual(['s1.molt']);
    expect(story.hear({ kind: 'molt', area: 'lagoon' })).toEqual(['s2.molt']);
    const fish = { kind: 'threat', threat: 'fish', stage: 'release', area: 'lagoon' } as const;
    expect(story.hear(fish)).toEqual(['s2.fish']);
  });
});
