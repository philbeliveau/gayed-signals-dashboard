/**
 * MetricsAggregator
 * Story 4.0f: Monitoring & Observability - Task 3.1
 *
 * Real-time metrics collection and aggregation for Railway backend monitoring.
 * Tracks API performance, data source health, cache efficiency, and data quality.
 */

import type {
  AggregatedMetrics,
  ApiMetrics,
  SourceMetrics,
  CacheMetrics,
  TimeSeriesData,
  TimeSeriesDataPoint,
  TimeRange,
} from '../../types/monitoring';

interface MetricBucket {
  timestamp: Date;
  values: number[];
}

export class MetricsAggregator {
  // Time-series storage (in-memory, would use Redis/TimescaleDB in production)
  private apiRequestTimes: Map<string, MetricBucket[]> = new Map();
  private sourceQueryTimes: Map<string, MetricBucket[]> = new Map();
  private cacheOperations: Map<string, { hits: number; misses: number }> = new Map();
  private dataQualityScores: Map<string, MetricBucket[]> = new Map();

  // Counters
  private apiRequestCount = 0;
  private apiErrorCount = 0;
  private sourceQueryCount: Map<string, number> = new Map();
  private sourceErrorCount: Map<string, number> = new Map();

  // Histogram buckets for percentile calculation
  private readonly percentileBuckets = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

  // ============================================================================
  // Metric Recording
  // ============================================================================

  /**
   * Record an API request
   */
  recordApiRequest(endpoint: string, duration: number, status: number): void {
    this.apiRequestCount++;

    if (status >= 400) {
      this.apiErrorCount++;
    }

    const key = `api:${endpoint}`;
    this.addToBucket(this.apiRequestTimes, key, duration);

    console.log(`📊 API Request: ${endpoint} (${duration}ms, status: ${status})`);
  }

  /**
   * Record a data source query
   */
  recordSourceQuery(source: string, duration: number, success: boolean): void {
    const currentCount = this.sourceQueryCount.get(source) || 0;
    this.sourceQueryCount.set(source, currentCount + 1);

    if (!success) {
      const errorCount = this.sourceErrorCount.get(source) || 0;
      this.sourceErrorCount.set(source, errorCount + 1);
    }

    const key = `source:${source}`;
    this.addToBucket(this.sourceQueryTimes, key, duration);

    const status = success ? '✅' : '❌';
    console.log(`${status} Source Query: ${source} (${duration}ms)`);
  }

  /**
   * Record a cache operation
   */
  recordCacheOperation(operation: string, hit: boolean): void {
    const stats = this.cacheOperations.get(operation) || { hits: 0, misses: 0 };

    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    this.cacheOperations.set(operation, stats);
  }

  /**
   * Record data quality score
   */
  recordDataQuality(source: string, score: number): void {
    const key = `quality:${source}`;
    this.addToBucket(this.dataQualityScores, key, score);

    console.log(`📈 Data Quality: ${source} (score: ${score})`);
  }

  // ============================================================================
  // Metric Aggregation
  // ============================================================================

  /**
   * Get aggregated metrics for a time range
   */
  getAggregatedMetrics(timeRange: TimeRange): AggregatedMetrics {
    const now = new Date();
    const startTime = this.getStartTimeFromRange(timeRange, now);

    return {
      api: this.aggregateApiMetrics(startTime, now),
      sources: this.aggregateSourceMetrics(startTime, now),
      cache: this.aggregateCacheMetrics(),
      dataQuality: this.aggregateQualityMetrics(startTime, now),
      timestamp: now,
    };
  }

  /**
   * Get time series data for a specific metric
   */
  getMetricTimeSeries(metric: string, timeRange: TimeRange): TimeSeriesData {
    const now = new Date();
    const startTime = this.getStartTimeFromRange(timeRange, now);

    let dataPoints: TimeSeriesDataPoint[] = [];
    let unit: string | undefined;

    // Determine metric source
    if (metric.startsWith('api:')) {
      const buckets = this.apiRequestTimes.get(metric) || [];
      dataPoints = this.bucketsToDataPoints(buckets, startTime, now);
      unit = 'ms';
    } else if (metric.startsWith('source:')) {
      const buckets = this.sourceQueryTimes.get(metric) || [];
      dataPoints = this.bucketsToDataPoints(buckets, startTime, now);
      unit = 'ms';
    } else if (metric.startsWith('quality:')) {
      const buckets = this.dataQualityScores.get(metric) || [];
      dataPoints = this.bucketsToDataPoints(buckets, startTime, now);
      unit = 'score';
    }

    return {
      metric,
      unit,
      dataPoints,
      aggregation: 'avg',
    };
  }

  // ============================================================================
  // Private Aggregation Methods
  // ============================================================================

