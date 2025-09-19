/* eslint-env node */
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.vscode-test/**',
      '**/coverage/**',
      'assets/**'
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    rules: {
      // Keep most rules as warnings to avoid failing the lint step while modernizing
      'no-const-assign': 'warn',
      'no-this-before-super': 'warn',
      'no-undef': 'warn',
      'no-unreachable': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'constructor-super': 'warn',
      'valid-typeof': 'warn',
    },
  },
];
