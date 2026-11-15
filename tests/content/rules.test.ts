import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FOOD_KINDS } from '../../src/core/world/kinds';
import en from '../../src/locales/en.json';

/**
 * The rules in CLAUDE.md that never bend, and the code rules, checked over
 * the whole repository. A failure here means the change breaks a rule, not
 * that the test is wrong. See docs/19-changing-things-safely.md.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const skipped = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report']);

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    if (skipped.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(relative(root, path).replaceAll('\\', '/'));
  }
  return files;
}

const files = walk(root);
const textFiles = files.filter(
  (path) =>
    /\.(ts|js|cjs|mjs|json|md|html|css|yml|yaml|txt)$/.test(path) &&
    !path.endsWith('package-lock.json'),
);
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sources = (folder: string) =>
  files.filter((path) => path.startsWith(folder) && path.endsWith('.ts'));

describe('rules that never bend', () => {
  it('rule 1: the foods are the six plant foods, and only those', () => {
    // Adding a food needs the author's yes and a row in docs/09-decisions.md first.
    expect([...FOOD_KINDS]).toEqual([
      'microalgae',
      'algaeFilm',
      'mangroveLeaf',
      'seagrassFuzz',
      'sandFilm',
      'seaweed',
    ]);
  });

  it('names no organisation the author asked to keep out', () => {
    // Kept as hashes so that this test does not write the names itself.
    // Each is the first 16 hex digits of the SHA-256 of the words in lower
    // case, without accents, joined by single spaces.
    const banned = new Map([
      ['1dc3bbfc5e1aa702', 1],
      ['01576aa7e4055d41', 3],
      ['e4a6a2f280313ddd', 1],
    ]);
    const lengths = new Set(banned.values());
    const hash = (words: string) => createHash('sha256').update(words).digest('hex').slice(0, 16);
    const found: string[] = [];
    for (const path of textFiles) {
      const words = read(path)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      for (const length of lengths) {
        for (let at = 0; at + length <= words.length; at++) {
          if (banned.has(hash(words.slice(at, at + length).join(' ')))) found.push(path);
        }
      }
    }
    expect([...new Set(found)], 'files that name a banned organisation').toEqual([]);
  });

  it('rule 6: every file under public/ is credited', () => {
    const credits = read('CREDITS.md');
    const missing = files
      .filter((path) => path.startsWith('public/'))
      .map((path) => path.split('/').pop() ?? path)
      .filter((name) => !credits.includes(name));
    expect(missing, 'files with no row in CREDITS.md').toEqual([]);
  });
});

describe('code rules', () => {
  it('pictures and rules repeat exactly: no Math.random', () => {
    const wrong = [
      ...sources('src/core/'),
      ...sources('src/art/'),
      ...sources('src/atelier/'),
    ].filter((path) => read(path).includes('Math.random'));
    expect(wrong, 'use seededRandom from src/core/random.ts').toEqual([]);
  });

  it('only src/platform touches the keyboard and the storage', () => {
    const touches =
      /localStorage|sessionStorage|indexedDB|addEventListener\(\s*['"]key|input\.keyboard/;
    const wrong = sources('src/')
      .filter((path) => !path.startsWith('src/platform/'))
      .filter((path) => touches.test(read(path)));
    expect(wrong).toEqual([]);
  });

  it('no asset path starts with a slash', () => {
    const rooted = /['"`]\/(?:assets|images|audio|music|sounds|fonts)\//;
    const wrong = [...sources('src/'), 'index.html', 'atelier.html'].filter((path) =>
      rooted.test(read(path)),
    );
    expect(wrong, 'the game is served from a sub-path').toEqual([]);
  });

  it('every text key the code asks for exists', () => {
    const english: Record<string, string> = en;
    const missing: string[] = [];
    for (const path of sources('src/')) {
      for (const match of read(path).matchAll(/\bt\(\s*'([^'$]+)'/g)) {
        const key = match[1] ?? '';
        if (!(key in english)) missing.push(`${path}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('painters never import the engine', () => {
    const wrong = [
      ...sources('src/art/painters/'),
      ...sources('src/atelier/'),
      'src/art/paint.ts',
      'src/art/fit.ts',
      'src/art/shrimpParts.ts',
      'src/art/expressions.ts',
    ].filter((path) => /from 'phaser'/.test(read(path)));
    expect(wrong).toEqual([]);
  });
});
