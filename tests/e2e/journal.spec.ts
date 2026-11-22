import { expect, test, type Page } from '@playwright/test';

/** Step 9: the carnet, the small line, and the save (doc 12, doc 08). */

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

async function openMangrove(page: Page): Promise<void> {
  await page.goto('./?explore=mangrove');
  await waitForScene(page, 'Play');
  await page.waitForFunction(() => window.__lvdc?.player() !== null);
}

async function journal(page: Page) {
  const snapshot = await page.evaluate(() => window.__lvdc?.journal() ?? null);
  if (!snapshot) throw new Error('The journal is not open.');
  return snapshot;
}

/** A life kept in the mangrove, after the greeting, as the save holds it. */
const SAVE = {
  v: 1,
  generation: 1,
  area: 'mangrove',
  stage: 'juvenile',
  at: { x: 1560, y: 1860 },
  stepsDone: ['s0.motes', 's0.brown', 's1.fill', 's1.sense', 's1.bird', 's1.greet'],
  bonds: { nacre: 0.3 },
  discoveries: ['place.drift', 'place.mangrove', 'food.microalgae', 'thing.seedPod'],
  challenges: { 'c0.motes': 15 },
  achievements: ['landfall'],
  stats: { 'eaten.microalgae': 15, landfalls: 1, 'reached.drift': 1, 'reached.mangrove': 1 },
  playSeconds: 400,
  pinned: null,
  moodsNamed: [],
  promptsShown: {},
  cardsUnlocked: ['toLight'],
  narrated: [],
  placesSeen: ['drift', 'mangrove'],
  molts: 0,
  hunger: 0.3,
  favourite: null,
  journalSeen: [],
};

async function keepLife(page: Page): Promise<void> {
  await page.goto('./');
  await waitForScene(page, 'Title');
  await page.evaluate((save) => localStorage.setItem('lvdc.save.v1', JSON.stringify(save)), SAVE);
  await page.reload();
  await waitForScene(page, 'Title');
}

type Saved = typeof SAVE;
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('lvdc.save.v1') ?? 'null') as Saved | null);

test.describe('the carnet', () => {
  test('opens with its key over the paused game, pins a challenge, and closes', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await openMangrove(page);
    await page.keyboard.press('KeyJ');
    await waitForScene(page, 'Journal');
    expect(await page.evaluate(() => window.__lvdc?.scenes())).not.toContain('Play');
    expect((await journal(page)).page).toBe('discoveries');

    // Right three times: the challenges, only those of the chapter reached.
    for (let turn = 0; turn < 3; turn++) await page.keyboard.press('ArrowRight');
    const page4 = await journal(page);
    expect(page4.page).toBe('challenges');
    expect(page4.entries).toContain('c1.crab');
    expect(page4.entries.every((id) => id.startsWith('c1.'))).toBe(true);

    const at = page4.entries.indexOf('c1.crab');
    for (let step = 0; step < at; step++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect((await journal(page)).pinned).toBe('c1.crab');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__lvdc?.journal() === null);
    await waitForScene(page, 'Play');
    expect(await page.evaluate(() => window.__lvdc?.progress()?.pinned)).toBe('c1.crab');
    expect(errors).toEqual([]);
  });

  test('opens from the pause menu and goes back to it', async ({ page }) => {
    await openMangrove(page);
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Pause');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Journal');
    await page.keyboard.press('ArrowRight');
    expect((await journal(page)).page).toBe('companions');
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Pause');
    await page.keyboard.press('Escape');
    await waitForScene(page, 'Play');
  });

  test('a place found shows its small line', async ({ page }) => {
    await openMangrove(page);
    await page.waitForFunction(() => window.__lvdc?.progress()?.line === 'found.place.mangrove');
  });
});

test.describe('the save', () => {
  test('closing the tab mid-chapter and returning resumes at the last rest', async ({ page }) => {
    const errors = watchErrors(page);
    await keepLife(page);
    // Continue is the first entry when a life is kept.
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Play');
    await page.waitForFunction(() => window.__lvdc?.player() !== null);

    // A rest under cover keeps the life where the shrimp is.
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.tucked === true);
    await page.waitForFunction(() => {
      const save = JSON.parse(localStorage.getItem('lvdc.save.v1') ?? 'null');
      return save !== null && save.playSeconds > 400;
    });
    await page.keyboard.up('ShiftLeft');
    const rest = await saved(page);
    expect(rest?.at).not.toBeNull();
    expect(rest?.stepsDone).toContain('s1.greet');

    // The tab is closed, and opened again.
    await page.reload();
    await waitForScene(page, 'Title');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Play');
    await page.waitForFunction(() => window.__lvdc?.player() !== null);
    const back = await page.evaluate(() => window.__lvdc?.player());
    expect(back?.area).toBe('mangrove');
    expect(back?.explore).toBe(false);
    expect(
      Math.hypot((back?.x ?? 0) - (rest?.at?.x ?? 0), (back?.y ?? 0) - (rest?.at?.y ?? 0)),
    ).toBeLessThan(40);
    expect(back?.steps).toContain('s1.greet');
    expect(errors).toEqual([]);
  });

  test('New life begins in the Drift and keeps the carnet', async ({ page }) => {
    await keepLife(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await waitForScene(page, 'Drift');
    await page.waitForFunction(() => window.__lvdc?.progress() !== null);
    const progress = await page.evaluate(() => window.__lvdc?.progress());
    expect(progress?.discoveries).toContain('thing.seedPod');
    expect(progress?.achievements).toContain('landfall');
    const save = await saved(page);
    expect(save?.area).toBe('drift');
    expect(save?.stepsDone).toEqual([]);
  });
});
