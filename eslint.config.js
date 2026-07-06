// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // react-native-reanimated shared values are mutable refs (`sv.value = x`) by
      // design and are React Compiler compatible, but these compiler-oriented rules
      // flag the pattern as false positives. Turn them off project-wide.
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
