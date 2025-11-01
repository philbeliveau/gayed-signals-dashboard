/**
 * Test Helper Utilities
 * Story: 4.0g - Integration Testing Suite
 *
 * Comprehensive test utilities for integration testing
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TestSignalInput {
  id?: string;
  date?: string;
  type?: 'bullish' | 'bearish' | 'neutral';
  category?: string;
  signalValue?: number;
  signalStrength?: number;
  confidenceScore?: number;
}

export interface TestMarketData {
  symbol: string;
  dataType: string;
  timestamp?: Date;
  date?: Date;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: bigint;
}

// ============================================================================
// Test Data Generation
// ============================================================================

/**
 * Create a test signal with sensible defaults
 */
export function createTestSignal(overrides?: TestSignalInput) {
  const date = overrides?.date || new Date().toISOString().split('T')[0];

  return {
    signalName: `test_signal_${overrides?.id || Date.now()}`,
    signalType: overrides?.category || 'timing',
    calculationDate: new Date(date),
    signalValue: overrides?.signalValue ?? 0.75,
    signalStrength: overrides?.signalStrength ?? 0.8,
    confidenceScore: overrides?.confidenceScore ?? 0.95,
    signalStatus: (overrides?.type || 'bullish') as 'bullish' | 'bearish' | 'neutral',
    marketDataIds: [],
    provenanceIds: [],
    calculationVersion: 'v1.0.0-test'
  };
}

/**
 * Generate bulk test signals
 */
export function generateBulkSignals(count: number, baseOverrides?: TestSignalInput) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);

    return createTestSignal({
      ...baseOverrides,
      id: `bulk_${i}`,
      date: date.toISOString().split('T')[0],
      signalValue: 0.5 + (Math.random() * 0.5)
    });
  });
}

/**
 * Create test market data
 */
export function createTestMarketData(overrides?: Partial<TestMarketData>): TestMarketData {
  const date = overrides?.date || new Date();
  const basePrice = 100;

  return {
    symbol: overrides?.symbol || 'TEST',
    dataType: overrides?.dataType || 'price',
    timestamp: overrides?.timestamp || date,
    date: date,
    close: overrides?.close ?? basePrice,
    open: overrides?.open ?? basePrice * 0.99,
    high: overrides?.high ?? basePrice * 1.02,
    low: overrides?.low ?? basePrice * 0.98,
    volume: overrides?.volume ?? BigInt(1000000)
  };
}

// ============================================================================
// Database Seeding
// ============================================================================

/**
 * Seed Railway PostgreSQL with test data
 */
export async function seedRailwayDatabase(prisma: PrismaClient, signals: any[]) {
  for (const signal of signals) {
    await prisma.signalHistory.create({
      data: signal
    });
  }
}

/**
 * Clear test data from Railway database
 */
export async function clearTestData(prisma: PrismaClient) {
  await prisma.signalHistory.deleteMany({
    where: {
      OR: [
        { signalName: { startsWith: 'test_' } },
        { signalName: { startsWith: 'int_test_' } },
        { calculationVersion: 'v1.0.0-test' }
      ]
    }
  });

  await prisma.marketData.deleteMany({
    where: {
      symbol: { in: ['TEST', 'INT_TEST', 'CLEANUP_TEST'] }
    }
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate percentile from array of numbers
 */
export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Wait for condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true;
    }
    await sleep(intervalMs);
  }

  return false;
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ============================================================================
// Assertions
// ============================================================================

/**
 * Assert data quality meets threshold
 */
export function expectDataQuality(data: any[], threshold: number) {
  const validCount = data.filter(item => {
    return item &&
           item.signalValue !== undefined &&
           item.signalValue !== null &&
           !isNaN(item.signalValue);
  }).length;

  const quality = validCount / data.length;
  expect(quality).toBeGreaterThanOrEqual(threshold);
}

/**
 * Assert performance meets threshold
 */
export function expectPerformance(durationMs: number, thresholdMs: number) {
  expect(durationMs).toBeLessThan(thresholdMs);
}

/**
 * Assert response has required metadata
 */
export function expectMetadata(response: any) {
  expect(response.metadata).toBeDefined();
  expect(response.metadata.sources).toBeDefined();
  expect(response.metadata.timing).toBeDefined();
  expect(response.metadata.count).toBeGreaterThanOrEqual(0);
}

// ============================================================================
// Mock Helpers
// ============================================================================

export interface MockState {
  supabaseFailing: boolean;
  substackFailing: boolean;
  kvFailing: boolean;
  allFailing: boolean;
  supabaseDelayMs?: number;
}

let mockState: MockState = {
  supabaseFailing: false,
  substackFailing: false,
  kvFailing: false,
  allFailing: false
};

/**
 * Get current mock state
 */
export function getMockState(): MockState {
  return { ...mockState };
}

/**
 * Reset all mocks to normal operation
 */
export function resetMocks() {
  mockState = {
    supabaseFailing: false,
    substackFailing: false,
    kvFailing: false,
    allFailing: false
  };
}

/**
 * Make Supabase fail for testing fallback
 */
export function mockSupabaseToFail() {
  mockState.supabaseFailing = true;
}

/**
 * Make Supabase succeed
 */
export function mockSupabaseToSucceed() {
  mockState.supabaseFailing = false;
}

/**
 * Make all sources fail
 */
export function mockAllSourcesToFail() {
  mockState.allFailing = true;
  mockState.supabaseFailing = true;
  mockState.substackFailing = true;
  mockState.kvFailing = true;
}

/**
 * Make Supabase delay response
 */
export function mockSupabaseToDelayResponse(delayMs: number) {
  mockState.supabaseDelayMs = delayMs;
}

// ============================================================================
// Test Environment Setup
// ============================================================================

/**
 * Setup test environment with clean state
 */
export async function setupTestEnvironment(prisma: PrismaClient) {
  // Clear existing test data
  await clearTestData(prisma);

  // Reset mocks
  resetMocks();

  // Verify database connection
  await prisma.$queryRaw`SELECT 1`;

  console.log('[Test Setup] Environment initialized');
}

/**
 * Teardown test environment
 */
export async function teardownTestEnvironment(prisma: PrismaClient) {
  // Clear test data
  await clearTestData(prisma);

  console.log('[Test Teardown] Environment cleaned');
}
