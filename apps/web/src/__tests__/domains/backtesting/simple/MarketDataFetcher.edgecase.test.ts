/**
 * Edge Case Tests for MarketDataFetcher
 * Story 4.0j - QA Fix TEST-004
 *
 * Test Coverage:
 * - Missing symbol data scenarios
 * - Incomplete market data (gaps, insufficient data points)
 * - Railway quality score below threshold
 * - Signal calculation failures due to missing data
 * - Graceful degradation patterns
 */

import { MarketDataFetcher } from '@/domains/backtesting/simple/data/MarketDataFetcher';
import type { MarketDataPoint } from '@/domains/backtesting/simple/engine/types';

// Mock MarketDataV2Service
jest.mock('@/lib/api/market-data-v2');

import { MarketDataV2Service } from '@/lib/api/market-data-v2';

describe('MarketDataFetcher Edge Cases', () => {
  let fetcher: MarketDataFetcher;

  beforeEach(() => {
    jest.clearAllMocks();
    fetcher = new MarketDataFetcher();
  });

  describe('Missing Symbol Data', () => {
    it('should handle completely missing symbol gracefully', async () => {
      // Arrange - Response missing XLU entirely
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockResolvedValue({
        data: {
          SPY: [{ symbol: 'SPY', date: '2023-01-01', close: 100 }],
          // XLU missing
        },
        quality: {
          score: 0.5,
          issues: ['XLU: No data available'],
        },
        metadata: {
          cached: false,
          source: 'railway',
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await fetcher.fetchHistoricalData({
        symbols: ['SPY', 'XLU'],
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Assert
      expect(result.quality.score).toBe(0.5);
      expect(result.quality.issues).toContain('XLU: No data available');
    });

    it('should validate data completeness for missing symbols', () => {
      // Arrange
      const marketData: Record<string, MarketDataPoint[]> = {
        SPY: [
          { symbol: 'SPY', date: '2023-01-01', close: 100 },
          { symbol: 'SPY', date: '2023-01-02', close: 102 },
        ],
        // XLU missing
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        marketData,
        ['SPY', 'XLU'],
        2 // Require 2 data points
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('XLU: Symbol data missing entirely');
    });

    it('should identify insufficient data points for a symbol', () => {
      // Arrange
      const marketData: Record<string, MarketDataPoint[]> = {
        SPY: Array.from({ length: 50 }, (_, i) => ({
          symbol: 'SPY',
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          close: 100 + i,
        })),
        XLU: [
          // Only 10 data points (below 30 minimum)
          ...Array.from({ length: 10 }, (_, i) => ({
            symbol: 'XLU',
            date: `2023-01-${String(i + 1).padStart(2, '0')}`,
            close: 50 + i,
          })),
        ],
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        marketData,
        ['SPY', 'XLU'],
        30 // Require minimum 30 data points
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('XLU');
      expect(validation.errors[0]).toContain('Insufficient data points');
    });
  });

  describe('Data Quality Issues', () => {
    it('should handle low quality score from Railway backend', async () => {
      // Arrange - Quality score below 0.8 threshold
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockResolvedValue({
        data: {
          SPY: [{ symbol: 'SPY', date: '2023-01-01', close: 100 }],
          XLU: [{ symbol: 'XLU', date: '2023-01-01', close: 50 }],
        },
        quality: {
          score: 0.6, // Below minimum 0.8
          issues: [
            'SPY: Stale data (2 days old)',
            'XLU: Gaps detected in price series',
          ],
        },
        metadata: {
          cached: true,
          source: 'cache',
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await fetcher.fetchHistoricalData({
        symbols: ['SPY', 'XLU'],
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Assert
      expect(result.quality.score).toBe(0.6);
      expect(result.quality.issues.length).toBeGreaterThan(0);
      expect(result.quality.issues).toContain('SPY: Stale data (2 days old)');
    });

    it('should propagate quality issues from Railway backend', async () => {
      // Arrange
      const qualityIssues = [
        'WOOD: Missing 15 trading days',
        'GLD: Price spike detected (+50% in single day)',
        'Data source: Secondary (primary unavailable)',
      ];

      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockResolvedValue({
        data: {
          WOOD: [{ symbol: 'WOOD', date: '2023-01-01', close: 80 }],
          GLD: [{ symbol: 'GLD', date: '2023-01-01', close: 170 }],
        },
        quality: {
          score: 0.75,
          issues: qualityIssues,
        },
        metadata: {
          cached: false,
          source: 'secondary',
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await fetcher.fetchHistoricalData({
        symbols: ['WOOD', 'GLD'],
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      });

      // Assert
      expect(result.quality.issues).toEqual(qualityIssues);
    });
  });

  describe('Incomplete Data Scenarios', () => {
    it('should handle date range with no data', async () => {
      // Arrange - Empty data arrays
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockResolvedValue({
        data: {
          SPY: [],
          XLU: [],
        },
        quality: {
          score: 0.0,
          issues: ['No data available for specified date range'],
        },
        metadata: {
          cached: false,
          source: 'railway',
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await fetcher.fetchHistoricalData({
        symbols: ['SPY', 'XLU'],
        startDate: '2025-01-01', // Future date
        endDate: '2025-12-31',
      });

      // Assert
      expect(result.data.SPY).toEqual([]);
      expect(result.data.XLU).toEqual([]);
      expect(result.quality.score).toBe(0.0);
    });

    it('should validate completely empty market data as invalid', () => {
      // Arrange
      const emptyData: Record<string, MarketDataPoint[]> = {
        SPY: [],
        XLU: [],
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        emptyData,
        ['SPY', 'XLU'],
        30
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
      expect(validation.errors).toContain('SPY: Insufficient data points (0/30)');
      expect(validation.errors).toContain('XLU: Insufficient data points (0/30)');
    });

    it('should handle partial symbol coverage', () => {
      // Arrange - Only 1 out of 3 required symbols has data
      const partialData: Record<string, MarketDataPoint[]> = {
        SPY: Array.from({ length: 50 }, (_, i) => ({
          symbol: 'SPY',
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          close: 100 + i,
        })),
        XLU: [], // Empty
        // WOOD missing entirely
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        partialData,
        ['SPY', 'XLU', 'WOOD'],
        30
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Railway Backend Failure Scenarios', () => {
    it('should handle Railway backend timeout', async () => {
      // Arrange
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockRejectedValue(
        new Error('Request timeout after 30s')
      );

      // Act & Assert
      await expect(
        fetcher.fetchHistoricalData({
          symbols: ['SPY', 'XLU'],
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        })
      ).rejects.toThrow('Request timeout after 30s');
    });

    it('should handle Railway backend 500 error', async () => {
      // Arrange
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockRejectedValue(
        new Error('Railway backend returned 500 Internal Server Error')
      );

      // Act & Assert
      await expect(
        fetcher.fetchHistoricalData({
          symbols: ['SPY', 'XLU'],
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        })
      ).rejects.toThrow('Railway backend returned 500 Internal Server Error');
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      );

      // Act & Assert
      await expect(
        fetcher.fetchHistoricalData({
          symbols: ['SPY'],
          startDate: '2023-01-01',
          endDate: '2023-12-31',
        })
      ).rejects.toThrow('Network error: ECONNREFUSED');
    });
  });

  describe('Data Gaps and Missing Dates', () => {
    it('should validate data with large gaps between dates', () => {
      // Arrange - Data with significant gaps
      const gappedData: Record<string, MarketDataPoint[]> = {
        SPY: [
          { symbol: 'SPY', date: '2023-01-01', close: 100 },
          { symbol: 'SPY', date: '2023-01-02', close: 101 },
          // Missing 28 days
          { symbol: 'SPY', date: '2023-02-01', close: 102 },
          { symbol: 'SPY', date: '2023-02-02', close: 103 },
        ],
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        gappedData,
        ['SPY'],
        30
      );

      // Assert
      // Should fail validation due to insufficient data points
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Insufficient data points (4/30)');
    });

    it('should accept data that meets minimum threshold despite gaps', () => {
      // Arrange - Enough data points but with gaps
      const gappedData: Record<string, MarketDataPoint[]> = {
        SPY: Array.from({ length: 35 }, (_, i) => ({
          symbol: 'SPY',
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          close: 100 + i,
        })),
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        gappedData,
        ['SPY'],
        30
      );

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Signal Calculation with Insufficient Data', () => {
    it('should return quality issues when data is insufficient for reliable signals', async () => {
      // Arrange - Minimal data that passes basic validation but insufficient for signals
      (MarketDataV2Service.prototype.getMarketData as jest.Mock).mockResolvedValue({
        data: {
          SPY: Array.from({ length: 5 }, (_, i) => ({
            symbol: 'SPY',
            date: `2023-01-0${i + 1}`,
            close: 100 + i,
          })),
          XLU: Array.from({ length: 5 }, (_, i) => ({
            symbol: 'XLU',
            date: `2023-01-0${i + 1}`,
            close: 50 + i,
          })),
        },
        quality: {
          score: 0.7,
          issues: ['Insufficient historical data for reliable signal calculation (5 days, need 200+ for MA)'],
        },
        metadata: {
          cached: false,
          source: 'railway',
          timestamp: new Date().toISOString(),
        },
      });

      // Act
      const result = await fetcher.fetchHistoricalData({
        symbols: ['SPY', 'XLU'],
        startDate: '2023-01-01',
        endDate: '2023-01-05',
      });

      // Assert
      expect(result.quality.score).toBeLessThan(0.8);
      expect(result.quality.issues.length).toBeGreaterThan(0);
    });
  });

  describe('validateDataCompleteness Method', () => {
    it('should return valid=true when all requirements met', () => {
      // Arrange
      const completeData: Record<string, MarketDataPoint[]> = {
        SPY: Array.from({ length: 50 }, (_, i) => ({
          symbol: 'SPY',
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          close: 100 + i,
        })),
        XLU: Array.from({ length: 50 }, (_, i) => ({
          symbol: 'XLU',
          date: `2023-01-${String(i + 1).padStart(2, '0')}`,
          close: 50 + i,
        })),
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        completeData,
        ['SPY', 'XLU'],
        30
      );

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should accumulate multiple errors for multiple symbols', () => {
      // Arrange
      const incompleteData: Record<string, MarketDataPoint[]> = {
        SPY: [{ symbol: 'SPY', date: '2023-01-01', close: 100 }], // Only 1 point
        XLU: [], // Empty
        // WOOD missing
      };

      // Act
      const validation = fetcher.validateDataCompleteness(
        incompleteData,
        ['SPY', 'XLU', 'WOOD'],
        30
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBe(3);
      expect(validation.errors).toContain('SPY: Insufficient data points (1/30)');
      expect(validation.errors).toContain('XLU: Insufficient data points (0/30)');
      expect(validation.errors).toContain('WOOD: Symbol data missing entirely');
    });
  });
});
