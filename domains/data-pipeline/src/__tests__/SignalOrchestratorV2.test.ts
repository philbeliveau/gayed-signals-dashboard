/**
 * SignalOrchestratorV2 Unit Tests
 * Story: 4.0e - API Route Consolidation
 *
 * Tests for intelligent signal orchestration, source failover,
 * data quality scoring, and caching behavior
 */

import { SignalOrchestratorV2, SignalQueryParams } from '../services/SignalOrchestratorV2';
import { PrismaClient } from '../../generated/client';

// Mock Prisma Client
jest.mock('../../generated/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      signalHistory: {
        findMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    })),
  };
});

// Mock Logger
jest.mock('../../services/Logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  };
});

// Mock CircuitBreaker
jest.mock('../../services/CircuitBreaker', () => {
  return {
    CircuitBreaker: jest.fn().mockImplementation(() => ({
      canAttempt: jest.fn(() => true),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      getErrorRate: jest.fn(() => 0),
      getLastSuccess: jest.fn(() => new Date()),
      getLastFailure: jest.fn(),
    })),
  };
});

describe('SignalOrchestratorV2', () => {
  let orchestrator: SignalOrchestratorV2;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new SignalOrchestratorV2();
    mockPrisma = (PrismaClient as any).mock.results[0].value;
  });

  afterEach(async () => {
    await orchestrator.disconnect();
  });

  describe('fetchSignals', () => {
    it('should fetch signals from PostgreSQL successfully', async () => {
      const mockSignals = [
        {
          id: 1,
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-10-31'),
          calculationTimestamp: new Date('2024-10-31T12:00:00Z'),
          signalValue: 1.25,
          signalStrength: 0.85,
          confidenceScore: 0.92,
          dataQualityScore: 0.95,
          signalStatus: 'bullish',
          previousStatus: 'neutral',
          statusChanged: true,
          inputData: {},
          intermediateValues: {},
          calculationParams: {},
          marketDataIds: [1, 2, 3],
          provenanceIds: [1],
          calculationVersion: '1.0.0',
          createdAt: new Date(),
          createdBy: 'system',
          deletedAt: null,
        },
      ];

      mockPrisma.signalHistory.findMany.mockResolvedValue(mockSignals);

      const params: SignalQueryParams = {
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].signalName).toBe('gayed_8_month');
      expect(result.metadata.sources.primary).toBe('railway_postgresql');
      expect(result.metadata.count).toBe(1);
      expect(result.metadata.quality.overallScore).toBeGreaterThan(0);
    });

    it('should handle date range filtering', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(mockPrisma.signalHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            calculationDate: expect.objectContaining({
              gte: params.dateFrom,
              lte: params.dateTo,
            }),
          }),
        })
      );
    });

    it('should handle type filtering', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        types: ['timing', 'momentum'],
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      const call = mockPrisma.signalHistory.findMany.mock.calls[0][0];
      expect(call.where.signalType.in).toContain('timing');
      expect(call.where.signalType.in).toContain('momentum');
    });

    it('should handle category filtering', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        categories: ['gayed_8_month', 'gayed_20d'],
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      const call = mockPrisma.signalHistory.findMany.mock.calls[0][0];
      expect(call.where.signalName.in).toContain('gayed_8_month');
      expect(call.where.signalName.in).toContain('gayed_20d');
    });

    it('should handle pagination with cursor', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        cursor: '2024-10-30T00:00:00.000Z',
        sortOrder: 'desc',
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(mockPrisma.signalHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            calculationDate: expect.objectContaining({
              lt: new Date('2024-10-30T00:00:00.000Z'),
            }),
          }),
        })
      );
    });

    it('should handle sorting by date', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        sortBy: 'date',
        sortOrder: 'asc',
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(mockPrisma.signalHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { calculationDate: 'asc' },
        })
      );
    });

    it('should handle sorting by priority (confidence score)', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        sortBy: 'priority',
        sortOrder: 'desc',
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(mockPrisma.signalHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { confidenceScore: 'desc' },
        })
      );
    });

    it('should use in-memory cache for repeated queries', async () => {
      const mockSignals = [
        {
          id: 1,
          signalName: 'gayed_8_month',
          signalType: 'timing',
          calculationDate: new Date('2024-10-31'),
          calculationTimestamp: new Date('2024-10-31T12:00:00Z'),
          signalValue: 1.25,
          signalStrength: 0.85,
          confidenceScore: 0.92,
          dataQualityScore: 0.95,
          signalStatus: 'bullish',
          previousStatus: null,
          statusChanged: false,
          inputData: null,
          intermediateValues: null,
          calculationParams: null,
          marketDataIds: [],
          provenanceIds: [],
          calculationVersion: null,
          createdAt: new Date(),
          createdBy: 'system',
          deletedAt: null,
        },
      ];

      mockPrisma.signalHistory.findMany.mockResolvedValue(mockSignals);

      const params: SignalQueryParams = {
        limit: 50,
      };

      // First call - should hit PostgreSQL
      const result1 = await orchestrator.fetchSignals(params);
      expect(result1.metadata.sources.primary).toBe('railway_postgresql');

      // Second call - should hit cache
      const result2 = await orchestrator.fetchSignals(params);
      expect(result2.metadata.sources.primary).toBe('memory_cache');

      // PostgreSQL should only be called once
      expect(mockPrisma.signalHistory.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty result when no data found', async () => {
      mockPrisma.signalHistory.findMany.mockResolvedValue([]);

      const params: SignalQueryParams = {
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(result.success).toBe(false);
      expect(result.data.length).toBe(0);
      expect(result.metadata.count).toBe(0);
    });
  });

  describe('data quality scoring', () => {
    it('should calculate high quality score for fresh data', async () => {
      const recentTime = new Date();
      const mockSignals = [
        {
          id: 1,
          signalName: 'test_signal',
          signalType: 'timing',
          calculationDate: recentTime,
          calculationTimestamp: recentTime, // Very fresh
          signalValue: 1.0,
          signalStrength: 0.9,
          confidenceScore: 0.95,
          dataQualityScore: 0.98,
          signalStatus: 'bullish',
          previousStatus: null,
          statusChanged: false,
          inputData: {},
          intermediateValues: {},
          calculationParams: {},
          marketDataIds: [],
          provenanceIds: [],
          calculationVersion: '1.0.0',
          createdAt: new Date(),
          createdBy: 'system',
          deletedAt: null,
        },
      ];

      mockPrisma.signalHistory.findMany.mockResolvedValue(mockSignals);

      const result = await orchestrator.fetchSignals({ limit: 50 });

      expect(result.metadata.quality.freshnessScore).toBeGreaterThan(0.9);
      expect(result.metadata.quality.completenessScore).toBeGreaterThan(0.9);
      expect(result.metadata.quality.overallScore).toBeGreaterThan(0.8);
    });

    it('should calculate low quality score for stale data', async () => {
      const oldTime = new Date('2020-01-01T00:00:00Z');
      const mockSignals = [
        {
          id: 1,
          signalName: 'test_signal',
          signalType: 'timing',
          calculationDate: oldTime,
          calculationTimestamp: oldTime, // Very old
          signalValue: 1.0,
          signalStrength: null,
          confidenceScore: null,
          dataQualityScore: null,
          signalStatus: 'bullish',
          previousStatus: null,
          statusChanged: false,
          inputData: null,
          intermediateValues: null,
          calculationParams: null,
          marketDataIds: [],
          provenanceIds: [],
          calculationVersion: null,
          createdAt: new Date(),
          createdBy: 'system',
          deletedAt: null,
        },
      ];

      mockPrisma.signalHistory.findMany.mockResolvedValue(mockSignals);

      const result = await orchestrator.fetchSignals({ limit: 50 });

      expect(result.metadata.quality.freshnessScore).toBeLessThan(0.2);
      expect(result.metadata.quality.completenessScore).toBeLessThan(1.0);
    });
  });

  describe('source health monitoring', () => {
    it('should return health status for all sources', async () => {
      const health = await orchestrator.getSourcesHealth();

      expect(health).toHaveLength(2); // PostgreSQL and Redis
      expect(health[0].name).toBe('railway_postgresql');
      expect(health[1].name).toBe('railway_redis');
      expect(health[0].available).toBeDefined();
      expect(health[0].errorRate).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle PostgreSQL query timeout', async () => {
      mockPrisma.signalHistory.findMany.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const params: SignalQueryParams = {
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(result.success).toBe(false);
      expect(result.metadata.sources.failedSources).toContain('railway_postgresql');
    }, 10000); // Increase timeout for this test

    it('should handle PostgreSQL query error', async () => {
      mockPrisma.signalHistory.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      const params: SignalQueryParams = {
        limit: 50,
      };

      const result = await orchestrator.fetchSignals(params);

      expect(result.success).toBe(false);
      expect(result.metadata.sources.failedSources).toContain('railway_postgresql');
    });
  });
});
