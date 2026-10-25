'use strict';

var js = require('@eslint/js');
var stylistic = require('@stylistic/eslint-plugin');
var globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['lib/**/*.js'],
    languageOptions: {
      // the library is shipped without transpiling, so keep it ES2022
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: Object.assign({}, globals.node, globals.browser)
    },
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      'camelcase': 2,
      'curly': 2,
      'default-case': 2,
      'eqeqeq': 2,
      'guard-for-in': 2,
      'new-cap': 0,
      'no-console': 0,
      'no-debugger': 2,
      'no-empty': 2,
      'no-nested-ternary': 2,
      'no-undefined': 2,
      'no-underscore-dangle': 0,
      'no-unreachable': 2,
      'no-var': 2,
      'prefer-const': 2,
      'radix': 2,
      '@stylistic/brace-style': [2, '1tbs'],
      '@stylistic/comma-style': [2, 'last'],
      '@stylistic/indent': [2, 2],
      '@stylistic/keyword-spacing': ['error', { 'before': true }],
      '@stylistic/no-floating-decimal': 2,
      '@stylistic/quotes': [2, 'single'],
      '@stylistic/space-before-blocks': 2,
      // `catch (e)` spacing is covered by keyword-spacing
      '@stylistic/space-before-function-paren': [2, { anonymous: 'never', named: 'never', asyncArrow: 'never', catch: 'ignore' }],
      '@stylistic/spaced-comment': [2, 'always', { exceptions: ['-'] }],
      '@stylistic/wrap-iife': [2, 'any']
    }
  }
];
