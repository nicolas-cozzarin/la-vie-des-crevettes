import { expect, test } from '@playwright/test';

// Painters draw on a canvas, so only a browser can run them. This opens the
// atelier, which paints every picture and composes every scene.
test('the atelier paints every picture and every scene without errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('./atelier.html');
  await page.waitForSelector('body[data-ready="true"]', { timeout: 150_000 });

  expect(errors).toEqual([]);
  expect(await page.locator('.scene canvas').count()).toBe(10);
  for (const name of ['shrimp.carapace', 'mangrove.root.a', 'mangrove.clump', 'crab.claw']) {
    await expect(page.locator(`figure[data-name="${name}"]`).first()).toBeAttached();
  }
});

test('the atelier shows one place when asked', async ({ page }) => {
  await page.goto('./atelier.html?view=620,2000');
  await page.waitForSelector('body[data-ready="true"]');
  expect(await page.locator('.scene canvas').count()).toBe(1);
});
