/**
 * Performance Monitoring for Railway Backend Integration
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Tracks performance metrics for Railway backend requests
 */

interface PerformanceMetric {
  endpoint: string;
  duration: number;
  cached: boolean;
  source: 'railway' | 'local';
  timestamp: string;
  success: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 100;

  /**
   * Record performance metric
   */
  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log performance warnings
    this.checkPerformance(metric);
  }

  /**
   * Check performance against SLA targets
   */
  private checkPerformance(metric: PerformanceMetric): void {
    const SLA_CACHED = 500; // 500ms for cached responses
    const SLA_FRESH = 2000; // 2s for fresh data

    if (metric.cached && metric.duration > SLA_CACHED) {
      console.warn(
        `[Performance] Cached request exceeded SLA: ${metric.duration}ms > ${SLA_CACHED}ms`,
        metric
      );
    } else if (!metric.cached && metric.duration > SLA_FRESH) {
      console.warn(
        `[Performance] Fresh request exceeded SLA: ${metric.duration}ms > ${SLA_FRESH}ms`,
        metric
      );
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    averageDuration: number;
    cachedAverageDuration: number;
    freshAverageDuration: number;
    cacheHitRate: number;
    railwaySuccessRate: number;
    localFallbackRate: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageDuration: 0,
        cachedAverageDuration: 0,
        freshAverageDuration: 0,
        cacheHitRate: 0,
        railwaySuccessRate: 0,
        localFallbackRate: 0,
      };
    }

    const cachedMetrics = this.metrics.filter((m) => m.cached);
    const freshMetrics = this.metrics.filter((m) => !m.cached);
    const railwayMetrics = this.metrics.filter((m) => m.source === 'railway');
    const successfulRailway = railwayMetrics.filter((m) => m.success);
    const localFallbacks = this.metrics.filter((m) => m.source === 'local');

    return {
      averageDuration:
        this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      cachedAverageDuration:
        cachedMetrics.length > 0
          ? cachedMetrics.reduce((sum, m) => sum + m.duration, 0) / cachedMetrics.length
          : 0,
      freshAverageDuration:
        freshMetrics.length > 0
          ? freshMetrics.reduce((sum, m) => sum + m.duration, 0) / freshMetrics.length
          : 0,
      cacheHitRate: cachedMetrics.length / this.metrics.length,
      railwaySuccessRate:
        railwayMetrics.length > 0 ? successfulRailway.length / railwayMetrics.length : 0,
      localFallbackRate: localFallbacks.length / this.metrics.length,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();
