import type { AmbienceName, MusicName, SoundName } from '../core/audio/sounds';
import type { AreaId } from '../core/world/kinds';

/**
 * The sound files the game has, by the name the code asks for. Each value is
 * the file's name under `public/assets/audio/`, without its ending: both an
 * `.ogg` and an `.m4a` must be there (doc 05, "Files"), and both need a row
 * in `CREDITS.md`. A name not listed here plays nothing and asks for no file.
 */
export const SOUND_FILES: Partial<Record<SoundName, string>> = {};

/** Each area's calm track and ambience bed (doc 05, "Ambience"). Null: none yet. */
export const AREA_SOUND: Record<
  AreaId,
  { music: MusicName | null; ambience: AmbienceName | null }
> = {
  drift: { music: 'music.drift', ambience: 'amb.drift' },
  mangrove: { music: 'music.mangrove', ambience: 'amb.mangrove' },
  lagoon: { music: null, ambience: null },
  channel: { music: null, ambience: null },
  shadow: { music: null, ambience: null },
  openSea: { music: null, ambience: null },
};
