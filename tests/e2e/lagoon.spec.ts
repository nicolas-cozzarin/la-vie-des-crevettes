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

  test('a full graze at night in the bright shallows is a graze under the plankton', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    // A life a little hungry, on the golden film in zone F, where the plankton is thickest (T109).
    // One film takes off a quarter of the hunger, so this one meal ends full.
    await page.goto('./?debug');
    await waitForScene(page, 'Title');
    await page.evaluate((save) => localStorage.setItem('lvdc.save.v1', JSON.stringify(save)), {
      ...AT_THE_CREEK,
      area: 'lagoon',
      at: { x: 5700, y: 4300 },
      hunger: 0.3,
      narrated: ['narr.c1.arrive', 'narr.c2.arrive', 'narr.c2.sand', 'narr.c2.dusk'],
      placesSeen: ['drift', 'mangrove', 'lagoon'],
    });
    await page.reload();
    await waitForScene(page, 'Title');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'lagoon');
    for (const phase of ['dusk', 'night']) {
      await page.keyboard.press('F7');
      await page.waitForFunction((want) => window.__lvdc?.day()?.phase === want, phase);
    }
    await page.keyboard.down('KeyE');
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'grazing');
    // Full, the shrimp stops grazing by itself.
    await page.waitForFunction(() => window.__lvdc?.player()?.activity === 'free', null, {
      timeout: 40_000,
    });
    await page.keyboard.up('KeyE');
    const progress = await page.evaluate(() => window.__lvdc?.progress() ?? null);
    expect((await day(page))?.phase).toBe('night');
    expect(progress?.stats.nightMeals).toBe(1);
    expect(progress?.stats.glowMeals).toBe(1);
    expect(progress?.challenges['c2.glow']).toBe(1);
    expect(errors).toEqual([]);
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

const threat = (page: Page) => page.evaluate(() => window.__lvdc?.threat() ?? null);

/** Keeps every stage the threat goes through, as the page draws. */
async function recordStages(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { stagesSeen: string[] }).stagesSeen = seen;
    const look = () => {
      const stage = window.__lvdc?.threat()?.stage;
      if (stage && seen[seen.length - 1] !== stage) seen.push(stage);
      requestAnimationFrame(look);
    };
    look();
  });
  return () => page.evaluate(() => (window as unknown as { stagesSeen: string[] }).stagesSeen);
}

test.describe('the hunting fish', () => {
  test('with ?debug, F10 brings it; a shrimp dug in is not seen, and it passes on', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await openLagoon(page, '&at=5200,2600&debug');
    await page.keyboard.down('ShiftLeft');
    await page.waitForFunction(() => window.__lvdc?.player()?.tucked === true);
    const stages = await recordStages(page);
    await page.keyboard.press('F10');
    await page.waitForFunction(() => window.__lvdc?.threat()?.fish != null);
    expect((await threat(page))?.kind).toBe('fish');
    await page.waitForFunction(() => window.__lvdc?.threat()?.stage === 'idle', null, {
      timeout: 60_000,
    });
    await page.keyboard.up('ShiftLeft');
    expect(await stages()).toEqual(['idle', 'cue', 'presence', 'release', 'idle']);
    expect((await threat(page))?.strikes).toBe(0);
    expect(
      await page.evaluate(() =>
        window.__lvdc?.feelings()?.discovered.includes('creature.huntingFish'),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

  test('swimming near it brings the chase: it faces, holds still, and charges', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await openLagoon(page, '&at=5200,2600&debug');
    const stages = await recordStages(page);
    await page.keyboard.press('F10');
    // Swimming toward it is what it notices. A fish that leaves unnoticed is called again.
    let held: string | null = null;
    await expect
      .poll(
        async () => {
          const now = await threat(page);
          if (now?.stage === 'idle') await page.keyboard.press('F10');
          const me = await player(page);
          let key: string | null = null;
          if (now?.stage === 'presence' && now.fish && me) {
            const dx = now.fish.x - me.x;
            const dy = now.fish.y - me.y;
            key =
              Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'KeyD' : 'KeyA') : dy > 0 ? 'KeyS' : 'KeyW';
          }
          if (key !== held) {
            if (held) await page.keyboard.up(held);
            if (key) await page.keyboard.down(key);
            held = key;
          }
          return now?.stage;
        },
        { timeout: 60_000, intervals: [200] },
      )
      .toBe('chase');
    if (held) await page.keyboard.up(held);
    try {
      await page.waitForFunction(() => (window.__lvdc?.threat()?.fish?.charges ?? 0) >= 1, null, {
        timeout: 20_000,
      });
    } catch (error) {
      // Says what the fish and the shrimp were doing, for a failure seen only on a slow machine.
      const fish = (await threat(page))?.fish;
      const me = await player(page);
      const feel = await page.evaluate(() => window.__lvdc?.feelings()?.conditions);
      throw new Error(
        `No charge. Stages ${JSON.stringify(await stages())}, fish ${JSON.stringify(fish)}, ` +
          `player ${JSON.stringify(me)}, conditions ${JSON.stringify(feel)}.`,
        { cause: error },
      );
    }
    expect(await stages()).toContain('chase');
    expect(errors).toEqual([]);
  });
});

test.describe('the turtle', () => {
  test('glides through the meadow and crops; its first shadow startles, once', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.goto('./');
    await waitForScene(page, 'Title');
    await page.evaluate((save) => localStorage.setItem('lvdc.save.v1', JSON.stringify(save)), {
      ...AT_THE_CREEK,
      area: 'lagoon',
      stage: 'subAdult',
      // In the meadow, just ahead of the turtle on its way to its first clump.
      at: { x: 4250, y: 820 },
      narrated: ['narr.c1.arrive', 'narr.c2.arrive', 'narr.c2.sand', 'narr.c2.dusk'],
      placesSeen: ['drift', 'mangrove', 'lagoon'],
    });
    await page.reload();
    await waitForScene(page, 'Title');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'lagoon');
    const turtle = () =>
      page.evaluate(
        () => window.__lvdc?.creatures()?.animals.find((one) => one.id === 'turtle') ?? null,
      );
    const start = await turtle();
    expect(start?.state).toBe('glide');
    await page.waitForFunction(
      () => window.__lvdc?.player()?.narration === 'narr.c2.turtle',
      null,
      {
        timeout: 30_000,
      },
    );
    const stats = () => page.evaluate(() => window.__lvdc?.progress()?.stats ?? {});
    expect((await stats()).turtleShadow).toBe(1);
    expect((await page.evaluate(() => window.__lvdc?.feelings()?.conditions)) ?? []).toContain(
      'wary',
    );
    // It stops at the clump ahead and crops, its head in the blades.
    await page.waitForFunction(
      () =>
        window.__lvdc?.creatures()?.animals.find((one) => one.id === 'turtle')?.state === 'crop',
      null,
      { timeout: 30_000 },
    );
    const cropping = await turtle();
    expect(cropping && start && cropping.x < start.x).toBe(true);
    // Staying beside it counts toward following it.
    expect(
      await page.evaluate(() => window.__lvdc?.progress()?.challenges['c2.turtle'] ?? 0),
    ).toBeGreaterThan(0);
    expect((await stats()).turtleShadow).toBe(1);
    expect(errors).toEqual([]);
  });
});

