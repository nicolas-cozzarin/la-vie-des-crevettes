/**
 * Every sound the game asks for, by name: doc 05, "Sounds for the first
 * release". A name with no file plays nothing (`src/data/sounds.ts` says
 * which names have one). Nothing here knows about the engine.
 */

/** Music: one calm track per area, the uneasy track shared by all, and two layers. */
export const MUSIC_NAMES = [
  'music.drift',
  'music.mangrove',
  'music.uneasy',
  /** Joins while social: a slow chime pattern. */
  'layer.chime',
  /** Joins while curious: a light high shimmer. */
  'layer.shimmer',
] as const;
export type MusicName = (typeof MUSIC_NAMES)[number];

/** One bed per area, looping under the music. */
export const AMBIENCE_NAMES = ['amb.drift', 'amb.mangrove'] as const;
export type AmbienceName = (typeof AMBIENCE_NAMES)[number];

/** The shrimp's own sounds that last as long as what it does. */
export const LOOP_NAMES = ['walk', 'swim', 'graze', 'sense'] as const;
export type LoopName = (typeof LOOP_NAMES)[number];

/** Sounds played once. */
export const EFFECT_NAMES = [
  'tailFlip',
  'warmNote',
  'greeting',
  'rustle',
  'moltCrack',
  'moltRelease',
  'bell',
  'threatCue',
  'splash',
  'rush',
  'relief',
  'startle',
  'menuTap',
  'menuPage',
] as const;
export type EffectName = (typeof EFFECT_NAMES)[number];

export type SoundName = MusicName | AmbienceName | LoopName | EffectName;

export const SOUND_NAMES: readonly SoundName[] = [
  ...MUSIC_NAMES,
  ...AMBIENCE_NAMES,
  ...LOOP_NAMES,
  ...EFFECT_NAMES,
];

/** Which bus a sound plays on, for its volume slider. */
export type SoundBus = 'music' | 'ambience' | 'effects';

export function busOf(name: SoundName): SoundBus {
  if ((MUSIC_NAMES as readonly string[]).includes(name)) return 'music';
  if ((AMBIENCE_NAMES as readonly string[]).includes(name)) return 'ambience';
  return 'effects';
}
