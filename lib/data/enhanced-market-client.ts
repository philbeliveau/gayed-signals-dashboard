import axios, { AxiosResponse } from 'axios';
import yahooFinance from 'yahoo-finance2';
import { MarketData } from '../types';
import { logger, logMarketDataFetch, logRateLimit, logFailover, logCacheOperation, logDataValidation } from './production-logger';

// Data source types
export type DataSource = 'tiingo' | 'alpha_vantage' | 'yahoo_finance';

// Configuration interfaces
export interface EnhancedMarketClientConfig {
  tiingoApiKey?: string;
  alphaVantageApiKey?: string;
  enableCaching?: boolean;
  cacheExpiryMinutes?: number;
  rateLimits?: {
    tiingo?: number;
    alphaVantage?: number;
    yahooFinance?: number;
  };
  maxRetries?: number;
  timeout?: number;
}

// API response interfaces
interface TiingoResponse {
  date: string;
  close: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

interface AlphaVantageResponse {
  'Meta Data': Record<string, string>;
  'Time Series (Daily)': Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
}

// Cache interface
interface CacheEntry {
  data: MarketData[];
  timestamp: number;
  source: DataSource;
}

// Usage statistics
export interface DataSourceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestTime?: Date;
  lastFailureReason?: string;
  rateLimitHits: number;
}

export interface EnhancedClientStats {
  tiingo: DataSourceStats;
  alphaVantage: DataSourceStats;
  yahooFinance: DataSourceStats;
  cacheHits: number;
  cacheMisses: number;
  failoverEvents: number;
}

/**
 * Professional multi-source market data client with automatic failover
 * Supports Tiingo (primary), Alpha Vantage (secondary), and Yahoo Finance (tertiary)
 */
export class EnhancedMarketClient {
  private config: Required<EnhancedMarketClientConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: EnhancedClientStats;
  
  // Symbol mapping for different data sources
  private symbolMappings: Map<string, { tiingo: string; alphaVantage: string; yahoo: string }> = new Map([
    ['SPY', { tiingo: 'SPY', alphaVantage: 'SPY', yahoo: 'SPY' }],
    ['XLU', { tiingo: 'XLU', alphaVantage: 'XLU', yahoo: 'XLU' }],
    ['WOOD', { tiingo: 'WOOD', alphaVantage: 'WOOD', yahoo: 'WOOD' }],
    ['GLD', { tiingo: 'GLD', alphaVantage: 'GLD', yahoo: 'GLD' }],
    ['IEF', { tiingo: 'IEF', alphaVantage: 'IEF', yahoo: 'IEF' }],
    ['TLT', { tiingo: 'TLT', alphaVantage: 'TLT', yahoo: 'TLT' }],
    ['VIX', { tiingo: 'VIX', alphaVantage: 'VIX', yahoo: '^VIX' }],
  ]);