test.describe('the pistol shrimp and the goby', () => {
  test('let a still shrimp find them; a tail flip sends them in, and they come back', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await page.goto('./');
    await waitForScene(page, 'Title');
    await page.evaluate((save) => localStorage.setItem('lvdc.save.v1', JSON.stringify(save)), {
      ...AT_THE_CREEK,
      area: 'lagoon',
      stage: 'subAdult',
      // A little over 2 BL from the burrow's mouth, in the rock garden.
      at: { x: 3520, y: 4270 },
      narrated: ['narr.c1.arrive', 'narr.c2.arrive', 'narr.c2.sand', 'narr.c2.dusk'],
      placesSeen: ['drift', 'mangrove', 'lagoon'],
    });
    await page.reload();
    await waitForScene(page, 'Title');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'lagoon');
    const pair = () =>
      page.evaluate(
        () =>
          window.__lvdc?.creatures()?.animals.find((one) => one.id === 'pistolAndGoby')?.state ??
          null,
      );
    // Watching them, the line comes after the curious mood's own and the quiet between lines.
    await page.waitForFunction(() => window.__lvdc?.player()?.narration === 'narr.c2.door', null, {
      timeout: 50_000,
    });
    expect(
      await page.evaluate(() =>
        window.__lvdc?.feelings()?.discovered.includes('creature.pistolAndGoby'),
      ),
    ).toBe(true);
    expect(await pair()).not.toBe('in');
    // A tail flip close by: the goby flicks its tail and both are gone.
    await page.keyboard.down('KeyD');
    await page.keyboard.press('Space');
    await page.keyboard.up('KeyD');
    await page.waitForFunction(
      () =>
        window.__lvdc?.creatures()?.animals.find((one) => one.id === 'pistolAndGoby')?.state ===
        'in',
    );
    // After 6 s of calm they are back.
    await page.waitForFunction(
      () =>
        window.__lvdc?.creatures()?.animals.find((one) => one.id === 'pistolAndGoby')?.state !==
        'in',
      null,
      { timeout: 20_000 },
    );
    expect(errors).toEqual([]);
  });
});

