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

async function openGame(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForFunction(() => window.__lvdc?.scenes().includes('Title'));
}

test('the title screen loads without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await openGame(page);
  expect(errors).toEqual([]);
});

test.describe('in a French browser', () => {
  test.use({ locale: 'fr-FR' });

  test('the game is in French', async ({ page }) => {
    await openGame(page);
    expect(await page.evaluate(() => window.__lvdc?.lang())).toBe('fr');
    await expect(page).toHaveTitle('La vie des crevettes');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});

test.describe('in an English browser', () => {
  test.use({ locale: 'en-GB' });

  test('the game is in English', async ({ page }) => {
    await openGame(page);
    expect(await page.evaluate(() => window.__lvdc?.lang())).toBe('en');
    await expect(page).toHaveTitle('The Life of Shrimp');
  });
});
