import { expect, test, type Page } from '@playwright/test';

/** Collect anything the page reports as an error. */
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
  await expect(page.locator('#game canvas')).toBeVisible();
  await waitForScene(page, 'Title');
}

/** Play is the first entry of the title menu. */
async function startPlay(page: Page): Promise<void> {
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Play');
  await page.waitForFunction(() => window.__lvdc?.player() !== null);
}

async function player(page: Page) {
  const snapshot = await page.evaluate(() => window.__lvdc?.player() ?? null);
  if (!snapshot) throw new Error('There is no shrimp: the play scene is not running.');
  return snapshot;
}

test.describe('play', () => {
  test('Play starts the game and holding a movement key moves the shrimp', async ({ page }) => {
    const errors = watchErrors(page);
    await openTitle(page);
    await startPlay(page);

    const start = await player(page);
    expect(start.mode).toBe('rest');

    await page.keyboard.down('KeyD');
    await page.waitForFunction((x) => (window.__lvdc?.player()?.x ?? 0) > x + 150, start.x);
    await page.keyboard.up('KeyD');

    expect(errors).toEqual([]);
  });

  test('the shrimp swims when the key is held, and settles when it is let go', async ({ page }) => {
    await openTitle(page);
    await startPlay(page);

    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => {
      const shrimp = window.__lvdc?.player();
      return shrimp?.mode === 'swim' && shrimp.height > 0.8;
    });
    await page.keyboard.up('ArrowRight');
    await page.waitForFunction(() => {
      const shrimp = window.__lvdc?.player();
      return shrimp?.mode === 'rest' && shrimp.height === 0;
    });
  });

  test('the tail flip throws the shrimp backward, tail first', async ({ page }) => {
    await openTitle(page);
    await startPlay(page);

    // The shrimp starts facing up the screen, so backward is down.
    const start = await player(page);
    await page.keyboard.press('Space');
    await page.waitForFunction((y) => (window.__lvdc?.player()?.y ?? 0) > y + 250, start.y);

    const end = await player(page);
    expect(end.heading).toBeCloseTo(start.heading, 3);
    expect(Math.abs(end.x - start.x)).toBeLessThan(1);
  });

  test('Escape opens the pause menu and closes it again', async ({ page }) => {
    await openTitle(page);
    await startPlay(page);

    await page.keyboard.press('Escape');
    await waitForScene(page, 'Pause');

    // Nothing moves while paused.
    const paused = await player(page);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyD');
    expect((await player(page)).x).toBe(paused.x);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const scenes = window.__lvdc?.scenes() ?? [];
      return scenes.includes('Play') && !scenes.includes('Pause');
    });
  });
});

test.describe('controls', () => {
  /** From the title: Controls is the second entry. Tail flip is the fifth row. */
  async function openControls(page: Page): Promise<void> {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Controls');
  }

  async function chooseTailFlip(page: Page): Promise<void> {
    for (let row = 0; row < 4; row++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }

  const tailFlipKeys = (page: Page) => page.evaluate(() => window.__lvdc?.bindings().tailFlip);

  test('a rebound key is kept after a reload and works in play', async ({ page }) => {
    await openTitle(page);
    await openControls(page);
    await chooseTailFlip(page);
    await page.keyboard.press('KeyG');
    expect(await tailFlipKeys(page)).toEqual(['KeyG', null]);

    await page.reload();
    await waitForScene(page, 'Title');
    expect(await tailFlipKeys(page)).toEqual(['KeyG', null]);

    await startPlay(page);
    const start = await player(page);

    // Space no longer does anything.
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    expect((await player(page)).y).toBe(start.y);

    await page.keyboard.press('KeyG');
    await page.waitForFunction((y) => (window.__lvdc?.player()?.y ?? 0) > y + 250, start.y);
  });

  test('a key already in use swaps with the other action', async ({ page }) => {
    await openTitle(page);
    await openControls(page);
    await chooseTailFlip(page);
    await page.keyboard.press('KeyE');

    const bindings = await page.evaluate(() => window.__lvdc?.bindings());
    expect(bindings?.tailFlip).toEqual(['KeyE', null]);
    expect(bindings?.interact).toEqual(['Space', 'Enter']);
  });

  test('Escape cancels a rebind, then leaves the screen', async ({ page }) => {
    await openTitle(page);
    await openControls(page);
    await chooseTailFlip(page);

    await page.keyboard.press('Escape');
    expect(await tailFlipKeys(page)).toEqual(['Space', null]);
    await waitForScene(page, 'Controls');

    await page.keyboard.press('Escape');
    await waitForScene(page, 'Title');
  });

  test('Escape still opens pause after the pause key is changed', async ({ page }) => {
    await openTitle(page);
    await openControls(page);

    // Pause is the eleventh row. Its second slot can be changed, its first cannot.
    for (let row = 0; row < 10; row++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('KeyG');
    expect(await page.evaluate(() => window.__lvdc?.bindings().pause)).toEqual(['Escape', 'KeyP']);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.press('KeyG');
    expect(await page.evaluate(() => window.__lvdc?.bindings().pause)).toEqual(['Escape', 'KeyG']);

    await page.keyboard.press('Escape');
    await waitForScene(page, 'Title');
    await startPlay(page);
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Pause');
  });
});