test.describe("the lagoon's small things", () => {
  test('the sand volcanoes puff, the crackle is heard by staying, shed shells lie in the weed', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    const found = (id: string) =>
      page.evaluate((want) => window.__lvdc?.feelings()?.discovered.includes(want) ?? false, id);
    await openLagoon(page, '&at=5150,2330');
    await page.waitForFunction(() => (window.__lvdc?.creatures()?.puffing ?? []).length > 0, null, {
      timeout: 30_000,
    });
    // The crackle of the rock garden: not at once, but after 3 s there.
    await openLagoon(page, '&at=3000,4050');
    expect(await found('thing.crackle')).toBe(false);
    await page.waitForFunction(
      () => window.__lvdc?.feelings()?.discovered.includes('thing.crackle'),
      null,
      { timeout: 10_000 },
    );
    // A shed shell in the weed bank.
    await openLagoon(page, '&at=800,4380');
    await page.waitForFunction(
      () => window.__lvdc?.feelings()?.discovered.includes('thing.shedShell'),
      null,
      { timeout: 10_000 },
    );
    expect(errors).toEqual([]);
  });
});

test.describe('the dawn fish', () => {
  test('in the story, the first dawn brings the fish in from the pass', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await page.goto('./?debug');
    await waitForScene(page, 'Title');
    await page.evaluate((save) => localStorage.setItem('lvdc.save.v1', JSON.stringify(save)), {
      ...AT_THE_CREEK,
      area: 'lagoon',
      stage: 'subAdult',
      at: { x: 7500, y: 2650 },
      narrated: ['narr.c1.arrive', 'narr.c2.arrive'],
      placesSeen: ['drift', 'mangrove', 'lagoon'],
    });
    await page.reload();
    await waitForScene(page, 'Title');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'lagoon');
    await page.waitForFunction(() => window.__lvdc?.day() != null);
    // Dusk, night, then dawn.
    for (const phase of ['dusk', 'night', 'dawn']) {
      await page.keyboard.press('F7');
      await page.waitForFunction((want) => window.__lvdc?.day()?.phase === want, phase);
    }
    await page.waitForFunction(() => window.__lvdc?.threat()?.kind === 'fish', null, {
      timeout: 10_000,
    });
    // It comes from the west, where the pass is.
    const fish = (await threat(page))?.fish;
    const me = await player(page);
    expect(fish && me && fish.x < me.x).toBe(true);
    expect(errors).toEqual([]);
  });
});

test.describe("a companion's molt", () => {
  test('with ?debug, Shift and F8: she finds cover and molts, and staying close counts', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const errors = watchErrors(page);
    await page.goto('./?debug');
    await waitForScene(page, 'Title');
    await page.evaluate((save) => localStorage.setItem('lvdc.save.v1', JSON.stringify(save)), {
      ...AT_THE_CREEK,
      area: 'lagoon',
      stage: 'subAdult',
      // At the edge of the meadow, above the shoal's ground, where Brise rests.
      at: { x: 4200, y: 1700 },
      bonds: { brise: 0.3 },
      // A life this far on has met others and named its moods in chapter 1. Without
      // them, those must lines came first and her line could lose its turn until
      // she had hardened (doc 12: a line that is not a must line waits 20 s).
      moodsNamed: ['calm', 'hungry', 'content', 'curious', 'social', 'afraid'],
      narrated: [
        'narr.c1.arrive',
        'narr.c1.meet',
        'narr.c2.arrive',
        'narr.c2.sand',
        'narr.c2.dusk',
      ],
      placesSeen: ['drift', 'mangrove', 'lagoon'],
    });
    await page.reload();
    await waitForScene(page, 'Title');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lvdc?.player()?.area === 'lagoon');
    await page.waitForFunction(() => window.__lvdc?.day() != null);
    for (const phase of ['dusk', 'night']) {
      await page.keyboard.press('F7');
      await page.waitForFunction((want) => window.__lvdc?.day()?.phase === want, phase);
    }
    const brise = () =>
      page.evaluate(() => window.__lvdc?.shrimp()?.find((one) => one.id === 'brise') ?? null);
    await page.keyboard.press('Shift+F8');
    await page.waitForFunction(() =>
      window.__lvdc?.shrimp()?.some((one) => one.id === 'brise' && one.molt === 'signal'),
    );
    // She walks to the seagrass and tucks in, then molts.
    await page.waitForFunction(
      () => window.__lvdc?.shrimp()?.some((one) => one.id === 'brise' && one.molt === 'molt'),
      null,
      { timeout: 30_000 },
    );
    expect((await brise())?.activity).toBe('hiding');
    await page.waitForFunction(
      () => window.__lvdc?.player()?.narration === 'narr.c2.herMolt',
      null,
      {
        timeout: 60_000,
      },
    );
    await page.waitForFunction(
      () => window.__lvdc?.shrimp()?.some((one) => one.id === 'brise' && one.molt === 'none'),
      null,
      { timeout: 60_000 },
    );
    const stats = await page.evaluate(() => window.__lvdc?.progress()?.stats ?? {});
    expect(stats.stayedThroughMolt).toBe(1);
    expect(stats['stayedWith.brise']).toBe(1);
    expect((await brise())?.bond).toBeCloseTo(0.45);
    expect(errors).toEqual([]);
  });
});
