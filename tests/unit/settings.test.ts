import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, rebind } from '../../src/core/input/bindings';
import {
  SETTINGS_KEY,
  defaultSettings,
  loadSettings,
  parseSettings,
  saveSettings,
} from '../../src/core/save/settings';
import { MemoryStore, type KeyValueStore } from '../../src/core/save/store';

const defaults = { lang: 'fr', reducedMotion: false } as const;

describe('settings', () => {
  it('start from the documented defaults', () => {
    const settings = defaultSettings(defaults);
    expect(settings.v).toBe(1);
    expect(settings.lang).toBe('fr');
    expect(settings.bindings).toEqual(DEFAULT_BINDINGS);
    expect(settings.senseMode).toBe('hold');
    expect(settings.hideMode).toBe('hold');
    expect(settings.volume).toEqual({ master: 0.8, music: 0.7, ambience: 0.8, effects: 0.8 });
    expect(settings.gentleMode).toBe(false);
    expect(settings.textScale).toBe(1);
  });

  it('take reduced motion from the browser', () => {
    expect(defaultSettings({ lang: 'en', reducedMotion: true }).reducedMotion).toBe(true);
  });

  it('are the defaults when nothing is stored', () => {
    expect(loadSettings(new MemoryStore(), defaults)).toEqual(defaultSettings(defaults));
  });

  it('survive a save and a load', () => {
    const store = new MemoryStore();
    const result = rebind(DEFAULT_BINDINGS, 'tailFlip', 0, 'KeyG');
    if (!result.ok) throw new Error('rebind failed');
    const settings = {
      ...defaultSettings(defaults),
      lang: 'en' as const,
      bindings: result.bindings,
      hideMode: 'toggle' as const,
      keyLabels: { KeyW: 'z' },
    };
    expect(saveSettings(store, settings)).toBe(true);
    expect(store.getItem(SETTINGS_KEY)).not.toBeNull();
    expect(loadSettings(store, defaults)).toEqual(settings);
  });

  it('fall back to the defaults when the stored text is damaged', () => {
    expect(parseSettings('{not json', defaults)).toEqual(defaultSettings(defaults));
    expect(parseSettings('[1,2]', defaults)).toEqual(defaultSettings(defaults));
    expect(parseSettings('{"v":99}', defaults)).toEqual(defaultSettings(defaults));
  });

  it('repair single values that are wrong and keep the rest', () => {
    const stored = JSON.stringify({
      v: 1,
      lang: 'de',
      bindings: { tailFlip: ['KeyG', null] },
      senseMode: 'sometimes',
      volume: { master: 7, music: 'loud', ambience: -1 },
      textScale: 3,
      gentleMode: true,
      keyLabels: { KeyW: 'z', KeyQ: 12, KeyE: 'far too long' },
    });
    const settings = parseSettings(stored, defaults);
    expect(settings.lang).toBe('fr');
    expect(settings.bindings.tailFlip).toEqual(['KeyG', null]);
    expect(settings.bindings.moveUp).toEqual(['KeyW', 'ArrowUp']);
    expect(settings.senseMode).toBe('hold');
    expect(settings.volume).toEqual({ master: 1, music: 0.7, ambience: 0, effects: 0.8 });
    expect(settings.textScale).toBe(1);
    expect(settings.gentleMode).toBe(true);
    expect(settings.keyLabels).toEqual({ KeyW: 'z' });
  });

  it('report when the browser refuses to store them', () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => false,
      removeItem: () => undefined,
    };
    expect(saveSettings(full, defaultSettings(defaults))).toBe(false);
  });
});
