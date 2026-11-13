import { describe, expect, it } from 'vitest';
import en from '../../src/locales/en.json';
import fr from '../../src/locales/fr.json';

const locales: Record<string, Record<string, string>> = { fr, en };

describe('locale files', () => {
  it('have exactly the same keys in every language', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it.each(Object.entries(locales))('%s has no empty text', (_lang, dictionary) => {
    for (const [key, text] of Object.entries(dictionary)) {
      expect(text.trim(), key).not.toBe('');
    }
  });

  it('use the same placeholders in every language', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(fr[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('contain no exclamation marks, as the writing rules ask', () => {
    for (const dictionary of Object.values(locales)) {
      for (const [key, text] of Object.entries(dictionary)) {
        expect(text, key).not.toContain('!');
      }
    }
  });
});
