import { expect, test, type Page } from '@playwright/test';

/** Release 0.2: the lagoon, chapter 2 (doc 08). */

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

async function openLagoon(page: Page, query = ''): Promise<void> {
  await page.goto(`./?explore=lagoon${query}`);
  await waitForScene(page, 'Play');
  await page.waitForFunction(() => window.__lvdc?.day() != null);
}

const day = (page: Page) => page.evaluate(() => window.__lvdc?.day() ?? null);

/** A life kept at the mangrove's creek mouth, after its first molt. */
const AT_THE_CREEK = {
  v: 1,
  generation: 1,
  area: 'mangrove',
  stage: 'juvenile',
  at: { x: 260, y: 2000 },
  stepsDone: ['s0.motes', 's0.brown', 's1.fill', 's1.sense', 's1.bird', 's1.greet', 's1.molt'],
  bonds: {},
  discoveries: ['place.drift', 'place.mangrove'],
  challenges: {},
  achievements: [],
  stats: {},
  playSeconds: 900,
  pinned: null,
  moodsNamed: [],
  promptsShown: {},
  cardsUnlocked: [],
  narrated: ['narr.c1.arrive'],
  placesSeen: ['drift', 'mangrove'],
  molts: 1,
  hunger: 0.3,
  favourite: null,
  journalSeen: [],
};

test.describe('into the lagoon', () => {
  test('after the molt, the creek mouth leads on into the lagoon, by day', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('./');
    await waitForScene(page, 'Title');
    await page.evaluate((save) => {
      localStorage.setItem('lvdc.save.v1', JSON.stringify(save));
    }, AT_THE_CREEK);
    await page.reload();
    await waitForScene(page, 'Title');
    // Continue.
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'mangrove');
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'lagoon', null, {
      timeout: 30_000,
    });
    await page.keyboard.up('ArrowLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.narration === 'narr.c2.arrive');
    expect((await day(page))?.phase).toBe('day');
    // The lagoon begins its own hunger, and the life is kept at its start.
    const kept = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('lvdc.save.v1') ?? '{}'),
    );
    expect(kept.area).toBe('lagoon');
    expect(kept.stage).toBe('subAdult');
    expect(errors).toEqual([]);
  });
});

test.describe('day and night', () => {
  test('with ?debug, F7 moves the day on: gold at dusk, dark at night, fewer threats', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openLagoon(page, '&debug');
    expect((await day(page))?.phase).toBe('day');
    expect((await day(page))?.ambient).toBe(1);
    await page.keyboard.press('F7');
    await page.waitForFunction(() => (window.__lvdc?.day()?.dusk ?? 0) > 0.4);
    expect((await day(page))?.phase).toBe('dusk');
    await page.keyboard.press('F7');
    await page.waitForFunction(() => (window.__lvdc?.day()?.night ?? 0) > 0.6);
    const night = await day(page);
    expect(night?.phase).toBe('night');
    expect(night?.ambient).toBe(0.5);
    expect(night?.light.caustics).toBeLessThan(0.3);
    await page.keyboard.press('F7');
    expect((await day(page))?.ambient).toBe(2);
    expect(errors).toEqual([]);
  });

  test('at night the plankton lights up in the wake, and the first time is found', async ({
    page,
  }) => {
    await openLagoon(page, '&time=night&at=6000,4400');
    expect((await day(page))?.plankton).toBeGreaterThan(50);
    await page.keyboard.down('ArrowLeft');
    await page.waitForFunction(() =>
      window.__lvdc?.feelings()?.discovered.includes('thing.glowingPlankton'),
    );
    await page.keyboard.up('ArrowLeft');
    expect((await day(page))?.lit).toBeGreaterThan(0);
  });
});

const player = (page: Page) => page.evaluate(() => window.__lvdc?.player() ?? null);

test.describe('burrowing and resting', () => {
  test('holding Hide on open sand digs the shrimp in, and letting go brings it out', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openLagoon(page, '&at=5200,2600');
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'burrowing');
    await page.waitForFunction(
      () =>
        window.__lvdc?.player()?.tucked === true &&
        window.__lvdc?.feelings()?.conditions.includes('burrowed'),
    );
    await page.keyboard.up('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'free');
    expect((await player(page))?.tucked).toBe(false);
    expect(errors).toEqual([]);
  });

  test('dug in and calm, E rests until dusk, and dusk wakes the shrimp', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await openLagoon(page, '&at=5200,2600');
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.tucked === true);
    // Calm for a few seconds and comfortable enough, the rest is offered.
    await page.waitForFunction(() => window.__lvdc?.player()?.prompt === 'prompt.rest', null, {
      timeout: 60_000,
    });
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'resting');
    // Resting needs no key held.
    await page.keyboard.up('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.day()?.phase === 'dusk', null, {
      timeout: 40_000,
    });
    await page.waitForFunction(() => window.__lvdc?.player()?.activity !== 'resting');
    expect(errors).toEqual([]);
  });
});
