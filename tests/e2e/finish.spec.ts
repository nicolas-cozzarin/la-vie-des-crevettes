import { devices, expect, test, type Page } from '@playwright/test';

/** Step 11: the settings, About, and the notice for devices with no keyboard (docs 03, 07). */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function waitForScene(page: Page, key: string): Promise<void> {
  await page.waitForFunction((scene) => window.__lvdc?.scenes().includes(scene), key);
}

async function openTitle(page: Page): Promise<void> {
  await page.goto('./');
  await waitForScene(page, 'Title');
}

/** A life kept in the mangrove, as the save holds it. */
const SAVE = {
  v: 1,
  generation: 1,
  area: 'mangrove',
  stage: 'juvenile',
  at: { x: 1560, y: 1860 },
  stepsDone: ['s0.motes'],
  bonds: {},
  discoveries: ['place.drift', 'place.mangrove'],
  challenges: {},
  achievements: [],
  stats: {},
  playSeconds: 100,
  pinned: null,
  moodsNamed: [],
  promptsShown: {},
  cardsUnlocked: [],
  narrated: [],
  placesSeen: ['drift', 'mangrove'],
  molts: 0,
  hunger: 0.3,
  favourite: null,
  journalSeen: [],
};

const settings = (page: Page) => page.evaluate(() => window.__lvdc?.settings() ?? null);

/** Rows of the settings, from the top: the row to reach with Down. */
const ROW = { lang: 0, music: 5, captions: 8, gentle: 9, textScale: 11, startOver: 13 };

async function toRow(page: Page, row: number): Promise<void> {
  for (let step = 0; step < row; step++) await page.keyboard.press('ArrowDown');
}

test.describe('the settings', () => {
  test('open from the title, change at once, and are kept after a reload', async ({ page }) => {
    const errors = watchErrors(page);
    await openTitle(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Settings');

    await toRow(page, ROW.music);
    await page.keyboard.press('ArrowRight');
    expect((await settings(page))?.volume.music).toBeCloseTo(0.8);
    await toRow(page, ROW.captions - ROW.music);
    await page.keyboard.press('Enter');
    expect((await settings(page))?.captions).toBe(true);
    await toRow(page, ROW.textScale - ROW.captions);
    await page.keyboard.press('ArrowRight');
    expect((await settings(page))?.textScale).toBe(1.25);

    await page.reload();
    await waitForScene(page, 'Title');
    const kept = await settings(page);
    expect(kept?.volume.music).toBeCloseTo(0.8);
    expect(kept?.captions).toBe(true);
    expect(kept?.textScale).toBe(1.25);
    expect(errors).toEqual([]);
  });

  test('change the language, and every word with it', async ({ page }) => {
    await openTitle(page);
    const before = await page.evaluate(() => window.__lvdc?.lang());
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Settings');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((was) => window.__lvdc?.lang() !== was, before);
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Title');
    await expect(page).toHaveTitle(before === 'fr' ? 'The Life of Shrimp' : 'La vie des crevettes');
  });

  test('open over the paused game, turn gentle mode on, and go back to the pause menu', async ({
    page,
  }) => {
    await page.goto('./?explore=mangrove');
    await waitForScene(page, 'Play');
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Pause');
    // Resume, Carnet, Settings.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Settings');
    // The game waits, paused, behind.
    expect(await page.evaluate(() => window.__lvdc?.player())).not.toBeNull();
    await toRow(page, ROW.gentle);
    await page.keyboard.press('Enter');
    expect((await settings(page))?.gentleMode).toBe(true);
    // Start over belongs to the title: here the list goes round from the last row to the first.
    const lang = await page.evaluate(() => window.__lvdc?.lang());
    await toRow(page, ROW.startOver - ROW.gentle);
    await page.keyboard.press('Enter');
    await page.waitForFunction((was) => window.__lvdc?.lang() !== was, lang);
    await waitForScene(page, 'Settings');
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Pause');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const scenes = window.__lvdc?.scenes() ?? [];
      return scenes.includes('Play') && !scenes.includes('Pause');
    });
  });

  test('Start over asks once, then erases the life', async ({ page }) => {
    await openTitle(page);
    await page.evaluate((save) => {
      localStorage.setItem('lvdc.save.v1', JSON.stringify(save));
      localStorage.setItem('lvdc.settings.v1', JSON.stringify({ v: 1, captions: true }));
    }, SAVE);
    await page.reload();
    await waitForScene(page, 'Title');
    // Continue, New life, Settings.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Settings');
    await toRow(page, ROW.startOver);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => localStorage.getItem('lvdc.save.v1'))).not.toBeNull();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => localStorage.getItem('lvdc.save.v1'))).toBeNull();
    // The settings themselves stay.
    expect((await settings(page))?.captions).toBe(true);
    await page.reload();
    await waitForScene(page, 'Title');
    expect((await settings(page))?.captions).toBe(true);
  });
});

test.describe('About', () => {
  test('opens from the title and goes back', async ({ page }) => {
    const errors = watchErrors(page);
    await openTitle(page);
    // Play, Settings, About.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'About');
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Title');
    expect(errors).toEqual([]);
  });
});

test.describe('on a phone', () => {
  // A touch screen and no mouse, in the same browser.
  const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices['Pixel 7'];
  test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent });

  test('the title says the game needs a keyboard, and offers no menu', async ({ page }) => {
    const errors = watchErrors(page);
    await openTitle(page);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__lvdc?.scenes())).toEqual(['Title']);
    expect(errors).toEqual([]);
  });
});
