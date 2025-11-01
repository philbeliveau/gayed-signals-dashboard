/**
 * Test Fixtures
 * Story: 4.0g - Integration Testing Suite
 *
 * Predefined test data for consistent testing
 */

// ============================================================================
// Signal Fixtures
// ============================================================================

export const signalFixtures = {
  bullishTiming: {
    signalName: 'fixture_bullish_timing',
    signalType: 'timing',
    calculationDate: new Date('2025-10-31'),
    signalValue: 0.85,
    signalStrength: 0.9,
    confidenceScore: 0.95,
    signalStatus: 'bullish' as const,
    marketDataIds: [],
    provenanceIds: [],
    calculationVersion: 'v1.0.0-test'
  },

  bearishMomentum: {
    signalName: 'fixture_bearish_momentum',
    signalType: 'momentum',
    calculationDate: new Date('2025-10-30'),
    signalValue: -0.65,
    signalStrength: 0.75,
    confidenceScore: 0.88,
    signalStatus: 'bearish' as const,
    marketDataIds: [],
    provenanceIds: [],
    calculationVersion: 'v1.0.0-test'
  },

  neutralTrend: {
    signalName: 'fixture_neutral_trend',
    signalType: 'trend',
    calculationDate: new Date('2025-10-29'),
    signalValue: 0.05,
    signalStrength: 0.5,
    confidenceScore: 0.7,
    signalStatus: 'neutral' as const,
    marketDataIds: [],
    provenanceIds: [],
    calculationVersion: 'v1.0.0-test'
  }
};

// ============================================================================
// Market Data Fixtures
// ============================================================================

export const marketDataFixtures = {
  spyDaily: {
    symbol: 'SPY',
    dataType: 'price',
    timestamp: new Date('2025-10-31T16:00:00Z'),
    date: new Date('2025-10-31'),
    open: 450.25,
    high: 455.80,
    low: 449.50,
    close: 454.30,
    volume: BigInt(75000000)
  },

  xluDaily: {
    symbol: 'XLU',
    dataType: 'price',
    timestamp: new Date('2025-10-31T16:00:00Z'),
    date: new Date('2025-10-31'),
    open: 65.10,
    high: 66.25,
    low: 64.95,
    close: 66.00,
    volume: BigInt(12000000)
  }
};

// ============================================================================
// Provenance Fixtures
// ============================================================================

export const provenanceFixtures = {
  yahooFinance: {
    sourceSystem: 'yahoo_finance',
    sourceEndpoint: '/v8/finance/quote',
    sourceQueryParams: { symbols: 'SPY' },
    requestTimestamp: new Date(),
    status: 'completed' as const,
    recordsReceived: 1,
    recordsValid: 1,
    recordsInvalid: 0,
    validationErrors: [],
    responseTimeMs: 150
  },

  alphaVantage: {
    sourceSystem: 'alpha_vantage',
    sourceEndpoint: '/query',
    sourceQueryParams: { function: 'TIME_SERIES_DAILY', symbol: 'SPY' },
    requestTimestamp: new Date(),
    status: 'completed' as const,
    recordsReceived: 100,
    recordsValid: 100,
    recordsInvalid: 0,
    responseTimeMs: 250
  },

  failed: {
    sourceSystem: 'tiingo',
    sourceEndpoint: '/tiingo/daily/SPY/prices',
    requestTimestamp: new Date(),
    status: 'failed' as const,
    errorMessage: 'API rate limit exceeded',
    recordsReceived: 0,
    recordsValid: 0,
    recordsInvalid: 0,
    responseTimeMs: 5000
  }
};

// ============================================================================
// User Fixtures
// ============================================================================

export const userFixtures = {
  standard: {
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const
  },

  admin: {
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const
  }
};

// ============================================================================
// API Response Fixtures
// ============================================================================

export const apiResponseFixtures = {
  success: {
    success: true,
    data: [],
    metadata: {
      count: 0,
      hasMore: false,
      sources: {
        primary: 'railway_postgres',
        fallbacks: []
      },
      timing: {
        totalMs: 50,
        dbMs: 25,
        processingMs: 15
      },
      quality: {
        averageScore: 95,
        issues: []
      }
    }
  },

  error: {
    success: false,
    error: {
      code: 'SOURCE_UNAVAILABLE',
      message: 'All data sources are currently unavailable',
      retryAfter: 60
    }
  },

  cached: {
    success: true,
    data: [],
    metadata: {
      count: 0,
      hasMore: false,
      sources: {
        primary: 'cache',
        fallbacks: []
      },
      timing: {
        totalMs: 5,
        cacheHit: true
      },
      quality: {
        averageScore: 95,
        issues: []
      }
    }
  }
};

// ============================================================================
// Batch Data Generators
// ============================================================================

/**
 * Generate historical signal series
 */
export function generateHistoricalSignals(days: number) {
  const signals = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    signals.push({
      signalName: `historical_signal_${i}`,
      signalType: 'timing',
      calculationDate: date,
      signalValue: Math.random() * 2 - 1, // -1 to 1
      signalStrength: Math.random(),
      confidenceScore: 0.7 + Math.random() * 0.3,
      signalStatus: Math.random() > 0.5 ? 'bullish' : 'bearish',
      marketDataIds: [],
      provenanceIds: [],
      calculationVersion: 'v1.0.0-test'
    });
  }

  return signals;
}

/**
 * Generate market data time series
 */
export function generateMarketDataTimeSeries(symbol: string, days: number) {
  const data = [];
  const today = new Date();
  let lastClose = 100;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Random walk
    const change = (Math.random() - 0.5) * 5;
    const close = lastClose + change;
    const open = lastClose;
    const high = Math.max(open, close) * 1.02;
    const low = Math.min(open, close) * 0.98;

    data.push({
      symbol,
      dataType: 'price',
      timestamp: new Date(date.setHours(16, 0, 0, 0)),
      date: new Date(date.setHours(0, 0, 0, 0)),
      open,
      high,
      low,
      close,
      volume: BigInt(Math.floor(Math.random() * 100000000))
    });

    lastClose = close;
  }

  return data;
}
