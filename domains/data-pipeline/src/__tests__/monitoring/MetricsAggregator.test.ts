/**
 * MetricsAggregator Unit Tests
 * Story 4.0f: Monitoring & Observability - Task 6.1
 */

import { MetricsAggregator } from '../../services/MetricsAggregator';

describe('MetricsAggregator', () => {
  let aggregator: MetricsAggregator;

  beforeEach(() => {
    aggregator = new MetricsAggregator();
    aggregator.reset();
  });

  describe('recordApiRequest', () => {
    it('should increment request counter', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);
      aggregator.recordApiRequest('/api/signals', 150, 200);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.api.requestCount).toBe(2);
    });

    it('should track response times', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);
      aggregator.recordApiRequest('/api/signals', 200, 200);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.api.avgResponseTime).toBeGreaterThan(0);
    });

    it('should track error rates', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);
      aggregator.recordApiRequest('/api/signals', 150, 500);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.api.errorRate).toBe(0.5);
    });

    it('should calculate requests per minute', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.api.requestsPerMinute).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordSourceQuery', () => {
    it('should track source query counts', () => {
      aggregator.recordSourceQuery('yahoo-finance', 500, true);
      aggregator.recordSourceQuery('yahoo-finance', 600, true);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.sources['yahoo-finance']).toBeDefined();
      expect(metrics.sources['yahoo-finance'].queriesTotal).toBe(2);
    });

    it('should calculate success rate', () => {
      aggregator.recordSourceQuery('yahoo-finance', 500, true);
      aggregator.recordSourceQuery('yahoo-finance', 600, false);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.sources['yahoo-finance'].successRate).toBe(0.5);
    });

    it('should track average query time', () => {
      aggregator.recordSourceQuery('yahoo-finance', 500, true);
      aggregator.recordSourceQuery('yahoo-finance', 700, true);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.sources['yahoo-finance'].avgQueryTime).toBe(600);
    });

    it('should calculate availability percentage', () => {
      aggregator.recordSourceQuery('yahoo-finance', 500, true);
      aggregator.recordSourceQuery('yahoo-finance', 600, true);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.sources['yahoo-finance'].availability).toBe(100);
    });
  });

  describe('recordCacheOperation', () => {
    it('should track cache hits', () => {
      aggregator.recordCacheOperation('get', true);
      aggregator.recordCacheOperation('get', true);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.cache.hits).toBe(2);
    });

    it('should track cache misses', () => {
      aggregator.recordCacheOperation('get', false);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.cache.misses).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      aggregator.recordCacheOperation('get', true);
      aggregator.recordCacheOperation('get', false);

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.cache.hitRate).toBe(0.5);
    });

    it('should handle no operations gracefully', () => {
      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.cache.hitRate).toBe(0);
      expect(metrics.cache.hits).toBe(0);
      expect(metrics.cache.misses).toBe(0);
    });
  });

  describe('recordDataQuality', () => {
    it('should store quality scores', () => {
      aggregator.recordDataQuality('yahoo-finance', 95);

      const series = aggregator.getMetricTimeSeries('quality:yahoo-finance', '1h');
      expect(series.dataPoints.length).toBeGreaterThan(0);
    });

    it('should handle multiple sources', () => {
      aggregator.recordDataQuality('yahoo-finance', 95);
      aggregator.recordDataQuality('tiingo', 88);

      const yahooSeries = aggregator.getMetricTimeSeries('quality:yahoo-finance', '1h');
      const tiingoSeries = aggregator.getMetricTimeSeries('quality:tiingo', '1h');

      expect(yahooSeries.dataPoints.length).toBeGreaterThan(0);
      expect(tiingoSeries.dataPoints.length).toBeGreaterThan(0);
    });
  });

  describe('getMetricTimeSeries', () => {
    it('should return time series data for API metrics', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);

      const series = aggregator.getMetricTimeSeries('api:/api/signals', '1h');
      expect(series.metric).toBe('api:/api/signals');
      expect(series.unit).toBe('ms');
      expect(series.dataPoints).toBeDefined();
    });

    it('should return empty array for non-existent metrics', () => {
      const series = aggregator.getMetricTimeSeries('nonexistent', '1h');
      expect(series.dataPoints).toHaveLength(0);
    });

    it('should respect time range filtering', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);

      const series1h = aggregator.getMetricTimeSeries('api:/api/signals', '1h');
      const series24h = aggregator.getMetricTimeSeries('api:/api/signals', '24h');

      expect(series1h.dataPoints.length).toBeGreaterThanOrEqual(0);
      expect(series24h.dataPoints.length).toBeGreaterThanOrEqual(series1h.dataPoints.length);
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return all metric categories', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);
      aggregator.recordSourceQuery('yahoo-finance', 500, true);
      aggregator.recordCacheOperation('get', true);

      const metrics = aggregator.getAggregatedMetrics('1h');

      expect(metrics.api).toBeDefined();
      expect(metrics.sources).toBeDefined();
      expect(metrics.cache).toBeDefined();
      expect(metrics.dataQuality).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate percentiles correctly', () => {
      // Record various response times
      for (let i = 0; i < 100; i++) {
        aggregator.recordApiRequest('/api/signals', i * 10, 200);
      }

      const metrics = aggregator.getAggregatedMetrics('1h');

      expect(metrics.api.avgResponseTime).toBeGreaterThan(0);
      expect(metrics.api.p95ResponseTime).toBeGreaterThan(metrics.api.avgResponseTime);
      expect(metrics.api.p99ResponseTime).toBeGreaterThan(metrics.api.p95ResponseTime);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);
      aggregator.recordSourceQuery('yahoo-finance', 500, true);
      aggregator.recordCacheOperation('get', true);

      aggregator.reset();

      const metrics = aggregator.getAggregatedMetrics('1h');
      expect(metrics.api.requestCount).toBe(0);
      expect(Object.keys(metrics.sources).length).toBe(0);
      expect(metrics.cache.hits).toBe(0);
    });
  });

  describe('getStorageSize', () => {
    it('should return storage statistics', () => {
      aggregator.recordApiRequest('/api/signals', 100, 200);
      aggregator.recordSourceQuery('yahoo-finance', 500, true);

      const storage = aggregator.getStorageSize();

      expect(storage.apiMetrics).toBeGreaterThanOrEqual(0);
      expect(storage.sourceMetrics).toBeGreaterThanOrEqual(0);
      expect(storage.cacheMetrics).toBeGreaterThanOrEqual(0);
      expect(storage.qualityMetrics).toBeGreaterThanOrEqual(0);
    });
  });
});
