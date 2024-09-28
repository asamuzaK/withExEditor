import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import nounsanitized from 'eslint-plugin-no-unsanitized';
import regexp from 'eslint-plugin-regexp';
import unicorn from 'eslint-plugin-unicorn';
import neostandard, { plugins as neostdplugins } from 'neostandard';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  {
    ignores: ['src/js', 'src/lib', 'src/web-ext-config.cjs', '**/bundle/']
  },
  jsdoc.configs['flat/recommended'],
  nounsanitized.configs.recommended,
  regexp.configs['flat/recommended'],
  ...compat.env({
    browser: true,
    es6: true,
    node: true,
    webextensions: true
  }),
  ...neostandard({
    semi: true
  }),
  {
    plugins: {
      '@stylistic': neostdplugins['@stylistic'],
      'import-x': importX,
      nounsanitized,
      regexp,
      unicorn
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'import-x/order': ['error', {
        alphabetize: {
          order: 'ignore',
          caseInsensitive: false
        }
      }],
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'always',
        asyncArrow: 'always',
        named: 'never'
      }],
      'no-await-in-loop': 'error',
      'no-use-before-define': ['error', {
        allowNamedExports: false,
        classes: true,
        functions: true,
        variables: true
      }],
      // semi: ['error', 'always'],
      'space-before-function-paren': ['error', {
        anonymous: 'always',
        asyncArrow: 'always',
        named: 'never'
      }],
      'unicorn/prefer-node-protocol': 'error'
    }
  }
];
