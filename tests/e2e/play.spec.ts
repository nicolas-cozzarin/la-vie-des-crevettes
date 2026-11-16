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

/**
 * Runs in the page, passed whole: whether the shrimp is now 250 px behind
 * where it was, along the way it faced.
 */
function thrownBack(from: { x: number; y: number; heading: number }): boolean {
  const now = window.__lvdc?.player();
  if (!now) return false;
  const back = -(
    (now.x - from.x) * Math.cos(from.heading) +
    (now.y - from.y) * Math.sin(from.heading)
  );
  return back > 250;
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

    const start = await player(page);
    await page.keyboard.press('Space');
    await page.waitForFunction(thrownBack, start);

    // Straight back: the heading is kept and the shrimp does not slide sideways.
    const end = await player(page);
    expect(end.heading).toBeCloseTo(start.heading, 3);
    const along = { x: Math.cos(start.heading), y: Math.sin(start.heading) };
    const side = (end.x - start.x) * -along.y + (end.y - start.y) * along.x;
    expect(Math.abs(side)).toBeLessThan(1);
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

/** Opens an area straight away, as the author does to look around (doc 15). */
async function explore(page: Page, query: string): Promise<void> {
  await page.goto(`./?explore=${query}`);
  await waitForScene(page, 'Play');
  await page.waitForFunction(() => window.__lvdc?.player() !== null);
}

async function feelings(page: Page) {
  const snapshot = await page.evaluate(() => window.__lvdc?.feelings() ?? null);
  if (!snapshot) throw new Error('There are no feelings: the play scene is not running.');
  return snapshot;
}

test.describe('explore', () => {
  test('opens the lagoon with no title and no story', async ({ page }) => {
    const errors = watchErrors(page);
    await explore(page, 'lagoon');
    const start = await player(page);
    expect(start.area).toBe('lagoon');
    expect(start.explore).toBe(true);
    expect(start.zones).toContain('A');
    expect(errors).toEqual([]);
  });

  test('starts where it is told', async ({ page }) => {
    await explore(page, 'mangrove&at=1150,1860');
    const start = await player(page);
    expect(start.area).toBe('mangrove');
    expect(start.x).toBe(1150);
    expect(start.y).toBe(1860);
  });

  test('a root stops the shrimp', async ({ page }) => {
    // A root stands at 1150, 1560, 95 across from its centre.
    await explore(page, 'mangrove&at=1150,1760');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2000);
    await page.keyboard.up('KeyW');
    const end = await player(page);
    expect(end.y).toBeLessThan(1720);
    expect(Math.hypot(end.x - 1150, end.y - 1560)).toBeGreaterThan(95);
  });

  test('holding Hide by a root tangle walks the shrimp under it, letting go ends it', async ({
    page,
  }) => {
    await explore(page, 'mangrove&at=1150,1860');
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'hiding');
    await page.waitForFunction(() => window.__lvdc?.player()?.tucked === true);
    await page.keyboard.up('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'free');
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
    expect((await player(page)).x).toBe(start.x);
    expect((await player(page)).y).toBe(start.y);

    await page.keyboard.press('KeyG');
    await page.waitForFunction(thrownBack, start);
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

test.describe('feelings', () => {
  test('hunger rises while the shrimp walks', async ({ page }) => {
    const errors = watchErrors(page);
    await explore(page, 'mangrove&at=1150,1860');
    const start = await feelings(page);
    expect(start.mood).toBe('calm');
    await page.keyboard.down('KeyA');
    await page.waitForFunction(
      (hunger) => (window.__lvdc?.feelings()?.values.hunger ?? 0) > hunger + 0.003,
      start.values.hunger,
    );
    await page.keyboard.up('KeyA');
    expect(errors).toEqual([]);
  });

  test('a creature not yet met makes the shrimp curious, and staying near finds it', async ({
    page,
  }) => {
    // A snail rests at 1385, 1608, about 3 BL from this start.
    await explore(page, 'mangrove&at=1150,1860');
    await page.waitForFunction(() => {
      const now = window.__lvdc?.feelings();
      return now?.mood === 'curious' && now.curiousAbout === 'creature.snail';
    });
    await explore(page, 'mangrove&at=1385,1760');
    await page.waitForFunction(() =>
      window.__lvdc?.feelings()?.discovered.includes('creature.snail'),
    );
  });

  test('with ?debug, F9 forces each mood in turn, then lets the feelings decide', async ({
    page,
  }) => {
    await explore(page, 'mangrove&debug');
    for (const mood of ['calm', 'hungry', 'content', 'curious', 'social', 'afraid']) {
      await page.keyboard.press('F9');
      expect((await feelings(page)).forced).toBe(mood);
      expect((await feelings(page)).mood).toBe(mood);
    }
    await page.keyboard.press('F9');
    expect((await feelings(page)).forced).toBeNull();
  });

  test('without ?debug, F9 does nothing', async ({ page }) => {
    await explore(page, 'mangrove');
    await page.keyboard.press('F9');
    expect((await feelings(page)).forced).toBeNull();
  });
});

test.describe('food and scent', () => {
  test('holding Sense shows a ribbon that leads to food', async ({ page }) => {
    const errors = watchErrors(page);
    // An algae film lies at 1262, 1612, about 2.6 BL ahead.
    await explore(page, 'mangrove&at=1262,1900');
    await page.keyboard.down('KeyQ');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'sensing');
    await page.waitForFunction(() =>
      window.__lvdc?.scent()?.some((ribbon) => ribbon.kind === 'food' && ribbon.alpha > 0.5),
    );
    await page.keyboard.up('KeyQ');
    await page.waitForFunction(() => window.__lvdc?.scent()?.length === 0);
    expect(errors).toEqual([]);
  });

  test('grazing an algae film lowers hunger, and the first taste is found', async ({ page }) => {
    await explore(page, 'mangrove&at=1262,1700');
    const start = await feelings(page);
    expect(start.discovered).not.toContain('food.algaeFilm');
    await page.keyboard.down('KeyE');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'grazing');
    await page.waitForFunction(
      (hunger) => (window.__lvdc?.feelings()?.values.hunger ?? 1) < hunger - 0.05,
      start.values.hunger,
    );
    // A mood that has just started holds for MOOD.oldHolds, so content can
    // come a moment after the first bite. Curious often leads on arrival here.
    await page.waitForFunction(() => window.__lvdc?.feelings()?.mood === 'content');
    expect((await feelings(page)).discovered).toContain('food.algaeFilm');
    await page.keyboard.up('KeyE');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'free');
  });
});
