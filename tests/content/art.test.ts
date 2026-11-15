import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FITTED_IMAGES, imageFit } from '../../src/art/fit';
import { PAINTER_GROUPS, PAINTERS } from '../../src/art/painters';

/**
 * The pictures and their list in docs/14-art-production.md, "The manifest".
 * A painter added, renamed or resized without its row fails here, and so
 * does a row that says "Built" for a picture nobody painted.
 * docs/19-changing-things-safely.md says what to do when one of these fails.
 */

interface ManifestRow {
  names: string[];
  size: { w: number; h: number } | null;
  built: boolean;
  toPaint: boolean;
  line: number;
}

/**
 * Reads the names in a cell. `a.b.c`, `.d` means a.b.c and a.b.d.
 * `a.b.c` to `.f` means a.b.c, a.b.d, a.b.e and a.b.f.
 * A name with a part in angle brackets stands for many and is left out.
 */
function namesInCell(cell: string): string[] {
  const names: string[] = [];
  const parts = cell.split('`').filter((_, index) => index % 2 === 1);
  const range = /^`([^`]+)` to `\.([a-z])`$/.exec(cell.trim());
  if (range?.[1] && range[2]) {
    const first = range[1];
    const stem = first.slice(0, first.lastIndexOf('.') + 1);
    const from = first.slice(first.lastIndexOf('.') + 1).charCodeAt(0);
    for (let code = from; code <= range[2].charCodeAt(0); code++) {
      names.push(stem + String.fromCharCode(code));
    }
    return names;
  }
  let last = '';
  for (const part of parts) {
    if (part.includes('<')) continue;
    if (part.startsWith('.')) {
      names.push(last.slice(0, last.lastIndexOf('.')) + part);
    } else {
      names.push(part);
      last = part;
    }
  }
  return names;
}

/** `128`, `1024, tile`, `480 by 270`, `1024 by 420, repeats sideways`. Else null. */
function sizeInCell(cell: string): { w: number; h: number } | null {
  const pair = /^(\d+) by (\d+)\b/.exec(cell.trim());
  if (pair) return { w: Number(pair[1]), h: Number(pair[2]) };
  const one = /^(\d+)(,|$)/.exec(cell.trim());
  if (one) return { w: Number(one[1]), h: Number(one[1]) };
  return null;
}

function readManifest(): ManifestRow[] {
  const doc = readFileSync(new URL('../../docs/14-art-production.md', import.meta.url), 'utf8');
  const lines = doc.split('\n');
  const start = lines.findIndex((line) => line === '## The manifest');
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const rows: ManifestRow[] = [];
  for (let index = start; index < end; index++) {
    const line = lines[index] ?? '';
    if (!line.startsWith('| `')) continue;
    const cells = line.split('|').map((cell) => cell.trim());
    const [, name = '', size = '', status = ''] = cells;
    rows.push({
      names: namesInCell(name),
      size: sizeInCell(size),
      built: status.startsWith('Built'),
      toPaint: status.startsWith('To paint'),
      line: index + 1,
    });
  }
  return rows;
}

const manifest = readManifest();
const listed = new Map<string, ManifestRow>();
for (const row of manifest) for (const name of row.names) listed.set(name, row);

describe('the manifest in doc 14', () => {
  it('is found and read', () => {
    expect(manifest.length).toBeGreaterThan(50);
    expect(namesInCell('`mangrove.root.a` to `.c`')).toEqual([
      'mangrove.root.a',
      'mangrove.root.b',
      'mangrove.root.c',
    ]);
    expect(namesInCell('`food.microalgae.a`, `.b`')).toEqual([
      'food.microalgae.a',
      'food.microalgae.b',
    ]);
    expect(sizeInCell('1024 by 420, repeats sideways')).toEqual({ w: 1024, h: 420 });
    expect(sizeInCell('256, tile')).toEqual({ w: 256, h: 256 });
    expect(sizeInCell('from `shrimpParts.ts`')).toBeNull();
  });

  it('lists every painter', () => {
    const missing = Object.keys(PAINTERS).filter((name) => !listed.has(name));
    expect(missing, 'painters with no row in the manifest').toEqual([]);
  });

  it('marks every painter as built', () => {
    const wrong = Object.keys(PAINTERS).filter((name) => listed.get(name)?.built === false);
    expect(wrong, 'painters whose row does not say Built').toEqual([]);
  });

  it('marks as built only what has a painter', () => {
    const wrong = manifest
      .filter((row) => row.built)
      .flatMap((row) => row.names.filter((name) => !PAINTERS[name]));
    expect(wrong, 'rows that say Built with no painter').toEqual([]);
  });

  it('gives each painter the size in its row', () => {
    const wrong: string[] = [];
    for (const [name, painter] of Object.entries(PAINTERS)) {
      const size = listed.get(name)?.size;
      if (!size) continue;
      if (painter.width !== size.w || painter.height !== size.h) {
        wrong.push(
          `${name}: painted ${painter.width} by ${painter.height}, listed ${size.w} by ${size.h}`,
        );
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe('every painter', () => {
  it.each(Object.entries(PAINTERS))('%s has a whole size of 2048 px at most', (_name, painter) => {
    for (const side of [painter.width, painter.height]) {
      expect(Number.isInteger(side)).toBe(true);
      expect(side).toBeGreaterThan(0);
      expect(side).toBeLessThanOrEqual(2048);
    }
  });

  it('has a name of the form area.thing.variant', () => {
    for (const name of Object.keys(PAINTERS)) {
      expect(name, name).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)*$/);
    }
  });

  it('is in exactly one group of the atelier', () => {
    const grouped = PAINTER_GROUPS.flatMap((group) => group.names);
    expect([...grouped].sort()).toEqual(Object.keys(PAINTERS).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe('the fit table', () => {
  it('names only pictures that exist', () => {
    const unknown = FITTED_IMAGES.filter((name) => !PAINTERS[name]);
    expect(unknown).toEqual([]);
  });

  it.each(FITTED_IMAGES.map((name) => [name]))('%s has numbers that make sense', (name) => {
    const fit = imageFit(name);
    const painter = PAINTERS[name];
    if (fit.fill !== undefined) expect(fit.fill).toBeGreaterThan(0);
    if (fit.fill !== undefined) expect(fit.fill).toBeLessThanOrEqual(1);
    if (fit.solid !== undefined) expect(fit.solid).toBeGreaterThan(0);
    if (fit.solid !== undefined) expect(fit.solid).toBeLessThan(1);
    if (fit.solid !== undefined) expect(fit.tile).toBe('x');
    if (fit.tile === 'both') expect(painter?.width).toBe(painter?.height);
    if (fit.tile === 'x') expect(painter?.width).toBe(1024);
    if (fit.margin !== undefined && painter) {
      expect(2 * fit.margin).toBeLessThan(Math.min(painter.width, painter.height));
    }
  });
});
