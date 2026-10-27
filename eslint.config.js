import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-server', 'public-original', 'public-optimized']),

  // Browser / React source
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },

  // Express API — CommonJS, Node globals.
  {
    files: ['server/**/*.js', 'api/**/*.js'],
    ignores: ['server/**/*.test.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'commonjs' },
    },
    rules: {
      // Express identifies error handlers by arity, so the trailing `next`
      // has to stay even when the handler never calls it.
      'no-unused-vars': ['error', { argsIgnorePattern: '^(next|_)' }],
    },
  },

  // Root-level Node tooling — ESM, Node globals.
  {
    files: [
      'server.js',
      'vite.config.js',
      'vitest.config.js',
      'eslint.config.js',
      'scripts/**/*.mjs',
      'server/**/*.test.js',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
  },
])
