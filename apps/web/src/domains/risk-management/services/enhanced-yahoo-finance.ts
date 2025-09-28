/**
 * Enhanced Yahoo Finance Client with Risk Management Integration
 * 
 * Integrates with the comprehensive risk management system to provide:
 * - Circuit breaker protection
 * - Intelligent rate limiting
 * - Data source fallbacks
 * - Graceful degradation
 * - Security validation
 * - Performance monitoring
 */

import { MarketData } from '../types';
import { riskManager, AlertLevel } from './risk-manager';
import { dataFallbackManager } from './data-fallback';
import { gracefulDegradationManager, DegradedResponse } from './graceful-degradation';
import { securityManager } from './security';

export interface EnhancedYahooFinanceConfig {
  rateLimit: number;
  maxRetries: number;
  timeout: number;
  enableRiskManagement: boolean;
  enableSecurity: boolean;
  enableGracefulDegradation: boolean;
  enableDataFallback: boolean;
}

export interface FetchResult {
  data: Record<string, MarketData[]>;
  metadata: {
    source: string;
    cached: boolean;
    partial: boolean;
    reliability: number;
    responseTime: number;
    warnings: string[];
    fallbacksUsed: string[];
    securityScore: number;
  };
  degradation?: DegradedResponse<Record<string, MarketData[]>>;
}

export interface RequestContext {
  ip: string;
  userAgent: string;
  symbols: string[];
  period: string;
  timestamp: Date;
}

/**
 * Enhanced Yahoo Finance Client with comprehensive risk management
 */
