/**
 * Integration Test Environment Setup
 *
 * Provides utilities for setting up and tearing down test environments
 * with PostgreSQL, Redis, and mock API servers.
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export interface TestEnvironment {
  prisma: PrismaClient;
  redis: RedisClientType;
  cleanup: () => Promise<void>;
}

/**
 * Initialize test environment with PostgreSQL and Redis
 */
export async function setupTestEnvironment(): Promise<TestEnvironment> {
  // Initialize Prisma client
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/test_db',
      },
    },
  });

  // Connect to Prisma
  await prisma.$connect();

  // Initialize Redis client
  const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  // Connect to Redis
  await redis.connect();

  // Cleanup function
  const cleanup = async () => {
    await clearAllCaches(redis);
    await clearTestData(prisma);
    await redis.quit();
    await prisma.$disconnect();
  };

  return { prisma, redis, cleanup };
}

/**
 * Clear all Redis caches
 */
export async function clearAllCaches(redis: RedisClientType): Promise<void> {
  await redis.flushDb();
}

/**
 * Clear test data from PostgreSQL
 */
export async function clearTestData(prisma: PrismaClient): Promise<void> {
  // Delete in order of foreign key dependencies
  await prisma.signal.deleteMany();
  await prisma.marketData.deleteMany();
  await prisma.auditLog.deleteMany();
}

/**
 * Seed test database with fixture data
 */
export async function seedTestDatabase(prisma: PrismaClient, fixtures: any): Promise<void> {
  if (fixtures.signals) {
    await prisma.signal.createMany({
      data: fixtures.signals,
      skipDuplicates: true,
    });
  }

  if (fixtures.marketData) {
    await prisma.marketData.createMany({
      data: fixtures.marketData,
      skipDuplicates: true,
    });
  }
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
 * Environment validation - ensures all required env vars are set
 */
export function validateTestEnvironment(): void {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
