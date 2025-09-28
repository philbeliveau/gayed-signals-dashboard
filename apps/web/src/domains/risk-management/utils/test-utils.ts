/**
 * SAFLA Test Utilities
 * 
 * Provides helper functions for creating test data that passes SAFLA validation
 */

import { MarketData } from '../types';

/**
 * Generate current test market data that passes SAFLA validation
 * @param symbolOverrides Override specific symbols with custom data
 * @returns Market data with current dates and realistic values
 */
export function generateGoodTestData(
  symbolOverrides?: Record<string, Partial<MarketData>[]>
): Record<string, MarketData[]> {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0); // Start of today
  
  const symbols = {
    'SPY': { base: 420, volatility: 15 },
    'XLU': { base: 65, volatility: 8 },
    'WOOD': { base: 85, volatility: 12 },
    'GLD': { base: 165, volatility: 6 },
    'IEF': { base: 105, volatility: 4 },
    'TLT': { base: 125, volatility: 8 },
    '^VIX': { base: 18, volatility: 5 }
  };

  const marketData: Record<string, MarketData[]> = {};

  Object.entries(symbols).forEach(([symbol, config]) => {
    const data: MarketData[] = [];
    
    for (let i = 0; i < 300; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      // Generate realistic price movement
      const trend = Math.sin(i / 30) * 0.2;
      const randomWalk = (Math.random() - 0.5) * 0.1;
      const priceMultiplier = 1 + trend + randomWalk;
      
      const close = config.base * priceMultiplier + (Math.random() - 0.5) * config.volatility;
      
      data.unshift({
        date: date.toISOString().split('T')[0],
        symbol,
        close: Math.max(close, config.base * 0.5) // Ensure minimum reasonable price
      });
    }
    
    marketData[symbol] = data;
  });

  // Apply overrides if provided
  if (symbolOverrides) {
    Object.entries(symbolOverrides).forEach(([symbol, overrideData]) => {
      if (overrideData && overrideData.length > 0) {
        marketData[symbol] = overrideData.map(override => ({
          date: override.date || new Date().toISOString().split('T')[0],
          symbol: override.symbol || symbol,
          close: override.close || 100,
          ...override
        })) as MarketData[];
      }
    });
  }

  return marketData;
}

/**
 * Generate bad test data that will trigger SAFLA validation failures
 * @param issueType Type of issues to include in the data
 * @returns Market data with intentional validation issues
 */
export function generateBadTestData(
  issueType: 'stale' | 'invalid_prices' | 'missing_data' | 'extreme_volatility' | 'all' = 'all'
): Record<string, MarketData[]> {
  const badData: Record<string, MarketData[]> = {};
  
  if (issueType === 'stale' || issueType === 'all') {
    // Old data that will trigger stale data warnings
    badData['SPY'] = [
      { date: '2020-01-01', symbol: 'SPY', close: 400 },
      { date: '2020-01-02', symbol: 'SPY', close: 405 }
    ];
  }
  
  if (issueType === 'invalid_prices' || issueType === 'all') {
    const baseDate = new Date().toISOString().split('T')[0];
    badData['XLU'] = [
      { date: baseDate, symbol: 'XLU', close: NaN }, // Invalid
      { date: baseDate, symbol: 'XLU', close: -100 }, // Negative
      { date: baseDate, symbol: 'XLU', close: 0 }, // Zero
      { date: baseDate, symbol: 'XLU', close: Infinity }, // Infinite
    ];
  }
  
  if (issueType === 'missing_data' || issueType === 'all') {
    // Empty data set
    badData['WOOD'] = [];
  }
  
  if (issueType === 'extreme_volatility' || issueType === 'all') {
    const baseDate = new Date();
    badData['^VIX'] = [
      { 
        date: baseDate.toISOString().split('T')[0], 
        symbol: '^VIX', 
        close: 80 // Extremely high VIX
      }
    ];
  }

  return badData;
}

/**
 * Generate mixed quality test data (some good, some problematic)
 * @returns Market data with mixed quality issues
 */
export function generateMixedQualityTestData(): Record<string, MarketData[]> {
  const goodData = generateGoodTestData();
  const badData = generateBadTestData('invalid_prices');
  
  return {
    ...goodData,
    ...badData
  };
}

/**
 * Create test configuration for various scenarios
 * @param scenario Test scenario type
 * @returns Validation configuration for the scenario
 */
export function getTestConfig(scenario: 'strict' | 'lenient' | 'production' | 'development') {
  switch (scenario) {
    case 'strict':
      return {
        minDataPoints: 500,
        maxDataAge: 6,
        maxMissingDataPercent: 1,
        maxDailyChangePercent: 10,
        minConfidenceThreshold: 0.5,
        maxSignalDeviation: 2.0,
        maxConsecutiveFailures: 1,
        cooldownPeriod: 15,
        maxValidationsPerMinute: 10,
        maxValidationsPerHour: 100
      };
      
    case 'lenient':
      return {
        minDataPoints: 10,
        maxDataAge: 168, // 1 week
        maxMissingDataPercent: 20,
        maxDailyChangePercent: 50,
        minConfidenceThreshold: 0.01,
        maxSignalDeviation: 10.0,
        maxConsecutiveFailures: 10,
        cooldownPeriod: 1,
        maxValidationsPerMinute: 1000,
        maxValidationsPerHour: 10000
      };
      
    case 'production':
      return {
        minDataPoints: 250,
        maxDataAge: 12,
        maxMissingDataPercent: 2,
        maxDailyChangePercent: 20,
        minConfidenceThreshold: 0.2,
        maxSignalDeviation: 4.0,
        maxConsecutiveFailures: 3,
        cooldownPeriod: 5,
        maxValidationsPerMinute: 100,
        maxValidationsPerHour: 1000
      };
      
    case 'development':
    default:
      return {
        minDataPoints: 21,
        maxDataAge: 72, // 3 days
        maxMissingDataPercent: 10,
        maxDailyChangePercent: 30,
        minConfidenceThreshold: 0.05,
        maxSignalDeviation: 5.0,
        maxConsecutiveFailures: 5,
        cooldownPeriod: 2,
        maxValidationsPerMinute: 200,
        maxValidationsPerHour: 2000
      };
  }
}

/**
 * Generate test data that will specifically test rate limiting
 * @returns Minimal data set for rate limit testing
 */
export function generateRateLimitTestData(): Record<string, MarketData[]> {
  const today = new Date().toISOString().split('T')[0];
  return {
    'SPY': [
      { date: today, symbol: 'SPY', close: 400 }
    ]
  };
}

/**
 * Generate test data that will trigger circuit breaker
 * @returns Data that causes validation failures
 */
export function generateCircuitBreakerTestData(): Record<string, MarketData[]> {
  return {
    'SPY': [
      { date: '2020-01-01', symbol: 'SPY', close: NaN },
      { date: '2020-01-02', symbol: 'WRONG_SYMBOL', close: -100 }
    ]
  };
}