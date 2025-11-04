/**
 * Integration Tests for /api/backtest-simple
 * Story 4.0j - QA Fix TEST-003
 *
 * Test Coverage:
 * - Authentication (Clerk auth-first pattern)
 * - Request validation (signal types, dates)
 * - Railway backend data fetching integration
 * - Response formatting
 * - Error handling
 */

import { POST, GET } from '@/app/api/backtest-simple/route';
import { NextRequest } from 'next/server';

// Mock Clerk authentication
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock MarketDataFetcher to isolate API logic
jest.mock('@/domains/backtesting/simple/data/MarketDataFetcher');
// Mock SimpleBacktestEngine
jest.mock('@/domains/backtesting/simple/engine/SimpleBacktestEngine');
// Mock formatBacktestResult
jest.mock('@/domains/backtesting/simple/results/BacktestResults');

import { auth } from '@clerk/nextjs/server';
import { MarketDataFetcher } from '@/domains/backtesting/simple/data/MarketDataFetcher';
import { SimpleBacktestEngine } from '@/domains/backtesting/simple/engine/SimpleBacktestEngine';
import { formatBacktestResult } from '@/domains/backtesting/simple/results/BacktestResults';

describe('/api/backtest-simple Integration Tests', () => {
  const mockUserId = 'user_test123';

  // Helper to create mock requests
  const createMockRequest = (body: any): NextRequest => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: authenticated user
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
  });

  describe('GET /api/backtest-simple (Health Check)', () => {
    it('should return API status and documentation', async () => {
      // Act
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.endpoint).toBe('/api/backtest-simple');
      expect(data.methods).toContain('POST');
      expect(data.signalTypes).toHaveLength(5);
      expect(data.requiredFields).toContain('signalType');
      expect(data.requiredFields).toContain('startDate');
      expect(data.requiredFields).toContain('endDate');
    });
  });

  describe('POST /api/backtest-simple - Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Authentication required');
    });

    it('should proceed when user is authenticated', async () => {
      // Arrange
      (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });

      // Mock successful data fetch and backtest
      const mockMarketData = {
        data: {
          SPY: [{ symbol: 'SPY', date: '2023-01-01', close: 100 }],
          XLU: [{ symbol: 'XLU', date: '2023-01-01', close: 50 }],
        },
        quality: { score: 0.95, issues: [] },
        source: 'railway',
        cached: false,
      };

      const mockBacktestResult = {
        config: {
          signalType: 'utilities-spy',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          initialCapital: 10000,
        },
        metrics: {
          totalReturn: 15.5,
          numberOfTrades: 10,
          winRate: 60,
          maxDrawdown: 5.2,
          finalValue: 11550,
          initialValue: 10000,
        },
        trades: [],
        equityCurve: [],
        dataQuality: { score: 0.95, issues: [] },
      };

      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue(mockMarketData);
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (SimpleBacktestEngine.runBacktest as jest.Mock).mockReturnValue(mockBacktestResult);
      (formatBacktestResult as jest.Mock).mockReturnValue(mockBacktestResult);

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle Clerk auth errors gracefully in development', async () => {
      // Arrange
      (auth as jest.Mock).mockRejectedValue(new Error('Clerk not configured'));

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Authentication required');
    });
  });

  describe('POST /api/backtest-simple - Request Validation', () => {
    it('should return 400 when signalType is missing', async () => {
      // Arrange
      const request = createMockRequest({
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when startDate is missing', async () => {
      // Arrange
      const request = createMockRequest({
        signalType: 'utilities-spy',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when endDate is missing', async () => {
      // Arrange
      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid signal type', async () => {
      // Arrange
      const request = createMockRequest({
        signalType: 'invalid-signal',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid signal type');
    });

    it('should accept all valid signal types', async () => {
      // Arrange
      const validSignals = [
        'utilities-spy',
        'lumber-gold',
        'treasury-curve',
        'sp500-ma',
        'vix-defensive',
      ];

      // Mock successful execution for all signals
      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue({
        data: { SPY: [{ symbol: 'SPY', date: '2023-01-01', close: 100 }] },
        quality: { score: 0.95, issues: [] },
        source: 'railway',
        cached: false,
      });
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (SimpleBacktestEngine.runBacktest as jest.Mock).mockReturnValue({
        metrics: { totalReturn: 10 },
        trades: [],
        equityCurve: [],
        dataQuality: { score: 0.95, issues: [] },
      });
      (formatBacktestResult as jest.Mock).mockReturnValue({});

      // Act & Assert
      for (const signalType of validSignals) {
        const request = createMockRequest({
          signalType,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it('should return 400 for invalid date format', async () => {
      // Arrange
      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: 'invalid-date',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date format');
    });

    it('should return 400 when startDate is after endDate', async () => {
      // Arrange
      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-12-31',
        endDate: '2023-01-01',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('startDate must be before endDate');
    });

    it('should use default initialCapital when not provided', async () => {
      // Arrange
      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue({
        data: { SPY: [{ symbol: 'SPY', date: '2023-01-01', close: 100 }] },
        quality: { score: 0.95, issues: [] },
        source: 'railway',
        cached: false,
      });
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (SimpleBacktestEngine.runBacktest as jest.Mock).mockReturnValue({
        metrics: {},
        trades: [],
        equityCurve: [],
        dataQuality: { score: 0.95, issues: [] },
      });
      (formatBacktestResult as jest.Mock).mockReturnValue({});

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        // initialCapital not provided
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(SimpleBacktestEngine.runBacktest).toHaveBeenCalledWith(
        expect.objectContaining({ initialCapital: 10000 }),
        expect.any(Object)
      );
    });
  });

  describe('POST /api/backtest-simple - Data Fetching Integration', () => {
    it('should return 400 when data validation fails', async () => {
      // Arrange
      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue({
        data: { SPY: [] }, // Empty data
        quality: { score: 0.5, issues: ['Insufficient data'] },
        source: 'railway',
        cached: false,
      });
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['SPY: Insufficient data points (0/30)'],
      });

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Insufficient market data');
      expect(data.details).toContain('SPY: Insufficient data points (0/30)');
    });

    it('should call MarketDataFetcher with correct symbols for utilities-spy', async () => {
      // Arrange
      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue({
        data: { SPY: [{ close: 100 }], XLU: [{ close: 50 }] },
        quality: { score: 0.95, issues: [] },
        source: 'railway',
        cached: false,
      });
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (SimpleBacktestEngine.runBacktest as jest.Mock).mockReturnValue({
        metrics: {},
        trades: [],
        equityCurve: [],
        dataQuality: { score: 0.95, issues: [] },
      });
      (formatBacktestResult as jest.Mock).mockReturnValue({});

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      await POST(request);

      // Assert
      expect(MarketDataFetcher.prototype.fetchHistoricalData).toHaveBeenCalledWith({
        symbols: expect.arrayContaining(['SPY', 'XLU']),
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });
    });
  });

  describe('POST /api/backtest-simple - Successful Execution', () => {
    it('should return formatted backtest result on success', async () => {
      // Arrange
      const mockResult = {
        config: {
          signalType: 'utilities-spy',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          initialCapital: 10000,
        },
        metrics: {
          totalReturn: 15.5,
          numberOfTrades: 10,
          winRate: 60,
          maxDrawdown: 5.2,
          finalValue: 11550,
          initialValue: 10000,
        },
        trades: [
          { date: '2023-01-01', action: 'BUY', symbol: 'SPY', price: 100, reason: 'Signal: RISK_ON' },
        ],
        equityCurve: [
          { date: '2023-01-01', value: 10000, position: 'SPY' },
        ],
        dataQuality: { score: 0.95, issues: [] },
      };

      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue({
        data: { SPY: [{ close: 100 }], XLU: [{ close: 50 }] },
        quality: { score: 0.95, issues: [] },
        source: 'railway',
        cached: false,
      });
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (SimpleBacktestEngine.runBacktest as jest.Mock).mockReturnValue(mockResult);
      (formatBacktestResult as jest.Mock).mockReturnValue(mockResult);

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toBeDefined();
      expect(data.result.metrics.totalReturn).toBe(15.5);
    });
  });

  describe('POST /api/backtest-simple - Error Handling', () => {
    it('should return 500 when backtest engine throws error', async () => {
      // Arrange
      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockResolvedValue({
        data: { SPY: [{ close: 100 }] },
        quality: { score: 0.95, issues: [] },
        source: 'railway',
        cached: false,
      });
      (MarketDataFetcher.prototype.validateDataCompleteness as jest.Mock).mockReturnValue({
        valid: true,
        errors: [],
      });
      (SimpleBacktestEngine.runBacktest as jest.Mock).mockImplementation(() => {
        throw new Error('Backtest calculation failed');
      });

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Backtest failed');
      expect(data.message).toBe('Backtest calculation failed');
    });

    it('should return 500 when data fetcher throws error', async () => {
      // Arrange
      (MarketDataFetcher.prototype.fetchHistoricalData as jest.Mock).mockRejectedValue(
        new Error('Railway backend unavailable')
      );

      const request = createMockRequest({
        signalType: 'utilities-spy',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Railway backend unavailable');
    });
  });
});
