import { expect, test, type Page } from '@playwright/test';

/** Release 0.3: the channel, chapter 3 (doc 08). */

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

const CHAPTER_2_DONE = [
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
];

/**
 * A life kept after the lagoon's molt. What it has said already: the first
 * lines of each place, the first meeting and its moods. Without them those
 * must lines come first, and a later line waits its turn.
 */
function lifeAt(area: string, x: number, y: number, more: Record<string, unknown> = {}) {
  return {
    v: 1,
    generation: 1,
    area,
    stage: 'subAdult',
    at: { x, y },
    stepsDone: CHAPTER_2_DONE,
    bonds: { nacre: 0.3 },
    discoveries: ['place.drift', 'place.mangrove', 'place.lagoon'],
    challenges: {},
    achievements: [],
    stats: {},
    playSeconds: 3000,
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
    ],
    placesSeen: ['drift', 'mangrove', 'lagoon'],
    molts: 2,
    hunger: 0.3,
    favourite: null,
    journalSeen: [],
    ...more,
  };
}

/** Keeps a life and continues it from the title. */
async function continueLife(page: Page, life: object, area: string): Promise<void> {
  await page.goto('./');
  await waitForScene(page, 'Title');
  await page.evaluate((save) => {
    localStorage.setItem('lvdc.save.v1', JSON.stringify(save));
  }, life);
  await page.reload();
  await waitForScene(page, 'Title');
  await page.keyboard.press('Enter');
  await page.waitForFunction((where) => window.__lvdc?.player()?.area === where, area);
}

const narration = (page: Page) => page.evaluate(() => window.__lvdc?.player()?.narration ?? null);

test.describe('chapter 3, the channel', () => {
  test('after the lagoon molt, the pass leads on into the channel, and the water wants to leave', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await continueLife(page, lifeAt('lagoon', 260, 2850), 'lagoon');
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'channel', null, {
      timeout: 30_000,
    });
    await page.keyboard.up('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.narration === 'narr.c3.start', null, {
      timeout: 30_000,
    });
    expect(errors).toEqual([]);
  });

  test('following the tide into the pool is a step, and the pool has its line', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await continueLife(
      page,
      lifeAt('channel', 6620, 1300, {
        placesSeen: ['drift', 'mangrove', 'lagoon', 'channel'],
        narrated: [...lifeAt('channel', 0, 0).narrated, 'narr.c3.start', 'narr.c3.narrows'],
      }),
      'channel',
    );
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.steps.includes('s3.tide'), null, {
      timeout: 30_000,
    });
    await page.keyboard.up('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.narration === 'narr.c3.pool', null, {
      timeout: 30_000,
    });
    expect(errors).toEqual([]);
  });

  test('the bar stays closed until the fish has gone twice; then it leads out over the bar to the shadow', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const seen = {
      placesSeen: ['drift', 'mangrove', 'lagoon', 'channel'],
      narrated: [...lifeAt('channel', 0, 0).narrated, 'narr.c3.start', 'narr.c3.bar'],
    };
    await continueLife(page, lifeAt('channel', 220, 1300, seen), 'channel');
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(
      () => window.__lvdc?.player()?.narration === 'narr.c1.closed',
      null,
      {
        timeout: 30_000,
      },
    );
    await page.keyboard.up('ArrowLeft');
    expect((await page.evaluate(() => window.__lvdc?.player()))?.area).toBe('channel');

    const done = lifeAt('channel', 220, 1300, {
      ...seen,
      stepsDone: [...CHAPTER_2_DONE, 's3.tide', 's3.fish2'],
    });
    await continueLife(page, done, 'channel');
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'shadow', null, {
      timeout: 30_000,
    });
    await page.keyboard.up('ArrowLeft');
    // The shadow begins with no line of its own: only its name.
    expect(await narration(page)).not.toBe('narr.c1.arrive');
  });
});
