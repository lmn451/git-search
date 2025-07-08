const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  // It's a good practice to start with ESLint's recommended rules.
  js.configs.recommended,

  {
    // This configuration object applies to all files.
    languageOptions: {
      ecmaVersion: 2018,
      // The project uses CommonJS modules (require/module.exports).
      sourceType: "commonjs",
      parserOptions: {
        ecmaFeatures: {
          // This was enabled in the old config, keeping for parity.
          jsx: true,
        },
      },
      // Define the global variables available in the project.
      globals: {
        ...globals.node, // Globals for Node.js environment
        ...globals.mocha, // Globals for Mocha testing framework
      },
    },

    // Define custom rules. These are ported from the old .eslintrc.json.
    rules: {
      "no-const-assign": "warn",
      "no-this-before-super": "warn",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "warn",
      "valid-typeof": "warn",
    },

    // Specify files and directories to be ignored by ESLint.
    ignores: [
      "node_modules/",
      "dist/",
      "*.vsix", // Ignore packaged extension files
      "assets/", // Ignore binary assets
    ],
  },
];
