import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SOUND_NAMES } from '../../src/core/audio/sounds';
import { AREA_SOUND, SOUND_FILES } from '../../src/data/sounds';

/**
 * The sound files and the list in `src/data/sounds.ts` agree, both ways: a
 * listed file is there in both encodings, and a file there is listed and
 * credited (doc 05, "Files" and "Credits process").
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const folder = join(root, 'public/assets/audio');
const there = existsSync(folder) ? readdirSync(folder) : [];

describe('the sound files', () => {
  it('each file listed is there as .ogg and .m4a', () => {
    const missing: string[] = [];
    for (const file of Object.values(SOUND_FILES)) {
      for (const ending of ['ogg', 'm4a']) {
        if (!there.includes(`${file}.${ending}`)) missing.push(`${file}.${ending}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('each file there is listed, so the game asks for it', () => {
    const listed = new Set(Object.values(SOUND_FILES));
    const stray = there.filter((name) => !listed.has(name.replace(/\.(ogg|m4a)$/, '')));
    expect(stray).toEqual([]);
  });

  it('each file there has its row in CREDITS.md', () => {
    const credits = readFileSync(join(root, 'CREDITS.md'), 'utf8');
    expect(there.filter((name) => !credits.includes(name))).toEqual([]);
  });

  it('lists only names the game asks for', () => {
    const names = new Set<string>(SOUND_NAMES);
    expect(Object.keys(SOUND_FILES).filter((name) => !names.has(name))).toEqual([]);
    for (const { music, ambience } of Object.values(AREA_SOUND)) {
      if (music) expect(names.has(music)).toBe(true);
      if (ambience) expect(names.has(ambience)).toBe(true);
    }
  });
});
