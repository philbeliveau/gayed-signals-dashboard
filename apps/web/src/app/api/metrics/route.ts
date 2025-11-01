/**
 * Prometheus Metrics Endpoint
 * Story 4.0f: Monitoring & Observability - Task 5.1
 *
 * Exposes Prometheus-compatible metrics for Railway monitoring and Grafana dashboards.
 * GET /api/metrics
 */

import { NextResponse } from 'next/server';
import { metricsAggregator } from '@/domains/data-pipeline/src/services/MetricsAggregator';

// Prometheus metric types
type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

interface PrometheusMetric {
  name: string;
  type: MetricType;
  help: string;
  value: number | string;
  labels?: Record<string, string>;
}

/**
 * GET /api/metrics
 * Returns Prometheus-formatted metrics
 */
export async function GET(request: Request) {
  try {
    const metrics = await collectMetrics();
    const prometheusFormat = formatPrometheusMetrics(metrics);

    return new NextResponse(prometheusFormat, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Collect all metrics from the system
 */
async function collectMetrics(): Promise<PrometheusMetric[]> {
  const metrics: PrometheusMetric[] = [];
  const aggregated = metricsAggregator.getAggregatedMetrics('1h');
  const now = Date.now();

  // ============================================================================
  // API Metrics
  // ============================================================================

  metrics.push({
    name: 'api_requests_total',
    type: 'counter',
    help: 'Total number of API requests',
    value: aggregated.api.requestCount,
  });

  metrics.push({
    name: 'api_errors_total',
    type: 'counter',
    help: 'Total number of API errors',
    value: Math.floor(aggregated.api.requestCount * aggregated.api.errorRate),
  });

  metrics.push({
    name: 'api_request_duration_seconds',
    type: 'histogram',
    help: 'API request duration in seconds',
    value: `avg:${(aggregated.api.avgResponseTime / 1000).toFixed(3)} p95:${(aggregated.api.p95ResponseTime / 1000).toFixed(3)} p99:${(aggregated.api.p99ResponseTime / 1000).toFixed(3)}`,
  });

  metrics.push({
    name: 'api_requests_per_minute',
    type: 'gauge',
    help: 'Current API requests per minute',
    value: aggregated.api.requestsPerMinute.toFixed(2),
  });

  metrics.push({
    name: 'api_error_rate',
    type: 'gauge',
    help: 'Current API error rate (0-1)',
    value: aggregated.api.errorRate.toFixed(4),
  });

  // ============================================================================
  // Data Source Metrics
  // ============================================================================

  Object.entries(aggregated.sources).forEach(([source, sourceMetrics]) => {
    metrics.push({
      name: 'source_queries_total',
      type: 'counter',
      help: 'Total queries to data sources',
      value: sourceMetrics.queriesTotal,
      labels: { source },
    });

    metrics.push({
      name: 'source_query_duration_seconds',
      type: 'gauge',
      help: 'Average data source query duration in seconds',
      value: (sourceMetrics.avgQueryTime / 1000).toFixed(3),
      labels: { source },
    });

    metrics.push({
      name: 'source_availability_percent',
      type: 'gauge',
      help: 'Data source availability percentage',
      value: sourceMetrics.availability.toFixed(2),
      labels: { source },
    });

    metrics.push({
      name: 'source_errors_total',
      type: 'counter',
      help: 'Total errors from data sources',
      value: sourceMetrics.errorCount,
      labels: { source },
    });

    metrics.push({
      name: 'source_success_rate',
      type: 'gauge',
      help: 'Data source success rate (0-1)',
      value: sourceMetrics.successRate.toFixed(4),
      labels: { source },
    });
  });

  // ============================================================================
  // Cache Metrics
  // ============================================================================

  metrics.push({
    name: 'cache_hit_rate',
    type: 'gauge',
    help: 'Cache hit rate (0-1)',
    value: aggregated.cache.hitRate.toFixed(4),
  });

  metrics.push({
    name: 'cache_hits_total',
    type: 'counter',
    help: 'Total cache hits',
    value: aggregated.cache.hits,
  });

  metrics.push({
    name: 'cache_misses_total',
    type: 'counter',
    help: 'Total cache misses',
    value: aggregated.cache.misses,
  });

  metrics.push({
    name: 'cache_evictions_total',
    type: 'counter',
    help: 'Total cache evictions',
    value: aggregated.cache.evictions,
  });

  metrics.push({
    name: 'cache_memory_bytes',
    type: 'gauge',
    help: 'Cache memory usage in bytes',
    value: aggregated.cache.memoryUsage,
  });

  metrics.push({
    name: 'cache_keys_total',
    type: 'gauge',
    help: 'Total number of cached keys',
    value: aggregated.cache.keyCount,
  });

  // ============================================================================
  // Data Quality Metrics
  // ============================================================================

  metrics.push({
    name: 'data_quality_overall_score',
    type: 'gauge',
    help: 'Overall data quality score (0-100)',
    value: aggregated.dataQuality.overall.overall,
  });

  metrics.push({
    name: 'data_quality_freshness_score',
    type: 'gauge',
    help: 'Data freshness score (0-100)',
    value: aggregated.dataQuality.overall.freshness,
  });

  metrics.push({
    name: 'data_quality_completeness_score',
    type: 'gauge',
    help: 'Data completeness score (0-100)',
    value: aggregated.dataQuality.overall.completeness,
  });

  metrics.push({
    name: 'data_quality_consistency_score',
    type: 'gauge',
    help: 'Data consistency score (0-100)',
    value: aggregated.dataQuality.overall.consistency,
  });

  metrics.push({
    name: 'data_quality_accuracy_score',
    type: 'gauge',
    help: 'Data accuracy score (0-100)',
    value: aggregated.dataQuality.overall.accuracy,
  });

  // ============================================================================
  // Node.js Process Metrics
  // ============================================================================

  const memoryUsage = process.memoryUsage();

  metrics.push({
    name: 'nodejs_heap_used_bytes',
    type: 'gauge',
    help: 'Node.js heap used in bytes',
    value: memoryUsage.heapUsed,
  });

  metrics.push({
    name: 'nodejs_heap_total_bytes',
    type: 'gauge',
    help: 'Node.js heap total in bytes',
    value: memoryUsage.heapTotal,
  });

  metrics.push({
    name: 'nodejs_external_memory_bytes',
    type: 'gauge',
    help: 'Node.js external memory in bytes',
    value: memoryUsage.external,
  });

  metrics.push({
    name: 'nodejs_rss_bytes',
    type: 'gauge',
    help: 'Node.js RSS memory in bytes',
    value: memoryUsage.rss,
  });

  metrics.push({
    name: 'nodejs_uptime_seconds',
    type: 'counter',
    help: 'Node.js process uptime in seconds',
    value: process.uptime(),
  });

  return metrics;
}

/**
 * Format metrics in Prometheus exposition format
 */
function formatPrometheusMetrics(metrics: PrometheusMetric[]): string {
  let output = '';

  // Group metrics by name
  const grouped = new Map<string, PrometheusMetric[]>();

  metrics.forEach((metric) => {
    if (!grouped.has(metric.name)) {
      grouped.set(metric.name, []);
    }
    grouped.get(metric.name)!.push(metric);
  });

  // Format each metric group
  grouped.forEach((metricGroup, name) => {
    const firstMetric = metricGroup[0];

    // Add HELP and TYPE
    output += `# HELP ${name} ${firstMetric.help}\n`;
    output += `# TYPE ${name} ${firstMetric.type}\n`;

    // Add metric values
    metricGroup.forEach((metric) => {
      let metricLine = name;

      // Add labels if present
      if (metric.labels && Object.keys(metric.labels).length > 0) {
        const labels = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        metricLine += `{${labels}}`;
      }

      metricLine += ` ${metric.value}`;
      output += metricLine + '\n';
    });

    output += '\n';
  });

  return output;
}
