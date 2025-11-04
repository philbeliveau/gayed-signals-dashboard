/**
 * Market Data Fetcher for Simple Backtesting
 * Story: 4.0j - Simple Gayed Signals Backtesting Platform
 *
 * Wrapper around MarketDataV2Service to fetch historical price data
 * for backtesting. Enforces real data only - no synthetic fallbacks.
 */

import { MarketDataV2Service, MarketDataResponse } from '@/lib/api/market-data-v2';
import type { MarketDataPoint } from '../engine/types';

interface FetchHistoricalDataParams {
  symbols: string[];
  startDate?: string;
  endDate?: string;
}

interface FetchHistoricalDataResult {
  data: Record<string, MarketDataPoint[]>; // Symbol -> array of price points
  quality: {
    score: number;
    issues: string[];
  };
  source: string;
  cached: boolean;
}

export class MarketDataFetcher {
  private marketDataService: MarketDataV2Service;

  constructor(marketDataService?: MarketDataV2Service) {
    this.marketDataService = marketDataService || new MarketDataV2Service();
  }

  /**
   * Fetch historical market data for backtesting
   *
   * @param params - Symbols and date range
   * @returns Organized market data by symbol with quality metrics
   * @throws Error if data quality is too low or data unavailable
   */
  async fetchHistoricalData(
    params: FetchHistoricalDataParams
  ): Promise<FetchHistoricalDataResult> {
    const { symbols, startDate, endDate } = params;

    try {
      // Fetch from Railway backend via MarketDataV2Service
      const response: MarketDataResponse = await this.marketDataService.getMarketData({
        symbols,
        useCache: true,
        fallbackEnabled: true,
        startDate,  // Pass through date range for historical data (Story 4.0j)
        endDate,
      });

      // Validate quality threshold (minimum 0.8)
      if (response.result.quality.score < 0.8) {
        throw new Error(
          `Data quality too low for reliable backtesting: ${response.result.quality.score.toFixed(2)}. Issues: ${response.result.quality.issues.join(', ')}`
        );
      }

      // Organize data by symbol
      const dataBySymbol = this.organizeDataBySymbol(response.result.data);

      // Validate all requested symbols have data
      const missingSymbols = symbols.filter(symbol => !dataBySymbol[symbol] || dataBySymbol[symbol].length === 0);
      if (missingSymbols.length > 0) {
        throw new Error(`Missing data for symbols: ${missingSymbols.join(', ')}`);
      }

      // Filter by date range if provided
      let filteredData = dataBySymbol;
      if (startDate || endDate) {
        filteredData = this.filterByDateRange(dataBySymbol, startDate, endDate);
      }

      return {
        data: filteredData,
        quality: response.result.quality,
        source: response.result.source,
        cached: response.result.cached,
      };
    } catch (error) {
      console.error('[MarketDataFetcher] Failed to fetch historical data:', error);

      // Re-throw with clear error message
      if (error instanceof Error) {
        throw new Error(`Failed to fetch market data: ${error.message}`);
      }
      throw new Error('Failed to fetch market data: Unknown error');
    }
  }

  /**
   * Organize flat array of market data points by symbol
   */
  private organizeDataBySymbol(
    data: Array<{ symbol: string; date: string; close: number; open?: number; high?: number; low?: number; volume?: number }>
  ): Record<string, MarketDataPoint[]> {
    const organized: Record<string, MarketDataPoint[]> = {};

    for (const point of data) {
      if (!organized[point.symbol]) {
        organized[point.symbol] = [];
      }

      organized[point.symbol].push({
        symbol: point.symbol,
        date: point.date,
        close: point.close,
        open: point.open,
        high: point.high,
        low: point.low,
        volume: point.volume,
      });
    }

    // Sort each symbol's data by date
    for (const symbol in organized) {
      organized[symbol].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return organized;
  }

  /**
   * Filter data by date range
   */
  private filterByDateRange(
    dataBySymbol: Record<string, MarketDataPoint[]>,
    startDate?: string,
    endDate?: string
  ): Record<string, MarketDataPoint[]> {
    const filtered: Record<string, MarketDataPoint[]> = {};

    const start = startDate ? new Date(startDate).getTime() : -Infinity;
    const end = endDate ? new Date(endDate).getTime() : Infinity;

    for (const [symbol, points] of Object.entries(dataBySymbol)) {
      filtered[symbol] = points.filter(point => {
        const pointDate = new Date(point.date).getTime();
        return pointDate >= start && pointDate <= end;
      });
    }

    return filtered;
  }

  /**
   * Validate that all required symbols have sufficient data
   */
  validateDataCompleteness(
    dataBySymbol: Record<string, MarketDataPoint[]>,
    requiredSymbols: string[],
    minimumDataPoints: number = 30
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const symbol of requiredSymbols) {
      if (!dataBySymbol[symbol]) {
        errors.push(`Missing data for symbol: ${symbol}`);
        continue;
      }

      if (dataBySymbol[symbol].length < minimumDataPoints) {
        errors.push(
          `Insufficient data for ${symbol}: ${dataBySymbol[symbol].length} points (minimum ${minimumDataPoints})`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