export class EnhancedYahooFinanceClient {
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null as Date | null
  };

  constructor(private config: EnhancedYahooFinanceConfig) {}

  /**
   * Fetch market data with comprehensive risk management
   */
  async fetchMarketDataSecure(
    symbols: string[],
    period: string = '2y',
    context: RequestContext
  ): Promise<FetchResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const fallbacksUsed: string[] = [];
    let securityScore = 100;

    try {
      // Security validation
      if (this.config.enableSecurity) {
        const securityValidation = await securityManager.validateAPIRequest(
          {
            ip: context.ip,
            userAgent: context.userAgent,
            method: 'GET',
            path: '/api/signals',
            headers: {},
            timestamp: context.timestamp
          },
          { symbols, period }
        );

        if (!securityValidation.isValid) {
          throw new Error(`Security validation failed: ${securityValidation.errors.join(', ')}`);
        }

        securityScore = securityValidation.securityScore;
        
        if (securityScore < 70) {
          warnings.push('Low security score detected');
        }

        // Use sanitized data
        symbols = securityValidation.sanitizedData.symbols;
        period = securityValidation.sanitizedData.period;
      }

      // Attempt data fetching with risk management
      let result: FetchResult;

      if (this.config.enableDataFallback) {
        // Use data fallback manager
        const fallbackResult = await dataFallbackManager.fetchMarketDataWithFallback(symbols, period);
        
        result = {
          data: fallbackResult.data,
          metadata: {
            source: fallbackResult.source,
            cached: fallbackResult.cached,
            partial: fallbackResult.partial,
            reliability: fallbackResult.cached ? 80 : 100,
            responseTime: Date.now() - startTime,
            warnings: fallbackResult.partial ? ['Partial data returned'] : [],
            fallbacksUsed: fallbackResult.source.includes('fallback') ? [fallbackResult.source] : [],
            securityScore
          }
        };
      } else if (this.config.enableRiskManagement) {
        // Use risk manager directly
        const data = await riskManager.executeWithRiskMitigation(
          () => this.fetchDataDirect(symbols, period),
          'yahoo_finance_fetch',
          { timeout: this.config.timeout }
        );

        result = {
          data,
          metadata: {
            source: 'yahoo-finance',
            cached: false,
            partial: false,
            reliability: this.calculateDataReliability(data, symbols),
            responseTime: Date.now() - startTime,
            warnings: [],
            fallbacksUsed: [],
            securityScore
          }
        };
      } else {
        // Direct fetch without risk management
        const data = await this.fetchDataDirect(symbols, period);
        
        result = {
          data,
          metadata: {
            source: 'yahoo-finance-direct',
            cached: false,
            partial: false,
            reliability: this.calculateDataReliability(data, symbols),
            responseTime: Date.now() - startTime,
            warnings: [],
            fallbacksUsed: [],
            securityScore
          }
        };
      }

      // Apply graceful degradation if enabled
      if (this.config.enableGracefulDegradation) {
        const degradedResult = await gracefulDegradationManager.processMarketDataWithDegradation(
          symbols,
          async () => result.data
        );

        result.degradation = degradedResult;
        result.metadata.warnings.push(...degradedResult.warnings);
        result.metadata.fallbacksUsed.push(...degradedResult.fallbacksUsed);
        result.metadata.reliability = Math.min(result.metadata.reliability, degradedResult.reliability);
      }

      // Update statistics
      this.updateStats(true, result.metadata.responseTime);

      return result;

    } catch (error) {
      this.updateStats(false, Date.now() - startTime);
      
      // Try graceful degradation on error
      if (this.config.enableGracefulDegradation) {
        try {
          const degradedResult = await gracefulDegradationManager.processMarketDataWithDegradation(
            symbols,
            async () => {
              throw error; // Will trigger emergency data
            }
          );

          return {
            data: degradedResult.data,
            metadata: {
              source: 'emergency-fallback',
              cached: false,
              partial: true,
              reliability: degradedResult.reliability,
              responseTime: Date.now() - startTime,
              warnings: [...warnings, ...degradedResult.warnings],
              fallbacksUsed: [...fallbacksUsed, ...degradedResult.fallbacksUsed],
              securityScore
            },
            degradation: degradedResult
          };
        } catch (degradationError) {
          // Complete failure
          riskManager.emit('alert', {
            id: `complete_failure_${Date.now()}`,
            level: AlertLevel.CRITICAL,
            message: 'Complete system failure - all fallbacks exhausted',
            timestamp: new Date(),
            metadata: { 
              originalError: error instanceof Error ? error.message : String(error),
              degradationError: degradationError instanceof Error ? degradationError.message : String(degradationError)
            }
          });

          throw new Error(`Complete system failure: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      throw error;
    }
  }

  /**
   * Direct data fetching without risk management (for internal use)
   */
  private async fetchDataDirect(symbols: string[], period: string): Promise<Record<string, MarketData[]>> {
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
          const validData = historical
            .filter(data => data && typeof data.close === 'number' && data.close > 0 && isFinite(data.close))
            .map(data => ({
              date: data.date.toISOString().split('T')[0],
              symbol: cleanSymbol,
              close: data.close,
              volume: data.volume
            }));

          results[cleanSymbol] = validData;
        } else {
          results[cleanSymbol] = [];
        }
        
        // Rate limiting
        await this.delay(this.config.rateLimit);
        
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        results[symbol.replace('^', '')] = [];
      }
    }
    
    return results;
  }

  /**
   * Simplified fetch method for backward compatibility
   */
  async fetchMarketData(symbols: string[], period: string = '2y'): Promise<Record<string, MarketData[]>> {
    const context: RequestContext = {
      ip: '127.0.0.1',
      userAgent: 'Yahoo Finance Client',
      symbols,
      period,
      timestamp: new Date()
    };

    const result = await this.fetchMarketDataSecure(symbols, period, context);
    return result.data;
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      yahoo_finance: boolean;
      risk_management: boolean;
      data_fallback: boolean;
      security: boolean;
    };
    responseTime: number;
  }> {
    const startTime = Date.now();
    const details = {
      yahoo_finance: false,
      risk_management: true,
      data_fallback: true,
      security: true
    };

    try {
      // Test Yahoo Finance directly
      const yahooFinance = await import('yahoo-finance2');
      const testData = await Promise.race([
        yahooFinance.default.historical('SPY', {
          period1: new Date(Date.now() - 24 * 60 * 60 * 1000),
          period2: new Date(),
          interval: '1d'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      details.yahoo_finance = Array.isArray(testData) && testData.length > 0;
    } catch {
      details.yahoo_finance = false;
    }

    // Check risk management system
    const healthStatus = riskManager.getHealthStatus();
    details.risk_management = healthStatus.status !== 'unhealthy';

    // Check data fallback system
    const providerHealth = dataFallbackManager.getProviderHealth();
    details.data_fallback = Object.values(providerHealth).some(healthy => healthy);

    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (details.yahoo_finance && details.risk_management) {
      status = 'healthy';
    } else if (details.data_fallback || details.risk_management) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details,
      responseTime
    };
  }

  /**
   * Calculate data reliability percentage
   */
  private calculateDataReliability(data: Record<string, MarketData[]>, requestedSymbols: string[]): number {
    const totalSymbols = requestedSymbols.length;
    const successfulSymbols = requestedSymbols.filter(symbol => {
      const cleanSymbol = symbol.replace('^', '');
      return data[cleanSymbol] && data[cleanSymbol].length > 0;
    }).length;

    return (successfulSymbols / totalSymbols) * 100;
  }

  /**
   * Parse period string to days
   */
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

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update internal statistics
   */
  private updateStats(success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = new Date();
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update rolling average response time
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / this.stats.totalRequests;
  }

  /**
   * Get client statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Get rate limit information
   */
  getRateLimit(): number {
    return this.config.rateLimit;
  }

  /**
   * Get max retries configuration
   */
  getMaxRetries(): number {
    return this.config.maxRetries;
  }

  /**
   * Get timeout configuration
   */
  getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
  }
}

// Default configuration for production use
export const DEFAULT_ENHANCED_CONFIG: EnhancedYahooFinanceConfig = {
  rateLimit: 100, // ms between requests
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  enableRiskManagement: true,
  enableSecurity: true,
  enableGracefulDegradation: true,
  enableDataFallback: true
};

// Create enhanced client instance
export const enhancedYahooFinanceClient = new EnhancedYahooFinanceClient(DEFAULT_ENHANCED_CONFIG);

// Backward compatibility functions
export async function fetchMarketData(symbols: string[], period: string = '2y'): Promise<Record<string, MarketData[]>> {
  return enhancedYahooFinanceClient.fetchMarketData(symbols, period);
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