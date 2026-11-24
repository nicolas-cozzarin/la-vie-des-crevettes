import { LANGS } from '../i18n';
import type { SettingsV1 } from './settings';

/**
 * The rows of the settings screen and what Left, Right and Enter do to each
 * (doc 03, "Settings"). Nothing here knows about the engine: a change is a
 * patch for the app to apply and keep.
 */

export type SettingGroup = 'language' | 'controls' | 'sound' | 'comfort' | 'data';

export type SettingId =
  | 'lang'
  | 'controls'
  | 'senseMode'
  | 'hideMode'
  | 'master'
  | 'music'
  | 'ambience'
  | 'effects'
  | 'captions'
  | 'gentleMode'
  | 'reducedMotion'
  | 'textScale'
  | 'nameFeelings'
  | 'startOver';

export type SettingKind = 'choice' | 'level' | 'toggle' | 'open' | 'action';

export interface SettingRow {
  id: SettingId;
  group: SettingGroup;
  kind: SettingKind;
}

export const SETTING_ROWS: readonly SettingRow[] = [
  { id: 'lang', group: 'language', kind: 'choice' },
  { id: 'controls', group: 'controls', kind: 'open' },
  { id: 'senseMode', group: 'controls', kind: 'choice' },
  { id: 'hideMode', group: 'controls', kind: 'choice' },
  { id: 'master', group: 'sound', kind: 'level' },
  { id: 'music', group: 'sound', kind: 'level' },
  { id: 'ambience', group: 'sound', kind: 'level' },
  { id: 'effects', group: 'sound', kind: 'level' },
  { id: 'captions', group: 'sound', kind: 'toggle' },
  { id: 'gentleMode', group: 'comfort', kind: 'toggle' },
  { id: 'reducedMotion', group: 'comfort', kind: 'toggle' },
  { id: 'textScale', group: 'comfort', kind: 'choice' },
  { id: 'nameFeelings', group: 'comfort', kind: 'toggle' },
  { id: 'startOver', group: 'data', kind: 'action' },
];

/** A volume moves by a tenth, from 0 to 100 as shown. */
const LEVEL_STEP = 0.1;
const TEXT_SCALES = [1, 1.25, 1.5] as const;

function cycle<T>(list: readonly T[], now: T, dir: 1 | -1): T {
  const at = Math.max(0, list.indexOf(now));
  return list[(at + dir + list.length) % list.length] ?? now;
}

/**
 * What pressing Left (-1) or Right (1) on a row changes. Enter on a choice or
 * a toggle counts as Right. Null for a row that opens or acts instead.
 */
export function changeSetting(
  settings: Readonly<SettingsV1>,
  id: SettingId,
  dir: 1 | -1,
): Partial<SettingsV1> | null {
  switch (id) {
    case 'lang':
      return { lang: cycle(LANGS, settings.lang, dir) };
    case 'senseMode':
      return { senseMode: settings.senseMode === 'hold' ? 'toggle' : 'hold' };
    case 'hideMode':
      return { hideMode: settings.hideMode === 'hold' ? 'toggle' : 'hold' };
    case 'master':
    case 'music':
    case 'ambience':
    case 'effects': {
      const next = Math.round((settings.volume[id] + dir * LEVEL_STEP) * 10) / 10;
      return { volume: { ...settings.volume, [id]: Math.min(1, Math.max(0, next)) } };
    }
    case 'captions':
    case 'gentleMode':
    case 'reducedMotion':
    case 'nameFeelings':
      return { [id]: !settings[id] };
    case 'textScale':
      return { textScale: cycle(TEXT_SCALES, settings.textScale, dir) };
    case 'controls':
    case 'startOver':
      return null;
  }
}

/** A volume as the screen shows it: 0 to 100. */
export function levelShown(level: number): number {
  return Math.round(level * 100);
}
