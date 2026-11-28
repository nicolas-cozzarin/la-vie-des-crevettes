import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PAINTERS } from '../../src/art/painters';
import { FOOD_KINDS } from '../../src/core/world/kinds';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { AREAS } from '../../src/data/areas/index';
import { CHALLENGES, CHALLENGE_TARGETS, CHAPTERS } from '../../src/data/challenges';
import { DISCOVERIES, DISCOVERY_IDS } from '../../src/data/discoveries';
import { DRIFT_AREA } from '../../src/data/drift';
import { CARDS, SOURCES } from '../../src/data/journal';
import { STORY_STEPS } from '../../src/data/story';
import en from '../../src/locales/en.json';
import fr from '../../src/locales/fr.json';

/** The goals and the journal, held against doc 12, doc 07 and the locales. */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const english: Record<string, string> = en;
const french: Record<string, string> = fr;

/** The rows of a table in a section of a doc, as cells. */
function table(doc: string, heading: string): string[][] {
  const lines = read(doc).split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) throw new Error(`No section ${heading} in ${doc}`);
  const rows: string[][] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('#')) break;
    if (!line.startsWith('| ') || line.startsWith('|--')) continue;
    rows.push(
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  }
  return rows.slice(1);
}

const both = (key: string) => {
  expect(english[key], `${key} in English`).toBeTruthy();
  expect(french[key], `${key} in French`).toBeTruthy();
};

describe('challenges', () => {
  it('each have a type icon', () => {
    for (const challenge of CHALLENGES) {
      expect(PAINTERS[`icon.type.${challenge.type}`], challenge.id).toBeDefined();
    }
  });

  const rows = table('docs/12-goals-and-journal.md', '## Challenges');

  it('are the ones of doc 12, with the same chapter and target', () => {
    const doc = rows.map((row) => ({
      id: (row[0] ?? '').replaceAll('`', ''),
      chapter: Number(row[1]),
      target: Number(row[5]),
    }));
    const built = CHALLENGES.map(({ id, chapter, target }) => ({ id, chapter, target }));
    expect(built).toEqual(doc);
  });

  it('each have a name and a sentence in both languages', () => {
    for (const challenge of CHALLENGES) {
      both(`challenge.${challenge.id}.name`);
      both(`challenge.${challenge.id}.what`);
    }
  });

  it('lead a pinned ribbon only to something an area has', () => {
    for (const [id, target] of Object.entries(CHALLENGE_TARGETS)) {
      expect(CHALLENGES.some((one) => one.id === id)).toBe(true);
      if (!target) continue;
      const found = Object.values(AREAS).some((area) =>
        'discovery' in target
          ? [...(area.landmarks ?? []), ...(area.cover ?? []), ...(area.zones ?? [])].some(
              (thing) => thing.discovery === target.discovery,
            )
          : (area.creatures ?? []).some((creature) => creature.kind === target.creature),
      );
      expect(found, id).toBe(true);
    }
  });
});

describe('achievements', () => {
  const rows = table('docs/12-goals-and-journal.md', '## Achievements');

  it('are the ones of doc 12, in its order', () => {
    expect(ACHIEVEMENTS.map((one) => one.id)).toEqual(
      rows.map((row) => (row[0] ?? '').replaceAll('`', '')),
    );
  });

  it('each have a name, a way to earn it, and a stamp', () => {
    for (const achievement of ACHIEVEMENTS) {
      both(`ach.${achievement.id}.name`);
      both(`ach.${achievement.id}.how`);
      expect(PAINTERS[`icon.ach.${achievement.id}`], achievement.id).toBeDefined();
    }
  });
});

describe('the cards of What shrimp feel', () => {
  const sources07 = table('docs/07-science-and-message.md', '## Sources').map((row) => row[0]);
  const sources18 = table('docs/18-learning-by-playing.md', '## Sources').map((row) => row[0]);

  it('each have a title and a text in both languages', () => {
    for (const card of CARDS) {
      both(`card.${card.id}.name`);
      both(`card.${card.id}.text`);
    }
  });

  it('cite sources that doc 07 or doc 18 lists, each with its line', () => {
    for (const key of Object.keys(SOURCES)) {
      expect([...sources07, ...sources18], key).toContain(key);
      both(`source.${key}`);
    }
    for (const card of CARDS) {
      for (const key of card.sources) expect(SOURCES[key], `${card.id}: ${key}`).toBeDefined();
    }
  });

  it('are released only when every source has been read', () => {
    for (const card of CARDS.filter((one) => one.released)) {
      expect(card.sources.length, card.id).toBeGreaterThan(0);
      for (const key of card.sources) expect(SOURCES[key], `${card.id}: ${key}`).toBe('read');
    }
    // The two cards doc 07 marks "to check" stay back.
    expect(CARDS.find((one) => one.id === 'tailflip')?.released).toBe(false);
    expect(CARDS.find((one) => one.id === 'molt')?.released).toBe(false);
  });

  it('are the cards of doc 12 that are built, with no other', () => {
    const doc12 = table(
      'docs/12-goals-and-journal.md',
      '## Journal cards and what unlocks them',
    ).map((row) => (row[0] ?? '').replaceAll('`', '').replace(/^card\./, ''));
    for (const id of doc12) expect(CARDS.map((card) => card.id)).toContain(id);
    const doc18 = read('docs/18-learning-by-playing.md');
    for (const card of CARDS) {
      if (doc12.includes(card.id)) continue;
      expect(doc18, card.id).toContain(`\`card.${card.id}\``);
    }
  });
});

describe('discoveries', () => {
  it('each have a name in both languages, and a picture that exists', () => {
    for (const entry of DISCOVERIES) {
      both(`name.${entry.id}`);
      if (entry.image) expect(PAINTERS[entry.image], entry.id).toBeDefined();
    }
    expect(new Set(DISCOVERY_IDS).size).toBe(DISCOVERY_IDS.length);
  });

  it('list everything an area, the Drift or a food can make found', () => {
    const found = new Set<string>(['place.drift', 'drift.copepod', 'drift.bell']);
    for (const food of FOOD_KINDS) found.add(`food.${food}`);
    for (const area of Object.values(AREAS)) {
      found.add(`place.${area.id}`);
      for (const creature of area.creatures ?? []) found.add(`creature.${creature.kind}`);
      for (const thing of [
        ...(area.landmarks ?? []),
        ...(area.cover ?? []),
        ...(area.zones ?? []),
      ]) {
        if (thing.discovery) found.add(thing.discovery);
      }
    }
    expect(DRIFT_AREA.id).toBe('drift');
    for (const id of found) expect(DISCOVERY_IDS, id).toContain(id);
  });
});

describe('chapters', () => {
  it('end with steps of doc 12', () => {
    const steps = table('docs/12-goals-and-journal.md', '## Story steps').map((row) =>
      (row[0] ?? '').replaceAll('`', ''),
    );
    for (const chapter of CHAPTERS) expect(steps, chapter.area).toContain(chapter.end);
    for (const step of STORY_STEPS) expect(steps).toContain(step.id);
  });

  it('wait only for an earlier step of the same chapter (T121)', () => {
    STORY_STEPS.forEach((step, index) => {
      if (step.after === undefined) return;
      const before = STORY_STEPS.slice(0, index).find((one) => one.id === step.after);
      expect(before?.chapter, step.id).toBe(step.chapter);
    });
  });
});
