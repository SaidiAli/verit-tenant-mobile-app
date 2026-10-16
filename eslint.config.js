// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { files: ['tests/**/*.cjs'], languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly', process: 'readonly', console: 'readonly', setTimeout: 'readonly', AbortController: 'readonly', FormData: 'readonly' } } },
  {
    ignores: ['dist/*'],
  },
]);
