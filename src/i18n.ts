import { pickLanguage, Translator } from './core/i18n';
import en from './locales/en.json';
import fr from './locales/fr.json';

/** The game's translator, set to the browser's preferred language. */
export const i18n = new Translator({ fr, en }, pickLanguage(navigator.languages));

export const t = i18n.t.bind(i18n);