  private aggregateApiMetrics(startTime: Date, endTime: Date): ApiMetrics {
    const allRequestTimes: number[] = [];

    for (const buckets of this.apiRequestTimes.values()) {
      const filteredBuckets = buckets.filter(
        (b) => b.timestamp >= startTime && b.timestamp <= endTime
      );
      filteredBuckets.forEach((bucket) => allRequestTimes.push(...bucket.values));
    }

    const avgResponseTime = this.calculateAverage(allRequestTimes);
    const p95ResponseTime = this.calculatePercentile(allRequestTimes, 95);
    const p99ResponseTime = this.calculatePercentile(allRequestTimes, 99);
    const errorRate = this.apiRequestCount > 0 ? this.apiErrorCount / this.apiRequestCount : 0;

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    const requestsPerMinute = durationMinutes > 0 ? this.apiRequestCount / durationMinutes : 0;

    return {
      requestCount: this.apiRequestCount,
      avgResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      requestsPerMinute,
    };
  }

  private aggregateSourceMetrics(startTime: Date, endTime: Date): Record<string, SourceMetrics> {
    const sourceMetrics: Record<string, SourceMetrics> = {};

    for (const [source, queryCount] of this.sourceQueryCount.entries()) {
      const key = `source:${source}`;
      const buckets = this.sourceQueryTimes.get(key) || [];
      const filteredBuckets = buckets.filter(
        (b) => b.timestamp >= startTime && b.timestamp <= endTime
      );

      const queryTimes: number[] = [];
      filteredBuckets.forEach((bucket) => queryTimes.push(...bucket.values));

      const errorCount = this.sourceErrorCount.get(source) || 0;
      const successRate = queryCount > 0 ? (queryCount - errorCount) / queryCount : 1;
      const availability = successRate * 100;

      sourceMetrics[source] = {
        queriesTotal: queryCount,
        avgQueryTime: this.calculateAverage(queryTimes),
        successRate,
        availability,
        errorCount,
      };
    }

    return sourceMetrics;
  }

  private aggregateCacheMetrics(): CacheMetrics {
    let totalHits = 0;
    let totalMisses = 0;

    for (const stats of this.cacheOperations.values()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }

    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? totalHits / total : 0;

    return {
      hitRate,
      hits: totalHits,
      misses: totalMisses,
      evictions: 0, // Would track from Redis in production
      avgHitTime: 5, // Mock value
      avgMissTime: 150, // Mock value
      memoryUsage: 0, // Would query from Redis
      keyCount: 0, // Would query from Redis
    };
  }

  private aggregateQualityMetrics(startTime: Date, endTime: Date): any {
    // Returns quality metrics structure matching QualityMetrics type
    // In production, this would aggregate from stored quality check results

    return {
      overall: {
        overall: 85,
        freshness: 90,
        completeness: 88,
        consistency: 82,
        accuracy: 85,
        timestamp: new Date(),
      },
      freshness: {
        score: 90,
        lastUpdate: new Date(),
        staleDuration: 30,
        isStale: false,
      },
      completeness: {
        score: 88,
        missingFields: [],
        totalRecords: 1000,
        completeRecords: 880,
        missingDataPercentage: 12,
      },
      consistency: {
        score: 82,
        validationErrors: [],
        formatIssues: [],
        inconsistenciesFound: 0,
      },
      sources: {},
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // Statistical Calculations
  // ============================================================================

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private addToBucket(
    storage: Map<string, MetricBucket[]>,
    key: string,
    value: number
  ): void {
    const buckets = storage.get(key) || [];
    const now = new Date();

    // Round to nearest minute for bucketing
    const bucketTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

    let currentBucket = buckets.find((b) => b.timestamp.getTime() === bucketTime.getTime());

    if (!currentBucket) {
      currentBucket = { timestamp: bucketTime, values: [] };
      buckets.push(currentBucket);
    }

    currentBucket.values.push(value);

    // Keep only last 24 hours of buckets
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filteredBuckets = buckets.filter((b) => b.timestamp >= oneDayAgo);

    storage.set(key, filteredBuckets);
  }

  private bucketsToDataPoints(
    buckets: MetricBucket[],
    startTime: Date,
    endTime: Date
  ): TimeSeriesDataPoint[] {
    return buckets
      .filter((b) => b.timestamp >= startTime && b.timestamp <= endTime)
      .map((bucket) => ({
        timestamp: bucket.timestamp,
        value: this.calculateAverage(bucket.values),
      }));
  }

  private getStartTimeFromRange(timeRange: TimeRange, now: Date): Date {
    const rangeMs: Record<TimeRange, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      custom: 24 * 60 * 60 * 1000, // Default to 24h for custom
    };

    const ms = rangeMs[timeRange] || rangeMs['24h'];
    return new Date(now.getTime() - ms);
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.apiRequestTimes.clear();
    this.sourceQueryTimes.clear();
    this.cacheOperations.clear();
    this.dataQualityScores.clear();
    this.apiRequestCount = 0;
    this.apiErrorCount = 0;
    this.sourceQueryCount.clear();
    this.sourceErrorCount.clear();

    console.log('🔄 Metrics aggregator reset');
  }

  /**
   * Get current storage size (for monitoring)
   */
  getStorageSize(): {
    apiMetrics: number;
    sourceMetrics: number;
    cacheMetrics: number;
    qualityMetrics: number;
  } {
    return {
      apiMetrics: this.apiRequestTimes.size,
      sourceMetrics: this.sourceQueryTimes.size,
      cacheMetrics: this.cacheOperations.size,
      qualityMetrics: this.dataQualityScores.size,
    };
  }
}

// Export singleton instance
export const metricsAggregator = new MetricsAggregator();
