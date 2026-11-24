/**
 * The works by others that the game uses, as the About page shows them: the
 * same rows as `CREDITS.md`. A title, a name and a licence are shown as they
 * are, in every language.
 */
export interface CreditRow {
  /** The file under `public/assets/`, as `CREDITS.md` names it. */
  file: string;
  title: string;
  author: string;
  licence: string;
}

export const CREDITS_SHOWN: readonly CreditRow[] = [
  {
    file: 'fonts/fraunces.woff2',
    title: 'Fraunces',
    author: 'The Fraunces Project Authors',
    licence: 'SIL Open Font License 1.1',
  },
  {
    file: 'fonts/atkinson-hyperlegible.woff2',
    title: 'Atkinson Hyperlegible',
    author: 'Braille Institute of America',
    licence: 'SIL Open Font License 1.1',
  },
];
