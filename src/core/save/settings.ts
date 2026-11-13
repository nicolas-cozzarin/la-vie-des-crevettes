import type { ActionMode } from '../input/ActionState';
import { DEFAULT_BINDINGS, sanitizeBindings, type Bindings } from '../input/bindings';
import { LANGS, type Lang } from '../i18n';
import type { KeyValueStore } from './store';

export const SETTINGS_KEY = 'lvdc.settings.v1';

export interface SettingsV1 {
  v: 1;
  lang: Lang;
  bindings: Bindings;
  senseMode: ActionMode;
  hideMode: ActionMode;
  volume: { master: number; music: number; ambience: number; effects: number };
  captions: boolean;
  gentleMode: boolean;
  reducedMotion: boolean;
  textScale: 1 | 1.25 | 1.5;
  nameFeelings: boolean;
  /** Letters seen for each key position, so labels match the player's keyboard. */
  keyLabels: Record<string, string>;
}

export interface SettingsDefaults {
  lang: Lang;
  reducedMotion: boolean;
}

export function defaultSettings(defaults: SettingsDefaults): SettingsV1 {
  return {
    v: 1,
    lang: defaults.lang,
    bindings: DEFAULT_BINDINGS,
    senseMode: 'hold',
    hideMode: 'hold',
    volume: { master: 0.8, music: 0.7, ambience: 0.8, effects: 0.8 },
    captions: false,
    gentleMode: false,
    reducedMotion: defaults.reducedMotion,
    textScale: 1,
    nameFeelings: false,
    keyLabels: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function level(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

function mode(value: unknown, fallback: ActionMode): ActionMode {
  return value === 'hold' || value === 'toggle' ? value : fallback;
}

/**
 * Read settings from stored text. Anything missing or malformed falls back to
 * its default, so a damaged or older save never stops the game.
 */
export function parseSettings(raw: string | null, defaults: SettingsDefaults): SettingsV1 {
  const base = defaultSettings(defaults);
  if (raw === null) return base;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!isRecord(data) || data.v !== 1) return base;

  const volume = isRecord(data.volume) ? data.volume : {};
  const labels: Record<string, string> = {};
  if (isRecord(data.keyLabels)) {
    for (const [code, label] of Object.entries(data.keyLabels)) {
      if (typeof label === 'string' && label.length > 0 && label.length <= 4) labels[code] = label;
    }
  }

  return {
    v: 1,
    lang: LANGS.find((lang) => lang === data.lang) ?? base.lang,
    bindings: sanitizeBindings(data.bindings),
    senseMode: mode(data.senseMode, base.senseMode),
    hideMode: mode(data.hideMode, base.hideMode),
    volume: {
      master: level(volume.master, base.volume.master),
      music: level(volume.music, base.volume.music),
      ambience: level(volume.ambience, base.volume.ambience),
      effects: level(volume.effects, base.volume.effects),
    },
    captions: bool(data.captions, base.captions),
    gentleMode: bool(data.gentleMode, base.gentleMode),
    reducedMotion: bool(data.reducedMotion, base.reducedMotion),
    textScale: data.textScale === 1.25 || data.textScale === 1.5 ? data.textScale : 1,
    nameFeelings: bool(data.nameFeelings, base.nameFeelings),
    keyLabels: labels,
  };
}

export function loadSettings(store: KeyValueStore, defaults: SettingsDefaults): SettingsV1 {
  return parseSettings(store.getItem(SETTINGS_KEY), defaults);
}

/** Returns false if the settings could not be stored. */
export function saveSettings(store: KeyValueStore, settings: SettingsV1): boolean {
  return store.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
