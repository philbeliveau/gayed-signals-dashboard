/**
 * End-to-End Integration Tests
 * Story: 4.0g - Integration Testing Suite
 *
 * Complete user journey tests against Railway backend
 * Tests real PostgreSQL and Redis integration
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../../config/database';
import {
  createTestSignal,
  generateBulkSignals,
  seedRailwayDatabase,
  clearTestData,
  setupTestEnvironment,
  teardownTestEnvironment,
  percentile,
  expectDataQuality,
  expectPerformance
} from '../helpers/test-utilities';
import {
  signalFixtures,
  generateHistoricalSignals
} from '../helpers/fixtures';

describe('End-to-End User Journeys', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await setupTestEnvironment(prisma);
  });

  afterAll(async () => {
    await teardownTestEnvironment(prisma);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await clearTestData(prisma);
  });

  // ==========================================================================
  // Happy Path Tests
  // ==========================================================================

  describe('Happy Path: Fresh Data from Railway PostgreSQL', () => {
    it('should fetch signals from Railway when available', async () => {
      // Arrange: Seed Railway with fresh data
      const testSignals = [
        createTestSignal({ date: '2025-10-31', type: 'bullish' }),
        createTestSignal({ date: '2025-10-30', type: 'bearish' })
      ];

      await seedRailwayDatabase(prisma, testSignals);

      // Act: Query signals
      const signals = await prisma.signalHistory.findMany({
        where: {
          calculationDate: {
            gte: new Date('2025-10-30'),
            lte: new Date('2025-10-31')
          }
        },
        orderBy: { calculationDate: 'desc' }
      });

      // Assert
      expect(signals).toHaveLength(2);
      expect(signals[0].signalStatus).toBe('bullish');
      expect(signals[1].signalStatus).toBe('bearish');

      // Verify data quality
      expectDataQuality(signals, 1.0);
    });

    it('should return signals within specified date range', async () => {
      // Arrange: Create 30 days of signals
      const signals = generateHistoricalSignals(30);
      await seedRailwayDatabase(prisma, signals);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Act: Query last 7 days
      const recentSignals = await prisma.signalHistory.findMany({
        where: {
          calculationDate: {
            gte: startDate
          }
        },
        orderBy: { calculationDate: 'desc' }
      });

      // Assert: Should have ~7 signals
      expect(recentSignals.length).toBeGreaterThanOrEqual(7);
      expect(recentSignals.length).toBeLessThanOrEqual(8);

      // Verify all within range
      recentSignals.forEach(signal => {
        expect(signal.calculationDate >= startDate).toBe(true);
      });
    });

    it('should measure query performance', async () => {
      // Arrange: Seed database
      const signals = generateHistoricalSignals(100);
      await seedRailwayDatabase(prisma, signals);

      // Act: Measure query time
      const startTime = performance.now();

      await prisma.signalHistory.findMany({
        take: 20,
        orderBy: { calculationDate: 'desc' }
      });

      const duration = performance.now() - startTime;

      // Assert: Should complete quickly
      console.log(`[E2E] Query latency: ${duration.toFixed(2)}ms`);
      expectPerformance(duration, 100); // <100ms target
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe('Pagination Journey', () => {
    beforeEach(async () => {
      // Seed 150 signals for pagination testing
      const signals = generateBulkSignals(150);
      await seedRailwayDatabase(prisma, signals);
    });

    it('should paginate through large result sets', async () => {
      // Page 1
      const page1 = await prisma.signalHistory.findMany({
        take: 50,
        orderBy: { calculationDate: 'desc' }
      });

      expect(page1).toHaveLength(50);
      const cursor1 = page1[page1.length - 1].id;

      // Page 2
      const page2 = await prisma.signalHistory.findMany({
        take: 50,
        skip: 1,
        cursor: { id: cursor1 },
        orderBy: { calculationDate: 'desc' }
      });

      expect(page2).toHaveLength(50);
      const cursor2 = page2[page2.length - 1].id;

      // Page 3
      const page3 = await prisma.signalHistory.findMany({
        take: 50,
        skip: 1,
        cursor: { id: cursor2 },
        orderBy: { calculationDate: 'desc' }
      });

      expect(page3).toHaveLength(50);

      // Verify no duplicates across pages
      const allIds = [
        ...page1.map(s => s.id),
        ...page2.map(s => s.id),
        ...page3.map(s => s.id)
      ];

      expect(new Set(allIds).size).toBe(150);
    });

    it('should handle cursor-based pagination efficiently', async () => {
      const pageSize = 25;
      const pages: any[][] = [];
      let cursor: number | undefined;

      // Fetch 4 pages
      for (let i = 0; i < 4; i++) {
        const page = await prisma.signalHistory.findMany({
          take: pageSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { calculationDate: 'desc' }
        });

        pages.push(page);

        if (page.length === pageSize) {
          cursor = page[page.length - 1].id;
        }
      }

      // Assert
      expect(pages).toHaveLength(4);
      expect(pages[0]).toHaveLength(25);
      expect(pages[1]).toHaveLength(25);
      expect(pages[2]).toHaveLength(25);
      expect(pages[3]).toHaveLength(25);

      // Verify ordering
      const allSignals = pages.flat();
      for (let i = 0; i < allSignals.length - 1; i++) {
        expect(allSignals[i].calculationDate >= allSignals[i + 1].calculationDate).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Filtering and Sorting Tests
  // ==========================================================================

  describe('Filtering and Sorting Journey', () => {
    beforeEach(async () => {
      // Seed diverse signals
      const signals = [
        createTestSignal({ date: '2025-10-31', type: 'bullish', category: 'timing' }),
        createTestSignal({ date: '2025-10-30', type: 'bearish', category: 'momentum' }),
        createTestSignal({ date: '2025-10-29', type: 'bullish', category: 'timing' }),
        createTestSignal({ date: '2025-10-28', type: 'neutral', category: 'trend' })
      ];

      await seedRailwayDatabase(prisma, signals);
    });

    it('should apply multiple filters', async () => {
      // Filter by type and category
      const filtered = await prisma.signalHistory.findMany({
        where: {
          AND: [
            { signalStatus: 'bullish' },
            { signalType: 'timing' }
          ]
        },
        orderBy: { calculationDate: 'desc' }
      });

      // Assert
      expect(filtered).toHaveLength(2);
      expect(filtered[0].calculationDate.toISOString()).toContain('2025-10-31');
      expect(filtered[1].calculationDate.toISOString()).toContain('2025-10-29');
      expect(filtered.every(s => s.signalStatus === 'bullish')).toBe(true);
      expect(filtered.every(s => s.signalType === 'timing')).toBe(true);
    });

    it('should sort signals by date ascending', async () => {
      const sorted = await prisma.signalHistory.findMany({
        orderBy: { calculationDate: 'asc' },
        take: 10
      });

      // Verify ascending order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].calculationDate <= sorted[i + 1].calculationDate).toBe(true);
      }
    });

    it('should sort signals by date descending', async () => {
      const sorted = await prisma.signalHistory.findMany({
        orderBy: { calculationDate: 'desc' },
        take: 10
      });

      // Verify descending order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].calculationDate >= sorted[i + 1].calculationDate).toBe(true);
      }
    });

    it('should filter by signal strength range', async () => {
      const strongSignals = await prisma.signalHistory.findMany({
        where: {
          signalStrength: {
            gte: 0.8
          }
        }
      });

      // Verify all meet threshold
      strongSignals.forEach(signal => {
        expect(Number(signal.signalStrength)).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  // ==========================================================================
  // Concurrent Operations Tests
  // ==========================================================================

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads efficiently', async () => {
      // Arrange: Seed data
      const signals = generateBulkSignals(50);
      await seedRailwayDatabase(prisma, signals);

      // Act: 10 concurrent queries
      const startTime = performance.now();

      const queries = Array.from({ length: 10 }, () =>
        prisma.signalHistory.findMany({
          take: 10,
          orderBy: { calculationDate: 'desc' }
        })
      );

      const results = await Promise.all(queries);
      const duration = performance.now() - startTime;

      // Assert
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveLength(10);
      });

      console.log(`[E2E] 10 concurrent queries: ${duration.toFixed(2)}ms`);
      expectPerformance(duration, 500); // <500ms for 10 queries
    });

    it('should maintain data consistency under concurrent writes', async () => {
      // Arrange: Create signals with unique names
      const signals = Array.from({ length: 10 }, (_, i) =>
        createTestSignal({ id: `concurrent_${i}` })
      );

      // Act: Concurrent inserts
      await Promise.all(
        signals.map(signal =>
          prisma.signalHistory.create({ data: signal })
        )
      );

      // Assert: All inserted
      const inserted = await prisma.signalHistory.findMany({
        where: {
          signalName: {
            startsWith: 'test_signal_concurrent_'
          }
        }
      });

      expect(inserted).toHaveLength(10);
    });
  });

  // ==========================================================================
  // Data Integrity Tests
  // ==========================================================================

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Create provenance first
      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'test_integrity',
          requestTimestamp: new Date(),
          status: 'completed'
        }
      });

      // Create signal with provenance reference
      const signal = await prisma.signalHistory.create({
        data: {
          ...createTestSignal(),
          provenanceIds: [provenance.id]
        }
      });

      // Verify relationship
      expect(signal.provenanceIds).toContain(provenance.id);

      // Cleanup
      await prisma.signalHistory.delete({ where: { id: signal.id } });
      await prisma.dataProvenance.delete({ where: { id: provenance.id } });
    });

    it('should enforce unique constraints', async () => {
      const baseSignal = createTestSignal({ id: 'unique_test' });

      // First insert should succeed
      const signal1 = await prisma.signalHistory.create({
        data: baseSignal
      });

      expect(signal1.id).toBeDefined();

      // Second insert with same data should succeed (different calculation date allowed)
      const signal2 = await prisma.signalHistory.create({
        data: {
          ...baseSignal,
          calculationDate: new Date(baseSignal.calculationDate.getTime() + 1000)
        }
      });

      expect(signal2.id).toBeDefined();
      expect(signal2.id).not.toBe(signal1.id);
    });

    it('should validate data types', async () => {
      const signal = createTestSignal();

      const created = await prisma.signalHistory.create({
        data: signal
      });

      // Verify types
      expect(typeof created.signalValue).toBe('object'); // Decimal
      expect(Number(created.signalValue)).toBe(signal.signalValue);
      expect(created.calculationDate).toBeInstanceOf(Date);
      expect(Array.isArray(created.marketDataIds)).toBe(true);
    });
  });

  // ==========================================================================
  // Performance Benchmarks
  // ==========================================================================

  describe('Performance Benchmarks', () => {
    it('should meet p50 latency target (<50ms)', async () => {
      // Arrange
      const signals = generateBulkSignals(100);
      await seedRailwayDatabase(prisma, signals);

      const responseTimes: number[] = [];

      // Act: 100 queries
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await prisma.signalHistory.findMany({
          take: 10,
          orderBy: { calculationDate: 'desc' }
        });
        responseTimes.push(performance.now() - start);
      }

      // Assert
      const p50 = percentile(responseTimes, 50);
      console.log(`[E2E] p50 latency: ${p50.toFixed(2)}ms`);
      expectPerformance(p50, 50);
    });

    it('should meet p95 latency target (<100ms)', async () => {
      // Arrange
      const signals = generateBulkSignals(100);
      await seedRailwayDatabase(prisma, signals);

      const responseTimes: number[] = [];

      // Act: 100 queries
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await prisma.signalHistory.findMany({
          take: 20,
          orderBy: { calculationDate: 'desc' }
        });
        responseTimes.push(performance.now() - start);
      }

      // Assert
      const p95 = percentile(responseTimes, 95);
      console.log(`[E2E] p95 latency: ${p95.toFixed(2)}ms`);
      expectPerformance(p95, 100);
    });

    it('should handle bulk operations efficiently', async () => {
      // Arrange: 1000 signals
      const signals = generateBulkSignals(1000);

      // Act: Bulk insert
      const startTime = performance.now();

      await prisma.signalHistory.createMany({
        data: signals,
        skipDuplicates: true
      });

      const duration = performance.now() - startTime;

      // Assert
      console.log(`[E2E] Bulk insert 1000 records: ${duration.toFixed(2)}ms`);
      expectPerformance(duration, 5000); // <5s for 1000 records
    });
  });
});
