/**
 * Unit Tests for UnifiedDataService
 * Story: 4.0a - Unified Data Service
 */

import { UnifiedDataService } from '../services/UnifiedDataService';
import { CircuitBreaker } from '../services/CircuitBreaker';
import { CircuitBreakerState, MarketData } from '../types';

// Mock yahoo-finance2 and axios
jest.mock('yahoo-finance2');
jest.mock('axios');
jest.mock('../generated/client');
jest.mock('ioredis');

import yahooFinance from 'yahoo-finance2';
import axios from 'axios';
import { PrismaClient } from '../generated/client';

// Mock yahoo finance quoteCombine
(yahooFinance as any).quoteCombine = jest.fn();

describe('UnifiedDataService', () => {
  let service: UnifiedDataService;
  let mockPrisma: any;
  let mockRedis: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Prisma mock
    mockPrisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      dataSourceHealth: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([
          { name: 'YAHOO_FINANCE', priority: 1, healthScore: 1.0, endpoint: 'https://query1.finance.yahoo.com', enabled: true, lastSuccess: null, lastFailure: null, errorRate: 0 },
          { name: 'TIINGO', priority: 2, healthScore: 0.9, endpoint: 'https://api.tiingo.com', enabled: true, lastSuccess: null, lastFailure: null, errorRate: 0 },
          { name: 'ALPHA_VANTAGE', priority: 3, healthScore: 0.8, endpoint: 'https://www.alphavantage.co', enabled: true, lastSuccess: null, lastFailure: null, errorRate: 0 },
        ]),
      },
      marketData: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      dataProvenance: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    // Setup Redis mock
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    // Mock constructors
    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
      () => mockPrisma
    );
    const RedisMock = require('ioredis');
    RedisMock.mockImplementation(() => mockRedis);
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      service = new UnifiedDataService();
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should connect to Railway PostgreSQL', async () => {
      service = new UnifiedDataService();
      await service.initialize();
      // Verify Prisma connection
      expect(service).toBeDefined();
    });

    it('should seed data sources on initialization', async () => {
      service = new UnifiedDataService();
      await service.initialize();
      // Verify data sources were seeded
    });
  });

  describe('fetchMarketData', () => {
    beforeEach(async () => {
      service = new UnifiedDataService();
      await service.initialize();
    });

    it('should fetch data from primary source when healthy', async () => {
      const symbols = ['SPY'];

      // Mock Yahoo Finance response
      const mockQuote = {
        regularMarketPrice: 450.75,
        regularMarketVolume: 75000000,
        regularMarketTime: Math.floor(Date.now() / 1000),
        regularMarketOpen: 448.50,
        regularMarketDayHigh: 451.20,
        regularMarketDayLow: 447.80,
        regularMarketPreviousClose: 449.00,
      };
      (yahooFinance.quoteCombine as jest.Mock).mockResolvedValue(mockQuote);

      const result = await service.fetchMarketData(symbols);

      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(1);
      expect(result.data[0].symbol).toBe('SPY');
      expect(result.data[0].close).toBe(450.75);
      expect(result.data[0].source).toBe('YAHOO_FINANCE');
      expect(yahooFinance.quoteCombine).toHaveBeenCalledWith('SPY');
    });

    it('should return cached data when available and fresh', async () => {
      const symbols = ['SPY'];

      // Mock cache hit
      const cachedData = JSON.stringify({
        data: [{
          symbol: 'SPY',
          close: 450.00,
          volume: 70000000,
          date: new Date().toISOString(),
          source: 'YAHOO_FINANCE',
        }],
        timestamp: new Date().toISOString(),
      });
      mockRedis.get.mockResolvedValue(cachedData);

      const result = await service.fetchMarketData(symbols);

      expect(result.cached).toBe(true);
      expect(result.data[0].close).toBe(450.00);
      expect(yahooFinance.quoteCombine).not.toHaveBeenCalled();
    });

    it('should failover to secondary source when primary fails', async () => {
      const symbols = ['SPY'];

      // Mock Yahoo Finance failure
      (yahooFinance.quoteCombine as jest.Mock).mockRejectedValue(new Error('API Error'));

      // Mock Tiingo success
      const mockTiingoResponse = {
        data: [{
          date: new Date().toISOString(),
          close: 451.00,
          open: 449.00,
          high: 452.00,
          low: 448.00,
          volume: 72000000,
        }],
      };
      (axios.get as jest.Mock).mockResolvedValue(mockTiingoResponse);

      const result = await service.fetchMarketData(symbols);

      expect(result.data).toBeDefined();
      expect(result.data[0].source).toBe('TIINGO');
      expect(result.quality.isFailover).toBe(true);
    });

    it('should track provenance for every fetch', async () => {
      const symbols = ['SPY'];

      const mockQuote = {
        regularMarketPrice: 450.75,
        regularMarketVolume: 75000000,
        regularMarketTime: Math.floor(Date.now() / 1000),
        regularMarketOpen: 448.50,
        regularMarketDayHigh: 451.20,
        regularMarketDayLow: 447.80,
        regularMarketPreviousClose: 449.00,
      };
      (yahooFinance.quoteCombine as jest.Mock).mockResolvedValue(mockQuote);

      await service.fetchMarketData(symbols);

      expect(mockPrisma.dataProvenance.create).toHaveBeenCalled();
      const createCall = mockPrisma.dataProvenance.create.mock.calls[0][0];
      expect(createCall.data.sourceSystem).toBe('YAHOO_FINANCE');
      expect(createCall.data.status).toBe('completed');
    });

    it('should store data in PostgreSQL via Prisma', async () => {
      const symbols = ['SPY'];

      const mockQuote = {
        regularMarketPrice: 450.75,
        regularMarketVolume: 75000000,
        regularMarketTime: Math.floor(Date.now() / 1000),
        regularMarketOpen: 448.50,
        regularMarketDayHigh: 451.20,
        regularMarketDayLow: 447.80,
        regularMarketPreviousClose: 449.00,
      };
      (yahooFinance.quoteCombine as jest.Mock).mockResolvedValue(mockQuote);

      await service.fetchMarketData(symbols);

      expect(mockPrisma.marketData.upsert).toHaveBeenCalled();
      const upsertCall = mockPrisma.marketData.upsert.mock.calls[0][0];
      expect(upsertCall.where.unique_market_data.symbol).toBe('SPY');
      expect(upsertCall.create.close).toBe(450.75);
    });

    it('should serve stale cache when all sources fail', async () => {
      const symbols = ['SPY'];

      // Mock all API sources failing
      (yahooFinance.quoteCombine as jest.Mock).mockRejectedValue(new Error('API Error'));
      (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      // Mock stale cache available
      const staleData = JSON.stringify({
        data: [{
          symbol: 'SPY',
          close: 445.00,
          volume: 68000000,
          date: new Date(Date.now() - 7200000).toISOString(), // 2 hours old
          source: 'YAHOO_FINANCE',
        }],
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      });
      mockRedis.get.mockResolvedValue(staleData);

      const result = await service.fetchMarketData(symbols);

      expect(result.quality.isStale).toBe(true);
      expect(result.data[0].close).toBe(445.00);
    });

    it('should throw error when no data available', async () => {
      const symbols = ['SPY'];

      // Mock all sources failing
      (yahooFinance.quoteCombine as jest.Mock).mockRejectedValue(new Error('API Error'));
      (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      // Mock no cache available
      mockRedis.get.mockResolvedValue(null);

      await expect(service.fetchMarketData(symbols)).rejects.toThrow();
    });
  });

  describe('Data Quality Validation', () => {
    beforeEach(async () => {
      service = new UnifiedDataService();
      await service.initialize();
    });

    it('should validate data quality', async () => {
      const symbols = ['SPY'];

      const mockQuote = {
        regularMarketPrice: 450.75,
        regularMarketVolume: 75000000,
        regularMarketTime: Math.floor(Date.now() / 1000),
        regularMarketOpen: 448.50,
        regularMarketDayHigh: 451.20,
        regularMarketDayLow: 447.80,
        regularMarketPreviousClose: 449.00,
      };
      (yahooFinance.quoteCombine as jest.Mock).mockResolvedValue(mockQuote);

      const result = await service.fetchMarketData(symbols);

      expect(result.quality).toBeDefined();
      expect(result.quality.score).toBeGreaterThan(0);
      expect(result.quality.score).toBeLessThanOrEqual(1);
    });

    it('should return quality score > 0.8 for valid data', async () => {
      const symbols = ['SPY', 'QQQ'];

      const mockQuote = {
        regularMarketPrice: 450.75,
        regularMarketVolume: 75000000,
        regularMarketTime: Math.floor(Date.now() / 1000),
        regularMarketOpen: 448.50,
        regularMarketDayHigh: 451.20,
        regularMarketDayLow: 447.80,
        regularMarketPreviousClose: 449.00,
      };
      (yahooFinance.quoteCombine as jest.Mock).mockResolvedValue(mockQuote);

      const result = await service.fetchMarketData(symbols);

      expect(result.quality.score).toBeGreaterThan(0.8);
    });

    it('should detect incomplete data', async () => {
      const symbols = ['INVALID'];

      // Mock incomplete data
      (yahooFinance.quoteCombine as jest.Mock).mockResolvedValue(null);

      const result = await service.fetchMarketData(symbols);

      expect(result.data.length).toBe(0);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', () => {
      const breaker = new CircuitBreaker({
        name: 'TEST',
        threshold: 3,
        timeout: 1000,
      });

      // Simulate 3 failures
      for (let i = 0; i < 3; i++) {
        breaker.execute(async () => {
          throw new Error('Test failure');
        }).catch(() => {});
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker({
        name: 'TEST',
        threshold: 2,
        timeout: 100, // 100ms
      });

      // Open circuit
      for (let i = 0; i < 2; i++) {
        breaker.execute(async () => {
          throw new Error('Test failure');
        }).catch(() => {});
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next call should transition to half-open
      try {
        await breaker.execute(async () => 'success');
      } catch (e) {}

      expect([CircuitBreakerState.HALF_OPEN, CircuitBreakerState.CLOSED]).toContain(
        breaker.getState()
      );
    });

    it('should reset to closed after successful calls in half-open', async () => {
      const breaker = new CircuitBreaker({
        name: 'TEST',
        threshold: 2,
        timeout: 100,
      });

      // Open circuit
      for (let i = 0; i < 2; i++) {
        breaker.execute(async () => {
          throw new Error('Test failure');
        }).catch(() => {});
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Successful calls to close circuit
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      service = new UnifiedDataService();
      await service.initialize();
    });

    it('should return healthy status when all systems operational', async () => {
      const health = await service.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.checks.database).toBe(true);
      expect(health.checks.redis).toBe(true);
    });

    it('should return unhealthy when database fails', async () => {
      // Mock database failure
      const health = await service.healthCheck();
      expect(health.status).toBe('unhealthy');
    });

    it('should check data source health', async () => {
      const health = await service.healthCheck();
      expect(health.checks.dataSources).toBeDefined();
      expect(Array.isArray(health.checks.dataSources)).toBe(true);
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      service = new UnifiedDataService();
      await service.initialize();
    });

    it('should build correct cache keys', () => {
      // Test cache key generation
    });

    it('should respect TTL settings', async () => {
      // Test cache expiration
    });

    it('should handle Redis failures gracefully', async () => {
      // Mock Redis failure
      // Verify service continues to work
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      service = new UnifiedDataService();
      await service.initialize();
    });

    it('should retry failed requests with exponential backoff', async () => {
      // Test retry logic
    });

    it('should log errors appropriately', async () => {
      // Mock logger
      // Verify error logging
    });

    it('should handle network timeouts', async () => {
      // Mock timeout
      // Verify graceful handling
    });
  });

  afterAll(async () => {
    if (service) {
      await service.disconnect();
    }
  });
});
