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
    // The Supabase client may only be touched by the data layer (src/lib and the
    // feature *.api.ts modules) plus AuthProvider. Keeping this boundary tight is
    // what makes a future backend migration a ~6-file rewrite instead of an
    // app-wide one — don't poke holes in it.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/**', 'src/features/**/*.api.ts', 'src/providers/AuthProvider.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase',
              message:
                'Screens/components must go through the feature *.api.ts modules (or src/lib helpers), never the Supabase client directly.',
            },
            {
              name: '@supabase/supabase-js',
              message: 'Only the data layer (src/lib, *.api.ts, AuthProvider) may depend on supabase-js.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
