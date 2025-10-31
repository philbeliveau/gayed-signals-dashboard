/**
 * Jest test setup
 * Story: 4.0b - Data Persistence Layer
 *
 * Configures test environment and global test utilities
 */

// Set test timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Environment variable validation
if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  throw new Error(
    'DATABASE_URL or TEST_DATABASE_URL must be set for testing. ' +
    'Please configure Railway PostgreSQL connection in .env file.'
  );
}
