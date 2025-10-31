module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'services/**/*.ts',
    'validators/**/*.ts',
    'repositories/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
