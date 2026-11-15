import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import en from '../../src/locales/en.json';
import fr from '../../src/locales/fr.json';

/**
 * The documents hold each other together by names: decision ids, source
 * keys, text keys, file links. A rename in one place that misses another
 * fails here. See docs/19-changing-things-safely.md.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const docNames = readdirSync(join(root, 'docs')).filter((name) => name.endsWith('.md'));
const pages: [string, string][] = [
  ...['README.md', 'CLAUDE.md', 'CREDITS.md'].map((path): [string, string] => [path, read(path)]),
  ...docNames.map((name): [string, string] => [`docs/${name}`, read(`docs/${name}`)]),
];

/** The first cell of every row of every table whose first column is `header`. */
function firstCells(text: string, header: string): string[] {
  const cells: string[] = [];
  let inTable = false;
  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) {
      inTable = false;
      continue;
    }
    const first = line.split('|')[1]?.trim() ?? '';
    if (first === header) inTable = true;
    else if (inTable && !first.startsWith('---')) cells.push(first.replaceAll('`', ''));
  }
  return cells;
}

describe('the documents', () => {
  it('are all listed in README.md and CLAUDE.md', () => {
    for (const listing of ['README.md', 'CLAUDE.md']) {
      const text = read(listing);
      const missing = docNames.filter((name) => !text.includes(`docs/${name}`));
      expect(missing, `not listed in ${listing}`).toEqual([]);
    }
  });

  it('link only to files that exist', () => {
    const broken: string[] = [];
    for (const [path, text] of pages) {
      for (const match of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
        const target = match[1] ?? '';
        if (/^[a-z]+:/.test(target)) continue;
        if (!existsSync(resolve(root, dirname(path), target))) broken.push(`${path}: ${target}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('cite only decisions that doc 09 has', () => {
    const decided = new Set(firstCells(read('docs/09-decisions.md'), '#'));
    expect(decided.size).toBeGreaterThan(80);
    const unknown: string[] = [];
    for (const [path, text] of pages) {
      for (const match of text.matchAll(/\b([DT]\d{1,3}[a-z]?)\b/g)) {
        const id = match[1] ?? '';
        if (!decided.has(id)) unknown.push(`${path}: ${id}`);
      }
    }
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('cite only sources that a source table defines', () => {
    const defined = new Set([
      ...firstCells(read('docs/07-science-and-message.md'), 'Key'),
      ...firstCells(read('docs/18-learning-by-playing.md'), 'Key'),
    ]);
    const unknown: string[] = [];
    for (const [path, text] of pages) {
      for (const match of text.matchAll(/\b([A-Z]{2,}\d{4})\b/g)) {
        const key = match[1] ?? '';
        if (!defined.has(key)) unknown.push(`${path}: ${key}`);
      }
    }
    expect([...new Set(unknown)]).toEqual([]);
  });
});

describe('the script in doc 13', () => {
  const script = read('docs/13-script.md');
  const rows = new Map<string, [string, string]>();
  for (const line of script.split('\n')) {
    const match = /^\| `([^`]+)` \| (.*?) \| (.*?) \|/.exec(line);
    if (match?.[1] && match[2] !== undefined && match[3] !== undefined) {
      rows.set(match[1], [match[2], match[3]]);
    }
  }
  // Doc 13 names the keys that were written before it, and does not repeat them.
  const before =
    script.split('\n').find((line) => line.startsWith('Keys that exist already')) ?? '';
  const older = [...before.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? '');
  const isOlder = (key: string) =>
    older.some((name) => (name.endsWith('.*') ? key.startsWith(name.slice(0, -1)) : key === name));

  it('is found and read', () => {
    expect(rows.size).toBeGreaterThan(200);
    expect(older.length).toBeGreaterThan(3);
  });

  it('has every text the game shows, word for word', () => {
    const english: Record<string, string> = en;
    const french: Record<string, string> = fr;
    const wrong: string[] = [];
    for (const key of Object.keys(english)) {
      if (isOlder(key)) continue;
      const row = rows.get(key);
      if (!row) wrong.push(`${key}: no row in doc 13`);
      else if (row[0] !== english[key]) wrong.push(`${key}: English differs from doc 13`);
      else if (row[1] !== french[key]) wrong.push(`${key}: French differs from doc 13`);
    }
    expect(wrong).toEqual([]);
  });

  it('follows its own rules: no exclamation marks', () => {
    for (const [key, [english, french]] of rows) {
      expect(english, key).not.toContain('!');
      expect(french, key).not.toContain('!');
    }
  });
});
