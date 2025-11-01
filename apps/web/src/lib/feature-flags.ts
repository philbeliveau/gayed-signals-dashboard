/**
 * Feature Flags for Railway Backend Migration
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Controls toggling between Railway backend and local API routes
 * with migration metrics tracking
 */

/**
 * Feature flag: Use Railway backend V2 API
 */
export const USE_RAILWAY_BACKEND =
  process.env.NEXT_PUBLIC_USE_RAILWAY_BACKEND === 'true';

/**
 * Get Railway backend URL if enabled
 */
export function getRailwayBackendURL(): string | null {
  if (!USE_RAILWAY_BACKEND) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL;

  if (!url) {
    console.warn(
      '[Feature Flags] Railway backend enabled but URL not configured'
    );
    return null;
  }

  return url;
}

/**
 * Check if Railway backend is available
 */
export function isRailwayBackendAvailable(): boolean {
  return USE_RAILWAY_BACKEND && getRailwayBackendURL() !== null;
}

/**
 * Migration tracking source types
 */
type DataSource = 'railway' | 'local';

/**
 * Migration metrics for tracking backend usage
 */
interface MigrationMetric {
  source: DataSource;
  success: boolean;
  timestamp: string;
  endpoint?: string;
  duration?: number;
  error?: string;
}

/**
 * Log migration metric for analytics
 */
export function logMigrationMetric(
  source: DataSource,
  success: boolean,
  options?: {
    endpoint?: string;
    duration?: number;
    error?: string;
  }
): void {
  const metric: MigrationMetric = {
    source,
    success,
    timestamp: new Date().toISOString(),
    ...options,
  };

  console.log('[Migration Metrics]', JSON.stringify(metric));

  // TODO: Send to analytics service (PostHog, Mixpanel, etc.)
  // analytics.track('backend_migration_metric', metric);
}

/**
 * Get feature flag status for debugging
 */
export function getFeatureFlagStatus(): {
  railwayEnabled: boolean;
  railwayURL: string | null;
  available: boolean;
} {
  return {
    railwayEnabled: USE_RAILWAY_BACKEND,
    railwayURL: getRailwayBackendURL(),
    available: isRailwayBackendAvailable(),
  };
}