  constructor(config: EnhancedMarketClientConfig = {}) {
    this.config = {
      tiingoApiKey: config.tiingoApiKey || process.env.TIINGO_API_KEY || '',
      alphaVantageApiKey: config.alphaVantageApiKey || process.env.ALPHA_VANTAGE_KEY || '',
      enableCaching: config.enableCaching ?? true,
      cacheExpiryMinutes: config.cacheExpiryMinutes ?? 15,
      rateLimits: {
        tiingo: config.rateLimits?.tiingo ?? 500, // 500ms between requests
        alphaVantage: config.rateLimits?.alphaVantage ?? 12000, // 12s (5 requests per minute)
        yahooFinance: config.rateLimits?.yahooFinance ?? 100, // 100ms between requests
      },
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000,
    };

    this.stats = {
      tiingo: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, rateLimitHits: 0 },
      alphaVantage: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, rateLimitHits: 0 },
      yahooFinance: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, rateLimitHits: 0 },
      cacheHits: 0,
      cacheMisses: 0,
      failoverEvents: 0,
    };

    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    if (!this.config.tiingoApiKey && !this.config.alphaVantageApiKey) {
      logger.warn('No API keys configured. Only Yahoo Finance will be available.', {
        operation: 'config_validation',
        availableSources: ['yahoo_finance']
      });
    }

    if (this.config.tiingoApiKey && this.config.tiingoApiKey.length < 20) {
      logger.warn('Tiingo API key appears to be invalid (too short).', {
        operation: 'config_validation',
        dataSource: 'tiingo'
      });
    }

    if (this.config.alphaVantageApiKey && this.config.alphaVantageApiKey.length < 10) {
      logger.warn('Alpha Vantage API key appears to be invalid (too short).', {
        operation: 'config_validation',
        dataSource: 'alpha_vantage'
      });
    }
  }

  /**
   * Get symbol mapping for a specific data source
   */
  private getSymbolForSource(symbol: string, source: DataSource): string {
    const mapping = this.symbolMappings.get(symbol);
    if (!mapping) return symbol;

    switch (source) {
      case 'tiingo': return mapping.tiingo;
      case 'alpha_vantage': return mapping.alphaVantage;
      case 'yahoo_finance': return mapping.yahoo;
      default: return symbol;
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheEntry: CacheEntry): boolean {
    if (!this.config.enableCaching) return false;
    
    const ageMinutes = (Date.now() - cacheEntry.timestamp) / (1000 * 60);
    return ageMinutes < this.config.cacheExpiryMinutes;
  }

  /**
   * Get data from cache if available and valid
   */
  private getCachedData(symbol: string): MarketData[] | null {
    const cacheKey = `${symbol}_2y`; // Include period in cache key
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      this.stats.cacheHits++;
      logCacheOperation('hit', symbol, cached.source);
      return cached.data;
    }
    
    this.stats.cacheMisses++;
    logCacheOperation('miss', symbol);
    return null;
  }

  /**
   * Store data in cache
   */
  private setCachedData(symbol: string, data: MarketData[], source: DataSource): void {
    if (!this.config.enableCaching) return;
    
    const cacheKey = `${symbol}_2y`;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      source,
    });
    
    logCacheOperation('set', symbol, source);
  }

  /**
   * Delay execution for rate limiting
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch data from Tiingo API (Primary source)
   */
  private async fetchFromTiingo(symbol: string): Promise<MarketData[]> {
    if (!this.config.tiingoApiKey) {
      throw new Error('Tiingo API key not configured');
    }

    this.stats.tiingo.totalRequests++;
    const startTime = Date.now();

    try {
      const mappedSymbol = this.getSymbolForSource(symbol, 'tiingo');
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

      const url = `https://api.tiingo.com/tiingo/daily/${mappedSymbol}/prices`;
      const params = {
        startDate,
        endDate,
        token: this.config.tiingoApiKey,
      };

      logger.info(`Fetching ${symbol} from Tiingo`, { symbol, dataSource: 'tiingo', operation: 'fetch_start' });
      
      const response: AxiosResponse<TiingoResponse[]> = await axios.get(url, {
        params,
        timeout: this.config.timeout,
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from Tiingo');
      }

      const marketData: MarketData[] = response.data
        .filter(item => item.close > 0 && isFinite(item.close))
        .map(item => ({
          date: item.date.split('T')[0],
          symbol: symbol, // Use original symbol, not mapped
          close: item.close,
          volume: item.volume,
        }));

      const duration = Date.now() - startTime;
      this.stats.tiingo.successfulRequests++;
      this.stats.tiingo.lastRequestTime = new Date();
      
      logMarketDataFetch(symbol, 'tiingo', true, duration, marketData.length);
      return marketData;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.tiingo.failedRequests++;
      this.stats.tiingo.lastFailureReason = error instanceof Error ? error.message : 'Unknown error';
      
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        this.stats.tiingo.rateLimitHits++;
        logRateLimit('tiingo', symbol);
      }
      
      logMarketDataFetch(symbol, 'tiingo', false, duration, 0, error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Fetch data from Alpha Vantage API (Secondary source)
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<MarketData[]> {
    if (!this.config.alphaVantageApiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    this.stats.alphaVantage.totalRequests++;
    const startTime = Date.now();

    try {
      const mappedSymbol = this.getSymbolForSource(symbol, 'alpha_vantage');
      const url = 'https://www.alphavantage.co/query';
      const params = {
        function: 'TIME_SERIES_DAILY',
        symbol: mappedSymbol,
        outputsize: 'full',
        apikey: this.config.alphaVantageApiKey,
      };

      logger.info(`Fetching ${symbol} from Alpha Vantage`, { symbol, dataSource: 'alpha_vantage', operation: 'fetch_start' });
      const response: AxiosResponse<AlphaVantageResponse> = await axios.get(url, {
        params,
        timeout: this.config.timeout,
      });

      if (!response.data || !response.data['Time Series (Daily)']) {
        // Check for API limit message
        if (response.data && typeof response.data === 'object' && 'Note' in response.data) {
          this.stats.alphaVantage.rateLimitHits++;
          throw new Error('Alpha Vantage API rate limit exceeded');
        }
        throw new Error('Invalid response format from Alpha Vantage');
      }

      const timeSeries = response.data['Time Series (Daily)'];
      const marketData: MarketData[] = [];

      // Get last 2 years of data
      const twoYearsAgo = new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000));
      
      for (const [date, values] of Object.entries(timeSeries)) {
        const dataDate = new Date(date);
        if (dataDate >= twoYearsAgo) {
          const close = parseFloat(values['4. close']);
          const volume = parseInt(values['5. volume']);
          
          if (close > 0 && isFinite(close)) {
            marketData.push({
              date,
              symbol: symbol, // Use original symbol
              close,
              volume,
            });
          }
        }
      }

      // Sort by date (oldest first)
      marketData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const duration = Date.now() - startTime;
      this.stats.alphaVantage.successfulRequests++;
      this.stats.alphaVantage.lastRequestTime = new Date();
      
      logMarketDataFetch(symbol, 'alpha_vantage', true, duration, marketData.length);
      return marketData;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.alphaVantage.failedRequests++;
      this.stats.alphaVantage.lastFailureReason = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof Error && error.message.includes('rate limit')) {
        this.stats.alphaVantage.rateLimitHits++;
        logRateLimit('alpha_vantage', symbol);
      }
      
      logMarketDataFetch(symbol, 'alpha_vantage', false, duration, 0, error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Fetch data from Yahoo Finance API (Tertiary/fallback source)
   */
  private async fetchFromYahooFinance(symbol: string): Promise<MarketData[]> {
    this.stats.yahooFinance.totalRequests++;
    const startTime = Date.now();

    try {
      const mappedSymbol = this.getSymbolForSource(symbol, 'yahoo_finance');
      
      logger.info(`Fetching ${symbol} from Yahoo Finance`, { symbol, dataSource: 'yahoo_finance', operation: 'fetch_start' });
      const historical = await yahooFinance.historical(mappedSymbol, {
        period1: new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)),
        period2: new Date(),
        interval: '1d'
      });

      if (!Array.isArray(historical) || historical.length === 0) {
        throw new Error('No data returned from Yahoo Finance');
      }

      const marketData: MarketData[] = historical
        .filter(data => data && typeof data.close === 'number' && data.close > 0 && isFinite(data.close))
        .map(data => ({
          date: data.date.toISOString().split('T')[0],
          symbol: symbol, // Use original symbol
          close: data.close,
          volume: data.volume
        }));

      const duration = Date.now() - startTime;
      this.stats.yahooFinance.successfulRequests++;
      this.stats.yahooFinance.lastRequestTime = new Date();
      
      logMarketDataFetch(symbol, 'yahoo_finance', true, duration, marketData.length);
      return marketData;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.yahooFinance.failedRequests++;
      this.stats.yahooFinance.lastFailureReason = error instanceof Error ? error.message : 'Unknown error';
      
      logMarketDataFetch(symbol, 'yahoo_finance', false, duration, 0, error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Fetch data for a single symbol with automatic failover
   */
  private async fetchSingleSymbol(symbol: string, attempt: number = 1): Promise<MarketData[]> {
    // Check cache first
    const cachedData = this.getCachedData(symbol);
    if (cachedData) {
      return cachedData;
    }

    const dataSources: DataSource[] = ['tiingo', 'alpha_vantage', 'yahoo_finance'];
    let lastError: Error | null = null;

    for (const source of dataSources) {
      try {
        let data: MarketData[];
        
        switch (source) {
          case 'tiingo':
            if (!this.config.tiingoApiKey) continue;
            await this.delay(this.config.rateLimits.tiingo);
            data = await this.fetchFromTiingo(symbol);
            break;
            
          case 'alpha_vantage':
            if (!this.config.alphaVantageApiKey) continue;
            await this.delay(this.config.rateLimits.alphaVantage);
            data = await this.fetchFromAlphaVantage(symbol);
            break;
            
          case 'yahoo_finance':
            await this.delay(this.config.rateLimits.yahooFinance);
            data = await this.fetchFromYahooFinance(symbol);
            break;
            
          default:
            continue;
        }

        // Validate data quality
        if (this.validateDataQuality(data, symbol)) {
          this.setCachedData(symbol, data, source);
          return data;
        } else {
          logger.warn(`Data quality validation failed for ${symbol} from ${source}`, {
            symbol,
            dataSource: source,
            operation: 'data_validation_failed'
          });
          continue;
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Log failover attempt
        const nextSourceIndex = dataSources.indexOf(source) + 1;
        if (nextSourceIndex < dataSources.length) {
          const nextSource = dataSources[nextSourceIndex];
          logFailover(symbol, source, nextSource, lastError.message);
        }
        
        // If it's a rate limit error and we have retries left, wait longer
        if (lastError.message.includes('rate limit') && attempt <= this.config.maxRetries) {
          const backoffDelay = 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
          logger.info(`Rate limited, retrying ${symbol} in ${backoffDelay}ms`, {
            symbol,
            dataSource: source,
            operation: 'rate_limit_retry',
            backoffDelay,
            attempt
          });
          await this.delay(backoffDelay);
          return this.fetchSingleSymbol(symbol, attempt + 1);
        }
        
        continue; // Try next data source
      }
    }

    // If all sources failed, record failover event and throw error
    this.stats.failoverEvents++;
    const errorMessage = `All data sources failed for ${symbol}. Last error: ${lastError?.message || 'Unknown'}`;
    logger.error(errorMessage, {
      symbol,
      operation: 'all_sources_failed',
      lastError: lastError?.message,
      failoverEvents: this.stats.failoverEvents
    });
    throw new Error(errorMessage);
  }

  /**
   * Validate data quality (basic checks)
   */
  private validateDataQuality(data: MarketData[], symbol: string): boolean {
    const warnings: string[] = [];
    
    if (!data || data.length === 0) {
      warnings.push('No data points available');
      logDataValidation(symbol, false, warnings);
      return false;
    }

    // Check for minimum data points (at least 6 months of daily data)
    const minDataPoints = 126;
    if (data.length < minDataPoints) {
      warnings.push(`Insufficient data: ${data.length} points (minimum: ${minDataPoints})`);
      logDataValidation(symbol, false, warnings);
      return false;
    }

    // Check for recent data (within last 7 days for active trading days)
    const latestDate = new Date(data[data.length - 1].date);
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLatest > 7) {
      warnings.push(`Stale data: latest data is ${daysSinceLatest.toFixed(1)} days old`);
      logDataValidation(symbol, false, warnings);
      return false;
    }

    // Check for data consistency (no extreme price movements that indicate bad data)
    let suspiciousMovements = 0;
    for (let i = 1; i < data.length; i++) {
      const currentPrice = data[i].close;
      const previousPrice = data[i - 1].close;
      const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice);
      
      // Flag extreme daily moves (>50%) as potentially bad data
      if (changePercent > 0.5) {
        suspiciousMovements++;
        logger.warn(`Suspicious price movement for ${symbol} on ${data[i].date}: ${(changePercent * 100).toFixed(1)}%`, {
          symbol,
          operation: 'data_quality_check',
          date: data[i].date,
          changePercent: changePercent * 100,
          currentPrice,
          previousPrice
        });
        // Don't fail validation for this, just warn
      }
    }

    if (suspiciousMovements > 0) {
      warnings.push(`Found ${suspiciousMovements} suspicious price movements`);
    }

    const isValid = warnings.length === 0 || warnings.every(warning => warning.includes('suspicious'));
    logDataValidation(symbol, isValid, warnings);
    return isValid;
  }

  /**
   * Fetch market data for multiple symbols with multi-source failover
   */
  public async fetchMarketData(symbols: string[]): Promise<Record<string, MarketData[]>> {
    if (symbols.length === 0) {
      return {};
    }

    logger.info(`Enhanced Market Client: Fetching data for ${symbols.length} symbols`, {
      operation: 'bulk_fetch_start',
      symbolCount: symbols.length,
      symbols: symbols.join(',')
    });
    const results: Record<string, MarketData[]> = {};
    
    // Process symbols concurrently (but with rate limiting built in)
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.fetchSingleSymbol(symbol);
        return { symbol, data };
      } catch (error) {
        logger.error(`Failed to fetch data for ${symbol}`, {
          symbol,
          operation: 'symbol_fetch_failed'
        }, error instanceof Error ? error : new Error('Unknown error'));
        return { symbol, data: [] };
      }
    });

    const resolvedData = await Promise.all(promises);
    
    for (const { symbol, data } of resolvedData) {
      results[symbol] = data;
    }

    this.logSummaryStats(symbols, results);
    return results;
  }

  /**
   * Log summary statistics after fetching data
   */
  private logSummaryStats(requestedSymbols: string[], results: Record<string, MarketData[]>): void {
    const successfulSymbols = Object.keys(results).filter(symbol => results[symbol].length > 0);
    const failedSymbols = requestedSymbols.filter(symbol => !results[symbol] || results[symbol].length === 0);

    logger.info('Enhanced Market Client Summary', {
      operation: 'bulk_fetch_complete',
      totalSymbols: requestedSymbols.length,
      successfulSymbols: successfulSymbols.length,
      failedSymbols: failedSymbols.length,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      failoverEvents: this.stats.failoverEvents,
      successfulSymbolsList: successfulSymbols,
      failedSymbolsList: failedSymbols
    });
    
    // Data source statistics
    const sources = ['tiingo', 'alphaVantage', 'yahooFinance'] as const;
    for (const source of sources) {
      const stats = this.stats[source];
      if (stats.totalRequests > 0) {
        const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1);
        logger.info(`Data source statistics: ${source}`, {
          operation: 'source_statistics',
          dataSource: source,
          totalRequests: stats.totalRequests,
          successfulRequests: stats.successfulRequests,
          failedRequests: stats.failedRequests,
          rateLimitHits: stats.rateLimitHits,
          successRate: parseFloat(successRate),
          lastRequestTime: stats.lastRequestTime?.toISOString(),
          lastFailureReason: stats.lastFailureReason
        });
      }
    }
  }

  /**
   * Get comprehensive client statistics
   */
  public getStats(): EnhancedClientStats {
    return { ...this.stats };
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  public clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    logCacheOperation('clear');
    logger.info(`Cache cleared`, {
      operation: 'cache_cleared',
      previousSize: cacheSize
    });
  }

  /**
   * Get cache information
   */
  public getCacheInfo(): { size: number; entries: Array<{ symbol: string; age: number; source: DataSource }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      symbol: key.replace('_2y', ''),
      age: Math.round((Date.now() - entry.timestamp) / (1000 * 60)), // Age in minutes
      source: entry.source
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Validate market data completeness for Gayed signals
   */
  public static validateGayedSignalsData(data: Record<string, MarketData[]>): { isValid: boolean; warnings: string[] } {
    const requiredSymbols = ['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', 'VIX'];
    const minDataPoints = 252; // Need at least 1 year of daily data
    const warnings: string[] = [];

    for (const symbol of requiredSymbols) {
      if (!data[symbol] || data[symbol].length === 0) {
        warnings.push(`Missing data for required symbol: ${symbol}`);
      } else if (data[symbol].length < minDataPoints) {
        warnings.push(`Insufficient data for ${symbol}: ${data[symbol].length} points (need ${minDataPoints})`);
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}

/**
 * Create a default enhanced market client instance
 */
export function createEnhancedMarketClient(config?: EnhancedMarketClientConfig): EnhancedMarketClient {
  return new EnhancedMarketClient(config);
}

/**
 * Convenience function for fetching market data with enhanced client
 */
export async function fetchEnhancedMarketData(
  symbols: string[], 
  config?: EnhancedMarketClientConfig
): Promise<Record<string, MarketData[]>> {
  const client = createEnhancedMarketClient(config);
  return client.fetchMarketData(symbols);
}