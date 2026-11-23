import { describe, expect, it } from 'vitest';
import { CaptionLine } from '../../src/core/audio/captions';
import { ownLoops, RELIEF, stageCue, strikeCue } from '../../src/core/audio/cues';
import { QUIET_INPUT, SoundMix, type MixInput } from '../../src/core/audio/mix';
import { busOf } from '../../src/core/audio/sounds';
import { SOUND } from '../../src/data/tuning';
import en from '../../src/locales/en.json';
import fr from '../../src/locales/fr.json';

const DT = 1 / 60;
const M = SOUND.mix;

function run(mix: SoundMix, seconds: number, input: Partial<MixInput>) {
  const full = { ...QUIET_INPUT, ...input };
  for (let time = 0; time < seconds - 1e-9; time += DT) mix.step(DT, full);
  return mix.levels;
}

/** Within a share of the way from `from` to `to`. */
function near(value: number, to: number, from: number, share = 0.06): boolean {
  return Math.abs(value - to) <= Math.abs(to - from) * share;
}

describe('the music follows the shrimp', () => {
  it('starts calm: the area track as recorded, open, and nothing else', () => {
    const levels = new SoundMix(M).levels;
    expect(levels).toMatchObject({ area: 1, areaBright: M.bright.normal, uneasy: 0, chime: 0 });
    expect(levels.heard).toBe(1);
  });

  it('fear dulls the area track and brings the uneasy track up, over 1.5 s', () => {
    const mix = new SoundMix(M);
    const early = run(mix, 0.3, { mood: 'afraid' });
    expect(early.areaBright).toBeGreaterThan(2000);
    expect(early.uneasy).toBeLessThan(M.uneasy.afraid * 0.6);
    const levels = run(mix, 1.2, { mood: 'afraid' });
    expect(near(levels.area, M.area.afraid, 1)).toBe(true);
    expect(levels.areaBright).toBeLessThan(M.bright.afraid * 1.25);
    expect(near(levels.uneasy, M.uneasy.afraid, 0)).toBe(true);
  });

  it('after the threat, the uneasy track falls to its wary level over 4 s and the area track opens', () => {
    const mix = new SoundMix(M);
    run(mix, 3, { mood: 'afraid' });
    const wary = { mood: 'calm' as const, wary: true };
    const halfway = run(mix, 1, { ...wary, waryLeft: 20 });
    // Still on its way after one second: relief is slow.
    expect(halfway.areaBright).toBeLessThan(M.bright.normal / 2);
    expect(halfway.uneasy).toBeGreaterThan(M.uneasy.wary * 1.5);
    let left = 19;
    for (let time = 0; time < 3; time += DT) {
      left -= DT;
      mix.step(DT, { ...QUIET_INPUT, ...wary, waryLeft: left });
    }
    const opened = mix.levels;
    expect(opened.areaBright).toBeGreaterThan(M.bright.normal * 0.8);
    expect(opened.area).toBeGreaterThan(0.95);
    expect(opened.uneasy).toBeLessThan(M.uneasy.wary * 1.1);
    expect(opened.uneasy).toBeGreaterThan(M.uneasy.wary * 0.6);
  });

  it('the uneasy track fades out over the wary time, and is gone when it ends', () => {
    const mix = new SoundMix(M);
    run(mix, 3, { mood: 'afraid' });
    let left = 20;
    const levels: number[] = [];
    while (left > 0) {
      mix.step(DT, { ...QUIET_INPUT, wary: true, waryLeft: left });
      left -= DT;
      levels.push(mix.levels.uneasy);
    }
    const at10 = levels[Math.round(10 / DT)] ?? 1;
    expect(at10).toBeLessThan(M.uneasy.wary * 0.6);
    expect(at10).toBeGreaterThan(M.uneasy.wary * 0.4);
    run(mix, 2, {});
    expect(mix.levels.uneasy).toBeLessThan(0.01);
  });

  it('content lifts the track a little and brightens it; hungry drops it a little', () => {
    const content = run(new SoundMix(M), 2, { mood: 'content' });
    expect(content.area).toBeGreaterThan(1.05);
    expect(content.areaBright).toBeGreaterThan(M.bright.normal * 1.4);
    const hungry = run(new SoundMix(M), 2, { mood: 'hungry' });
    expect(hungry.area).toBeLessThan(0.9);
    expect(hungry.area).toBeGreaterThan(0.6);
  });

  it('a chime joins in company and a shimmer while curious, one at a time', () => {
    const social = run(new SoundMix(M), 3, { mood: 'social' });
    expect(near(social.chime, M.chime, 0)).toBe(true);
    expect(social.shimmer).toBe(0);
    const curious = run(new SoundMix(M), 3, { mood: 'curious' });
    expect(near(curious.shimmer, M.shimmer, 0)).toBe(true);
    expect(curious.chime).toBe(0);
  });

  it('hidden under cover muffles the music and the ambience', () => {
    const levels = run(new SoundMix(M), 1, { hidden: true });
    expect(levels.muffle).toBeLessThan(M.hidden * 1.3);
    const out = run(new SoundMix(M), 1, {});
    expect(out.muffle).toBeCloseTo(M.open);
  });

  it('frozen stops the shrimp’s own sounds and brings the ambience forward; soft lowers and dulls them', () => {
    const frozen = run(new SoundMix(M), 1, { frozen: true });
    expect(frozen.own).toBeLessThan(0.05);
    expect(frozen.ambience).toBeGreaterThan(1.3);
    const soft = run(new SoundMix(M), 1, { soft: true });
    expect(near(soft.own, M.soft.level, 1)).toBe(true);
    expect(soft.ownBright).toBeLessThan(M.soft.bright * 1.3);
  });

  it('being cornered takes the sound with the dark, and gives it back slowly', () => {
    const mix = new SoundMix(M);
    expect(run(mix, DT, { mood: 'afraid', dark: 1 }).heard).toBe(0);
    const soon = run(mix, 1, { mood: 'afraid', dark: 0 });
    expect(soon.heard).toBeLessThan(0.75);
    expect(soon.heard).toBeGreaterThan(0);
    expect(run(mix, 3, { mood: 'afraid', dark: 0 }).heard).toBeGreaterThan(0.95);
  });

  it('never changes in under half a second', () => {
    for (const input of [
      { mood: 'content' as const },
      { mood: 'hungry' as const },
      { mood: 'social' as const },
      { hidden: true },
    ]) {
      const mix = new SoundMix(M);
      const before = { ...mix.levels };
      const target = mix.target({ ...QUIET_INPUT, ...input });
      const after = run(mix, 0.1, input);
      for (const key of ['area', 'chime'] as const) {
        if (target[key] === before[key]) continue;
        expect(near(after[key], target[key], before[key], 0.5), `${key} after 0.1 s`).toBe(false);
      }
      // Filters move by octaves.
      const log = Math.log2;
      if (target.muffle !== before.muffle) {
        expect(near(log(after.muffle), log(target.muffle), log(before.muffle), 0.5)).toBe(false);
      }
    }
  });
});

