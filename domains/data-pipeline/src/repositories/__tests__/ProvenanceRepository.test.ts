/**
 * Unit tests for ProvenanceRepository
 * Story: 4.0b - Data Persistence Layer
 *
 * Tests provenance tracking, lineage queries, and API usage statistics
 * Target: >90% code coverage
 */

import { PrismaClient } from '@prisma/client';
import { ProvenanceRepository, ProvenanceData } from '../ProvenanceRepository';

describe('ProvenanceRepository', () => {
  let prisma: PrismaClient;
  let repository: ProvenanceRepository;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
    repository = new ProvenanceRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.signalHistory.deleteMany();
    await prisma.marketData.deleteMany();
    await prisma.dataProvenance.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createProvenance', () => {
    it('should create provenance record successfully', async () => {
      const data: ProvenanceData = {
        sourceSystem: 'alpha_vantage',
        sourceEndpoint: '/query?function=TIME_SERIES_DAILY',
        sourceQueryParams: { symbol: 'SPY', apikey: 'test' },
        requestTimestamp: new Date(),
        status: 'pending',
      };

      const id = await repository.createProvenance(data);

      expect(id).toBeGreaterThan(0);

      const retrieved = await prisma.dataProvenance.findUnique({
        where: { id },
      });

      expect(retrieved).toBeTruthy();
      expect(retrieved!.sourceSystem).toBe('alpha_vantage');
      expect(retrieved!.status).toBe('pending');
    });

    it('should store query params as JSON', async () => {
      const data: ProvenanceData = {
        sourceSystem: 'fred',
        sourceQueryParams: {
          series_id: 'UNRATE',
          frequency: 'monthly',
        },
        requestTimestamp: new Date(),
        status: 'completed',
      };

      const id = await repository.createProvenance(data);
      const retrieved = await prisma.dataProvenance.findUnique({
        where: { id },
      });

      expect(retrieved!.sourceQueryParams).toEqual({
        series_id: 'UNRATE',
        frequency: 'monthly',
      });
    });
  });

  describe('updateProvenance', () => {
    it('should update provenance after API response', async () => {
      const data: ProvenanceData = {
        sourceSystem: 'alpha_vantage',
        requestTimestamp: new Date(),
        status: 'pending',
      };

      const id = await repository.createProvenance(data);

      const updated = await repository.updateProvenance(id, {
        responseTimestamp: new Date(),
        responseStatus: 200,
        recordsReceived: 100,
        recordsValid: 98,
        recordsInvalid: 2,
        status: 'completed',
      });

      expect(updated).toBe(true);

      const retrieved = await prisma.dataProvenance.findUnique({
        where: { id },
      });

      expect(retrieved!.status).toBe('completed');
      expect(retrieved!.responseStatus).toBe(200);
      expect(retrieved!.recordsReceived).toBe(100);
      expect(retrieved!.recordsValid).toBe(98);
    });

    it('should return false for non-existent record', async () => {
      const updated = await repository.updateProvenance(99999, {
        status: 'completed',
      });

      expect(updated).toBe(false);
    });

    it('should store validation errors', async () => {
      const data: ProvenanceData = {
        sourceSystem: 'test',
        requestTimestamp: new Date(),
        status: 'partial',
      };

      const id = await repository.createProvenance(data);

      await repository.updateProvenance(id, {
        validationErrors: {
          errors: [
            { row: 1, field: 'close', message: 'Invalid price' },
            { row: 5, field: 'volume', message: 'Negative volume' },
          ],
        },
      });

      const retrieved = await prisma.dataProvenance.findUnique({
        where: { id },
      });

      expect(retrieved!.validationErrors).toEqual({
        errors: [
          { row: 1, field: 'close', message: 'Invalid price' },
          { row: 5, field: 'volume', message: 'Negative volume' },
        ],
      });
    });
  });

  describe('getProvenance', () => {
    it('should retrieve provenance by ID', async () => {
      const data: ProvenanceData = {
        sourceSystem: 'test',
        requestTimestamp: new Date(),
        status: 'completed',
      };

      const id = await repository.createProvenance(data);
      const retrieved = await repository.getProvenance(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe(id);
      expect(retrieved!.sourceSystem).toBe('test');
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await repository.getProvenance(99999);

      expect(retrieved).toBeNull();
    });
  });

  describe('getProvenanceBySource', () => {
    beforeEach(async () => {
      const sources = ['alpha_vantage', 'fred', 'alpha_vantage', 'tiingo'];

      for (const source of sources) {
        await repository.createProvenance({
          sourceSystem: source,
          requestTimestamp: new Date(),
          status: 'completed',
        });
      }
    });

    it('should filter by source system', async () => {
      const records = await repository.getProvenanceBySource('alpha_vantage');

      expect(records.length).toBe(2);
      expect(records.every((r) => r.sourceSystem === 'alpha_vantage')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const records = await repository.getProvenanceBySource('alpha_vantage', undefined, 1);

      expect(records.length).toBe(1);
    });

    it('should filter by start date', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow

      const records = await repository.getProvenanceBySource('alpha_vantage', futureDate);

      expect(records.length).toBe(0);
    });
  });

  describe('getDataLineage', () => {
    it('should trace full data lineage', async () => {
      // Create lineage: raw → normalized → aggregated
      const rawId = await repository.createProvenance({
        sourceSystem: 'alpha_vantage',
        requestTimestamp: new Date(),
        transformationApplied: 'raw',
        status: 'completed',
      });

      const normalizedId = await repository.createProvenance({
        sourceSystem: 'internal',
        requestTimestamp: new Date(),
        transformationApplied: 'normalized',
        parentProvenanceId: rawId,
        status: 'completed',
      });

      const aggregatedId = await repository.createProvenance({
        sourceSystem: 'internal',
        requestTimestamp: new Date(),
        transformationApplied: 'aggregated',
        parentProvenanceId: normalizedId,
        status: 'completed',
      });

      // Create market data linked to aggregated provenance
      const marketData = await prisma.marketData.create({
        data: {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date(),
          date: new Date(),
          close: 450,
          provenanceId: aggregatedId,
        },
      });

      const lineage = await repository.getDataLineage(marketData.id);

      expect(lineage.length).toBe(3);
      expect(lineage[0].transformationApplied).toBe('raw');
      expect(lineage[1].transformationApplied).toBe('normalized');
      expect(lineage[2].transformationApplied).toBe('aggregated');
    });

    it('should return empty array for no provenance', async () => {
      const marketData = await prisma.marketData.create({
        data: {
          symbol: 'SPY',
          dataType: 'price',
          timestamp: new Date(),
          date: new Date(),
          close: 450,
        },
      });

      const lineage = await repository.getDataLineage(marketData.id);

      expect(lineage).toHaveLength(0);
    });
  });

  describe('getProvenanceByStatus', () => {
    beforeEach(async () => {
      const statuses: Array<'pending' | 'completed' | 'failed' | 'partial'> = [
        'completed',
        'failed',
        'completed',
        'pending',
      ];

      for (const status of statuses) {
        await repository.createProvenance({
          sourceSystem: 'test',
          requestTimestamp: new Date(),
          status,
        });
      }
    });

    it('should filter by status', async () => {
      const completed = await repository.getProvenanceByStatus('completed');

      expect(completed.length).toBe(2);
      expect(completed.every((r) => r.status === 'completed')).toBe(true);
    });

    it('should find failed records', async () => {
      const failed = await repository.getProvenanceByStatus('failed');

      expect(failed.length).toBe(1);
      expect(failed[0].status).toBe('failed');
    });
  });

  describe('getApiUsageStats', () => {
    beforeEach(async () => {
      const startTime = new Date('2024-01-01T00:00:00Z');

      // Successful request
      const id1 = await repository.createProvenance({
        sourceSystem: 'alpha_vantage',
        requestTimestamp: new Date('2024-01-01T10:00:00Z'),
        status: 'completed',
      });

      await repository.updateProvenance(id1, {
        responseTimestamp: new Date('2024-01-01T10:00:02Z'),
        responseStatus: 200,
        recordsReceived: 100,
        recordsValid: 100,
        apiCreditsUsed: 5,
      });

      // Failed request
      const id2 = await repository.createProvenance({
        sourceSystem: 'alpha_vantage',
        requestTimestamp: new Date('2024-01-01T11:00:00Z'),
        status: 'failed',
      });

      await repository.updateProvenance(id2, {
        responseTimestamp: new Date('2024-01-01T11:00:01Z'),
        responseStatus: 429,
        apiCreditsUsed: 0,
      });

      // Another successful request
      const id3 = await repository.createProvenance({
        sourceSystem: 'alpha_vantage',
        requestTimestamp: new Date('2024-01-01T12:00:00Z'),
        status: 'completed',
      });

      await repository.updateProvenance(id3, {
        responseTimestamp: new Date('2024-01-01T12:00:03Z'),
        responseStatus: 200,
        recordsReceived: 50,
        recordsValid: 48,
        apiCreditsUsed: 5,
      });
    });

    it('should calculate usage statistics', async () => {
      const stats = await repository.getApiUsageStats(
        'alpha_vantage',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.totalCreditsUsed).toBe(10);
      expect(stats.totalRecordsReceived).toBe(150);
      expect(stats.totalRecordsValid).toBe(148);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should return zeros for no data', async () => {
      const stats = await repository.getApiUsageStats(
        'invalid_source',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.totalCreditsUsed).toBe(0);
    });
  });
});
