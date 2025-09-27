/**
 * Signal Service
 * 
 * Handles external API interactions and data fetching for signal calculations.
 * Provides a clean interface between the domain logic and external data sources.
 */

import type { Signal, ConsensusSignal, MarketData, SignalCalculationInput } from '../types';
import { SignalOrchestrator } from '../engines/orchestrator';
import { marketDataService } from '../../market-data';

export class SignalService {
  private static instance: SignalService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  private constructor() {}

  static getInstance(): SignalService {
    if (!SignalService.instance) {
      SignalService.instance = new SignalService();
    }
    return SignalService.instance;
  }

  /**
   * Calculate all signals with fresh market data
   */
  async calculateAllSignals(options: {
    useCache?: boolean;
    cacheTTL?: number;
    historicalDays?: number;
  } = {}): Promise<{
    signals: Signal[];
    consensus: ConsensusSignal;
    metadata: {
      calculatedAt: string;
      dataSource: string;
      cached: boolean;
    };
  }> {
    const { useCache = true, cacheTTL = 5 * 60 * 1000, historicalDays = 250 } = options;

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache('all-signals');
      if (cached) {
        return cached;
      }
    }

    try {
      // Fetch required market data
      const symbols = SignalOrchestrator.getRequiredSymbols();
      const marketData = await this.fetchMarketData(symbols, historicalDays);

      // Calculate signals
      const input: SignalCalculationInput = {
        marketData,
        historicalPeriod: historicalDays,
        lookbackDays: Math.max(22, 92, 201) // Maximum lookback needed
      };

      const signals = SignalOrchestrator.calculateAllSignals(input);
      const consensus = SignalOrchestrator.calculateConsensusSignal(signals);

      const result = {
        signals,
        consensus,
        metadata: {
          calculatedAt: new Date().toISOString(),
          dataSource: 'yahoo-finance',
          cached: false
        }
      };

      // Cache the result
      if (useCache) {
        this.setCache('all-signals', result, cacheTTL);
      }

      return result;

    } catch (error) {
      console.error('Error calculating signals:', error);
      throw new Error(`Signal calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate fast signals for quick market assessment
   */
  async calculateFastSignals(options: {
    useCache?: boolean;
    cacheTTL?: number;
  } = {}): Promise<{
    signals: Signal[];
    consensus: ConsensusSignal;
    metadata: {
      calculatedAt: string;
      dataSource: string;
      cached: boolean;
      mode: 'fast';
    };
  }> {
    const { useCache = true, cacheTTL = 2 * 60 * 1000 } = options; // Shorter cache for fast mode

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache('fast-signals');
      if (cached) {
        return cached;
      }
    }

    try {
      // Fetch only essential symbols for fast calculation
      const essentialSymbols = ['SPY', 'XLU']; // Core symbols for fast mode
      const marketData = await this.fetchMarketData(essentialSymbols, 50); // Shorter history for speed

      const signals = SignalOrchestrator.calculateFastSignals(marketData);
      const consensus = SignalOrchestrator.calculateConsensusSignal(signals);

      const result = {
        signals,
        consensus,
        metadata: {
          calculatedAt: new Date().toISOString(),
          dataSource: 'yahoo-finance',
          cached: false,
          mode: 'fast' as const
        }
      };

      // Cache the result
      if (useCache) {
        this.setCache('fast-signals', result, cacheTTL);
      }

      return result;

    } catch (error) {
      console.error('Error calculating fast signals:', error);
      throw new Error(`Fast signal calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get signal for a specific type
   */
  async calculateSignal(
    signalType: Signal['type'], 
    options: {
      useCache?: boolean;
      historicalDays?: number;
    } = {}
  ): Promise<Signal | null> {
    const { useCache = true, historicalDays = 250 } = options;

    const cacheKey = `signal-${signalType}`;
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Get required symbols for this specific signal
      const requiredSymbols = this.getRequiredSymbolsForSignal(signalType);
      const marketData = await this.fetchMarketData(requiredSymbols, historicalDays);

      // Calculate specific signal
      let signal: Signal | null = null;

      switch (signalType) {
        case 'utilities_spy':
          signal = SignalOrchestrator['calculateUtilitiesSpySignal'](marketData);
          break;
        case 'lumber_gold':
          signal = SignalOrchestrator['calculateLumberGoldSignal'](marketData);
          break;
        // Add other signals as they're implemented
        default:
          throw new Error(`Signal type ${signalType} not yet implemented`);
      }

      if (useCache && signal) {
        this.setCache(cacheKey, signal, 5 * 60 * 1000); // 5 minute cache
      }

      return signal;

    } catch (error) {
      console.error(`Error calculating ${signalType} signal:`, error);
      return null;
    }
  }

  /**
   * Get historical signals for backtesting
   */
  async getHistoricalSignals(
    startDate: Date,
    endDate: Date,
    signalTypes?: Signal['type'][]
  ): Promise<{
    date: string;
    signals: Signal[];
    consensus: ConsensusSignal;
  }[]> {
    // TODO: Implement historical signal calculation
    // This would fetch historical market data and calculate signals for each day
    throw new Error('Historical signals not yet implemented');
  }

  /**
   * Fetch market data for symbols
   */
  private async fetchMarketData(
    symbols: string[], 
    days: number
  ): Promise<Record<string, MarketData[]>> {
    const marketData: Record<string, MarketData[]> = {};

    for (const symbol of symbols) {
      try {
        const data = await marketDataService.getHistoricalData(symbol, days);
        marketData[symbol] = data;
      } catch (error) {
        console.warn(`Failed to fetch data for ${symbol}:`, error);
        // Continue with other symbols rather than failing completely
      }
    }

    return marketData;
  }

  /**
   * Get required symbols for a specific signal type
   */
  private getRequiredSymbolsForSignal(signalType: Signal['type']): string[] {
    const symbolMap: Record<Signal['type'], string[]> = {
      'utilities_spy': ['SPY', 'XLU'],
      'lumber_gold': ['WOOD', 'GLD'],
      'treasury_curve': ['IEF', 'TLT'],
      'vix_defensive': ['^VIX'],
      'sp500_ma': ['SPY']
    };

    return symbolMap[signalType] || [];
  }

  /**
   * Cache management
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // Mark as cached in metadata
    if (cached.data && typeof cached.data === 'object' && cached.data.metadata) {
      cached.data.metadata.cached = true;
    }

    return cached.data;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    totalMemory: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: JSON.stringify(Array.from(this.cache.values())).length
    };
  }
}

// Export singleton instance
export const signalService = SignalService.getInstance();