describe('what is heard, and what is captioned', () => {
  it('the bird: a low swell and its shadow, then it steps in, then a splash, then the water settles', () => {
    expect(stageCue('bird', 'cue')).toEqual({ sound: 'threatCue', caption: 'caption.shadow' });
    expect(stageCue('bird', 'presence')).toEqual({ sound: null, caption: 'caption.step' });
    expect(stageCue('bird', 'chase')).toBeNull();
    expect(strikeCue('bird')).toEqual({ sound: 'splash', caption: 'caption.strike' });
    expect(RELIEF).toEqual({ sound: 'relief', caption: 'caption.relief' });
    expect(strikeCue('fish')).toEqual({ sound: 'rush', caption: 'caption.rush' });
  });

  it('every caption is written in both languages', () => {
    const english: Record<string, string> = en;
    const french: Record<string, string> = fr;
    const keys = ['caption.shadow', 'caption.step', 'caption.strike', 'caption.rush'];
    for (const key of [...keys, 'caption.relief', 'caption.alarm']) {
      expect(english[key], key).toMatch(/^\[.+\]$/);
      expect(french[key], key).toMatch(/^\[.+\]$/);
    }
  });

  it('the shrimp’s own lasting sounds follow what it does', () => {
    const walk = 165;
    expect(ownLoops({ mode: 'walk', speed: walk / 2, activity: 'free' }, walk)).toEqual({
      walk: 0.5,
      swim: 0,
      graze: 0,
      sense: 0,
    });
    expect(ownLoops({ mode: 'swim', speed: walk * 2, activity: 'free' }, walk).swim).toBe(1);
    expect(ownLoops({ mode: 'walk', speed: 10, activity: 'grazing' }, walk)).toMatchObject({
      walk: 0,
      graze: 1,
    });
    expect(ownLoops({ mode: 'rest', speed: 0, activity: 'sensing' }, walk).sense).toBe(1);
    expect(ownLoops({ mode: 'rest', speed: 0, activity: 'free' }, walk)).toEqual({
      walk: 0,
      swim: 0,
      graze: 0,
      sense: 0,
    });
  });

  it('a caption holds as long as its sound, at least 2 s, and a new one takes its place', () => {
    const line = new CaptionLine(SOUND.caption);
    line.show({ key: 'caption.shadow', params: {} }, null);
    const { fade, least } = SOUND.caption;
    let shown = 0;
    while (line.step(DT).caption) shown += DT;
    expect(shown).toBeGreaterThan(least + 2 * fade - 2 * DT);
    expect(shown).toBeLessThan(least + 2 * fade + 2 * DT);

    line.show({ key: 'caption.shadow', params: {} }, 5);
    shown = 0;
    while (line.step(DT).caption) shown += DT;
    expect(shown).toBeGreaterThan(5);

    line.show({ key: 'caption.shadow', params: {} }, null);
    line.step(0.5);
    line.show({ key: 'caption.alarm', params: { name: 'Nacre' } }, null);
    expect(line.showing?.key).toBe('caption.alarm');
    expect(line.step(DT).alpha).toBeLessThan(0.2);
  });

  it('each sound has its slider', () => {
    expect(busOf('music.uneasy')).toBe('music');
    expect(busOf('layer.chime')).toBe('music');
    expect(busOf('amb.mangrove')).toBe('ambience');
    expect(busOf('bell')).toBe('effects');
    expect(busOf('walk')).toBe('effects');
  });
});
