/**
 * Railway PostgreSQL Integration Tests
 *
 * Tests with REAL Railway database connection
 * Story 4.0b - Integration Testing
 *
 * IMPORTANT: These tests use the actual Railway database
 * Run with: npm run test:integration
 */

import { PrismaClient } from '../../generated/client';
import { MarketDataRepository } from '../../repositories/MarketDataRepository';
import { ProvenanceRepository } from '../../repositories/ProvenanceRepository';
import { SignalHistoryRepository } from '../../repositories/SignalHistoryRepository';
import { DataCleanupService } from '../../services/DataCleanupService';
import { createPrismaClient, checkPoolHealth } from '../../config/database';

describe('Railway PostgreSQL Integration Tests', () => {
  let prisma: PrismaClient;
  let marketDataRepo: MarketDataRepository;
  let provenanceRepo: ProvenanceRepository;
  let signalHistoryRepo: SignalHistoryRepository;

  beforeAll(async () => {
    // Use configured Prisma client with connection pooling
    prisma = createPrismaClient();
    marketDataRepo = new MarketDataRepository(prisma);
    provenanceRepo = new ProvenanceRepository(prisma);
    signalHistoryRepo = new SignalHistoryRepository(prisma);

    // Verify Railway connection
    console.log('[Integration] Connecting to Railway PostgreSQL...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[Integration] ✅ Railway connection successful\n');
    } catch (error) {
      console.error('[Integration] ❌ Railway connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Connectivity', () => {
    it('should connect to Railway PostgreSQL', async () => {
      const result: any = await prisma.$queryRaw`SELECT version()`;
      expect(result).toBeDefined();
      expect(result[0].version).toContain('PostgreSQL');
    });

    it('should have all required tables', async () => {
      const tables: any = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      const tableNames = tables.map((t: any) => t.table_name);

      expect(tableNames).toContain('market_data');
      expect(tableNames).toContain('data_provenance');
      expect(tableNames).toContain('signal_history');
      expect(tableNames).toContain('cache_metadata');
      expect(tableNames).toContain('data_source_health');
    });

    it('should have soft delete columns', async () => {
      const columns: any = await prisma.$queryRaw`
        SELECT column_name, table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'deleted_at'
        ORDER BY table_name
      `;

      const tables = columns.map((c: any) => c.table_name);

      expect(tables).toContain('market_data');
      expect(tables).toContain('data_provenance');
      expect(tables).toContain('signal_history');
    });

    it('should check connection pool health', async () => {
      const health = await checkPoolHealth(prisma);

      expect(health.healthy).toBe(true);
      expect(health.activeConnections).toBeGreaterThanOrEqual(0);
      expect(health.totalConnections).toBeGreaterThan(0);
      expect(health.utilizationPercent).toBeLessThan(100);
    });
  });

  describe('MarketDataRepository Integration', () => {
    let testProvenanceId: number;

    beforeAll(async () => {
      // Create test provenance
      testProvenanceId = await provenanceRepo.createProvenance({
        sourceSystem: 'integration_test',
        sourceEndpoint: '/test',
        requestTimestamp: new Date(),
        status: 'completed'
      });
    });

    afterAll(async () => {
      // Cleanup test data
      await prisma.marketData.deleteMany({
        where: { symbol: 'INT_TEST' }
      });
      await prisma.dataProvenance.delete({
        where: { id: testProvenanceId }
      });
    });

    it('should insert market data to Railway database', async () => {
      const data = {
        symbol: 'INT_TEST',
        dataType: 'price',
        timestamp: new Date(),
        date: new Date(),
        close: 150.25,
        volume: BigInt(1000000)
      };

      const id = await marketDataRepo.insertMarketData(data, testProvenanceId);

      expect(id).toBeGreaterThan(0);

      // Verify in database
      const retrieved = await prisma.marketData.findUnique({
        where: { id }
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.symbol).toBe('INT_TEST');
      expect(Number(retrieved?.close)).toBe(150.25);
    });

    it('should handle upsert correctly on Railway', async () => {
      const timestamp = new Date('2024-01-15T12:00:00Z');
      const date = new Date('2024-01-15');

      const data1 = {
        symbol: 'INT_TEST',
        dataType: 'price',
        timestamp,
        date,
        close: 100.0
      };

      const id1 = await marketDataRepo.insertMarketData(data1, testProvenanceId);

      // Insert duplicate (should upsert)
      const data2 = {
        symbol: 'INT_TEST',
        dataType: 'price',
        timestamp,
        date,
        close: 105.0
      };

      const id2 = await marketDataRepo.insertMarketData(data2, testProvenanceId);

      // Should return same ID
      expect(id1).toBe(id2);

      // Verify updated value
      const retrieved = await prisma.marketData.findUnique({
        where: { id: id1 }
      });

      expect(Number(retrieved?.close)).toBe(105.0);
    });

    it('should perform bulk insert efficiently', async () => {
      const dataArray = Array.from({ length: 100 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);

        return {
          symbol: 'INT_TEST',
          dataType: 'bulk',
          timestamp: new Date(date.getTime() + i * 1000),
          date,
          close: 100 + i
        };
      });

      const startTime = performance.now();
      const ids = await marketDataRepo.bulkInsertMarketData(dataArray, testProvenanceId);
      const duration = performance.now() - startTime;

      expect(ids).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds

      console.log(`[Integration] Bulk insert: ${duration.toFixed(2)}ms for 100 records`);
    });

    it('should retrieve data within date range', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const results = await marketDataRepo.getMarketData('INT_TEST', startDate, endDate);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('ProvenanceRepository Integration', () => {
    it('should create provenance record on Railway', async () => {
      const data = {
        sourceSystem: 'integration_test',
        sourceEndpoint: '/api/test',
        sourceQueryParams: { symbol: 'SPY' },
        requestTimestamp: new Date(),
        status: 'completed' as const,
        recordsReceived: 100,
        recordsValid: 95,
        recordsInvalid: 5
      };

      const id = await provenanceRepo.createProvenance(data);

      expect(id).toBeGreaterThan(0);

      // Cleanup
      await prisma.dataProvenance.delete({ where: { id } });
    });

    it('should track data lineage with parent relationships', async () => {
      // Create parent provenance
      const parentId = await provenanceRepo.createProvenance({
        sourceSystem: 'alpha_vantage',
        requestTimestamp: new Date(),
        status: 'completed'
      });

      // Create child provenance
      const childId = await provenanceRepo.createProvenance({
        sourceSystem: 'data_transformer',
        requestTimestamp: new Date(),
        status: 'completed',
        parentProvenanceId: parentId,
        transformationApplied: 'normalization'
      });

      // Verify lineage
      const child = await prisma.dataProvenance.findUnique({
        where: { id: childId },
        include: { parent: true }
      });

      expect(child?.parentProvenanceId).toBe(parentId);
      expect(child?.parent?.sourceSystem).toBe('alpha_vantage');

      // Cleanup
      await prisma.dataProvenance.delete({ where: { id: childId } });
      await prisma.dataProvenance.delete({ where: { id: parentId } });
    });
  });

  describe('SignalHistoryRepository Integration', () => {
    afterEach(async () => {
      // Cleanup test signals
      await prisma.signalHistory.deleteMany({
        where: { signalName: { startsWith: 'int_test_' } }
      });
    });

    it('should store signal calculation on Railway', async () => {
      const signal = {
        signalName: 'int_test_signal',
        signalType: 'timing',
        calculationDate: new Date(),
        signalValue: 0.75,
        signalStrength: 0.8,
        confidenceScore: 0.95,
        signalStatus: 'bullish',
        marketDataIds: [1, 2, 3],
        provenanceIds: [1],
        calculationVersion: 'v1.0.0'
      };

      const id = await signalHistoryRepo.insertSignal(signal);

      expect(id).toBeGreaterThan(0);

      // Verify
      const retrieved = await prisma.signalHistory.findUnique({
        where: { id }
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.signalName).toBe('int_test_signal');
      expect(Number(retrieved?.signalValue)).toBe(0.75);
    });

    it('should detect status changes', async () => {
      const baseSignal = {
        signalName: 'int_test_status_change',
        signalType: 'timing',
        calculationDate: new Date(),
        signalValue: 0.5,
        signalStatus: 'neutral',
        marketDataIds: [],
        provenanceIds: []
      };

      // Insert first signal
      await signalHistoryRepo.insertSignal(baseSignal);

      // Insert signal with different status
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);

      await signalHistoryRepo.insertSignal({
        ...baseSignal,
        calculationDate: nextDay,
        signalStatus: 'bullish',
        previousStatus: 'neutral',
        statusChanged: true
      });

      // Get status changes
      const changes = await signalHistoryRepo.getSignalStatusChanges(
        'int_test_status_change',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some(s => s.statusChanged)).toBe(true);
    });
  });

  describe('Data Cleanup Service Integration', () => {
    let cleanupService: DataCleanupService;

    beforeAll(() => {
      cleanupService = new DataCleanupService(prisma);
    });

    it('should preview cleanup without deleting data', async () => {
      const previews = await cleanupService.previewCleanup();

      expect(Array.isArray(previews)).toBe(true);
      expect(previews.length).toBeGreaterThan(0);

      console.log('[Integration] Cleanup preview:');
      previews.forEach(p => {
        console.log(`  - ${p.dataType}: ${p.expiredRecords} expired records`);
      });
    });

    it('should soft delete old records', async () => {
      // Create old test record
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 800);

      const provenance = await prisma.dataProvenance.create({
        data: {
          sourceSystem: 'cleanup_test',
          requestTimestamp: oldDate,
          status: 'completed',
          createdAt: oldDate
        }
      });

      const record = await prisma.marketData.create({
        data: {
          symbol: 'CLEANUP_TEST',
          dataType: 'price',
          timestamp: oldDate,
          date: oldDate,
          close: 100.0,
          provenanceId: provenance.id,
          createdAt: oldDate
        }
      });

      // Soft delete
      await prisma.marketData.update({
        where: { id: record.id },
        data: { deletedAt: new Date() }
      });

      // Verify soft deleted
      const softDeleted = await prisma.marketData.findUnique({
        where: { id: record.id }
      });

      expect(softDeleted?.deletedAt).not.toBeNull();

      // Restore
      const restored = await cleanupService.restoreSoftDeleted('market_data', [record.id]);
      expect(restored).toBe(1);

      // Cleanup
      await prisma.marketData.delete({ where: { id: record.id } });
      await prisma.dataProvenance.delete({ where: { id: provenance.id } });
    });
  });

  describe('Performance on Railway', () => {
    it('should perform queries under 100ms threshold', async () => {
      const startTime = performance.now();

      await prisma.marketData.findFirst({
        where: { symbol: 'SPY' },
        orderBy: { date: 'desc' }
      });

      const duration = performance.now() - startTime;

      console.log(`[Integration] Query latency: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent queries efficiently', async () => {
      const queries = Array.from({ length: 10 }, () =>
        prisma.marketData.findFirst({
          where: { symbol: 'SPY' },
          orderBy: { date: 'desc' }
        })
      );

      const startTime = performance.now();
      await Promise.all(queries);
      const duration = performance.now() - startTime;

      console.log(`[Integration] 10 concurrent queries: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
    });
  });
});
