import { expect, test, type Page } from '@playwright/test';

/** Release 0.3: the open sea, chapter 5, and the next generation (doc 08; T123). */

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

const CHAPTER_4_DONE = [
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
  's4.net',
  's4.shoal',
];

/**
 * A life kept in the open sea, come from the shadow. What it has said
 * already: the first lines of each place, the first meeting, the molts and
 * the moods. Without them those must lines come first, and a later line
 * waits its turn.
 */
function lifeAt(x: number, y: number, more: Record<string, unknown> = {}) {
  return {
    v: 1,
    generation: 1,
    area: 'openSea',
    stage: 'adult',
    at: { x, y },
    stepsDone: CHAPTER_4_DONE,
    bonds: { nacre: 0.6 },
    discoveries: [
      'place.drift',
      'place.mangrove',
      'place.lagoon',
      'place.channel',
      'place.shadow',
      'place.openSea',
    ],
    challenges: {},
    achievements: [],
    stats: { 'released.channel.fish': 2, 'released.shadow.net': 1, 'missing.lagoon': 1 },
    playSeconds: 5000,
    pinned: null,
    moodsNamed: ['calm', 'hungry', 'content', 'curious', 'social', 'afraid'],
    promptsShown: {},
    cardsUnlocked: [],
    narrated: [
      'narr.c1.arrive',
      'narr.c1.meet',
      'narr.c1.tight',
      'narr.c1.molt',
      'narr.c1.soft',
      'narr.c1.hard',
      'narr.c1.salt',
      'narr.c1.cover',
      'narr.c2.arrive',
      'narr.c2.sand',
      'narr.c2.dusk',
      'narr.c2.lean',
      'narr.c3.start',
      'narr.c3.bar',
      'narr.c4.sound',
      'narr.c4.after',
      'narr.c4.all',
    ],
    placesSeen: ['drift', 'mangrove', 'lagoon', 'channel', 'shadow', 'openSea'],
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
  await page.waitForFunction(() => window.__lvdc?.player()?.area === 'openSea');
}

const narrationIs = (page: Page, key: string, timeout = 60_000) =>
  page.waitForFunction((line) => window.__lvdc?.player()?.narration === line, key, { timeout });

const hasStep = (page: Page, id: string, timeout = 60_000) =>
  page.waitForFunction((step) => window.__lvdc?.player()?.steps.includes(step), id, { timeout });

test.describe('chapter 5, the open sea', () => {
  test('the last shell: the molt under the ledge, then down into the blue', async ({ page }) => {
    // The molt alone is 41 s of the game's time, which runs at about half speed on CI.
    test.setTimeout(300_000);
    const errors = watchErrors(page);
    // Beside the ledge's open side. The molt signal comes a while after arriving.
    await continueLife(page, lifeAt(5420, 3250));
    await narrationIs(page, 'narr.c5.last', 60_000);
    await page.keyboard.down('ShiftLeft');
    await hasStep(page, 's5.molt', 150_000);
    await page.keyboard.up('ShiftLeft');
    expect((await page.evaluate(() => window.__lvdc?.progress()))?.achievements).toContain(
      'fullGrown',
    );
    // Out over the edge of the shelf, into the blue.
    await page.keyboard.down('ArrowLeft');
    await hasStep(page, 's5.blue', 30_000);
    await page.keyboard.up('ArrowLeft');
    await narrationIs(page, 'narr.c5.edge', 30_000);
    expect(errors).toEqual([]);
  });

  test('still in the gathering, she spawns; one egg opens, and the next life begins in the Drift', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    await continueLife(
      page,
      lifeAt(3200, 3050, {
        stepsDone: [...CHAPTER_4_DONE, 's5.molt', 's5.blue'],
        molts: 3,
        narrated: [...lifeAt(0, 0).narrated, 'narr.c5.last', 'narr.c5.edge', 'narr.c5.others'],
      }),
    );
    await hasStep(page, 's5.spawn', 30_000);
    await narrationIs(page, 'narr.c5.spawn', 30_000);
    expect((await page.evaluate(() => window.__lvdc?.progress()))?.stats.spawned).toBe(1);
    await narrationIs(page, 'narr.c5.one', 60_000);
    await waitForScene(page, 'Drift');
    await page.waitForFunction(() => window.__lvdc?.drift() != null, null, { timeout: 30_000 });
    const kept = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('lvdc.save.v1') ?? '{}'),
    );
    expect(kept.generation).toBe(2);
    expect(kept.area).toBe('drift');
    expect(kept.stepsDone).toEqual([]);
    expect(kept.achievements).toContain('nextOnes');
    expect(kept.achievements).toContain('secondTide');
    expect(kept.cardsUnlocked).toContain('nextOnes');
    // What one life counted toward its own story does not carry into the next.
    expect(kept.stats['released.channel.fish']).toBeUndefined();
    expect(kept.stats['missing.lagoon']).toBeUndefined();
    expect(errors).toEqual([]);
  });
});
