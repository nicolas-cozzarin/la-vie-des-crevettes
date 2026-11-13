import { describe, expect, it } from 'vitest';
import { pickLanguage, Translator } from '../../src/core/i18n';

describe('pickLanguage', () => {
  it('takes the first supported language in the browser list', () => {
    expect(pickLanguage(['de-DE', 'fr-CA', 'en'])).toBe('fr');
    expect(pickLanguage(['en-GB', 'fr'])).toBe('en');
  });

  it('ignores case and region', () => {
    expect(pickLanguage(['FR-be'])).toBe('fr');
  });

  it('falls back when nothing matches', () => {
    expect(pickLanguage(['de', 'es'])).toBe('en');
    expect(pickLanguage([], 'fr')).toBe('fr');
  });

  it('does not match a language that only starts with the same letters', () => {
    expect(pickLanguage(['fry'])).toBe('en');
  });
});

describe('Translator', () => {
  const dictionaries = {
    fr: { hello: 'Bonjour', prompt: 'Maintiens [{key}] pour brouter' },
    en: { hello: 'Hello', prompt: 'Hold [{key}] to graze' },
  };

  it('looks a key up in the current language', () => {
    const i18n = new Translator(dictionaries, 'fr');
    expect(i18n.t('hello')).toBe('Bonjour');
    i18n.setLang('en');
    expect(i18n.lang).toBe('en');
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('fills placeholders', () => {
    const i18n = new Translator(dictionaries, 'en');
    expect(i18n.t('prompt', { key: 'E' })).toBe('Hold [E] to graze');
  });

  it('leaves a placeholder alone when no value is given for it', () => {
    const i18n = new Translator(dictionaries, 'en');
    expect(i18n.t('prompt', {})).toBe('Hold [{key}] to graze');
  });

  it('returns the key itself when it is missing', () => {
    const i18n = new Translator(dictionaries, 'en');
    expect(i18n.t('nope')).toBe('nope');
    expect(i18n.has('nope')).toBe(false);
    expect(i18n.has('hello')).toBe(true);
  });
});
