/**
 * Test Helper Utilities
 *
 * Comprehensive set of utilities for integration testing including
 * data generation, mocking, seeding, and assertions.
 */

import type { PrismaClient } from '@prisma/client';
import type { RedisClientType } from 'redis';

// ==================== DATA GENERATION ====================

export interface TestSignal {
  id: string;
  date: string;
  type: 'bullish' | 'bearish' | 'neutral';
  category?: string;
  content?: string;
  confidence?: number;
  source?: string;
}

export interface TestMarketData {
  symbol: string;
  date: string;
  close: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
}

/**
 * Create a test signal with optional overrides
 */
export function createTestSignal(overrides?: Partial<TestSignal>): TestSignal {
  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    date: new Date().toISOString().split('T')[0],
    type: 'bullish',
    category: 'market',
    content: 'Test signal content',
    confidence: 0.85,
    source: 'test',
    ...overrides,
  };
}

/**
 * Generate bulk test signals
 */
export function generateBulkSignals(count: number, overrides?: Partial<TestSignal>): TestSignal[] {
  return Array.from({ length: count }, (_, i) =>
    createTestSignal({
      id: `signal-bulk-${i}`,
      ...overrides,
    })
  );
}

/**
 * Create test market data
 */
export function createTestMarketData(overrides?: Partial<TestMarketData>): TestMarketData {
  const close = Math.random() * 100 + 100; // Price between 100-200
  return {
    symbol: 'SPY',
    date: new Date().toISOString().split('T')[0],
    close,
    volume: Math.floor(Math.random() * 10000000) + 1000000,
    open: close * (1 + (Math.random() - 0.5) * 0.02),
    high: close * (1 + Math.random() * 0.01),
    low: close * (1 - Math.random() * 0.01),
    ...overrides,
  };
}

// ==================== DATABASE SEEDING ====================

/**
 * Seed PostgreSQL with test signals
 */
export async function seedPostgreSQL(
  prisma: PrismaClient,
  signals: TestSignal[]
): Promise<void> {
  await prisma.signal.createMany({
    data: signals.map(signal => ({
      id: signal.id,
      date: new Date(signal.date),
      type: signal.type,
      category: signal.category || 'market',
      content: signal.content || '',
      confidence: signal.confidence || 0.85,
      source: signal.source || 'test',
    })),
    skipDuplicates: true,
  });
}

/**
 * Seed Redis cache with test data
 */
export async function seedRedisCache(
  redis: RedisClientType,
  key: string,
  data: any,
  ttl?: number
): Promise<void> {
  const serialized = JSON.stringify(data);
  if (ttl) {
    await redis.setEx(key, ttl, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

// ==================== MOCKING ====================

export interface MockAPIOptions {
  shouldFail?: boolean;
  delayMs?: number;
  responseData?: any;
  errorMessage?: string;
}

/**
 * Create mock API response
 */
export function createMockAPIResponse(options: MockAPIOptions = {}) {
  return {
    ok: !options.shouldFail,
    status: options.shouldFail ? 500 : 200,
    json: async () => {
      if (options.delayMs) {
        await sleep(options.delayMs);
      }
      if (options.shouldFail) {
        throw new Error(options.errorMessage || 'API request failed');
      }
      return options.responseData || { success: true };
    },
  };
}

/**
 * Mock fetch globally for testing
 */
export function mockGlobalFetch(options: MockAPIOptions) {
  const originalFetch = global.fetch;

  global.fetch = jest.fn(() =>
    Promise.resolve(createMockAPIResponse(options) as any)
  );

  return () => {
    global.fetch = originalFetch;
  };
}

// ==================== ASSERTIONS ====================

/**
 * Expect data quality to meet threshold
 */
export function expectDataQuality(data: any[], threshold: number): void {
  const nullCount = data.filter(item => item === null || item === undefined).length;
  const quality = 1 - (nullCount / data.length);

  expect(quality).toBeGreaterThanOrEqual(threshold);
}

/**
 * Expect performance within threshold
 */
export function expectPerformance(durationMs: number, thresholdMs: number): void {
  expect(durationMs).toBeLessThan(thresholdMs);
}

/**
 * Expect response to have standard API structure
 */
export function expectStandardAPIResponse(response: any): void {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('metadata');

  if (response.success) {
    expect(response.metadata).toHaveProperty('timing');
    expect(response.metadata).toHaveProperty('sources');
    expect(response.metadata).toHaveProperty('quality');
  }
}

// ==================== UTILITIES ====================

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate percentile from array of numbers
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Measure execution time of async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startTime;

  return { result, durationMs };
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Generate random date within range
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Export all helpers as a single object
export const testHelpers = {
  // Data generation
  createTestSignal,
  generateBulkSignals,
  createTestMarketData,

  // Database seeding
  seedPostgreSQL,
  seedRedisCache,

  // Mocking
  createMockAPIResponse,
  mockGlobalFetch,

  // Assertions
  expectDataQuality,
  expectPerformance,
  expectStandardAPIResponse,

  // Utilities
  sleep,
  percentile,
  measureExecutionTime,
  retryWithBackoff,
  waitForCondition,
  randomDate,
  formatDate,
};
