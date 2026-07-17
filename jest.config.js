/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  // The perf-critical logic under test is plain TS; the RN preset still gives us
  // the right transforms for the `@/` graph without any native module loading.
};
