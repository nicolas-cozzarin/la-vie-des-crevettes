import { describe, expect, it } from 'vitest';
import { NarrationQueue, type NarrationLine } from '../../src/core/narration/NarrationQueue';
import { Story } from '../../src/core/progress/Story';
import { NARRATION_LINES, STORY_STEPS } from '../../src/data/story';
import { NARRATION } from '../../src/data/tuning';
import en from '../../src/locales/en.json';

const LINES: Record<string, NarrationLine> = {
  must: { must: true },
  must2: { must: true },
  plain: {},
  plain2: {},
  again: { must: true, each: true, every: 40 },
  often: { each: true },
};

/** Every line is 10 letters: 0.6 + 4 + 0.6 + 0.8 = 6 s on screen. */
const queue = () => new NarrationQueue(LINES, NARRATION, () => 10);

function run(narration: NarrationQueue, seconds: number): void {
  for (let t = 0; t < seconds - 1e-9; t += 0.1) narration.step(0.1);
}

describe('narration', () => {
  it('shows a line for 4 s plus 0.06 s a letter, with its fades', () => {
    const narration = queue();
    expect(narration.lengthOf('plain')).toBeCloseTo(6);
    narration.say('plain');
    run(narration, 0.3);
    expect(narration.current?.alpha).toBeCloseTo(0.5);
    run(narration, 2);
    expect(narration.current).toEqual({ key: 'plain', alpha: 1 });
    run(narration, 4);
    expect(narration.current).toBeNull();
  });

  it('shows one line at a time: a must line waits its turn', () => {
    const narration = queue();
    narration.say('plain');
    expect(narration.say('must')).toBe(true);
    expect(narration.current?.key).toBe('plain');
    run(narration, 6.05);
    expect(narration.current?.key).toBe('must');
  });

  it('drops any other line within 20 s of the last, and lets it try again later', () => {
    const narration = queue();
    narration.say('must');
    run(narration, 7);
    expect(narration.say('plain')).toBe(false);
    run(narration, 14);
    expect(narration.say('plain')).toBe(true);
  });

  it('drops a line while a must line waits', () => {
    const narration = queue();
    narration.say('must');
    narration.say('must2');
    run(narration, 30);
    expect(narration.say('plain')).toBe(true);
    const busy = queue();
    busy.say('must');
    busy.say('must2');
    expect(busy.say('plain')).toBe(false);
  });

  it('shows a line once in a life, unless it shows each time', () => {
    const narration = queue();
    narration.say('must');
    run(narration, 30);
    expect(narration.say('must')).toBe(false);
    narration.say('often');
    run(narration, 30);
    expect(narration.say('often')).toBe(true);
  });

  it('keeps a line that shows each time to its own spacing', () => {
    const narration = queue();
    narration.say('again');
    run(narration, 30);
    expect(narration.say('again')).toBe(false);
    run(narration, 10);
    expect(narration.say('again')).toBe(true);
  });

  it('remembers what was shown in an earlier part of the life', () => {
    const narration = new NarrationQueue(LINES, NARRATION, () => 10, new Set(['must']));
    expect(narration.say('must')).toBe(false);
  });

  it('knows nothing of a line it was not given', () => {
    expect(queue().say('narr.unknown')).toBe(false);
  });

  it('has a text for every line in the game', () => {
    const texts: Record<string, string> = en;
    for (const key of Object.keys(NARRATION_LINES)) expect(texts, key).toHaveProperty([key]);
  });
});

