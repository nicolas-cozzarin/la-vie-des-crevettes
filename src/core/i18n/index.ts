/**
 * Text lookup. Every string the player sees comes from a locale file
 * through `t(key)`.
 */
export const LANGS = ['fr', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export type Dictionary = Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, string | number>>;

/**
 * Choose a language from the browser's ordered preferences
 * (`navigator.languages`), such as ['fr-CA', 'en'].
 */
export function pickLanguage(preferred: readonly string[], fallback: Lang = 'en'): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    const match = LANGS.find((lang) => lang === base);
    if (match) return match;
  }
  return fallback;
}

export class Translator {
  private current: Lang;

  constructor(
    private readonly dictionaries: Readonly<Record<Lang, Dictionary>>,
    lang: Lang,
  ) {
    this.current = lang;
  }

  get lang(): Lang {
    return this.current;
  }

  setLang(lang: Lang): void {
    this.current = lang;
  }

  has(key: string): boolean {
    return key in this.dictionaries[this.current];
  }

  /**
   * Look a key up in the current language. `{name}` placeholders are filled
   * from `params`. A missing key comes back as the key itself, so it is easy
   * to spot on screen and in tests.
   */
  t(key: string, params?: Params): string {
    const template = this.dictionaries[this.current][key];
    if (template === undefined) return key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole,
    );
  }
}
