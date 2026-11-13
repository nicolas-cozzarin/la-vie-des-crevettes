import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/la-vie-des-crevettes/`;

// The browser test runs against the built game, so run `npm run build` first.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
  },
});
