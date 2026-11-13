import { defineConfig } from 'vitest/config';

// The game is served from https://<user>.github.io/la-vie-des-crevettes/,
// so every built path must start with the repository name.
export default defineConfig({
  base: '/la-vie-des-crevettes/',
  build: {
    target: 'es2022',
    // Phaser alone is larger than Vite's default warning size.
    chunkSizeWarningLimit: 1800,
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/content/**/*.test.ts'],
    environment: 'node',
  },
});
