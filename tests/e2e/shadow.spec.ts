import { expect, test, type Page } from '@playwright/test';

/** Release 0.3: the shadow, chapter 4 (doc 08; T121). */

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

const CHAPTER_3_DONE = [
  's0.motes',
  's0.brown',
  's1.fill',
  's1.sense',
  's1.bird',
  's1.greet',
  's1.molt',
  's2.burrow',
  's2.dusk',
  's2.bond',
  's2.fish',
  's2.molt',
  's3.tide',
  's3.fish2',
];

/**
 * A life kept in the shadow, come over the bar. What it has said already:
 * the first lines of each place, the first meeting and its moods. Without
 * them those must lines come first, and a later line waits its turn.
 */
function lifeAt(x: number, y: number, more: Record<string, unknown> = {}) {
  return {
    v: 1,
    generation: 1,
    area: 'shadow',
    stage: 'subAdult',
    at: { x, y },
    stepsDone: CHAPTER_3_DONE,
    bonds: { nacre: 0.3 },
    discoveries: ['place.drift', 'place.mangrove', 'place.lagoon', 'place.channel'],
    challenges: {},
    achievements: [],
    stats: {},
    playSeconds: 4000,
    pinned: null,
    moodsNamed: ['calm', 'hungry', 'content', 'curious', 'social', 'afraid'],
    promptsShown: {},
    cardsUnlocked: [],
    narrated: [
      'narr.c1.arrive',
      'narr.c1.meet',
      'narr.c2.arrive',
      'narr.c2.sand',
      'narr.c2.dusk',
      'narr.c2.lean',
      'narr.c3.start',
      'narr.c3.bar',
    ],
    placesSeen: ['drift', 'mangrove', 'lagoon', 'channel', 'shadow'],
    molts: 2,
    hunger: 0.3,
    favourite: null,
    journalSeen: [],
    ...more,
  };
}

/** Keeps a life and continues it from the title. */
async function continueLife(page: Page, life: object): Promise<void> {
  await page.goto('./');
  await waitForScene(page, 'Title');
  await page.evaluate((save) => {
    localStorage.setItem('lvdc.save.v1', JSON.stringify(save));
  }, life);
  await page.reload();
  await waitForScene(page, 'Title');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__lvdc?.player()?.area === 'shadow');
}

const narrationIs = (page: Page, key: string, timeout = 60_000) =>
  page.waitForFunction((line) => window.__lvdc?.player()?.narration === line, key, { timeout });

const hasStep = (page: Page, id: string, timeout = 60_000) =>
  page.waitForFunction((step) => window.__lvdc?.player()?.steps.includes(step), id, { timeout });

test.describe('chapter 4, the shadow', () => {
  test('the net comes with a sound; out past its edge, the shrimp is left with the dust, and the shoal is gone toward the sea', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    // Inside the net's trigger, on the shoal's way, between the rows of rock.
    await continueLife(page, lifeAt(5600, 1600));
    await narrationIs(page, 'narr.c4.sound', 30_000);
    await page.waitForFunction(() => window.__lvdc?.threat()?.net?.band != null, null, {
      timeout: 60_000,
    });
    // Down and out past the grid's side edge.
    await page.keyboard.down('ArrowDown');
    await page.waitForFunction(() => (window.__lvdc?.player()?.y ?? 0) > 2750, null, {
      timeout: 30_000,
    });
    await page.keyboard.up('ArrowDown');
    await hasStep(page, 's4.net', 90_000);
    await narrationIs(page, 'narr.c4.after', 30_000);
    // The shoal makes for the far side of the bed without the shrimp, and is not found yet.
    await page.waitForFunction(
      () => (window.__lvdc?.shrimp() ?? []).filter((one) => one.x < 3000).length >= 3,
      null,
      { timeout: 60_000 },
    );
    const me = await page.evaluate(() => window.__lvdc?.player());
    expect(me?.steps).not.toContain('s4.shoal');
    expect((await page.evaluate(() => window.__lvdc?.progress()?.stats.netEdge)) ?? 0).toBe(1);
    expect(errors).toEqual([]);
  });

  test('after the net, the shoal waits by the sea; found again, every one, the way on is open', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    await continueLife(
      page,
      lifeAt(2000, 1600, {
        stepsDone: [...CHAPTER_3_DONE, 's4.net'],
        narrated: [...lifeAt(0, 0).narrated, 'narr.c4.sound', 'narr.c4.after'],
      }),
    );
    // The shoal is not here: it has gone on ahead.
    expect((await page.evaluate(() => window.__lvdc?.player()))?.steps).not.toContain('s4.shoal');
    await page.keyboard.down('ArrowLeft');
    await hasStep(page, 's4.shoal', 90_000);
    await page.keyboard.up('ArrowLeft');
    await narrationIs(page, 'narr.c4.all', 30_000);
    // On to the open sea: its way out is open, and the rest of the life is being made.
    await page.keyboard.down('ArrowLeft');
    await narrationIs(page, 'end.continued', 60_000);
    await page.keyboard.up('ArrowLeft');
    expect((await page.evaluate(() => window.__lvdc?.player()))?.area).toBe('shadow');
    expect(errors).toEqual([]);
  });

  test('after the net took one, the shoal found again is not "every one" (T121)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    // Kept with the shoal close by: it is found again at once.
    await continueLife(
      page,
      lifeAt(6400, 1600, {
        stepsDone: [...CHAPTER_3_DONE, 's4.net'],
        stats: { missing: 1, 'missing.shadow': 1, 'released.shadow.net': 1 },
        narrated: [...lifeAt(0, 0).narrated, 'narr.c4.sound', 'narr.c4.after', 'narr.fewer'],
      }),
    );
    await hasStep(page, 's4.shoal', 30_000);
    const said = new Set<string>();
    for (let look = 0; look < 16; look++) {
      const line = await page.evaluate(() => window.__lvdc?.player()?.narration ?? null);
      if (line) said.add(line);
      await page.waitForTimeout(500);
    }
    expect([...said]).not.toContain('narr.c4.all');
    expect(errors).toEqual([]);
  });
});
