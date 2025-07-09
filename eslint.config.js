import globals from "globals";

/**
 * ESLint 9+ Flat Config
 * - Node.js globals for all code
 * - Mocha globals only for test files
 * - Modern parser options and rule mapping
 *
 * Install: npm install --save-dev globals
 */

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-const-assign": "warn",
      "no-this-before-super": "warn",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "warn",
      "valid-typeof": "warn",
    },
  },
  {
    // Mocha globals only inside tests
    files: ["test/**/*", "tests/**/*", "**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
];
