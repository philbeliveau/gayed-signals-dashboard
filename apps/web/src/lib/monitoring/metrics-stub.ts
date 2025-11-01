/**
 * Metrics Stub
 * Temporary stub for metrics aggregator until monorepo resolution is properly configured
 */

interface AggregatedMetrics {
  api: {
    requestCount: number;
    errorRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerMinute: number;
  };
  sources: Record<string, {
    queriesTotal: number;
    avgQueryTime: number;
    availability: number;
    errorCount: number;
    successRate: number;
  }>;
  cache: {
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
    memoryUsage: number;
    keyCount: number;
  };
  dataQuality: {
    overall: {
      overall: number;
      freshness: number;
      completeness: number;
      consistency: number;
      accuracy: number;
    };
  };
}

class MetricsStub {
  getAggregatedMetrics(timeRange: string): AggregatedMetrics {
    // Return empty/default metrics since the actual implementation requires cross-package resolution
    return {
      api: {
        requestCount: 0,
        errorRate: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0,
      },
      sources: {},
      cache: {
        hitRate: 0,
        hits: 0,
        misses: 0,
        evictions: 0,
        memoryUsage: 0,
        keyCount: 0,
      },
      dataQuality: {
        overall: {
          overall: 0,
          freshness: 0,
          completeness: 0,
          consistency: 0,
          accuracy: 0,
        },
      },
    };
  }
}

export const metricsAggregator = new MetricsStub();
