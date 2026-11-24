/**
 * The two fonts, hosted with the game (doc 04): Fraunces for titles and
 * Atkinson Hyperlegible for text. Text drawn before a font is ready keeps the
 * fallback, so the first scene waits for both, but never long: if a font is
 * slow or missing, the game goes on with the system's fonts.
 */

const FACES = [
  { family: 'Fraunces', file: 'fraunces.woff2' },
  { family: 'Atkinson Hyperlegible', file: 'atkinson-hyperlegible.woff2' },
] as const;

/** Resolves when both fonts are ready, or after `waitMs`, whichever comes first. */
export function loadFonts(waitMs: number): Promise<void> {
  if (typeof FontFace !== 'function' || !document.fonts) return Promise.resolve();
  const loads = FACES.map(({ family, file }) => {
    const face = new FontFace(family, `url(assets/fonts/${file})`);
    document.fonts.add(face);
    return face.load().catch(() => undefined);
  });
  const late = new Promise<void>((resolve) => setTimeout(resolve, waitMs));
  return Promise.race([Promise.all(loads).then(() => undefined), late]);
}
