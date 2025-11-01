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
    '<rootDir>/src/__tests__/utils/testUtilities.tsx',
    // Legacy AutoGen tests (deprecated)
    '<rootDir>/__tests__/lib/autogen-client.test.ts',
    '<rootDir>/__tests__/lib/video-insights-autogen.test.ts',
    '<rootDir>/src/__tests__/integration/autoGenWebSocketBridge.test.ts',
    // Legacy API tests (auth issues, not core pipeline)
    '<rootDir>/__tests__/api/substack-content-extraction.test.ts',
    // Component/UI tests (not data pipeline critical)
    '<rootDir>/src/__tests__/components/',
    // Agent tests (old patterns, being restructured)
    '<rootDir>/src/__tests__/domains/ai-agents/agents/market-context-agent.test.ts',
    '<rootDir>/src/__tests__/domains/ai-agents/agents/market-context-agent.integration.test.ts',
    '<rootDir>/src/domains/ai-agents/__tests__/conversationOrchestrator.test.ts',
    '<rootDir>/src/domains/ai-agents/agents/agents/__tests__/risk-challenger-agent.test.ts',
    // Store tests (UI layer, not data integrity)
    '<rootDir>/src/__tests__/stores/',
    // Conversation API tests (not data pipeline)
    '<rootDir>/src/__tests__/api/conversations/'
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
