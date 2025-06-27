import { fetchMarketData, validateMarketData, YahooFinanceClient } from '../lib/yahoo-finance';
import { MarketData } from '../lib/types';

// Mock the yahoo-finance2 module
jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: {
    historical: jest.fn(),
  },
}));

describe('Yahoo Finance Data Fetching', () => {
  let mockYahooFinance: jest.Mocked<any>;
  
  beforeEach(() => {
    mockYahooFinance = require('yahoo-finance2').default;
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchMarketData', () => {
    describe('Success Cases', () => {
      test('should fetch data for single symbol successfully', async () => {
        // This test will fail initially - RED phase
        const mockData = [
          { date: new Date('2023-01-01'), close: 100, volume: 1000 },
          { date: new Date('2023-01-02'), close: 101, volume: 1100 }
        ];
        mockYahooFinance.historical.mockResolvedValue(mockData);

        const result = await fetchMarketData(['SPY']);
        
        expect(result).toHaveProperty('SPY');
        expect(result.SPY).toHaveLength(2);
        expect(result.SPY[0]).toMatchObject({
          date: '2023-01-01',
          symbol: 'SPY',
          close: 100,
          volume: 1000
        });
      });

      test('should fetch data for multiple symbols successfully', async () => {
        // This test will fail initially - RED phase
        const mockDataSPY = [
          { date: new Date('2023-01-01'), close: 100, volume: 1000 }
        ];
        const mockDataXLU = [
          { date: new Date('2023-01-01'), close: 50, volume: 500 }
        ];
        
        mockYahooFinance.historical
          .mockResolvedValueOnce(mockDataSPY)
          .mockResolvedValueOnce(mockDataXLU);

        const result = await fetchMarketData(['SPY', 'XLU']);
        
        expect(result).toHaveProperty('SPY');
        expect(result).toHaveProperty('XLU');
        expect(result.SPY[0].symbol).toBe('SPY');
        expect(result.XLU[0].symbol).toBe('XLU');
      });
    });

    describe('Error Handling', () => {
      test('should handle network errors gracefully', async () => {
        // This test will fail initially - RED phase
        const networkError = new Error('ECONNREFUSED');
        networkError.name = 'NetworkError';
        mockYahooFinance.historical.mockRejectedValue(networkError);

        const result = await fetchMarketData(['SPY']);
        
        expect(result.SPY).toEqual([]);
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Error fetching data for SPY'),
          networkError
        );
      });

      test('should handle rate limiting with exponential backoff', async () => {
        // This test will fail initially - RED phase
        const rateLimitError = new Error('Too many requests');
        rateLimitError.name = 'RateLimitError';
        mockYahooFinance.historical
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce([
            { date: new Date('2023-01-01'), close: 100, volume: 1000 }
          ]);

        const result = await fetchMarketData(['SPY']);
        
        expect(mockYahooFinance.historical).toHaveBeenCalledTimes(2);
        expect(result.SPY).toHaveLength(1);
      });

      test('should handle invalid symbol errors', async () => {
        // This test will fail initially - RED phase
        const invalidSymbolError = new Error('Invalid symbol');
        invalidSymbolError.name = 'InvalidSymbolError';
        mockYahooFinance.historical.mockRejectedValue(invalidSymbolError);

        const result = await fetchMarketData(['INVALID']);
        
        expect(result.INVALID).toEqual([]);
      });

      test('should handle API quota exceeded', async () => {
        // This test will fail initially - RED phase
        const quotaError = new Error('API quota exceeded');
        quotaError.name = 'QuotaExceededError';
        mockYahooFinance.historical.mockRejectedValue(quotaError);

        const result = await fetchMarketData(['SPY']);
        
        expect(result.SPY).toEqual([]);
      });

      test('should handle malformed response data', async () => {
        // This test will fail initially - RED phase
        const malformedData = [
          { date: 'invalid', close: null, volume: undefined },
          { close: 100 } // missing date
        ];
        mockYahooFinance.historical.mockResolvedValue(malformedData);

        const result = await fetchMarketData(['SPY']);
        
        expect(result.SPY).toEqual([]);
      });
    });

    describe('Rate Limiting', () => {
      test('should respect rate limits with proper delays', async () => {
        // This test will fail initially - RED phase
        const mockData = [
          { date: new Date('2023-01-01'), close: 100, volume: 1000 }
        ];
        mockYahooFinance.historical.mockResolvedValue(mockData);

        const startTime = Date.now();
        await fetchMarketData(['SPY', 'XLU']);
        
        // Should have at least 100ms delay between requests
        expect(Date.now() - startTime).toBeGreaterThanOrEqual(100);
      });

      test('should implement exponential backoff on rate limit errors', async () => {
        // This test will fail initially - RED phase
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.name = 'RateLimitError';
        
        mockYahooFinance.historical
          .mockRejectedValueOnce(rateLimitError)
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce([
            { date: new Date('2023-01-01'), close: 100, volume: 1000 }
          ]);

        const startTime = Date.now();
        await fetchMarketData(['SPY']);
        
        // Should have exponential backoff: 1s + 2s = 3s minimum
        expect(Date.now() - startTime).toBeGreaterThanOrEqual(3000);
      });

      test('should give up after max retry attempts', async () => {
        // This test will fail initially - RED phase
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.name = 'RateLimitError';
        mockYahooFinance.historical.mockRejectedValue(rateLimitError);

        const result = await fetchMarketData(['SPY']);
        
        expect(mockYahooFinance.historical).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
        expect(result.SPY).toEqual([]);
      });
    });

    describe('Data Validation', () => {
      test('should filter out invalid data points', async () => {
        // This test will fail initially - RED phase
        const mockData = [
          { date: new Date('2023-01-01'), close: 100, volume: 1000 }, // valid
          { date: new Date('2023-01-02'), close: -50, volume: 500 }, // negative price
          { date: new Date('2023-01-03'), close: 0, volume: 0 }, // zero price
          { date: new Date('2023-01-04'), close: 102, volume: 1200 } // valid
        ];
        mockYahooFinance.historical.mockResolvedValue(mockData);

        const result = await fetchMarketData(['SPY']);
        
        expect(result.SPY).toHaveLength(2);
        expect(result.SPY.every(point => point.close > 0)).toBe(true);
      });

      test('should handle missing volume data', async () => {
        // This test will fail initially - RED phase
        const mockData = [
          { date: new Date('2023-01-01'), close: 100 }, // no volume
          { date: new Date('2023-01-02'), close: 101, volume: undefined }
        ];
        mockYahooFinance.historical.mockResolvedValue(mockData);

        const result = await fetchMarketData(['SPY']);
        
        expect(result.SPY).toHaveLength(2);
        expect(result.SPY[0].volume).toBeUndefined();
        expect(result.SPY[1].volume).toBeUndefined();
      });
    });

    describe('Symbol Handling', () => {
      test('should handle symbols with caret prefix', async () => {
        // This test will fail initially - RED phase
        const mockData = [
          { date: new Date('2023-01-01'), close: 100, volume: 1000 }
        ];
        mockYahooFinance.historical.mockResolvedValue(mockData);

        const result = await fetchMarketData(['^VIX']);
        
        expect(mockYahooFinance.historical).toHaveBeenCalledWith(
          '^VIX',
          expect.any(Object)
        );
        expect(result).toHaveProperty('VIX'); // cleaned symbol
        expect(result.VIX[0].symbol).toBe('VIX');
      });

      test('should handle empty symbol array', async () => {
        // This test will fail initially - RED phase
        const result = await fetchMarketData([]);
        
        expect(result).toEqual({});
        expect(mockYahooFinance.historical).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateMarketData', () => {
    test('should validate sufficient data for required symbols', () => {
      // This test will fail initially - RED phase
      const mockData: Record<string, MarketData[]> = {
        SPY: Array.from({ length: 300 }, (_, i) => ({
          date: `2023-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          symbol: 'SPY',
          close: 100 + i
        })),
        XLU: Array.from({ length: 300 }, (_, i) => ({
          date: `2023-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
          symbol: 'XLU',
          close: 50 + i
        }))
      };

      const result = validateMarketData(mockData);
      
      expect(result).toBe(true);
    });

    test('should fail validation for insufficient data', () => {
      // This test will fail initially - RED phase
      const mockData: Record<string, MarketData[]> = {
        SPY: Array.from({ length: 100 }, (_, i) => ({
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          symbol: 'SPY',
          close: 100 + i
        })),
        XLU: []
      };

      const result = validateMarketData(mockData);
      
      expect(result).toBe(false);
    });

    test('should fail validation for missing required symbols', () => {
      // This test will fail initially - RED phase
      const mockData: Record<string, MarketData[]> = {
        SPY: Array.from({ length: 300 }, (_, i) => ({
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          symbol: 'SPY',
          close: 100 + i
        }))
        // Missing XLU
      };

      const result = validateMarketData(mockData);
      
      expect(result).toBe(false);
    });
  });

  describe('YahooFinanceClient class', () => {
    test('should create client with default configuration', () => {
      // This test will fail initially - RED phase
      const client = new YahooFinanceClient();
      
      expect(client).toBeInstanceOf(YahooFinanceClient);
      expect(client.getRateLimit()).toBe(100); // default 100ms
      expect(client.getMaxRetries()).toBe(3); // default 3 retries
    });

    test('should create client with custom configuration', () => {
      // This test will fail initially - RED phase
      const client = new YahooFinanceClient({
        rateLimit: 200,
        maxRetries: 5,
        timeout: 10000
      });
      
      expect(client.getRateLimit()).toBe(200);
      expect(client.getMaxRetries()).toBe(5);
      expect(client.getTimeout()).toBe(10000);
    });

    test('should track API usage statistics', async () => {
      // This test will fail initially - RED phase
      const client = new YahooFinanceClient();
      const mockData = [
        { date: new Date('2023-01-01'), close: 100, volume: 1000 }
      ];
      mockYahooFinance.historical.mockResolvedValue(mockData);

      await client.fetchMarketData(['SPY']);
      
      const stats = client.getUsageStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
    });

    test('should handle concurrent requests with rate limiting', async () => {
      // This test will fail initially - RED phase
      const client = new YahooFinanceClient({ rateLimit: 50 });
      const mockData = [
        { date: new Date('2023-01-01'), close: 100, volume: 1000 }
      ];
      mockYahooFinance.historical.mockResolvedValue(mockData);

      const promises = [
        client.fetchMarketData(['SPY']),
        client.fetchMarketData(['XLU']),
        client.fetchMarketData(['VTI'])
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(Object.keys(result)).toHaveLength(1);
      });
    });
  });
});