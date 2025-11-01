/**
 * Jest Configuration for Integration Tests
 * Story: 4.0g - Integration Testing Suite
 *
 * Optimized for integration testing with Railway PostgreSQL and Redis
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],

  // Only run integration tests
  testMatch: ['**/__tests__/integration/**/*.test.ts'],

  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  globalTeardown: '<rootDir>/src/__tests__/helpers/teardown.ts',

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: './coverage/integration',
  collectCoverageFrom: [
    'services/**/*.ts',
    'validators/**/*.ts',
    'repositories/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/__tests__/**',
    '!**/generated/**',
    '!src/**/index.ts',
  ],

  // Coverage thresholds (Story requirement: >90% line, >85% branch)
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    // Critical components require higher coverage
    './src/lib/data-pipeline/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
    './repositories/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
    './services/': {
      statements: 92,
      branches: 87,
      functions: 92,
      lines: 92,
    },
  },

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Timeouts for integration tests
  testTimeout: 30000,  // 30 seconds per test

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'integration-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'Integration Test Report',
        outputPath: './test-results/integration-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
        sort: 'status',
        executionTimeWarningThreshold: 5,
      },
    ],
  ],

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles (helps find resource leaks)
  detectOpenHandles: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Cache
  cache: true,
  cacheDirectory: '.jest-cache',
};
