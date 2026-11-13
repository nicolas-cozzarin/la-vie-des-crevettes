import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['*.config.ts', '*.config.js', 'tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Game rules stay free of the engine so they can be unit-tested.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'src/core must not import Phaser.' }],
          patterns: [
            {
              group: ['**/scenes/*', '**/entities/*', '**/systems/*', '**/ui/*', '**/art/*'],
              message: 'src/core must not depend on engine-facing code.',
            },
          ],
        },
      ],
    },
  },
);
