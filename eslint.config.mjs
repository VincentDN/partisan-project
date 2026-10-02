// ESLint (flat config). Browser modules under the demos; Node for tools and tests.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'vendor/**',
      'node_modules/**',
      '_site/**',
      'build/**',
      'assets-incoming/**',
      'docs/archive/**',
      'intro/**',
      'tests/legacy/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['shell.js', 'menu/**', 'workbench/**', 'operator/**', 'viewer/**', 'shared/**', 'assets/js/**'],
    languageOptions: {ecmaVersion: 2023, sourceType: 'module', globals: {...globals.browser}},
    rules: {
      'no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none'}],
      'no-empty': ['error', {allowEmptyCatch: true}],
      'no-prototype-builtins': 'off',
    },
  },
  {
    files: ['tools/**', 'tests/**', 'eslint.config.mjs'],
    languageOptions: {ecmaVersion: 2023, sourceType: 'module', globals: {...globals.node, ...globals.browser}},
    rules: {'no-unused-vars': ['warn', {args: 'none', caughtErrors: 'none'}], 'no-empty': ['error', {allowEmptyCatch: true}]},
  },
];
