import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../src/core/save/settings';
import { SETTING_ROWS, changeSetting, levelShown } from '../../src/core/save/settingsMenu';

const base = defaultSettings({ lang: 'fr', reducedMotion: false });

describe('the settings screen', () => {
  it('has doc 03’s groups, in its order', () => {
    const groups = [...new Set(SETTING_ROWS.map((row) => row.group))];
    expect(groups).toEqual(['language', 'controls', 'sound', 'comfort', 'data']);
    expect(SETTING_ROWS.map((row) => row.id)).toContain('startOver');
  });

  it('turns the language round', () => {
    expect(changeSetting(base, 'lang', 1)).toEqual({ lang: 'en' });
    expect(changeSetting({ ...base, lang: 'en' }, 'lang', 1)).toEqual({ lang: 'fr' });
  });

  it('moves a volume by ten, from 0 to 100, and stops at the ends', () => {
    expect(levelShown(base.volume.music)).toBe(70);
    const louder = changeSetting(base, 'music', 1);
    expect(louder?.volume).toEqual({ ...base.volume, music: 0.8 });
    const full = { ...base, volume: { ...base.volume, master: 1 } };
    expect(changeSetting(full, 'master', 1)?.volume?.master).toBe(1);
    const none = { ...base, volume: { ...base.volume, effects: 0 } };
    expect(changeSetting(none, 'effects', -1)?.volume?.effects).toBe(0);
    // Ten steps down from 80 land on 0 exactly, not on a tiny remainder.
    let settings = { ...base };
    for (let step = 0; step < 8; step++) {
      settings = { ...settings, ...changeSetting(settings, 'ambience', -1) };
    }
    expect(settings.volume.ambience).toBe(0);
  });

  it('flips a toggle either way', () => {
    expect(changeSetting(base, 'captions', 1)).toEqual({ captions: true });
    expect(changeSetting(base, 'gentleMode', -1)).toEqual({ gentleMode: true });
    expect(changeSetting({ ...base, nameFeelings: true }, 'nameFeelings', 1)).toEqual({
      nameFeelings: false,
    });
  });

  it('switches Sense and Hide between hold and toggle', () => {
    expect(changeSetting(base, 'senseMode', 1)).toEqual({ senseMode: 'toggle' });
    expect(changeSetting({ ...base, hideMode: 'toggle' }, 'hideMode', -1)).toEqual({
      hideMode: 'hold',
    });
  });

  it('steps the text size through 100, 125 and 150 %, round', () => {
    expect(changeSetting(base, 'textScale', 1)).toEqual({ textScale: 1.25 });
    expect(changeSetting({ ...base, textScale: 1.5 }, 'textScale', 1)).toEqual({ textScale: 1 });
    expect(changeSetting(base, 'textScale', -1)).toEqual({ textScale: 1.5 });
  });

  it('changes nothing by itself for rows that open a screen or act', () => {
    expect(changeSetting(base, 'controls', 1)).toBeNull();
    expect(changeSetting(base, 'startOver', 1)).toBeNull();
  });
});
