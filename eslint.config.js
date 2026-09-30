// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*'],
  },
  {
    // Build-time Node scripts and config plugins.
    files: ['scripts/**/*.js', 'plugins/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]);
