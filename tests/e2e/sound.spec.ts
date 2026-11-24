import { expect, test, type Page } from '@playwright/test';

/** Step 10: the sound follows the shrimp, and sounds that carry meaning are captioned (doc 05). */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function explore(page: Page, query: string): Promise<void> {
  await page.goto(`./?explore=${query}`);
  await page.waitForFunction(() => window.__lvdc?.scenes().includes('Play'));
  await page.waitForFunction(() => window.__lvdc?.audio() !== null);
}

/** "Captions for sounds" on, as the settings screen will keep it. */
async function captionsOn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('lvdc.settings.v1', JSON.stringify({ v: 1, captions: true }));
  });
}

async function audio(page: Page) {
  const snapshot = await page.evaluate(() => window.__lvdc?.audio() ?? null);
  if (!snapshot) throw new Error('There is no sound director: the play scene is not running.');
  return snapshot;
}

/** Keeps every caption shown, read in the page on every frame. */
async function recordCaptions(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { captionsSeen: string[] }).captionsSeen = seen;
    const look = () => {
      const caption = window.__lvdc?.audio()?.caption;
      if (caption && seen[seen.length - 1] !== caption) seen.push(caption);
      requestAnimationFrame(look);
    };
    look();
  });
  return () => page.evaluate(() => (window as unknown as { captionsSeen: string[] }).captionsSeen);
}

test.describe('the sound', () => {
  test('fear dulls the music and relief brings it back', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await captionsOn(page);
    // Under a root tangle the bird never chases, so it comes, looks, and goes.
    await explore(page, 'mangrove&at=1150,1860&debug');
    const calm = (await audio(page)).mix;
    expect(calm.uneasy).toBeLessThan(0.05);
    expect(calm.areaBright).toBeGreaterThan(5000);

    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.tucked === true);
    const captions = await recordCaptions(page);
    await page.keyboard.press('F10');

    // Afraid: the area track is dulled, and the uneasy track is up.
    await page.waitForFunction(
      () => {
        const mix = window.__lvdc?.audio()?.mix;
        return mix !== undefined && mix.areaBright < 1200 && mix.uneasy > 0.6;
      },
      null,
      { timeout: 60_000 },
    );
    expect((await page.evaluate(() => window.__lvdc?.feelings()?.mood)) ?? '').toBe('afraid');

    // The bird goes. The water settles, and the music opens again.
    await page.waitForFunction(() => window.__lvdc?.threat()?.stage === 'release', null, {
      timeout: 75_000,
    });
    await page.waitForFunction(
      () => {
        const mix = window.__lvdc?.audio()?.mix;
        return mix !== undefined && mix.areaBright > 5000 && mix.uneasy < 0.2;
      },
      null,
      { timeout: 60_000 },
    );
    await page.keyboard.up('ShiftLeft');
    const seen = await captions();
    expect(seen.slice(0, 2)).toEqual(['caption.shadow', 'caption.step']);
    expect((await audio(page)).heard).toContain('threatCue');
    expect(errors).toEqual([]);
  });

  test('going under cover and a tail flip ask for their sounds, with no file and no error', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await explore(page, 'mangrove&at=1150,1860');
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.audio()?.heard.includes('rustle'));
    await page.keyboard.up('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'free');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__lvdc?.audio()?.heard.includes('tailFlip'));
    // A key was pressed, so the browser lets sound play.
    expect((await audio(page)).started).toBe(true);
    expect((await audio(page)).music).toBeNull();
    expect(errors).toEqual([]);
  });

  test('without captions on, nothing is captioned', async ({ page }) => {
    await explore(page, 'mangrove&at=1150,1860&debug');
    const captions = await recordCaptions(page);
    await page.keyboard.press('F10');
    await page.waitForFunction(() => window.__lvdc?.audio()?.heard.includes('threatCue'), null, {
      timeout: 60_000,
    });
    await page.waitForTimeout(500);
    expect(await captions()).toEqual([]);
  });
});
