/**
 * Data Source Fallback System
 * 
 * Provides multiple data provider strategies and intelligent failover
 * to ensure continuous service availability when primary data sources fail.
 */

import { MarketData } from '../types';
import { riskManager, AlertLevel } from './risk-manager';

export interface DataProvider {
  name: string;
  priority: number;
  healthCheck: () => Promise<boolean>;
  fetchData: (symbols: string[], period: string) => Promise<Record<string, MarketData[]>>;
  rateLimit: number;
  timeout: number;
}

export interface CacheEntry {
  data: Record<string, MarketData[]>;
  timestamp: Date;
  expiryTime: Date;
  source: string;
}

export interface FallbackConfig {
  cacheEnabled: boolean;
  cacheTTL: number; // Time to live in milliseconds
  staleDataTolerance: number; // How old can cached data be in emergency
  healthCheckInterval: number;
  maxConcurrentProviders: number;
}

/**
 * Yahoo Finance Data Provider (Primary)
 */
class YahooFinanceProvider implements DataProvider {
  name = 'yahoo-finance';
  priority = 1;
  rateLimit = 100; // ms between requests
  timeout = 30000; // 30 seconds

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to fetch a single data point
      const yahooFinance = await import('yahoo-finance2');
      const testData = await Promise.race([
        yahooFinance.default.historical('SPY', {
          period1: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          period2: new Date(),
          interval: '1d'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      return Array.isArray(testData) && testData.length > 0;
    } catch (error) {
      console.warn('Yahoo Finance health check failed:', error);
      return false;
    }
  }

  async fetchData(symbols: string[], period: string): Promise<Record<string, MarketData[]>> {
    const yahooFinance = await import('yahoo-finance2');
    const results: Record<string, MarketData[]> = {};
    
    const periodDays = this.parsePeriod(period);
    const startDate = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
    
    for (const symbol of symbols) {
      try {
        const cleanSymbol = symbol.replace('^', '');
        const historical = await yahooFinance.default.historical(symbol, {
          period1: startDate,
          period2: new Date(),
          interval: '1d'
        });

        if (Array.isArray(historical) && historical.length > 0) {
          results[cleanSymbol] = historical
            .filter(data => data && typeof data.close === 'number' && data.close > 0)
            .map(data => ({
              date: data.date.toISOString().split('T')[0],
              symbol: cleanSymbol,
              close: data.close,
              volume: data.volume
            }));
        }
        
        // Rate limiting
        await this.delay(this.rateLimit);
        
      } catch (error) {
        console.error(`Yahoo Finance error for ${symbol}:`, error);
        results[symbol.replace('^', '')] = [];
      }
    }
    
    return results;
  }

  private parsePeriod(period: string): number {
    const match = period.match(/(\d+)([ymd])/);
    if (!match) return 730; // Default 2 years
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'y': return value * 365;
      case 'm': return value * 30;
      case 'd': return value;
      default: return 730;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Fallback Data Provider (Mock/Static Data)
 * Uses static data or simple calculations when all APIs fail
 */
class FallbackDataProvider implements DataProvider {
  name = 'fallback-static';
  priority = 99;
  rateLimit = 0;
  timeout = 1000;

  async healthCheck(): Promise<boolean> {
    return true; // Always available
  }

  async fetchData(symbols: string[], period: string): Promise<Record<string, MarketData[]>> {
    console.warn('Using fallback data provider - generating synthetic data');
    
    const results: Record<string, MarketData[]> = {};
    const periodDays = this.parsePeriod(period);
    
    for (const symbol of symbols) {
      const cleanSymbol = symbol.replace('^', '');
      results[cleanSymbol] = this.generateSyntheticData(cleanSymbol, periodDays);
    }
    
    return results;
  }

  private parsePeriod(period: string): number {
    const match = period.match(/(\d+)([ymd])/);
    if (!match) return 730;
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch (unit) {
      case 'y': return value * 365;
      case 'm': return value * 30;
      case 'd': return value;
      default: return 730;
    }
  }

  private generateSyntheticData(symbol: string, days: number): MarketData[] {
    const data: MarketData[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    let currentPrice = basePrice;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      
      // Simple random walk with mean reversion
      const change = (Math.random() - 0.5) * 0.02; // ±1% daily change
      const meanReversion = (basePrice - currentPrice) * 0.001; // 0.1% mean reversion
      currentPrice *= (1 + change + meanReversion);
      
      data.push({
        date: date.toISOString().split('T')[0],
        symbol,
        close: Math.round(currentPrice * 100) / 100,
        volume: Math.floor(Math.random() * 1000000) + 100000
      });
    }
    
    return data;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: Record<string, number> = {
      'SPY': 450,
      'XLU': 70,
      'GLD': 180,
      'VIX': 20,
      'TLT': 95,
      'IEF': 105,
      'LBS': 25,
      // Add more symbols as needed
    };
    
    return basePrices[symbol] || 100;
  }
}

/**
 * Data Source Manager with Fallback Capabilities
 */
export class DataFallbackManager {
  private providers: DataProvider[] = [];
  private cache = new Map<string, CacheEntry>();
  private providerHealth = new Map<string, boolean>();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private config: FallbackConfig) {
    this.initializeProviders();
    this.startHealthMonitoring();
  }

  private initializeProviders(): void {
    this.providers = [
      new YahooFinanceProvider(),
      new FallbackDataProvider()
    ].sort((a, b) => a.priority - b.priority);
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const provider of this.providers) {
        try {
          const isHealthy = await provider.healthCheck();
          this.providerHealth.set(provider.name, isHealthy);
          
          if (!isHealthy && provider.priority === 1) {
            riskManager.emit('alert', {
              id: `provider_health_${Date.now()}`,
              level: AlertLevel.WARNING,
              message: `Primary data provider ${provider.name} is unhealthy`,
              timestamp: new Date(),
              metadata: { provider: provider.name }
            });
          }
        } catch (error) {
          this.providerHealth.set(provider.name, false);
          console.error(`Health check failed for ${provider.name}:`, error);
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Fetch market data with automatic failover
   */
  async fetchMarketDataWithFallback(
    symbols: string[], 
    period: string = '2y'
  ): Promise<{
    data: Record<string, MarketData[]>;
    source: string;
    cached: boolean;
    partial: boolean;
  }> {
    const cacheKey = `${symbols.join(',')}_${period}`;
    
    // Try cache first if enabled
    if (this.config.cacheEnabled) {
      const cachedResult = this.getCachedData(cacheKey);
      if (cachedResult) {
        return {
          data: cachedResult.data,
          source: `${cachedResult.source} (cached)`,
          cached: true,
          partial: false
        };
      }
    }

    // Try each provider in priority order
    const healthyProviders = this.providers.filter(p => 
      this.providerHealth.get(p.name) !== false
    );

    for (const provider of healthyProviders) {
      try {
        console.log(`Attempting to fetch data from ${provider.name}...`);
        
        const data = await riskManager.executeWithRiskMitigation(
          () => provider.fetchData(symbols, period),
          `fetch_data_${provider.name}`,
          { timeout: provider.timeout }
        );

        // Validate data completeness
        const completeness = this.validateDataCompleteness(data, symbols);
        
        if (completeness.isComplete || completeness.partialPercentage > 0.5) {
          // Cache successful result
          if (this.config.cacheEnabled) {
            this.cacheData(cacheKey, data, provider.name);
          }

          return {
            data,
            source: provider.name,
            cached: false,
            partial: !completeness.isComplete
          };
        }
        
      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error);
        continue;
      }
    }

    // If all providers fail, try stale cache data
    if (this.config.cacheEnabled) {
      const staleData = this.getStaleData(cacheKey);
      if (staleData) {
        riskManager.emit('alert', {
          id: `stale_data_${Date.now()}`,
          level: AlertLevel.WARNING,
          message: 'Using stale cached data due to provider failures',
          timestamp: new Date(),
          metadata: { cacheAge: Date.now() - staleData.timestamp.getTime() }
        });

        return {
          data: staleData.data,
          source: `${staleData.source} (stale cache)`,
          cached: true,
          partial: false
        };
      }
    }

    throw new Error('All data providers failed and no cached data available');
  }

  /**
   * Get data from cache if valid
   */
  private getCachedData(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = new Date();
    if (now > entry.expiryTime) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  /**
   * Get stale data from cache in emergencies
   */
  private getStaleData(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp.getTime();
    if (age > this.config.staleDataTolerance) {
      return null;
    }
    
    return entry;
  }

  /**
   * Cache data with expiry
   */
  private cacheData(key: string, data: Record<string, MarketData[]>, source: string): void {
    const now = new Date();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiryTime: new Date(now.getTime() + this.config.cacheTTL),
      source
    };
    
    this.cache.set(key, entry);
    
    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiryTime) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Validate data completeness
   */
  private validateDataCompleteness(
    data: Record<string, MarketData[]>, 
    requestedSymbols: string[]
  ): { isComplete: boolean; partialPercentage: number; missingSymbols: string[] } {
    const missingSymbols: string[] = [];
    let validSymbols = 0;
    
    for (const symbol of requestedSymbols) {
      const cleanSymbol = symbol.replace('^', '');
      const symbolData = data[cleanSymbol];
      
      if (!symbolData || symbolData.length === 0) {
        missingSymbols.push(cleanSymbol);
      } else {
        validSymbols++;
      }
    }
    
    const partialPercentage = validSymbols / requestedSymbols.length;
    
    return {
      isComplete: missingSymbols.length === 0,
      partialPercentage,
      missingSymbols
    };
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    for (const provider of this.providers) {
      health[provider.name] = this.providerHealth.get(provider.name) ?? false;
    }
    return health;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      source: string;
      age: number;
      expiresIn: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      source: entry.source,
      age: now - entry.timestamp.getTime(),
      expiresIn: entry.expiryTime.getTime() - now
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Shutdown manager
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.cache.clear();
  }
}

// Default configuration
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  cacheEnabled: true,
  cacheTTL: 15 * 60 * 1000, // 15 minutes
  staleDataTolerance: 60 * 60 * 1000, // 1 hour in emergency
  healthCheckInterval: 60 * 1000, // 1 minute
  maxConcurrentProviders: 2
};

// Export singleton instance
export const dataFallbackManager = new DataFallbackManager(DEFAULT_FALLBACK_CONFIG);