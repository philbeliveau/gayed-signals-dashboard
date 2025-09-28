import yahooFinance from 'yahoo-finance2';
import { MarketData } from './types';

export interface YahooFinanceConfig {
  rateLimit?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestTime?: Date;
}

export class YahooFinanceClient {
  private rateLimit: number;
  private maxRetries: number;
  private timeout: number;
  private stats: UsageStats;

  constructor(config: YahooFinanceConfig = {}) {
    this.rateLimit = config.rateLimit ?? 100;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30000;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };
  }

  getRateLimit(): number {
    return this.rateLimit;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }

  getTimeout(): number {
    return this.timeout;
  }

  getUsageStats(): UsageStats {
    return { ...this.stats };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchSingleSymbol(symbol: string, attempt: number = 1): Promise<MarketData[]> {
    try {
      this.stats.totalRequests++;
      
      const cleanSymbol = symbol.replace('^', '');
      const historical = await yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)),
        period2: new Date(),
        interval: '1d'
      });

      // Check for malformed response data first
      if (!Array.isArray(historical) || historical.length === 0) {
        this.stats.failedRequests++;
        return [];
      }

      // Validate and filter data - handle test scenarios gracefully
      const validData = historical
        .filter(data => {
          // Handle malformed data test case
          if (!data || typeof data.close !== 'number' || !data.date) {
            return false;
          }
          // Filter out negative prices and zero prices
          return data.close > 0 && isFinite(data.close);
        })
        .map(data => ({
          date: data.date.toISOString().split('T')[0],
          symbol: cleanSymbol,
          close: data.close,
          volume: data.volume
        }));

      // Handle malformed response data test case
      if (validData.length === 0 && historical.length > 0) {
        this.stats.failedRequests++;
        return [];
      }

      this.stats.successfulRequests++;
      this.stats.lastRequestTime = new Date();
      
      console.log(`✅ Fetched ${validData.length} data points for ${symbol}`);
      return validData;

    } catch (error: unknown) {
      console.error(`❌ Error fetching data for ${symbol} (attempt ${attempt}):`, error);
      
      // Handle rate limiting with exponential backoff
      const errorMessage = error instanceof Error ? error.message : '';
      const errorName = error instanceof Error ? error.name : '';
      if ((errorName === 'RateLimitError' || errorMessage.includes('Too many requests')) && attempt <= this.maxRetries) {
        const backoffDelay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`⏱️ Rate limited, retrying in ${backoffDelay}ms...`);
        await this.delay(backoffDelay);
        return this.fetchSingleSymbol(symbol, attempt + 1);
      }

      this.stats.failedRequests++;
      return [];
    }
  }

  async fetchMarketData(symbols: string[]): Promise<Record<string, MarketData[]>> {
    if (symbols.length === 0) {
      return {};
    }

    const results: Record<string, MarketData[]> = {};
    
    for (const symbol of symbols) {
      const data = await this.fetchSingleSymbol(symbol);
      const cleanSymbol = symbol.replace('^', '');
      results[cleanSymbol] = data;
      
      // Rate limiting delay between requests
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await this.delay(this.rateLimit);
      }
    }
    
    return results;
  }
}

 
export async function fetchMarketData(symbols: string[], _period: string = '2y'): Promise<Record<string, MarketData[]>> {
  const client = new YahooFinanceClient();
  return client.fetchMarketData(symbols);
}

export function validateMarketData(data: Record<string, MarketData[]>): boolean {
  const requiredSymbols = ['SPY', 'XLU'];
  const minDataPoints = 252; // Need at least 1 year
  
  for (const symbol of requiredSymbols) {
    if (!data[symbol] || data[symbol].length < minDataPoints) {
      console.error(`❌ Insufficient data for ${symbol}: ${data[symbol]?.length || 0} points`);
      return false;
    }
  }
  
  return true;
}
