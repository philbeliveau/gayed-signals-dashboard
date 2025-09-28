const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/utils/testUtilities.tsx'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  // Transform ES6 modules from @clerk and other packages
  transformIgnorePatterns: [
    'node_modules/(?!(@clerk|socket\\.io|@testing-library)/)'
  ],
  // Module name mapping for ES6 compatibility
  moduleNameMapper: {
    '^@clerk/(.*)$': '@clerk/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Support ES6 modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
}

module.exports = createJestConfig(customJestConfig)
