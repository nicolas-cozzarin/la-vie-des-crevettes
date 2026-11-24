import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CREDITS_SHOWN } from '../../src/data/credits';

/** The About page credits the same files as `CREDITS.md` (doc 05, "Licences": CC BY needs both). */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const credits = readFileSync(join(root, 'CREDITS.md'), 'utf8');
const assets = credits.split('## Third-party assets')[1]?.split('## Software')[0] ?? '';

/** The file named in each filled row of the asset tables. */
const filesCredited = assets
  .split('\n')
  .filter((line) => line.startsWith('|') && !line.startsWith('|--') && !line.startsWith('| File'))
  .map((line) => line.split('|')[1]?.trim() ?? '')
  .filter((file) => file !== '');

describe('the credits', () => {
  it('shows on the About page every file that CREDITS.md credits, and no other', () => {
    expect(CREDITS_SHOWN.map((row) => row.file).sort()).toEqual([...filesCredited].sort());
  });
});