describe('story', () => {
  it('is done with the motes after five', () => {
    const story = new Story(STORY_STEPS);
    for (let bite = 0; bite < 4; bite++) {
      expect(story.hear({ kind: 'eaten', food: 'microalgae' })).toEqual([]);
    }
    expect(story.hear({ kind: 'eaten', food: 'microalgae' })).toEqual(['s0.motes']);
    expect(story.hear({ kind: 'eaten', food: 'microalgae' })).toEqual([]);
  });

  it('prompts the first step of a chapter that is not done', () => {
    const story = new Story(STORY_STEPS);
    expect(story.current(0)).toBe('s0.motes');
    expect(story.current(1)).toBe('s1.fill');
  });

  it('does a later step even while an earlier one is open', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'zone', area: 'drift', zone: 'D' })).toEqual(['s0.brown']);
    expect(story.current(0)).toBe('s0.motes');
    expect(story.hear({ kind: 'greeting' })).toEqual(['s1.greet']);
    expect(story.current(1)).toBe('s1.fill');
  });

  it('is full at a hunger of 0.15, and has used Sense after 1.5 s', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'hunger', value: 0.2 })).toEqual([]);
    expect(story.hear({ kind: 'hunger', value: 0.15 })).toEqual(['s1.fill']);
    expect(story.hear({ kind: 'sense', seconds: 1 })).toEqual([]);
    expect(story.hear({ kind: 'sense', seconds: 1.6 })).toEqual(['s1.sense']);
  });

  it('is away from the bird when its visit reaches release, however it went', () => {
    const story = new Story(STORY_STEPS);
    expect(
      story.hear({ kind: 'threat', threat: 'bird', stage: 'chase', area: 'mangrove' }),
    ).toEqual([]);
    expect(
      story.hear({ kind: 'threat', threat: 'bird', stage: 'release', area: 'mangrove' }),
    ).toEqual(['s1.bird']);
  });

  it('molts in the mangrove, and the zone must be in the right place', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'zone', area: 'mangrove', zone: 'D' })).toEqual([]);
    // A molt in the lagoon is chapter 2's, and never the mangrove's.
    expect(story.hear({ kind: 'molt', area: 'lagoon' })).toEqual(['s2.molt']);
    expect(story.has('s1.molt')).toBe(false);
    expect(story.hear({ kind: 'molt', area: 'mangrove' })).toEqual(['s1.molt']);
    expect(story.has('s1.molt')).toBe(true);
    expect(story.current(1)).toBe('s1.fill');
  });

  it('follows the tide to the pool, and gets away from the fish twice in the channel (chapter 3)', () => {
    const story = new Story(STORY_STEPS);
    expect(story.hear({ kind: 'zone', area: 'channel', zone: 'C' })).toEqual([]);
    expect(story.hear({ kind: 'zone', area: 'channel', zone: 'D' })).toEqual(['s3.tide']);
    const away = { kind: 'threat', threat: 'fish', stage: 'release', area: 'channel' } as const;
    // The lagoon's fish is not the channel's.
    expect(story.hear({ ...away, area: 'lagoon' })).toEqual(['s2.fish']);
    expect(story.hear(away)).toEqual([]);
    expect(story.hear(away)).toEqual(['s3.fish2']);
    expect(story.current(3)).toBeNull();
  });

  it('remembers a fish that went before the save (T115)', () => {
    const story = new Story(STORY_STEPS, new Set(), { 'released.channel.fish': 1, tailFlips: 4 });
    expect(
      story.hear({ kind: 'threat', threat: 'fish', stage: 'release', area: 'channel' }),
    ).toEqual(['s3.fish2']);
  });

  it('gets out from under the net, then finds the shoal again, not before (chapter 4, T121)', () => {
    const story = new Story(STORY_STEPS);
    const three = { kind: 'shoal', area: 'shadow', near: 3 } as const;
    // The shoal close before the net counts for nothing.
    expect(story.hear(three)).toEqual([]);
    const passed = { kind: 'threat', threat: 'net', stage: 'release', area: 'shadow' } as const;
    expect(story.hear({ ...passed, stage: 'cornered' })).toEqual([]);
    expect(story.hear(passed)).toEqual(['s4.net']);
    expect(story.current(4)).toBe('s4.shoal');
    expect(story.hear({ ...three, near: 2 })).toEqual([]);
    // Three of them close somewhere else are not the shadow's.
    expect(story.hear({ ...three, area: 'channel' })).toEqual([]);
    expect(story.hear(three)).toEqual(['s4.shoal']);
    expect(story.current(4)).toBeNull();
  });

  it('molts the last time, goes down into the blue, and spawns only once full grown (chapter 5, T123)', () => {
    const story = new Story(STORY_STEPS);
    const still = { kind: 'still', area: 'openSea', zones: ['B', 'D'], seconds: 3 } as const;
    // Still in the gathering before the last molt: not yet.
    expect(story.hear(still)).toEqual([]);
    expect(story.hear({ kind: 'molt', area: 'openSea' })).toEqual(['s5.molt']);
    expect(story.current(5)).toBe('s5.blue');
    expect(story.hear({ kind: 'zone', area: 'openSea', zone: 'B' })).toEqual(['s5.blue']);
    // Still, but not for long enough, or not among the others.
    expect(story.hear({ ...still, seconds: 2.9 })).toEqual([]);
    expect(story.hear({ ...still, zones: ['B'] })).toEqual([]);
    expect(story.hear({ ...still, area: 'shadow' })).toEqual([]);
    expect(story.hear(still)).toEqual(['s5.spawn']);
    expect(story.current(5)).toBeNull();
  });

  it('starts from the steps an earlier part of the life finished', () => {
    const story = new Story(STORY_STEPS, new Set(['s0.motes', 's0.brown']));
    expect(story.current(0)).toBeNull();
  });
});
